# 数据库适配器开发指南

## 📋 概述

本文档描述了如何为 QuSC-DB 开发新的数据库适配器，以及如何扩展现有适配器的功能。

## 🏗️ 适配器架构

### 核心接口

```rust
#[async_trait]
pub trait DatabaseAdapter: Send + Sync {
    /// 执行查询并返回增强的结果
    async fn execute(&self, query: &str) -> anyhow::Result<EnhancedQueryResult>;
    
    /// 获取数据库模式信息
    async fn get_schema(&self) -> anyhow::Result<DatabaseSchema>;
    
    /// 获取查询建议
    fn get_query_suggestions(&self, context: &str) -> Vec<QuerySuggestion>;
    
    /// 获取UI配置
    fn get_ui_config(&self) -> DatabaseUIConfig;
    
    /// 获取实时统计信息（可选）
    async fn get_real_time_stats(&self) -> anyhow::Result<Option<DatabaseStats>>;
}
```

## 🔧 实现新适配器

### 步骤1: 定义适配器结构

```rust
pub struct MyDatabaseAdapter {
    connection: MyDatabaseConnection,
    config: MyDatabaseConfig,
}

impl MyDatabaseAdapter {
    pub fn new(connection: MyDatabaseConnection) -> Self {
        Self {
            connection,
            config: MyDatabaseConfig::default(),
        }
    }
}
```

### 步骤2: 实现核心方法

```rust
#[async_trait]
impl DatabaseAdapter for MyDatabaseAdapter {
    async fn execute(&self, query: &str) -> anyhow::Result<EnhancedQueryResult> {
        // 1. 解析查询
        let parsed_query = self.parse_query(query)?;
        
        // 2. 执行查询
        let raw_result = self.connection.execute_raw(&parsed_query).await?;
        
        // 3. 转换为统一格式
        let query_data = self.convert_result(raw_result)?;
        
        // 4. 构建增强结果
        Ok(EnhancedQueryResult {
            db_type: DatabaseType::MyDatabase,
            data: query_data,
            metadata: QueryMetadata {
                query: query.to_string(),
                timestamp: chrono::Utc::now(),
                execution_plan: None,
            },
            execution_time: 0, // 实际测量时间
            ui_config: self.get_ui_config(),
        })
    }
    
    fn get_ui_config(&self) -> DatabaseUIConfig {
        DatabaseUIConfig {
            display_mode: DisplayMode::Document, // 或其他模式
            supported_operations: vec![
                Operation::Select,
                Operation::Insert,
                // ... 更多操作
            ],
            editor_config: EditorConfig {
                language: "mydatabase".to_string(),
                auto_complete: true,
                syntax_highlighting: true,
                keywords: vec!["SELECT", "FROM", "WHERE"], // 自定义关键字
            },
            export_formats: vec![
                ExportFormat::JSON,
                ExportFormat::XML,
            ],
            monitoring_capable: false,
        }
    }
}
```

## 📊 数据转换示例

### 关系型数据库适配器

```rust
impl MySQLAdapter {
    fn convert_result(&self, raw_result: MySQLResult) -> anyhow::Result<QueryData> {
        Ok(QueryData::Relational {
            columns: raw_result.columns.into_iter().map(|col| {
                ColumnInfo {
                    name: col.name,
                    data_type: self.map_mysql_type(&col.column_type),
                    nullable: col.nullable,
                    primary_key: col.is_primary_key,
                    auto_increment: col.auto_increment,
                    default_value: col.default,
                }
            }).collect(),
            rows: raw_result.rows.into_iter().map(|row| {
                row.into_iter().map(|cell| {
                    self.convert_mysql_value(cell)
                }).collect()
            }).collect(),
            total_rows: raw_result.total_count,
            affected_rows: raw_result.affected_rows,
            schema_info: self.get_table_schema().ok(),
        })
    }
    
    fn map_mysql_type(&self, mysql_type: &str) -> String {
        match mysql_type.to_uppercase().as_str() {
            "VARCHAR" => "String".to_string(),
            "INT" => "Integer".to_string(),
            "DATETIME" => "DateTime".to_string(),
            _ => mysql_type.to_string(),
        }
    }
    
    fn convert_mysql_value(&self, value: MySQLValue) -> CellValue {
        match value {
            MySQLValue::String(s) => CellValue::String(s),
            MySQLValue::Integer(i) => CellValue::Integer(i),
            MySQLValue::Float(f) => CellValue::Float(f),
            MySQLValue::DateTime(dt) => CellValue::DateTime(dt),
            MySQLValue::Null => CellValue::Null,
        }
    }
}
```

### NoSQL 数据库适配器

```rust
impl MongoDBAdapter {
    fn convert_result(&self, raw_result: Vec<Document>) -> anyhow::Result<QueryData> {
        let documents: Vec<serde_json::Value> = raw_result
            .into_iter()
            .map(|doc| serde_json::to_value(doc))
            .collect::<Result<Vec<_>, _>>()?;
        
        Ok(QueryData::Document {
            documents,
            collection_stats: self.get_collection_stats().await.ok(),
            indexes: self.get_indexes().await.ok(),
        })
    }
    
    async fn get_collection_stats(&self) -> anyhow::Result<CollectionStats> {
        let stats = self.database.run_command(doc! {
            "collStats": &self.collection_name
        }, None).await?;
        
        Ok(CollectionStats {
            document_count: stats.get_i64("count")? as u64,
            size: stats.get_i64("size")? as u64,
            storage_size: stats.get_i64("storageSize")? as u64,
            average_document_size: stats.get_f64("avgObjSize")? as f64,
        })
    }
}
```

## 🎨 UI 配置详解

### 显示模式配置

```rust
pub enum DisplayMode {
    Table,      // 传统表格，适合关系型数据
    KeyValue,   // 键值对树状结构，适合 Redis
    Document,   // JSON 文档格式，适合 MongoDB
    Graph,      // 图形化显示，适合图数据库
    TimeSeries, // 时间序列图表，适合时序数据库
}
```

### 编辑器配置

```rust
pub struct EditorConfig {
    pub language: String,           // 语言标识符
    pub auto_complete: bool,        // 启用自动补全
    pub syntax_highlighting: bool,  // 启用语法高亮
    pub keywords: Vec<String>,      // 自定义关键字
    pub functions: Vec<String>,     // 内置函数列表
    pub operators: Vec<String>,     // 操作符列表
}
```

## 🧪 测试指南

### 单元测试模板

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_execute_select_query() {
        let adapter = setup_test_adapter().await;
        
        let result = adapter.execute("SELECT * FROM test_table").await.unwrap();
        
        assert_eq!(result.db_type, DatabaseType::MySQL);
        match result.data {
            QueryData::Relational { columns, rows, .. } => {
                assert!(!columns.is_empty());
                assert!(!rows.is_empty());
            }
            _ => panic!("Expected relational data"),
        }
    }
    
    #[test]
    fn test_ui_config() {
        let adapter = setup_adapter();
        let config = adapter.get_ui_config();
        
        assert_eq!(config.display_mode, DisplayMode::Table);
        assert!(config.supported_operations.contains(&Operation::Select));
    }
    
    async fn setup_test_adapter() -> MyDatabaseAdapter {
        // 设置测试适配器
    }
}
```

### 集成测试

```rust
#[tokio::test]
async fn test_end_to_end_query() {
    let adapter = create_real_connection().await;
    
    // 创建测试数据
    adapter.execute("CREATE TABLE test (id INT, name VARCHAR(50))").await.unwrap();
    adapter.execute("INSERT INTO test VALUES (1, 'Alice')").await.unwrap();
    
    // 测试查询
    let result = adapter.execute("SELECT * FROM test").await.unwrap();
    
    // 验证结果
    assert_eq!(result.data.rows().len(), 1);
    
    // 清理
    adapter.execute("DROP TABLE test").await.unwrap();
}
```

## 📋 注册新适配器

### 在工厂类中注册

```rust
// src-tauri/src/database/factory.rs
impl DatabaseAdapterFactory {
    pub fn create(connection_config: &ConnectionConfig) -> anyhow::Result<Box<dyn DatabaseAdapter>> {
        match connection_config.db_type {
            DatabaseType::MySQL => Ok(Box::new(MySQLAdapter::new(connection_config)?)),
            DatabaseType::PostgreSQL => Ok(Box::new(PostgreSQLAdapter::new(connection_config)?)),
            DatabaseType::Redis => Ok(Box::new(RedisAdapter::new(connection_config)?)),
            DatabaseType::MongoDB => Ok(Box::new(MongoDBAdapter::new(connection_config)?)),
            DatabaseType::MyDatabase => Ok(Box::new(MyDatabaseAdapter::new(connection_config)?)), // 新增
        }
    }
}
```

### 更新数据库类型枚举

```rust
// src-tauri/src/database/types.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DatabaseType {
    MySQL,
    PostgreSQL,
    Redis,
    MongoDB,
    MyDatabase, // 新增
}
```

## 🔍 调试技巧

### 日志记录

```rust
use tracing::{info, debug, error};

impl MyDatabaseAdapter {
    async fn execute(&self, query: &str) -> anyhow::Result<EnhancedQueryResult> {
        debug!("Executing query: {}", query);
        
        let start = std::time::Instant::now();
        let result = self.execute_internal(query).await?;
        let duration = start.elapsed();
        
        info!("Query executed in {:?}", duration);
        
        Ok(result)
    }
}
```

### 错误处理

```rust
#[derive(Debug, thiserror::Error)]
pub enum MyDatabaseError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
    
    #[error("Query syntax error: {0}")]
    SyntaxError(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
}
```

## 📚 最佳实践

### 1. 性能优化
- 使用连接池
- 实现查询缓存
- 分页处理大结果集

### 2. 安全考虑
- 参数化查询防止注入
- 敏感信息脱敏
- 权限验证

### 3. 用户体验
- 提供详细的错误信息
- 实现查询进度提示
- 支持查询取消

### 4. 可维护性
- 充分的单元测试
- 清晰的文档注释
- 遵循代码规范

---

**文档版本**: v1.0  
**最后更新**: 2024-09-06