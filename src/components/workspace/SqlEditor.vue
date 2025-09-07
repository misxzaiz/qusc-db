<template>
  <div class="sql-editor-container" :style="containerStyles">
    <div class="editor-header">
      <div class="editor-left">
        <slot name="connection-selector" />
      </div>
      
      <div class="editor-actions">
        <button 
          class="btn btn-secondary tooltip" 
          data-tooltip="格式化SQL"
          @click="formatCurrentSQL"
          :disabled="isFormatting"
        >
          <i :class="isFormatting ? 'fas fa-spinner fa-spin' : 'fas fa-palette'"></i>
        </button>
        <button
          class="btn btn-secondary tooltip" 
          data-tooltip="清空编辑器"
          @click="clearEditor"
        >
          <i class="fas fa-trash"></i>
        </button>
        
        <button 
          class="btn btn-primary" 
          @click="executeQuery"
          :disabled="!canExecute || isExecuting"
          :title="executeButtonTooltip"
        >
          <span v-html="executeButtonText"></span>
        </button>
      </div>
    </div>
    
    <div class="editor-container">
      <!-- CodeMirror 编辑器容器 -->
      <div 
        ref="editorElement" 
        class="codemirror-wrapper"
        :style="editorWrapperStyles"
      ></div>
      
      <!-- 智能补全面板 -->
      <CompletionPanel
        v-if="showCompletions"
        :show="showCompletions"
        :suggestions="completionSuggestions"
        :selected-index="selectedCompletionIndex"
        :position="completionPosition"
        :query="currentCompletionQuery"
        @select="onCompletionSelect"
        @cancel="hideCompletions"
        @navigate-up="navigateCompletionUp"
        @navigate-down="navigateCompletionDown"
      />
    </div>

    <div class="editor-status" :style="statusBarStyles">
      <div class="status-left">
        <span>行: {{ cursorInfo.line }}</span>
        <span>列: {{ cursorInfo.column }}</span>
        <span>字符: {{ characterCount }}</span>
        <span v-if="hasSelection" class="selection-indicator">
          • 已选择: {{ selectionLength }} 字符
        </span>
        <span v-if="showCompletions" class="completion-indicator">
          • 智能补全: {{ completionSuggestions.length }} 项建议
        </span>
      </div>
      <div class="status-right">
        <span class="sql-type-indicator" v-if="sqlStatementType">{{ sqlStatementType }}</span>
        <span v-if="isLoading" class="loading-indicator">
          <i class="fas fa-spinner fa-spin"></i> 加载中...
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useEditorConfig } from '@/composables/useEditorConfig'
import { useCodeMirror } from '@/composables/useCodeMirror'
import CompletionPanel from './CompletionPanel.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  height: {
    type: Number,
    default: 280
  },
  canExecute: {
    type: Boolean,
    default: false
  },
  isExecuting: {
    type: Boolean,
    default: false
  },
  dialect: {
    type: String,
    default: 'mysql'
  }
})

const emit = defineEmits([
  'update:modelValue',
  'clear-editor',
  'execute-query',
  'cursor-change',
  'selection-change'
])

// 编辑器配置
const { editorConfig, currentTheme } = useEditorConfig()

// CodeMirror编辑器
const editorElement = ref(null)
const cursorInfo = ref({ line: 1, column: 1, pos: 0 })
const selectionLength = ref(0)
const hasSelection = ref(false)

// 智能补全状态
const selectedCompletionIndex = ref(0)
const completionPosition = ref({ x: 0, y: 0 })
const currentCompletionQuery = ref('')

// 初始化CodeMirror
const {
  initEditor,
  getValue,
  setValue,
  getSelection,
  insertText,
  formatSQL,
  updateTheme,
  updateDialect,
  focus,
  getCursorInfo,
  isReady,
  isFormatting,
  // 智能补全相关
  triggerCompletion,
  getCompletionSuggestions,
  completionSuggestions,
  showCompletions,
  isLoading
} = useCodeMirror({
  dialect: props.dialect,
  theme: currentTheme.value.name === 'Visual Studio 深色' ? 'dark' : 'light',
  height: `${props.height}px`,
  fontSize: `${editorConfig.value.font.size}px`,
  fontFamily: editorConfig.value.font.family,
  autocomplete: editorConfig.value.behavior.autoComplete,
  onChange: (value) => {
    emit('update:modelValue', value)
    updateCursorInfo()
    // 触发智能补全检查
    checkForCompletion()
  },
  onExecute: (value) => {
    emit('execute-query')
  },
  onCompletionSelect: (suggestion) => {
    console.log('选择补全建议:', suggestion)
  }
})

// 计算属性
const characterCount = computed(() => props.modelValue.length)

const isMultiQuery = computed(() => {
  return props.modelValue.includes(';') && props.modelValue.split(';').filter(q => q.trim()).length > 1
})

const currentQueryPreview = computed(() => {
  if (!hasSelection.value && isMultiQuery.value) {
    const queries = props.modelValue.split(';').filter(q => q.trim())
    if (queries.length > 0) {
      const preview = queries[0].replace(/\s+/g, ' ').trim()
      return preview.length > 40 ? preview.substring(0, 40) + '...' : preview
    }
  }
  return ''
})

const executeButtonText = computed(() => {
  if (props.isExecuting) return '<i class="fas fa-spinner fa-spin"></i> 执行中...'
  if (hasSelection.value) return '<i class="fas fa-play"></i> 执行选中'
  if (isMultiQuery.value) return '<i class="fas fa-play"></i> 执行当前'
  return '<i class="fas fa-play"></i> 执行'
})

const executeButtonTooltip = computed(() => {
  if (props.isExecuting) return '正在执行查询...'
  if (hasSelection.value) {
    const selection = getSelection()
    const preview = selection.length > 50 ? selection.substring(0, 50) + '...' : selection
    return `执行选中的查询: ${preview}`
  }
  return '执行SQL查询 (Ctrl+Enter) - 智能模式'
})

// 检测SQL语句类型
const sqlStatementType = computed(() => {
  if (!props.modelValue) return ''
  
  const trimmed = props.modelValue.trim().toUpperCase()
  if (trimmed.startsWith('SELECT')) return 'SELECT'
  if (trimmed.startsWith('INSERT')) return 'INSERT'  
  if (trimmed.startsWith('UPDATE')) return 'UPDATE'
  if (trimmed.startsWith('DELETE')) return 'DELETE'
  if (trimmed.startsWith('CREATE')) return 'CREATE'
  if (trimmed.startsWith('ALTER')) return 'ALTER'
  if (trimmed.startsWith('DROP')) return 'DROP'
  if (trimmed.startsWith('--')) return 'COMMENT'
  return 'SQL'
})

// 样式计算
const containerStyles = computed(() => ({
  height: props.height + 'px',
  '--editor-bg': currentTheme.value.background,
  '--editor-fg': currentTheme.value.foreground,
  '--editor-border': currentTheme.value.lineNumber
}))

const editorWrapperStyles = computed(() => ({
  height: `${props.height - 80}px` // 减去头部和状态栏的高度
}))

const statusBarStyles = computed(() => ({
  background: currentTheme.value.background,
  borderTop: `1px solid ${currentTheme.value.lineNumber}`,
  color: currentTheme.value.foreground
}))

// 更新光标信息
const updateCursorInfo = () => {
  if (!isReady.value) return
  
  const info = getCursorInfo()
  cursorInfo.value = info
  
  const selection = getSelection()
  hasSelection.value = selection.length > 0
  selectionLength.value = selection.length
  
  emit('cursor-change', info)
  emit('selection-change', { hasSelection: hasSelection.value, selectedText: selection })
  
  // 更新补全面板位置
  updateCompletionPosition()
}

// 智能补全相关方法
const checkForCompletion = async () => {
  if (!isReady.value) return
  
  const sql = getValue()
  const cursor = getCursorInfo()
  
  // 检查是否需要自动触发补全
  const shouldTrigger = shouldTriggerCompletion(sql, cursor.pos)
  
  if (shouldTrigger) {
    await triggerSmartCompletion()
  }
}

const shouldTriggerCompletion = (sql, cursorPos) => {
  const beforeCursor = sql.slice(0, cursorPos)
  const lastChar = beforeCursor.slice(-1)
  
  // 在点号后、空格后、逗号后自动触发
  return lastChar === '.' || 
         /\s$/.test(beforeCursor) || 
         lastChar === ','
}

const triggerSmartCompletion = async () => {
  if (!isReady.value) return
  
  try {
    const sql = getValue()
    const cursor = getCursorInfo()
    
    // 获取当前查询词
    const beforeCursor = sql.slice(0, cursor.pos)
    const match = beforeCursor.match(/[\w.]*$/)
    currentCompletionQuery.value = match ? match[0] : ''
    
    // 触发补全
    await triggerCompletion()
    
    // 更新补全面板位置
    updateCompletionPosition()
  } catch (error) {
    console.error('触发智能补全失败:', error)
  }
}

const updateCompletionPosition = () => {
  if (!editorElement.value || !isReady.value) return
  
  try {
    const cursor = getCursorInfo()
    const editorRect = editorElement.value.getBoundingClientRect()
    
    // 简化的位置计算 - 在光标下方显示
    completionPosition.value = {
      x: editorRect.left + 50, // 简单的左边距
      y: editorRect.top + (cursor.line * 20) + 40 // 根据行号估算位置
    }
  } catch (error) {
    console.warn('更新补全位置失败:', error)
    // 使用默认位置
    const editorRect = editorElement.value.getBoundingClientRect()
    completionPosition.value = {
      x: editorRect.left + 50,
      y: editorRect.top + 100
    }
  }
}

const onCompletionSelect = (suggestion, index) => {
  console.log('选择补全项:', suggestion, index)
  
  // 这里CodeMirror会自动处理插入，我们只需要隐藏面板
  hideCompletions()
  
  // 重新聚焦编辑器
  nextTick(() => {
    focus()
  })
}

const hideCompletions = () => {
  // 补全状态由 useCodeMirror 管理，这里可以添加额外逻辑
  console.log('隐藏补全面板')
}

const navigateCompletionUp = () => {
  if (selectedCompletionIndex.value > 0) {
    selectedCompletionIndex.value--
  } else {
    selectedCompletionIndex.value = completionSuggestions.value.length - 1
  }
}

const navigateCompletionDown = () => {
  if (selectedCompletionIndex.value < completionSuggestions.value.length - 1) {
    selectedCompletionIndex.value++
  } else {
    selectedCompletionIndex.value = 0
  }
}

// 方法
const formatCurrentSQL = async () => {
  if (isReady.value) {
    try {
      await formatSQL()
    } catch (error) {
      console.error('格式化SQL失败:', error)
    }
  }
}

const clearEditor = () => {
  if (isReady.value) {
    setValue('')
    emit('clear-editor')
  }
}

const executeQuery = () => {
  // 实时获取选中状态，不依赖缓存的hasSelection.value
  const currentSelection = getSelection()
  const hasCurrentSelection = currentSelection && currentSelection.length > 0
  
  emit('execute-query', {
    hasSelection: hasCurrentSelection,
    selectedText: hasCurrentSelection ? currentSelection : null
  })
}

const focusEditor = () => {
  if (isReady.value) {
    focus()
  }
}

const insertTextAtCursor = (text) => {
  if (isReady.value) {
    insertText(text)
  }
}

// 监听器
watch(() => props.modelValue, (newValue) => {
  if (isReady.value && getValue() !== newValue) {
    setValue(newValue)
  }
}, { immediate: false })

watch(() => props.dialect, (newDialect) => {
  if (isReady.value) {
    updateDialect(newDialect)
  }
})

watch(currentTheme, (newTheme) => {
  if (isReady.value) {
    const themeName = newTheme.name === 'Visual Studio 深色' ? 'dark' : 'light'
    updateTheme(themeName)
  }
}, { deep: true })

watch(() => editorConfig.value.font, () => {
  // 字体变化时需要重新初始化编辑器
  if (isReady.value) {
    nextTick(() => {
      initializeEditor()
    })
  }
}, { deep: true })

// 初始化编辑器
const initializeEditor = () => {
  if (editorElement.value) {
    initEditor(editorElement.value, props.modelValue)
  }
}

onMounted(() => {
  nextTick(() => {
    initializeEditor()
  })
})

// 暴露方法
defineExpose({
  focus: focusEditor,
  insertText: insertTextAtCursor,
  getValue,
  setValue,
  getSelection,
  formatSQL: formatCurrentSQL,
  triggerCompletion: triggerSmartCompletion
})
</script>

<style scoped>
.sql-editor-container {
  border-bottom: 1px solid var(--border-color);
  background: var(--editor-bg, #ffffff);
  display: flex;
  flex-direction: column;
  min-height: 200px;
  width: 100%;
  flex: 1;
  min-width: 0;
  transition: all 0.2s ease;
}

.editor-header {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--gray-50);
  height: var(--toolbar-height);
}

.editor-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-container {
  flex: 1;
  display: flex;
  min-width: 0;
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* CodeMirror 包装器 */
.codemirror-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

/* CodeMirror 自定义样式 */
.codemirror-wrapper :deep(.cm-editor) {
  height: 100%;
  border-radius: 0;
  font-family: var(--font-family, 'Monaco, Menlo, Ubuntu Mono, monospace');
}

.codemirror-wrapper :deep(.cm-content) {
  padding: 12px;
  min-height: 100%;
  caret-color: var(--editor-fg, #000);
}

.codemirror-wrapper :deep(.cm-focused) {
  outline: none;
}

.codemirror-wrapper :deep(.cm-editor.cm-focused) {
  outline: none;
}

/* 行号样式 */
.codemirror-wrapper :deep(.cm-lineNumbers .cm-gutterElement) {
  color: var(--editor-border, #999999);
  font-family: var(--font-family, 'Monaco, Menlo, Ubuntu Mono, monospace');
}

.codemirror-wrapper :deep(.cm-activeLineGutter) {
  background-color: rgba(var(--primary-color-rgb, 59, 130, 246), 0.1);
}

/* 选择样式 */
.codemirror-wrapper :deep(.cm-selectionBackground) {
  background: var(--selection-color, rgba(59, 130, 246, 0.3)) !important;
}

.codemirror-wrapper :deep(.cm-focused .cm-selectionBackground) {
  background: var(--selection-color, rgba(59, 130, 246, 0.3)) !important;
}

/* 滚动条样式 */
.codemirror-wrapper :deep(.cm-scroller::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

.codemirror-wrapper :deep(.cm-scroller::-webkit-scrollbar-track) {
  background: var(--gray-100);
}

.codemirror-wrapper :deep(.cm-scroller::-webkit-scrollbar-thumb) {
  background: var(--gray-300);
  border-radius: 4px;
}

.codemirror-wrapper :deep(.cm-scroller::-webkit-scrollbar-thumb:hover) {
  background: var(--gray-400);
}

/* 状态栏 */
.editor-status {
  padding: 4px 16px;
  background: var(--gray-100);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--gray-600);
  height: 24px;
  flex-shrink: 0;
}

.status-left {
  display: flex;
  gap: 16px;
  align-items: center;
}

.status-right {
  display: flex;
  gap: 16px;
  align-items: center;
}

.selection-indicator {
  color: var(--success-color);
  font-weight: 500;
  background: rgba(34, 197, 94, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
}

.theme-indicator,
.font-indicator,
.sql-type-indicator {
  font-size: 10px;
  color: var(--gray-500);
  background: var(--gray-100);
  padding: 1px 4px;
  border-radius: 2px;
  font-weight: 500;
}

.sql-type-indicator {
  background: var(--primary-color);
  color: white;
  font-weight: 600;
}

.completion-indicator {
  color: var(--primary-color);
  font-weight: 500;
  background: rgba(var(--primary-color-rgb, 59, 130, 246), 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
}

.loading-indicator {
  color: var(--warning-color);
  font-weight: 500;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-status {
    font-size: 10px;
  }
  
  .status-left,
  .status-right {
    gap: 8px;
  }
}

/* 主题适配 */
[data-theme="dark"] .sql-editor-container {
  background: var(--bg-color);
}

[data-theme="dark"] .editor-status {
  background: var(--bg-secondary);
}

/* 高性能渲染优化 */
.codemirror-wrapper {
  will-change: scroll-position;
  contain: layout style paint;
}

/* 焦点状态 */
.sql-editor-container:focus-within {
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 59, 130, 246), 0.2);
}

/* CodeMirror 语法高亮主题适配 */
.codemirror-wrapper :deep(.cm-editor) {
  --cm-keyword-color: var(--keyword-color, #0066cc);
  --cm-string-color: var(--string-color, #008000);
  --cm-comment-color: var(--comment-color, #808080);
  --cm-number-color: var(--number-color, #0000ff);
  --cm-operator-color: var(--operator-color, #000000);
}
</style>