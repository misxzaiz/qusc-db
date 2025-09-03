use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::database::{TableInfo, ColumnInfo};

/// MCP工具的通用响应类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> MCPResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

/// 数据库上下文信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseContext {
    pub tables: HashMap<String, TableContext>,
    pub relationships: Vec<TableRelationship>,
    pub business_context: String,
    pub suggestions: Vec<String>,
    pub stats: ContextStats,
}

impl DatabaseContext {
    pub fn new() -> Self {
        Self {
            tables: HashMap::new(),
            relationships: Vec::new(),
            business_context: String::new(),
            suggestions: Vec::new(),
            stats: ContextStats::default(),
        }
    }

    pub fn add_table(&mut self, name: String, context: TableContext) {
        self.tables.insert(name, context);
        self.stats.table_count = self.tables.len() as u32;
    }
}

/// 表上下文信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableContext {
    pub structure: TableInfo,
    pub business_type: String,
    pub relationships: Vec<String>,
    pub analysis: TableAnalysis,
    pub sample_queries: Vec<String>,
}

/// 表分析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableAnalysis {
    pub column_count: u32,
    pub primary_keys: Vec<String>,
    pub foreign_keys: Vec<String>,
    pub indexes: Vec<String>,
    pub has_timestamps: bool,
    pub estimated_size: Option<u64>,
}

impl Default for TableAnalysis {
    fn default() -> Self {
        Self {
            column_count: 0,
            primary_keys: Vec::new(),
            foreign_keys: Vec::new(),
            indexes: Vec::new(),
            has_timestamps: false,
            estimated_size: None,
        }
    }
}

/// 表关系
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableRelationship {
    pub from_table: String,
    pub to_table: String,
    pub relationship_type: String,
    pub foreign_key_column: Option<String>,
    pub referenced_column: Option<String>,
}

/// 上下文统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextStats {
    pub table_count: u32,
    pub relationship_count: u32,
    pub total_columns: u32,
}

impl Default for ContextStats {
    fn default() -> Self {
        Self {
            table_count: 0,
            relationship_count: 0,
            total_columns: 0,
        }
    }
}

/// SQL验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SQLValidation {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub performance_score: Option<u8>,
    pub security_issues: Vec<String>,
    pub optimization_suggestions: Vec<String>,
}

impl Default for SQLValidation {
    fn default() -> Self {
        Self {
            valid: false,
            errors: Vec::new(),
            warnings: Vec::new(),
            performance_score: None,
            security_issues: Vec::new(),
            optimization_suggestions: Vec::new(),
        }
    }
}

/// 查询选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryOptions {
    pub include_performance: bool,
    pub include_stats: bool,
    pub timeout_seconds: Option<u64>,
}

impl Default for QueryOptions {
    fn default() -> Self {
        Self {
            include_performance: true,
            include_stats: true,
            timeout_seconds: Some(30),
        }
    }
}

/// 增强的查询结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedQueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub affected_rows: u64,
    pub execution_time: u64,
    pub performance_analysis: Option<PerformanceAnalysis>,
    pub statistics: Option<ResultStatistics>,
    pub quality_issues: Vec<String>,
    pub metadata: ResultMetadata,
}

/// 性能分析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceAnalysis {
    pub query_complexity: String,
    pub estimated_cost: Option<f64>,
    pub index_usage: Vec<String>,
    pub optimization_hints: Vec<String>,
}

/// 结果统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultStatistics {
    pub row_count: u64,
    pub column_count: u32,
    pub null_counts: HashMap<String, u64>,
    pub data_types: HashMap<String, String>,
}

/// 结果元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultMetadata {
    pub query_hash: String,
    pub cache_key: Option<String>,
    pub generated_at: String,
    pub connection_id: String,
}