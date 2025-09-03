<template>
  <input
    ref="inputRef"
    v-model="editValue"
    :type="inputType"
    class="inline-datetime-input"
    :class="{ 'has-error': hasError }"
    :placeholder="placeholder"
    @blur="handleBlur"
    @keydown="handleKeydown"
    @input="handleInput"
    @focus="handleFocus"
  />
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  value: {
    type: [String, Date],
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
  autoFocus: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['save', 'cancel', 'navigate'])

// 响应式数据
const inputRef = ref(null)
const editValue = ref('')
const hasError = ref(false)
const originalValue = ref(props.value)

// 计算属性
const dataType = computed(() => props.column.data_type?.toLowerCase() || '')

const inputType = computed(() => {
  if (dataType.value.includes('datetime') || dataType.value.includes('timestamp')) {
    return 'datetime-local'
  }
  if (dataType.value.includes('time')) {
    return 'time'
  }
  return 'date'
})

const placeholder = computed(() => {
  if (props.constraints.not_null) {
    return '必填日期'
  }
  
  switch (inputType.value) {
    case 'datetime-local':
      return 'YYYY-MM-DD HH:mm:ss'
    case 'time':
      return 'HH:mm:ss'
    default:
      return 'YYYY-MM-DD'
  }
})

// 方法
const formatValueForInput = (value) => {
  if (!value) return ''
  
  try {
    let dateObj
    if (value instanceof Date) {
      dateObj = value
    } else if (typeof value === 'string') {
      dateObj = new Date(value)
    } else {
      return ''
    }
    
    if (isNaN(dateObj.getTime())) return ''
    
    switch (inputType.value) {
      case 'datetime-local':
        // HTML datetime-local 格式: YYYY-MM-DDTHH:mm:ss
        return dateObj.toISOString().slice(0, 19)
      case 'time':
        // HTML time 格式: HH:mm:ss
        return dateObj.toTimeString().slice(0, 8)
      default:
        // HTML date 格式: YYYY-MM-DD
        return dateObj.toISOString().slice(0, 10)
    }
  } catch (error) {
    console.warn('日期格式化失败:', error)
    return ''
  }
}

const formatValueForDatabase = (value) => {
  if (!value) return null
  
  try {
    const dateObj = new Date(value)
    if (isNaN(dateObj.getTime())) return null
    
    switch (dataType.value) {
      case 'date':
        return dateObj.toISOString().slice(0, 10)
      case 'time':
        return dateObj.toTimeString().slice(0, 8)
      case 'datetime':
      case 'timestamp':
        return dateObj.toISOString().slice(0, 19).replace('T', ' ')
      default:
        return dateObj.toISOString()
    }
  } catch (error) {
    console.warn('日期转换失败:', error)
    return null
  }
}

const handleFocus = () => {
  hasError.value = false
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.select()
    }
  })
}

const handleInput = () => {
  hasError.value = false
}

const handleBlur = () => {
  save()
}

const handleKeydown = (event) => {
  const { key, shiftKey, ctrlKey, metaKey } = event
  
  event.stopPropagation()
  
  switch (key) {
    case 'Enter':
      event.preventDefault()
      save()
      emit('navigate', { direction: 'down', save: true })
      break
      
    case 'Tab':
      event.preventDefault()
      save()
      emit('navigate', { 
        direction: shiftKey ? 'left' : 'right', 
        save: true 
      })
      break
      
    case 'Escape':
      event.preventDefault()
      cancel()
      break
      
    case 'ArrowUp':
      if (ctrlKey || metaKey) {
        event.preventDefault()
        save()
        emit('navigate', { direction: 'up', save: true })
      }
      break
      
    case 'ArrowDown':
      if (ctrlKey || metaKey) {
        event.preventDefault()
        save()
        emit('navigate', { direction: 'down', save: true })
      }
      break
  }
}

const validate = () => {
  const value = editValue.value
  
  // 空值验证
  if (!value) {
    if (props.constraints.not_null) {
      hasError.value = true
      return false
    }
    return true
  }
  
  // 日期格式验证
  const dateObj = new Date(value)
  if (isNaN(dateObj.getTime())) {
    hasError.value = true
    return false
  }
  
  // 可以添加更多的日期范围验证
  // 例如：不能是未来日期、不能早于某个日期等
  
  return true
}

const save = () => {
  if (!validate()) {
    nextTick(() => inputRef.value?.focus())
    return false
  }
  
  const currentValue = formatValueForDatabase(editValue.value)
  const originalFormatted = formatValueForDatabase(originalValue.value)
  
  if (currentValue !== originalFormatted) {
    emit('save', currentValue)
  } else {
    emit('cancel')
  }
  return true
}

const cancel = () => {
  editValue.value = formatValueForInput(originalValue.value)
  hasError.value = false
  emit('cancel')
}

const focus = () => {
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      inputRef.value.select()
    }
  })
}

// 监听 props.value 变化
watch(() => props.value, (newValue) => {
  editValue.value = formatValueForInput(newValue)
  originalValue.value = newValue
}, { immediate: true })

// 组件挂载时自动聚焦
onMounted(() => {
  if (props.autoFocus) {
    focus()
  }
})

// 暴露方法给父组件
defineExpose({
  focus,
  save,
  cancel,
  validate
})
</script>

<style scoped>
.inline-datetime-input {
  width: 100%;
  height: 100%;
  border: 2px solid #8b5cf6;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
  line-height: 1.4;
  background: #ffffff;
  color: #1f2937;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
  outline: none;
  transition: all 0.15s ease;
  font-family: 'Consolas', 'Monaco', monospace;
}

.inline-datetime-input:focus {
  border-color: #7c3aed;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
}

.inline-datetime-input.has-error {
  border-color: #ef4444;
  background-color: #fef2f2;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
}

.inline-datetime-input.has-error:focus {
  border-color: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

.inline-datetime-input::placeholder {
  color: #9ca3af;
  font-style: italic;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .inline-datetime-input {
    border-width: 3px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .inline-datetime-input {
    transition: none;
  }
}
</style>