use crate::mcp::tools::MCPTool;
use crate::mcp::types::*;
use crate::AppState;
use serde_json::{Value, json};
use anyhow::Result;
use async_trait::async_trait;
use std::time::Instant;
use std::collections::HashMap;

/// 智能查询执行工具
pub struct SmartQueryTool;

impl SmartQueryTool {
    pub fn new() -> Self {
        Self
    }

    /// 分析查询性能
    fn analyze_performance(&self, sql: &str, execution_time: std::time::Duration) -> PerformanceAnalysis {
        let sql_upper = sql.to_uppercase();
        let mut complexity = "简单".to_string();
        let mut optimization_hints = Vec::new();

        // 判断查询复杂度
        let join_count = sql_upper.matches("JOIN").count();
        let subquery_count = sql.matches('(').count();
        let where_conditions = sql_upper.matches("WHERE").count();

        if join_count > 2 || subquery_count > 1 {
            complexity = "复杂".to_string();
        } else if join_count > 0 || where_conditions > 0 {
            complexity = "中等".to_string();
        }

        // 生成优化提示
        if execution_time.as_millis() > 1000 {
            optimization_hints.push("查询执行时间较长，考虑添加索引".to_string());
        }

        if sql_upper.contains("SELECT *") {
            optimization_hints.push("避免使用 SELECT *，只选择需要的列".to_string());
        }

        if join_count > 3 {
            optimization_hints.push("考虑减少表连接数量或优化连接条件".to_string());
        }

        PerformanceAnalysis {
            query_complexity: complexity,
            estimated_cost: Some(execution_time.as_millis() as f64 / 1000.0),
            index_usage: Vec::new(), // 这里可以添加索引使用分析
            optimization_hints,
        }
    }

    /// 生成结果统计
    fn generate_statistics(&self, columns: &[String], rows: &[Vec<String>]) -> ResultStatistics {
        let mut null_counts = HashMap::new();
        let mut data_types = HashMap::new();

        // 统计每列的空值数量和推断数据类型
        for (col_idx, column_name) in columns.iter().enumerate() {
            let mut null_count = 0u64;
            let mut sample_value = None;

            for row in rows {
                if let Some(cell_value) = row.get(col_idx) {
                    if cell_value.is_empty() || cell_value == "NULL" {
                        null_count += 1;
                    } else if sample_value.is_none() {
                        sample_value = Some(cell_value.clone());
                    }
                }
            }

            null_counts.insert(column_name.clone(), null_count);

            // 简单的数据类型推断
            if let Some(value) = sample_value {
                let data_type = if value.parse::<i64>().is_ok() {
                    "整数".to_string()
                } else if value.parse::<f64>().is_ok() {
                    "浮点数".to_string()
                } else if value.len() <= 50 {
                    "短文本".to_string()
                } else {
                    "长文本".to_string()
                };
                data_types.insert(column_name.clone(), data_type);
            } else {
                data_types.insert(column_name.clone(), "未知".to_string());
            }
        }

        ResultStatistics {
            row_count: rows.len() as u64,
            column_count: columns.len() as u32,
            null_counts,
            data_types,
        }
    }

    /// 检测数据质量问题
    fn detect_quality_issues(&self, columns: &[String], rows: &[Vec<String>]) -> Vec<String> {
        let mut issues = Vec::new();

        if rows.is_empty() {
            issues.push("查询结果为空".to_string());
            return issues;
        }

        // 检查数据完整性
        for (col_idx, column_name) in columns.iter().enumerate() {
            let null_count = rows.iter()
                .filter(|row| {
                    row.get(col_idx)
                        .map(|v| v.is_empty() || v == "NULL")
                        .unwrap_or(true)
                })
                .count();

            let null_percentage = (null_count as f64 / rows.len() as f64) * 100.0;
            
            if null_percentage > 50.0 {
                issues.push(format!("列 {} 有超过50%的空值 ({:.1}%)", column_name, null_percentage));
            }
        }

        // 检查重复行
        let mut unique_rows = std::collections::HashSet::new();
        let mut duplicate_count = 0;
        
        for row in rows {
            let row_key = row.join("|");
            if !unique_rows.insert(row_key) {
                duplicate_count += 1;
            }
        }

        if duplicate_count > 0 {
            let duplicate_percentage = (duplicate_count as f64 / rows.len() as f64) * 100.0;
            issues.push(format!("发现 {} 行重复数据 ({:.1}%)", duplicate_count, duplicate_percentage));
        }

        issues
    }

    /// 提取结果元数据
    fn extract_result_metadata(&self, sql: &str, connection_id: &str) -> ResultMetadata {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        sql.hash(&mut hasher);
        let query_hash = format!("{:x}", hasher.finish());

        ResultMetadata {
            query_hash,
            cache_key: Some(format!("query_{}_{}", connection_id, hasher.finish())),
            generated_at: chrono::Utc::now().to_rfc3339(),
            connection_id: connection_id.to_string(),
        }
    }
}

#[async_trait]
impl MCPTool for SmartQueryTool {
    fn name(&self) -> &str {
        "execute_smart_query"
    }

    fn description(&self) -> &str {
        "智能执行SQL查询，包含性能分析、数据质量检测和结果统计"
    }

    async fn execute(&self, params: Value, app_state: &AppState) -> Result<Value> {
        // 解析参数
        let sql = params["sql"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("缺少 'sql' 参数"))?
            .trim();

        if sql.is_empty() {
            return Ok(json!(MCPResponse::<()>::error("SQL语句不能为空".to_string())));
        }

        let options: QueryOptions = serde_json::from_value(
            params["options"].clone()
        ).unwrap_or_default();

        // 从当前连接池获取连接（这里需要根据实际情况调整）
        let connections = app_state.connections.lock().await;
        
        // 获取第一个可用连接（实际应该根据参数指定）
        let (connection_id, connection) = connections.iter().next()
            .ok_or_else(|| anyhow::anyhow!("没有可用的数据库连接"))?;

        // 执行查询并计时
        let start_time = Instant::now();
        let query_result = connection.execute(sql).await
            .map_err(|e| anyhow::anyhow!("查询执行失败: {}", e))?;
        let execution_time = start_time.elapsed();

        // 构建增强的查询结果
        let mut enhanced_result = EnhancedQueryResult {
            columns: query_result.columns.clone(),
            rows: query_result.rows.clone(),
            affected_rows: query_result.affected_rows,
            execution_time: execution_time.as_millis() as u64,
            performance_analysis: None,
            statistics: None,
            quality_issues: Vec::new(),
            metadata: self.extract_result_metadata(sql, connection_id),
        };

        // 根据选项添加额外分析
        if options.include_performance {
            enhanced_result.performance_analysis = Some(
                self.analyze_performance(sql, execution_time)
            );
        }

        if options.include_stats {
            enhanced_result.statistics = Some(
                self.generate_statistics(&query_result.columns, &query_result.rows)
            );
        }

        // 总是检测数据质量问题
        enhanced_result.quality_issues = self.detect_quality_issues(
            &query_result.columns, 
            &query_result.rows
        );

        Ok(json!(MCPResponse::success(enhanced_result)))
    }
}

impl Default for SmartQueryTool {
    fn default() -> Self {
        Self::new()
    }
}