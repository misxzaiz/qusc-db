use super::{DatabaseConnection, ConnectionConfig, QueryResult, TableInfo, ColumnInfo};
use mongodb::{Client, options::ClientOptions, Database, Collection, bson::{doc, Bson, Document}};
use futures::StreamExt;
use async_trait::async_trait;

pub struct MongoDBConnection {
    client: Option<Client>,
    database: Option<Database>,
    current_database: Option<String>,
}

impl MongoDBConnection {
    pub fn new() -> Self {
        Self {
            client: None,
            database: None,
            current_database: None,
        }
    }
    
    // 将RawBsonRef值转换为字符串的辅助函数
    fn raw_bson_to_string(value: mongodb::bson::RawBsonRef) -> String {
        if let Some(s) = value.as_str() {
            s.to_string()
        } else if let Some(i) = value.as_i32() {
            i.to_string()
        } else if let Some(i) = value.as_i64() {
            i.to_string()
        } else if let Some(f) = value.as_f64() {
            f.to_string()
        } else if let Some(b) = value.as_bool() {
            b.to_string()
        } else if value.as_null().is_some() {
            "null".to_string()
        } else {
            format!("{:?}", value)
        }
    }
    
    // 将BSON值转换为字符串的辅助函数
    fn bson_to_string(value: &Bson) -> String {
        match value {
            Bson::Double(v) => v.to_string(),
            Bson::String(v) => v.clone(),
            Bson::Array(arr) => {
                let items: Vec<String> = arr.iter().map(Self::bson_to_string).collect();
                format!("[{}]", items.join(", "))
            }
            Bson::Document(doc) => {
                match serde_json::to_string(doc) {
                    Ok(json_str) => json_str,
                    Err(_) => format!("{:?}", doc),
                }
            }
            Bson::Boolean(v) => v.to_string(),
            Bson::Null => "null".to_string(),
            Bson::Int32(v) => v.to_string(),
            Bson::Int64(v) => v.to_string(),
            Bson::Timestamp(ts) => format!("Timestamp({}, {})", ts.time, ts.increment),
            Bson::ObjectId(oid) => oid.to_hex(),
            Bson::DateTime(dt) => dt.to_string(),
            Bson::Binary(bin) => format!("Binary({} bytes)", bin.bytes.len()),
            Bson::RegularExpression(regex) => format!("/{}/{}", regex.pattern, regex.options),
            Bson::JavaScriptCode(code) => format!("JavaScript: {}", code),
            Bson::JavaScriptCodeWithScope(code) => format!("JavaScript with scope: {}", code.code),
            Bson::Decimal128(dec) => dec.to_string(),
            Bson::Symbol(sym) => format!("Symbol: {}", sym),
            Bson::Undefined => "undefined".to_string(),
            Bson::MaxKey => "MaxKey".to_string(),
            Bson::MinKey => "MinKey".to_string(),
            Bson::DbPointer(ptr) => format!("DBPointer: {:?}", ptr),
        }
    }

    // 解析MongoDB命令/查询
    fn parse_mongodb_query(&self, query: &str) -> anyhow::Result<MongoOperation> {
        let trimmed = query.trim();
        
        // 检查是否是MongoDB Shell风格的命令
        if trimmed.starts_with("db.") {
            let parts: Vec<&str> = trimmed.split('.').collect();
            if parts.len() >= 3 {
                let collection_name = parts[1];
                let operation = parts[2];
                
                if operation.starts_with("find(") {
                    let filter_str = operation.strip_prefix("find(")
                        .and_then(|s| s.strip_suffix(")"))
                        .unwrap_or("{}");
                    
                    let filter: Document = if filter_str.trim() == "{}" || filter_str.trim().is_empty() {
                        doc! {}
                    } else {
                        // 简化JSON解析，如果失败就使用空过滤器
                        match serde_json::from_str::<serde_json::Value>(filter_str) {
                            Ok(json_val) => {
                                match bson::to_document(&json_val) {
                                    Ok(doc) => doc,
                                    Err(_) => doc! {}
                                }
                            },
                            Err(_) => doc! {}
                        }
                    };
                    
                    return Ok(MongoOperation::Find {
                        collection: collection_name.to_string(),
                        filter,
                        limit: Some(100), // 默认限制
                    });
                } else if operation.starts_with("insertOne(") {
                    let doc_str = operation.strip_prefix("insertOne(")
                        .and_then(|s| s.strip_suffix(")"))
                        .unwrap_or("{}");
                    
                    let document: Document = serde_json::from_str(doc_str)
                        .map_err(|e| anyhow::anyhow!("无效的文档格式: {}", e))?;
                    
                    return Ok(MongoOperation::InsertOne {
                        collection: collection_name.to_string(),
                        document,
                    });
                } else if operation.starts_with("updateOne(") || operation.starts_with("updateMany(") {
                    // 简化处理更新操作
                    return Ok(MongoOperation::Update {
                        collection: collection_name.to_string(),
                        filter: doc! {},
                        update: doc! {},
                        many: operation.starts_with("updateMany"),
                    });
                } else if operation.starts_with("deleteOne(") || operation.starts_with("deleteMany(") {
                    return Ok(MongoOperation::Delete {
                        collection: collection_name.to_string(),
                        filter: doc! {},
                        many: operation.starts_with("deleteMany"),
                    });
                }
            }
        }
        
        // 如果不是标准的MongoDB命令，尝试作为JSON解析
        if trimmed.starts_with('{') && trimmed.ends_with('}') {
            let filter: Document = serde_json::from_str(trimmed)
                .map_err(|e| anyhow::anyhow!("无效的JSON查询: {}", e))?;
            
            return Ok(MongoOperation::Find {
                collection: "default".to_string(),
                filter,
                limit: Some(100),
            });
        }
        
        Err(anyhow::anyhow!("不支持的MongoDB操作: {}", query))
    }
}

// MongoDB操作枚举
#[derive(Debug)]
enum MongoOperation {
    Find {
        collection: String,
        filter: Document,
        limit: Option<i64>,
    },
    InsertOne {
        collection: String,
        document: Document,
    },
    Update {
        collection: String,
        filter: Document,
        update: Document,
        many: bool,
    },
    Delete {
        collection: String,
        filter: Document,
        many: bool,
    },
}

#[async_trait]
impl DatabaseConnection for MongoDBConnection {
    async fn connect(&mut self, config: &ConnectionConfig) -> anyhow::Result<()> {
        use tracing::{info, error, debug};
        
        info!("正在连接MongoDB数据库 - 主机: {}, 端口: {}", config.host, config.port);

        // 构建MongoDB连接字符串
        let mut uri = if let Some(username) = &config.username {
            if let Some(password) = &config.password {
                format!("mongodb://{}:{}@{}:{}", username, password, config.host, config.port)
            } else {
                format!("mongodb://{}@{}:{}", username, config.host, config.port)
            }
        } else {
            format!("mongodb://{}:{}", config.host, config.port)
        };
        
        // 添加认证数据库（如果指定）
        if let Some(auth_db) = config.options.get("authSource") {
            uri = format!("{}?authSource={}", uri, auth_db);
        }
        
        debug!("MongoDB连接URI: {}", uri.replace(config.password.as_ref().unwrap_or(&"".to_string()).as_str(), "***"));

        let client_options = ClientOptions::parse(&uri).await
            .map_err(|e| {
                error!("MongoDB连接选项解析失败: {}", e);
                anyhow::anyhow!("MongoDB连接选项解析失败: {}", e)
            })?;

        let client = Client::with_options(client_options)
            .map_err(|e| {
                error!("MongoDB客户端创建失败: {}", e);
                anyhow::anyhow!("MongoDB客户端创建失败: {}", e)
            })?;

        // 测试连接
        client.list_database_names(None, None).await
            .map_err(|e| {
                error!("MongoDB连接测试失败: {}", e);
                anyhow::anyhow!("MongoDB连接失败: {}. 请检查: 1) MongoDB服务是否启动 2) 连接参数是否正确 3) 网络连接是否正常", e)
            })?;

        info!("MongoDB连接建立成功");

        self.client = Some(client);
        self.current_database = config.database.clone();
        
        // 如果指定了数据库，设置默认数据库
        if let Some(db_name) = &config.database {
            if let Some(client) = &self.client {
                self.database = Some(client.database(db_name));
            }
        }

        Ok(())
    }

    async fn disconnect(&mut self) -> anyhow::Result<()> {
        self.client = None;
        self.database = None;
        self.current_database = None;
        Ok(())
    }

    async fn execute(&self, query: &str) -> anyhow::Result<QueryResult> {
        let _client = self.client.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        let start = std::time::Instant::now();
        
        // 解析MongoDB操作
        let operation = self.parse_mongodb_query(query)?;
        
        match operation {
            MongoOperation::Find { collection, filter, limit } => {
                let db = self.database.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("未选择数据库"))?;
                
                let coll: Collection<Document> = db.collection(&collection);
                
                let find_options = if let Some(limit_val) = limit {
                    mongodb::options::FindOptions::builder()
                        .limit(limit_val)
                        .build()
                } else {
                    mongodb::options::FindOptions::default()
                };
                
                let cursor = coll.find(filter, find_options).await?;
                let documents: Vec<Document> = cursor.collect::<Vec<_>>().await
                    .into_iter()
                    .collect::<Result<Vec<_>, _>>()?;
                
                // 转换为表格格式  
                let mut all_keys = std::collections::HashSet::new();
                for doc in &documents {
                    for key in doc.keys() {
                        all_keys.insert(key.clone());
                    }
                }
                
                let mut columns: Vec<String> = all_keys.into_iter().collect();
                columns.sort();
                
                let rows: Vec<Vec<String>> = documents.iter()
                    .map(|doc| {
                        columns.iter()
                            .map(|col| {
                                match doc.get(col) {
                                    Some(value) => Self::bson_to_string(value),
                                    None => "null".to_string(),
                                }
                            })
                            .collect()
                    })
                    .collect();
                
                Ok(QueryResult {
                    columns,
                    rows,
                    affected_rows: 0,
                    execution_time: start.elapsed().as_millis() as u64,
                })
            }
            MongoOperation::InsertOne { collection, document } => {
                let db = self.database.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("未选择数据库"))?;
                
                let coll: Collection<Document> = db.collection(&collection);
                let result = coll.insert_one(document, None).await?;
                
                Ok(QueryResult {
                    columns: vec!["inserted_id".to_string()],
                    rows: vec![vec![result.inserted_id.to_string()]],
                    affected_rows: 1,
                    execution_time: start.elapsed().as_millis() as u64,
                })
            }
            MongoOperation::Update { collection, filter, update, many } => {
                let db = self.database.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("未选择数据库"))?;
                
                let coll: Collection<Document> = db.collection(&collection);
                let result = if many {
                    coll.update_many(filter, update, None).await?
                } else {
                    coll.update_one(filter, update, None).await?
                };
                
                Ok(QueryResult {
                    columns: vec!["matched_count".to_string(), "modified_count".to_string()],
                    rows: vec![vec![result.matched_count.to_string(), result.modified_count.to_string()]],
                    affected_rows: result.modified_count,
                    execution_time: start.elapsed().as_millis() as u64,
                })
            }
            MongoOperation::Delete { collection, filter, many } => {
                let db = self.database.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("未选择数据库"))?;
                
                let coll: Collection<Document> = db.collection(&collection);
                let result = if many {
                    coll.delete_many(filter, None).await?
                } else {
                    coll.delete_one(filter, None).await?
                };
                
                Ok(QueryResult {
                    columns: vec!["deleted_count".to_string()],
                    rows: vec![vec![result.deleted_count.to_string()]],
                    affected_rows: result.deleted_count,
                    execution_time: start.elapsed().as_millis() as u64,
                })
            }
        }
    }

    async fn get_schema(&self) -> anyhow::Result<Vec<TableInfo>> {
        let _client = self.client.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
            
        // 如果没有选择数据库，返回数据库列表
        if self.current_database.is_none() {
            let databases = self.get_databases().await?;
            let mut table_infos = Vec::new();
            
            for db_name in databases {
                // 跳过系统数据库
                if db_name == "admin" || db_name == "local" || db_name == "config" {
                    continue;
                }
                
                table_infos.push(TableInfo {
                    name: format!("{}", db_name),
                    columns: vec![
                        ColumnInfo {
                            name: "database".to_string(),
                            data_type: "DATABASE".to_string(),
                            nullable: false,
                            primary_key: false,
                        }
                    ],
                });
            }
            
            return Ok(table_infos);
        }
        
        // 获取集合信息
        let db = self.database.as_ref()
            .ok_or_else(|| anyhow::anyhow!("未选择数据库"))?;
        
        let collection_names = db.list_collection_names(None).await?;
        
        let mut table_infos = Vec::new();
        for collection_name in collection_names {
            // 为每个集合创建基本的"表"信息
            table_infos.push(TableInfo {
                name: collection_name,
                columns: vec![
                    ColumnInfo {
                        name: "_id".to_string(),
                        data_type: "ObjectId".to_string(),
                        nullable: false,
                        primary_key: true,
                    },
                    ColumnInfo {
                        name: "document".to_string(),
                        data_type: "Document".to_string(),
                        nullable: false,
                        primary_key: false,
                    },
                ],
            });
        }
        
        Ok(table_infos)
    }

    async fn get_databases(&self) -> anyhow::Result<Vec<String>> {
        let client = self.client.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        let db_names = client.list_database_names(None, None).await?;
        Ok(db_names)
    }
    
    async fn use_database(&mut self, database_name: &str) -> anyhow::Result<()> {
        let client = self.client.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        self.database = Some(client.database(database_name));
        self.current_database = Some(database_name.to_string());
        
        Ok(())
    }

    fn is_connected(&self) -> bool {
        self.client.is_some()
    }
}