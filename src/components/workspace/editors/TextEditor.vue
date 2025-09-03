<template>
  <div class="text-editor">
    <!-- 多行文本编辑器 -->
    <textarea
      v-if="isMultiline"
      ref="textareaRef"
      v-model="localValue"
      :maxlength="maxLength"
      :placeholder="placeholder"
      :rows="textareaRows"
      class="textarea-input"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="handleKeydown"
    />
    
    <!-- 单行文本编辑器 -->
    <input
      v-else
      ref="inputRef"
      type="text"
      v-model="localValue"
      :maxlength="maxLength"
      :placeholder="placeholder"
      class="text-input"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="handleKeydown"
    />
    
    <!-- 字符计数和工具栏 -->
    <div class="text-editor-footer">
      <div class="char-count" v-if="showCharCount">
        <span :class="{ warning: isNearLimit, error: isOverLimit }">
          {{ localValue.length }}
        </span>
        <span v-if="maxLength"> / {{ maxLength }}</span>
      </div>
      
      <div class="text-tools">
        <button 
          v-if="isMultiline"
          @click="toggleWrap"
          class="tool-btn"
          :class="{ active: wordWrap }"
          title="切换自动换行"
        >
          📄
        </button>
        <button 
          @click="clearText"
          class="tool-btn"
          title="清空内容"
          v-if="localValue"
        >
          🗑️
        </button>
        <button 
          @click="setNull"
          class="tool-btn"
          title="设为NULL"
        >
          ∅
        </button>
      </div>
    </div>
    
    <!-- 文本统计信息 -->
    <div class="text-stats" v-if="showStats && localValue">
      <span class="stat-item">字符: {{ localValue.length }}</span>
      <span class="stat-item" v-if="isMultiline">行数: {{ lineCount }}</span>
      <span class="stat-item" v-if="wordCount > 0">词数: {{ wordCount }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, null],
    default: ''
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
    type: [String, null],
    default: ''
  }
})

const emit = defineEmits([
  'update:modelValue',
  'validate'
])

// 引用
const inputRef = ref(null)
const textareaRef = ref(null)

// 响应式数据
const localValue = ref(props.modelValue || '')
const wordWrap = ref(true)
const isFocused = ref(false)

// 计算属性
const maxLength = computed(() => {
  return props.constraints.max_length || props.constraints.character_maximum_length || null
})

const isMultiline = computed(() => {
  const dataType = (props.column.data_type || '').toLowerCase()
  return dataType.includes('text') || 
         dataType.includes('longtext') || 
         dataType.includes('mediumtext') ||
         (localValue.value && localValue.value.includes('\n')) ||
         (localValue.value && localValue.value.length > 100)
})

const placeholder = computed(() => {
  const dataType = props.column.data_type
  if (dataType) {
    return `输入 ${dataType} 类型的值...`
  }
  return '输入文本内容...'
})

const showCharCount = computed(() => {
  return maxLength.value || localValue.value.length > 50
})

const showStats = computed(() => {
  return isFocused.value && localValue.value && localValue.value.length > 20
})

const isNearLimit = computed(() => {
  if (!maxLength.value) return false
  return localValue.value.length > maxLength.value * 0.8
})

const isOverLimit = computed(() => {
  if (!maxLength.value) return false
  return localValue.value.length > maxLength.value
})

const textareaRows = computed(() => {
  if (!localValue.value) return 3
  const lines = localValue.value.split('\n').length
  return Math.min(Math.max(lines, 3), 10)
})

const lineCount = computed(() => {
  if (!localValue.value) return 1
  return localValue.value.split('\n').length
})

const wordCount = computed(() => {
  if (!localValue.value) return 0
  return localValue.value.trim().split(/\s+/).filter(word => word.length > 0).length
})

// 方法
const handleInput = () => {
  emit('update:modelValue', localValue.value)
  validateValue()
}

const handleFocus = () => {
  isFocused.value = true
  
  // 自动选中已有内容
  nextTick(() => {
    const element = inputRef.value || textareaRef.value
    if (element && localValue.value) {
      element.select()
    }
  })
}

const handleBlur = () => {
  isFocused.value = false
  validateValue()
}

const handleKeydown = (event) => {
  // Tab键在多行文本中插入制表符
  if (event.key === 'Tab' && isMultiline.value) {
    event.preventDefault()
    const start = event.target.selectionStart
    const end = event.target.selectionEnd
    
    localValue.value = localValue.value.substring(0, start) + 
                      '\t' + 
                      localValue.value.substring(end)
    
    nextTick(() => {
      event.target.selectionStart = event.target.selectionEnd = start + 1
    })
  }
}

const validateValue = () => {
  const errors = []
  
  // 长度验证
  if (maxLength.value && localValue.value.length > maxLength.value) {
    errors.push(`文本长度不能超过 ${maxLength.value} 个字符`)
  }
  
  // 非空验证
  if (props.constraints.not_null && (!localValue.value || localValue.value.trim() === '')) {
    errors.push('此字段不能为空')
  }
  
  emit('validate', errors)
}

const toggleWrap = () => {
  wordWrap.value = !wordWrap.value
}

const clearText = () => {
  localValue.value = ''
  emit('update:modelValue', '')
  validateValue()
  focusInput()
}

const setNull = () => {
  localValue.value = ''
  emit('update:modelValue', null)
  validateValue()
  focusInput()
}

const focusInput = () => {
  nextTick(() => {
    const element = inputRef.value || textareaRef.value
    if (element) {
      element.focus()
    }
  })
}

// 生命周期
onMounted(() => {
  focusInput()
  validateValue()
})

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue || ''
}, { immediate: true })
</script>

<style scoped>
.text-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 300px;
}

.text-input,
.textarea-input {
  width: 100%;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: var(--font-mono, 'Monaco', monospace);
  color: var(--text-color);
  background: white;
  transition: all 0.2s ease;
  resize: vertical;
}

.text-input:focus,
.textarea-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.textarea-input {
  min-height: 80px;
  max-height: 300px;
  line-height: 1.4;
}

.textarea-input.no-wrap {
  white-space: nowrap;
  overflow-x: auto;
}

.text-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.char-count {
  color: var(--gray-600);
  font-family: var(--font-mono, monospace);
}

.char-count .warning {
  color: var(--orange-600);
  font-weight: 600;
}

.char-count .error {
  color: var(--red-600);
  font-weight: 600;
}

.text-tools {
  display: flex;
  gap: 4px;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--gray-300);
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  color: var(--gray-600);
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: var(--gray-100);
  border-color: var(--gray-400);
  color: var(--gray-800);
}

.tool-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.text-stats {
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: var(--gray-500);
  padding: 4px 8px;
  background: var(--gray-50);
  border-radius: 3px;
  border: 1px solid var(--gray-200);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* 占位符样式 */
.text-input::placeholder,
.textarea-input::placeholder {
  color: var(--gray-400);
  font-style: italic;
}

/* 选中文本样式 */
.text-input::selection,
.textarea-input::selection {
  background: rgba(59, 130, 246, 0.2);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .text-editor {
    min-width: 260px;
  }
  
  .text-input,
  .textarea-input {
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .text-stats {
    flex-direction: column;
    gap: 4px;
  }
}
</style>