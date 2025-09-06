use crate::database::{
    DatabaseConnection, ConnectionConfig, QueryResult, TableInfo, DatabaseType as LegacyDatabaseType, 
    mysql::MySQLConnection, redis::RedisConnection, postgresql::PostgreSQLConnection, mongodb::MongoDBConnection,
    enhanced_types::*, test_adapter::{AdapterConverter}
};
use crate::ai::{AIService, AIConfig, AIProvider, deepseek::DeepSeekService};
use crate::mcp::{MCP};
use tauri::State;
use tokio::sync::Mutex;
use std::collections::HashMap;
use uuid::Uuid;

// 辅助函数：格式化字节数
fn format_bytes(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = bytes as f64;
    let mut unit_index = 0;
    
    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }
    
    if size == size as u64 as f64 {
        format!("{}{}", size as u64, UNITS[unit_index])
    } else {
        format!("{:.1}{}", size, UNITS[unit_index])
    }
}

pub struct AppState {
    pub connections: Mutex<HashMap<String, Box<dyn DatabaseConnection>>>,
    pub connection_configs: Mutex<HashMap<String, ConnectionConfig>>,
    pub ai_service: Mutex<Option<Box<dyn AIService>>>,
    pub mcp_server: Mutex<Option<MCP>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
            connection_configs: Mutex::new(HashMap::new()),
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
            "MySQL" => LegacyDatabaseType::MySQL,
            "Redis" => LegacyDatabaseType::Redis,
            "PostgreSQL" => LegacyDatabaseType::PostgreSQL,
            "MongoDB" => LegacyDatabaseType::MongoDB,
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
        LegacyDatabaseType::MySQL => Box::new(MySQLConnection::new()),
        LegacyDatabaseType::Redis => Box::new(RedisConnection::new()),
        LegacyDatabaseType::PostgreSQL => Box::new(PostgreSQLConnection::new()),
        LegacyDatabaseType::MongoDB => Box::new(MongoDBConnection::new()),
        _ => return Err("Unsupported database type".to_string()),
    };
    
    connection.connect(&config).await
        .map_err(|e| format!("连接失败: {}", e))?;
        
    state.connections.lock().await
        .insert(connection_id.clone(), connection);
    state.connection_configs.lock().await
        .insert(connection_id.clone(), config);
        
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
            "MySQL" => LegacyDatabaseType::MySQL,
            "Redis" => LegacyDatabaseType::Redis,
            "PostgreSQL" => LegacyDatabaseType::PostgreSQL,
            "MongoDB" => LegacyDatabaseType::MongoDB,
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
        LegacyDatabaseType::MySQL => Box::new(MySQLConnection::new()),
        LegacyDatabaseType::Redis => Box::new(RedisConnection::new()),
        LegacyDatabaseType::PostgreSQL => Box::new(PostgreSQLConnection::new()),
        LegacyDatabaseType::MongoDB => Box::new(MongoDBConnection::new()),
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
    
    // 同时清理连接配置
    state.connection_configs.lock().await.remove(&connection_id);
    
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
pub async fn get_databases_2(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<DatabaseListResponse, String> {
    let connections = state.connections.lock().await;
    let connection = connections.get(&connection_id)
        .ok_or("连接未找到")?;
        
    // 获取数据库列表（轻量级，只获取名称）
    let database_names = connection.get_databases().await
        .map_err(|e| format!("获取数据库列表失败: {}", e))?;
    
    // 从连接配置中获取数据库类型
    let configs = state.connection_configs.lock().await;
    let config = configs.get(&connection_id)
        .ok_or("连接配置未找到")?;
    
    // 转换数据库类型
    let db_type = match config.db_type {
        LegacyDatabaseType::MySQL => DatabaseType::MySQL,
        LegacyDatabaseType::PostgreSQL => DatabaseType::PostgreSQL,
        LegacyDatabaseType::Redis => DatabaseType::Redis,
        LegacyDatabaseType::MongoDB => DatabaseType::MongoDB,
        LegacyDatabaseType::SQLite => DatabaseType::SQLite,
    };
    
    // 构建轻量级数据库信息（不获取具体表信息）
    let mut databases = Vec::new();
    for db_name in database_names {
        let (table_count, estimated_size) = match db_type {
            DatabaseType::Redis => {
                (None, 0)
            },
            _ => {
                (None, 0)
            }
        };
        
        databases.push(DatabaseBasicInfo {
            name: db_name,
            size_info: Some(SizeInfo {
                bytes: estimated_size,
                formatted: format_bytes(estimated_size),
            }),
            table_count,
            view_count: Some(0),
            procedure_count: Some(0),
            function_count: Some(0),
            has_tables: table_count.unwrap_or(0) > 0,
            has_views: false,
            has_procedures: false,
            has_functions: false,
        });
    }
    
    Ok(DatabaseListResponse {
        connection_id: connection_id.clone(),
        db_type,
        databases,
    })
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
) -> Result<DatabaseTablesResponse, String> {
    let mut connections = state.connections.lock().await;
    let connection = connections.get_mut(&connection_id)
        .ok_or("连接未找到")?;
    
    // 从连接配置中获取数据库类型
    let configs = state.connection_configs.lock().await;
    let config = configs.get(&connection_id)
        .ok_or("连接配置未找到")?;
    
    // 转换数据库类型
    let db_type = match config.db_type {
        LegacyDatabaseType::MySQL => DatabaseType::MySQL,
        LegacyDatabaseType::PostgreSQL => DatabaseType::PostgreSQL,
        LegacyDatabaseType::Redis => DatabaseType::Redis,
        LegacyDatabaseType::MongoDB => DatabaseType::MongoDB,
        LegacyDatabaseType::SQLite => DatabaseType::SQLite,
    };
    
    // 根据数据库类型处理不同的结构
    let (tables, views, procedures, functions, redis_keys, mongodb_collections) = match db_type {
        DatabaseType::Redis => {
            // Redis 特殊处理：database_name 实际上是数据库索引
            let keys_result = connection.execute("KEYS *").await
                .map_err(|e| format!("获取Redis键列表失败: {}", e))?;
            
            let key_count = keys_result.rows.len() as u64;
            let sample_keys: Vec<RedisKeyNode> = keys_result.rows.into_iter()
                .take(100)
                .map(|row| {
                    let key_name = row.get(0).unwrap_or(&"unknown".to_string()).clone();
                    RedisKeyNode {
                        key: key_name,
                        data_type: RedisDataType::String,
                        ttl: None,
                        size: None,
                    }
                })
                .collect();
            
            let redis_key_info = RedisKeyInfo {
                database_index: database_name.parse().unwrap_or(0),
                key_count,
                expires_count: 0,
                memory_usage: None,
                sample_keys,
            };
            
            (vec![], vec![], vec![], vec![], Some(redis_key_info), None)
        },
        DatabaseType::MySQL | DatabaseType::PostgreSQL => {
            // 先选择数据库
            connection.use_database(&database_name).await
                .map_err(|e| format!("选择数据库失败: {}", e))?;
            
            // 获取表结构
            let tables_info = connection.get_schema().await
                .map_err(|e| format!("获取表结构失败: {}", e))?;
            
            let tables: Vec<TableNode> = tables_info.into_iter().map(|table| {
                let size_bytes = 1024 * 50; // 50KB 默认大小
                TableNode {
                    name: table.name.clone(),
                    size_info: Some(SizeInfo {
                        bytes: size_bytes,
                        formatted: format_bytes(size_bytes),
                    }),
                    row_count: None, // 暂时不获取行数，避免性能问题
                    table_type: TableType::Table,
                }
            }).collect();
            
            (tables, vec![], vec![], vec![], None, None)
        },
        _ => {
            // 其他数据库类型
            connection.use_database(&database_name).await
                .map_err(|e| format!("选择数据库失败: {}", e))?;
            
            let tables_info = connection.get_schema().await
                .map_err(|e| format!("获取表结构失败: {}", e))?;
            
            let tables: Vec<TableNode> = tables_info.into_iter().map(|table| {
                let size_bytes = 1024 * 10;
                TableNode {
                    name: table.name.clone(),
                    size_info: Some(SizeInfo {
                        bytes: size_bytes,
                        formatted: format_bytes(size_bytes),
                    }),
                    row_count: None,
                    table_type: TableType::Table,
                }
            }).collect();
            
            (tables, vec![], vec![], vec![], None, None)
        }
    };
    
    Ok(DatabaseTablesResponse {
        connection_id: connection_id.clone(),
        database_name: database_name.clone(),
        db_type,
        tables,
        views,
        procedures,
        functions,
        redis_keys,
        mongodb_collections,
    })
}

// ===== 新增：预加载接口 =====

/// 预加载表信息（为AI引用、SQL引用等场景）
#[tauri::command]
pub async fn preload_table_info(
    request: PreloadRequest,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let mut loaded_tables = Vec::new();
    
    for table_ref in request.tables {
        // 预加载指定表的信息
        let database_name = table_ref.database.clone();
        let table_name = table_ref.table.clone();
        
        match get_database_tables(
            request.connection_id.clone(),
            table_ref.database,
            state.clone()
        ).await {
            Ok(_response) => {
                loaded_tables.push(format!("{}.{}", database_name, table_name));
            },
            Err(e) => {
                log::warn!("预加载表 {}.{} 失败: {}", database_name, table_name, e);
            }
        }
    }
    
    // 记录预加载触发源（用于未来的智能预加载优化）
    log::info!("预加载触发 - 源: {:?}, 成功加载: {:?}", request.trigger_source, loaded_tables);
    
    Ok(loaded_tables)
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

// ===== 新增：增强版数据库命令 =====

/// 执行查询并返回增强结果（测试版）
#[tauri::command]
pub async fn execute_query_enhanced(
    connection_id: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<EnhancedQueryResult, String> {
    let connections = state.connections.lock().await;
    let connection = connections.get(&connection_id)
        .ok_or("连接未找到")?;
    
    // 从连接配置中获取数据库类型
    let configs = state.connection_configs.lock().await;
    let config = configs.get(&connection_id)
        .ok_or("连接配置未找到")?;
    
    // 转换数据库类型从Legacy到Enhanced
    let db_type = match config.db_type {
        LegacyDatabaseType::MySQL => DatabaseType::MySQL,
        LegacyDatabaseType::PostgreSQL => DatabaseType::PostgreSQL,
        LegacyDatabaseType::Redis => DatabaseType::Redis,
        LegacyDatabaseType::MongoDB => DatabaseType::MongoDB,
        LegacyDatabaseType::SQLite => DatabaseType::SQLite,
    };
    
    // 使用测试适配器包装现有连接
    let legacy_result = connection.execute(&query).await
        .map_err(|e| format!("查询执行失败: {}", e))?;
    
    // 转换为增强结果
    let enhanced_result = AdapterConverter::from_legacy_result(legacy_result, db_type);
    
    Ok(enhanced_result)
}

/// 获取UI配置信息
#[tauri::command]
pub async fn get_ui_config(
    _connection_id: String,
    db_type: String,
    _state: State<'_, AppState>,
) -> Result<DatabaseUIConfig, String> {
    let parsed_db_type = match db_type.as_str() {
        "MySQL" => DatabaseType::MySQL,
        "PostgreSQL" => DatabaseType::PostgreSQL,
        "Redis" => DatabaseType::Redis,
        "MongoDB" => DatabaseType::MongoDB,
        "SQLite" => DatabaseType::SQLite,
        _ => return Err("不支持的数据库类型".to_string()),
    };
    
    Ok(AdapterConverter::get_ui_config_for_db_type(parsed_db_type))
}

/// 获取查询建议（基础版）
#[tauri::command]
pub async fn get_query_suggestions(
    _connection_id: String,
    _context: String,
    _state: State<'_, AppState>,
) -> Result<Vec<QuerySuggestion>, String> {
    // 返回基础查询建议
    Ok(vec![
        QuerySuggestion {
            text: "SELECT * FROM".to_string(),
            description: "查询表数据".to_string(),
            category: SuggestionCategory::Keyword,
            score: 100,
        },
        QuerySuggestion {
            text: "INSERT INTO".to_string(),
            description: "插入数据".to_string(),
            category: SuggestionCategory::Keyword,
            score: 90,
        },
        QuerySuggestion {
            text: "UPDATE".to_string(),
            description: "更新数据".to_string(),
            category: SuggestionCategory::Keyword,
            score: 85,
        },
        QuerySuggestion {
            text: "DELETE FROM".to_string(),
            description: "删除数据".to_string(),
            category: SuggestionCategory::Keyword,
            score: 80,
        },
    ])
}

// ===== 新增：数据库结构导航API =====

/// 获取完整的数据库结构用于导航树
#[tauri::command]
pub async fn get_database_structure(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<DatabaseStructure, String> {
    let connections = state.connections.lock().await;
    let connection = connections.get(&connection_id)
        .ok_or("连接未找到")?;

    // 获取数据库列表
    let databases = connection.get_databases().await
        .map_err(|e| format!("获取数据库列表失败: {}", e))?;
    
    // 从连接配置中获取数据库类型
    let configs = state.connection_configs.lock().await;
    let config = configs.get(&connection_id)
        .ok_or("连接配置未找到")?;
    
    // 转换数据库类型从Legacy到Enhanced
    let db_type = match config.db_type {
        LegacyDatabaseType::MySQL => DatabaseType::MySQL,
        LegacyDatabaseType::PostgreSQL => DatabaseType::PostgreSQL,
        LegacyDatabaseType::Redis => DatabaseType::Redis,
        LegacyDatabaseType::MongoDB => DatabaseType::MongoDB,
        LegacyDatabaseType::SQLite => DatabaseType::SQLite,
    };
    
    let mut database_nodes = Vec::new();
    
    // 为每个数据库获取详细信息
    for db_name in databases {
        let _db_connection = connections.get(&connection_id)
            .ok_or("连接未找到")?;
        
        // 根据数据库类型处理不同的结构
        let (tables, redis_keys, mongodb_collections) = match db_type {
            DatabaseType::Redis => {
                // 对于Redis，获取键列表
                let keys_result = connection.execute("KEYS *").await
                    .map_err(|e| format!("获取Redis键列表失败: {}", e))?;
                
                // 先获取键的总数
                let key_count = keys_result.rows.len() as u64;
                
                // 构建Redis键信息
                let sample_keys: Vec<RedisKeyNode> = keys_result.rows.into_iter()
                    .take(100) // 限制显示前100个键
                    .map(|row| {
                        let key_name = row.get(0).unwrap_or(&"unknown".to_string()).clone();
                        RedisKeyNode {
                            key: key_name,
                            data_type: RedisDataType::String, // 简化处理，后续可以通过TYPE命令获取真实类型
                            ttl: None,
                            size: None,
                        }
                    })
                    .collect();
                
                let redis_key_info = RedisKeyInfo {
                    database_index: 0, // 简化处理，可以从连接配置获取
                    key_count,
                    expires_count: 0, // 简化处理
                    memory_usage: None,
                    sample_keys,
                };
                
                (vec![], Some(redis_key_info), None)
            },
            DatabaseType::MySQL | DatabaseType::PostgreSQL => {
                // 获取表信息
                let tables_info = connection.get_schema().await
                    .map_err(|e| format!("获取表结构失败: {}", e))?;
                
                let tables: Vec<TableNode> = tables_info.into_iter().map(|table| {
                    // 对于SQL数据库，使用合理的默认值
                    let (row_count, size_bytes) = (None, 1024 * 50); // 50KB 默认大小
                    
                    TableNode {
                        name: table.name.clone(),
                        size_info: Some(SizeInfo {
                            bytes: size_bytes,
                            formatted: format_bytes(size_bytes),
                        }),
                        row_count,
                        table_type: TableType::Table,
                    }
                }).collect();
                
                (tables, None, None)
            },
            _ => {
                // 其他数据库类型，使用默认处理
                let tables_info = connection.get_schema().await
                    .map_err(|e| format!("获取表结构失败: {}", e))?;
                
                let tables: Vec<TableNode> = tables_info.into_iter().map(|table| {
                    let (row_count, size_bytes) = (None, 1024 * 10); // 10KB 默认大小
                    
                    TableNode {
                        name: table.name.clone(),
                        size_info: Some(SizeInfo {
                            bytes: size_bytes,
                            formatted: format_bytes(size_bytes),
                        }),
                        row_count,
                        table_type: TableType::Table,
                    }
                }).collect();
                
                (tables, None, None)
            }
        };
        
        // 计算数据库大小（基于表数量的估算）
        let estimated_db_bytes = (tables.len() as u64) * 1024 * 100; // 每表估计100KB
        let estimated_db_bytes = if estimated_db_bytes < 1024 * 10 { 
            1024 * 10 // 最小10KB 
        } else { 
            estimated_db_bytes 
        };
        
        database_nodes.push(DatabaseNode {
            name: db_name,
            size_info: Some(SizeInfo {
                bytes: estimated_db_bytes,
                formatted: format_bytes(estimated_db_bytes),
            }),
            tables,
            views: vec![], // 稍后实现
            procedures: vec![], // 稍后实现
            functions: vec![], // 稍后实现
            redis_keys,
            mongodb_collections,
        });
    }
    
    Ok(DatabaseStructure {
        connection_id: connection_id.clone(),
        db_type,
        databases: database_nodes,
        connection_info: ConnectionInfo {
            host: config.host.clone(),
            port: config.port,
            username: config.username.clone(),
            database_name: config.database.clone(),
            server_version: None, // 稍后实现获取服务器版本
        },
    })
}

/// 获取Redis键列表和统计信息
#[tauri::command]
pub async fn get_redis_structure(
    connection_id: String,
    database_index: Option<i64>,
    state: State<'_, AppState>,
) -> Result<RedisKeyInfo, String> {
    let connections = state.connections.lock().await;
    let _connection = connections.get(&connection_id)
        .ok_or("连接未找到")?;

    // 模拟Redis键信息
    Ok(RedisKeyInfo {
        database_index: database_index.unwrap_or(0),
        key_count: 1234,
        expires_count: 156,
        memory_usage: Some(2048576), // 2MB
        sample_keys: vec![
            RedisKeyNode {
                key: "string:user:100".to_string(),
                data_type: RedisDataType::String,
                ttl: None,
                size: Some(64),
            },
            RedisKeyNode {
                key: "hash:product:500".to_string(),
                data_type: RedisDataType::Hash,
                ttl: Some(3600),
                size: Some(128),
            },
            RedisKeyNode {
                key: "list:queue:emails".to_string(),
                data_type: RedisDataType::List,
                ttl: None,
                size: Some(256),
            },
        ],
    })
}

/// 获取MongoDB集合和索引信息
#[tauri::command]
pub async fn get_mongodb_structure(
    connection_id: String,
    _database_name: String,
    state: State<'_, AppState>,
) -> Result<MongoCollectionInfo, String> {
    let connections = state.connections.lock().await;
    let _connection = connections.get(&connection_id)
        .ok_or("连接未找到")?;

    // 模拟MongoDB集合信息
    Ok(MongoCollectionInfo {
        collections: vec![
            MongoCollectionNode {
                name: "users".to_string(),
                document_count: Some(1500),
                size: Some(1024 * 512), // 512KB
                indexes: vec![
                    IndexInfo {
                        name: "_id_".to_string(),
                        columns: vec!["_id".to_string()],
                        unique: true,
                        index_type: "btree".to_string(),
                    },
                    IndexInfo {
                        name: "email_1".to_string(),
                        columns: vec!["email".to_string()],
                        unique: true,
                        index_type: "btree".to_string(),
                    },
                ],
            },
            MongoCollectionNode {
                name: "products".to_string(),
                document_count: Some(800),
                size: Some(1024 * 256), // 256KB
                indexes: vec![
                    IndexInfo {
                        name: "_id_".to_string(),
                        columns: vec!["_id".to_string()],
                        unique: true,
                        index_type: "btree".to_string(),
                    },
                ],
            },
        ],
        gridfs_buckets: vec![
            GridFSBucketNode {
                name: "uploads".to_string(),
                file_count: Some(42),
                total_size: Some(1024 * 1024 * 50), // 50MB
            },
        ],
    })
}