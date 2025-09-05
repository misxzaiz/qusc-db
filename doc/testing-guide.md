# 测试指南

## 📋 概述

本文档描述了 QuSC-DB 重构项目的测试策略、测试框架配置和最佳实践。

## 🧪 测试策略

### 测试金字塔

```
    🔺 E2E Tests (端到端测试)
   /   \  - 用户流程测试
  /     \  - 跨组件集成测试
 /       \ 
🔺 Integration Tests (集成测试)
|         - API集成测试
|         - 数据库适配器测试
|         - 组件集成测试
🔺 Unit Tests (单元测试)
  - 函数单元测试
  - 组件单元测试
  - 工具函数测试
```

### 测试覆盖率目标

- **整体代码覆盖率**: ≥ 85%
- **核心业务逻辑**: ≥ 95%
- **UI组件**: ≥ 80%
- **数据库适配器**: ≥ 90%

## 🔧 后端测试 (Rust)

### 测试环境配置

#### Cargo.toml 依赖
```toml
[dev-dependencies]
tokio-test = "0.4"
mockall = "0.11"
serial_test = "2.0"
tempfile = "3.0"
```

#### 测试数据库配置
```rust
// tests/common/mod.rs
use std::sync::Once;

static INIT: Once = Once::new();

pub fn setup() {
    INIT.call_once(|| {
        env_logger::init();
    });
}

pub async fn create_test_db() -> anyhow::Result<TestDatabase> {
    // 创建临时测试数据库
    Ok(TestDatabase::new().await?)
}
```

### 数据库适配器测试

#### 单元测试示例

```rust
// tests/database/mysql_adapter_test.rs
use serial_test::serial;
use crate::common::*;

#[tokio::test]
#[serial]
async fn test_mysql_adapter_execute_select() {
    setup();
    let test_db = create_test_db().await.unwrap();
    let adapter = MySQLAdapter::new(test_db.connection_config()).unwrap();
    
    // 准备测试数据
    adapter.execute("CREATE TABLE test_users (id INT PRIMARY KEY, name VARCHAR(50))").await.unwrap();
    adapter.execute("INSERT INTO test_users VALUES (1, 'Alice'), (2, 'Bob')").await.unwrap();
    
    // 执行测试查询
    let result = adapter.execute("SELECT * FROM test_users ORDER BY id").await.unwrap();
    
    // 验证结果
    assert_eq!(result.db_type, DatabaseType::MySQL);
    match result.data {
        QueryData::Relational { columns, rows, .. } => {
            assert_eq!(columns.len(), 2);
            assert_eq!(columns[0].name, "id");
            assert_eq!(columns[1].name, "name");
            assert_eq!(rows.len(), 2);
        }
        _ => panic!("Expected relational data"),
    }
    
    // 清理
    adapter.execute("DROP TABLE test_users").await.unwrap();
}

#[tokio::test]
#[serial]
async fn test_mysql_adapter_get_schema() {
    setup();
    let test_db = create_test_db().await.unwrap();
    let adapter = MySQLAdapter::new(test_db.connection_config()).unwrap();
    
    // 创建测试表
    adapter.execute(r#"
        CREATE TABLE test_schema (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    "#).await.unwrap();
    
    // 获取模式
    let schema = adapter.get_schema().await.unwrap();
    
    // 验证模式信息
    let test_table = schema.tables.iter()
        .find(|t| t.name == "test_schema")
        .expect("test_schema table should exist");
    
    assert_eq!(test_table.columns.len(), 4);
    
    let id_column = test_table.columns.iter()
        .find(|c| c.name == "id")
        .expect("id column should exist");
    assert!(id_column.primary_key);
    assert!(!id_column.nullable);
    
    // 清理
    adapter.execute("DROP TABLE test_schema").await.unwrap();
}
```

#### Mock 测试示例

```rust
// tests/database/adapter_mock_test.rs
use mockall::{predicate::*, mock};

mock! {
    DatabaseConnection {}
    
    #[async_trait]
    impl DatabaseConnection for DatabaseConnection {
        async fn execute(&self, query: &str) -> anyhow::Result<QueryResult>;
        async fn get_schema(&self) -> anyhow::Result<Vec<TableInfo>>;
        fn is_connected(&self) -> bool;
    }
}

#[tokio::test]
async fn test_adapter_with_mock() {
    let mut mock_conn = MockDatabaseConnection::new();
    
    // 设置 Mock 期望
    mock_conn
        .expect_execute()
        .with(eq("SELECT * FROM users"))
        .returning(|_| Ok(QueryResult {
            columns: vec!["id".to_string(), "name".to_string()],
            rows: vec![vec!["1".to_string(), "Alice".to_string()]],
            affected_rows: 0,
            execution_time: 100,
        }));
    
    let adapter = TestAdapter::new(mock_conn);
    let result = adapter.execute("SELECT * FROM users").await.unwrap();
    
    assert_eq!(result.data.rows().len(), 1);
}
```

### 性能测试

```rust
// benches/query_performance.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn benchmark_query_execution(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let adapter = rt.block_on(async {
        setup_benchmark_db().await
    });
    
    c.bench_function("mysql_select_1000_rows", |b| {
        b.to_async(&rt).iter(|| async {
            let result = adapter.execute(black_box("SELECT * FROM large_table LIMIT 1000")).await.unwrap();
            black_box(result)
        })
    });
}

criterion_group!(benches, benchmark_query_execution);
criterion_main!(benches);
```

## 🎨 前端测试 (Vue + Vitest)

### 测试环境配置

#### package.json 依赖
```json
{
  "devDependencies": {
    "@testing-library/vue": "^7.0.0",
    "@testing-library/user-event": "^14.4.3",
    "@vue/test-utils": "^2.4.0",
    "jsdom": "^22.0.0",
    "vitest": "^0.34.0",
    "@vitest/ui": "^0.34.0"
  }
}
```

#### vitest.config.js
```javascript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.{js,ts,vue}',
        '**/*.spec.{js,ts,vue}'
      ]
    }
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
})
```

### 组件单元测试

#### 基础组件测试
```javascript
// tests/components/DatabaseResultViewer.test.js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DatabaseResultViewer from '@/components/DatabaseResultViewer.vue'

describe('DatabaseResultViewer', () => {
  const mockResult = {
    db_type: 'MySQL',
    data: {
      type: 'Relational',
      columns: [
        { name: 'id', data_type: 'Integer', nullable: false, primary_key: true },
        { name: 'name', data_type: 'String', nullable: false, primary_key: false }
      ],
      rows: [
        [{ Integer: 1 }, { String: 'Alice' }],
        [{ Integer: 2 }, { String: 'Bob' }]
      ],
      total_rows: 2,
      affected_rows: 0
    },
    ui_config: {
      display_mode: 'Table',
      supported_operations: ['Select', 'Insert'],
      editor_config: { language: 'sql' },
      export_formats: ['CSV', 'JSON']
    }
  }

  it('renders relational data correctly', () => {
    const wrapper = mount(DatabaseResultViewer, {
      props: { result: mockResult }
    })

    expect(wrapper.find('.relational-renderer').exists()).toBe(true)
    expect(wrapper.findAll('th')).toHaveLength(2)
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('emits operation event when user clicks action button', async () => {
    const wrapper = mount(DatabaseResultViewer, {
      props: { result: mockResult }
    })

    await wrapper.find('[data-testid="export-button"]').trigger('click')
    
    expect(wrapper.emitted('export')).toBeTruthy()
    expect(wrapper.emitted('export')[0]).toEqual([mockResult.data])
  })

  it('shows loading state correctly', () => {
    const wrapper = mount(DatabaseResultViewer, {
      props: { result: null, loading: true }
    })

    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
  })
})
```

#### Redis 渲染器测试
```javascript
// tests/components/renderers/RedisKeyValueRenderer.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import RedisKeyValueRenderer from '@/components/renderers/RedisKeyValueRenderer.vue'

describe('RedisKeyValueRenderer', () => {
  let mockRedisResult

  beforeEach(() => {
    mockRedisResult = {
      db_type: 'Redis',
      data: {
        type: 'KeyValue',
        entries: [
          {
            key: 'user:1001',
            data_type: 'String',
            value: { String: 'John Doe' },
            ttl: 300,
            memory_usage: 128
          },
          {
            key: 'session:abc123',
            data_type: 'Hash',
            value: { Hash: [['user_id', '1001'], ['login_time', '2024-01-01']] },
            ttl: null,
            memory_usage: 256
          }
        ],
        database_info: {
          database_index: 0,
          key_count: 1247
        }
      }
    }
  })

  it('displays Redis keys in tree structure', () => {
    const wrapper = mount(RedisKeyValueRenderer, {
      props: { result: mockRedisResult }
    })

    const keyEntries = wrapper.findAll('.key-entry')
    expect(keyEntries).toHaveLength(2)
    
    expect(wrapper.text()).toContain('user:1001')
    expect(wrapper.text()).toContain('session:abc123')
  })

  it('shows TTL information correctly', () => {
    const wrapper = mount(RedisKeyValueRenderer, {
      props: { result: mockRedisResult }
    })

    expect(wrapper.text()).toContain('TTL: 300s')
  })

  it('expands key details when clicked', async () => {
    const wrapper = mount(RedisKeyValueRenderer, {
      props: { result: mockRedisResult }
    })

    const firstKeyHeader = wrapper.find('.key-header')
    await firstKeyHeader.trigger('click')

    expect(wrapper.find('.key-value').exists()).toBe(true)
  })

  it('emits monitor-start event when monitor button clicked', async () => {
    const wrapper = mount(RedisKeyValueRenderer, {
      props: { result: mockRedisResult }
    })

    await wrapper.find('[data-testid="monitor-button"]').trigger('click')
    
    expect(wrapper.emitted('monitor-start')).toBeTruthy()
  })
})
```

### 集成测试

#### 组件通信测试
```javascript
// tests/integration/query-execution.test.js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import WorkspaceView from '@/views/WorkspaceView.vue'
import { useConnectionStore } from '@/stores/connection'

// Mock Tauri invoke
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}))

describe('Query Execution Integration', () => {
  it('executes query and displays results', async () => {
    const { invoke } = await import('@tauri-apps/api/tauri')
    const pinia = createPinia()
    
    // Mock successful query execution
    invoke.mockResolvedValue({
      db_type: 'MySQL',
      data: {
        type: 'Relational',
        columns: [{ name: 'id', data_type: 'Integer' }],
        rows: [[{ Integer: 1 }]],
        total_rows: 1,
        affected_rows: 0
      },
      ui_config: {
        display_mode: 'Table',
        supported_operations: ['Select']
      }
    })

    const wrapper = mount(WorkspaceView, {
      global: {
        plugins: [pinia]
      }
    })

    const connectionStore = useConnectionStore()
    connectionStore.activeConnection = 'test-connection'
    connectionStore.currentDbType = 'MySQL'

    // 输入查询
    const editor = wrapper.find('[data-testid="sql-editor"]')
    await editor.setValue('SELECT * FROM users')

    // 执行查询
    const executeButton = wrapper.find('[data-testid="execute-button"]')
    await executeButton.trigger('click')

    // 等待结果显示
    await wrapper.vm.$nextTick()

    // 验证结果
    expect(wrapper.find('.relational-renderer').exists()).toBe(true)
    expect(wrapper.find('tbody tr')).toBeTruthy()
  })
})
```

### 状态管理测试

#### Store 测试
```javascript
// tests/stores/connection.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConnectionStore } from '@/stores/connection'

vi.mock('@tauri-apps/api/tauri')

describe('Connection Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates connection successfully', async () => {
    const { invoke } = await import('@tauri-apps/api/tauri')
    invoke.mockResolvedValue('connection-id-123')

    const store = useConnectionStore()
    const config = {
      db_type: 'MySQL',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'password'
    }

    await store.createConnection(config)

    expect(store.connections.has('connection-id-123')).toBe(true)
    expect(store.activeConnection).toBe('connection-id-123')
  })

  it('handles connection failure', async () => {
    const { invoke } = await import('@tauri-apps/api/tauri')
    invoke.mockRejectedValue(new Error('Connection failed'))

    const store = useConnectionStore()
    const config = { db_type: 'MySQL', host: 'invalid' }

    await expect(store.createConnection(config)).rejects.toThrow('Connection failed')
    expect(store.connections.size).toBe(0)
  })

  it('executes query with correct parameters', async () => {
    const { invoke } = await import('@tauri-apps/api/tauri')
    const mockResult = { db_type: 'MySQL', data: { type: 'Relational' } }
    invoke.mockResolvedValue(mockResult)

    const store = useConnectionStore()
    store.activeConnection = 'test-conn'

    const result = await store.executeQuery('SELECT * FROM users')

    expect(invoke).toHaveBeenCalledWith('execute_query', {
      connection_id: 'test-conn',
      query: 'SELECT * FROM users'
    })
    expect(result).toEqual(mockResult)
  })
})
```

## 🚀 端到端测试 (E2E)

### Playwright 配置

#### playwright.config.js
```javascript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run tauri dev',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
  },
})
```

### E2E 测试示例

```javascript
// e2e/database-operations.spec.js
import { test, expect } from '@playwright/test'

test.describe('Database Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // 设置测试数据库连接
    await page.click('[data-testid="add-connection"]')
    await page.fill('[data-testid="host-input"]', 'localhost')
    await page.fill('[data-testid="port-input"]', '3306')
    await page.fill('[data-testid="username-input"]', 'test_user')
    await page.fill('[data-testid="password-input"]', 'test_password')
    await page.click('[data-testid="connect-button"]')
    
    // 等待连接建立
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected')
  })

  test('executes MySQL query and displays results', async ({ page }) => {
    // 输入查询
    await page.fill('[data-testid="sql-editor"]', 'SELECT * FROM users LIMIT 5')
    
    // 执行查询
    await page.click('[data-testid="execute-button"]')
    
    // 验证结果显示
    await expect(page.locator('[data-testid="results-table"]')).toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(5)
    
    // 验证列标题
    await expect(page.locator('th').first()).toContainText('id')
  })

  test('switches to Redis and displays key-value structure', async ({ page }) => {
    // 切换到 Redis 连接
    await page.click('[data-testid="connection-dropdown"]')
    await page.click('[data-testid="redis-connection"]')
    
    // 执行 Redis 命令
    await page.fill('[data-testid="redis-command"]', 'KEYS *')
    await page.click('[data-testid="execute-button"]')
    
    // 验证键值对显示
    await expect(page.locator('[data-testid="redis-keys"]')).toBeVisible()
    await expect(page.locator('.key-entry')).toHaveCountGreaterThan(0)
  })

  test('exports query results', async ({ page }) => {
    // 执行查询
    await page.fill('[data-testid="sql-editor"]', 'SELECT * FROM users LIMIT 10')
    await page.click('[data-testid="execute-button"]')
    
    // 等待结果显示
    await expect(page.locator('[data-testid="results-table"]')).toBeVisible()
    
    // 导出 CSV
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-csv"]')
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toContain('.csv')
  })

  test('displays error message for invalid query', async ({ page }) => {
    // 输入无效查询
    await page.fill('[data-testid="sql-editor"]', 'INVALID SQL QUERY')
    await page.click('[data-testid="execute-button"]')
    
    // 验证错误显示
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('syntax error')
  })
})
```

## 📊 性能测试

### 前端性能测试

```javascript
// tests/performance/rendering-performance.test.js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DatabaseResultViewer from '@/components/DatabaseResultViewer.vue'

describe('Rendering Performance', () => {
  it('renders large dataset efficiently', async () => {
    // 创建大数据集
    const largeResult = {
      db_type: 'MySQL',
      data: {
        type: 'Relational',
        columns: Array.from({ length: 10 }, (_, i) => ({
          name: `col_${i}`,
          data_type: 'String'
        })),
        rows: Array.from({ length: 10000 }, (_, i) => 
          Array.from({ length: 10 }, (_, j) => ({ String: `value_${i}_${j}` }))
        )
      }
    }

    const start = performance.now()
    const wrapper = mount(DatabaseResultViewer, {
      props: { result: largeResult }
    })
    const end = performance.now()

    expect(end - start).toBeLessThan(1000) // 应该在1秒内完成渲染
    expect(wrapper.exists()).toBe(true)
  })
})
```

## 🔍 测试工具和脚本

### package.json 脚本
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:rust": "cd src-tauri && cargo test",
    "test:rust:coverage": "cd src-tauri && cargo tarpaulin --out Html",
    "test:all": "npm run test:rust && npm run test && npm run test:e2e"
  }
}
```

### GitHub Actions CI 配置
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  rust-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run Rust tests
        run: cd src-tauri && cargo test
      - name: Generate coverage
        run: cd src-tauri && cargo tarpaulin --out Xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install
      - run: npm run test:e2e
```

## 📋 测试最佳实践

### 1. 测试命名规范
```javascript
// ✅ 好的命名
describe('DatabaseResultViewer', () => {
  it('renders MySQL results in table format', () => {})
  it('shows loading spinner when loading is true', () => {})
  it('emits export event when export button clicked', () => {})
})

// ❌ 不好的命名
describe('Component', () => {
  it('test 1', () => {})
  it('works', () => {})
})
```

### 2. 数据准备
```javascript
// ✅ 使用工厂函数
const createMySQLResult = (overrides = {}) => ({
  db_type: 'MySQL',
  data: {
    type: 'Relational',
    columns: [{ name: 'id', data_type: 'Integer' }],
    rows: [[{ Integer: 1 }]],
    ...overrides
  }
})

// ✅ 使用 beforeEach 设置通用数据
beforeEach(() => {
  mockResult = createMySQLResult()
})
```

### 3. 异步测试
```javascript
// ✅ 正确处理异步
it('fetches data on mount', async () => {
  const wrapper = mount(Component)
  await wrapper.vm.$nextTick()
  expect(wrapper.text()).toContain('Loaded data')
})

// ✅ 使用 waitFor 等待条件
it('shows success message after save', async () => {
  await wrapper.find('button').trigger('click')
  await waitFor(() => {
    expect(wrapper.text()).toContain('Saved successfully')
  })
})
```

### 4. Mock 最佳实践
```javascript
// ✅ 在需要的地方 Mock
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}))

// ✅ 清理 Mock
afterEach(() => {
  vi.clearAllMocks()
})
```

---

**文档版本**: v1.0  
**最后更新**: 2024-09-06