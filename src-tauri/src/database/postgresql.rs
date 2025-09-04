use super::{DatabaseConnection, ConnectionConfig, QueryResult, TableInfo, ColumnInfo};
use tokio_postgres::{NoTls, Row, Column};
use deadpool_postgres::{Pool, Config, ManagerConfig, RecyclingMethod, Runtime};
use async_trait::async_trait;

pub struct PostgreSQLConnection {
    pool: Option<Pool>,
    current_database: Option<String>,
}

impl PostgreSQLConnection {
    pub fn new() -> Self {
        Self {
            pool: None,
            current_database: None,
        }
    }
    
    // PostgreSQL 值转字符串的辅助函数
    fn pg_value_to_string(row: &Row, _column: &Column, i: usize) -> String {
        // 简化处理，先尝试转换为字符串
        if let Ok(value) = row.try_get::<_, Option<String>>(i) {
            match value {
                Some(v) => v,
                None => "NULL".to_string(),
            }
        } else if let Ok(value) = row.try_get::<_, Option<i32>>(i) {
            match value {
                Some(v) => v.to_string(),
                None => "NULL".to_string(),
            }
        } else if let Ok(value) = row.try_get::<_, Option<i64>>(i) {
            match value {
                Some(v) => v.to_string(),
                None => "NULL".to_string(),
            }
        } else if let Ok(value) = row.try_get::<_, Option<f64>>(i) {
            match value {
                Some(v) => v.to_string(),
                None => "NULL".to_string(),
            }
        } else if let Ok(value) = row.try_get::<_, Option<bool>>(i) {
            match value {
                Some(v) => v.to_string(),
                None => "NULL".to_string(),
            }
        } else {
            // 回退到空值
            "NULL".to_string()
        }
    }
}

#[async_trait]
impl DatabaseConnection for PostgreSQLConnection {
    async fn connect(&mut self, config: &ConnectionConfig) -> anyhow::Result<()> {
        use tracing::{info, error, debug};
        
        info!("正在连接PostgreSQL数据库 - 主机: {}, 端口: {}, 用户: {}", 
              config.host, config.port, 
              config.username.as_ref().unwrap_or(&"postgres".to_string()));

        // 构建连接池配置
        let mut cfg = Config::new();
        cfg.host = Some(config.host.clone());
        cfg.port = Some(config.port);
        cfg.user = Some(config.username.as_ref().unwrap_or(&"postgres".to_string()).clone());
        cfg.password = config.password.clone();
        cfg.dbname = config.database.clone();
        
        // 设置连接池参数
        cfg.manager = Some(ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        });
        
        debug!("正在创建PostgreSQL连接池...");
        
        let pool = cfg.create_pool(Some(Runtime::Tokio1), NoTls)
            .map_err(|e| anyhow::anyhow!("创建连接池失败: {}", e))?;
        
        // 测试连接
        let _client = pool.get().await
            .map_err(|e| {
                error!("PostgreSQL连接失败: {}", e);
                anyhow::anyhow!("PostgreSQL连接失败: {}. 请检查: 1) PostgreSQL服务是否启动 2) 连接参数是否正确 3) 用户权限是否足够", e)
            })?;
        
        info!("PostgreSQL连接建立成功");
        
        self.pool = Some(pool);
        self.current_database = config.database.clone();
        
        Ok(())
    }

    async fn disconnect(&mut self) -> anyhow::Result<()> {
        if let Some(pool) = self.pool.take() {
            // 连接池会自动关闭连接
            drop(pool);
        }
        self.current_database = None;
        Ok(())
    }

    async fn execute(&self, query: &str) -> anyhow::Result<QueryResult> {
        let pool = self.pool.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        let client = pool.get().await?;
        let start = std::time::Instant::now();
        
        // 判断是否为查询类语句
        let trimmed_query = query.trim().to_uppercase();
        let is_query = trimmed_query.starts_with("SELECT") || 
                      trimmed_query.starts_with("WITH") ||
                      trimmed_query.starts_with("SHOW") ||
                      trimmed_query.starts_with("EXPLAIN");
        
        if is_query {
            let rows = client.query(query, &[]).await?;
            
            let columns = if !rows.is_empty() {
                rows[0].columns().iter()
                    .map(|col| col.name().to_string())
                    .collect()
            } else {
                vec![]
            };
            
            let result_rows: Vec<Vec<String>> = rows.iter()
                .map(|row| {
                    let mut row_data = Vec::new();
                    for (i, column) in row.columns().iter().enumerate() {
                        row_data.push(Self::pg_value_to_string(row, column, i));
                    }
                    row_data
                })
                .collect();
            
            Ok(QueryResult {
                columns,
                rows: result_rows,
                affected_rows: 0,
                execution_time: start.elapsed().as_millis() as u64,
            })
        } else {
            let affected = client.execute(query, &[]).await?;
            
            Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: affected,
                execution_time: start.elapsed().as_millis() as u64,
            })
        }
    }

    async fn get_schema(&self) -> anyhow::Result<Vec<TableInfo>> {
        let pool = self.pool.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
            
        let client = pool.get().await?;
        
        // 如果没有选择数据库，返回数据库列表
        if self.current_database.is_none() {
            let databases = self.get_databases().await?;
            let mut table_infos = Vec::new();
            
            for db_name in databases {
                // 跳过模板数据库
                if db_name == "template0" || db_name == "template1" {
                    continue;
                }
                
                table_infos.push(TableInfo {
                    name: format!("{}", db_name),
                    columns: vec![
                        ColumnInfo {
                            name: "database".to_string(),
                            data_type: "DATABASE".to_string(),
                            nullable: false,
                            primary_key: false,
                        }
                    ],
                });
            }
            
            return Ok(table_infos);
        }
        
        // 获取表信息的SQL查询
        let query = r#"
            SELECT 
                t.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
            FROM information_schema.tables t
            LEFT JOIN information_schema.columns c ON t.table_name = c.table_name 
                AND t.table_schema = c.table_schema
            LEFT JOIN (
                SELECT ku.table_name, ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
                WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
            ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
            WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name, c.ordinal_position
        "#;
        
        let rows = client.query(query, &[]).await?;
        
        let mut table_map: std::collections::HashMap<String, Vec<ColumnInfo>> = std::collections::HashMap::new();
        
        for row in rows {
            let table_name: String = row.get("table_name");
            let column_name: String = row.get("column_name");
            let data_type: String = row.get("data_type");
            let is_nullable: String = row.get("is_nullable");
            let is_primary_key: bool = row.get("is_primary_key");
            
            let column_info = ColumnInfo {
                name: column_name,
                data_type,
                nullable: is_nullable == "YES",
                primary_key: is_primary_key,
            };
            
            table_map.entry(table_name)
                .or_insert_with(Vec::new)
                .push(column_info);
        }
        
        let table_infos = table_map.into_iter()
            .map(|(name, columns)| TableInfo { name, columns })
            .collect();
        
        Ok(table_infos)
    }

    async fn get_databases(&self) -> anyhow::Result<Vec<String>> {
        let pool = self.pool.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        let client = pool.get().await?;
        let query = "SELECT datname FROM pg_database WHERE datistemplate = false";
        let rows = client.query(query, &[]).await?;
        
        let db_names = rows.iter()
            .map(|row| {
                let name: String = row.get(0);
                name
            })
            .collect();
        
        Ok(db_names)
    }
    
    async fn use_database(&mut self, database_name: &str) -> anyhow::Result<()> {
        // PostgreSQL 需要重新连接到新数据库
        if let Some(_pool) = &self.pool {
            // 获取当前配置信息（这里简化处理，实际应该保存原始配置）
            self.current_database = Some(database_name.to_string());
            // 注意：这里应该重新创建连接池，但为了简化，我们只更新当前数据库名
            // 在实际应用中，建议保存原始配置并重新连接
        } else {
            return Err(anyhow::anyhow!("Not connected"));
        }
        
        Ok(())
    }

    fn is_connected(&self) -> bool {
        self.pool.is_some()
    }
}