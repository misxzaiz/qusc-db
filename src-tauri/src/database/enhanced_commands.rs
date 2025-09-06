use crate::database::{
    enhanced_types::*,
    adapter::{DatabaseAdapterFactory, AdapterManager},
    QueryResult as LegacyQueryResult,
    TableInfo as LegacyTableInfo,
};
use tauri::State;
use tokio::sync::Mutex;
use std::collections::HashMap;
use uuid::Uuid;

/// 增强的应用状态，支持新的适配器系统
pub struct EnhancedAppState {
    /// 适配器管理器
    pub adapter_manager: Mutex<AdapterManager>,
    /// 连接配置缓存
    pub connection_configs: Mutex<HashMap<String, ConnectionConfig>>,
}

impl Default for EnhancedAppState {
    fn default() -> Self {
        Self {
            adapter_manager: Mutex::new(AdapterManager::new()),
            connection_configs: Mutex::new(HashMap::new()),
        }
    }
}

// ===== 增强的数据库连接命令 =====

/// 创建数据库连接（增强版）
#[tauri::command]
pub async fn create_connection(
    config: ConnectionConfig,
    state: State<'_, EnhancedAppState>,
) -> Result<String, String> {
    let connection_id = Uuid::new_v4().to_string();
    
    // 使用适配器管理器创建连接
    let mut adapter_manager = state.adapter_manager.lock().await;
    adapter_manager.create_connection(connection_id.clone(), &config).await
        .map_err(|e| format!("创建连接失败: {}", e))?;
    
    // 缓存连接配置
    state.connection_configs.lock().await
        .insert(connection_id.clone(), config);
    
    Ok(connection_id)
}

/// 测试数据库连接（增强版）
#[tauri::command]
pub async fn test_connection(
    config: ConnectionConfig,
) -> Result<bool, String> {
    DatabaseAdapterFactory::test_connection(&config).await
        .map_err(|e| format!("连接测试失败: {}", e))
}

/// 执行查询（增强版）- 返回增强的查询结果
#[tauri::command]
pub async fn execute_query_enhanced(
    connection_id: String,
    query: String,
    state: State<'_, EnhancedAppState>,
) -> Result<EnhancedQueryResult, String> {
    let adapter_manager = state.adapter_manager.lock().await;
    let adapter = adapter_manager.get_adapter(&connection_id)
        .ok_or("连接未找到")?;
    
    adapter.execute(&query).await
        .map_err(|e| format!("查询执行失败: {}", e))
}

/// 获取数据库模式信息（增强版）
#[tauri::command]
pub async fn get_database_schema_enhanced(
    connection_id: String,
    state: State<'_, EnhancedAppState>,
) -> Result<DatabaseSchema, String> {
    let adapter_manager = state.adapter_manager.lock().await;
    let adapter = adapter_manager.get_adapter(&connection_id)
        .ok_or("连接未找到")?;
    
    adapter.get_schema().await
        .map_err(|e| format!("获取数据库模式失败: {}", e))
}

/// 获取查询建议
#[tauri::command]
pub async fn get_query_suggestions(
    connection_id: String,
    context: String,
    state: State<'_, EnhancedAppState>,
) -> Result<Vec<QuerySuggestion>, String> {
    let adapter_manager = state.adapter_manager.lock().await;
    let adapter = adapter_manager.get_adapter(&connection_id)
        .ok_or("连接未找到")?;
    
    Ok(adapter.get_query_suggestions(&context))
}

/// 获取UI配置信息
#[tauri::command]
pub async fn get_ui_config(
    connection_id: String,
    state: State<'_, EnhancedAppState>,
) -> Result<DatabaseUIConfig, String> {
    let adapter_manager = state.adapter_manager.lock().await;
    let adapter = adapter_manager.get_adapter(&connection_id)
        .ok_or("连接未找到")?;
    
    Ok(adapter.get_ui_config())
}

/// 获取实时统计信息
#[tauri::command]
pub async fn get_real_time_stats(
    connection_id: String,
    state: State<'_, EnhancedAppState>,
) -> Result<Option<DatabaseStats>, String> {
    let adapter_manager = state.adapter_manager.lock().await;
    let adapter = adapter_manager.get_adapter(&connection_id)
        .ok_or("连接未找到")?;
    
    adapter.get_real_time_stats().await
        .map_err(|e| format!("获取统计信息失败: {}", e))
}

/// 断开连接（增强版）
#[tauri::command]
pub async fn disconnect(
    connection_id: String,
    state: State<'_, EnhancedAppState>,
) -> Result<(), String> {
    let mut adapter_manager = state.adapter_manager.lock().await;
    adapter_manager.remove_connection(&connection_id).await
        .map_err(|e| format!("断开连接失败: {}", e))?;
    
    // 清理连接配置缓存
    state.connection_configs.lock().await
        .remove(&connection_id);
    
    Ok(())
}

/// 获取连接列表
#[tauri::command]
pub async fn list_connections(
    state: State<'_, EnhancedAppState>,
) -> Result<Vec<ConnectionInfo>, String> {
    let adapter_manager = state.adapter_manager.lock().await;
    let connection_configs = state.connection_configs.lock().await;
    
    let mut connections = Vec::new();
    for connection_id in adapter_manager.get_connection_ids() {
        if let Some(config) = connection_configs.get(connection_id) {
            connections.push(ConnectionInfo {
                id: connection_id.clone(),
                db_type: config.db_type.clone(),
                host: config.host.clone(),
                port: config.port,
                database: config.database.clone(),
                is_connected: true, // 简化处理，实际应该检查连接状态
            });
        }
    }
    
    Ok(connections)
}

// ===== Redis 特定命令 =====

/// Redis：获取键信息
#[tauri::command]
pub async fn redis_get_key_info(
    connection_id: String,
    key: String,
    state: State<'_, EnhancedAppState>,
) -> Result<RedisEntry, String> {
    let adapter_manager = state.adapter_manager.lock().await;
    let adapter = adapter_manager.get_adapter(&connection_id)
        .ok_or("连接未找到")?;
    
    // 构造查询获取键信息
    let query = format!("TYPE {}", key);
    let result = adapter.execute(&query).await
        .map_err(|e| format!("获取键信息失败: {}", e))?;
    
    // 从结果中提取键信息（简化处理）
    Ok(RedisEntry {
        key,
        data_type: RedisDataType::String, // 简化处理
        value: RedisValue::String { value: "sample_value".to_string() },
        ttl: None,
        memory_usage: None,
        encoding: None,
    })
}

/// Redis：开始监控
#[tauri::command]
pub async fn redis_start_monitoring(
    connection_id: String,
    state: State<'_, EnhancedAppState>,
) -> Result<(), String> {
    // TODO: 实现Redis监控功能
    Ok(())
}

// ===== MongoDB 特定命令 =====

/// MongoDB：获取集合统计信息
#[tauri::command]
pub async fn mongodb_get_collection_stats(
    connection_id: String,
    collection_name: String,
    state: State<'_, EnhancedAppState>,
) -> Result<CollectionStats, String> {
    let adapter_manager = state.adapter_manager.lock().await;
    let adapter = adapter_manager.get_adapter(&connection_id)
        .ok_or("连接未找到")?;
    
    // 构造聚合查询获取统计信息
    let query = format!("db.{}.stats()", collection_name);
    let _result = adapter.execute(&query).await
        .map_err(|e| format!("获取集合统计失败: {}", e))?;
    
    // 简化返回示例数据
    Ok(CollectionStats {
        document_count: 1000,
        size: 1024000,
        storage_size: 2048000,
        average_document_size: 1024.0,
        indexes_size: 512000,
    })
}

/// MongoDB：构建聚合管道
#[tauri::command]
pub async fn mongodb_build_aggregation(
    connection_id: String,
    collection_name: String,
    pipeline: Vec<serde_json::Value>,
    state: State<'_, EnhancedAppState>,
) -> Result<EnhancedQueryResult, String> {
    let adapter_manager = state.adapter_manager.lock().await;
    let adapter = adapter_manager.get_adapter(&connection_id)
        .ok_or("连接未找到")?;
    
    // 构造聚合查询
    let pipeline_json = serde_json::to_string(&pipeline)
        .map_err(|e| format!("序列化管道失败: {}", e))?;
    let query = format!("db.{}.aggregate({})", collection_name, pipeline_json);
    
    adapter.execute(&query).await
        .map_err(|e| format!("执行聚合查询失败: {}", e))
}

// ===== 向后兼容的命令 =====

/// 向后兼容：连接数据库
#[tauri::command]
pub async fn connect_database(
    db_type: String,
    host: String,
    port: u16,
    username: Option<String>,
    password: Option<String>,
    database: Option<String>,
    state: State<'_, EnhancedAppState>,
) -> Result<String, String> {
    let config = ConnectionConfig {
        db_type: parse_database_type(&db_type)?,
        host,
        port,
        username,
        password,
        database,
        options: std::collections::HashMap::new(),
    };
    
    create_connection(config, state).await
}

/// 向后兼容：执行查询
#[tauri::command]
pub async fn execute_query(
    connection_id: String,
    query: String,
    state: State<'_, EnhancedAppState>,
) -> Result<LegacyQueryResult, String> {
    let enhanced_result = execute_query_enhanced(connection_id, query, state).await?;
    
    // 转换为旧格式以保持兼容性
    match enhanced_result.data {
        QueryData::Relational { columns, rows, affected_rows, .. } => {
            Ok(LegacyQueryResult {
                columns: columns.into_iter().map(|col| col.name).collect(),
                rows: rows.into_iter().map(|row| {
                    row.into_iter().map(|cell| cell.to_display_string()).collect()
                }).collect(),
                affected_rows,
                execution_time: enhanced_result.execution_time,
            })
        }
        _ => {
            // 其他类型暂时返回空结果
            Ok(LegacyQueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: 0,
                execution_time: enhanced_result.execution_time,
            })
        }
    }
}

/// 向后兼容：获取数据库结构
#[tauri::command]
pub async fn get_database_schema(
    connection_id: String,
    state: State<'_, EnhancedAppState>,
) -> Result<Vec<LegacyTableInfo>, String> {
    let enhanced_schema = get_database_schema_enhanced(connection_id, state).await?;
    
    // 转换为旧格式
    let table_infos = enhanced_schema.tables.into_iter().map(|table| {
        LegacyTableInfo {
            name: table.name,
            columns: table.columns.into_iter().map(|col| {
                crate::database::ColumnInfo {
                    name: col.name,
                    data_type: col.data_type,
                    nullable: col.nullable,
                    primary_key: col.primary_key,
                }
            }).collect(),
        }
    }).collect();
    
    Ok(table_infos)
}

// ===== 辅助函数 =====

/// 解析数据库类型字符串
fn parse_database_type(db_type: &str) -> Result<DatabaseType, String> {
    match db_type {
        "MySQL" => Ok(DatabaseType::MySQL),
        "PostgreSQL" => Ok(DatabaseType::PostgreSQL),
        "Redis" => Ok(DatabaseType::Redis),
        "MongoDB" => Ok(DatabaseType::MongoDB),
        "SQLite" => Ok(DatabaseType::SQLite),
        _ => Err(format!("不支持的数据库类型: {}", db_type)),
    }
}

/// 连接信息结构
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConnectionInfo {
    pub id: String,
    pub db_type: DatabaseType,
    pub host: String,
    pub port: u16,
    pub database: Option<String>,
    pub is_connected: bool,
}