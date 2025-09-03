use super::{AIService, AIConfig, AIResponse};
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;

pub struct DeepSeekService {
    client: Client,
    config: AIConfig,
}

impl DeepSeekService {
    pub fn new(config: AIConfig) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }
}

#[async_trait]
impl AIService for DeepSeekService {
    async fn generate_sql(&self, prompt: &str, context: Option<&str>) -> anyhow::Result<AIResponse> {
        let system_prompt = "你是一个SQL专家助手。用户会用自然语言描述需求，你需要生成对应的SQL语句。请只返回SQL语句，不需要额外的解释。";
        
        let user_prompt = if let Some(ctx) = context {
            format!("数据库结构信息：\n{}\n\n用户需求：{}\n\n请生成对应的SQL语句。", ctx, prompt)
        } else {
            format!("用户需求：{}\n\n请生成对应的SQL语句。", prompt)
        };
        
        let response = self.client
            .post(&self.config.api_endpoint)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&json!({
                "model": self.config.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": self.config.max_tokens,
                "temperature": self.config.temperature
            }))
            .send()
            .await?;
            
        let result: serde_json::Value = response.json().await?;
        let content = result["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
            
        // 提取SQL语句（去除markdown格式）
        let sql = extract_sql_from_response(&content);
            
        Ok(AIResponse {
            content: sql,
            confidence: 0.85,
            suggestions: vec![],
        })
    }

    async fn optimize_sql(&self, sql: &str, context: Option<&str>) -> anyhow::Result<AIResponse> {
        let system_prompt = "你是一个SQL优化专家。分析用户提供的SQL语句，提供优化建议和改进后的SQL。请返回优化后的SQL语句和简要的优化说明。";
        
        let user_prompt = if let Some(ctx) = context {
            format!("数据库结构信息：\n{}\n\n原始SQL语句：\n{}\n\n请提供优化建议和改进后的SQL。", ctx, sql)
        } else {
            format!("原始SQL语句：\n{}\n\n请提供优化建议和改进后的SQL。", sql)
        };
        
        let response = self.client
            .post(&self.config.api_endpoint)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&json!({
                "model": self.config.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": self.config.max_tokens,
                "temperature": self.config.temperature
            }))
            .send()
            .await?;
            
        let result: serde_json::Value = response.json().await?;
        let content = result["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
            
        Ok(AIResponse {
            content,
            confidence: 0.80,
            suggestions: vec![],
        })
    }

    async fn explain_error(&self, error: &str, sql: Option<&str>) -> anyhow::Result<AIResponse> {
        let system_prompt = "你是一个SQL错误诊断专家。分析错误信息，提供详细的错误原因分析和具体的解决方案。";
        
        let user_prompt = if let Some(query) = sql {
            format!("SQL语句：\n{}\n\n错误信息：\n{}\n\n请解释错误原因并提供修复建议。", query, error)
        } else {
            format!("错误信息：\n{}\n\n请解释可能的原因和解决方案。", error)
        };
        
        let response = self.client
            .post(&self.config.api_endpoint)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&json!({
                "model": self.config.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": self.config.max_tokens,
                "temperature": self.config.temperature
            }))
            .send()
            .await?;
            
        let result: serde_json::Value = response.json().await?;
        let content = result["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
            
        Ok(AIResponse {
            content,
            confidence: 0.90,
            suggestions: vec![],
        })
    }

    async fn explain_query(&self, sql: &str) -> anyhow::Result<AIResponse> {
        let system_prompt = "你是一个SQL解释专家。详细解释SQL语句的执行逻辑、各个部分的作用，以及查询的业务含义。";
        
        let user_prompt = format!("请详细解释以下SQL语句：\n{}", sql);
        
        let response = self.client
            .post(&self.config.api_endpoint)
            .header("Authorization", format!("Bearer {}", self.config.api_key))
            .header("Content-Type", "application/json")
            .json(&json!({
                "model": self.config.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": self.config.max_tokens,
                "temperature": self.config.temperature
            }))
            .send()
            .await?;
            
        let result: serde_json::Value = response.json().await?;
        let content = result["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
            
        Ok(AIResponse {
            content,
            confidence: 0.88,
            suggestions: vec![],
        })
    }
}

fn extract_sql_from_response(content: &str) -> String {
    // 移除markdown代码块标记
    let content = content.trim();
    
    // 查找SQL代码块
    if let Some(start) = content.find("```sql") {
        let sql_start = start + 6;
        if let Some(end) = content[sql_start..].find("```") {
            return content[sql_start..sql_start + end].trim().to_string();
        }
    }
    
    // 查找普通代码块
    if let Some(start) = content.find("```") {
        let sql_start = start + 3;
        if let Some(end) = content[sql_start..].find("```") {
            return content[sql_start..sql_start + end].trim().to_string();
        }
    }
    
    // 如果没有找到代码块，返回原内容
    content.to_string()
}