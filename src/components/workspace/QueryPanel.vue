<template>
  <div class="query-panel-ultra-compact">
    <!-- 超紧凑结果头部 -->
    <div class="result-header-micro" v-if="!hideHeader">
      <span class="result-status-micro" :class="{ success: queryData.success, error: !queryData.success }">
        {{ queryData.success ? '✅' : '❌' }}{{ getResultSummary() }}
      </span>


      <!-- 紧凑分页组件 -->
      <div v-if="hasResultData && showPagination && !queryData.result.pagination.hasUserLimit" class="pagination-compact">
        <button
          class="btn-page" 
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
          title="上一页">
          ‹
        </button>
        
        <input 
          type="number" 
          class="page-input" 
          :value="currentPage"
          @input="onPageInput"
          @keyup.enter="jumpToPage"
          :min="1" 
          :max="totalPages"
          title="当前页">
        
        <span class="page-divider">/</span>
        <span class="total-pages">{{ totalPages }}</span>
        
        <button 
          class="btn-page" 
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
          title="下一页">
          ›
        </button>
        
        <!-- 页大小选择器 -->
        <select 
          class="page-size-selector"
          :value="currentPageSize"
          @change="onPageSizeChange"
          title="每页条数">
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
        
        <span class="records-info">共{{queryData.result.pagination.totalRecords}}条</span>
      </div>
      
      <div class="result-actions-micro">
        <span v-if="queryData.result?.execution_time" class="time-micro">{{ queryData.result.execution_time }}ms</span>
        <button v-if="hasResultData" class="btn-micro" @click="copyResults" title="复制">📋</button>
        <button v-if="hasResultData" class="btn-micro" @click="$emit('export-results', queryData)" title="导出">📤</button>
        <button 
          v-if="hasResultData && isSelectQuery" 
          class="btn-micro" 
          @click="toggleEditMode" 
          :class="{ active: editMode }"
          title="编辑模式"
        >
          {{ editMode ? '📝' : '✏️' }}
        </button>
        <button v-if="!queryData.success" class="btn-micro" @click="$emit('explain-error', queryData.error)" title="AI解释"> </button>
        <button v-if="!queryData.success" class="btn-micro" @click="$emit('retry-query')" title="重试">🔄</button>
      </div>
    </div>

    <!-- 结果内容 - 直接显示 -->
    <div class="result-content-direct">
      <!-- 数据表格 -->
      <div v-if="queryData.success && hasResultData" class="data-result-direct">
        <!-- 可编辑表格 -->
        <EditableResultsTable 
          v-if="editMode"
          :columns="queryData.result.columns || []"
          :rows="queryData.result.rows || []"
          :table-schema="tableSchema"
          :item-height="36"
          :buffer-size="5"
          @update="handleTableUpdate"
          @error="handleTableError"
          @changes-count="handleChangesCount"
        />
        
        <!-- 只读表格 -->
        <VirtualResultsTable 
          v-else
          :columns="queryData.result.columns || []"
          :rows="queryData.result.rows || []"
          :item-height="28"
          :buffer-size="5"
          :has-more="false"
          :pull-refresh-enabled="true"
        />
      </div>
      
      <!-- 成功但无数据 -->
      <div v-else-if="queryData.success" class="no-data-micro">
        <span class="success-icon-micro">✅</span>
        <span class="success-text-micro">
          {{ queryData.result?.affectedRows !== undefined ? `影响${queryData.result.affectedRows}行` : '执行成功，无返回数据' }}
        </span>
      </div>

      <!-- 错误结果 -->
      <div v-else class="error-result-micro">
        <div class="error-message-micro">{{ queryData.error || '未知错误' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import VirtualResultsTable from './VirtualResultsTable.vue'
import EditableResultsTable from './EditableResultsTable.vue'
import { useNotificationStore } from '@/stores/notification.js'
import { useTableSchema } from '@/composables/useTableSchema.js'

const props = defineProps({
  queryData: {
    type: Object,
    required: true
  },
  hideHeader: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'retry-query',
  'explain-error',
  'export-results',
  'page-change',
  'page-size-change'
])

const notificationStore = useNotificationStore()
const { fetchTableSchema, extractTableName, inferTableSchemaFromQuery } = useTableSchema()

// 编辑状态
const editMode = ref(false)
const pendingChangesCount = ref(0)
const tableSchema = ref(null)

// 分页相关数据
const currentPage = ref(1)
const inputValue = ref(1)
const currentPageSize = ref(20)

// 计算属性
const hasResultData = computed(() => {
  return props.queryData.result && 
         props.queryData.result.rows && 
         props.queryData.result.rows.length > 0
})

// 分页计算属性
const totalPages = computed(() => {
  return props.queryData.result?.pagination?.totalPages || 0
})

const showPagination = computed(() => {
  return totalPages.value > 1
})

// 编辑相关计算属性
const isSelectQuery = computed(() => {
  // 简单检测是否为SELECT查询，这里可以根据实际情况改进
  const query = props.queryData.query || ''
  return query.trim().toUpperCase().startsWith('SELECT')
})

const editModeLabel = computed(() => {
  if (!editMode.value) return '编辑模式'
  return pendingChangesCount.value > 0 ? `编辑中 (${pendingChangesCount.value})` : '编辑中'
})

// 方法
// 分页方法
const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  inputValue.value = page
  emit('page-change', page)
}

const onPageInput = (event) => {
  inputValue.value = parseInt(event.target.value) || 1
}

const jumpToPage = () => {
  const page = inputValue.value
  if (page >= 1 && page <= totalPages.value) {
    goToPage(page)
  } else {
    inputValue.value = currentPage.value
    notificationStore.error(`页码范围：1-${totalPages.value}`)
  }
}

// 页大小变更处理
const onPageSizeChange = (event) => {
  const newPageSize = parseInt(event.target.value)
  currentPageSize.value = newPageSize
  
  // 重新计算当前页应该在哪一页
  const currentFirstRecord = (currentPage.value - 1) * (props.queryData.result?.pagination?.pageSize || 20) + 1
  const newPage = Math.ceil(currentFirstRecord / newPageSize)
  
  // 发出页大小变更事件
  emit('page-size-change', {
    pageSize: newPageSize,
    newPage: newPage
  })
}

// 监听分页数据变化，重置当前页和页大小
watch(() => props.queryData.result?.pagination, (newData) => {
  if (newData) {
    currentPage.value = newData.currentPage || 1
    inputValue.value = currentPage.value
    currentPageSize.value = newData.pageSize || 20
  }
}, { immediate: true })

const getResultSummary = () => {
  const data = props.queryData
  
  if (!data.success) {
    return '执行失败'
  }
  
  if (hasResultData.value) {
    const count = data.result.rows.length
    return `${count} 行结果`
  }
  
  if (data.result?.affectedRows !== undefined) {
    return `影响 ${data.result.affectedRows} 行`
  }
  
  return '执行成功'
}

const copyResults = async () => {
  if (!hasResultData.value) return
  
  try {
    const { columns, rows } = props.queryData.result
    const csvContent = [
      columns.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n')
    
    await navigator.clipboard.writeText(csvContent)
    notificationStore.success('查询结果已复制到剪贴板')
  } catch (error) {
    notificationStore.error('复制失败: ' + error.message)
  }
}

// 编辑相关方法
const toggleEditMode = () => {
  if (!isSelectQuery.value) {
    notificationStore.warning('只有SELECT查询的结果可以编辑')
    return
  }
  
  if (editMode.value && pendingChangesCount.value > 0) {
    notificationStore.confirm(
      '退出编辑模式将丢失未保存的修改，确定要继续吗？',
      () => {
        editMode.value = false
        pendingChangesCount.value = 0
        notificationStore.info('已退出编辑模式')
      }
    )
    return
  }
  
  editMode.value = !editMode.value
  
  if (editMode.value) {
    // 进入编辑模式时，尝试获取表结构信息
    detectTableSchema()
    notificationStore.success('已启用编辑模式，双击单元格开始编辑')
  } else {
    notificationStore.info('已退出编辑模式')
  }
}

const detectTableSchema = async () => {
  console.log('🔍 开始检测表结构...')
  
  try {
    // 使用新的表结构推断功能
    const schema = await inferTableSchemaFromQuery(
      props.queryData.result,
      props.queryData.query || ''
    )
    
    if (schema) {
      tableSchema.value = schema
      const isInferred = schema.inferred
      
      console.log(`✨ 表结构获取成功:`, {
        tableName: schema.table_name,
        columns: schema.columns?.length || 0,
        inferred: isInferred
      })
      
      if (isInferred) {
        notificationStore.info(`使用推断的表结构: ${schema.table_name}`)
      } else {
        notificationStore.success(`获取到真实表结构: ${schema.table_name}`)
      }
    } else {
      // 如果推断失败，使用简单降级方案
      console.warn('⚠️ 表结构推断失败，使用简单默认结构')
      useSimpleTableSchema()
    }
  } catch (error) {
    console.error('表结构检测失败:', error)
    notificationStore.error(`表结构检测失败: ${error.message}`)
    useSimpleTableSchema()
  }
}

const useSimpleTableSchema = () => {
  // 最简单的降级方案（只在所有其他方法都失败时使用）
  const columns = props.queryData.result?.columns || []
  const query = props.queryData.query || ''
  
  // 再次尝试提取表名
  const extractedTableName = extractTableName(query)
  const tableName = extractedTableName || 'query_result_table' // 使用更有意义的默认名称
  
  tableSchema.value = {
    table_name: tableName,
    name: tableName,
    columns: columns.map((col, index) => ({
      name: typeof col === 'string' ? col : col.name || col.column_name || `column_${index}`,
      column_name: typeof col === 'string' ? col : col.name || col.column_name || `column_${index}`,
      data_type: 'varchar', // 简单默认类型
      is_nullable: true,
      not_null: false,
      primary_key: false,
      is_primary_key: false,
      auto_increment: false,
      is_auto_increment: false,
      max_length: null,
      character_maximum_length: null,
      ordinal_position: index + 1
    })),
    fallback: true // 标记为降级方案
  }
  
  console.log('🔍 使用简单降级表结构:', tableSchema.value)
}

const handleTableUpdate = (updateInfo) => {
  console.log('📝 表格更新:', updateInfo)
  
  if (updateInfo.action === 'commit') {
    notificationStore.success('数据已成功更新到数据库')
    pendingChangesCount.value = 0
    
    // 可以在这里触发数据刷新
    // emit('refresh-data')
  }
}

const handleTableError = (error) => {
  console.error('📝 表格编辑错误:', error)
  notificationStore.error('编辑操作失败: ' + error.message)
}

const handleChangesCount = (count) => {
  pendingChangesCount.value = count
}
</script>

<style scoped>
.query-panel-ultra-compact {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
}

/* 超紧凑结果头部 */
.result-header-micro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 20px;
  padding: 0 8px;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid var(--border-color);
  font-size: 11px;
  flex-shrink: 0;
}

.result-status-micro {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.result-status-micro.success {
  color: var(--success-color, #16a34a);
}

.result-status-micro.error {
  color: var(--error-color, #dc2626);
}

.result-actions-micro {
  display: flex;
  align-items: center;
  gap: 4px;
}

.time-micro {
  font-size: 10px;
  color: var(--gray-500);
  background: var(--gray-100);
  padding: 1px 4px;
  border-radius: 2px;
  margin-right: 4px;
}

.btn-micro {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  border-radius: 2px;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.15s ease;
  color: var(--gray-600);
}

.btn-micro:hover {
  background: var(--gray-100);
  color: var(--text-color);
}

.btn-micro.active {
  background: var(--primary-color);
  color: white;
}

.btn-micro.active:hover {
  background: var(--primary-color-dark);
}

/* 紧凑分页组件样式 */
.pagination-compact {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.btn-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  color: var(--gray-600);
  transition: all 0.15s ease;
}

.btn-page:hover:not(:disabled) {
  background: var(--primary-color, #3b82f6);
  color: white;
  border-color: var(--primary-color, #3b82f6);
}

.btn-page:disabled {
  cursor: not-allowed;
  opacity: 0.4;
  background: var(--gray-50);
}

.page-input {
  width: 32px;
  height: 18px;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  text-align: center;
  font-size: 11px;
  background: white;
  padding: 0 2px;
}

.page-input:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.page-divider {
  font-size: 11px;
  color: var(--gray-500);
  margin: 0 1px;
}

.total-pages {
  font-size: 11px;
  color: var(--gray-700);
  font-weight: 500;
  min-width: 16px;
}

.page-size-selector {
  width: 45px;
  height: 18px;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  font-size: 11px;
  background: white;
  color: var(--gray-700);
  cursor: pointer;
  margin-left: 6px;
  padding: 0 2px;
}

.page-size-selector:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.records-info {
  font-size: 11px;
  color: var(--gray-600);
  margin-left: 4px;
}

/* 结果内容区域 - 直接显示 */
.result-content-direct {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.data-result-direct {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 微型成功状态 */
.no-data-micro {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  font-size: 12px;
}

.success-icon-micro {
  font-size: 16px;
}

.success-text-micro {
  color: var(--success-color, #16a34a);
  font-weight: 500;
}

/* 微型错误状态 */
.error-result-micro {
  padding: 8px;
  background: rgba(220, 38, 38, 0.03);
}

.error-message-micro {
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 4px;
  padding: 6px 8px;
  font-family: monospace;
  font-size: 11px;
  color: var(--error-color, #dc2626);
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.3;
  max-height: 80px;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .result-header-micro {
    height: 18px;
    padding: 0 6px;
    font-size: 10px;
  }
  
  .btn-micro {
    width: 14px;
    height: 14px;
    font-size: 9px;
  }
  
  .time-micro {
    font-size: 9px;
    padding: 1px 3px;
  }
}</style>