use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

#[cfg(test)]
mod tests;
#[cfg(test)]
pub use tests::*;

// ===== 增强的查询结果结构 =====

/// 增强的查询结果，支持不同数据库的特定数据格式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedQueryResult {
    /// 数据库类型
    pub db_type: DatabaseType,
    /// 查询数据（根据数据库类型不同而不同）
    pub data: QueryData,
    /// 查询元数据
    pub metadata: QueryMetadata,
    /// 执行时间（毫秒）
    pub execution_time: u64,
    /// UI配置信息
    pub ui_config: DatabaseUIConfig,
}

/// 查询数据的不同格式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum QueryData {
    /// 关系型数据库：标准表格格式
    Relational {
        columns: Vec<ColumnInfo>,
        rows: Vec<Vec<CellValue>>,
        total_rows: Option<u64>,
        affected_rows: u64,
        schema_info: Option<TableSchema>,
    },
    /// Redis：键值对格式
    KeyValue {
        entries: Vec<RedisEntry>,
        database_info: RedisDatabaseInfo,
        memory_stats: Option<RedisMemoryStats>,
    },
    /// MongoDB：文档格式
    Document {
        documents: Vec<serde_json::Value>,
        collection_stats: Option<CollectionStats>,
        indexes: Option<Vec<IndexInfo>>,
    },
}

/// 查询元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryMetadata {
    /// 原始查询语句
    pub query: String,
    /// 执行时间戳
    pub timestamp: DateTime<Utc>,
    /// 查询计划（可选）
    pub execution_plan: Option<String>,
    /// 警告信息
    pub warnings: Vec<String>,
}

// ===== 单元格值类型 =====

/// 表示数据库中不同类型的值
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum CellValue {
    String(String),
    Integer(i64),
    Float(f64),
    Boolean(bool),
    DateTime(DateTime<Utc>),
    Date(String),
    Time(String),
    Null,
    Binary(Vec<u8>),
    Json(serde_json::Value),
}

impl CellValue {
    /// 转换为字符串显示
    pub fn to_display_string(&self) -> String {
        match self {
            CellValue::String(s) => s.clone(),
            CellValue::Integer(i) => i.to_string(),
            CellValue::Float(f) => f.to_string(),
            CellValue::Boolean(b) => b.to_string(),
            CellValue::DateTime(dt) => dt.format("%Y-%m-%d %H:%M:%S").to_string(),
            CellValue::Date(d) => d.clone(),
            CellValue::Time(t) => t.clone(),
            CellValue::Null => "NULL".to_string(),
            CellValue::Binary(bytes) => format!("[BINARY: {} bytes]", bytes.len()),
            CellValue::Json(json) => serde_json::to_string(json).unwrap_or_else(|_| "{}".to_string()),
        }
    }

    /// 检查是否为NULL值
    pub fn is_null(&self) -> bool {
        matches!(self, CellValue::Null)
    }
}

// ===== 数据库类型相关 =====

/// 数据库类型枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub enum DatabaseType {
    MySQL,
    PostgreSQL,
    Redis,
    MongoDB,
    SQLite,
}

impl DatabaseType {
    /// 获取显示名称
    pub fn display_name(&self) -> &'static str {
        match self {
            DatabaseType::MySQL => "MySQL",
            DatabaseType::PostgreSQL => "PostgreSQL", 
            DatabaseType::Redis => "Redis",
            DatabaseType::MongoDB => "MongoDB",
            DatabaseType::SQLite => "SQLite",
        }
    }
    
    /// 获取默认端口
    pub fn default_port(&self) -> u16 {
        match self {
            DatabaseType::MySQL => 3306,
            DatabaseType::PostgreSQL => 5432,
            DatabaseType::Redis => 6379,
            DatabaseType::MongoDB => 27017,
            DatabaseType::SQLite => 0, // SQLite 不需要端口
        }
    }
}

// ===== 数据库结构相关 =====

/// 完整的数据库结构，用于构建导航树
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStructure {
    pub connection_id: String,
    pub db_type: DatabaseType,
    pub databases: Vec<DatabaseNode>,
    pub connection_info: ConnectionInfo,
}

/// 数据库节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseNode {
    pub name: String,
    pub size_info: Option<SizeInfo>,
    pub tables: Vec<TableNode>,
    pub views: Vec<ViewNode>,
    pub procedures: Vec<ProcedureNode>,
    pub functions: Vec<FunctionNode>,
    pub redis_keys: Option<RedisKeyInfo>,
    pub mongodb_collections: Option<MongoCollectionInfo>,
}

/// 表节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableNode {
    pub name: String,
    pub size_info: Option<SizeInfo>,
    pub row_count: Option<u64>,
    pub table_type: TableType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TableType {
    Table,
    SystemTable,
    TemporaryTable,
}

/// 视图节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewNode {
    pub name: String,
    pub definition: Option<String>,
}

/// 存储过程节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcedureNode {
    pub name: String,
    pub parameters: Vec<ParameterInfo>,
}

/// 函数节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionNode {
    pub name: String,
    pub return_type: Option<String>,
    pub parameters: Vec<ParameterInfo>,
}

/// 参数信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterInfo {
    pub name: String,
    pub data_type: String,
    pub direction: ParameterDirection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ParameterDirection {
    In,
    Out,
    InOut,
}

/// Redis 键信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisKeyInfo {
    pub database_index: i64,
    pub key_count: u64,
    pub expires_count: u64,
    pub memory_usage: Option<u64>,
    pub sample_keys: Vec<RedisKeyNode>,
}

/// Redis 键节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisKeyNode {
    pub key: String,
    pub data_type: RedisDataType,
    pub ttl: Option<i64>,
    pub size: Option<u64>,
}

/// MongoDB 集合信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MongoCollectionInfo {
    pub collections: Vec<MongoCollectionNode>,
    pub gridfs_buckets: Vec<GridFSBucketNode>,
}

/// MongoDB 集合节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MongoCollectionNode {
    pub name: String,
    pub document_count: Option<u64>,
    pub size: Option<u64>,
    pub indexes: Vec<IndexInfo>,
}

/// GridFS 桶节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridFSBucketNode {
    pub name: String,
    pub file_count: Option<u64>,
    pub total_size: Option<u64>,
}

/// 大小信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SizeInfo {
    pub bytes: u64,
    pub formatted: String, // "1.2MB", "680KB" 等
}

/// 连接信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub database_name: Option<String>,
    pub server_version: Option<String>,
}

// ===== 扩展的列信息 =====

/// 扩展的列信息，包含更多元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub primary_key: bool,
    /// 是否自增
    pub auto_increment: bool,
    /// 默认值
    pub default_value: Option<String>,
    /// 字符集（字符串类型）
    pub charset: Option<String>,
    /// 注释
    pub comment: Option<String>,
    /// 额外信息
    pub extra: HashMap<String, String>,
}

/// 表模式信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableSchema {
    pub name: String,
    pub columns: Vec<ColumnInfo>,
    pub indexes: Vec<IndexInfo>,
    pub foreign_keys: Vec<ForeignKeyInfo>,
    pub table_comment: Option<String>,
    pub engine: Option<String>,
    pub charset: Option<String>,
}

/// 索引信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexInfo {
    pub name: String,
    pub columns: Vec<String>,
    pub unique: bool,
    pub index_type: String,
}

/// 外键信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForeignKeyInfo {
    pub name: String,
    pub column: String,
    pub referenced_table: String,
    pub referenced_column: String,
    pub on_update: String,
    pub on_delete: String,
}

// ===== Redis 特定数据结构 =====

/// Redis 键值条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisEntry {
    pub key: String,
    pub data_type: RedisDataType,
    pub value: RedisValue,
    pub ttl: Option<i64>,
    pub memory_usage: Option<u64>,
    pub encoding: Option<String>,
}

/// Redis 数据类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RedisDataType {
    String,
    Hash,
    List,
    Set,
    ZSet,
    Stream,
    HyperLogLog,
    Bitmap,
}

/// Redis 值类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RedisValue {
    String { value: String },
    Hash { fields: Vec<(String, String)> },
    List { items: Vec<String> },
    Set { members: Vec<String> },
    ZSet { members: Vec<(String, f64)> },
    Stream { entries: Vec<StreamEntry> },
    HyperLogLog { cardinality: u64 },
    Bitmap { bits: String },
}

/// Redis Stream 条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamEntry {
    pub id: String,
    pub fields: HashMap<String, String>,
}

/// Redis 数据库信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisDatabaseInfo {
    pub database_index: i64,
    pub key_count: u64,
    pub expires_count: u64,
    pub avg_ttl: Option<i64>,
}

/// Redis 内存统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisMemoryStats {
    pub used_memory: u64,
    pub used_memory_human: String,
    pub used_memory_rss: u64,
    pub used_memory_peak: u64,
    pub fragmentation_ratio: f64,
}

// ===== MongoDB 特定数据结构 =====

/// MongoDB 集合统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionStats {
    pub document_count: u64,
    pub size: u64,
    pub storage_size: u64,
    pub average_document_size: f64,
    pub indexes_size: u64,
}

// ===== UI 配置系统 =====

/// UI 配置信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseUIConfig {
    /// 显示模式
    pub display_mode: DisplayMode,
    /// 支持的操作
    pub supported_operations: Vec<Operation>,
    /// 编辑器配置
    pub editor_config: EditorConfig,
    /// 支持的导出格式
    pub export_formats: Vec<ExportFormat>,
    /// 是否支持实时监控
    pub monitoring_capable: bool,
    /// 自定义主题
    pub theme: Option<DatabaseTheme>,
}

/// 显示模式
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DisplayMode {
    /// 表格模式（关系型数据库）
    Table,
    /// 键值对树状结构（Redis）
    KeyValue,
    /// JSON 文档格式（MongoDB）
    Document,
    /// 图形化展示
    Graph,
    /// 时间序列图表
    TimeSeries,
}

/// 数据库操作类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Operation {
    // 通用操作
    Select,
    Insert,
    Update,
    Delete,
    
    // 关系型数据库
    CreateTable,
    DropTable,
    AlterTable,
    CreateIndex,
    DropIndex,
    
    // Redis
    Get,
    Set,
    Keys,
    Monitor,
    FlushDB,
    Info,
    
    // MongoDB
    Find,
    InsertOne,
    InsertMany,
    UpdateOne,
    UpdateMany,
    DeleteOne,
    DeleteMany,
    Aggregate,
    CreateCollection,
    DropCollection,
}

/// 编辑器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorConfig {
    /// 语言标识符
    pub language: String,
    /// 启用自动补全
    pub auto_complete: bool,
    /// 启用语法高亮
    pub syntax_highlighting: bool,
    /// 关键字列表
    pub keywords: Vec<String>,
    /// 函数列表
    pub functions: Vec<String>,
    /// 操作符列表
    pub operators: Vec<String>,
}

/// 导出格式
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExportFormat {
    CSV,
    Excel,
    JSON,
    XML,
    SQL,
    Redis, // Redis 特定格式
    MongoDB, // MongoDB 特定格式
}

/// 数据库主题配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseTheme {
    pub primary_color: String,
    pub accent_color: String,
    pub icon: String,
}

// ===== 数据库适配器 Trait =====

/// 数据库适配器接口
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
    
    /// 测试连接
    async fn test_connection(&self) -> anyhow::Result<bool>;
    
    /// 关闭连接
    async fn close(&self) -> anyhow::Result<()>;
}

/// 数据库模式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseSchema {
    pub database_name: String,
    pub tables: Vec<TableSchema>,
    pub views: Vec<ViewInfo>,
    pub procedures: Vec<ProcedureInfo>,
    pub functions: Vec<FunctionInfo>,
}

/// 视图信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewInfo {
    pub name: String,
    pub definition: String,
    pub columns: Vec<ColumnInfo>,
}

/// 存储过程信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcedureInfo {
    pub name: String,
    pub parameters: Vec<ParameterInfo>,
    pub return_type: Option<String>,
}

/// 函数信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionInfo {
    pub name: String,
    pub parameters: Vec<ParameterInfo>,
    pub return_type: String,
}

/// 查询建议
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuerySuggestion {
    pub text: String,
    pub description: String,
    pub category: SuggestionCategory,
    pub score: u32,
}

/// 建议类别
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SuggestionCategory {
    Keyword,
    Table,
    Column,
    Function,
    Command,
    Template, // 添加Template类别
}

/// 数据库统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub connection_count: u32,
    pub query_count: u64,
    pub cache_hit_ratio: f64,
    pub uptime: u64,
    pub version: String,
}

// ===== 连接配置结构 =====

/// 数据库连接配置
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