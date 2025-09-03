<template>
  <div class="batch-update-panel-compact">
    <!-- 紧凑面板 -->
    <div class="compact-panel">
      <!-- 面板头部 -->
      <div class="panel-header-compact">
        <div class="header-info">
          <span class="changes-count">📝 {{ changes.size }} 处修改</span>
          <span class="affected-info">{{ affectedRowsCount }}行 {{ affectedColumnsCount }}字段</span>
        </div>
        <div class="header-actions">
          <button 
            @click="toggleView"
            class="view-toggle-btn"
            :class="{ active: expandedView }"
          >
            {{ expandedView ? '🔽' : '🔼' }}
          </button>
          <button @click="$emit('cancel')" class="close-btn-compact">❌</button>
        </div>
      </div>
      
      <!-- 可展开内容 -->
      <div class="expandable-content" :class="{ expanded: expandedView }">
        <!-- SQL预览（紧凑） -->
        <div class="sql-preview-compact">
          <div class="sql-header-compact">
            <span>📋 SQL预览</span>
            <button @click="copySQLToClipboard" class="copy-btn-compact">📋</button>
          </div>
          <pre class="sql-code-compact">{{ truncatedSQL }}</pre>
        </div>
        
        <!-- 修改列表（紧凑） -->
        <div class="changes-list-compact">
          <div 
            v-for="(change, index) in visibleChanges" 
            :key="`${change.rowIndex}_${change.colIndex}`"
            class="change-item-compact"
          >
            <span class="change-field">{{ change.columnName }}</span>
            <span class="change-arrow">→</span>
            <span class="change-value">{{ formatValue(change.newValue) }}</span>
            <button @click="removeChange(change)" class="remove-btn-compact">🗑️</button>
          </div>
          <div v-if="changesList.length > maxVisibleChanges" class="more-changes">
            还有 {{ changesList.length - maxVisibleChanges }} 处修改...
          </div>
        </div>
        
        <!-- 执行选项（紧凑） -->
        <div class="options-compact">
          <label class="option-compact">
            <input type="checkbox" v-model="executionOptions.useTransaction" />
            事务
          </label>
          <label class="option-compact">
            <input type="checkbox" v-model="executionOptions.dryRun" />
            模拟
          </label>
        </div>
      </div>
      
      <!-- 底部操作栏 -->
      <div class="actions-compact">
        <div class="risk-indicator" :class="`risk-${riskLevel.toLowerCase()}`">
          {{ riskLevelText }}
        </div>
        <div class="action-buttons">
          <button @click="$emit('cancel')" class="btn-compact btn-cancel">取消</button>
          <button @click="previewExecution" class="btn-compact btn-preview">预览</button>
          <button 
            @click="executeChanges" 
            class="btn-compact btn-execute"
            :class="{ 'btn-danger': riskLevel === 'HIGH' }"
            :disabled="isLoading || !hasValidChanges"
          >
            <span v-if="isLoading">⏳</span>
            <span v-else-if="executionOptions.dryRun">🧪 模拟</span>
            <span v-else>💾 提交</span>
          </button>
        </div>
      </div>
      
      <!-- 进度条 -->
      <div v-if="isLoading" class="progress-compact">
        <div class="progress-bar-compact">
          <div class="progress-fill-compact" :style="{ width: `${executionProgress}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useBatchUpdate } from '@/composables/useBatchUpdate.js'
import { useNotificationStore } from '@/stores/notification.js'

const props = defineProps({
  changes: {
    type: Map,
    required: true
  },
  generatedSql: {
    type: String,
    default: ''
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'commit',
  'cancel',
  'preview',
  'remove-change'
])

const notificationStore = useNotificationStore()

// 批量更新 composable
const {
  isExecuting,
  executionProgress,
  analyzeSQLImpact,
  generateExecutionPreview,
  executeBatchUpdate
} = useBatchUpdate()

// 紧凑面板状态
const expandedView = ref(false)
const maxVisibleChanges = 3
const maxSQLLength = 200
const executionOptions = ref({
  useTransaction: true,
  dryRun: false
})

// 计算属性
const changesList = computed(() => {
  return Array.from(props.changes.values()).sort((a, b) => {
    if (a.rowIndex !== b.rowIndex) {
      return a.rowIndex - b.rowIndex
    }
    return a.colIndex - b.colIndex
  })
})

const visibleChanges = computed(() => {
  return changesList.value.slice(0, maxVisibleChanges)
})

const affectedRowsCount = computed(() => {
  const rows = new Set()
  for (const change of props.changes.values()) {
    rows.add(change.rowIndex)
  }
  return rows.size
})

const affectedColumnsCount = computed(() => {
  const columns = new Set()
  for (const change of props.changes.values()) {
    columns.add(change.columnName)
  }
  return columns.size
})

const hasValidChanges = computed(() => {
  return props.changes.size > 0
})

const truncatedSQL = computed(() => {
  if (!props.generatedSql) return '-- 正在生成SQL...'
  
  if (props.generatedSql.length <= maxSQLLength) {
    return props.generatedSql
  }
  
  return props.generatedSql.substring(0, maxSQLLength) + '\n-- ...(点击展开查看完整SQL)'
})

const riskLevel = ref('LOW')
const riskLevelText = computed(() => {
  const levelMap = {
    LOW: '🟢 低风险',
    MEDIUM: '🟡 中风险', 
    HIGH: '🔴 高风险'
  }
  return levelMap[riskLevel.value] || '未知'
})

// 方法
const toggleView = () => {
  expandedView.value = !expandedView.value
}

const formatValue = (value) => {
  if (value === null) return 'NULL'
  if (value === undefined) return 'undefined'
  if (value === '') return '(空)'
  if (typeof value === 'string' && value.length > 30) {
    return value.substring(0, 30) + '...'
  }
  return String(value)
}

const removeChange = (change) => {
  emit('remove-change', change.rowIndex, change.colIndex)
}

const copySQLToClipboard = async () => {
  if (!props.generatedSql) {
    notificationStore.warning('没有可复制的SQL语句')
    return
  }
  
  try {
    await navigator.clipboard.writeText(props.generatedSql)
    notificationStore.success('SQL已复制到剪贴板')
  } catch (error) {
    notificationStore.error('复制失败: ' + error.message)
  }
}

const previewExecution = async () => {
  if (!hasValidChanges.value) return
  
  try {
    const statements = props.generatedSql.split(';').filter(sql => sql.trim())
    const preview = generateExecutionPreview(statements, executionOptions.value)
    
    riskLevel.value = preview.analysis.riskLevel
    emit('preview', preview)
    notificationStore.info('预览完成')
    
  } catch (error) {
    console.error('生成预览失败:', error)
    notificationStore.error('预览失败: ' + error.message)
  }
}

const executeChanges = async () => {
  if (!hasValidChanges.value) return
  
  try {
    const statements = props.generatedSql.split(';').filter(sql => sql.trim())
    
    if (statements.length === 0) {
      notificationStore.warning('没有可执行的SQL语句')
      return
    }
    
    const result = await executeBatchUpdate(statements, executionOptions.value)
    
    if (result.success) {
      notificationStore.success(
        executionOptions.value.dryRun 
          ? '模拟执行完成' 
          : '批量更新成功'
      )
      emit('commit', result)
    } else {
      notificationStore.error('执行失败: ' + result.error)
    }
    
  } catch (error) {
    console.error('执行失败:', error)
    notificationStore.error('执行失败: ' + error.message)
  }
}

// 生命周期
onMounted(() => {
  // 简单的风险评估
  if (props.changes.size > 10) {
    riskLevel.value = 'MEDIUM'
  }
  if (props.changes.size > 50) {
    riskLevel.value = 'HIGH'
  }
})
</script>

<style scoped>
.batch-update-panel-compact {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 450px;
  min-width: 320px;
}

.compact-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--gray-200);
  overflow: hidden;
}

/* 面板头部 */
.panel-header-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  color: white;
  font-size: 12px;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.changes-count {
  font-weight: 600;
}

.affected-info {
  font-size: 10px;
  opacity: 0.9;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.view-toggle-btn, .close-btn-compact {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.view-toggle-btn:hover, .close-btn-compact:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 可展开内容 */
.expandable-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.expandable-content.expanded {
  max-height: 400px;
}

/* SQL预览 */
.sql-preview-compact {
  padding: 8px 12px;
  border-bottom: 1px solid var(--gray-200);
}

.sql-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--gray-700);
}

.copy-btn-compact {
  padding: 2px 6px;
  border: 1px solid var(--gray-300);
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 9px;
}

.sql-code-compact {
  background: var(--gray-900);
  color: white;
  padding: 6px 8px;
  border-radius: 4px;
  font-family: var(--font-mono, 'Monaco', monospace);
  font-size: 9px;
  line-height: 1.2;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 80px;
  overflow-y: auto;
}

/* 修改列表 */
.changes-list-compact {
  padding: 6px 12px;
  border-bottom: 1px solid var(--gray-200);
  font-size: 11px;
}

.change-item-compact {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  border-bottom: 1px solid var(--gray-100);
}

.change-item-compact:last-child {
  border-bottom: none;
}

.change-field {
  font-weight: 500;
  color: var(--gray-700);
  min-width: 60px;
  font-size: 10px;
}

.change-arrow {
  color: var(--gray-400);
  font-size: 10px;
}

.change-value {
  flex: 1;
  background: var(--green-100);
  color: var(--green-800);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: var(--font-mono, 'Monaco', monospace);
  font-size: 9px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn-compact {
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 8px;
  color: var(--gray-500);
  border-radius: 2px;
  transition: all 0.2s ease;
}

.remove-btn-compact:hover {
  background: var(--red-100);
  color: var(--red-600);
}

.more-changes {
  font-size: 10px;
  color: var(--gray-500);
  text-align: center;
  padding: 4px;
  font-style: italic;
}

/* 执行选项 */
.options-compact {
  display: flex;
  gap: 12px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--gray-200);
  font-size: 11px;
}

.option-compact {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 10px;
  color: var(--gray-700);
}

.option-compact input[type="checkbox"] {
  width: 12px;
  height: 12px;
}

/* 底部操作栏 */
.actions-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--gray-50);
}

.risk-indicator {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
}

.risk-low {
  background: var(--green-100);
  color: var(--green-800);
}

.risk-medium {
  background: var(--orange-100);
  color: var(--orange-800);
}

.risk-high {
  background: var(--red-100);
  color: var(--red-800);
}

.action-buttons {
  display: flex;
  gap: 6px;
}

.btn-compact {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid;
  cursor: pointer;
  font-size: 10px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-compact:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: white;
  color: var(--gray-700);
  border-color: var(--gray-300);
}

.btn-cancel:hover:not(:disabled) {
  background: var(--gray-100);
}

.btn-preview {
  background: var(--blue-500);
  color: white;
  border-color: var(--blue-500);
}

.btn-preview:hover:not(:disabled) {
  background: var(--blue-600);
}

.btn-execute {
  background: var(--green-500);
  color: white;
  border-color: var(--green-500);
}

.btn-execute:hover:not(:disabled) {
  background: var(--green-600);
}

.btn-danger {
  background: var(--red-500);
  border-color: var(--red-500);
}

.btn-danger:hover:not(:disabled) {
  background: var(--red-600);
}

/* 进度条 */
.progress-compact {
  padding: 4px 12px;
  background: var(--gray-50);
}

.progress-bar-compact {
  width: 100%;
  height: 4px;
  background: var(--gray-200);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill-compact {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--green-500));
  transition: width 0.3s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .batch-update-panel-compact {
    bottom: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .header-info {
    font-size: 11px;
  }
  
  .action-buttons {
    flex: 1;
    justify-content: flex-end;
  }
}
</style>