#[cfg(test)]
mod tests {
    use crate::database::enhanced_types::*;
    use chrono::Utc;
    use std::collections::HashMap;

    #[test]
    fn test_database_type_serialization() {
        // 测试数据库类型的序列化和反序列化
        let mysql_type = DatabaseType::MySQL;
        let json = serde_json::to_string(&mysql_type).unwrap();
        assert_eq!(json, "\"MySQL\"");
        
        let deserialized: DatabaseType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, mysql_type);
    }

    #[test]
    fn test_cell_value_display() {
        // 测试CellValue的显示功能
        assert_eq!(CellValue::String("test".to_string()).to_display_string(), "test");
        assert_eq!(CellValue::Float(42.5).to_display_string(), "42.5");
        assert_eq!(CellValue::Boolean(true).to_display_string(), "true");
        assert_eq!(CellValue::Null.to_display_string(), "NULL");
        assert_eq!(CellValue::Binary(vec![1, 2, 3]).to_display_string(), "[BINARY: 3 bytes]");
    }

    #[test]
    fn test_cell_value_is_null() {
        assert!(CellValue::Null.is_null());
        assert!(!CellValue::String("test".to_string()).is_null());
        assert!(!CellValue::Integer(0).is_null());
    }

    #[test]
    fn test_enhanced_query_result_creation() {
        // 测试关系型数据查询结果创建
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
            },
            ColumnInfo {
                name: "name".to_string(),
                data_type: "VARCHAR(255)".to_string(),
                nullable: true,
                primary_key: false,
                auto_increment: false,
                default_value: Some("''".to_string()),
                charset: Some("utf8".to_string()),
                comment: None,
                extra: HashMap::new(),
            }
        ];

        let rows = vec![
            vec![CellValue::Integer(1), CellValue::String("Alice".to_string())],
            vec![CellValue::Integer(2), CellValue::String("Bob".to_string())],
        ];

        let query_data = QueryData::Relational {
            columns: columns.clone(),
            rows,
            total_rows: Some(2),
            affected_rows: 0,
            schema_info: None,
        };

        let metadata = QueryMetadata {
            query: "SELECT id, name FROM users".to_string(),
            timestamp: Utc::now(),
            execution_plan: None,
            warnings: vec![],
        };

        let ui_config = DatabaseUIConfig {
            display_mode: DisplayMode::Table,
            supported_operations: vec![Operation::Select],
            editor_config: EditorConfig {
                language: "sql".to_string(),
                auto_complete: true,
                syntax_highlighting: true,
                keywords: vec!["SELECT".to_string()],
                functions: vec!["COUNT".to_string()],
                operators: vec!["=".to_string()],
            },
            export_formats: vec![ExportFormat::CSV],
            monitoring_capable: false,
            theme: None,
        };

        let result = EnhancedQueryResult {
            db_type: DatabaseType::MySQL,
            data: query_data,
            metadata,
            execution_time: 50,
            ui_config,
        };

        assert_eq!(result.db_type, DatabaseType::MySQL);
        assert_eq!(result.execution_time, 50);
        
        if let QueryData::Relational { columns, rows, .. } = &result.data {
            assert_eq!(columns.len(), 2);
            assert_eq!(rows.len(), 2);
            assert_eq!(columns[0].name, "id");
            assert_eq!(columns[1].name, "name");
        } else {
            panic!("Expected relational data");
        }
    }

    #[test]
    fn test_redis_query_data() {
        // 测试Redis键值对数据结构
        let redis_entry = RedisEntry {
            key: "user:1".to_string(),
            data_type: RedisDataType::Hash,
            value: RedisValue::Hash {
                fields: vec![
                    ("name".to_string(), "Alice".to_string()),
                    ("age".to_string(), "25".to_string()),
                ]
            },
            ttl: Some(3600),
            memory_usage: Some(256),
            encoding: Some("hashtable".to_string()),
        };

        let db_info = RedisDatabaseInfo {
            database_index: 0,
            key_count: 100,
            expires_count: 10,
            avg_ttl: Some(1800),
        };

        let query_data = QueryData::KeyValue {
            entries: vec![redis_entry.clone()],
            database_info: db_info,
            memory_stats: None,
        };

        if let QueryData::KeyValue { entries, database_info, .. } = query_data {
            assert_eq!(entries.len(), 1);
            assert_eq!(entries[0].key, "user:1");
            assert_eq!(database_info.key_count, 100);
            
            if let RedisValue::Hash { fields } = &entries[0].value {
                assert_eq!(fields.len(), 2);
                assert_eq!(fields[0].0, "name");
                assert_eq!(fields[0].1, "Alice");
            } else {
                panic!("Expected hash value");
            }
        } else {
            panic!("Expected key-value data");
        }
    }

    #[test]
    fn test_mongodb_query_data() {
        // 测试MongoDB文档数据结构
        let doc1 = serde_json::json!({
            "_id": "507f1f77bcf86cd799439011",
            "name": "Alice",
            "age": 25,
            "active": true
        });

        let doc2 = serde_json::json!({
            "_id": "507f1f77bcf86cd799439012",
            "name": "Bob",
            "age": 30,
            "active": false
        });

        let collection_stats = CollectionStats {
            document_count: 2,
            size: 1024,
            storage_size: 2048,
            average_document_size: 512.0,
            indexes_size: 256,
        };

        let query_data = QueryData::Document {
            documents: vec![doc1, doc2],
            collection_stats: Some(collection_stats.clone()),
            indexes: None,
        };

        if let QueryData::Document { documents, collection_stats, .. } = query_data {
            assert_eq!(documents.len(), 2);
            assert_eq!(documents[0]["name"], "Alice");
            assert_eq!(documents[1]["name"], "Bob");
            
            assert!(collection_stats.is_some());
            let stats = collection_stats.unwrap();
            assert_eq!(stats.document_count, 2);
            assert_eq!(stats.size, 1024);
        } else {
            panic!("Expected document data");
        }
    }

    #[test]
    fn test_query_suggestion() {
        // 测试查询建议功能
        let suggestion = QuerySuggestion {
            text: "SELECT * FROM users".to_string(),
            description: "查询所有用户".to_string(),
            category: SuggestionCategory::Template,
            score: 95,
        };

        assert_eq!(suggestion.text, "SELECT * FROM users");
        assert_eq!(suggestion.score, 95);
        assert!(matches!(suggestion.category, SuggestionCategory::Template));
    }

    #[test]
    fn test_database_ui_config() {
        // 测试UI配置
        let mut extra_props = HashMap::new();
        extra_props.insert("font_size".to_string(), "14px".to_string());

        let ui_config = DatabaseUIConfig {
            display_mode: DisplayMode::KeyValue,
            supported_operations: vec![Operation::Get, Operation::Set],
            editor_config: EditorConfig {
                language: "redis".to_string(),
                auto_complete: true,
                syntax_highlighting: true,
                keywords: vec!["GET".to_string(), "SET".to_string()],
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
        };

        assert_eq!(ui_config.display_mode, DisplayMode::KeyValue);
        assert!(ui_config.monitoring_capable);
        assert_eq!(ui_config.supported_operations.len(), 2);
        assert_eq!(ui_config.export_formats.len(), 2);

        let theme = ui_config.theme.unwrap();
        assert_eq!(theme.primary_color, "#d82c20");
        assert_eq!(theme.icon, "🔴");
    }

    #[test]
    fn test_connection_config() {
        // 测试连接配置
        let mut options = HashMap::new();
        options.insert("charset".to_string(), "utf8mb4".to_string());
        options.insert("timeout".to_string(), "30".to_string());

        let config = ConnectionConfig {
            db_type: DatabaseType::MySQL,
            host: "localhost".to_string(),
            port: 3306,
            username: Some("root".to_string()),
            password: Some("password".to_string()),
            database: Some("test_db".to_string()),
            options,
        };

        assert_eq!(config.db_type, DatabaseType::MySQL);
        assert_eq!(config.host, "localhost");
        assert_eq!(config.port, 3306);
        assert_eq!(config.username, Some("root".to_string()));
        assert_eq!(config.database, Some("test_db".to_string()));
        assert_eq!(config.options.get("charset"), Some(&"utf8mb4".to_string()));
    }

    #[test]
    fn test_database_schema() {
        // 测试数据库模式结构
        let column = ColumnInfo {
            name: "id".to_string(),
            data_type: "INT".to_string(),
            nullable: false,
            primary_key: true,
            auto_increment: true,
            default_value: None,
            charset: None,
            comment: None,
            extra: HashMap::new(),
        };

        let table = TableSchema {
            name: "users".to_string(),
            columns: vec![column],
            indexes: vec![],
            foreign_keys: vec![],
            table_comment: Some("用户表".to_string()),
            engine: Some("InnoDB".to_string()),
            charset: Some("utf8mb4".to_string()),
        };

        let schema = DatabaseSchema {
            database_name: "test_db".to_string(),
            tables: vec![table.clone()],
            views: vec![],
            procedures: vec![],
            functions: vec![],
        };

        assert_eq!(schema.database_name, "test_db");
        assert_eq!(schema.tables.len(), 1);
        assert_eq!(schema.tables[0].name, "users");
        assert_eq!(schema.tables[0].columns.len(), 1);
        assert_eq!(schema.tables[0].columns[0].name, "id");
        assert!(schema.tables[0].columns[0].primary_key);
    }

    #[test]
    fn test_redis_data_types() {
        // 测试Redis数据类型
        let string_value = RedisValue::String { value: "hello".to_string() };
        let list_value = RedisValue::List { items: vec!["a".to_string(), "b".to_string()] };
        let set_value = RedisValue::Set { members: vec!["x".to_string(), "y".to_string()] };
        let hash_value = RedisValue::Hash { fields: vec![("key".to_string(), "value".to_string())] };
        let zset_value = RedisValue::ZSet { members: vec![("member1".to_string(), 1.0)] };

        // 检查不同Redis数据类型的结构
        match string_value {
            RedisValue::String { value } => assert_eq!(value, "hello"),
            _ => panic!("Expected string value"),
        }

        match list_value {
            RedisValue::List { items } => assert_eq!(items.len(), 2),
            _ => panic!("Expected list value"),
        }

        match set_value {
            RedisValue::Set { members } => assert_eq!(members.len(), 2),
            _ => panic!("Expected set value"),
        }

        match hash_value {
            RedisValue::Hash { fields } => {
                assert_eq!(fields.len(), 1);
                assert_eq!(fields[0].0, "key");
            },
            _ => panic!("Expected hash value"),
        }

        match zset_value {
            RedisValue::ZSet { members } => {
                assert_eq!(members.len(), 1);
                assert_eq!(members[0].1, 1.0);
            },
            _ => panic!("Expected zset value"),
        }
    }
}