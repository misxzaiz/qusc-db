use crate::database::{TableInfo, ColumnInfo};
use crate::mcp::types::*;
use std::collections::HashMap;
use lru::LruCache;
use std::sync::Arc;
use tokio::sync::RwLock;

/// 上下文构建器
pub struct ContextBuilder {
    cache: Arc<RwLock<LruCache<String, DatabaseContext>>>,
}

impl ContextBuilder {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(LruCache::new(std::num::NonZeroUsize::new(100).unwrap()))),
        }
    }

    /// 构建增强的数据库上下文
    pub async fn build_enhanced_context(
        &self,
        tables: &[String],
        schema: &[TableInfo],
    ) -> anyhow::Result<DatabaseContext> {
        // 创建缓存键
        let cache_key = format!("{:?}", tables);
        
        // 检查缓存
        {
            let mut cache = self.cache.write().await;
            if let Some(cached_context) = cache.get(&cache_key) {
                return Ok(cached_context.clone());
            }
        }

        let mut context = DatabaseContext::new();
        
        // 为每个表构建上下文
        for table_name in tables {
            if let Some(table_info) = schema.iter().find(|t| t.name == *table_name) {
                let table_context = self.build_table_context(table_info, schema).await?;
                context.add_table(table_name.clone(), table_context);
            }
        }

        // 推断表间关系
        context.relationships = self.infer_relationships(tables, schema).await?;
        context.stats.relationship_count = context.relationships.len() as u32;

        // 识别业务场景
        context.business_context = self.identify_business_scenario(tables);

        // 生成智能建议
        context.suggestions = self.generate_suggestions(tables, &context.business_context);

        // 缓存结果
        {
            let mut cache = self.cache.write().await;
            cache.put(cache_key, context.clone());
        }

        Ok(context)
    }

    /// 构建单个表的上下文
    async fn build_table_context(
        &self,
        table_info: &TableInfo,
        schema: &[TableInfo],
    ) -> anyhow::Result<TableContext> {
        let analysis = self.analyze_table_structure(table_info);
        let business_type = self.infer_business_type(&table_info.name);
        let relationships = self.find_table_relationships(table_info, schema);
        let sample_queries = self.generate_sample_queries(table_info);

        Ok(TableContext {
            structure: table_info.clone(),
            business_type,
            relationships,
            analysis,
            sample_queries,
        })
    }

    /// 分析表结构
    fn analyze_table_structure(&self, table_info: &TableInfo) -> TableAnalysis {
        let mut analysis = TableAnalysis::default();
        
        analysis.column_count = table_info.columns.len() as u32;
        
        // 识别主键
        for column in &table_info.columns {
            if column.primary_key {
                analysis.primary_keys.push(column.name.clone());
            }
        }

        // 检测时间戳字段
        analysis.has_timestamps = table_info.columns.iter().any(|col| {
            let name = col.name.to_lowercase();
            name.contains("time") || name.contains("date") || 
            name.contains("created") || name.contains("updated")
        });

        analysis
    }

    /// 推断业务类型
    fn infer_business_type(&self, table_name: &str) -> String {
        let name = table_name.to_lowercase();
        
        if name.contains("user") || name.contains("customer") || name.contains("member") {
            "user_management".to_string()
        } else if name.contains("order") || name.contains("purchase") || name.contains("transaction") {
            "transaction".to_string()
        } else if name.contains("product") || name.contains("item") || name.contains("goods") {
            "inventory".to_string()
        } else if name.contains("sys_") || name.contains("permission") || name.contains("role") {
            "system_management".to_string()
        } else if name.contains("log") || name.contains("audit") || name.contains("history") {
            "tracking".to_string()
        } else {
            "general".to_string()
        }
    }

    /// 找到表关系
    fn find_table_relationships(&self, table_info: &TableInfo, schema: &[TableInfo]) -> Vec<String> {
        let mut relationships = Vec::new();
        let table_name = table_info.name.to_lowercase();

        // 基于命名约定推断关系
        for other_table in schema {
            if other_table.name != table_info.name {
                let other_name = other_table.name.to_lowercase();
                
                // 检查常见的关系模式
                if table_name.contains("user") && other_name.contains("role") {
                    relationships.push(other_table.name.clone());
                } else if table_name.contains("order") && other_name.contains("user") {
                    relationships.push(other_table.name.clone());
                } else if table_name.contains("sys_") && other_name.contains("sys_") {
                    relationships.push(other_table.name.clone());
                }
            }
        }

        relationships
    }

    /// 生成示例查询
    fn generate_sample_queries(&self, table_info: &TableInfo) -> Vec<String> {
        let mut queries = Vec::new();
        let table_name = &table_info.name;

        // 基本查询
        queries.push(format!("SELECT * FROM {} LIMIT 10", table_name));

        // 如果有时间字段，生成时间相关查询
        if self.has_time_columns(table_info) {
            queries.push(format!(
                "SELECT * FROM {} WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)", 
                table_name
            ));
        }

        // 如果是用户表，生成用户相关查询
        if table_info.name.to_lowercase().contains("user") {
            queries.push(format!("SELECT COUNT(*) as user_count FROM {}", table_name));
        }

        queries
    }

    /// 检查是否有时间列
    fn has_time_columns(&self, table_info: &TableInfo) -> bool {
        table_info.columns.iter().any(|col| {
            let name = col.name.to_lowercase();
            name.contains("time") || name.contains("date") || 
            name.contains("created") || name.contains("updated")
        })
    }

    /// 推断表间关系
    async fn infer_relationships(
        &self,
        tables: &[String],
        schema: &[TableInfo],
    ) -> anyhow::Result<Vec<TableRelationship>> {
        let mut relationships = Vec::new();

        // 简单的关系推断逻辑
        for table_name in tables {
            if let Some(table_info) = schema.iter().find(|t| t.name == *table_name) {
                // 查找外键关系
                for column in &table_info.columns {
                    if column.name.to_lowercase().ends_with("_id") && !column.primary_key {
                        let referenced_table = column.name.replace("_id", "");
                        if tables.iter().any(|t| t.to_lowercase().contains(&referenced_table)) {
                            relationships.push(TableRelationship {
                                from_table: table_info.name.clone(),
                                to_table: referenced_table,
                                relationship_type: "foreign_key".to_string(),
                                foreign_key_column: Some(column.name.clone()),
                                referenced_column: Some("id".to_string()),
                            });
                        }
                    }
                }
            }
        }

        Ok(relationships)
    }

    /// 识别业务场景
    fn identify_business_scenario(&self, tables: &[String]) -> String {
        let table_names: Vec<String> = tables.iter().map(|s| s.to_lowercase()).collect();

        // 权限管理系统
        if table_names.iter().any(|t| t.contains("sys_") || t.contains("permission") || t.contains("role")) {
            return "permission_system".to_string();
        }

        // 电商场景
        if table_names.iter().any(|t| t.contains("user") || t.contains("customer")) &&
           table_names.iter().any(|t| t.contains("order") || t.contains("product")) {
            return "ecommerce".to_string();
        }

        // 测试数据
        if table_names.iter().any(|t| t.contains("test_")) {
            return "testing".to_string();
        }

        "general".to_string()
    }

    /// 生成智能建议
    fn generate_suggestions(&self, tables: &[String], business_context: &str) -> Vec<String> {
        let mut suggestions = Vec::new();

        match business_context {
            "permission_system" => {
                suggestions.push("分析用户角色权限分配情况".to_string());
                suggestions.push("检查权限继承关系和层级结构".to_string());
                suggestions.push("审计系统权限安全风险".to_string());
            }
            "ecommerce" => {
                suggestions.push("分析用户购买行为和偏好".to_string());
                suggestions.push("计算用户生命周期价值".to_string());
                suggestions.push("分析商品销售趋势".to_string());
            }
            "testing" => {
                suggestions.push("检测数据完整性和一致性".to_string());
                suggestions.push("分析数据分布和边界值".to_string());
                suggestions.push("验证数据类型和约束条件".to_string());
            }
            _ => {
                suggestions.push("探索数据分布和模式".to_string());
                suggestions.push("分析表间关联关系".to_string());
                suggestions.push("检查数据质量问题".to_string());
            }
        }

        suggestions
    }

    /// 清除缓存
    pub async fn clear_cache(&self) {
        let mut cache = self.cache.write().await;
        cache.clear();
    }
}

impl Default for ContextBuilder {
    fn default() -> Self {
        Self::new()
    }
}