use crate::mcp::tools::MCPTool;
use crate::mcp::types::*;
use crate::mcp::context::ContextBuilder;
use crate::commands::AppState;
use serde_json::{Value, json};
use anyhow::Result;
use async_trait::async_trait;

/// 增强上下文工具
pub struct EnhancedContextTool {
    context_builder: ContextBuilder,
}

impl EnhancedContextTool {
    pub fn new() -> Self {
        Self {
            context_builder: ContextBuilder::new(),
        }
    }
}

#[async_trait]
impl MCPTool for EnhancedContextTool {
    fn name(&self) -> &str {
        "get_enhanced_context"
    }

    fn description(&self) -> &str {
        "获取指定表的增强上下文信息，包括表结构、业务语义、关系分析等"
    }

    async fn execute(&self, params: Value, app_state: &AppState) -> Result<Value> {
        // 解析参数
        let tables: Vec<String> = params["tables"]
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("缺少 'tables' 参数"))?
            .iter()
            .map(|v| v.as_str().unwrap_or("").to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let connection_id = params["connectionId"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("缺少 'connectionId' 参数"))?;

        if tables.is_empty() {
            return Ok(json!(MCPResponse::<()>::error("表列表不能为空".to_string())));
        }

        // 获取数据库连接
        let connections = app_state.connections.lock().await;
        let connection = connections
            .get(connection_id)
            .ok_or_else(|| anyhow::anyhow!("连接 '{}' 不存在", connection_id))?;

        // 获取数据库结构
        let schema = connection.get_schema().await
            .map_err(|e| anyhow::anyhow!("获取数据库结构失败: {}", e))?;

        // 验证请求的表是否存在
        let mut missing_tables = Vec::new();
        for table_name in &tables {
            if !schema.iter().any(|t| t.name == *table_name) {
                missing_tables.push(table_name.clone());
            }
        }

        if !missing_tables.is_empty() {
            return Ok(json!(MCPResponse::<()>::error(
                format!("以下表不存在: {}", missing_tables.join(", "))
            )));
        }

        // 构建增强上下文
        match self.context_builder.build_enhanced_context(&tables, &schema).await {
            Ok(context) => {
                // 添加一些额外的统计信息
                let mut enhanced_context = context;
                enhanced_context.stats.total_columns = enhanced_context.tables.values()
                    .map(|t| t.structure.columns.len() as u32)
                    .sum();
                enhanced_context.stats.relationship_count = enhanced_context.relationships.len() as u32;

                Ok(json!(MCPResponse::success(enhanced_context)))
            }
            Err(e) => {
                log::error!("构建增强上下文失败: {}", e);
                Ok(json!(MCPResponse::<()>::error(
                    format!("构建上下文失败: {}", e)
                )))
            }
        }
    }
}

impl Default for EnhancedContextTool {
    fn default() -> Self {
        Self::new()
    }
}