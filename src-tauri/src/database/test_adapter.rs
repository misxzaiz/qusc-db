// 测试版本的适配器 - 用于验证核心架构

use crate::database::{
    enhanced_types::*,
    DatabaseConnection, ConnectionConfig as LegacyConnectionConfig, QueryResult as LegacyQueryResult,
};
use anyhow::Result;

#[cfg(test)]
mod adapter_tests;

/// 适配器转换工具
pub struct AdapterConverter;

impl AdapterConverter {
    /// 将新的ConnectionConfig转换为旧的
    pub fn to_legacy_config(config: &ConnectionConfig) -> LegacyConnectionConfig {
        LegacyConnectionConfig {
            db_type: match config.db_type {
                DatabaseType::MySQL => crate::database::DatabaseType::MySQL,
                DatabaseType::PostgreSQL => crate::database::DatabaseType::PostgreSQL,
                DatabaseType::Redis => crate::database::DatabaseType::Redis,
                DatabaseType::MongoDB => crate::database::DatabaseType::MongoDB,
                DatabaseType::SQLite => crate::database::DatabaseType::SQLite,
            },
            host: config.host.clone(),
            port: config.port,
            username: config.username.clone(),
            password: config.password.clone(),
            database: config.database.clone(),
            options: config.options.clone(),
        }
    }

    /// 将旧的QueryResult转换为新的EnhancedQueryResult
    pub fn from_legacy_result(
        legacy_result: LegacyQueryResult,
        db_type: DatabaseType,
    ) -> EnhancedQueryResult {
        let query_data = match db_type {
            DatabaseType::MySQL | DatabaseType::PostgreSQL | DatabaseType::SQLite => {
                QueryData::Relational {
                    columns: legacy_result.columns.into_iter().map(|name| ColumnInfo {
                        name,
                        data_type: "VARCHAR".to_string(),
                        nullable: false,
                        primary_key: false,
                        auto_increment: false,
                        default_value: None,
                        charset: None,
                        comment: None,
                        extra: std::collections::HashMap::new(),
                    }).collect(),
                    rows: legacy_result.rows.into_iter().map(|row| {
                        row.into_iter().map(|cell| {
                            if cell == "NULL" {
                                CellValue::Null
                            } else {
                                CellValue::String(cell)
                            }
                        }).collect()
                    }).collect(),
                    total_rows: None,
                    affected_rows: legacy_result.affected_rows,
                    schema_info: None,
                }
            }
            DatabaseType::Redis => {
                // 将Redis结果转换为KeyValue格式
                let entries = if !legacy_result.rows.is_empty() && !legacy_result.rows[0].is_empty() {
                    vec![RedisEntry {
                        key: "sample_key".to_string(),
                        data_type: RedisDataType::String,
                        value: RedisValue::String {
                            value: legacy_result.rows[0][0].clone(),
                        },
                        ttl: None,
                        memory_usage: None,
                        encoding: None,
                    }]
                } else {
                    vec![]
                };

                QueryData::KeyValue {
                    entries,
                    database_info: RedisDatabaseInfo {
                        database_index: 0,
                        key_count: 0,
                        expires_count: 0,
                        avg_ttl: None,
                    },
                    memory_stats: None,
                }
            }
            DatabaseType::MongoDB => {
                // 将MongoDB结果转换为Document格式
                QueryData::Document {
                    documents: vec![serde_json::json!({"sample": "data"})],
                    collection_stats: None,
                    indexes: None,
                }
            }
        };

        EnhancedQueryResult {
            db_type: db_type.clone(),
            data: query_data,
            metadata: QueryMetadata {
                query: "".to_string(),
                timestamp: chrono::Utc::now(),
                execution_plan: None,
                warnings: vec![],
            },
            execution_time: legacy_result.execution_time,
            ui_config: Self::get_ui_config_for_db_type(db_type),
        }
    }

    /// 根据数据库类型获取UI配置
    pub fn get_ui_config_for_db_type(db_type: DatabaseType) -> DatabaseUIConfig {
        match db_type {
            DatabaseType::MySQL => DatabaseUIConfig {
                display_mode: DisplayMode::Table,
                supported_operations: vec![
                    Operation::Select, Operation::Insert, Operation::Update, Operation::Delete,
                ],
                editor_config: EditorConfig {
                    language: "mysql".to_string(),
                    auto_complete: true,
                    syntax_highlighting: true,
                    keywords: vec!["SELECT".to_string(), "FROM".to_string(), "WHERE".to_string()],
                    functions: vec!["COUNT".to_string(), "SUM".to_string()],
                    operators: vec!["=".to_string(), "!=".to_string()],
                },
                export_formats: vec![ExportFormat::CSV, ExportFormat::Excel, ExportFormat::JSON],
                monitoring_capable: false,
                theme: Some(DatabaseTheme {
                    primary_color: "#00758f".to_string(),
                    accent_color: "#f29111".to_string(),
                    icon: "🗄️".to_string(),
                }),
            },
            DatabaseType::PostgreSQL => DatabaseUIConfig {
                display_mode: DisplayMode::Table,
                supported_operations: vec![
                    Operation::Select, Operation::Insert, Operation::Update, Operation::Delete,
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
            },
            DatabaseType::Redis => DatabaseUIConfig {
                display_mode: DisplayMode::KeyValue,
                supported_operations: vec![
                    Operation::Get, Operation::Set, Operation::Keys, Operation::Monitor,
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
            },
            DatabaseType::MongoDB => DatabaseUIConfig {
                display_mode: DisplayMode::Document,
                supported_operations: vec![
                    Operation::Find, Operation::InsertOne, Operation::UpdateOne, Operation::DeleteOne,
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
            },
            DatabaseType::SQLite => DatabaseUIConfig {
                display_mode: DisplayMode::Table,
                supported_operations: vec![Operation::Select],
                editor_config: EditorConfig {
                    language: "sqlite".to_string(),
                    auto_complete: false,
                    syntax_highlighting: false,
                    keywords: vec![],
                    functions: vec![],
                    operators: vec![],
                },
                export_formats: vec![ExportFormat::CSV],
                monitoring_capable: false,
                theme: None,
            },
        }
    }
}

/// 简单的测试包装适配器
pub struct TestDatabaseAdapter {
    connection: Box<dyn DatabaseConnection>,
    db_type: DatabaseType,
}

impl TestDatabaseAdapter {
    pub fn new(connection: Box<dyn DatabaseConnection>, db_type: DatabaseType) -> Self {
        Self { connection, db_type }
    }
}

#[async_trait::async_trait]
impl DatabaseAdapter for TestDatabaseAdapter {
    async fn execute(&self, query: &str) -> Result<EnhancedQueryResult> {
        let legacy_result = self.connection.execute(query).await?;
        Ok(AdapterConverter::from_legacy_result(legacy_result, self.db_type.clone()))
    }

    async fn get_schema(&self) -> Result<DatabaseSchema> {
        let table_infos = self.connection.get_schema().await?;
        
        Ok(DatabaseSchema {
            database_name: "test_db".to_string(),
            tables: table_infos.into_iter().map(|table| TableSchema {
                name: table.name,
                columns: table.columns.into_iter().map(|col| ColumnInfo {
                    name: col.name,
                    data_type: col.data_type,
                    nullable: col.nullable,
                    primary_key: col.primary_key,
                    auto_increment: false,
                    default_value: None,
                    charset: None,
                    comment: None,
                    extra: std::collections::HashMap::new(),
                }).collect(),
                indexes: vec![],
                foreign_keys: vec![],
                table_comment: None,
                engine: None,
                charset: None,
            }).collect(),
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
        AdapterConverter::get_ui_config_for_db_type(self.db_type.clone())
    }

    async fn get_real_time_stats(&self) -> Result<Option<DatabaseStats>> {
        if self.db_type == DatabaseType::Redis {
            Ok(Some(DatabaseStats {
                connection_count: 1,
                query_count: 0,
                cache_hit_ratio: 0.95,
                uptime: 3600,
                version: "7.0".to_string(),
            }))
        } else {
            Ok(None)
        }
    }

    async fn test_connection(&self) -> Result<bool> {
        Ok(self.connection.is_connected())
    }

    async fn close(&self) -> Result<()> {
        // 由于我们包装的是现有连接，这里简化处理
        Ok(())
    }
}