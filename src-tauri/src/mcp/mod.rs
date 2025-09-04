pub mod server;
pub mod tools;
pub mod types;
pub mod context;

use crate::commands::AppState;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde_json::Value;
use anyhow::Result;

pub use server::MCPServer;

/// MCP服务器实例
pub struct MCP {
    server: Option<Arc<RwLock<MCPServer>>>,
}

impl MCP {
    pub fn new() -> Self {
        Self { server: None }
    }

    /// 初始化MCP服务器 (简化版本，不依赖AppState)
    pub async fn initialize_simple(&mut self) -> Result<()> {
        let server = MCPServer::new_simple().await?;
        self.server = Some(Arc::new(RwLock::new(server)));
        Ok(())
    }

    /// 调用MCP工具
    pub async fn call_tool(&self, tool_name: &str, params: Value, app_state: &AppState) -> Result<Value> {
        if let Some(server) = &self.server {
            let server = server.read().await;
            server.call_tool_simple(tool_name, params, app_state).await
        } else {
            Err(anyhow::anyhow!("MCP服务器未初始化"))
        }
    }

    /// 获取可用工具列表
    pub async fn list_tools(&self) -> Result<Vec<String>> {
        if let Some(server) = &self.server {
            let server = server.read().await;
            Ok(server.list_tools())
        } else {
            Err(anyhow::anyhow!("MCP服务器未初始化"))
        }
    }

    /// 检查是否已初始化
    pub fn is_initialized(&self) -> bool {
        self.server.is_some()
    }
}

impl Default for MCP {
    fn default() -> Self {
        Self::new()
    }
}