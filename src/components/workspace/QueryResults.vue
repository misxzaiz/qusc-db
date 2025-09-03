<template>
  <div class="results-section">
    <div class="results-container">
      <!-- 批量执行结果 - 超紧凑Tab展示方式 -->
      <div v-if="result" class="batch-results-ultra-compact">
        <!-- Tab导航 + 内容面板 -->
        <div class="tab-container-ultra-compact">
          <QueryTabs
            :queries="result.results || []"
            :active-tab="activeQueryTab"
            :batch-summary="result.batchSummary"
            @switch-tab="switchQueryTab"
          />
          
          <QueryPanel
            v-if="currentQueryData"
            :query-data="currentQueryData"
            @retry-query="retryQuery"
            @explain-error="explainError"
            @export-results="exportQueryResults"
            @page-change="handlePageChange"
            @page-size-change="handlePageSizeChange"
          />
        </div>
      </div>
      
      <!-- 错误信息 -->
      <div v-else-if="error" class="error-container">
        <div class="error-header">
          <span class="error-icon">❌</span>
          <span class="error-title">查询执行失败</span>
        </div>
        <div class="error-message">{{ error }}</div>
        <div class="error-actions">
          <button class="btn btn-secondary" @click="$emit('explain-error')">
              AI解释错误
          </button>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-else class="empty-results">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">点击执行按钮运行查询</div>
        <div class="empty-hint">
          快捷键: Ctrl+Enter (Windows) 或 Cmd+Enter (Mac)
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import QueryTabs from './QueryTabs.vue'
import QueryPanel from './QueryPanel.vue'
import { useDataExport } from '@/composables/useDataExport.js'
import { useNotificationStore } from '@/stores/notification.js'

const notificationStore = useNotificationStore()

const props = defineProps({
  result: {
    type: Object,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  pageSize: {
    type: Number,
    default: 20
  }
})

const emit = defineEmits([
  'export-results',
  'copy-results', 
  'explain-error',
  'import-data',
  'retry-query',
  'retry-failed-queries',
  'page-change',
  'page-size-change'
])

// 响应式状态
const showExportDialog = ref(false)
const showImportDialog = ref(false)

// 新的Tab相关状态
const activeQueryTab = ref(0)

// 数据导出相关
const { exportToCSV } = useDataExport()

// 计算属性
const exportData = computed(() => {
  if (!props.result) return null
  
  return {
    columns: props.result.columns,
    rows: props.result.rows,
    query: props.result.executedQuery,
    connection: props.result.connection || 'Unknown'
  }
})

const currentQueryData = computed(() => {
  if (!props.result?.results || !Array.isArray(props.result.results)) return null
  return props.result.results[activeQueryTab.value] || null
})

// 新的Tab相关方法
const switchQueryTab = (index) => {
  activeQueryTab.value = index
}

const retryQuery = () => {
  const queryData = currentQueryData.value
  if (queryData) {
    emit('retry-query', {
      query: queryData.query,
      index: activeQueryTab.value
    })
  }
}

const exportSingleResult = (queryData) => {
  if (!queryData?.result) return
  
  const exportData = {
    columns: queryData.result.columns || [],
    rows: queryData.result.rows || [],
    query: queryData.query,
    connection: 'Current Connection'
  }
  
  emit('export-results', exportData)
}

const explainError = (error) => {
  emit('explain-error', error || props.error)
}

const exportQueryResults = (queryData) => {
  if (!queryData?.result) return
  
  // 导出当前Tab的查询结果
  const exportData = {
    columns: queryData.result.columns || [],
    rows: queryData.result.rows || [],
    query: queryData.query,
    connection: 'Current Connection'
  }
  
  emit('export-results', exportData)
}

const exportAllResults = () => {
  if (!props.result?.results) return
  
  // 导出所有成功查询的结果
  const successfulQueries = props.result.results.filter(q => q.success && q.result?.rows)
  
  if (successfulQueries.length === 0) {
    notificationStore.warning('没有可导出的查询结果')
    return
  }
  
  // 创建一个包含所有结果的综合导出数据
  const allExportData = successfulQueries.map((queryData, index) => ({
    sheetName: `Query_${index + 1}`,
    columns: queryData.result.columns || [],
    rows: queryData.result.rows || [],
    query: queryData.query
  }))
  
  emit('export-results', { multiSheet: true, data: allExportData })
  notificationStore.success(`开始导出 ${successfulQueries.length} 个查询的结果`)
}

const retryFailedQueries = () => {
  if (!props.result?.results) return
  
  const failedQueries = props.result.results
    .map((queryData, index) => ({ queryData, index }))
    .filter(item => !item.queryData.success)
  
  if (failedQueries.length === 0) {
    notificationStore.info('没有失败的查询需要重试')
    return
  }
  
  emit('retry-failed-queries', failedQueries.map(item => ({
    query: item.queryData.query,
    index: item.index
  })))
}

// 处理分页变更
const handlePageChange = (page) => {
  const queryData = currentQueryData.value
  if (queryData) {
    console.log('Handling page change:', page, 'for query:', activeQueryTab.value)
    emit('page-change', {
      page,
      query: queryData.query,
      index: activeQueryTab.value
    })
  }
}

// 处理页大小变更
const handlePageSizeChange = ({ pageSize, newPage }) => {
  const queryData = currentQueryData.value
  if (queryData) {
    console.log('Handling page size change:', pageSize, 'new page:', newPage, 'for query:', activeQueryTab.value)
    emit('page-size-change', {
      pageSize,
      page: newPage,
      query: queryData.query,
      index: activeQueryTab.value
    })
  }
}

const formatDateTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

// 监听批量结果变化，智能重置Tab状态
watch(() => props.result?.results, (newResults, oldResults) => {
  if (newResults && Array.isArray(newResults)) {
    // 只在真正的新查询时重置标签页（查询数量变化）
    const isNewQuery = !oldResults || newResults.length !== oldResults.length
    
    if (isNewQuery) {
      // 重置到第一个Tab
      activeQueryTab.value = 0
      
      // 如果有失败的查询，切换到第一个失败的查询
      const firstFailedIndex = newResults.findIndex(result => !result.success)
      if (firstFailedIndex !== -1) {
        activeQueryTab.value = firstFailedIndex
      }
    }
    // 如果是分页更新（查询数量相同），保持当前标签页
  }
}, { immediate: true })
</script>

<style scoped>
.results-section {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  min-height: 200px;
  overflow: hidden;
}

.results-header {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--gray-50);
  height: var(--toolbar-height);
}

.results-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-count {
  font-size: 11px;
  color: var(--gray-500);
}

.limit-info {
  color: var(--primary-color);
  font-weight: 500;
}

.total-info {
  color: var(--gray-600);
  font-weight: 500;
}

.results-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.data-actions {
  display: flex;
  gap: 8px;
}

.results-container {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.error-container {
  padding: 20px;
  color: var(--error-color);
}

.error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.error-icon {
  font-size: 16px;
}

.error-title {
  font-size: 14px;
  font-weight: 600;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--border-radius);
  padding: 12px;
  font-family: 'Monaco', monospace;
  font-size: 12px;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.error-actions {
  display: flex;
  gap: 8px;
}

.empty-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--gray-500);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 12px;
  color: var(--gray-400);
}

/* 超紧凑批量结果样式 */
.batch-results-ultra-compact {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-container-ultra-compact {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 统一结果展示样式 */
.unified-results {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .results-header {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .results-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .data-actions {
    justify-content: center;
  }
}
</style>