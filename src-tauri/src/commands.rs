use crate::database::{DatabaseConnection, ConnectionConfig, QueryResult, TableInfo, DatabaseType, mysql::MySQLConnection, redis::RedisConnection};
use crate::ai::{AIService, AIConfig, AIProvider, deepseek::DeepSeekService};
use crate::mcp::{MCP};
use tauri::State;
use tokio::sync::Mutex;
use std::collections::HashMap;
use uuid::Uuid;

pub struct AppState {
    pub connections: Mutex<HashMap<String, Box<dyn DatabaseConnection>>>,
    pub ai_service: Mutex<Option<Box<dyn AIService>>>,
    pub mcp_server: Mutex<Option<MCP>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
            ai_service: Mutex::new(None),
            mcp_server: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn connect_database(
    db_type: String,
    host: String,
    port: u16,
    username: Option<String>,
    password: Option<String>,
    database: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let connection_id = Uuid::new_v4().to_string();
    
    // 重构配置对象
    let config = ConnectionConfig {
        db_type: match db_type.as_str() {
            "MySQL" => DatabaseType::MySQL,
            "Redis" => DatabaseType::Redis,
            "PostgreSQL" => DatabaseType::PostgreSQL,
            _ => return Err("Unsupported database type".to_string()),
        },
        host,
        port,
        username,
        password,
        database,
        options: std::collections::HashMap::new(),
    };
    
    let mut connection: Box<dyn DatabaseConnection> = match config.db_type {
        DatabaseType::MySQL => Box::new(MySQLConnection::new()),
        DatabaseType::Redis => Box::new(RedisConnection::new()),
        _ => return Err("Unsupported database type".to_string()),
    };
    
    connection.connect(&config).await
        .map_err(|e| format!("连接失败: {}", e))?;
        
    state.connections.lock().await
        .insert(connection_id.clone(), connection);
        
    Ok(connection_id)
}

#[tauri::command]
pub async fn execute_query(
    connection_id: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<QueryResult, String> {
    let connections = state.connections.lock().await;
    let connection = connections.get(&connection_id)
        .ok_or("连接未找到")?;
        
    connection.execute(&query).await
        .map_err(|e| format!("查询执行失败: {}", e))
}

#[tauri::command]
pub async fn get_database_schema(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TableInfo>, String> {
    let connections = state.connections.lock().await;
    let connection = connections.get(&connection_id)
        .ok_or("连接未找到")?;
        
    connection.get_schema().await
        .map_err(|e| format!("获取数据库结构失败: {}", e))
}

#[tauri::command]
pub async fn test_database_connection(
    db_type: String,
    host: String,
    port: u16,
    username: Option<String>,
    password: Option<String>,
    database: Option<String>,
) -> Result<bool, String> {
    // 重构配置对象
    let config = ConnectionConfig {
        db_type: match db_type.as_str() {
            "MySQL" => DatabaseType::MySQL,
            "Redis" => DatabaseType::Redis,
            "PostgreSQL" => DatabaseType::PostgreSQL,
            _ => return Err("Unsupported database type".to_string()),
        },
        host,
        port,
        username,
        password,
        database,
        options: std::collections::HashMap::new(),
    };
    let mut connection: Box<dyn DatabaseConnection> = match config.db_type {
        DatabaseType::MySQL => Box::new(MySQLConnection::new()),
        DatabaseType::Redis => Box::new(RedisConnection::new()),
        _ => return Err("Unsupported database type".to_string()),
    };
    
    match connection.connect(&config).await {
        Ok(_) => {
            let _ = connection.disconnect().await;
            Ok(true)
        }
        Err(e) => Err(format!("连接测试失败: {}", e)),
    }
}

#[tauri::command]
pub async fn disconnect_database(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    if let Some(mut connection) = connections.remove(&connection_id) {
        connection.disconnect().await
            .map_err(|e| format!("断开连接失败: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn configure_ai_service(
    provider: String,
    api_key: String,
    api_endpoint: String,
    model: String,
    temperature: f32,
    max_tokens: u32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // 重构配置对象
    let config = AIConfig {
        provider: match provider.as_str() {
            "deepseek" => AIProvider::DeepSeek,
            "openai" => AIProvider::OpenAI,
            "claude" => AIProvider::Claude,
            "local" => AIProvider::Local,
            _ => return Err("Unsupported AI provider".to_string()),
        },
        api_key,
        api_endpoint,
        model,
        temperature,
        max_tokens,
    };

    let service: Box<dyn AIService> = match config.provider {
        AIProvider::DeepSeek => Box::new(DeepSeekService::new(config)),
        _ => return Err("Unsupported AI provider".to_string()),
    };
    
    *state.ai_service.lock().await = Some(service);
    Ok(())
}

#[tauri::command]
pub async fn ai_generate_sql(
    prompt: String,
    context: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ai_service = state.ai_service.lock().await;
    let service = ai_service.as_ref()
        .ok_or("AI服务未配置")?;
        
    let response = service.generate_sql(&prompt, context.as_deref()).await
        .map_err(|e| format!("AI生成SQL失败: {}", e))?;
        
    Ok(response.content)
}

#[tauri::command]
pub async fn ai_optimize_sql(
    sql: String,
    context: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ai_service = state.ai_service.lock().await;
    let service = ai_service.as_ref()
        .ok_or("AI服务未配置")?;
        
    let response = service.optimize_sql(&sql, context.as_deref()).await
        .map_err(|e| format!("AI优化SQL失败: {}", e))?;
        
    Ok(response.content)
}

#[tauri::command]
pub async fn ai_explain_error(
    error: String,
    sql: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ai_service = state.ai_service.lock().await;
    let service = ai_service.as_ref()
        .ok_or("AI服务未配置")?;
        
    let response = service.explain_error(&error, sql.as_deref()).await
        .map_err(|e| format!("AI解释错误失败: {}", e))?;
        
    Ok(response.content)
}

#[tauri::command]
pub async fn ai_explain_query(
    sql: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let ai_service = state.ai_service.lock().await;
    let service = ai_service.as_ref()
        .ok_or("AI服务未配置")?;
        
    let response = service.explain_query(&sql).await
        .map_err(|e| format!("AI解释查询失败: {}", e))?;
        
    Ok(response.content)
}

#[tauri::command]
pub async fn get_connection_status(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let connections = state.connections.lock().await;
    let connection = connections.get(&connection_id)
        .ok_or("连接未找到")?;
        
    Ok(connection.is_connected())
}

#[tauri::command]
pub async fn get_databases(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let connections = state.connections.lock().await;
    let connection = connections.get(&connection_id)
        .ok_or("连接未找到")?;
        
    connection.get_databases().await
        .map_err(|e| format!("获取数据库列表失败: {}", e))
}

#[tauri::command]
pub async fn use_database(
    connection_id: String,
    database_name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    let connection = connections.get_mut(&connection_id)
        .ok_or("连接未找到")?;
        
    connection.use_database(&database_name).await
        .map_err(|e| format!("切换数据库失败: {}", e))
}

#[tauri::command]
pub async fn list_active_connections(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let connections = state.connections.lock().await;
    Ok(connections.keys().cloned().collect())
}

#[tauri::command]
pub async fn get_database_tables(
    connection_id: String,
    database_name: String,
    state: State<'_, AppState>,
) -> Result<Vec<TableInfo>, String> {
    let mut connections = state.connections.lock().await;
    let connection = connections.get_mut(&connection_id)
        .ok_or("连接未找到")?;
    
    // 先选择数据库
    connection.use_database(&database_name).await
        .map_err(|e| format!("选择数据库失败: {}", e))?;
    
    // 获取表结构
    connection.get_schema().await
        .map_err(|e| format!("获取表结构失败: {}", e))
}

// ==================== MCP 相关命令 ====================

#[tauri::command]
pub async fn mcp_initialize(state: State<'_, AppState>) -> Result<String, String> {
    log::info!("收到MCP初始化请求");
    let mut mcp_server = state.mcp_server.lock().await;
    
    if mcp_server.is_some() {
        log::info!("MCP服务器已经初始化，直接返回");
        return Ok("MCP服务器已经初始化".to_string());
    }
    
    log::info!("创建新的MCP实例");
    let mut mcp = MCP::new();
    
    log::info!("调用 initialize_simple()");
    match mcp.initialize_simple().await {
        Ok(()) => {
            log::info!("MCP initialize_simple() 成功");
            *mcp_server = Some(mcp);
            log::info!("MCP服务器初始化成功");
            Ok("MCP服务器初始化成功".to_string())
        }
        Err(e) => {
            log::error!("MCP服务器初始化失败: {}", e);
            Err(format!("MCP服务器初始化失败: {}", e))
        }
    }
}

#[tauri::command]
pub async fn mcp_get_enhanced_context(
    tables: Vec<String>,
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mcp_server = state.mcp_server.lock().await;
    
    let mcp = mcp_server
        .as_ref()
        .ok_or("MCP服务器未初始化")?;

    let params = serde_json::json!({
        "tables": tables,
        "connectionId": connection_id
    });

    mcp.call_tool("get_enhanced_context", params, &*state)
        .await
        .map_err(|e| format!("调用增强上下文工具失败: {}", e))
}

#[tauri::command]
pub async fn mcp_validate_sql(
    sql: String,
    context: serde_json::Value,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mcp_server = state.mcp_server.lock().await;
    
    let mcp = mcp_server
        .as_ref()
        .ok_or("MCP服务器未初始化")?;

    let params = serde_json::json!({
        "sql": sql,
        "context": context
    });

    mcp.call_tool("validate_sql", params, &*state)
        .await
        .map_err(|e| format!("调用SQL验证工具失败: {}", e))
}

#[tauri::command]
pub async fn mcp_execute_smart_query(
    sql: String,
    options: serde_json::Value,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mcp_server = state.mcp_server.lock().await;
    
    let mcp = mcp_server
        .as_ref()
        .ok_or("MCP服务器未初始化")?;

    let params = serde_json::json!({
        "sql": sql,
        "options": options
    });

    mcp.call_tool("execute_smart_query", params, &*state)
        .await
        .map_err(|e| format!("调用智能查询工具失败: {}", e))
}

#[tauri::command]
pub async fn mcp_list_tools(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let mcp_server = state.mcp_server.lock().await;
    
    let mcp = mcp_server
        .as_ref()
        .ok_or("MCP服务器未初始化")?;

    mcp.list_tools()
        .await
        .map_err(|e| format!("获取工具列表失败: {}", e))
}

#[tauri::command]
pub async fn mcp_health_check(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let mcp_server = state.mcp_server.lock().await;
    
    let mcp = mcp_server
        .as_ref()
        .ok_or("MCP服务器未初始化")?;

    // 通过调用list_tools来检查健康状态
    match mcp.list_tools().await {
        Ok(tools) => {
            let response = serde_json::json!({
                "status": "healthy",
                "tools_available": tools.len(),
                "tools": tools,
                "timestamp": chrono::Utc::now().to_rfc3339()
            });
            Ok(response)
        }
        Err(e) => {
            Err(format!("MCP健康检查失败: {}", e))
        }
    }
}