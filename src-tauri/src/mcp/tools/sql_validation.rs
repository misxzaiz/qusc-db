use crate::mcp::tools::MCPTool;
use crate::mcp::types::*;
use crate::AppState;
use serde_json::{Value, json};
use anyhow::Result;
use async_trait::async_trait;
use regex::Regex;

/// SQL验证工具
pub struct SQLValidationTool {
    dangerous_patterns: Vec<Regex>,
}

impl SQLValidationTool {
    pub fn new() -> Self {
        let dangerous_patterns = vec![
            Regex::new(r"(?i)\bDROP\s+(DATABASE|TABLE|INDEX)").unwrap(),
            Regex::new(r"(?i)\bTRUNCATE\s+TABLE").unwrap(),
            Regex::new(r"(?i)\bDELETE\s+FROM\s+\w+\s*(?:WHERE|$)").unwrap(),
            Regex::new(r"(?i)\bUPDATE\s+\w+\s+SET").unwrap(),
            Regex::new(r"(?i)\bALTER\s+TABLE").unwrap(),
            Regex::new(r"(?i)\bCREATE\s+(DATABASE|TABLE)").unwrap(),
            // 防止SQL注入
            Regex::new(r"(?i)(union\s+select|sleep\s*\(|benchmark\s*\()").unwrap(),
            // 防止系统函数调用
            Regex::new(r"(?i)(load_file\s*\(|into\s+outfile)").unwrap(),
        ];

        Self {
            dangerous_patterns,
        }
    }

    /// 检查SQL语法安全性
    fn check_sql_security(&self, sql: &str) -> Vec<String> {
        let mut issues = Vec::new();

        // 检查危险模式
        for pattern in &self.dangerous_patterns {
            if pattern.is_match(sql) {
                issues.push(format!("检测到潜在危险操作: {}", pattern.as_str()));
            }
        }

        // 检查是否包含注释中的可疑内容
        if sql.contains("--") || sql.contains("/*") {
            issues.push("SQL包含注释，请检查是否为注入攻击".to_string());
        }

        // 检查是否有多条语句（分号分隔）
        if sql.matches(';').count() > 1 {
            issues.push("不允许执行多条SQL语句".to_string());
        }

        issues
    }

    /// 基础语法检查
    fn check_basic_syntax(&self, sql: &str) -> Vec<String> {
        let mut errors = Vec::new();
        let sql_upper = sql.to_uppercase();

        // 检查基本SQL结构
        if !sql_upper.contains("SELECT") && 
           !sql_upper.contains("INSERT") && 
           !sql_upper.contains("UPDATE") && 
           !sql_upper.contains("DELETE") {
            errors.push("SQL语句必须包含有效的操作关键字".to_string());
        }

        // 检查括号匹配
        let open_parens = sql.matches('(').count();
        let close_parens = sql.matches(')').count();
        if open_parens != close_parens {
            errors.push("括号不匹配".to_string());
        }

        // 检查引号匹配
        let single_quotes = sql.matches('\'').count();
        if single_quotes % 2 != 0 {
            errors.push("单引号不匹配".to_string());
        }

        let double_quotes = sql.matches('"').count();
        if double_quotes % 2 != 0 {
            errors.push("双引号不匹配".to_string());
        }

        errors
    }

    /// 性能预估
    fn estimate_performance(&self, sql: &str, _context: &DatabaseContext) -> Option<u8> {
        let sql_upper = sql.to_uppercase();
        let mut score = 100u8;

        // SELECT * 会降低性能
        if sql_upper.contains("SELECT *") {
            score = score.saturating_sub(20);
        }

        // 没有WHERE子句的查询
        if sql_upper.contains("SELECT") && !sql_upper.contains("WHERE") {
            score = score.saturating_sub(30);
        }

        // 多表JOIN
        let join_count = sql_upper.matches("JOIN").count();
        if join_count > 2 {
            score = score.saturating_sub((join_count * 10) as u8);
        }

        // LIKE查询（特别是前缀模糊查询）
        if sql_upper.contains("LIKE '%") {
            score = score.saturating_sub(25);
        }

        // ORDER BY 无 LIMIT
        if sql_upper.contains("ORDER BY") && !sql_upper.contains("LIMIT") {
            score = score.saturating_sub(15);
        }

        // 子查询
        let subquery_count = sql.matches('(').count();
        if subquery_count > 1 {
            score = score.saturating_sub((subquery_count * 5) as u8);
        }

        Some(score.max(10)) // 最低10分
    }

    /// 生成优化建议
    fn generate_optimization_suggestions(&self, sql: &str, context: &DatabaseContext) -> Vec<String> {
        let mut suggestions = Vec::new();
        let sql_upper = sql.to_uppercase();

        if sql_upper.contains("SELECT *") {
            suggestions.push("建议指定具体的列名而不是使用 SELECT *".to_string());
        }

        if sql_upper.contains("SELECT") && !sql_upper.contains("WHERE") {
            suggestions.push("建议添加 WHERE 条件限制结果集大小".to_string());
        }

        if sql_upper.contains("LIKE '%") {
            suggestions.push("前缀模糊查询无法使用索引，建议优化查询条件".to_string());
        }

        if sql_upper.contains("ORDER BY") && !sql_upper.contains("LIMIT") {
            suggestions.push("建议为 ORDER BY 查询添加 LIMIT 限制结果数量".to_string());
        }

        let join_count = sql_upper.matches("JOIN").count();
        if join_count > 3 {
            suggestions.push("过多的表连接可能影响性能，考虑分解查询或优化表结构".to_string());
        }

        // 根据上下文生成针对性建议
        for (table_name, table_context) in &context.tables {
            if sql_upper.contains(&table_name.to_uppercase()) {
                if table_context.analysis.primary_keys.is_empty() {
                    suggestions.push(format!("表 {} 缺少主键，可能影响查询性能", table_name));
                }
            }
        }

        suggestions
    }
}

#[async_trait]
impl MCPTool for SQLValidationTool {
    fn name(&self) -> &str {
        "validate_sql"
    }

    fn description(&self) -> &str {
        "验证SQL语句的安全性、语法正确性，并提供性能评估和优化建议"
    }

    async fn execute(&self, params: Value, _app_state: &AppState) -> Result<Value> {
        // 解析参数
        let sql = params["sql"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("缺少 'sql' 参数"))?
            .trim();

        if sql.is_empty() {
            return Ok(json!(MCPResponse::<()>::error("SQL语句不能为空".to_string())));
        }

        let context: DatabaseContext = serde_json::from_value(
            params["context"].clone()
        ).unwrap_or_else(|_| DatabaseContext::new());

        // 执行各种检查
        let syntax_errors = self.check_basic_syntax(sql);
        let security_issues = self.check_sql_security(sql);
        let performance_score = self.estimate_performance(sql, &context);
        let optimization_suggestions = self.generate_optimization_suggestions(sql, &context);

        // 构建验证结果
        let validation = SQLValidation {
            valid: syntax_errors.is_empty() && security_issues.is_empty(),
            errors: syntax_errors,
            warnings: Vec::new(), // 可以在这里添加警告逻辑
            performance_score,
            security_issues,
            optimization_suggestions,
        };

        Ok(json!(MCPResponse::success(validation)))
    }
}

impl Default for SQLValidationTool {
    fn default() -> Self {
        Self::new()
    }
}