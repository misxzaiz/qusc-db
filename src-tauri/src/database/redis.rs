use super::{DatabaseConnection, ConnectionConfig, QueryResult, TableInfo, ColumnInfo};
use redis::{Client, Connection, Commands, RedisResult};
use async_trait::async_trait;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct RedisConnection {
    client: Option<Client>,
    connection: Option<Arc<Mutex<Connection>>>,
    current_database: i64, // 添加当前数据库索引
}

impl RedisConnection {
    pub fn new() -> Self {
        Self {
            client: None,
            connection: None,
            current_database: 0, // Redis默认使用0号数据库
        }
    }
}

#[async_trait]
impl DatabaseConnection for RedisConnection {
    async fn connect(&mut self, config: &ConnectionConfig) -> anyhow::Result<()> {
        let url = if let Some(password) = &config.password {
            format!("redis://:{}@{}:{}", password, config.host, config.port)
        } else {
            format!("redis://{}:{}", config.host, config.port)
        };
        
        let client = Client::open(url)?;
        let mut connection = client.get_connection()?;
        
        // 如果配置中指定了数据库，则选择该数据库
        if let Some(database) = &config.database {
            if let Ok(db_index) = database.parse::<i64>() {
                if db_index >= 0 && db_index <= 15 {
                    let _: RedisResult<()> = redis::cmd("SELECT").arg(db_index).query(&mut connection);
                    self.current_database = db_index;
                }
            }
        }
        
        self.client = Some(client);
        self.connection = Some(Arc::new(Mutex::new(connection)));
        
        Ok(())
    }

    async fn disconnect(&mut self) -> anyhow::Result<()> {
        self.connection = None;
        self.client = None;
        self.current_database = 0;
        Ok(())
    }

    async fn execute(&self, command: &str) -> anyhow::Result<QueryResult> {
        let conn_arc = self.connection.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        let mut conn = conn_arc.lock().await;
        let start = std::time::Instant::now();
        
        // 解析 Redis 命令
        let parts: Vec<&str> = command.split_whitespace().collect();
        if parts.is_empty() {
            return Err(anyhow::anyhow!("Empty command"));
        }
        
        let result = match parts[0].to_uppercase().as_str() {
            "SELECT" => {
                // 处理 SELECT 命令
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("SELECT command requires a database number"));
                }
                let db_index: i64 = parts[1].parse()
                    .map_err(|_| anyhow::anyhow!("Invalid database number"))?;
                
                if db_index < 0 || db_index > 15 {
                    return Err(anyhow::anyhow!("Database number must be between 0 and 15"));
                }
                
                let _: RedisResult<()> = redis::cmd("SELECT").arg(db_index).query(&mut *conn);
                vec![vec![format!("OK (switched to database {}) ", db_index)]]
            }
            "GET" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("GET command requires a key"));
                }
                let value: RedisResult<String> = conn.get(parts[1]);
                match value {
                    Ok(v) => vec![vec![v]],
                    Err(_) => vec![vec!["(nil)".to_string()]],
                }
            }
            "SET" => {
                if parts.len() < 3 {
                    return Err(anyhow::anyhow!("SET command requires key and value"));
                }
                let _: RedisResult<()> = conn.set(parts[1], parts[2]);
                vec![vec!["OK".to_string()]]
            }
            "KEYS" => {
                let pattern = if parts.len() > 1 { parts[1] } else { "*" };
                let keys: RedisResult<Vec<String>> = conn.keys(pattern);
                match keys {
                    Ok(key_list) => key_list.into_iter().map(|k| vec![k]).collect(),
                    Err(_) => vec![],
                }
            }
            "DEL" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("DEL command requires a key"));
                }
                let count: RedisResult<i32> = conn.del(parts[1]);
                match count {
                    Ok(c) => vec![vec![c.to_string()]],
                    Err(_) => vec![vec!["0".to_string()]],
                }
            }
            "HGET" => {
                if parts.len() < 3 {
                    return Err(anyhow::anyhow!("HGET command requires hash key and field"));
                }
                let value: RedisResult<String> = conn.hget(parts[1], parts[2]);
                match value {
                    Ok(v) => vec![vec![v]],
                    Err(_) => vec![vec!["(nil)".to_string()]],
                }
            }
            "HSET" => {
                if parts.len() < 4 {
                    return Err(anyhow::anyhow!("HSET command requires hash key, field, and value"));
                }
                let _: RedisResult<i32> = conn.hset(parts[1], parts[2], parts[3]);
                vec![vec!["1".to_string()]]
            }
            "HGETALL" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("HGETALL command requires a hash key"));
                }
                let hash: RedisResult<Vec<String>> = conn.hgetall(parts[1]);
                match hash {
                    Ok(fields) => {
                        let mut rows = Vec::new();
                        for chunk in fields.chunks(2) {
                            if chunk.len() == 2 {
                                rows.push(vec![chunk[0].clone(), chunk[1].clone()]);
                            }
                        }
                        rows
                    }
                    Err(_) => vec![],
                }
            }
            "LLEN" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("LLEN command requires a list key"));
                }
                let len: RedisResult<i32> = conn.llen(parts[1]);
                match len {
                    Ok(l) => vec![vec![l.to_string()]],
                    Err(_) => vec![vec!["0".to_string()]],
                }
            }
            "LRANGE" => {
                if parts.len() < 4 {
                    return Err(anyhow::anyhow!("LRANGE command requires key, start, and stop"));
                }
                let start: i32 = parts[2].parse().unwrap_or(0);
                let stop: i32 = parts[3].parse().unwrap_or(-1);
                let list: RedisResult<Vec<String>> = conn.lrange(parts[1], start.try_into().unwrap(), stop.try_into().unwrap());
                match list {
                    Ok(items) => items.into_iter().map(|item| vec![item]).collect(),
                    Err(_) => vec![],
                }
            }
            "LPUSH" => {
                if parts.len() < 3 {
                    return Err(anyhow::anyhow!("LPUSH command requires key and values"));
                }
                let mut cmd = redis::cmd("LPUSH");
                cmd.arg(parts[1]);
                for value in &parts[2..] {
                    cmd.arg(*value);
                }
                let count: RedisResult<i32> = cmd.query(&mut *conn);
                match count {
                    Ok(c) => vec![vec![c.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("LPUSH failed: {}", e)),
                }
            }
            "RPUSH" => {
                if parts.len() < 3 {
                    return Err(anyhow::anyhow!("RPUSH command requires key and values"));
                }
                let mut cmd = redis::cmd("RPUSH");
                cmd.arg(parts[1]);
                for value in &parts[2..] {
                    cmd.arg(*value);
                }
                let count: RedisResult<i32> = cmd.query(&mut *conn);
                match count {
                    Ok(c) => vec![vec![c.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("RPUSH failed: {}", e)),
                }
            }
            "LPOP" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("LPOP command requires a key"));
                }
                let value: RedisResult<String> = conn.lpop(parts[1], None);
                match value {
                    Ok(v) => vec![vec![v]],
                    Err(_) => vec![vec!["(nil)".to_string()]],
                }
            }
            "RPOP" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("RPOP command requires a key"));
                }
                let value: RedisResult<String> = conn.rpop(parts[1], None);
                match value {
                    Ok(v) => vec![vec![v]],
                    Err(_) => vec![vec!["(nil)".to_string()]],
                }
            }
            "SADD" => {
                if parts.len() < 3 {
                    return Err(anyhow::anyhow!("SADD command requires key and members"));
                }
                let mut cmd = redis::cmd("SADD");
                cmd.arg(parts[1]);
                for member in &parts[2..] {
                    cmd.arg(*member);
                }
                let count: RedisResult<i32> = cmd.query(&mut *conn);
                match count {
                    Ok(c) => vec![vec![c.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("SADD failed: {}", e)),
                }
            }
            "SMEMBERS" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("SMEMBERS command requires a key"));
                }
                let members: RedisResult<Vec<String>> = conn.smembers(parts[1]);
                match members {
                    Ok(member_list) => member_list.into_iter().map(|m| vec![m]).collect(),
                    Err(_) => vec![],
                }
            }
            "SREM" => {
                if parts.len() < 3 {
                    return Err(anyhow::anyhow!("SREM command requires key and members"));
                }
                let mut cmd = redis::cmd("SREM");
                cmd.arg(parts[1]);
                for member in &parts[2..] {
                    cmd.arg(*member);
                }
                let count: RedisResult<i32> = cmd.query(&mut *conn);
                match count {
                    Ok(c) => vec![vec![c.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("SREM failed: {}", e)),
                }
            }
            "ZADD" => {
                if parts.len() < 4 {
                    return Err(anyhow::anyhow!("ZADD command requires key, score, and member"));
                }
                let score: f64 = parts[2].parse()
                    .map_err(|_| anyhow::anyhow!("Invalid score for ZADD"))?;
                let count: RedisResult<i32> = conn.zadd(parts[1], parts[3], score);
                match count {
                    Ok(c) => vec![vec![c.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("ZADD failed: {}", e)),
                }
            }
            "ZRANGE" => {
                if parts.len() < 4 {
                    return Err(anyhow::anyhow!("ZRANGE command requires key, start, and stop"));
                }
                let start: i32 = parts[2].parse().unwrap_or(0);
                let stop: i32 = parts[3].parse().unwrap_or(-1);
                let members: RedisResult<Vec<String>> = conn.zrange(parts[1], start.try_into().unwrap(), stop.try_into().unwrap());
                match members {
                    Ok(member_list) => member_list.into_iter().map(|m| vec![m]).collect(),
                    Err(_) => vec![],
                }
            }
            "EXISTS" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("EXISTS command requires keys"));
                }
                let mut cmd = redis::cmd("EXISTS");
                for key in &parts[1..] {
                    cmd.arg(*key);
                }
                let count: RedisResult<i32> = cmd.query(&mut *conn);
                match count {
                    Ok(c) => vec![vec![c.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("EXISTS failed: {}", e)),
                }
            }
            "TTL" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("TTL command requires a key"));
                }
                let ttl: RedisResult<i32> = conn.ttl(parts[1]);
                match ttl {
                    Ok(t) => vec![vec![t.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("TTL failed: {}", e)),
                }
            }
            "EXPIRE" => {
                if parts.len() < 3 {
                    return Err(anyhow::anyhow!("EXPIRE command requires key and seconds"));
                }
                let seconds: i32 = parts[2].parse()
                    .map_err(|_| anyhow::anyhow!("Invalid seconds for EXPIRE"))?;
                let success: RedisResult<i32> = conn.expire(parts[1], seconds.try_into().unwrap());
                match success {
                    Ok(s) => vec![vec![s.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("EXPIRE failed: {}", e)),
                }
            }
            "TYPE" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("TYPE command requires a key"));
                }
                let key_type: RedisResult<String> = redis::cmd("TYPE").arg(parts[1]).query(&mut *conn);
                match key_type {
                    Ok(t) => vec![vec![t]],
                    Err(e) => return Err(anyhow::anyhow!("TYPE failed: {}", e)),
                }
            }
            "INCR" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("INCR command requires a key"));
                }
                let value: RedisResult<i64> = conn.incr(parts[1], 1);
                match value {
                    Ok(v) => vec![vec![v.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("INCR failed: {}", e)),
                }
            }
            "DECR" => {
                if parts.len() < 2 {
                    return Err(anyhow::anyhow!("DECR command requires a key"));
                }
                let value: RedisResult<i64> = conn.decr(parts[1], 1);
                match value {
                    Ok(v) => vec![vec![v.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("DECR failed: {}", e)),
                }
            }
            "INCRBY" => {
                if parts.len() < 3 {
                    return Err(anyhow::anyhow!("INCRBY command requires key and increment"));
                }
                let increment: i64 = parts[2].parse()
                    .map_err(|_| anyhow::anyhow!("Invalid increment for INCRBY"))?;
                let value: RedisResult<i64> = conn.incr(parts[1], increment);
                match value {
                    Ok(v) => vec![vec![v.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("INCRBY failed: {}", e)),
                }
            }
            "DECRBY" => {
                if parts.len() < 3 {
                    return Err(anyhow::anyhow!("DECRBY command requires key and decrement"));
                }
                let decrement: i64 = parts[2].parse()
                    .map_err(|_| anyhow::anyhow!("Invalid decrement for DECRBY"))?;
                let value: RedisResult<i64> = conn.decr(parts[1], decrement);
                match value {
                    Ok(v) => vec![vec![v.to_string()]],
                    Err(e) => return Err(anyhow::anyhow!("DECRBY failed: {}", e)),
                }
            }
            "FLUSHDB" => {
                let _: RedisResult<()> = redis::cmd("FLUSHDB").query(&mut *conn);
                vec![vec!["OK".to_string()]]
            }
            "FLUSHALL" => {
                let _: RedisResult<()> = redis::cmd("FLUSHALL").query(&mut *conn);
                vec![vec!["OK".to_string()]]
            }
            "PING" => {
                let response: RedisResult<String> = redis::cmd("PING").query(&mut *conn);
                match response {
                    Ok(r) => vec![vec![r]],
                    Err(_) => vec![vec!["PONG".to_string()]],
                }
            }
            "INFO" => {
                let section = if parts.len() > 1 { Some(parts[1]) } else { None };
                let mut cmd = redis::cmd("INFO");
                if let Some(s) = section {
                    cmd.arg(s);
                }
                let info: RedisResult<String> = cmd.query(&mut *conn);
                match info {
                    Ok(info_str) => info_str.lines()
                        .filter(|line| !line.is_empty() && !line.starts_with('#'))
                        .map(|line| vec![line.to_string()])
                        .collect(),
                    Err(_) => vec![],
                }
            }
            _ => {
                return Err(anyhow::anyhow!("Unsupported Redis command: {}", parts[0]));
            }
        };
        
        let columns = match parts[0].to_uppercase().as_str() {
            "HGETALL" => vec!["Field".to_string(), "Value".to_string()],
            "KEYS" | "LRANGE" | "SMEMBERS" | "ZRANGE" => vec!["Key".to_string()],
            "INFO" => vec!["Info".to_string()],
            "LPUSH" | "RPUSH" | "SADD" | "ZADD" | "EXISTS" | "SREM" => vec!["Count".to_string()],
            "TTL" | "EXPIRE" | "INCR" | "DECR" | "INCRBY" | "DECRBY" => vec!["Value".to_string()],
            "TYPE" | "PING" => vec!["Result".to_string()],
            _ => vec!["Value".to_string()],
        };
        
        Ok(QueryResult {
            columns,
            rows: result,
            affected_rows: 1,
            execution_time: start.elapsed().as_millis() as u64,
        })
    }

    async fn get_schema(&self) -> anyhow::Result<Vec<TableInfo>> {
        let conn_arc = self.connection.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        let mut conn = conn_arc.lock().await;
        
        // Redis 没有传统的表结构，返回数据库信息
        let info: RedisResult<String> = redis::cmd("INFO").query(&mut *conn);
        let _db_info = match info {
            Ok(info_str) => info_str,
            Err(_) => "No info available".to_string(),
        };
        
        Ok(vec![TableInfo {
            name: "Redis Database".to_string(),
            columns: vec![
                ColumnInfo {
                    name: "Key".to_string(),
                    data_type: "String".to_string(),
                    nullable: false,
                    primary_key: true,
                },
                ColumnInfo {
                    name: "Type".to_string(),
                    data_type: "String".to_string(),
                    nullable: false,
                    primary_key: false,
                },
                ColumnInfo {
                    name: "Value".to_string(),
                    data_type: "Any".to_string(),
                    nullable: true,
                    primary_key: false,
                },
            ],
        }])
    }

    async fn get_databases(&self) -> anyhow::Result<Vec<String>> { 
        // Redis有16个数据库，编号0-15
        Ok((0..16).map(|i| i.to_string()).collect())
    }

    async fn use_database(&mut self, database_name: &str) -> anyhow::Result<()> {
        let db_index: i64 = database_name.parse()
            .map_err(|_| anyhow::anyhow!("Invalid Redis database number"))?;
        
        if db_index < 0 || db_index > 15 {
            return Err(anyhow::anyhow!("Redis database number must be between 0 and 15"));
        }
        
        let conn_arc = self.connection.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected"))?;
        
        let mut conn = conn_arc.lock().await;
        let _: RedisResult<()> = redis::cmd("SELECT").arg(db_index).query(&mut *conn);
        self.current_database = db_index;
        Ok(())
    }

    fn is_connected(&self) -> bool {
        self.connection.is_some()
    }
}