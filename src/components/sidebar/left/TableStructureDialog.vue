<template>
  <div v-if="visible" class="table-structure-dialog-overlay" @click.self="close">
    <div class="table-structure-dialog">
      <!-- 对话框头部 -->
      <div class="dialog-header">
        <div class="header-info">
          <span class="table-icon">{{ getTableIcon(tableName) }}</span>
          <div class="table-info">
            <h3 class="table-name">{{ tableName }}</h3>
            <p class="database-name">{{ databaseName }}</p>
          </div>
        </div>
        
        <div class="header-actions">
          <button class="btn btn-icon" @click="refreshStructure" :disabled="loading">
            <span :class="{ 'spinning': loading }">🔄</span>
          </button>
          <button class="btn btn-icon" @click="close">❌</button>
        </div>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner spinning">⚡</div>
        <div class="loading-text">正在加载表结构...</div>
      </div>
      
      <!-- 表结构内容 -->
      <div v-else-if="tableInfo" class="dialog-content">
        <!-- 表基本信息 -->
        <div class="info-section">
          <h4 class="section-title">📊 表信息</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>表名:</label>
              <span>{{ tableInfo.name || tableName }}</span>
            </div>
            <div class="info-item">
              <label>列数:</label>
              <span>{{ tableInfo.columns?.length || 0 }}</span>
            </div>
            <div class="info-item" v-if="tableInfo.engine">
              <label>存储引擎:</label>
              <span>{{ tableInfo.engine }}</span>
            </div>
            <div class="info-item" v-if="tableInfo.charset">
              <label>字符集:</label>
              <span>{{ tableInfo.charset }}</span>
            </div>
          </div>
        </div>
        
        <!-- 列信息 -->
        <div class="columns-section">
          <h4 class="section-title">🗂️ 列结构 ({{ tableInfo.columns?.length || 0 }})</h4>
          
          <div v-if="tableInfo.columns && tableInfo.columns.length > 0" class="columns-table">
            <div class="table-header">
              <div class="col-name">列名</div>
              <div class="col-type">数据类型</div>
              <div class="col-null">可空</div>
              <div class="col-key">键</div>
              <div class="col-default">默认值</div>
            </div>
            
            <div class="table-body">
              <div 
                v-for="column in tableInfo.columns" 
                :key="column.name"
                class="table-row"
                :class="{ 'primary-key': column.primary_key }"
              >
                <div class="col-name">
                  <span class="column-icon">
                    {{ column.primary_key ? '🔑' : (column.nullable ? '📝' : '📋') }}
                  </span>
                  <span class="column-name">{{ column.name }}</span>
                </div>
                <div class="col-type">
                  <span class="data-type">{{ column.data_type }}</span>
                </div>
                <div class="col-null">
                  <span class="nullable-badge" :class="{ 'not-null': !column.nullable }">
                    {{ column.nullable ? 'YES' : 'NO' }}
                  </span>
                </div>
                <div class="col-key">
                  <span v-if="column.primary_key" class="key-badge primary">PRI</span>
                  <span v-else-if="column.unique_key" class="key-badge unique">UNI</span>
                  <span v-else-if="column.index_key" class="key-badge index">MUL</span>
                </div>
                <div class="col-default">
                  <span class="default-value">{{ column.default_value || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="no-columns">
            <span class="empty-icon">📭</span>
            <span class="empty-text">暂无列信息</span>
          </div>
        </div>
        
        <!-- 快速操作 -->
        <div class="quick-actions">
          <h4 class="section-title">⚡ 快速操作</h4>
          <div class="action-buttons">
            <button class="btn btn-secondary" @click="generateSelect">
              <span class="btn-icon">🔍</span>
              SELECT查询
            </button>
            <button class="btn btn-secondary" @click="generateCount">
              <span class="btn-icon">🔢</span>
              行数统计
            </button>
            <button class="btn btn-secondary" @click="generateInsert">
              <span class="btn-icon">📝</span>
              INSERT模板
            </button>
            <button class="btn btn-secondary" @click="copyTableName">
              <span class="btn-icon">📋</span>
              复制表名
            </button>
          </div>
        </div>
      </div>
      
      <!-- 错误状态 -->
      <div v-else class="error-state">
        <span class="error-icon">⚠️</span>
        <span class="error-text">加载表结构失败</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  databaseName: {
    type: String,
    required: true
  },
  tableName: {
    type: String,
    required: true
  },
  tableInfo: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['close', 'refresh', 'generate-query'])

// 响应式状态
const loading = ref(false)

// 方法
const close = () => {
  emit('close')
}

const refreshStructure = () => {
  loading.value = true
  emit('refresh', { database: props.databaseName, table: props.tableName })
  
  // 模拟加载时间
  setTimeout(() => {
    loading.value = false
  }, 1000)
}

const getTableIcon = (tableName) => {
  if (!tableName || typeof tableName !== 'string') {
    return '📋'
  }
  
  const name = tableName.toLowerCase()
  
  if (name.includes('user')) return '👥'
  if (name.includes('post') || name.includes('article')) return '📄'
  if (name.includes('comment') || name.includes('message')) return '💬'
  if (name.includes('product') || name.includes('item')) return '🛍️'
  if (name.includes('order')) return '📦'
  if (name.includes('tag')) return '🏷️'
  if (name.includes('category')) return '📂'
  if (name.includes('log')) return '📝'
  if (name.includes('setting') || name.includes('config')) return '⚙️'
  if (name.includes('file') || name.includes('image')) return '🗂️'
  if (name.includes('permission') || name.includes('role')) return '🔒'
  if (name.includes('stat') || name.includes('analytic')) return '📊'
  
  return '📋'
}

// 快速操作方法
const generateSelect = () => {
  const query = `SELECT * FROM \`${props.tableName}\` LIMIT 100;`
  emit('generate-query', query)
}

const generateCount = () => {
  const query = `SELECT COUNT(*) as total_rows FROM \`${props.tableName}\`;`
  emit('generate-query', query)
}

const generateInsert = () => {
  if (props.tableInfo?.columns?.length > 0) {
    const columns = props.tableInfo.columns.map(col => col.name).join(', ')
    const values = props.tableInfo.columns.map(() => '?').join(', ')
    const query = `INSERT INTO \`${props.tableName}\` (${columns}) VALUES (${values});`
    emit('generate-query', query)
  } else {
    const query = `INSERT INTO \`${props.tableName}\` (column1, column2) VALUES (value1, value2);`
    emit('generate-query', query)
  }
}

const copyTableName = async () => {
  try {
    await navigator.clipboard.writeText(props.tableName)
    // 这里可以添加成功提示
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 监听对话框显示状态
watch(() => props.visible, (visible) => {
  if (visible) {
    loading.value = false
  }
})
</script>

<style scoped>
.table-structure-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.table-structure-dialog {
  background: var(--bg-primary);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  width: 90vw;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 对话框头部 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-icon {
  font-size: 20px;
}

.table-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.database-name {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.btn {
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 11px;
}

.btn-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--text-secondary);
}

.btn-icon:hover {
  background: var(--gray-100);
  color: var(--text-primary);
}

.btn-secondary {
  padding: 4px 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
}

.btn-secondary:hover {
  background: var(--gray-100);
  border-color: var(--gray-300);
}

/* 内容区域 */
.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary);
}

.loading-spinner {
  font-size: 16px;
  margin-bottom: 8px;
}

.loading-text, .error-text {
  font-size: 12px;
}

.error-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

/* 信息部分 */
.info-section, .columns-section, .quick-actions {
  margin-bottom: 20px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-item label {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 500;
}

.info-item span {
  font-size: 11px;
  color: var(--text-primary);
  font-weight: 500;
}

/* 列表格 */
.columns-table {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 80px 80px 1fr;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
}

.table-header > div {
  padding: 6px 8px;
  border-right: 1px solid var(--border-color);
}

.table-header > div:last-child {
  border-right: none;
}

.table-body {
  max-height: 300px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 80px 80px 1fr;
  font-size: 10px;
  border-bottom: 1px solid var(--border-color);
}

.table-row:last-child {
  border-bottom: none;
}

.table-row.primary-key {
  background: rgba(255, 215, 0, 0.1);
}

.table-row > div {
  padding: 6px 8px;
  border-right: 1px solid var(--border-color);
  display: flex;
  align-items: center;
}

.table-row > div:last-child {
  border-right: none;
}

.col-name {
  gap: 4px;
}

.column-icon {
  font-size: 9px;
}

.column-name {
  font-weight: 500;
  color: var(--text-primary);
}

.data-type {
  color: var(--primary-color);
  font-weight: 500;
  font-family: 'Monaco', 'Consolas', monospace;
}

.nullable-badge {
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--success-light);
  color: var(--success-color);
  font-size: 9px;
  font-weight: 600;
}

.nullable-badge.not-null {
  background: var(--warning-light);
  color: var(--warning-color);
}

.key-badge {
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
}

.key-badge.primary {
  background: var(--warning-light);
  color: var(--warning-color);
}

.key-badge.unique {
  background: var(--info-light);
  color: var(--info-color);
}

.key-badge.index {
  background: var(--gray-100);
  color: var(--text-secondary);
}

.default-value {
  color: var(--text-secondary);
  font-style: italic;
  font-size: 9px;
}

.no-columns {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 12px;
}

/* 快速操作 */
.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-icon {
  font-size: 10px;
}

/* 动画 */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 滚动条 */
.table-body::-webkit-scrollbar,
.dialog-content::-webkit-scrollbar {
  width: 4px;
}

.table-body::-webkit-scrollbar-track,
.dialog-content::-webkit-scrollbar-track {
  background: transparent;
}

.table-body::-webkit-scrollbar-thumb,
.dialog-content::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: 2px;
}

/* 深色主题适配 */
[data-theme="dark"] .table-structure-dialog {
  background: var(--gray-800);
}

[data-theme="dark"] .dialog-header {
  background: var(--gray-700);
  border-color: var(--gray-600);
}

[data-theme="dark"] .columns-table {
  border-color: var(--gray-600);
}

[data-theme="dark"] .table-header {
  background: var(--gray-700);
  border-color: var(--gray-600);
}

[data-theme="dark"] .table-row {
  border-color: var(--gray-600);
}

[data-theme="dark"] .table-row > div {
  border-color: var(--gray-600);
}
</style>