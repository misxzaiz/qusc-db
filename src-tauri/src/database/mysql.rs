use super::{DatabaseConnection, ConnectionConfig, QueryResult, TableInfo, ColumnInfo};
use mysql_async::{Pool, Conn, prelude::*, Row};
use async_trait::async_trait;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct MySQLConnection {
    pool: Option<Pool>,
    connection: Option<Arc<Mutex<Conn>>>,
    current_database: Option<String>,
}

impl MySQLConnection {
    pub fn new() -> Self {
        Self {
            pool: None,
            connection: None,
            current_database: None,
        }
    }
}

#[async_trait]
impl DatabaseConnection for MySQLConnection {
    async fn connect(&mut self, config: &ConnectionConfig) -> anyhow::Result<()> {
        use tracing::{info, error, debug};
        
        // 连接时不强制指定数据库，先连接到服务器
        let empty_string = String::new();
        let database = config.database.as_ref().unwrap_or(&empty_string);
        
        info!("正在连接MySQL数据库 - 主机: {}, 端口: {}, 用户: {}", 
              config.host, config.port, 
              config.username.as_ref().unwrap_or(&"root".to_string()));
        
        let url = if database.is_empty() {
            format!(
                "mysql://{}:{}@{}:{}",
                config.username.as_ref().unwrap_or(&"root".to_string()),
                config.password.as_ref().unwrap_or(&"".to_string()),
                config.host,
                config.port
            )
        } else {
            format!(
                "mysql://{}:{}@{}:{}/{}",
                config.username.as_ref().unwrap_or(&"root".to_string()),
                config.password.as_ref().unwrap_or(&"".to_string()),
                config.host,
                config.port,
                database
            )
        };
        
        debug!("MySQL连接URL: {}", url.replace(config.password.as_ref().unwrap_or(&"".to_string()).as_str(), "***"));
        
        let pool = Pool::new(url.as_str());
        
        info!("正在获取数据库连接...");
        let conn = match pool.get_conn().await {
            Ok(conn) => {
                info!("MySQL连接建立成功");
                conn
            },
            Err(e) => {
                error!("MySQL连接失败: {}", e);
                return Err(anyhow::anyhow!("MySQL连接失败: {}. 请检查: 1) MySQL服务是否启动 2) 连接参数是否正确 3) 用户权限是否足够", e));
            }
        };
        
        self.pool = Some(pool);
        self.connection = Some(Arc::new(Mutex::new(conn)));
        self.current_database = if database.is_empty() { None } else { Some(database.clone()) };
        
        Ok(())
    }

    async fn disconnect(&mut self) -> anyhow::Result<()> {
        if let Some(conn_arc) = self.connection.take() {
            let _conn = conn_arc.lock().await;
            // MySQL连接会自动断开
        }
        self.pool = None;
        Ok(())
    }

    async fn execute(&self, query: &str) -> anyhow::Result<QueryResult> {
        let pool = self.pool.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        let mut conn = pool.get_conn().await?;
        let start = std::time::Instant::now();
        
        // 如果有当前数据库，确保选择了正确的数据库
        if let Some(database) = &self.current_database {
            let use_query = format!("USE `{}`", database);
            conn.query_drop(use_query).await?;
        }
        
        // 判断是否为查询类语句（SELECT 或 SHOW）
        let is_query = query.trim().to_uppercase().starts_with("SELECT") || 
                      query.trim().to_uppercase().starts_with("SHOW");
        
        if is_query {
            let result: Vec<Row> = conn.query(query).await?;
            
            let columns = if !result.is_empty() {
                result[0].columns_ref().iter()
                    .map(|col| col.name_str().to_string())
                    .collect()
            } else {
                vec![]
            };
            
            let rows: Vec<Vec<String>> = result.into_iter()
                .map(|row| {
                    let mut row_data = Vec::new();
                    for i in 0..row.len() {
                        let value = row.as_ref(i).unwrap();
                        row_data.push(mysql_value_to_string(value));
                    }
                    row_data
                })
                .collect();
            
            Ok(QueryResult {
                columns,
                rows,
                affected_rows: 0,
                execution_time: start.elapsed().as_millis() as u64,
            })
        } else {
            conn.query_drop(query).await?;
            let affected = conn.affected_rows();
            
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
            
        let mut conn = pool.get_conn().await?;
        
        // 如果没有选择数据库，返回数据库列表作为"表"
        if self.current_database.is_none() {
            let databases = self.get_databases().await?;
            let mut table_infos = Vec::new();
            
            for db_name in databases {
                // 跳过系统数据库
                if db_name == "information_schema" || db_name == "performance_schema" || 
                   db_name == "mysql" || db_name == "sys" {
                    continue;
                }
                
                table_infos.push(TableInfo {
                    name: format!("{}", db_name), // 使用文件夹图标表示数据库
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
        
        // 如果有当前数据库，确保选择了正确的数据库
        if let Some(database) = &self.current_database {
            let use_query = format!("USE `{}`", database);
            conn.query_drop(use_query).await?;
        }
        
        let query = "SHOW TABLES";
        let tables: Vec<Row> = conn.query(query).await?;
        
        let mut table_infos = Vec::new();
        
        for table_row in tables {
            let table_name: String = table_row.get(0).unwrap();
            let desc_query = format!("DESCRIBE `{}`", table_name);
            let columns: Vec<Row> = conn.query(desc_query).await?;
            
            let column_infos = columns.into_iter()
                .map(|row| {
                    let name: String = row.get("Field").unwrap();
                    let data_type: String = row.get("Type").unwrap();
                    let nullable: String = row.get("Null").unwrap();
                    let key: String = row.get("Key").unwrap();
                    
                    ColumnInfo {
                        name,
                        data_type,
                        nullable: nullable == "YES",
                        primary_key: key == "PRI",
                    }
                })
                .collect();
            
            table_infos.push(TableInfo {
                name: table_name,
                columns: column_infos,
            });
        }
        
        Ok(table_infos)
    }

    async fn get_databases(&self) -> anyhow::Result<Vec<String>> {
        let pool = self.pool.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        let mut conn = pool.get_conn().await?;
        let query = "SHOW DATABASES";
        let databases: Vec<Row> = conn.query(query).await?;
        
        let db_names = databases.into_iter()
            .map(|row| {
                let name: String = row.get(0).unwrap();
                name
            })
            .collect();
        
        Ok(db_names)
    }
    
    async fn use_database(&mut self, database_name: &str) -> anyhow::Result<()> {
        let pool = self.pool.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        let mut conn = pool.get_conn().await?;
        let query = format!("USE `{}`", database_name);
        conn.query_drop(query).await?;
        
        // 更新当前数据库
        self.current_database = Some(database_name.to_string());
        Ok(())
    }

    fn is_connected(&self) -> bool {
        self.connection.is_some()
    }
}

fn mysql_value_to_string(value: &mysql_async::Value) -> String {
    use mysql_async::Value;
    match value {
        Value::NULL => "NULL".to_string(),
        Value::Bytes(bytes) => String::from_utf8_lossy(bytes).to_string(),
        Value::Int(i) => i.to_string(),
        Value::UInt(u) => u.to_string(),
        Value::Float(f) => f.to_string(),
        Value::Double(d) => d.to_string(),
        Value::Date(year, month, day, hour, minute, second, _) => {
            format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02}", year, month, day, hour, minute, second)
        },
        Value::Time(_, _, hour, minute, second, _) => {
            format!("{:02}:{:02}:{:02}", hour, minute, second)
        },
    }
}