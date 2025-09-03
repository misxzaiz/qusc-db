<template>
  <div class="json-editor">
    <!-- JSON编辑器主体 -->
    <div class="json-input-container">
      <textarea
        ref="textareaRef"
        v-model="localValue"
        :placeholder="placeholder"
        class="json-textarea"
        :class="{ 
          error: hasJsonError, 
          'syntax-highlight': showSyntaxHighlight 
        }"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
        @scroll="syncScroll"
      />
      
      <!-- 语法高亮背景层（可选实现） -->
      <div 
        v-if="showSyntaxHighlight"
        class="syntax-highlight-bg"
        ref="highlightRef"
      />
    </div>
    
    <!-- JSON工具栏 -->
    <div class="json-toolbar">
      <div class="json-info">
        <span class="json-status" :class="{ valid: isValidJson, invalid: hasJsonError }">
          {{ jsonStatusText }}
        </span>
        <span v-if="localValue" class="char-count">{{ localValue.length }} 字符</span>
      </div>
      
      <div class="json-tools">
        <button 
          @click="formatJson"
          :disabled="hasJsonError || !localValue"
          class="tool-btn format-btn"
          title="格式化JSON"
        >
          🎨 格式化
        </button>
        <button 
          @click="compactJson"
          :disabled="hasJsonError || !localValue"
          class="tool-btn compact-btn"
          title="压缩JSON"
        >
          📦 压缩
        </button>
        <button 
          @click="validateJson"
          class="tool-btn validate-btn"
          title="验证JSON"
        >
          ✅ 验证
        </button>
        <button 
          @click="clearJson"
          v-if="localValue"
          class="tool-btn clear-btn"
          title="清空内容"
        >
          🗑️ 清空
        </button>
        <button 
          @click="setNull"
          class="tool-btn null-btn"
          title="设为NULL"
        >
          ∅ NULL
        </button>
      </div>
    </div>
    
    <!-- JSON错误信息 -->
    <div class="json-errors" v-if="jsonError">
      <div class="error-header">
        <span class="error-icon">❌</span>
        <span class="error-title">JSON语法错误</span>
      </div>
      <div class="error-message">{{ jsonError }}</div>
      <div class="error-location" v-if="errorLocation">
        位置: 第 {{ errorLocation.line }} 行，第 {{ errorLocation.column }} 列
      </div>
    </div>
    
    <!-- JSON预览 -->
    <div class="json-preview" v-if="showPreview && isValidJson">
      <div class="preview-header">
        <span class="preview-title">📋 JSON预览</span>
        <button @click="togglePreview" class="preview-toggle">
          {{ expandedPreview ? '收起' : '展开' }}
        </button>
      </div>
      <div class="preview-content" :class="{ expanded: expandedPreview }">
        <JsonTreeView 
          :json-data="parsedJson"
          :max-depth="expandedPreview ? 10 : 3"
        />
      </div>
    </div>
    
    <!-- JSON快捷模板 -->
    <div class="json-templates" v-if="showTemplates">
      <div class="templates-header">💡 快捷模板:</div>
      <div class="template-buttons">
        <button 
          v-for="template in jsonTemplates"
          :key="template.name"
          @click="applyTemplate(template)"
          class="template-btn"
          :title="template.description"
        >
          {{ template.icon }} {{ template.name }}
        </button>
      </div>
    </div>
    
    <!-- 键盘快捷键提示 -->
    <div class="keyboard-shortcuts" v-if="isFocused && showShortcuts">
      <div class="shortcuts-title">⌨️ 快捷键:</div>
      <div class="shortcuts-list">
        <span class="shortcut-item"><kbd>Ctrl+Alt+F</kbd> 格式化</span>
        <span class="shortcut-item"><kbd>Ctrl+Alt+C</kbd> 压缩</span>
        <span class="shortcut-item"><kbd>Ctrl+Alt+V</kbd> 验证</span>
        <span class="shortcut-item"><kbd>Tab</kbd> 插入缩进</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Object, Array, null],
    default: null
  },
  column: {
    type: Object,
    required: true
  },
  constraints: {
    type: Object,
    default: () => ({})
  },
  originalValue: {
    type: [String, Object, Array, null],
    default: null
  }
})

const emit = defineEmits([
  'update:modelValue',
  'validate'
])

// 引用
const textareaRef = ref(null)
const highlightRef = ref(null)

// 响应式数据
const localValue = ref('')
const isFocused = ref(false)
const jsonError = ref('')
const errorLocation = ref(null)
const showPreview = ref(false)
const expandedPreview = ref(false)
const showTemplates = ref(false)
const showShortcuts = ref(false)
const showSyntaxHighlight = ref(false)

// 计算属性
const placeholder = computed(() => {
  return '输入JSON格式的数据...\n例如: {"name": "value", "array": [1, 2, 3]}'
})

const isValidJson = computed(() => {
  return !hasJsonError.value && localValue.value && localValue.value.trim()
})

const hasJsonError = computed(() => {
  return Boolean(jsonError.value)
})

const jsonStatusText = computed(() => {
  if (!localValue.value || !localValue.value.trim()) {
    return '空内容'
  }
  if (hasJsonError.value) {
    return '语法错误'
  }
  return '格式正确'
})

const parsedJson = computed(() => {
  if (!isValidJson.value) return null
  
  try {
    return JSON.parse(localValue.value)
  } catch (e) {
    return null
  }
})

const jsonTemplates = computed(() => [
  {
    name: '对象',
    icon: '{}',
    description: '空JSON对象',
    content: '{\n  \n}'
  },
  {
    name: '数组',
    icon: '[]',
    description: '空JSON数组',
    content: '[\n  \n]'
  },
  {
    name: '用户',
    icon: '👤',
    description: '用户信息模板',
    content: JSON.stringify({
      id: 1,
      name: "用户名",
      email: "user@example.com",
      created_at: new Date().toISOString()
    }, null, 2)
  },
  {
    name: '配置',
    icon: '⚙️',
    description: '配置信息模板',
    content: JSON.stringify({
      enabled: true,
      timeout: 5000,
      options: {
        debug: false,
        verbose: true
      }
    }, null, 2)
  }
])

// 方法
const handleInput = () => {
  validateJsonSyntax()
  emit('update:modelValue', localValue.value)
  validateValue()
}

const handleFocus = () => {
  isFocused.value = true
  showShortcuts.value = !localValue.value
  showTemplates.value = !localValue.value
  
  // 添加键盘快捷键监听
  document.addEventListener('keydown', handleGlobalKeydown)
}

const handleBlur = () => {
  isFocused.value = false
  showShortcuts.value = false
  showTemplates.value = false
  validateValue()
  
  // 移除键盘快捷键监听
  document.removeEventListener('keydown', handleGlobalKeydown)
}

const handleKeydown = (event) => {
  // Tab键插入缩进
  if (event.key === 'Tab') {
    event.preventDefault()
    const start = event.target.selectionStart
    const end = event.target.selectionEnd
    
    localValue.value = localValue.value.substring(0, start) + 
                      '  ' + 
                      localValue.value.substring(end)
    
    nextTick(() => {
      event.target.selectionStart = event.target.selectionEnd = start + 2
    })
  }
  
  // 自动配对括号
  const pairs = {
    '{': '}',
    '[': ']',
    '"': '"'
  }
  
  if (pairs[event.key]) {
    const start = event.target.selectionStart
    const end = event.target.selectionEnd
    
    if (start === end) { // 没有选中文本
      event.preventDefault()
      const closing = pairs[event.key]
      localValue.value = localValue.value.substring(0, start) + 
                        event.key + closing + 
                        localValue.value.substring(end)
      
      nextTick(() => {
        event.target.selectionStart = event.target.selectionEnd = start + 1
      })
    }
  }
}

const handleGlobalKeydown = (event) => {
  if (!isFocused.value) return
  
  if (event.ctrlKey && event.altKey) {
    switch (event.key.toLowerCase()) {
      case 'f':
        event.preventDefault()
        formatJson()
        break
      case 'c':
        event.preventDefault()
        compactJson()
        break
      case 'v':
        event.preventDefault()
        validateJson()
        break
    }
  }
}

const syncScroll = () => {
  // 同步语法高亮背景的滚动
  if (highlightRef.value && textareaRef.value) {
    highlightRef.value.scrollTop = textareaRef.value.scrollTop
    highlightRef.value.scrollLeft = textareaRef.value.scrollLeft
  }
}

const validateJsonSyntax = () => {
  jsonError.value = ''
  errorLocation.value = null
  
  if (!localValue.value || !localValue.value.trim()) {
    return
  }
  
  try {
    JSON.parse(localValue.value)
  } catch (e) {
    jsonError.value = e.message
    
    // 尝试解析错误位置
    const match = e.message.match(/position (\d+)/)
    if (match) {
      const position = parseInt(match[1])
      const lines = localValue.value.substring(0, position).split('\n')
      errorLocation.value = {
        line: lines.length,
        column: lines[lines.length - 1].length + 1
      }
    }
  }
}

const validateValue = () => {
  const errors = []
  
  if (!localValue.value || !localValue.value.trim()) {
    if (props.constraints.not_null) {
      errors.push('此字段不能为空')
    }
  } else if (hasJsonError.value) {
    errors.push('JSON格式不正确: ' + jsonError.value)
  }
  
  emit('validate', errors)
}

const formatJson = () => {
  if (!isValidJson.value) return
  
  try {
    const parsed = JSON.parse(localValue.value)
    localValue.value = JSON.stringify(parsed, null, 2)
    handleInput()
  } catch (e) {
    // 已经有错误处理
  }
}

const compactJson = () => {
  if (!isValidJson.value) return
  
  try {
    const parsed = JSON.parse(localValue.value)
    localValue.value = JSON.stringify(parsed)
    handleInput()
  } catch (e) {
    // 已经有错误处理
  }
}

const validateJson = () => {
  validateJsonSyntax()
  if (isValidJson.value) {
    showPreview.value = true
  }
}

const clearJson = () => {
  localValue.value = ''
  emit('update:modelValue', '')
  validateValue()
  showPreview.value = false
  focusInput()
}

const setNull = () => {
  localValue.value = ''
  emit('update:modelValue', null)
  validateValue()
  showPreview.value = false
  focusInput()
}

const togglePreview = () => {
  expandedPreview.value = !expandedPreview.value
}

const applyTemplate = (template) => {
  localValue.value = template.content
  handleInput()
  showTemplates.value = false
  focusInput()
}

const focusInput = () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
    }
  })
}

const parseValue = (value) => {
  if (value === null || value === undefined) return ''
  
  if (typeof value === 'string') {
    return value
  }
  
  try {
    return JSON.stringify(value, null, 2)
  } catch (e) {
    return String(value)
  }
}

// 简单的JSON树形视图组件
const JsonTreeView = {
  props: ['jsonData', 'maxDepth'],
  template: `
    <div class="json-tree">
      <pre class="json-content">{{ formattedJson }}</pre>
    </div>
  `,
  computed: {
    formattedJson() {
      try {
        return JSON.stringify(this.jsonData, null, 2)
      } catch (e) {
        return 'Invalid JSON'
      }
    }
  }
}

// 生命周期
onMounted(() => {
  focusInput()
  validateValue()
})

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  localValue.value = parseValue(newValue)
}, { immediate: true })
</script>

<style scoped>
.json-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 400px;
  max-width: 600px;
}

/* JSON输入容器 */
.json-input-container {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
}

.json-textarea {
  width: 100%;
  height: 300px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  font-size: 12px;
  font-family: var(--font-mono, 'Monaco', 'Consolas', monospace);
  color: var(--text-color);
  background: white;
  resize: vertical;
  min-height: 200px;
  max-height: 500px;
  line-height: 1.5;
  tab-size: 2;
  transition: all 0.2s ease;
}

.json-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.json-textarea.error {
  border-color: var(--red-500);
  background: rgba(239, 68, 68, 0.05);
}

.json-textarea.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

/* JSON工具栏 */
.json-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: 4px;
  font-size: 11px;
}

.json-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.json-status {
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 3px;
}

.json-status.valid {
  background: var(--green-100);
  color: var(--green-800);
}

.json-status.invalid {
  background: var(--red-100);
  color: var(--red-800);
}

.char-count {
  color: var(--gray-600);
  font-family: var(--font-mono, monospace);
}

.json-tools {
  display: flex;
  gap: 6px;
}

.tool-btn {
  padding: 4px 8px;
  border: 1px solid var(--gray-300);
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 2px;
}

.tool-btn:hover:not(:disabled) {
  background: var(--gray-100);
  border-color: var(--gray-400);
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--gray-50);
}

.format-btn:hover:not(:disabled) { background: var(--blue-100); }
.compact-btn:hover:not(:disabled) { background: var(--purple-100); }
.validate-btn:hover:not(:disabled) { background: var(--green-100); }
.clear-btn:hover:not(:disabled) { background: var(--red-100); }
.null-btn:hover:not(:disabled) { background: var(--gray-200); }

/* JSON错误信息 */
.json-errors {
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: 6px;
  padding: 12px;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.error-icon {
  font-size: 14px;
}

.error-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--red-800);
}

.error-message {
  font-size: 11px;
  color: var(--red-700);
  font-family: var(--font-mono, monospace);
  background: var(--red-100);
  padding: 6px 8px;
  border-radius: 3px;
  margin-bottom: 4px;
  word-break: break-all;
}

.error-location {
  font-size: 10px;
  color: var(--red-600);
  font-weight: 500;
}

/* JSON预览 */
.json-preview {
  background: var(--green-50);
  border: 1px solid var(--green-200);
  border-radius: 6px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--green-100);
  border-bottom: 1px solid var(--green-200);
}

.preview-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--green-800);
}

.preview-toggle {
  padding: 2px 8px;
  border: 1px solid var(--green-300);
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  color: var(--green-700);
}

.preview-content {
  max-height: 150px;
  overflow-y: auto;
  padding: 8px 12px;
}

.preview-content.expanded {
  max-height: 400px;
}

.json-tree {
  font-size: 11px;
}

.json-content {
  margin: 0;
  font-family: var(--font-mono, monospace);
  color: var(--green-800);
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
}

/* JSON模板 */
.json-templates {
  background: var(--blue-50);
  border: 1px solid var(--blue-200);
  border-radius: 6px;
  padding: 10px 12px;
}

.templates-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--blue-800);
  margin-bottom: 6px;
}

.template-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.template-btn {
  padding: 4px 10px;
  border: 1px solid var(--blue-300);
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  color: var(--blue-700);
  transition: all 0.2s ease;
}

.template-btn:hover {
  background: var(--blue-100);
  border-color: var(--blue-400);
}

/* 键盘快捷键 */
.keyboard-shortcuts {
  background: var(--purple-50);
  border: 1px solid var(--purple-200);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 10px;
}

.shortcuts-title {
  font-weight: 600;
  color: var(--purple-800);
  margin-bottom: 6px;
}

.shortcuts-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--purple-700);
}

.shortcut-item kbd {
  background: var(--purple-200);
  color: var(--purple-800);
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 9px;
  font-family: inherit;
}

/* 占位符样式 */
.json-textarea::placeholder {
  color: var(--gray-400);
  font-style: italic;
  line-height: 1.4;
}

/* 选中文本样式 */
.json-textarea::selection {
  background: rgba(59, 130, 246, 0.2);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .json-editor {
    min-width: 300px;
    max-width: 100%;
  }
  
  .json-textarea {
    height: 250px;
    padding: 10px;
    font-size: 11px;
  }
  
  .json-toolbar {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .json-tools {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .template-buttons,
  .shortcuts-list {
    flex-direction: column;
    gap: 4px;
  }
  
  .preview-content.expanded {
    max-height: 300px;
  }
}
</style>