<template>
  <main class="workspace">
    <!-- 工作区标签页 -->
    <WorkspaceTabs 
      :tabs="tabs"
      :active-tab="activeTab"
      @switch-tab="switchTab"
      @close-tab="closeTab"
      @create-tab="createNewTab"
    />

    <!-- 工作区内容 -->
    <div class="workspace-content">
      <!-- SQL编辑器区域 -->
      <div class="editor-section" :class="{ 'has-helper': showRedisHelper }">
        <SqlEditor
          v-model="currentTab.query"
          :height="editorHeight"
          :can-execute="!!selectedConnectionKey"
          :is-executing="isExecuting"
          @format-sql="formatSQL"
          @clear-editor="clearEditor"
          @execute-query="executeQuery"
          @cursor-change="handleCursorChange"
          @selection-change="handleSelectionChange"
          ref="sqlEditorRef"
        >
          <template #connection-selector>
            <ConnectionSelector
              :selected-connection-key="selectedConnectionKey"
              :selected-database="selectedDatabase"
              :connections-list="connectionsList"
              :available-databases="availableDatabases"
              :is-loading-databases="isLoadingDatabases"
              :current-connection="currentSelectedConnection"
              @connection-change="onConnectionChange"
              @database-change="onDatabaseChange"
            />
          </template>
          
          <template #connection-info>
            <span v-if="currentSelectedConnection">
              {{ currentSelectedConnection.db_type }} • {{ currentSelectedConnection.host }}
            </span>
          </template>
        </SqlEditor>
      </div>

      <!-- 分割条 -->
      <div 
        class="splitter"
        @mousedown="startResize"
      ></div>

      <!-- 查询结果区域 -->
      <QueryResults
        :result="currentTab.result"
        :error="currentTab.error"
        :page-size="pageSize"
        @export-results="exportResults"
        @copy-results="copyResults"
        @explain-error="explainError"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
        @retry-query="retryQuery"
        @retry-failed-queries="retryFailedQueries"
      />
    </div>
  </main>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '@/stores/notification.js'
import { useAIStore } from '@/stores/ai.js'
import { useConnectionStore } from '@/stores/connection.js'

// 组件导入
import WorkspaceTabs from './WorkspaceTabs.vue'
import ConnectionSelector from './ConnectionSelector.vue'
import SqlEditor from './SqlEditor.vue'
import QueryResults from './QueryResults.vue'

// Composables导入
import { useTabManager } from './composables/useTabManager'
import { useQueryExecution } from './composables/useQueryExecution'
import { useResultsPagination } from './composables/useResultsPagination'

// Props
const props = defineProps({
  currentConnection: Object
})

// Emits
const emit = defineEmits(['query-execute'])

// Stores
const notificationStore = useNotificationStore()
const aiStore = useAIStore()
const connectionStore = useConnectionStore()

// 使用组合式函数
const {
  tabs,
  activeTab,
  currentTab,
  createNewTab,
  switchTab,
  closeTab,
  updateTabName,
  updateTabResult,
  updateTabError
} = useTabManager()

const {
  isExecuting,
  getQueryToExecute,
  executeQuery: executeQueryLogic,
  executeWithMode,
  formatSQL: formatSQLLogic
} = useQueryExecution()

const {
  pageSize,
  resetPagination,
  updatePaginationFromResult,
  handleJumpToPage: handleJumpLogic,
  goToPreviousPage: goToPrevLogic,
  goToNextPage: goToNextLogic
} = useResultsPagination()

// 响应式数据
const sqlEditorRef = ref(null)
const editorHeight = ref(280)
const isResizing = ref(false)

// 连接和数据库选择
const selectedConnectionKey = ref('')
const selectedDatabase = ref('')
const availableDatabases = ref([])
const isLoadingDatabases = ref(false)
const connectionsList = ref([])

// 计算属性
const currentSelectedConnection = computed(() => {
  if (!selectedConnectionKey.value) return null
  const connection = connectionsList.value.find(conn => conn.key === selectedConnectionKey.value)
  return connection?.config || null
})

// Redis命令助手显示判断
const showRedisHelper = computed(() => {
  return currentSelectedConnection.value?.db_type === 'Redis'
})

// 方法
const loadConnectionsList = async () => {
  try {
    console.log('开始加载连接列表...')
    const configs = await connectionStore.loadConnectionConfigs()
    console.log('加载的连接配置:', configs)
    
    connectionsList.value = Object.entries(configs).map(([key, config]) => ({
      key,
      name: key,
      config,
      displayName: `${config.db_type} - ${config.host}:${config.port}`
    }))
    
    console.log('处理后的连接列表:', connectionsList.value)
  } catch (error) {
    console.error('加载连接列表失败:', error)
    connectionsList.value = []
  }
}

const onConnectionChange = async (connectionKey) => {
  selectedConnectionKey.value = connectionKey
  if (!connectionKey) {
    availableDatabases.value = []
    selectedDatabase.value = ''
    return
  }

  try {
    isLoadingDatabases.value = true
    availableDatabases.value = []
    selectedDatabase.value = ''
    
    const connection = connectionsList.value.find(conn => conn.key === connectionKey)
    const config = connection?.config
    
    if (!config) {
      throw new Error('连接配置不存在')
    }
    
    const connectionId = await connectionStore.connect(config)
    const databases = await connectionStore.getDatabases(connectionId)
    availableDatabases.value = databases || []
    
    notificationStore.success(`已连接到 ${config.db_type} - ${config.host}:${config.port}`)

    localStorage.setItem('lastConnectionKey', connectionKey)

  } catch (error) {
    console.error('连接失败:', error)
    notificationStore.error(`连接失败: ${error.message}`)
    availableDatabases.value = []
    selectedConnectionKey.value = ''
  } finally {
    isLoadingDatabases.value = false
  }
}

const onDatabaseChange = async (database) => {
  selectedDatabase.value = database
  if (!selectedConnectionKey.value || !database) {
    return
  }
  
  try {
    const currentConnection = connectionStore.currentConnection
    if (!currentConnection) {
      throw new Error('没有活跃的连接')
    }
    
    await connectionStore.selectDatabase(currentConnection.id, database)
    notificationStore.success(`已切换到数据库: ${database}`)

    localStorage.setItem('lastConnectedDatabase', database)
  } catch (error) {
    console.error('选择数据库失败:', error)
    notificationStore.error(`选择数据库失败: ${error.message}`)
  }
}

const executeQuery = async (executionInfo = null, page = 1) => {
  // 处理新的执行模式参数
  if (executionInfo && typeof executionInfo === 'object') {
    const { mode, hasSelection, selectedText } = executionInfo

    try {
      resetPagination()
      const result = await executeWithMode(
        connectionStore.currentConnection?.id,
        currentTab.value.query,
        hasSelection, // 移除mode参数，直接传递hasSelection
        selectedText
      )
      
      if (result) {
        // 批量执行结果的特殊处理
        updateTabResult(activeTab.value, {
          isBatchResult: true,
          batchSummary: {
            totalQueries: result.totalQueries,
            successCount: result.successCount,
            errorCount: result.errorCount,
            duration: result.duration
          },
          results: result.results,
          rows: [], // 批量结果不显示具体行数据
          columns: [],
          executedAt: new Date(),
          success: result.success
        })

        // 更新标签页名称
        updateTabName(activeTab.value, `批量查询(${result.totalQueries}条)`)
      }
    } catch (error) {
      updateTabError(activeTab.value, error.message || error.toString())
    }
    return
  }
  
  // 兼容旧的调用方式（分页查询）
  const queryToExecute = getQueryToExecute(sqlEditorRef.value, currentTab.value.query)
  
  if (!queryToExecute) {
    notificationStore.warning('请输入SQL查询或选择要执行的查询')
    return
  }

  try {
    resetPagination()
    const result = await executeQueryLogic(
      connectionStore.currentConnection?.id,
      queryToExecute,
      page,
      pageSize.value,
      page === 1
    )
    
    if (result) {
      updateTabResult(activeTab.value, result)
      updatePaginationFromResult(result)
      
      // 更新标签页名称
      const firstLine = queryToExecute.split('\n')[0].trim()
      const shortQuery = firstLine.length > 20 ? firstLine.substring(0, 20) + '...' : firstLine
      updateTabName(activeTab.value, shortQuery || `查询 ${activeTab.value}`)
    }
  } catch (error) {
    updateTabError(activeTab.value, error.message || error.toString())
  }
}

const formatSQL = () => {
  const formatted = formatSQLLogic(currentTab.value.query)
  currentTab.value.query = formatted
  notificationStore.success('SQL已格式化')
}

const clearEditor = () => {
  if (currentTab.value.query.trim()) {
    notificationStore.confirm('确定要清空编辑器内容吗？', () => {
      currentTab.value.query = ''
      currentTab.value.result = null
      currentTab.value.error = null
      sqlEditorRef.value?.focus()
    })
  }
}

const exportResults = () => {
  if (!currentTab.value.result) return
  
  const { columns, rows } = currentTab.value.result
  const csvContent = [
    columns.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `query-result-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  URL.revokeObjectURL(url)
  notificationStore.success('查询结果已导出')
}

const copyResults = async () => {
  if (!currentTab.value.result) return
  
  const { columns, rows } = currentTab.value.result
  const textContent = [
    columns.join('\t'),
    ...rows.map(row => row.join('\t'))
  ].join('\n')
  
  try {
    await navigator.clipboard.writeText(textContent)
    notificationStore.success('查询结果已复制到剪贴板')
  } catch (error) {
    notificationStore.error('复制失败')
  }
}

const explainError = async () => {
  if (!currentTab.value.error) return
  
  try {
    const explanation = await aiStore.explainError(
      currentTab.value.error,
      currentTab.value.query
    )
    notificationStore.info(explanation, 8000)
  } catch (error) {
    notificationStore.error(`AI解释失败: ${error.message}`)
  }
}

// 分页方法
const goToPreviousPage = async () => {
  const prevPage = goToPrevLogic()
  if (prevPage) {
    await executeQuery(null, prevPage)
  }
}

// 处理分页变更
const handlePageChange = async ({ page, query, index }) => {
  console.log('Workspace handling page change:', page, 'for query index:', index)
  
  // 检查是否是批量查询结果
  if (currentTab.value.result?.isBatchResult) {
    // 批量查询的分页处理 - 只更新特定查询，不覆盖整个结果
    try {
      const result = await executeQueryLogic(
        connectionStore.currentConnection?.id,
        query,
        page,
        pageSize.value,
        true // 始终获取总数，确保分页信息完整
      )
      
      if (result && currentTab.value.result?.results) {
        // 构建完整的分页信息对象
        const paginationInfo = {
          currentPage: result.currentPage || page,
          totalPages: Math.ceil((result.totalRecords || 0) / (result.pageSize || pageSize.value)),
          totalRecords: result.totalRecords || 0,
          pageSize: result.pageSize || pageSize.value,
          hasNextPage: result.hasNextPage || false,
          hasPreviousPage: (result.currentPage || page) > 1
        }
        
        // 确保 result 有 pagination 对象
        const enhancedResult = {
          ...result,
          pagination: paginationInfo
        }
        
        // 更新批量结果中的特定查询
        const updatedResults = [...currentTab.value.result.results]
        updatedResults[index] = {
          ...updatedResults[index],
          result: enhancedResult,
          success: true
        }
        
        // 更新整个批量结果，保持批量结构
        updateTabResult(activeTab.value, {
          ...currentTab.value.result,
          results: updatedResults
        })
        
        console.log('Updated batch result with pagination for query', index, 'totalPages:', paginationInfo.totalPages)
      }
    } catch (error) {
      console.error('Pagination query failed:', error)
      // 更新特定查询的错误状态
      if (currentTab.value.result?.results) {
        const updatedResults = [...currentTab.value.result.results]
        updatedResults[index] = {
          ...updatedResults[index],
          success: false,
          error: error.message
        }
        
        updateTabResult(activeTab.value, {
          ...currentTab.value.result,
          results: updatedResults
        })
      }
    }
  } else {
    // 普通查询的分页处理（保持兼容性）
    const queryToExecute = query || getQueryToExecute(sqlEditorRef.value, currentTab.value.query)
    if (queryToExecute) {
      await executeQuery(null, page)
    }
  }
}

// 处理页大小变更
const handlePageSizeChange = async ({ pageSize: newPageSize, page, query, index }) => {
  console.log('Workspace handling page size change:', newPageSize, 'page:', page, 'for query index:', index)
  
  // 更新页大小设置
  pageSize.value = newPageSize
  
  // 检查是否是批量查询结果
  if (currentTab.value.result?.isBatchResult) {
    // 批量查询的页大小变更处理
    try {
      const result = await executeQueryLogic(
        connectionStore.currentConnection?.id,
        query,
        page,
        newPageSize,
        true // 始终获取总数
      )
      
      if (result && currentTab.value.result?.results) {
        // 构建完整的分页信息对象
        const paginationInfo = {
          currentPage: result.currentPage || page,
          totalPages: Math.ceil((result.totalRecords || 0) / newPageSize),
          totalRecords: result.totalRecords || 0,
          pageSize: newPageSize,
          hasNextPage: result.hasNextPage || false,
          hasPreviousPage: (result.currentPage || page) > 1
        }
        
        // 确保 result 有 pagination 对象
        const enhancedResult = {
          ...result,
          pagination: paginationInfo
        }
        
        // 更新批量结果中的特定查询
        const updatedResults = [...currentTab.value.result.results]
        updatedResults[index] = {
          ...updatedResults[index],
          result: enhancedResult,
          success: true
        }
        
        // 更新整个批量结果
        updateTabResult(activeTab.value, {
          ...currentTab.value.result,
          results: updatedResults
        })
        
        console.log('Updated batch result with new page size:', newPageSize, 'totalPages:', paginationInfo.totalPages)
      }
    } catch (error) {
      console.error('Page size change failed:', error)
    }
  } else {
    // 普通查询的页大小处理
    const queryToExecute = query || getQueryToExecute(sqlEditorRef.value, currentTab.value.query)
    if (queryToExecute) {
      await executeQuery(null, page)
    }
  }
}

// 重试查询
const retryQuery = async ({ query, index }) => {
  console.log('Retrying query:', query, 'at index:', index)
  
  if (query) {
    // 更新当前查询内容并执行
    currentTab.value.query = query
    await executeQuery()
  }
}

// 重试失败的查询
const retryFailedQueries = async (failedQueries) => {
  console.log('Retrying failed queries:', failedQueries)
  
  for (const { query, index } of failedQueries) {
    try {
      // 这里可以实现批量重试逻辑
      // 暂时简单处理：更新查询并执行
      currentTab.value.query = query
      await executeQuery()
    } catch (error) {
      console.error(`重试查询 ${index} 失败:`, error)
    }
  }
}

// 事件处理
const handleCursorChange = (position) => {
  // 可以在这里处理光标位置变化
}

const handleSelectionChange = (selection) => {
  // 可以在这里处理选择变化
}

// 分割条拖拽
const startResize = (event) => {
  isResizing.value = true
  const startY = event.clientY
  const startHeight = editorHeight.value
  
  const handleMouseMove = (e) => {
    if (!isResizing.value) return
    
    const deltaY = e.clientY - startY
    const newHeight = Math.max(200, Math.min(600, startHeight + deltaY))
    editorHeight.value = newHeight
  }
  
  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 全局事件监听
const handleInsertText = (event) => {
  const { text } = event.detail
  sqlEditorRef.value?.insertText(text)
}

const handleLoadQuery = (event) => {
  const { query } = event.detail
  currentTab.value.query = query
  nextTick(() => {
    sqlEditorRef.value?.focus()
  })
}

// 生命周期
onMounted(async () => {
  window.addEventListener('insert-text', handleInsertText)
  window.addEventListener('load-query', handleLoadQuery)
  
  // 加载连接列表
  await loadConnectionsList()

  // 加载数据库和表
  const lastConnectionKey = localStorage.getItem('lastConnectionKey');
  await onConnectionChange(lastConnectionKey)
  const lastConnectedDatabase = localStorage.getItem('lastConnectedDatabase');
  await onDatabaseChange(lastConnectedDatabase)
})

onUnmounted(() => {
  window.removeEventListener('insert-text', handleInsertText)
  window.removeEventListener('load-query', handleLoadQuery)
})

// 暴露方法给父组件使用
defineExpose({
  executeQuery,
  // 添加一个专门为全局快捷键设计的执行方法
  executeQueryFromShortcut: () => {
    // 获取当前编辑器状态
    const hasSelection = sqlEditorRef.value?.getSelection?.()?.length > 0 || false
    const selectedText = hasSelection ? sqlEditorRef.value?.getSelection?.() || null : null
    
    // 调用executeQuery，传递合适的参数
    executeQuery({
      mode: 'single', // 添加mode参数
      hasSelection,
      selectedText
    })
  }
})
</script>

<style scoped>
.workspace {
  flex: 1;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
}

.workspace-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-section {
  display: flex;
  gap: 0;
  min-height: 0;
}

.editor-section.has-helper {
  gap: 1px;
  background: var(--border-color);
}

.editor-section > * {
  background: white;
}

.editor-section :deep(.sql-editor) {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.editor-section.has-helper :deep(.sql-editor) {
  flex: 1;
  min-width: 400px;
  max-width: calc(100% - 320px);
}

.redis-helper-panel {
  width: 320px;
  min-width: 280px;
  max-width: 400px;
  overflow-y: auto;
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .redis-helper-panel {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .editor-section {
    flex-direction: column;
  }
  
  .redis-helper-panel {
    width: 100%;
    max-height: 300px;
  }
}

.splitter {
  height: 4px;
  background: var(--gray-200);
  cursor: row-resize;
  transition: background 0.2s ease;
}

.splitter:hover {
  background: var(--primary-color);
}

.workspace,
.workspace-content {
  min-width: 0 !important;
}
</style>