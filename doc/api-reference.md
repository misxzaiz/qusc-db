# API 文档

## 📋 概述

本文档描述了 QuSC-DB 重构后的核心 API 接口，包括 Rust 后端的 Tauri 命令和前端的组件接口。

## 🔧 后端 API (Tauri Commands)

### 数据库连接管理

#### `create_connection`
创建新的数据库连接

```rust
#[tauri::command]
async fn create_connection(
    config: ConnectionConfig,
    state: tauri::State<'_, AppState>,
) -> Result<String, String>
```

**参数**:
- `config`: 连接配置信息

**返回**: 连接ID字符串

**示例**:
```javascript
const connectionId = await invoke('create_connection', {
  config: {
    db_type: 'MySQL',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'password',
    database: 'test',
    options: {}
  }
});
```

#### `test_connection`
测试数据库连接

```rust
#[tauri::command]
async fn test_connection(
    config: ConnectionConfig,
) -> Result<bool, String>
```

#### `disconnect`
断开数据库连接

```rust
#[tauri::command]
async fn disconnect(
    connection_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String>
```

### 查询执行

#### `execute_query`
执行数据库查询

```rust
#[tauri::command]
async fn execute_query(
    connection_id: String,
    query: String,
    state: tauri::State<'_, AppState>,
) -> Result<EnhancedQueryResult, String>
```

**参数**:
- `connection_id`: 连接ID
- `query`: 查询字符串

**返回**: 增强的查询结果

**响应结构**:
```json
{
  "db_type": "MySQL",
  "data": {
    "type": "Relational",
    "columns": [
      {
        "name": "id",
        "data_type": "Integer",
        "nullable": false,
        "primary_key": true
      }
    ],
    "rows": [
      [{"Integer": 1}, {"String": "Alice"}]
    ],
    "total_rows": 100,
    "affected_rows": 0
  },
  "metadata": {
    "query": "SELECT * FROM users",
    "timestamp": "2024-09-06T10:00:00Z"
  },
  "execution_time": 150,
  "ui_config": {
    "display_mode": "Table",
    "supported_operations": ["Select", "Insert", "Update", "Delete"],
    "editor_config": {
      "language": "sql",
      "auto_complete": true,
      "syntax_highlighting": true
    },
    "export_formats": ["CSV", "Excel", "JSON"]
  }
}
```

#### `get_query_suggestions`
获取查询建议

```rust
#[tauri::command]
async fn get_query_suggestions(
    connection_id: String,
    context: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<QuerySuggestion>, String>
```

### 模式信息

#### `get_database_schema`
获取数据库模式信息

```rust
#[tauri::command]
async fn get_database_schema(
    connection_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<DatabaseSchema, String>
```

**响应结构**:
```json
{
  "database_name": "test_db",
  "tables": [
    {
      "name": "users",
      "columns": [
        {
          "name": "id",
          "data_type": "INTEGER",
          "nullable": false,
          "primary_key": true
        }
      ]
    }
  ]
}
```

#### `get_databases`
获取数据库列表

```rust
#[tauri::command]
async fn get_databases(
    connection_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String>
```

### Redis 特定命令

#### `redis_get_key_info`
获取 Redis 键的详细信息

```rust
#[tauri::command]
async fn redis_get_key_info(
    connection_id: String,
    key: String,
    state: tauri::State<'_, AppState>,
) -> Result<RedisKeyInfo, String>
```

#### `redis_start_monitoring`
开始 Redis 监控

```rust
#[tauri::command]
async fn redis_start_monitoring(
    connection_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String>
```

### MongoDB 特定命令

#### `mongodb_get_collection_stats`
获取 MongoDB 集合统计信息

```rust
#[tauri::command]
async fn mongodb_get_collection_stats(
    connection_id: String,
    collection_name: String,
    state: tauri::State<'_, AppState>,
) -> Result<CollectionStats, String>
```

#### `mongodb_build_aggregation`
构建聚合管道

```rust
#[tauri::command]
async fn mongodb_build_aggregation(
    connection_id: String,
    collection_name: String,
    pipeline: Vec<serde_json::Value>,
    state: tauri::State<'_, AppState>,
) -> Result<EnhancedQueryResult, String>
```

## 🎨 前端组件 API

### DatabaseResultViewer

主要的结果展示组件，自动根据数据库类型选择合适的渲染器。

```vue
<DatabaseResultViewer
  :result="queryResult"
  :loading="isLoading"
  @operation="handleOperation"
  @export="handleExport"
  @retry="handleRetry"
/>
```

**Props**:
- `result`: `EnhancedQueryResult` - 查询结果对象
- `loading`: `boolean` - 加载状态

**Events**:
- `operation`: 用户操作事件
- `export`: 导出请求事件
- `retry`: 重试查询事件

### RelationalTableRenderer

关系型数据库表格渲染器。

```vue
<RelationalTableRenderer
  :result="result"
  :config="uiConfig"
  @sort="handleSort"
  @filter="handleFilter"
  @edit-cell="handleCellEdit"
/>
```

**Props**:
- `result`: `QueryData.Relational` - 关系型查询结果
- `config`: `DatabaseUIConfig` - UI配置

**Events**:
- `sort`: 排序事件 `{ column: string, direction: 'asc' | 'desc' }`
- `filter`: 筛选事件 `{ column: string, value: string }`
- `edit-cell`: 单元格编辑事件

### RedisKeyValueRenderer

Redis 键值对渲染器。

```vue
<RedisKeyValueRenderer
  :result="result"
  :config="uiConfig"
  @key-select="handleKeySelect"
  @monitor-start="handleMonitorStart"
  @ttl-manage="handleTTLManage"
/>
```

**Props**:
- `result`: `QueryData.KeyValue` - Redis 查询结果
- `config`: `DatabaseUIConfig` - UI配置

**Events**:
- `key-select`: 键选择事件 `{ key: string }`
- `monitor-start`: 开始监控事件
- `ttl-manage`: TTL管理事件 `{ key: string, ttl: number }`

### MongoDocumentRenderer

MongoDB 文档渲染器。

```vue
<MongoDocumentRenderer
  :result="result"
  :config="uiConfig"
  @document-edit="handleDocumentEdit"
  @aggregate="handleAggregate"
  @schema-validate="handleSchemaValidate"
/>
```

**Props**:
- `result`: `QueryData.Document` - MongoDB 查询结果
- `config`: `DatabaseUIConfig` - UI配置

**Events**:
- `document-edit`: 文档编辑事件
- `aggregate`: 聚合查询事件
- `schema-validate`: 模式验证事件

### SmartSqlEditor

智能查询编辑器。

```vue
<SmartSqlEditor
  v-model="query"
  :db-type="dbType"
  :schema="schema"
  :suggestions="suggestions"
  @execute="handleExecute"
  @format="handleFormat"
/>
```

**Props**:
- `modelValue`: `string` - 查询文本
- `db-type`: `string` - 数据库类型
- `schema`: `DatabaseSchema` - 数据库模式
- `suggestions`: `QuerySuggestion[]` - 查询建议

**Events**:
- `execute`: 执行查询事件
- `format`: 格式化查询事件

## 🔄 数据类型定义

### 基础数据类型

```typescript
// 数据库类型枚举
export enum DatabaseType {
  MySQL = 'MySQL',
  PostgreSQL = 'PostgreSQL',
  Redis = 'Redis',
  MongoDB = 'MongoDB',
}

// 显示模式枚举
export enum DisplayMode {
  Table = 'Table',
  KeyValue = 'KeyValue',
  Document = 'Document',
  Graph = 'Graph',
}

// 单元格值类型
export type CellValue = 
  | { String: string }
  | { Integer: number }
  | { Float: number }
  | { Boolean: boolean }
  | { DateTime: string }
  | { Null: null }
  | { Binary: string }
  | { JSON: any }
```

### 查询结果类型

```typescript
// 增强的查询结果
export interface EnhancedQueryResult {
  db_type: DatabaseType;
  data: QueryData;
  metadata: QueryMetadata;
  execution_time: number;
  ui_config: DatabaseUIConfig;
}

// 查询数据联合类型
export type QueryData = 
  | RelationalData
  | KeyValueData
  | DocumentData

// 关系型数据
export interface RelationalData {
  type: 'Relational';
  columns: ColumnInfo[];
  rows: CellValue[][];
  total_rows?: number;
  affected_rows: number;
  schema_info?: TableSchema;
}

// 键值对数据
export interface KeyValueData {
  type: 'KeyValue';
  entries: RedisEntry[];
  database_info: RedisDatabaseInfo;
  memory_stats?: RedisMemoryStats;
}

// 文档数据
export interface DocumentData {
  type: 'Document';
  documents: any[];
  collection_stats?: CollectionStats;
  indexes?: IndexInfo[];
}
```

### 配置类型

```typescript
// UI配置
export interface DatabaseUIConfig {
  display_mode: DisplayMode;
  supported_operations: Operation[];
  editor_config: EditorConfig;
  export_formats: ExportFormat[];
  monitoring_capable: boolean;
}

// 编辑器配置
export interface EditorConfig {
  language: string;
  auto_complete: boolean;
  syntax_highlighting: boolean;
  keywords?: string[];
  functions?: string[];
  operators?: string[];
}

// 操作枚举
export enum Operation {
  Select = 'Select',
  Insert = 'Insert',
  Update = 'Update',
  Delete = 'Delete',
  CreateTable = 'CreateTable',
  Get = 'Get',
  Set = 'Set',
  Keys = 'Keys',
  Monitor = 'Monitor',
}
```

## 🔍 错误处理

### 错误类型

```typescript
// API错误接口
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// 常见错误代码
export enum ErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_SYNTAX_ERROR = 'QUERY_SYNTAX_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

### 错误处理示例

```javascript
try {
  const result = await invoke('execute_query', {
    connection_id: 'conn123',
    query: 'SELECT * FROM users'
  });
  // 处理成功结果
} catch (error) {
  if (error.code === 'QUERY_SYNTAX_ERROR') {
    // 显示语法错误提示
  } else if (error.code === 'CONNECTION_FAILED') {
    // 显示连接失败提示
  } else {
    // 显示通用错误提示
  }
}
```

## 📊 实时数据

### WebSocket 事件

用于 Redis 监控等实时功能的 WebSocket 事件。

```typescript
// 监控事件类型
export interface MonitorEvent {
  connection_id: string;
  event_type: 'command' | 'key_expired' | 'memory_usage';
  data: any;
  timestamp: string;
}

// 使用示例
const eventSource = new EventSource('/api/monitor/redis/conn123');
eventSource.onmessage = (event) => {
  const monitorEvent: MonitorEvent = JSON.parse(event.data);
  // 处理监控事件
};
```

## 📋 使用示例

### 完整的查询执行流程

```javascript
// 1. 创建连接
const connectionId = await invoke('create_connection', {
  config: {
    db_type: 'MySQL',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'password',
    database: 'test'
  }
});

// 2. 获取模式信息
const schema = await invoke('get_database_schema', {
  connection_id: connectionId
});

// 3. 执行查询
const result = await invoke('execute_query', {
  connection_id: connectionId,
  query: 'SELECT * FROM users LIMIT 10'
});

// 4. 根据数据库类型渲染结果
if (result.db_type === 'MySQL') {
  // 渲染关系型表格
} else if (result.db_type === 'Redis') {
  // 渲染键值对树
} else if (result.db_type === 'MongoDB') {
  // 渲染JSON文档
}
```

---

**文档版本**: v1.0  
**最后更新**: 2024-09-06