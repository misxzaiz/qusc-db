#[cfg(test)]
mod tests {
    use crate::database::{enhanced_types::*, test_adapter::*};
    use crate::database::{QueryResult as LegacyQueryResult, TableInfo as LegacyTableInfo, ColumnInfo as LegacyColumnInfo, ConnectionConfig as LegacyConnectionConfig, DatabaseConnection};
    use std::collections::HashMap;

    // 创建模拟的数据库连接用于测试
    struct MockConnection {
        connected: bool,
    }

    #[async_trait::async_trait]
    impl DatabaseConnection for MockConnection {
        async fn connect(&mut self, _config: &LegacyConnectionConfig) -> anyhow::Result<()> {
            self.connected = true;
            Ok(())
        }

        async fn disconnect(&mut self) -> anyhow::Result<()> {
            self.connected = false;
            Ok(())
        }

        async fn execute(&self, _query: &str) -> anyhow::Result<LegacyQueryResult> {
            Ok(LegacyQueryResult {
                columns: vec!["id".to_string(), "name".to_string()],
                rows: vec![
                    vec!["1".to_string(), "Alice".to_string()],
                    vec!["2".to_string(), "Bob".to_string()],
                ],
                affected_rows: 2,
                execution_time: 50,
            })
        }

        async fn get_schema(&self) -> anyhow::Result<Vec<LegacyTableInfo>> {
            Ok(vec![
                LegacyTableInfo {
                    name: "users".to_string(),
                    columns: vec![
                        LegacyColumnInfo {
                            name: "id".to_string(),
                            data_type: "INT".to_string(),
                            nullable: false,
                            primary_key: true,
                        },
                        LegacyColumnInfo {
                            name: "name".to_string(),
                            data_type: "VARCHAR(255)".to_string(),
                            nullable: true,
                            primary_key: false,
                        }
                    ],
                }
            ])
        }

        fn is_connected(&self) -> bool {
            self.connected
        }
    }

    #[test]
    fn test_adapter_converter_legacy_config() {
        // 测试配置转换
        let enhanced_config = ConnectionConfig {
            db_type: DatabaseType::MySQL,
            host: "localhost".to_string(),
            port: 3306,
            username: Some("root".to_string()),
            password: Some("password".to_string()),
            database: Some("test_db".to_string()),
            options: HashMap::new(),
        };

        let legacy_config = AdapterConverter::to_legacy_config(&enhanced_config);
        
        assert_eq!(legacy_config.host, "localhost");
        assert_eq!(legacy_config.port, 3306);
        assert_eq!(legacy_config.username, Some("root".to_string()));
        assert_eq!(legacy_config.password, Some("password".to_string()));
        assert_eq!(legacy_config.database, Some("test_db".to_string()));
    }

    #[test]
    fn test_adapter_converter_mysql_result() {
        // 测试MySQL结果转换
        let legacy_result = LegacyQueryResult {
            columns: vec!["id".to_string(), "name".to_string()],
            rows: vec![
                vec!["1".to_string(), "Alice".to_string()],
                vec!["2".to_string(), "Bob".to_string()],
            ],
            affected_rows: 2,
            execution_time: 50,
        };

        let enhanced_result = AdapterConverter::from_legacy_result(
            legacy_result,
            DatabaseType::MySQL,
        );

        assert_eq!(enhanced_result.db_type, DatabaseType::MySQL);
        assert_eq!(enhanced_result.execution_time, 50);

        if let QueryData::Relational { columns, rows, affected_rows, .. } = enhanced_result.data {
            assert_eq!(columns.len(), 2);
            assert_eq!(columns[0].name, "id");
            assert_eq!(columns[1].name, "name");
            
            assert_eq!(rows.len(), 2);
            assert_eq!(rows[0].len(), 2);
            
            if let CellValue::String(value) = &rows[0][1] {
                assert_eq!(value, "Alice");
            } else {
                panic!("Expected string value");
            }
            
            assert_eq!(affected_rows, 2);
        } else {
            panic!("Expected relational data for MySQL");
        }
    }

    #[test]
    fn test_adapter_converter_redis_result() {
        // 测试Redis结果转换
        let legacy_result = LegacyQueryResult {
            columns: vec!["key".to_string()],
            rows: vec![vec!["value123".to_string()]],
            affected_rows: 1,
            execution_time: 10,
        };

        let enhanced_result = AdapterConverter::from_legacy_result(
            legacy_result,
            DatabaseType::Redis,
        );

        assert_eq!(enhanced_result.db_type, DatabaseType::Redis);
        assert_eq!(enhanced_result.execution_time, 10);

        if let QueryData::KeyValue { entries, database_info, .. } = enhanced_result.data {
            assert_eq!(entries.len(), 1);
            assert_eq!(entries[0].key, "sample_key");
            
            if let RedisValue::String { value } = &entries[0].value {
                assert_eq!(value, "value123");
            } else {
                panic!("Expected string value for Redis");
            }
            
            assert_eq!(database_info.database_index, 0);
        } else {
            panic!("Expected key-value data for Redis");
        }
    }

    #[test]
    fn test_adapter_converter_mongodb_result() {
        // 测试MongoDB结果转换
        let legacy_result = LegacyQueryResult {
            columns: vec!["document".to_string()],
            rows: vec![vec!["{}".to_string()]],
            affected_rows: 1,
            execution_time: 25,
        };

        let enhanced_result = AdapterConverter::from_legacy_result(
            legacy_result,
            DatabaseType::MongoDB,
        );

        assert_eq!(enhanced_result.db_type, DatabaseType::MongoDB);
        assert_eq!(enhanced_result.execution_time, 25);

        if let QueryData::Document { documents, .. } = enhanced_result.data {
            assert_eq!(documents.len(), 1);
            assert_eq!(documents[0]["sample"], "data");
        } else {
            panic!("Expected document data for MongoDB");
        }
    }

    #[test]
    fn test_adapter_converter_ui_config_mysql() {
        // 测试MySQL UI配置
        let ui_config = AdapterConverter::get_ui_config_for_db_type(DatabaseType::MySQL);
        
        assert_eq!(ui_config.display_mode, DisplayMode::Table);
        assert!(ui_config.supported_operations.contains(&Operation::Select));
        assert!(ui_config.supported_operations.contains(&Operation::Insert));
        assert!(ui_config.supported_operations.contains(&Operation::Update));
        assert!(ui_config.supported_operations.contains(&Operation::Delete));
        
        assert_eq!(ui_config.editor_config.language, "mysql");
        assert!(ui_config.editor_config.auto_complete);
        assert!(ui_config.editor_config.syntax_highlighting);
        
        assert!(ui_config.export_formats.contains(&ExportFormat::CSV));
        assert!(ui_config.export_formats.contains(&ExportFormat::Excel));
        assert!(ui_config.export_formats.contains(&ExportFormat::JSON));
        
        assert!(!ui_config.monitoring_capable);
        
        let theme = ui_config.theme.unwrap();
        assert_eq!(theme.primary_color, "#00758f");
        assert_eq!(theme.accent_color, "#f29111");
        assert_eq!(theme.icon, "🗄️");
    }

    #[test]
    fn test_adapter_converter_ui_config_redis() {
        // 测试Redis UI配置
        let ui_config = AdapterConverter::get_ui_config_for_db_type(DatabaseType::Redis);
        
        assert_eq!(ui_config.display_mode, DisplayMode::KeyValue);
        assert!(ui_config.supported_operations.contains(&Operation::Get));
        assert!(ui_config.supported_operations.contains(&Operation::Set));
        assert!(ui_config.supported_operations.contains(&Operation::Keys));
        assert!(ui_config.supported_operations.contains(&Operation::Monitor));
        
        assert_eq!(ui_config.editor_config.language, "redis");
        assert!(ui_config.export_formats.contains(&ExportFormat::JSON));
        assert!(ui_config.export_formats.contains(&ExportFormat::Redis));
        
        assert!(ui_config.monitoring_capable);
        
        let theme = ui_config.theme.unwrap();
        assert_eq!(theme.primary_color, "#d82c20");
        assert_eq!(theme.icon, "🔴");
    }

    #[test]
    fn test_adapter_converter_ui_config_mongodb() {
        // 测试MongoDB UI配置
        let ui_config = AdapterConverter::get_ui_config_for_db_type(DatabaseType::MongoDB);
        
        assert_eq!(ui_config.display_mode, DisplayMode::Document);
        assert!(ui_config.supported_operations.contains(&Operation::Find));
        assert!(ui_config.supported_operations.contains(&Operation::InsertOne));
        assert!(ui_config.supported_operations.contains(&Operation::UpdateOne));
        assert!(ui_config.supported_operations.contains(&Operation::DeleteOne));
        
        assert_eq!(ui_config.editor_config.language, "mongodb");
        assert!(ui_config.export_formats.contains(&ExportFormat::JSON));
        assert!(ui_config.export_formats.contains(&ExportFormat::MongoDB));
        
        let theme = ui_config.theme.unwrap();
        assert_eq!(theme.primary_color, "#47a248");
        assert_eq!(theme.icon, "🍃");
    }

    #[tokio::test]
    async fn test_test_database_adapter() {
        // 测试TestDatabaseAdapter
        let mock_conn = Box::new(MockConnection { connected: false });
        let adapter = TestDatabaseAdapter::new(mock_conn, DatabaseType::MySQL);
        
        // 测试执行查询
        let result = adapter.execute("SELECT * FROM users").await.unwrap();
        assert_eq!(result.db_type, DatabaseType::MySQL);
        assert_eq!(result.execution_time, 50);
        
        if let QueryData::Relational { rows, .. } = result.data {
            assert_eq!(rows.len(), 2);
        } else {
            panic!("Expected relational data");
        }
        
        // 测试获取模式
        let schema = adapter.get_schema().await.unwrap();
        assert_eq!(schema.database_name, "test_db");
        assert_eq!(schema.tables.len(), 1);
        assert_eq!(schema.tables[0].name, "users");
        assert_eq!(schema.tables[0].columns.len(), 2);
        
        // 测试查询建议
        let suggestions = adapter.get_query_suggestions("test");
        assert_eq!(suggestions.len(), 1);
        assert_eq!(suggestions[0].text, "SELECT");
        
        // 测试UI配置
        let ui_config = adapter.get_ui_config();
        assert_eq!(ui_config.display_mode, DisplayMode::Table);
        
        // 测试连接测试
        let is_connected = adapter.test_connection().await.unwrap();
        assert!(!is_connected); // MockConnection默认未连接
        
        // 测试关闭连接
        let close_result = adapter.close().await;
        assert!(close_result.is_ok());
    }

    #[tokio::test]
    async fn test_test_database_adapter_redis() {
        // 测试Redis适配器的实时统计
        let mock_conn = Box::new(MockConnection { connected: true });
        let adapter = TestDatabaseAdapter::new(mock_conn, DatabaseType::Redis);
        
        let stats = adapter.get_real_time_stats().await.unwrap();
        assert!(stats.is_some());
        
        let stats = stats.unwrap();
        assert_eq!(stats.connection_count, 1);
        assert_eq!(stats.cache_hit_ratio, 0.95);
        assert_eq!(stats.version, "7.0");
    }

    #[tokio::test] 
    async fn test_test_database_adapter_non_redis() {
        // 测试非Redis数据库的实时统计
        let mock_conn = Box::new(MockConnection { connected: true });
        let adapter = TestDatabaseAdapter::new(mock_conn, DatabaseType::MySQL);
        
        let stats = adapter.get_real_time_stats().await.unwrap();
        assert!(stats.is_none()); // 非Redis数据库不提供实时统计
    }

    #[test]
    fn test_null_value_conversion() {
        // 测试NULL值的转换
        let legacy_result = LegacyQueryResult {
            columns: vec!["id".to_string(), "name".to_string()],
            rows: vec![
                vec!["1".to_string(), "Alice".to_string()],
                vec!["2".to_string(), "NULL".to_string()], // NULL值测试
            ],
            affected_rows: 2,
            execution_time: 50,
        };

        let enhanced_result = AdapterConverter::from_legacy_result(
            legacy_result,
            DatabaseType::MySQL,
        );

        if let QueryData::Relational { rows, .. } = enhanced_result.data {
            assert_eq!(rows.len(), 2);
            
            // 检查第二行的NULL值
            if let CellValue::Null = &rows[1][1] {
                // 正确转换为Null
            } else {
                panic!("Expected NULL value to be converted to CellValue::Null");
            }
        } else {
            panic!("Expected relational data");
        }
    }
}