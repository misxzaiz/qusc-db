// 数据库模块集成测试

use std::collections::HashMap;
use qusc_db::database::{
    enhanced_types::*,
    test_adapter::{AdapterConverter, TestDatabaseAdapter},
    ConnectionConfig as LegacyConnectionConfig,
    QueryResult as LegacyQueryResult,
    DatabaseConnection,
    DatabaseType as LegacyDatabaseType,
    TableInfo as LegacyTableInfo,
    ColumnInfo as LegacyColumnInfo,
};
use anyhow::Result;

// 创建模拟的MySQL连接用于集成测试
struct IntegrationMockConnection {
    connected: bool,
    db_type: LegacyDatabaseType,
}

#[async_trait::async_trait]
impl DatabaseConnection for IntegrationMockConnection {
    async fn connect(&mut self, _config: &LegacyConnectionConfig) -> Result<()> {
        self.connected = true;
        Ok(())
    }

    async fn disconnect(&mut self) -> Result<()> {
        self.connected = false;
        Ok(())
    }

    async fn execute(&self, query: &str) -> Result<LegacyQueryResult> {
        // 根据查询类型返回不同的模拟结果
        match query.to_uppercase().as_str() {
            q if q.starts_with("SELECT") => {
                Ok(LegacyQueryResult {
                    columns: vec!["id".to_string(), "name".to_string(), "email".to_string()],
                    rows: vec![
                        vec!["1".to_string(), "Alice".to_string(), "alice@example.com".to_string()],
                        vec!["2".to_string(), "Bob".to_string(), "bob@example.com".to_string()],
                        vec!["3".to_string(), "Charlie".to_string(), "NULL".to_string()],
                    ],
                    affected_rows: 0,
                    execution_time: 45,
                })
            }
            q if q.starts_with("INSERT") => {
                Ok(LegacyQueryResult {
                    columns: vec![],
                    rows: vec![],
                    affected_rows: 1,
                    execution_time: 20,
                })
            }
            q if q.starts_with("UPDATE") => {
                Ok(LegacyQueryResult {
                    columns: vec![],
                    rows: vec![],
                    affected_rows: 2,
                    execution_time: 30,
                })
            }
            q if q.starts_with("DELETE") => {
                Ok(LegacyQueryResult {
                    columns: vec![],
                    rows: vec![],
                    affected_rows: 1,
                    execution_time: 25,
                })
            }
            _ => {
                Ok(LegacyQueryResult {
                    columns: vec!["result".to_string()],
                    rows: vec![vec!["OK".to_string()]],
                    affected_rows: 0,
                    execution_time: 10,
                })
            }
        }
    }

    async fn get_schema(&self) -> Result<Vec<LegacyTableInfo>> {
        Ok(vec![
            LegacyTableInfo {
                name: "users".to_string(),
                columns: vec![
                    LegacyColumnInfo {
                        name: "id".to_string(),
                        data_type: "INT AUTO_INCREMENT".to_string(),
                        nullable: false,
                        primary_key: true,
                    },
                    LegacyColumnInfo {
                        name: "name".to_string(),
                        data_type: "VARCHAR(255)".to_string(),
                        nullable: false,
                        primary_key: false,
                    },
                    LegacyColumnInfo {
                        name: "email".to_string(),
                        data_type: "VARCHAR(255)".to_string(),
                        nullable: true,
                        primary_key: false,
                    },
                ],
            },
            LegacyTableInfo {
                name: "orders".to_string(),
                columns: vec![
                    LegacyColumnInfo {
                        name: "id".to_string(),
                        data_type: "INT AUTO_INCREMENT".to_string(),
                        nullable: false,
                        primary_key: true,
                    },
                    LegacyColumnInfo {
                        name: "user_id".to_string(),
                        data_type: "INT".to_string(),
                        nullable: false,
                        primary_key: false,
                    },
                    LegacyColumnInfo {
                        name: "amount".to_string(),
                        data_type: "DECIMAL(10,2)".to_string(),
                        nullable: false,
                        primary_key: false,
                    },
                ],
            },
        ])
    }

    async fn get_databases(&self) -> Result<Vec<String>> {
        Ok(vec![
            "test_db".to_string(),
            "production_db".to_string(),
            "analytics_db".to_string(),
        ])
    }

    async fn use_database(&mut self, database_name: &str) -> Result<()> {
        println!("Switched to database: {}", database_name);
        Ok(())
    }

    fn is_connected(&self) -> bool {
        self.connected
    }
}

#[tokio::test]
async fn test_full_mysql_workflow() {
    // 测试完整的MySQL工作流程
    let mock_conn = Box::new(IntegrationMockConnection {
        connected: false,
        db_type: LegacyDatabaseType::MySQL,
    });
    let adapter = TestDatabaseAdapter::new(mock_conn, DatabaseType::MySQL);

    // 1. 测试查询执行
    let select_result = adapter.execute("SELECT * FROM users").await.unwrap();
    assert_eq!(select_result.db_type, DatabaseType::MySQL);
    assert_eq!(select_result.execution_time, 45);

    if let QueryData::Relational { columns, rows, affected_rows, .. } = select_result.data {
        assert_eq!(columns.len(), 3);
        assert_eq!(columns[0].name, "id");
        assert_eq!(columns[1].name, "name");
        assert_eq!(columns[2].name, "email");

        assert_eq!(rows.len(), 3);
        
        // 检查NULL值处理
        if let CellValue::Null = &rows[2][2] {
            // 正确处理NULL
        } else {
            panic!("Expected NULL value for Charlie's email");
        }

        assert_eq!(affected_rows, 0); // SELECT不影响行数
    } else {
        panic!("Expected relational data for MySQL");
    }

    // 2. 测试INSERT操作
    let insert_result = adapter.execute("INSERT INTO users (name, email) VALUES ('David', 'david@example.com')").await.unwrap();
    if let QueryData::Relational { affected_rows, .. } = insert_result.data {
        assert_eq!(affected_rows, 1);
    } else {
        panic!("Expected relational data for INSERT");
    }

    // 3. 测试UPDATE操作
    let update_result = adapter.execute("UPDATE users SET email = 'new@example.com' WHERE id IN (1, 2)").await.unwrap();
    if let QueryData::Relational { affected_rows, .. } = update_result.data {
        assert_eq!(affected_rows, 2);
    } else {
        panic!("Expected relational data for UPDATE");
    }

    // 4. 测试模式获取
    let schema = adapter.get_schema().await.unwrap();
    assert_eq!(schema.database_name, "test_db");
    assert_eq!(schema.tables.len(), 2);
    
    // 检查users表结构
    let users_table = &schema.tables[0];
    assert_eq!(users_table.name, "users");
    assert_eq!(users_table.columns.len(), 3);
    assert_eq!(users_table.columns[0].name, "id");
    assert!(users_table.columns[0].primary_key);
    
    // 检查orders表结构
    let orders_table = &schema.tables[1];
    assert_eq!(orders_table.name, "orders");
    assert_eq!(orders_table.columns.len(), 3);
    assert_eq!(orders_table.columns[2].name, "amount");
    assert_eq!(orders_table.columns[2].data_type, "DECIMAL(10,2)");

    // 5. 测试UI配置
    let ui_config = adapter.get_ui_config();
    assert_eq!(ui_config.display_mode, DisplayMode::Table);
    assert!(ui_config.supported_operations.contains(&Operation::Select));
    assert!(ui_config.supported_operations.contains(&Operation::Insert));
    assert!(ui_config.supported_operations.contains(&Operation::Update));
    assert!(ui_config.supported_operations.contains(&Operation::Delete));
    
    let theme = ui_config.theme.unwrap();
    assert_eq!(theme.primary_color, "#00758f");
    assert_eq!(theme.icon, "🗄️");

    // 6. 测试查询建议
    let suggestions = adapter.get_query_suggestions("SELECT");
    assert!(!suggestions.is_empty());
    assert_eq!(suggestions[0].text, "SELECT");
    assert_eq!(suggestions[0].category, SuggestionCategory::Keyword);
}

#[tokio::test]
async fn test_database_type_configurations() {
    // 测试不同数据库类型的配置

    // MySQL配置测试
    let mysql_config = AdapterConverter::get_ui_config_for_db_type(DatabaseType::MySQL);
    assert_eq!(mysql_config.display_mode, DisplayMode::Table);
    assert_eq!(mysql_config.editor_config.language, "mysql");
    assert!(!mysql_config.monitoring_capable);
    assert!(mysql_config.export_formats.contains(&ExportFormat::CSV));
    assert!(mysql_config.export_formats.contains(&ExportFormat::Excel));

    // PostgreSQL配置测试
    let pg_config = AdapterConverter::get_ui_config_for_db_type(DatabaseType::PostgreSQL);
    assert_eq!(pg_config.display_mode, DisplayMode::Table);
    assert_eq!(pg_config.editor_config.language, "postgresql");
    assert!(!pg_config.monitoring_capable);
    let pg_theme = pg_config.theme.unwrap();
    assert_eq!(pg_theme.primary_color, "#336791");
    assert_eq!(pg_theme.icon, "🐘");

    // Redis配置测试
    let redis_config = AdapterConverter::get_ui_config_for_db_type(DatabaseType::Redis);
    assert_eq!(redis_config.display_mode, DisplayMode::KeyValue);
    assert_eq!(redis_config.editor_config.language, "redis");
    assert!(redis_config.monitoring_capable);
    assert!(redis_config.supported_operations.contains(&Operation::Get));
    assert!(redis_config.supported_operations.contains(&Operation::Set));
    assert!(redis_config.supported_operations.contains(&Operation::Keys));
    assert!(redis_config.supported_operations.contains(&Operation::Monitor));
    let redis_theme = redis_config.theme.unwrap();
    assert_eq!(redis_theme.primary_color, "#d82c20");
    assert_eq!(redis_theme.icon, "🔴");

    // MongoDB配置测试
    let mongo_config = AdapterConverter::get_ui_config_for_db_type(DatabaseType::MongoDB);
    assert_eq!(mongo_config.display_mode, DisplayMode::Document);
    assert_eq!(mongo_config.editor_config.language, "mongodb");
    assert!(!mongo_config.monitoring_capable);
    assert!(mongo_config.supported_operations.contains(&Operation::Find));
    assert!(mongo_config.supported_operations.contains(&Operation::InsertOne));
    assert!(mongo_config.supported_operations.contains(&Operation::UpdateOne));
    assert!(mongo_config.supported_operations.contains(&Operation::DeleteOne));
    let mongo_theme = mongo_config.theme.unwrap();
    assert_eq!(mongo_theme.primary_color, "#47a248");
    assert_eq!(mongo_theme.icon, "🍃");

    // SQLite配置测试  
    let sqlite_config = AdapterConverter::get_ui_config_for_db_type(DatabaseType::SQLite);
    assert_eq!(sqlite_config.display_mode, DisplayMode::Table);
    assert_eq!(sqlite_config.editor_config.language, "sqlite");
    assert!(!sqlite_config.editor_config.auto_complete);
    assert!(!sqlite_config.editor_config.syntax_highlighting);
    assert!(!sqlite_config.monitoring_capable);
    assert!(sqlite_config.theme.is_none());
    assert_eq!(sqlite_config.export_formats, vec![ExportFormat::CSV]);
}

#[tokio::test]
async fn test_connection_config_conversion() {
    // 测试连接配置转换
    let mut options = HashMap::new();
    options.insert("charset".to_string(), "utf8mb4".to_string());
    options.insert("timeout".to_string(), "30".to_string());

    let enhanced_config = ConnectionConfig {
        db_type: DatabaseType::PostgreSQL,
        host: "localhost".to_string(),
        port: 5432,
        username: Some("postgres".to_string()),
        password: Some("secret123".to_string()),
        database: Some("app_db".to_string()),
        options,
    };

    let legacy_config = AdapterConverter::to_legacy_config(&enhanced_config);

    // 验证转换结果
    assert_eq!(legacy_config.host, "localhost");
    assert_eq!(legacy_config.port, 5432);
    assert_eq!(legacy_config.username, Some("postgres".to_string()));
    assert_eq!(legacy_config.password, Some("secret123".to_string()));
    assert_eq!(legacy_config.database, Some("app_db".to_string()));
    assert_eq!(legacy_config.options.get("charset"), Some(&"utf8mb4".to_string()));
    assert_eq!(legacy_config.options.get("timeout"), Some(&"30".to_string()));
}

#[test]
fn test_query_result_serialization() {
    // 测试查询结果的序列化和反序列化
    let columns = vec![
        ColumnInfo {
            name: "id".to_string(),
            data_type: "INT".to_string(),
            nullable: false,
            primary_key: true,
            auto_increment: true,
            default_value: None,
            charset: None,
            comment: Some("Primary key".to_string()),
            extra: HashMap::new(),
        }
    ];

    let query_data = QueryData::Relational {
        columns,
        rows: vec![vec![CellValue::Integer(1)]],
        total_rows: Some(1),
        affected_rows: 0,
        schema_info: None,
    };

    let result = EnhancedQueryResult {
        db_type: DatabaseType::MySQL,
        data: query_data,
        metadata: QueryMetadata {
            query: "SELECT * FROM test".to_string(),
            timestamp: chrono::Utc::now(),
            execution_plan: None,
            warnings: vec![],
        },
        execution_time: 100,
        ui_config: AdapterConverter::get_ui_config_for_db_type(DatabaseType::MySQL),
    };

    // 测试序列化
    let json = serde_json::to_string(&result).unwrap();
    assert!(json.contains("MySQL"));
    assert!(json.contains("SELECT * FROM test"));

    // 测试反序列化
    let deserialized: EnhancedQueryResult = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.db_type, DatabaseType::MySQL);
    assert_eq!(deserialized.execution_time, 100);
    assert_eq!(deserialized.metadata.query, "SELECT * FROM test");
}