<template>
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog pgsql-dialog" @click.stop>
      <div class="dialog-header">
        <h3 class="dialog-title">
          <i :class="operationIcon" class="operation-icon"></i>
          {{ operationTitle }}
        </h3>
        <button class="close-btn" @click="handleCancel">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="dialog-body">
        <!-- 数据库和表信息显示 -->
        <div class="info-section">
          <div class="info-item">
            <span class="info-label">数据库:</span>
            <span class="info-value">{{ databaseName }}</span>
          </div>
          <div class="info-item" v-if="tableName">
            <span class="info-label">表名:</span>
            <span class="info-value">{{ tableName }}</span>
          </div>
        </div>

        <!-- 根据操作类型显示不同内容 -->
        <template v-if="operation === 'table-ddl'">
          <div class="field-group">
            <label class="field-label">建表语句:</label>
            <div class="sql-container">
              <pre class="sql-code" ref="sqlCodeRef"><code>{{ ddlContent || '正在加载...' }}</code></pre>
              <div class="sql-actions">
                <button class="action-btn" @click="copyToClipboard" :disabled="!ddlContent">
                  <i class="fas fa-copy"></i>
                  复制
                </button>
                <button class="action-btn" @click="refreshDDL">
                  <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
                  刷新
                </button>
                <button class="action-btn" @click="saveToFile" :disabled="!ddlContent">
                  <i class="fas fa-save"></i>
                  保存
                </button>
              </div>
            </div>
          </div>
        </template>

        <template v-if="operation === 'table-info'">
          <div class="field-group">
            <label class="field-label">表信息:</label>
            <div class="info-container">
              <div class="info-grid">
                <div class="info-row" v-for="(value, key) in tableInfo" :key="key">
                  <span class="info-key">{{ formatInfoKey(key) }}:</span>
                  <span class="info-val">{{ value || 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-if="operation === 'create-table'">
          <div class="field-group">
            <label class="field-label">表名:</label>
            <input 
              v-model="newTableName" 
              type="text" 
              class="field-input" 
              placeholder="输入新表名"
            />
          </div>
          <div class="field-group">
            <label class="field-label">建表语句:</label>
            <textarea 
              v-model="createTableSQL" 
              class="field-textarea sql-textarea" 
              placeholder="输入CREATE TABLE语句"
              rows="12"
            ></textarea>
          </div>
        </template>

        <template v-if="operation === 'select-data'">
          <div class="field-group">
            <label class="field-label">查询语句:</label>
            <textarea 
              v-model="querySQL" 
              class="field-textarea sql-textarea" 
              placeholder="SELECT * FROM table_name LIMIT 100"
              rows="4"
            ></textarea>
          </div>
        </template>

        <template v-if="operation === 'vacuum-analyze'">
          <div class="field-group">
            <label class="field-label">VACUUM 选项:</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="vacuumOptions.full" />
                <span>FULL (完整vacuum，可能锁表时间较长)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="vacuumOptions.verbose" />
                <span>VERBOSE (显示详细信息)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="vacuumOptions.analyze" />
                <span>ANALYZE (更新统计信息)</span>
              </label>
            </div>
          </div>
        </template>

        <template v-if="operation === 'create-index'">
          <div class="field-group">
            <label class="field-label">索引名:</label>
            <input 
              v-model="indexName" 
              type="text" 
              class="field-input" 
              placeholder="输入索引名称"
            />
          </div>
          <div class="field-group">
            <label class="field-label">索引类型:</label>
            <select v-model="indexType" class="field-input">
              <option value="btree">B-tree (默认)</option>
              <option value="hash">Hash</option>
              <option value="gin">GIN</option>
              <option value="gist">GiST</option>
              <option value="brin">BRIN</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">列名:</label>
            <input 
              v-model="indexColumns" 
              type="text" 
              class="field-input" 
              placeholder="列名，多列用逗号分隔"
            />
          </div>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="uniqueIndex" />
              <span>唯一索引</span>
            </label>
          </div>
        </template>

        <template v-if="operation === 'explain-query'">
          <div class="field-group">
            <label class="field-label">查询语句:</label>
            <textarea 
              v-model="explainQuery" 
              class="field-textarea sql-textarea" 
              placeholder="输入要分析的SQL语句"
              rows="4"
            ></textarea>
          </div>
          <div class="field-group">
            <label class="field-label">EXPLAIN 选项:</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="explainOptions.analyze" />
                <span>ANALYZE (实际执行并显示运行时间)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="explainOptions.verbose" />
                <span>VERBOSE (显示详细信息)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="explainOptions.buffers" />
                <span>BUFFERS (显示缓冲区使用情况)</span>
              </label>
            </div>
          </div>
        </template>

        <!-- 错误显示 -->
        <div v-if="error" class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          {{ error }}
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-message">
          <i class="fas fa-spinner fa-spin"></i>
          正在处理...
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="handleCancel">
          取消
        </button>
        <button 
          class="btn btn-primary" 
          @click="handleConfirm"
          :disabled="!canConfirm"
        >
          <i class="fas fa-check"></i>
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  operation: {
    type: String,
    required: true
  },
  connectionId: {
    type: String,
    required: true
  },
  databaseName: {
    type: String,
    required: true
  },
  tableName: {
    type: String,
    default: ''
  },
  context: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

// 状态数据
const loading = ref(false)
const error = ref('')
const ddlContent = ref('')
const tableInfo = ref({})
const newTableName = ref('')
const createTableSQL = ref('')
const querySQL = ref(`SELECT * FROM ${props.tableName} LIMIT 100`)

// PostgreSQL 特定选项
const vacuumOptions = ref({
  full: false,
  verbose: false,
  analyze: true
})
const indexName = ref('')
const indexType = ref('btree')
const indexColumns = ref('')
const uniqueIndex = ref(false)
const explainQuery = ref('')
const explainOptions = ref({
  analyze: false,
  verbose: false,
  buffers: false
})

// SQL代码引用
const sqlCodeRef = ref(null)

// 计算属性
const operationIcon = computed(() => {
  const iconMap = {
    'table-ddl': 'fas fa-code',
    'table-info': 'fas fa-info-circle',
    'create-table': 'fas fa-plus',
    'select-data': 'fas fa-search',
    'vacuum-analyze': 'fas fa-broom',
    'create-index': 'fas fa-sort',
    'explain-query': 'fas fa-search-plus',
    'database-info': 'fas fa-database'
  }
  return iconMap[props.operation] || 'fas fa-cog'
})

const operationTitle = computed(() => {
  const titleMap = {
    'table-ddl': '查看建表语句',
    'table-info': '表信息',
    'create-table': '创建表',
    'select-data': '查询数据',
    'vacuum-analyze': 'VACUUM 清理',
    'create-index': '创建索引',
    'explain-query': '执行计划分析',
    'database-info': '数据库信息'
  }
  return titleMap[props.operation] || 'PostgreSQL操作'
})

const canConfirm = computed(() => {
  if (props.operation === 'create-table') {
    return newTableName.value.trim() && createTableSQL.value.trim()
  }
  if (props.operation === 'select-data') {
    return querySQL.value.trim()
  }
  if (props.operation === 'create-index') {
    return indexName.value.trim() && indexColumns.value.trim()
  }
  if (props.operation === 'explain-query') {
    return explainQuery.value.trim()
  }
  return true
})

// 方法
function handleOverlayClick() {
  handleCancel()
}

function handleCancel() {
  emit('cancel')
  emit('update:visible', false)
}

function handleConfirm() {
  const data = {
    operation: props.operation,
    connectionId: props.connectionId,
    databaseName: props.databaseName,
    tableName: props.tableName
  }

  // 根据操作类型添加特定数据
  if (props.operation === 'create-table') {
    data.newTableName = newTableName.value
    data.createTableSQL = createTableSQL.value
  } else if (props.operation === 'select-data') {
    data.querySQL = querySQL.value
  } else if (props.operation === 'vacuum-analyze') {
    data.vacuumOptions = vacuumOptions.value
  } else if (props.operation === 'create-index') {
    data.indexName = indexName.value
    data.indexType = indexType.value
    data.indexColumns = indexColumns.value
    data.uniqueIndex = uniqueIndex.value
  } else if (props.operation === 'explain-query') {
    data.explainQuery = explainQuery.value
    data.explainOptions = explainOptions.value
  }

  emit('confirm', data)
  emit('update:visible', false)
}

async function refreshDDL() {
  if (props.operation !== 'table-ddl' || !props.tableName) return

  loading.value = true
  error.value = ''

  try {
    // 这里应该调用实际的API获取DDL
    // 暂时使用模拟数据
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ddlContent.value = `CREATE TABLE "${props.tableName}" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    age INTEGER CHECK (age >= 0 AND age <= 150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_${props.tableName}_name ON "${props.tableName}" (name);
CREATE INDEX idx_${props.tableName}_created_at ON "${props.tableName}" (created_at);

-- 注释
COMMENT ON TABLE "${props.tableName}" IS '用户表';
COMMENT ON COLUMN "${props.tableName}".name IS '用户名称';
COMMENT ON COLUMN "${props.tableName}".email IS '用户邮箱';`

  } catch (err) {
    error.value = err.message || '获取建表语句失败'
    console.error('PostgreSQL DDL 获取失败:', err)
  } finally {
    loading.value = false
  }
}

async function copyToClipboard() {
  if (!ddlContent.value) return

  try {
    await navigator.clipboard.writeText(ddlContent.value)
    // 显示成功提示
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'success',
        message: '建表语句已复制到剪贴板'
      }
    }))
  } catch (err) {
    console.error('复制失败:', err)
    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        type: 'error',
        message: '复制失败，请手动选择复制'
      }
    }))
  }
}

function saveToFile() {
  if (!ddlContent.value) return

  const blob = new Blob([ddlContent.value], { type: 'text/sql' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.tableName}_ddl.sql`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  window.dispatchEvent(new CustomEvent('show-notification', {
    detail: {
      type: 'success',
      message: '建表语句已保存到文件'
    }
  }))
}

function formatInfoKey(key) {
  const keyMap = {
    'table_schema': '模式',
    'table_type': '表类型',
    'engine': '存储引擎',
    'table_rows': '行数',
    'data_length': '数据大小',
    'index_length': '索引大小',
    'table_collation': '字符集',
    'create_time': '创建时间',
    'table_comment': '表注释'
  }
  return keyMap[key] || key
}

// 监听props变化
watch(() => props.visible, (newVal) => {
  if (newVal && props.operation === 'table-ddl') {
    nextTick(() => {
      refreshDDL()
    })
  }
})

// 监听operation变化，重置状态
watch(() => props.operation, () => {
  ddlContent.value = ''
  tableInfo.value = {}
  error.value = ''
  newTableName.value = ''
  createTableSQL.value = ''
  querySQL.value = `SELECT * FROM ${props.tableName} LIMIT 100`
  
  // 重置PostgreSQL特定选项
  vacuumOptions.value = { full: false, verbose: false, analyze: true }
  indexName.value = ''
  indexType.value = 'btree'
  indexColumns.value = ''
  uniqueIndex.value = false
  explainQuery.value = ''
  explainOptions.value = { analyze: false, verbose: false, buffers: false }
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.pgsql-dialog {
  min-width: 600px;
  max-width: 900px;
  max-height: 90vh;
}

.dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, #336791 0%, #2d5a7b 100%);
  color: white;
}

.dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.operation-icon {
  margin-right: 8px;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.info-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-weight: 500;
  color: #4a5568;
  min-width: 80px;
}

.info-value {
  color: #2d3748;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}

.field-group {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.field-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-input:focus {
  outline: none;
  border-color: #336791;
  box-shadow: 0 0 0 3px rgba(51, 103, 145, 0.1);
}

.field-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.sql-textarea {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
}

.field-textarea:focus {
  outline: none;
  border-color: #336791;
  box-shadow: 0 0 0 3px rgba(51, 103, 145, 0.1);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #336791;
}

.sql-container {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
}

.sql-code {
  margin: 0;
  padding: 20px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #1e293b;
  color: #e2e8f0;
  overflow-x: auto;
  min-height: 200px;
  white-space: pre-wrap;
}

.sql-actions {
  padding: 12px 16px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn:hover:not(:disabled) {
  border-color: #336791;
  color: #336791;
  background: #f0f7ff;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-container {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  padding: 16px;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-key {
  font-weight: 500;
  color: #4a5568;
}

.info-val {
  color: #2d3748;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.loading-message {
  background: #f0f7ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.dialog-footer {
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.btn-primary {
  background: #336791;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2d5a7b;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 暗色主题支持 */
[data-theme="dark"] .dialog {
  background: #1e293b;
  color: #e2e8f0;
}

[data-theme="dark"] .info-section {
  background: #334155;
  border-color: #475569;
}

[data-theme="dark"] .sql-container {
  background: #0f172a;
  border-color: #334155;
}

[data-theme="dark"] .sql-actions {
  background: #1e293b;
  border-color: #334155;
}
</style>