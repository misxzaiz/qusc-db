<template>
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog mysql-dialog" @click.stop>
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

// SQL代码引用
const sqlCodeRef = ref(null)

// 计算属性
const operationIcon = computed(() => {
  const iconMap = {
    'table-ddl': 'fas fa-code',
    'table-info': 'fas fa-info-circle',
    'create-table': 'fas fa-plus',
    'select-data': 'fas fa-search',
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
    'database-info': '数据库信息'
  }
  return titleMap[props.operation] || '数据库操作'
})

const canConfirm = computed(() => {
  if (props.operation === 'create-table') {
    return newTableName.value.trim() && createTableSQL.value.trim()
  }
  if (props.operation === 'select-data') {
    return querySQL.value.trim()
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
    
    ddlContent.value = `CREATE TABLE \`${props.tableName}\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`name\` varchar(255) NOT NULL,
  \`email\` varchar(255) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`unique_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`

  } catch (err) {
    error.value = err.message || '获取建表语句失败'
    console.error('MySQL DDL 获取失败:', err)
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
    'engine': '存储引擎',
    'rows': '行数',
    'data_length': '数据大小',
    'index_length': '索引大小',
    'collation': '字符集',
    'create_time': '创建时间',
    'update_time': '更新时间'
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
})

// 暴露方法供父组件调用
defineExpose({
  setLoading: (val) => { loading.value = val },
  setError: (msg) => { error.value = msg },
  setDDLContent: (content) => { ddlContent.value = content },
  setTableInfo: (info) => { tableInfo.value = info },
  clearError: () => { error.value = '' }
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

.mysql-dialog {
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
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
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
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
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
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
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
  border-color: #4a90e2;
  color: #4a90e2;
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
  background: #4a90e2;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #357abd;
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