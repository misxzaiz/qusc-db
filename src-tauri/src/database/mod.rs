use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub db_type: DatabaseType,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: Option<String>,
    #[serde(default)]
    pub options: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum DatabaseType {
    MySQL,
    Redis,
    // 预留扩展
    PostgreSQL,
    SQLite,
    MongoDB,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub affected_rows: u64,
    pub execution_time: u64, // milliseconds
}

#[async_trait]
pub trait DatabaseConnection: Send + Sync {
    async fn connect(&mut self, config: &ConnectionConfig) -> anyhow::Result<()>;
    async fn disconnect(&mut self) -> anyhow::Result<()>;
    async fn execute(&self, query: &str) -> anyhow::Result<QueryResult>;
    async fn get_schema(&self) -> anyhow::Result<Vec<TableInfo>>;
    async fn get_databases(&self) -> anyhow::Result<Vec<String>> { 
        // 默认实现返回空列表
        Ok(vec![])
    }
    async fn use_database(&mut self, _database_name: &str) -> anyhow::Result<()> {
        // 默认实现不执行任何操作
        Ok(())
    }
    fn is_connected(&self) -> bool;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub columns: Vec<ColumnInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub primary_key: bool,
}

pub mod mysql;
pub mod redis;