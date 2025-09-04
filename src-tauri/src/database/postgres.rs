use super::{DatabaseConnection, ConnectionConfig, QueryResult, TableInfo, ColumnInfo};
use async_trait::async_trait;
use tokio_postgres::{Client, NoTls, Row, types::Type};
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::{Result, anyhow};
use std::time::Instant;

pub struct PostgreSQLConnection {
    client: Option<Arc<Mutex<Client>>>,
    connection_handle: Option<tokio::task::JoinHandle<()>>,
    current_database: Option<String>,
}

impl PostgreSQLConnection {
    pub fn new() -> Self {
        Self {
            client: None,
            connection_handle: None,
            current_database: None,
        }
    }

    fn build_connection_string(config: &ConnectionConfig) -> String {
        let mut conn_str = format!("host={} port={}", config.host, config.port);
        
        if let Some(username) = &config.username {
            conn_str.push_str(&format!(" user={}", username));
        }
        
        if let Some(password) = &config.password {
            conn_str.push_str(&format!(" password={}", password));
        }
        
        if let Some(database) = &config.database {
            conn_str.push_str(&format!(" dbname={}", database));
        } else {
            // 默认连接到 postgres 数据库
            conn_str.push_str(" dbname=postgres");
        }
        
        // 添加额外的连接选项
        conn_str.push_str(" connect_timeout=10");
        
        conn_str
    }

    fn row_to_string_vec(row: &Row) -> Vec<String> {
        let mut values = Vec::new();
        
        for i in 0..row.len() {
            let value = match row.columns()[i].type_() {
                &Type::BOOL => {
                    row.get::<_, Option<bool>>(i)
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::INT2 => {
                    row.get::<_, Option<i16>>(i)
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::INT4 => {
                    row.get::<_, Option<i32>>(i)
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::INT8 => {
                    row.get::<_, Option<i64>>(i)
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::FLOAT4 => {
                    row.get::<_, Option<f32>>(i)
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::FLOAT8 => {
                    row.get::<_, Option<f64>>(i)
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::TEXT | &Type::VARCHAR | &Type::CHAR | &Type::BPCHAR | &Type::NAME => {
                    row.get::<_, Option<String>>(i)
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::JSON | &Type::JSONB => {
                    row.get::<_, Option<serde_json::Value>>(i)
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::TIMESTAMP | &Type::TIMESTAMPTZ => {
                    row.get::<_, Option<chrono::NaiveDateTime>>(i)
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::DATE => {
                    row.get::<_, Option<chrono::NaiveDate>>(i)
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::TIME => {
                    row.get::<_, Option<chrono::NaiveTime>>(i)
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::UUID => {
                    row.get::<_, Option<uuid::Uuid>>(i)
                        .map(|v| v.to_string())
                        .unwrap_or_else(|| "NULL".to_string())
                }
                &Type::BYTEA => {
                    row.get::<_, Option<Vec<u8>>>(i)
                        .map(|v| format!("\\x{}", hex::encode(&v)))
                        .unwrap_or_else(|| "NULL".to_string())
                }
                _ => {
                    // 对于其他类型，尝试转换为字符串
                    row.try_get::<_, Option<String>>(i)
                        .unwrap_or(Some("NULL".to_string()))
                        .unwrap_or_else(|| "NULL".to_string())
                }
            };
            values.push(value);
        }
        
        values
    }
}

#[async_trait]
impl DatabaseConnection for PostgreSQLConnection {
    async fn connect(&mut self, config: &ConnectionConfig) -> Result<()> {
        // 断开现有连接
        if self.is_connected() {
            self.disconnect().await?;
        }
        
        let conn_str = Self::build_connection_string(config);
        
        // 连接到 PostgreSQL
        let (client, connection) = tokio_postgres::connect(&conn_str, NoTls).await
            .map_err(|e| anyhow!("Failed to connect to PostgreSQL: {}", e))?;
        
        // 启动连接处理任务
        let connection_handle = tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("PostgreSQL connection error: {}", e);
            }
        });
        
        self.client = Some(Arc::new(Mutex::new(client)));
        self.connection_handle = Some(connection_handle);
        self.current_database = config.database.clone();
        
        Ok(())
    }

    async fn disconnect(&mut self) -> Result<()> {
        // 清理客户端
        self.client = None;
        
        // 取消连接处理任务
        if let Some(handle) = self.connection_handle.take() {
            handle.abort();
        }
        
        self.current_database = None;
        
        Ok(())
    }

    async fn execute(&self, query: &str) -> Result<QueryResult> {
        let client = self.client.as_ref()
            .ok_or_else(|| anyhow!("Not connected to database"))?;
        
        let client = client.lock().await;
        let start = Instant::now();
        
        // 检查是否是查询语句
        let trimmed_query = query.trim().to_uppercase();
        let is_select = trimmed_query.starts_with("SELECT") || 
                       trimmed_query.starts_with("SHOW") ||
                       trimmed_query.starts_with("DESCRIBE") ||
                       trimmed_query.starts_with("EXPLAIN") ||
                       trimmed_query.starts_with("WITH");
        
        if is_select {
            // 执行查询并获取结果
            let rows = client.query(query, &[]).await
                .map_err(|e| anyhow!("Query execution failed: {}", e))?;
            
            let execution_time = start.elapsed().as_millis() as u64;
            
            if rows.is_empty() {
                return Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    affected_rows: 0,
                    execution_time,
                });
            }
            
            // 提取列名
            let columns: Vec<String> = rows[0].columns()
                .iter()
                .map(|col| col.name().to_string())
                .collect();
            
            // 转换行数据
            let rows: Vec<Vec<String>> = rows.iter()
                .map(Self::row_to_string_vec)
                .collect();
            
            Ok(QueryResult {
                columns,
                rows,
                affected_rows: 0,
                execution_time,
            })
        } else {
            // 执行非查询语句
            let affected_rows = client.execute(query, &[]).await
                .map_err(|e| anyhow!("Query execution failed: {}", e))?;
            
            let execution_time = start.elapsed().as_millis() as u64;
            
            Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows,
                execution_time,
            })
        }
    }

    async fn get_schema(&self) -> Result<Vec<TableInfo>> {
        let client = self.client.as_ref()
            .ok_or_else(|| anyhow!("Not connected to database"))?;
        
        let client = client.lock().await;
        
        // 查询所有表和视图
        let table_query = r#"
            SELECT 
                table_name,
                table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        "#;
        
        let tables = client.query(table_query, &[]).await
            .map_err(|e| anyhow!("Failed to get tables: {}", e))?;
        
        let mut table_infos = Vec::new();
        
        for table_row in tables {
            let table_name: String = table_row.get(0);
            
            // 查询表的列信息
            let column_query = r#"
                SELECT 
                    c.column_name,
                    c.data_type,
                    c.is_nullable,
                    CASE 
                        WHEN pk.column_name IS NOT NULL THEN true
                        ELSE false
                    END as is_primary_key
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT 
                        kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_schema = kcu.table_schema
                    WHERE tc.table_schema = 'public'
                        AND tc.table_name = $1
                        AND tc.constraint_type = 'PRIMARY KEY'
                ) pk ON c.column_name = pk.column_name
                WHERE c.table_schema = 'public'
                    AND c.table_name = $1
                ORDER BY c.ordinal_position
            "#;
            
            let columns = client.query(column_query, &[&table_name]).await
                .map_err(|e| anyhow!("Failed to get columns for table {}: {}", table_name, e))?;
            
            let column_infos: Vec<ColumnInfo> = columns.iter().map(|col| {
                ColumnInfo {
                    name: col.get(0),
                    data_type: col.get(1),
                    nullable: col.get::<_, String>(2) == "YES",
                    primary_key: col.get(3),
                }
            }).collect();
            
            table_infos.push(TableInfo {
                name: table_name,
                columns: column_infos,
            });
        }
        
        Ok(table_infos)
    }

    async fn get_databases(&self) -> Result<Vec<String>> {
        let client = self.client.as_ref()
            .ok_or_else(|| anyhow!("Not connected to database"))?;
        
        let client = client.lock().await;
        
        // 查询所有数据库
        let query = r#"
            SELECT datname 
            FROM pg_database 
            WHERE datistemplate = false 
            ORDER BY datname
        "#;
        
        let rows = client.query(query, &[]).await
            .map_err(|e| anyhow!("Failed to get databases: {}", e))?;
        
        let databases: Vec<String> = rows.iter()
            .map(|row| row.get(0))
            .collect();
        
        Ok(databases)
    }

    async fn use_database(&mut self, database_name: &str) -> Result<()> {
        // PostgreSQL 不支持在连接后切换数据库
        // 需要重新连接到新的数据库
        if let Some(client_arc) = &self.client {
            // 获取当前连接配置（这里简化处理，实际应该保存配置）
            let mut config = ConnectionConfig {
                db_type: super::DatabaseType::PostgreSQL,
                host: "localhost".to_string(), // 这些应该从保存的配置中获取
                port: 5432,
                username: None,
                password: None,
                database: Some(database_name.to_string()),
                options: std::collections::HashMap::new(),
            };
            
            // 重新连接到新数据库
            self.connect(&config).await?;
        }
        
        Ok(())
    }

    fn is_connected(&self) -> bool {
        self.client.is_some()
    }
}