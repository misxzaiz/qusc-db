pub mod enhanced_context;
pub mod sql_validation;
pub mod smart_query;

use crate::AppState;
use serde_json::Value;
use anyhow::Result;
use async_trait::async_trait;

/// MCP工具特征
#[async_trait]
pub trait MCPTool: Send + Sync {
    /// 工具名称
    fn name(&self) -> &str;
    
    /// 工具描述
    fn description(&self) -> &str;
    
    /// 执行工具
    async fn execute(&self, params: Value, app_state: &AppState) -> Result<Value>;
}

/// 工具注册中心
pub struct ToolRegistry {
    tools: std::collections::HashMap<String, Box<dyn MCPTool>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self {
            tools: std::collections::HashMap::new(),
        }
    }

    /// 注册工具
    pub fn register(&mut self, tool: Box<dyn MCPTool>) {
        let name = tool.name().to_string();
        self.tools.insert(name, tool);
    }

    /// 获取工具
    pub fn get(&self, name: &str) -> Option<&dyn MCPTool> {
        self.tools.get(name).map(|t| t.as_ref())
    }

    /// 列出所有工具
    pub fn list_tools(&self) -> Vec<String> {
        self.tools.keys().cloned().collect()
    }

    /// 调用工具
    pub async fn call_tool(&self, name: &str, params: Value, app_state: &AppState) -> Result<Value> {
        if let Some(tool) = self.get(name) {
            tool.execute(params, app_state).await
        } else {
            Err(anyhow::anyhow!("工具 '{}' 不存在", name))
        }
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// 注册所有默认工具
pub fn register_default_tools(registry: &mut ToolRegistry) {
    registry.register(Box::new(enhanced_context::EnhancedContextTool::new()));
    registry.register(Box::new(sql_validation::SQLValidationTool::new()));
    registry.register(Box::new(smart_query::SmartQueryTool::new()));
}