pub mod database;
pub mod ai;
pub mod commands;
pub mod mcp;

// 重新导出常用类型
pub use database::{
    enhanced_types::*,
    test_adapter::{AdapterConverter, TestDatabaseAdapter},
    DatabaseConnection,
    ConnectionConfig,
    QueryResult,
    TableInfo,
    ColumnInfo,
    DatabaseType,
};

pub use commands::AppState;