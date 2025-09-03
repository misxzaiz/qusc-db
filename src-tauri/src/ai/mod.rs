use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub provider: AIProvider,
    pub api_key: String,
    pub api_endpoint: String,
    pub model: String,
    pub max_tokens: u32,
    pub temperature: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AIProvider {
    DeepSeek,
    OpenAI,
    Claude,
    Local,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequest {
    pub prompt: String,
    pub context: Option<String>,
    pub request_type: AIRequestType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AIRequestType {
    GenerateSQL,
    OptimizeSQL,
    ExplainError,
    ExplainQuery,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponse {
    pub content: String,
    pub confidence: f32,
    pub suggestions: Vec<String>,
}

#[async_trait]
pub trait AIService: Send + Sync {
    async fn generate_sql(&self, prompt: &str, context: Option<&str>) -> anyhow::Result<AIResponse>;
    async fn optimize_sql(&self, sql: &str, context: Option<&str>) -> anyhow::Result<AIResponse>;
    async fn explain_error(&self, error: &str, sql: Option<&str>) -> anyhow::Result<AIResponse>;
    async fn explain_query(&self, sql: &str) -> anyhow::Result<AIResponse>;
}

pub mod deepseek;