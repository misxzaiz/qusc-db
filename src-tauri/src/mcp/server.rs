use crate::mcp::tools::{ToolRegistry, register_default_tools};
use crate::mcp::context::ContextBuilder;
use crate::commands::AppState;
use serde_json::Value;
use anyhow::Result;
use std::sync::Arc;

/// MCP服务器核心实现
pub struct MCPServer {
    app_state: Option<Arc<AppState>>,
    tool_registry: ToolRegistry,
    context_builder: ContextBuilder,
    initialized: bool,
}

impl MCPServer {
    /// 创建新的MCP服务器实例
    pub async fn new(app_state: Arc<AppState>) -> Result<Self> {
        let mut tool_registry = ToolRegistry::new();
        register_default_tools(&mut tool_registry);

        let context_builder = ContextBuilder::new();

        Ok(Self {
            app_state: Some(app_state),
            tool_registry,
            context_builder,
            initialized: true,
        })
    }

    /// 创建简化的MCP服务器实例(不依赖AppState)
    pub async fn new_simple() -> Result<Self> {
        let mut tool_registry = ToolRegistry::new();
        register_default_tools(&mut tool_registry);

        let context_builder = ContextBuilder::new();

        Ok(Self {
            app_state: None,
            tool_registry,
            context_builder,
            initialized: true,
        })
    }

    /// 调用MCP工具 (需要AppState)
    pub async fn call_tool(&self, tool_name: &str, params: Value) -> Result<Value> {
        if !self.initialized {
            return Err(anyhow::anyhow!("MCP服务器未初始化"));
        }

        if let Some(app_state) = &self.app_state {
            log::info!("调用MCP工具: {} with params: {}", tool_name, params);

            match self.tool_registry.call_tool(tool_name, params, app_state).await {
                Ok(result) => {
                    log::info!("工具 {} 执行成功", tool_name);
                    Ok(result)
                }
                Err(e) => {
                    log::error!("工具 {} 执行失败: {}", tool_name, e);
                    Err(e)
                }
            }
        } else {
            Err(anyhow::anyhow!("AppState未设置，无法调用工具"))
        }
    }

    /// 调用MCP工具 (简化版本，创建临时AppState)
    pub async fn call_tool_simple(&self, tool_name: &str, params: Value, app_state: &AppState) -> Result<Value> {
        if !self.initialized {
            return Err(anyhow::anyhow!("MCP服务器未初始化"));
        }

        log::info!("调用MCP工具: {} with params: {}", tool_name, params);

        match self.tool_registry.call_tool(tool_name, params, app_state).await {
            Ok(result) => {
                log::info!("工具 {} 执行成功", tool_name);
                Ok(result)
            }
            Err(e) => {
                log::error!("工具 {} 执行失败: {}", tool_name, e);
                Err(e)
            }
        }
    }

    /// 获取可用工具列表
    pub fn list_tools(&self) -> Vec<String> {
        self.tool_registry.list_tools()
    }

    /// 获取工具描述
    pub fn get_tool_info(&self) -> Vec<(String, String)> {
        let tool_names = self.tool_registry.list_tools();
        let mut tool_info = Vec::new();

        for name in tool_names {
            if let Some(tool) = self.tool_registry.get(&name) {
                tool_info.push((name, tool.description().to_string()));
            }
        }

        tool_info
    }

    /// 检查服务器是否已初始化
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }

    /// 健康检查
    pub async fn health_check(&self) -> Result<Value> {
        let tools = self.list_tools();
        let connections_count = if let Some(app_state) = &self.app_state {
            app_state.connections.lock().await.len()
        } else {
            0
        };

        Ok(serde_json::json!({
            "status": "healthy",
            "initialized": self.initialized,
            "tools_count": tools.len(),
            "available_tools": tools,
            "connections_count": connections_count,
            "timestamp": chrono::Utc::now().to_rfc3339()
        }))
    }

    /// 获取服务器统计信息
    pub async fn get_stats(&self) -> Result<Value> {
        let tools = self.list_tools();
        let mut connection_stats = Vec::new();
        
        if let Some(app_state) = &self.app_state {
            let connections = app_state.connections.lock().await;
            
            for (id, connection) in connections.iter() {
                connection_stats.push(serde_json::json!({
                    "id": id,
                    "connected": connection.is_connected(),
                    "type": "database" // 可以根据实际连接类型调整
                }));
            }
        }

        Ok(serde_json::json!({
            "server": {
                "initialized": self.initialized,
                "uptime": "N/A", // 可以添加启动时间跟踪
                "version": "1.0.0"
            },
            "tools": {
                "count": tools.len(),
                "available": tools
            },
            "connections": {
                "count": connection_stats.len(),
                "details": connection_stats
            },
            "timestamp": chrono::Utc::now().to_rfc3339()
        }))
    }

    /// 重置服务器状态
    pub async fn reset(&mut self) -> Result<()> {
        // 清理上下文缓存
        self.context_builder.clear_cache().await;
        
        // 重新注册工具
        self.tool_registry = ToolRegistry::new();
        register_default_tools(&mut self.tool_registry);

        log::info!("MCP服务器已重置");
        Ok(())
    }

    /// 处理JSON-RPC请求（预留扩展）
    pub async fn handle_jsonrpc(&self, request: Value) -> Result<Value> {
        // 解析JSON-RPC请求
        let method = request["method"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("缺少method字段"))?;

        let params = request["params"].clone();
        let id = request.get("id").cloned();

        let result = match method {
            "call_tool" => {
                let tool_name = params["tool"]
                    .as_str()
                    .ok_or_else(|| anyhow::anyhow!("缺少tool参数"))?;
                let tool_params = params["params"].clone();
                
                self.call_tool(tool_name, tool_params).await?
            }
            "list_tools" => {
                serde_json::to_value(self.list_tools())?
            }
            "health_check" => {
                self.health_check().await?
            }
            "get_stats" => {
                self.get_stats().await?
            }
            _ => {
                return Err(anyhow::anyhow!("不支持的方法: {}", method));
            }
        };

        // 构建JSON-RPC响应
        let response = if let Some(req_id) = id {
            serde_json::json!({
                "jsonrpc": "2.0",
                "result": result,
                "id": req_id
            })
        } else {
            serde_json::json!({
                "jsonrpc": "2.0",
                "result": result
            })
        };

        Ok(response)
    }
}