<template>
  <div class="editable-results-table">
    <!-- 编辑工具栏 -->
    <div class="edit-toolbar" v-if="hasChanges">
      <div class="changes-indicator">
        📝 {{ changeCount }} 处修改待提交
      </div>
      <div class="toolbar-actions">
        <button 
          @click="commitChanges" 
          :disabled="!canCommit || isCommitting"
          class="btn btn-primary"
        >
          💾 {{ isCommitting ? '提交中...' : '提交修改' }}
        </button>
        <button @click="previewSQL" class="btn btn-secondary">
          👀 预览SQL
        </button>
        <button @click="revertAll" class="btn btn-outline">
          🔄 撤销全部
        </button>
      </div>
    </div>

    <!-- 表格容器 -->
    <div 
      class="table-container"
      ref="tableContainer"
      @scroll="handleScroll"
    >
      <!-- 表格头部 -->
      <div class="table-header" :style="{ transform: `translateX(${-scrollLeft}px)` }">
        <div class="header-row">
          <div 
            v-for="(column, index) in columns" 
            :key="index"
            class="header-cell"
            :style="getColumnStyle(index)"
          >
            <span class="column-name">{{ getColumnName(column) }}</span>
            <span class="column-type">{{ getColumnType(column) }}</span>
          </div>
        </div>
      </div>

      <!-- 表格主体 -->
      <div class="table-body" :style="{ height: `${totalHeight}px` }">
        <div 
          class="visible-rows" 
          :style="{ 
            transform: `translateY(${startIndex * itemHeight}px) translateX(${-scrollLeft}px)`
          }"
        >
          <div
            v-for="(row, rowIndex) in visibleRows"
            :key="startIndex + rowIndex"
            class="table-row"
            :class="{ 
              even: (startIndex + rowIndex) % 2 === 0,
              modified: hasRowChanges(startIndex + rowIndex)
            }"
          >
            <div 
              v-for="(column, colIndex) in columns" 
              :key="colIndex"
              class="table-cell"
              :class="{
                'cell-editing': isEditing(startIndex + rowIndex, colIndex),
                'cell-modified': isModified(startIndex + rowIndex, colIndex),
                'cell-readonly': isReadonly(column)
              }"
              :style="getColumnStyle(colIndex)"
@dblclick="handleCellDoubleClick(startIndex + rowIndex, colIndex)"
              @click="handleCellClick(startIndex + rowIndex, colIndex)"
              :title="getCellTooltip(row[colIndex], column)"
            >
              <!-- 内联编辑器 -->
              <InlineEditor
                v-if="isInlineEditing(startIndex + rowIndex, colIndex)"
                :value="row[colIndex]"
                :column="getColumnMetadata(column)"
                :constraints="getColumnConstraints(column)"
                @save="saveCell(startIndex + rowIndex, colIndex, $event)"
                @cancel="cancelEdit"
                @navigate="handleInlineNavigation"
              />
              
              <!-- 浮窗编辑器 -->
              <CellEditor
                v-else-if="isModalEditing(startIndex + rowIndex, colIndex)"
                :value="row[colIndex]"
                :column="getColumnMetadata(column)"
                :constraints="getColumnConstraints(column)"
                @save="saveCell(startIndex + rowIndex, colIndex, $event)"
                @cancel="cancelEdit"
              />
              
              <!-- 单元格显示 -->
              <div v-else class="cell-display">
                <span class="cell-value">{{ formatCellDisplay(row[colIndex]) }}</span>
                <span v-if="isModified(startIndex + rowIndex, colIndex)" class="modified-indicator">*</span>
                <span v-if="isReadonly(column)" class="readonly-indicator">🔒</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量操作面板 -->
    <BatchUpdatePanel
      v-if="showBatchPanel"
      :changes="pendingChanges"
      :generated-sql="generatedSQL"
      :is-loading="isCommitting"
      @commit="executeBatchUpdate"
      @cancel="closeBatchPanel"
      @preview="previewSQL"
    />

    <!-- 编辑提示 -->
    <div v-if="!hasChanges && showEditHint" class="edit-hint">
      💡 双击单元格开始编辑，简单类型内联编辑，复杂类型弹窗编辑
      <br>
      <small>🔥 支持 Enter/Tab 快速导航，Esc 取消编辑</small>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, toRef } from 'vue'
import CellEditor from './CellEditor.vue'
import BatchUpdatePanel from './BatchUpdatePanel.vue'
import InlineEditor from './inline-editors/InlineEditor.vue'
import { useResultEditor } from '@/composables/useResultEditor.js'
import { useEditingStrategy } from '@/composables/useEditingStrategy.js'
import { useNotificationStore } from '@/stores/notification.js'

const props = defineProps({
  columns: {
    type: Array,
    default: () => []
  },
  rows: {
    type: Array,
    default: () => []
  },
  tableSchema: {
    type: Object,
    default: () => ({})
  },
  readonlyColumns: {
    type: Array,
    default: () => []
  },
  itemHeight: {
    type: Number,
    default: 36
  },
  bufferSize: {
    type: Number,
    default: 5
  }
})

const emit = defineEmits([
  'update',
  'error',
  'changes-count'
])

const notificationStore = useNotificationStore()

// 引用
const tableContainer = ref(null)

// 滚动和虚拟化状态
const scrollTop = ref(0)
const scrollLeft = ref(0)
const containerHeight = ref(0)
const columnWidths = ref([])
const showEditHint = ref(true)
const showBatchPanel = ref(false)

// 使用编辑策略 composable
const {
  shouldUseInlineEdit,
  getEditingStrategy,
  getInlineEditorType,
  analyzeTableEditingStrategy
} = useEditingStrategy()

// 使用结果编辑器 composable
const {
  editableRows,
  pendingChanges,
  editingCell,
  isCommitting,
  startEdit: startEditAction,
  saveCell: saveCellAction,
  cancelEdit: cancelEditAction,
  commitChanges: commitChangesAction,
  revertAll: revertAllAction,
  generateSQL,
  isModified: isModifiedAction,
  hasRowChanges: hasRowChangesAction
} = useResultEditor(props.rows, toRef(props, 'tableSchema'))

// 编辑模式状态
const currentEditMode = ref('auto') // 'auto', 'inline', 'modal'
const inlineEditingCell = ref(null) // 当前内联编辑的单元格
const navigatingCell = ref(null) // 键盘导航的目标单元格

// 计算属性
const totalHeight = computed(() => editableRows.value.length * props.itemHeight)

const visibleCount = computed(() => {
  return Math.ceil(containerHeight.value / props.itemHeight) + props.bufferSize * 2
})

const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.itemHeight) - props.bufferSize
  return Math.max(0, index)
})

const endIndex = computed(() => {
  return Math.min(editableRows.value.length, startIndex.value + visibleCount.value)
})

const visibleRows = computed(() => {
  return editableRows.value.slice(startIndex.value, endIndex.value)
})

const hasChanges = computed(() => pendingChanges.value.size > 0)

const changeCount = computed(() => pendingChanges.value.size)

const canCommit = computed(() => {
  return hasChanges.value && !isCommitting.value
})

const generatedSQL = computed(() => {
  if (!hasChanges.value) return ''
  return generateSQL()
})

// 编辑策略分析
const editingStrategies = computed(() => {
  return analyzeTableEditingStrategy(props.columns, props.tableSchema)
})

// 当前编辑单元格的策略
const currentEditingStrategy = computed(() => {
  if (!editingCell.value) return null
  const { colIndex } = editingCell.value
  const column = getColumnMetadata(props.columns[colIndex])
  const constraints = getColumnConstraints(props.columns[colIndex])
  return getEditingStrategy(column, constraints)
})

// 方法
const calculateColumnWidths = () => {
  if (!props.columns.length || !editableRows.value.length) {
    columnWidths.value = props.columns.map(() => 120)
    return
  }
  
  const widths = []
  const minWidth = 100
  const maxWidth = 300
  
  props.columns.forEach((column, index) => {
    const columnName = getColumnName(column)
    // 计算表头宽度
    let headerWidth = columnName.length * 8 + 40 // 字符宽度 + padding + 类型标签
    
    // 计算前50行数据的最大宽度
    let maxDataWidth = 0
    const sampleRows = editableRows.value.slice(0, 50)
    
    sampleRows.forEach(row => {
      if (row[index] !== undefined && row[index] !== null) {
        const cellText = String(row[index])
        const cellWidth = Math.min(cellText.length * 8 + 30, 400)
        maxDataWidth = Math.max(maxDataWidth, cellWidth)
      }
    })
    
    const finalWidth = Math.max(minWidth, Math.min(maxWidth, Math.max(headerWidth, maxDataWidth)))
    widths.push(finalWidth)
  })
  
  columnWidths.value = widths
}

const getColumnStyle = (index) => {
  const width = columnWidths.value[index] || 120
  return {
    width: `${width}px`,
    minWidth: `${width}px`,
    maxWidth: `${width}px`,
    flexShrink: 0
  }
}

const getColumnName = (column) => {
  return typeof column === 'string' ? column : column.name || column.column_name || 'Unknown'
}

const getColumnType = (column) => {
  if (typeof column === 'string') return ''
  return column.data_type || column.type || ''
}

const getColumnMetadata = (column) => {
  if (typeof column === 'string') {
    return { name: column, data_type: 'varchar' }
  }
  return column
}

const getColumnConstraints = (column) => {
  if (typeof column === 'string') {
    return {}
  }
  return {
    not_null: column.not_null || false,
    max_length: column.max_length || column.character_maximum_length,
    primary_key: column.primary_key || column.is_primary_key,
    unique: column.unique || false,
    auto_increment: column.auto_increment || column.is_auto_increment
  }
}

const isReadonly = (column) => {
  const columnName = getColumnName(column)
  const constraints = getColumnConstraints(column)
  
  // 检查是否在只读列表中
  if (props.readonlyColumns.includes(columnName)) return true
  
  // 主键通常只读
  if (constraints.primary_key) return true
  
  // 自动递增字段只读
  if (constraints.auto_increment) return true
  
  return false
}

const formatCellDisplay = (cell) => {
  if (cell === null) return 'NULL'
  if (cell === undefined) return ''
  if (typeof cell === 'string' && cell.length > 100) {
    return cell.substring(0, 100) + '...'
  }
  return String(cell)
}

const getCellTooltip = (cell, column) => {
  let tooltip = formatCellDisplay(cell)
  const columnType = getColumnType(column)
  if (columnType) {
    tooltip += `\n类型: ${columnType}`
  }
  if (isReadonly(column)) {
    tooltip += '\n🔒 只读字段'
  }
  return tooltip
}

const handleScroll = (event) => {
  const target = event.target
  scrollTop.value = target.scrollTop
  scrollLeft.value = target.scrollLeft
}

const updateContainerHeight = () => {
  if (tableContainer.value) {
    const rect = tableContainer.value.getBoundingClientRect()
    containerHeight.value = rect.height
  }
}

// 编辑相关方法
// 编辑相关方法
// 判断是否正在内联编辑
const isInlineEditing = (rowIndex, colIndex) => {
  return inlineEditingCell.value?.rowIndex === rowIndex && inlineEditingCell.value?.colIndex === colIndex
}

// 判断是否正在浮窗编辑
const isModalEditing = (rowIndex, colIndex) => {
  return editingCell.value?.rowIndex === rowIndex && editingCell.value?.colIndex === colIndex && !inlineEditingCell.value
}

// 判断是否正在编辑（兼容旧版本）
const isEditing = (rowIndex, colIndex) => {
  return isInlineEditing(rowIndex, colIndex) || isModalEditing(rowIndex, colIndex)
}

const isModified = (rowIndex, colIndex) => {
  return isModifiedAction(rowIndex, colIndex)
}

const hasRowChanges = (rowIndex) => {
  return hasRowChangesAction(rowIndex)
}

// 单元格点击处理
const handleCellClick = (rowIndex, colIndex) => {
  // 单击可以用于选中单元格或其他操作
  console.log(`📍 单击单元格: [${rowIndex}, ${colIndex}]`)
}

// 单元格双击处理
const handleCellDoubleClick = (rowIndex, colIndex) => {
  const column = props.columns[colIndex]
  if (isReadonly(column)) {
    notificationStore.warning('该字段为只读字段，无法编辑')
    return
  }
  
  // 取消当前编辑
  cancelEdit()
  
  // 获取列元数据和约束
  const columnMetadata = getColumnMetadata(column)
  const constraints = getColumnConstraints(column)
  
  // 获取编辑策略
  const strategy = getEditingStrategy(columnMetadata, constraints)
  
  console.log(`🎯 开始编辑 [${rowIndex}, ${colIndex}] - 策略: ${strategy.mode} (原因: ${strategy.reason})`)
  
  if (strategy.mode === 'inline') {
    // 内联编辑
    startInlineEdit(rowIndex, colIndex)
  } else {
    // 浮窗编辑
    startModalEdit(rowIndex, colIndex)
  }
}

// 开始内联编辑
const startInlineEdit = (rowIndex, colIndex) => {
  inlineEditingCell.value = {
    rowIndex,
    colIndex,
    originalValue: editableRows.value[rowIndex]?.[colIndex],
    startTime: Date.now()
  }
  
  // 启动下层编辑器
  if (startEditAction(rowIndex, colIndex)) {
    showEditHint.value = false
    console.log(`✨ 开始内联编辑: [${rowIndex}, ${colIndex}]`)
  }
}

// 开始浮窗编辑
const startModalEdit = (rowIndex, colIndex) => {
  // 清除内联编辑状态
  inlineEditingCell.value = null
  
  // 启动下层编辑器
  if (startEditAction(rowIndex, colIndex)) {
    showEditHint.value = false
    console.log(`🎭 开始浮窗编辑: [${rowIndex}, ${colIndex}]`)
  }
}

// 兼容旧版本的 startEdit
const startEdit = (rowIndex, colIndex) => {
  handleCellDoubleClick(rowIndex, colIndex)
}

// 内联编辑导航处理
const handleInlineNavigation = (navigationInfo) => {
  const { direction, save = false } = navigationInfo
  
  if (!inlineEditingCell.value) return
  
  const currentRow = inlineEditingCell.value.rowIndex
  const currentCol = inlineEditingCell.value.colIndex
  
  let targetRow = currentRow
  let targetCol = currentCol
  
  // 计算目标位置
  switch (direction) {
    case 'up':
      targetRow = Math.max(0, currentRow - 1)
      break
    case 'down':
      targetRow = Math.min(editableRows.value.length - 1, currentRow + 1)
      break
    case 'left':
      targetCol = Math.max(0, currentCol - 1)
      break
    case 'right':
      targetCol = Math.min(props.columns.length - 1, currentCol + 1)
      break
    default:
      return
  }
  
  // 检查目标位置是否可编辑
  const targetColumn = props.columns[targetCol]
  if (isReadonly(targetColumn)) {
    // 如果目标位置只读，尝试找下一个可编辑的单元格
    if (direction === 'right' || direction === 'left') {
      const step = direction === 'right' ? 1 : -1
      for (let col = targetCol + step; col >= 0 && col < props.columns.length; col += step) {
        if (!isReadonly(props.columns[col])) {
          targetCol = col
          break
        }
      }
    }
  }
  
  // 如果位置没有变化，不进行导航
  if (targetRow === currentRow && targetCol === currentCol) {
    return
  }
  
  console.log(`🧠 键盘导航: [${currentRow}, ${currentCol}] -> [${targetRow}, ${targetCol}]`)
  
  // 设置导航目标
  navigatingCell.value = { rowIndex: targetRow, colIndex: targetCol }
  
  // 延迟一点开始新的编辑，确保当前编辑已经保存
  setTimeout(() => {
    if (navigatingCell.value?.rowIndex === targetRow && navigatingCell.value?.colIndex === targetCol) {
      startInlineEdit(targetRow, targetCol)
      navigatingCell.value = null
    }
  }, 50)
}

// 保存单元格编辑
const saveCell = (rowIndex, colIndex, newValue) => {
  console.log(`💾 保存单元格编辑: [${rowIndex}, ${colIndex}] = ${newValue}`)
  
  const success = saveCellAction(rowIndex, colIndex, newValue)
  
  if (success) {
    // 清除编辑状态
    cancelEdit()
    
    // 发出事件通知
    emit('update', {
      rowIndex,
      colIndex,
      oldValue: editableRows.value[rowIndex]?.[colIndex],
      newValue,
      timestamp: Date.now()
    })
    
    emit('changes-count', changeCount.value)
    notificationStore.success('单元格修改已保存，记得提交更改')
  } else {
    emit('error', '保存失败，请检查输入数据')
  }
}

// 取消编辑
const cancelEdit = () => {
  console.log('❌ 取消编辑')
  
  // 清除所有编辑状态
  inlineEditingCell.value = null
  navigatingCell.value = null
  
  // 调用下层取消方法
  cancelEditAction()
  
  showEditHint.value = true
}

const commitChanges = async () => {
  try {
    await commitChangesAction()
    notificationStore.success('修改已成功提交到数据库')
    emit('update', { action: 'commit', changes: Array.from(pendingChanges.value.values()) })
  } catch (error) {
    notificationStore.error('提交失败: ' + error.message)
    emit('error', error)
  }
}

const revertAll = () => {
  revertAllAction()
  notificationStore.info('已撤销所有未提交的修改')
  showEditHint.value = true
}

const previewSQL = () => {
  if (!hasChanges.value) {
    notificationStore.warning('没有待提交的修改')
    return
  }
  showBatchPanel.value = true
}

const closeBatchPanel = () => {
  showBatchPanel.value = false
}

const executeBatchUpdate = async () => {
  await commitChanges()
  closeBatchPanel()
}

// 生命周期
onMounted(() => {
  updateContainerHeight()
  calculateColumnWidths()
  window.addEventListener('resize', updateContainerHeight)
  
  // 3秒后隐藏编辑提示
  setTimeout(() => {
    showEditHint.value = false
  }, 5000)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})

// 监听数据变化
watch(() => props.rows, () => {
  calculateColumnWidths()
}, { immediate: true })

watch(() => props.columns, () => {
  calculateColumnWidths()
}, { immediate: true })

watch(changeCount, (newCount) => {
  emit('changes-count', newCount)
})
</script>

<style scoped>
.editable-results-table {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

/* 编辑工具栏 */
.edit-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(16, 185, 129, 0.05));
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  font-size: 12px;
}

.changes-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--primary-color);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-color-dark);
  border-color: var(--primary-color-dark);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--gray-100);
  color: var(--gray-700);
  border-color: var(--gray-300);
}

.btn-secondary:hover {
  background: var(--gray-200);
  border-color: var(--gray-400);
}

.btn-outline {
  background: transparent;
  color: var(--gray-600);
  border-color: var(--gray-300);
}

.btn-outline:hover {
  background: var(--gray-50);
  color: var(--gray-700);
}

/* 表格容器 */
.table-container {
  flex: 1;
  overflow: auto;
  position: relative;
}

/* 表格头部 */
.table-header {
  position: sticky;
  top: 0;
  background: var(--gray-50);
  border-bottom: 2px solid var(--border-color);
  z-index: 10;
}

.header-row {
  display: flex;
  min-width: fit-content;
}

.header-cell {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--gray-700);
  border-right: 1px solid var(--border-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.column-name {
  font-weight: 600;
  color: var(--gray-800);
}

.column-type {
  font-size: 9px;
  color: var(--gray-500);
  font-weight: 400;
  background: var(--gray-100);
  padding: 1px 4px;
  border-radius: 2px;
  align-self: flex-start;
}

/* 表格主体 */
.table-body {
  position: relative;
  width: 100%;
}

.visible-rows {
  position: absolute;
  top: 0;
  width: 100%;
}

.table-row {
  display: flex;
  min-width: fit-content;
  border-bottom: 1px solid var(--gray-200);
  transition: background-color 0.2s ease;
}

.table-row:hover {
  background: var(--gray-25);
}

.table-row.even {
  background: rgba(0, 0, 0, 0.01);
}

.table-row.even:hover {
  background: var(--gray-25);
}

.table-row.modified {
  background: rgba(59, 130, 246, 0.05);
}

.table-row.modified:hover {
  background: rgba(59, 130, 246, 0.1);
}

/* 表格单元格 */
.table-cell {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-color);
  border-right: 1px solid var(--gray-200);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

.table-cell:hover:not(.cell-readonly) {
  background: rgba(59, 130, 246, 0.1);
  cursor: pointer;
}

.cell-editing {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid var(--primary-color);
  z-index: 5;
}

.cell-modified {
  background: rgba(59, 130, 246, 0.1);
}

.cell-readonly {
  background: var(--gray-50);
  color: var(--gray-500);
  cursor: not-allowed;
}

.cell-display {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.cell-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modified-indicator {
  color: var(--primary-color);
  font-weight: bold;
  font-size: 14px;
}

.readonly-indicator {
  font-size: 10px;
  opacity: 0.7;
}

/* 编辑提示 */
.edit-hint {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  z-index: 20;
  max-width: 300px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 自定义滚动条 */
.table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: var(--gray-100);
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .edit-toolbar {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .toolbar-actions {
    justify-content: center;
  }
  
  .header-cell,
  .table-cell {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .edit-hint {
    position: relative;
    bottom: auto;
    right: auto;
    margin: 8px;
  }
}
</style>