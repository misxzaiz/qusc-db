<template>
  <!-- 智能补全面板组件 -->
  <div 
    v-if="show && suggestions.length > 0"
    class="completion-panel"
    :style="panelStyle"
    @mousedown.prevent
  >
    <div class="completion-header">
      <span class="completion-count">{{ suggestions.length }} 项建议</span>
      <div class="completion-controls">
        <span class="completion-hint">↑↓ 选择 • Tab 确认 • Esc 取消</span>
      </div>
    </div>
    
    <div 
      class="completion-list"
      ref="listElement"
    >
      <div
        v-for="(suggestion, index) in displaySuggestions"
        :key="`${suggestion.type}-${suggestion.label}-${index}`"
        :class="[
          'completion-item',
          {
            'selected': index === selectedIndex,
            'highlighted': index === hoveredIndex
          }
        ]"
        @click="selectSuggestion(index)"
        @mouseenter="hoveredIndex = index"
        @mouseleave="hoveredIndex = -1"
      >
        <div class="completion-icon">
          <i :class="getIconClass(suggestion)"></i>
        </div>
        
        <div class="completion-content">
          <div class="completion-label">
            <span class="label-text" v-html="highlightMatch(suggestion.label)"></span>
            <span v-if="suggestion.metadata?.tableOrigin" class="table-origin">
              · {{ suggestion.metadata.tableOrigin }}
            </span>
          </div>
          
          <div class="completion-info">
            {{ suggestion.info }}
          </div>
          
          <div v-if="suggestion.detail" class="completion-detail">
            {{ suggestion.detail }}
          </div>
        </div>
        
        <div class="completion-meta">
          <span v-if="suggestion.type" class="completion-type">
            {{ getTypeLabel(suggestion.type) }}
          </span>
          <span v-if="suggestion.metadata?.isPrimaryKey" class="primary-key-badge">
            PK
          </span>
          <span v-if="suggestion.metadata?.isForeignKey" class="foreign-key-badge">
            FK
          </span>
        </div>
      </div>
    </div>
    
    <!-- 详细信息面板 -->
    <div 
      v-if="selectedSuggestion && selectedSuggestion.documentation"
      class="completion-documentation"
    >
      <div class="doc-header">详细信息</div>
      <div class="doc-content" v-html="formatDocumentation(selectedSuggestion.documentation)"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  suggestions: {
    type: Array,
    default: () => []
  },
  selectedIndex: {
    type: Number,
    default: 0
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  maxItems: {
    type: Number,
    default: 15
  },
  query: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'select',
  'cancel',
  'navigate-up',
  'navigate-down'
])

// 状态
const listElement = ref(null)
const hoveredIndex = ref(-1)

// 计算属性
const displaySuggestions = computed(() => {
  return props.suggestions.slice(0, props.maxItems)
})

const selectedSuggestion = computed(() => {
  if (props.selectedIndex >= 0 && props.selectedIndex < displaySuggestions.value.length) {
    return displaySuggestions.value[props.selectedIndex]
  }
  return null
})

const panelStyle = computed(() => {
  const maxHeight = Math.min(displaySuggestions.value.length * 60 + 100, 400)
  
  return {
    position: 'absolute',
    left: `${props.position.x}px`,
    top: `${props.position.y}px`,
    maxHeight: `${maxHeight}px`,
    zIndex: 1000
  }
})

// 方法
const selectSuggestion = (index) => {
  if (index >= 0 && index < displaySuggestions.value.length) {
    emit('select', displaySuggestions.value[index], index)
  }
}

const getIconClass = (suggestion) => {
  const iconMap = {
    'icon-table': 'fas fa-table',
    'icon-view': 'fas fa-eye',
    'icon-column': 'fas fa-columns',
    'icon-key': 'fas fa-key',
    'icon-foreign-key': 'fas fa-link',
    'icon-number': 'fas fa-hashtag',
    'icon-text': 'fas fa-font',
    'icon-date': 'fas fa-calendar',
    'icon-boolean': 'fas fa-toggle-on',
    'icon-json': 'fas fa-code',
    'icon-keyword': 'fas fa-code',
    'icon-function': 'fas fa-code',
    'icon-clause': 'fas fa-align-left',
    'icon-operator': 'fas fa-plus',
    'icon-statement': 'fas fa-play'
  }
  
  return iconMap[suggestion.iconClass] || 'fas fa-question-circle'
}

const getTypeLabel = (type) => {
  const typeMap = {
    table: '表',
    column: '字段',
    keyword: '关键字',
    function: '函数'
  }
  
  return typeMap[type] || type
}

const highlightMatch = (text) => {
  if (!props.query) return text
  
  const query = props.query.toLowerCase()
  const lowerText = text.toLowerCase()
  const index = lowerText.indexOf(query)
  
  if (index === -1) return text
  
  const before = text.substring(0, index)
  const match = text.substring(index, index + props.query.length)
  const after = text.substring(index + props.query.length)
  
  return `${before}<mark class="completion-match">${match}</mark>${after}`
}

const formatDocumentation = (doc) => {
  return doc.replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/```sql\n(.*?)\n```/gs, '<pre class="sql-example">$1</pre>')
}

// 滚动到选中项
const scrollToSelected = () => {
  nextTick(() => {
    if (!listElement.value) return
    
    const selectedElement = listElement.value.children[props.selectedIndex]
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  })
}

// 监听器
watch(() => props.selectedIndex, scrollToSelected)
watch(() => props.show, (show) => {
  if (show) {
    nextTick(scrollToSelected)
  }
})

// 键盘事件处理
const handleKeyDown = (event) => {
  if (!props.show) return
  
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      emit('navigate-up')
      break
    case 'ArrowDown':
      event.preventDefault()  
      emit('navigate-down')
      break
    case 'Tab':
    case 'Enter':
      event.preventDefault()
      if (selectedSuggestion.value) {
        selectSuggestion(props.selectedIndex)
      }
      break
    case 'Escape':
      event.preventDefault()
      emit('cancel')
      break
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.completion-panel {
  background: var(--bg-color, #ffffff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  font-family: var(--font-family, 'Monaco, Menlo, Ubuntu Mono, monospace');
  width: 400px;
  backdrop-filter: blur(8px);
}

.completion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--gray-50, #f9fafb);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.completion-count {
  font-size: 12px;
  color: var(--gray-600, #6b7280);
  font-weight: 500;
}

.completion-hint {
  font-size: 10px;
  color: var(--gray-500, #9ca3af);
}

.completion-list {
  max-height: 300px;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.completion-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--gray-100, #f3f4f6);
  transition: all 0.15s ease;
  min-height: 50px;
}

.completion-item:last-child {
  border-bottom: none;
}

.completion-item:hover,
.completion-item.highlighted {
  background: var(--gray-50, #f9fafb);
}

.completion-item.selected {
  background: var(--primary-color, #3b82f6);
  color: white;
}

.completion-item.selected .completion-info,
.completion-item.selected .completion-detail,
.completion-item.selected .table-origin {
  color: rgba(255, 255, 255, 0.8);
}

.completion-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
  margin-top: 2px;
}

.completion-icon i {
  font-size: 14px;
  color: var(--gray-500, #9ca3af);
}

.completion-item.selected .completion-icon i {
  color: rgba(255, 255, 255, 0.9);
}

.completion-content {
  flex: 1;
  min-width: 0;
}

.completion-label {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.table-origin {
  font-size: 11px;
  color: var(--gray-500, #9ca3af);
  font-weight: normal;
}

.completion-info {
  font-size: 12px;
  color: var(--gray-600, #6b7280);
  line-height: 1.3;
  margin-bottom: 2px;
}

.completion-detail {
  font-size: 11px;
  color: var(--gray-500, #9ca3af);
  line-height: 1.3;
}

.completion-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  margin-left: 8px;
  flex-shrink: 0;
}

.completion-type {
  font-size: 10px;
  color: var(--gray-400, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.primary-key-badge,
.foreign-key-badge {
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.primary-key-badge {
  background: var(--warning-color, #f59e0b);
  color: white;
}

.foreign-key-badge {
  background: var(--info-color, #3b82f6);
  color: white;
}

.completion-documentation {
  border-top: 1px solid var(--border-color, #e5e7eb);
  background: var(--gray-25, #fafafa);
  max-height: 150px;
  overflow-y: auto;
}

.doc-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-700, #4b5563);
  background: var(--gray-50, #f9fafb);
  border-bottom: 1px solid var(--gray-200, #e5e7eb);
}

.doc-content {
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--gray-600, #6b7280);
}

.doc-content :deep(strong) {
  font-weight: 600;
  color: var(--gray-800, #1f2937);
}

.doc-content :deep(code) {
  background: var(--gray-100, #f3f4f6);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 11px;
}

.doc-content :deep(.sql-example) {
  background: var(--gray-800, #1f2937);
  color: var(--gray-100, #f3f4f6);
  padding: 8px 12px;
  border-radius: 4px;
  margin: 8px 0;
  font-family: monospace;
  font-size: 11px;
  overflow-x: auto;
}

/* 匹配高亮 */
.completion-match {
  background: var(--warning-color, #fbbf24);
  color: var(--gray-900, #111827);
  font-weight: 600;
  padding: 1px 2px;
  border-radius: 2px;
}

.completion-item.selected .completion-match {
  background: rgba(255, 255, 255, 0.3);
  color: white;
}

/* 滚动条样式 */
.completion-list::-webkit-scrollbar,
.completion-documentation::-webkit-scrollbar {
  width: 6px;
}

.completion-list::-webkit-scrollbar-track,
.completion-documentation::-webkit-scrollbar-track {
  background: var(--gray-100, #f3f4f6);
}

.completion-list::-webkit-scrollbar-thumb,
.completion-documentation::-webkit-scrollbar-thumb {
  background: var(--gray-300, #d1d5db);
  border-radius: 3px;
}

.completion-list::-webkit-scrollbar-thumb:hover,
.completion-documentation::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400, #9ca3af);
}

/* 深色主题适配 */
[data-theme="dark"] .completion-panel {
  background: var(--bg-secondary, #1f2937);
  border-color: var(--border-color-dark, #374151);
}

[data-theme="dark"] .completion-header {
  background: var(--bg-tertiary, #111827);
  border-color: var(--border-color-dark, #374151);
}

[data-theme="dark"] .completion-item:hover,
[data-theme="dark"] .completion-item.highlighted {
  background: var(--bg-tertiary, #111827);
}

[data-theme="dark"] .completion-documentation {
  background: var(--bg-tertiary, #111827);
  border-color: var(--border-color-dark, #374151);
}

[data-theme="dark"] .doc-header {
  background: var(--bg-quaternary, #0f172a);
  border-color: var(--border-color-dark, #374151);
}

/* 动画效果 */
.completion-panel {
  animation: slideIn 0.15s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .completion-panel {
    width: 320px;
  }
  
  .completion-item {
    padding: 10px 12px;
  }
  
  .completion-label {
    font-size: 13px;
  }
  
  .completion-info {
    font-size: 11px;
  }
}
</style>