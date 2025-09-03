<template>
  <input
    ref="inputRef"
    v-model="editValue"
    type="number"
    class="inline-number-input"
    :class="{ 'has-error': hasError }"
    :placeholder="placeholder"
    :min="minValue"
    :max="maxValue"
    :step="stepValue"
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
    type: [String, Number],
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
const editValue = ref(props.value || '')
const hasError = ref(false)
const originalValue = ref(props.value)

// 计算属性
const dataType = computed(() => props.column.data_type?.toLowerCase() || '')

const isInteger = computed(() => {
  return dataType.value.includes('int') || 
         dataType.value.includes('integer')
})

const isDecimal = computed(() => {
  return dataType.value.includes('decimal') || 
         dataType.value.includes('float') || 
         dataType.value.includes('double')
})

const stepValue = computed(() => {
  if (isInteger.value) return '1'
  if (isDecimal.value) {
    const scale = props.column.numeric_scale || props.constraints.numeric_scale
    if (scale && scale > 0) {
      return (1 / Math.pow(10, scale)).toString()
    }
  }
  return '0.01'
})

const minValue = computed(() => {
  // 根据数据类型确定最小值
  if (dataType.value.includes('unsigned')) return '0'
  if (dataType.value.includes('tinyint')) return '-128'
  if (dataType.value.includes('smallint')) return '-32768'
  if (dataType.value.includes('mediumint')) return '-8388608'
  if (dataType.value.includes('int')) return '-2147483648'
  if (dataType.value.includes('bigint')) return '-9223372036854775808'
  return null
})

const maxValue = computed(() => {
  // 根据数据类型确定最大值
  if (dataType.value.includes('unsigned')) {
    if (dataType.value.includes('tinyint')) return '255'
    if (dataType.value.includes('smallint')) return '65535'
    if (dataType.value.includes('mediumint')) return '16777215'
    if (dataType.value.includes('int')) return '4294967295'
    if (dataType.value.includes('bigint')) return '18446744073709551615'
  } else {
    if (dataType.value.includes('tinyint')) return '127'
    if (dataType.value.includes('smallint')) return '32767'
    if (dataType.value.includes('mediumint')) return '8388607'
    if (dataType.value.includes('int')) return '2147483647'
    if (dataType.value.includes('bigint')) return '9223372036854775807'
  }
  return null
})

const placeholder = computed(() => {
  if (props.constraints.not_null) {
    return '必填数字'
  }
  if (isInteger.value) {
    return '输入整数...'
  }
  return '输入数字...'
})

// 方法
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
  if (value === '' || value == null) {
    if (props.constraints.not_null) {
      hasError.value = true
      return false
    }
    return true
  }
  
  // 数字格式验证
  const numValue = Number(value)
  if (isNaN(numValue)) {
    hasError.value = true
    return false
  }
  
  // 整数验证
  if (isInteger.value && !Number.isInteger(numValue)) {
    hasError.value = true
    return false
  }
  
  // 范围验证
  if (minValue.value !== null && numValue < Number(minValue.value)) {
    hasError.value = true
    return false
  }
  
  if (maxValue.value !== null && numValue > Number(maxValue.value)) {
    hasError.value = true
    return false
  }
  
  // 精度验证（小数位数）
  if (isDecimal.value) {
    const scale = props.column.numeric_scale || props.constraints.numeric_scale
    if (scale && scale >= 0) {
      const decimalPlaces = (value.toString().split('.')[1] || '').length
      if (decimalPlaces > scale) {
        hasError.value = true
        return false
      }
    }
  }
  
  return true
}

const save = () => {
  if (!validate()) {
    nextTick(() => inputRef.value?.focus())
    return false
  }
  
  const currentValue = editValue.value === '' ? null : Number(editValue.value)
  const originalNum = originalValue.value === '' || originalValue.value == null ? 
    null : Number(originalValue.value)
  
  if (currentValue !== originalNum) {
    emit('save', currentValue)
  } else {
    emit('cancel')
  }
  return true
}

const cancel = () => {
  editValue.value = originalValue.value
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
  editValue.value = newValue
  originalValue.value = newValue
})

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
.inline-number-input {
  width: 100%;
  height: 100%;
  border: 2px solid #10b981;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
  line-height: 1.4;
  background: #ffffff;
  color: #1f2937;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
  outline: none;
  transition: all 0.15s ease;
  text-align: right; /* 数字右对齐 */
  font-family: 'Consolas', 'Monaco', monospace; /* 等宽字体 */
}

.inline-number-input:focus {
  border-color: #059669;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

.inline-number-input.has-error {
  border-color: #ef4444;
  background-color: #fef2f2;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
}

.inline-number-input.has-error:focus {
  border-color: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

.inline-number-input::placeholder {
  color: #9ca3af;
  font-style: italic;
  text-align: left;
}

/* 移除浏览器默认的数字输入框箭头 */
.inline-number-input::-webkit-outer-spin-button,
.inline-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.inline-number-input[type=number] {
  -moz-appearance: textfield;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .inline-number-input {
    border-width: 3px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .inline-number-input {
    transition: none;
  }
}
</style>