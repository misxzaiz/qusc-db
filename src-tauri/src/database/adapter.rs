use crate::database::enhanced_types::*;
use crate::database::{DatabaseConnection, QueryResult as LegacyQueryResult};
use anyhow::Result;
use std::sync::Arc;

/// 数据库适配器工厂
pub struct DatabaseAdapterFactory;

impl DatabaseAdapterFactory {
    /// 根据连接配置创建适配器
    pub async fn create_adapter(
        config: &ConnectionConfig,
    ) -> Result<Box<dyn DatabaseAdapter>> {
        match config.db_type {
            DatabaseType::MySQL => {
                let adapter = MySQLAdapter::new(config).await?;
                Ok(Box::new(adapter))
            }
            DatabaseType::PostgreSQL => {
                let adapter = PostgreSQLAdapter::new(config).await?;
                Ok(Box::new(adapter))
            }
            DatabaseType::Redis => {
                let adapter = RedisAdapter::new(config).await?;
                Ok(Box::new(adapter))
            }
            DatabaseType::MongoDB => {
                let adapter = MongoDBAdapter::new(config).await?;
                Ok(Box::new(adapter))
            }
            DatabaseType::SQLite => {
                let adapter = SQLiteAdapter::new(config).await?;
                Ok(Box::new(adapter))
            }
        }
    }
    
    /// 测试连接配置是否有效
    pub async fn test_connection(config: &ConnectionConfig) -> Result<bool> {
        let adapter = Self::create_adapter(config).await?;
        adapter.test_connection().await
    }
}

/// 适配器管理器，用于管理活动的连接
pub struct AdapterManager {
    adapters: std::collections::HashMap<String, Box<dyn DatabaseAdapter>>,
}

impl AdapterManager {
    pub fn new() -> Self {
        Self {
            adapters: std::collections::HashMap::new(),
        }
    }
    
    /// 创建新连接
    pub async fn create_connection(
        &mut self,
        connection_id: String,
        config: &ConnectionConfig,
    ) -> Result<()> {
        let adapter = DatabaseAdapterFactory::create_adapter(config).await?;
        self.adapters.insert(connection_id, adapter);
        Ok(())
    }
    
    /// 获取适配器
    pub fn get_adapter(&self, connection_id: &str) -> Option<&dyn DatabaseAdapter> {
        self.adapters.get(connection_id).map(|adapter| adapter.as_ref())
    }
    
    /// 移除连接
    pub async fn remove_connection(&mut self, connection_id: &str) -> Result<()> {
        if let Some(adapter) = self.adapters.remove(connection_id) {
            adapter.close().await?;
        }
        Ok(())
    }
    
    /// 获取所有连接ID
    pub fn get_connection_ids(&self) -> Vec<&String> {
        self.adapters.keys().collect()
    }
}

// ===== 适配器基础实现 =====

/// MySQL 适配器
pub struct MySQLAdapter {
    connection: Arc<crate::database::mysql::MySQLConnection>,
    config: ConnectionConfig,
}

impl MySQLAdapter {
    pub async fn new(config: &ConnectionConfig) -> Result<Self> {
        let mut connection = crate::database::mysql::MySQLConnection::new();
        connection.connect(config).await?;
        
        Ok(Self {
            connection: Arc::new(connection),
            config: config.clone(),
        })
    }
}

#[async_trait::async_trait]
impl DatabaseAdapter for MySQLAdapter {
    async fn execute(&self, query: &str) -> Result<EnhancedQueryResult> {
        let start_time = std::time::Instant::now();
        
        // 执行原始查询
        let raw_result = self.connection.execute(query).await?;
        
        // 转换为增强格式
        let query_data = QueryData::Relational {
            columns: raw_result.columns.into_iter().map(|name| ColumnInfo {
                name,
                data_type: "VARCHAR".to_string(), // 简化处理，实际应该解析真实类型
                nullable: false,
                primary_key: false,
                auto_increment: false,
                default_value: None,
                charset: None,
                comment: None,
                extra: std::collections::HashMap::new(),
            }).collect(),
            rows: raw_result.rows.into_iter().map(|row| {
                row.into_iter().map(|cell| {
                    if cell == "NULL" {
                        CellValue::Null
                    } else {
                        CellValue::String(cell)
                    }
                }).collect()
            }).collect(),
            total_rows: None,
            affected_rows: raw_result.affected_rows,
            schema_info: None,
        };
        
        Ok(EnhancedQueryResult {
            db_type: DatabaseType::MySQL,
            data: query_data,
            metadata: QueryMetadata {
                query: query.to_string(),
                timestamp: chrono::Utc::now(),
                execution_plan: None,
                warnings: vec![],
            },
            execution_time: start_time.elapsed().as_millis() as u64,
            ui_config: self.get_ui_config(),
        })
    }
    
    async fn get_schema(&self) -> Result<DatabaseSchema> {
        // 简化实现，后续完善
        Ok(DatabaseSchema {
            database_name: self.config.database.clone().unwrap_or_default(),
            tables: vec![],
            views: vec![],
            procedures: vec![],
            functions: vec![],
        })
    }
    
    fn get_query_suggestions(&self, _context: &str) -> Vec<QuerySuggestion> {
        vec![
            QuerySuggestion {
                text: "SELECT".to_string(),
                description: "查询数据".to_string(),
                category: SuggestionCategory::Keyword,
                score: 100,
            },
            QuerySuggestion {
                text: "INSERT".to_string(),
                description: "插入数据".to_string(),
                category: SuggestionCategory::Keyword,
                score: 90,
            },
            QuerySuggestion {
                text: "UPDATE".to_string(),
                description: "更新数据".to_string(),
                category: SuggestionCategory::Keyword,
                score: 85,
            },
            QuerySuggestion {
                text: "DELETE".to_string(),
                description: "删除数据".to_string(),
                category: SuggestionCategory::Keyword,
                score: 80,
            },
        ]
    }
    
    fn get_ui_config(&self) -> DatabaseUIConfig {
        DatabaseUIConfig {
            display_mode: DisplayMode::Table,
            supported_operations: vec![
                Operation::Select,
                Operation::Insert,
                Operation::Update,
                Operation::Delete,
                Operation::CreateTable,
                Operation::DropTable,
                Operation::AlterTable,
                Operation::CreateIndex,
                Operation::DropIndex,
            ],
            editor_config: EditorConfig {
                language: "mysql".to_string(),
                auto_complete: true,
                syntax_highlighting: true,
                keywords: vec![
                    "SELECT".to_string(), "FROM".to_string(), "WHERE".to_string(),
                    "INSERT".to_string(), "UPDATE".to_string(), "DELETE".to_string(),
                    "CREATE".to_string(), "DROP".to_string(), "ALTER".to_string(),
                    "TABLE".to_string(), "INDEX".to_string(), "DATABASE".to_string(),
                ],
                functions: vec![
                    "COUNT".to_string(), "SUM".to_string(), "AVG".to_string(),
                    "MAX".to_string(), "MIN".to_string(), "NOW".to_string(),
                ],
                operators: vec![
                    "=".to_string(), "!=".to_string(), "<".to_string(), ">".to_string(),
                    "<=".to_string(), ">=".to_string(), "LIKE".to_string(), "IN".to_string(),
                ],
            },
            export_formats: vec![
                ExportFormat::CSV,
                ExportFormat::Excel,
                ExportFormat::JSON,
                ExportFormat::SQL,
            ],
            monitoring_capable: false,
            theme: Some(DatabaseTheme {
                primary_color: "#00758f".to_string(),
                accent_color: "#f29111".to_string(),
                icon: "🗄️".to_string(),
            }),
        }
    }
    
    async fn get_real_time_stats(&self) -> Result<Option<DatabaseStats>> {
        // MySQL 不支持实时监控
        Ok(None)
    }
    
    async fn test_connection(&self) -> Result<bool> {
        Ok(self.connection.is_connected())
    }
    
    async fn close(&self) -> Result<()> {
        // MySQL连接会在Drop时自动关闭
        Ok(())
    }
}

/// PostgreSQL 适配器
pub struct PostgreSQLAdapter {
    connection: Arc<crate::database::postgresql::PostgreSQLConnection>,
    config: ConnectionConfig,
}

impl PostgreSQLAdapter {
    pub async fn new(config: &ConnectionConfig) -> Result<Self> {
        let mut connection = crate::database::postgresql::PostgreSQLConnection::new();
        connection.connect(config).await?;
        
        Ok(Self {
            connection: Arc::new(connection),
            config: config.clone(),
        })
    }
}

#[async_trait::async_trait]
impl DatabaseAdapter for PostgreSQLAdapter {
    async fn execute(&self, query: &str) -> Result<EnhancedQueryResult> {
        let start_time = std::time::Instant::now();
        let raw_result = self.connection.execute(query).await?;
        
        let query_data = QueryData::Relational {
            columns: raw_result.columns.into_iter().map(|name| ColumnInfo {
                name,
                data_type: "TEXT".to_string(),
                nullable: false,
                primary_key: false,
                auto_increment: false,
                default_value: None,
                charset: None,
                comment: None,
                extra: std::collections::HashMap::new(),
            }).collect(),
            rows: raw_result.rows.into_iter().map(|row| {
                row.into_iter().map(|cell| {
                    if cell == "NULL" {
                        CellValue::Null
                    } else {
                        CellValue::String(cell)
                    }
                }).collect()
            }).collect(),
            total_rows: None,
            affected_rows: raw_result.affected_rows,
            schema_info: None,
        };
        
        Ok(EnhancedQueryResult {
            db_type: DatabaseType::PostgreSQL,
            data: query_data,
            metadata: QueryMetadata {
                query: query.to_string(),
                timestamp: chrono::Utc::now(),
                execution_plan: None,
                warnings: vec![],
            },
            execution_time: start_time.elapsed().as_millis() as u64,
            ui_config: self.get_ui_config(),
        })
    }
    
    async fn get_schema(&self) -> Result<DatabaseSchema> {
        Ok(DatabaseSchema {
            database_name: self.config.database.clone().unwrap_or_default(),
            tables: vec![],
            views: vec![],
            procedures: vec![],
            functions: vec![],
        })
    }
    
    fn get_query_suggestions(&self, _context: &str) -> Vec<QuerySuggestion> {
        vec![
            QuerySuggestion {
                text: "SELECT".to_string(),
                description: "查询数据".to_string(),
                category: SuggestionCategory::Keyword,
                score: 100,
            },
        ]
    }
    
    fn get_ui_config(&self) -> DatabaseUIConfig {
        DatabaseUIConfig {
            display_mode: DisplayMode::Table,
            supported_operations: vec![
                Operation::Select,
                Operation::Insert,
                Operation::Update,
                Operation::Delete,
            ],
            editor_config: EditorConfig {
                language: "postgresql".to_string(),
                auto_complete: true,
                syntax_highlighting: true,
                keywords: vec!["SELECT".to_string(), "FROM".to_string()],
                functions: vec!["COUNT".to_string()],
                operators: vec!["=".to_string()],
            },
            export_formats: vec![ExportFormat::CSV, ExportFormat::JSON],
            monitoring_capable: false,
            theme: Some(DatabaseTheme {
                primary_color: "#336791".to_string(),
                accent_color: "#ffffff".to_string(),
                icon: "🐘".to_string(),
            }),
        }
    }
    
    async fn get_real_time_stats(&self) -> Result<Option<DatabaseStats>> {
        Ok(None)
    }
    
    async fn test_connection(&self) -> Result<bool> {
        Ok(self.connection.is_connected())
    }
    
    async fn close(&self) -> Result<()> {
        Ok(())
    }
}

/// Redis 适配器
pub struct RedisAdapter {
    connection: Arc<tokio::sync::Mutex<crate::database::redis::RedisConnection>>,
    config: ConnectionConfig,
}

impl RedisAdapter {
    pub async fn new(config: &ConnectionConfig) -> Result<Self> {
        let mut connection = crate::database::redis::RedisConnection::new();
        connection.connect(config).await?;
        
        Ok(Self {
            connection: Arc::new(tokio::sync::Mutex::new(connection)),
            config: config.clone(),
        })
    }
}

#[async_trait::async_trait]
impl DatabaseAdapter for RedisAdapter {
    async fn execute(&self, query: &str) -> Result<EnhancedQueryResult> {
        let start_time = std::time::Instant::now();
        let connection = self.connection.lock().await;
        let raw_result = connection.execute(query).await?;
        
        // 简化的 Redis 数据转换
        let entries = vec![
            RedisEntry {
                key: "sample_key".to_string(),
                data_type: RedisDataType::String,
                value: RedisValue::String {
                    value: raw_result.rows.get(0)
                        .and_then(|row| row.get(0))
                        .unwrap_or(&"".to_string())
                        .clone(),
                },
                ttl: None,
                memory_usage: None,
                encoding: None,
            }
        ];
        
        let query_data = QueryData::KeyValue {
            entries,
            database_info: RedisDatabaseInfo {
                database_index: 0,
                key_count: 0,
                expires_count: 0,
                avg_ttl: None,
            },
            memory_stats: None,
        };
        
        Ok(EnhancedQueryResult {
            db_type: DatabaseType::Redis,
            data: query_data,
            metadata: QueryMetadata {
                query: query.to_string(),
                timestamp: chrono::Utc::now(),
                execution_plan: None,
                warnings: vec![],
            },
            execution_time: start_time.elapsed().as_millis() as u64,
            ui_config: self.get_ui_config(),
        })
    }
    
    async fn get_schema(&self) -> Result<DatabaseSchema> {
        Ok(DatabaseSchema {
            database_name: "Redis".to_string(),
            tables: vec![],
            views: vec![],
            procedures: vec![],
            functions: vec![],
        })
    }
    
    fn get_query_suggestions(&self, _context: &str) -> Vec<QuerySuggestion> {
        vec![
            QuerySuggestion {
                text: "GET".to_string(),
                description: "获取键值".to_string(),
                category: SuggestionCategory::Command,
                score: 100,
            },
            QuerySuggestion {
                text: "SET".to_string(),
                description: "设置键值".to_string(),
                category: SuggestionCategory::Command,
                score: 95,
            },
            QuerySuggestion {
                text: "KEYS".to_string(),
                description: "查找键".to_string(),
                category: SuggestionCategory::Command,
                score: 90,
            },
        ]
    }
    
    fn get_ui_config(&self) -> DatabaseUIConfig {
        DatabaseUIConfig {
            display_mode: DisplayMode::KeyValue,
            supported_operations: vec![
                Operation::Get,
                Operation::Set,
                Operation::Keys,
                Operation::Monitor,
                Operation::FlushDB,
                Operation::Info,
            ],
            editor_config: EditorConfig {
                language: "redis".to_string(),
                auto_complete: true,
                syntax_highlighting: true,
                keywords: vec!["GET".to_string(), "SET".to_string(), "KEYS".to_string()],
                functions: vec![],
                operators: vec![],
            },
            export_formats: vec![ExportFormat::JSON, ExportFormat::Redis],
            monitoring_capable: true,
            theme: Some(DatabaseTheme {
                primary_color: "#d82c20".to_string(),
                accent_color: "#ffffff".to_string(),
                icon: "🔴".to_string(),
            }),
        }
    }
    
    async fn get_real_time_stats(&self) -> Result<Option<DatabaseStats>> {
        // Redis 支持实时监控
        Ok(Some(DatabaseStats {
            connection_count: 1,
            query_count: 0,
            cache_hit_ratio: 0.95,
            uptime: 3600,
            version: "7.0".to_string(),
        }))
    }
    
    async fn test_connection(&self) -> Result<bool> {
        let connection = self.connection.lock().await;
        Ok(connection.is_connected())
    }
    
    async fn close(&self) -> Result<()> {
        Ok(())
    }
}

/// MongoDB 适配器
pub struct MongoDBAdapter {
    connection: Arc<crate::database::mongodb::MongoDBConnection>,
    config: ConnectionConfig,
}

impl MongoDBAdapter {
    pub async fn new(config: &ConnectionConfig) -> Result<Self> {
        let mut connection = crate::database::mongodb::MongoDBConnection::new();
        connection.connect(config).await?;
        
        Ok(Self {
            connection: Arc::new(connection),
            config: config.clone(),
        })
    }
}

#[async_trait::async_trait]
impl DatabaseAdapter for MongoDBAdapter {
    async fn execute(&self, query: &str) -> Result<EnhancedQueryResult> {
        let start_time = std::time::Instant::now();
        let raw_result = self.connection.execute(query).await?;
        
        // 简化的 MongoDB 数据转换
        let documents = vec![
            serde_json::json!({
                "_id": "sample_id",
                "data": "sample_data"
            })
        ];
        
        let query_data = QueryData::Document {
            documents,
            collection_stats: None,
            indexes: None,
        };
        
        Ok(EnhancedQueryResult {
            db_type: DatabaseType::MongoDB,
            data: query_data,
            metadata: QueryMetadata {
                query: query.to_string(),
                timestamp: chrono::Utc::now(),
                execution_plan: None,
                warnings: vec![],
            },
            execution_time: start_time.elapsed().as_millis() as u64,
            ui_config: self.get_ui_config(),
        })
    }
    
    async fn get_schema(&self) -> Result<DatabaseSchema> {
        Ok(DatabaseSchema {
            database_name: self.config.database.clone().unwrap_or_default(),
            tables: vec![],
            views: vec![],
            procedures: vec![],
            functions: vec![],
        })
    }
    
    fn get_query_suggestions(&self, _context: &str) -> Vec<QuerySuggestion> {
        vec![
            QuerySuggestion {
                text: "db.collection.find()".to_string(),
                description: "查询文档".to_string(),
                category: SuggestionCategory::Command,
                score: 100,
            },
        ]
    }
    
    fn get_ui_config(&self) -> DatabaseUIConfig {
        DatabaseUIConfig {
            display_mode: DisplayMode::Document,
            supported_operations: vec![
                Operation::Find,
                Operation::InsertOne,
                Operation::UpdateOne,
                Operation::DeleteOne,
                Operation::Aggregate,
            ],
            editor_config: EditorConfig {
                language: "mongodb".to_string(),
                auto_complete: true,
                syntax_highlighting: true,
                keywords: vec!["db".to_string(), "find".to_string(), "insert".to_string()],
                functions: vec![],
                operators: vec![],
            },
            export_formats: vec![ExportFormat::JSON, ExportFormat::MongoDB],
            monitoring_capable: false,
            theme: Some(DatabaseTheme {
                primary_color: "#47a248".to_string(),
                accent_color: "#ffffff".to_string(),
                icon: "🍃".to_string(),
            }),
        }
    }
    
    async fn get_real_time_stats(&self) -> Result<Option<DatabaseStats>> {
        Ok(None)
    }
    
    async fn test_connection(&self) -> Result<bool> {
        Ok(self.connection.is_connected())
    }
    
    async fn close(&self) -> Result<()> {
        Ok(())
    }
}

/// SQLite 适配器（预留）
pub struct SQLiteAdapter {
    config: ConnectionConfig,
}

impl SQLiteAdapter {
    pub async fn new(config: &ConnectionConfig) -> Result<Self> {
        Ok(Self {
            config: config.clone(),
        })
    }
}

#[async_trait::async_trait]
impl DatabaseAdapter for SQLiteAdapter {
    async fn execute(&self, _query: &str) -> Result<EnhancedQueryResult> {
        // SQLite 适配器待实现
        todo!("SQLite adapter not implemented yet")
    }
    
    async fn get_schema(&self) -> Result<DatabaseSchema> {
        todo!("SQLite schema not implemented yet")
    }
    
    fn get_query_suggestions(&self, _context: &str) -> Vec<QuerySuggestion> {
        vec![]
    }
    
    fn get_ui_config(&self) -> DatabaseUIConfig {
        DatabaseUIConfig {
            display_mode: DisplayMode::Table,
            supported_operations: vec![],
            editor_config: EditorConfig {
                language: "sqlite".to_string(),
                auto_complete: false,
                syntax_highlighting: false,
                keywords: vec![],
                functions: vec![],
                operators: vec![],
            },
            export_formats: vec![],
            monitoring_capable: false,
            theme: None,
        }
    }
    
    async fn get_real_time_stats(&self) -> Result<Option<DatabaseStats>> {
        Ok(None)
    }
    
    async fn test_connection(&self) -> Result<bool> {
        Ok(false)
    }
    
    async fn close(&self) -> Result<()> {
        Ok(())
    }
}