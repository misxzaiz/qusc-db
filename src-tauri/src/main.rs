// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod ai;
mod commands;
mod mcp;

use commands::*;
use tauri::Manager;
use tracing::info;
use tracing_subscriber;

#[tokio::main]
async fn main() {
    // 初始化日志
    tracing_subscriber::fmt::init();
    
    info!("Starting QuSC-DB application");

    let context = tauri::generate_context!();
    
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            connect_database,
            execute_query,
            get_database_schema,
            test_database_connection,
            disconnect_database,
            configure_ai_service,
            ai_generate_sql,
            ai_optimize_sql,
            ai_explain_error,
            ai_explain_query,
            get_connection_status,
            get_databases,
            get_databases_2,
            use_database,
            list_active_connections,
            get_database_tables,
            preload_table_info,
            mcp_initialize,
            mcp_get_enhanced_context,
            mcp_validate_sql,
            mcp_execute_smart_query,
            mcp_list_tools,
            mcp_health_check,
            // 增强版命令
            execute_query_enhanced,
            get_ui_config,
            get_query_suggestions,
            // 新增的数据库结构导航API
            get_database_structure,
            get_redis_structure,
            get_mongodb_structure
        ])
        .setup(|app| {
            info!("Application setup completed");
            
            // 在这里可以添加初始化逻辑
            let _window = app.get_webview_window("main").unwrap();
            
            #[cfg(debug_assertions)]
            {
                _window.open_devtools();
            }
            
            Ok(())
        })
        .run(context)
        .expect("error while running tauri application");
}