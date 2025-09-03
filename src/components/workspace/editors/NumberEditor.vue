<template>
  <div class="number-editor">
    <div class="number-input-group">
      <!-- 数字输入框 -->
      <input
        ref="inputRef"
        type="number"
        v-model.number="localValue"
        :min="minValue"
        :max="maxValue"
        :step="stepValue"
        :placeholder="placeholder"
        class="number-input"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @wheel="handleWheel"
      />
      
      <!-- 数字控制按钮 -->
      <div class="number-controls">
        <button 
          @click="increment"
          :disabled="!canIncrement"
          class="control-btn increment-btn"
          title="增加"
        >
          ⬆️
        </button>
        <button 
          @click="decrement"
          :disabled="!canDecrement"
          class="control-btn decrement-btn"
          title="减少"
        >
          ⬇️
        </button>
      </div>
    </div>
    
    <!-- 范围信息和工具 -->
    <div class="number-footer">
      <div class="range-info" v-if="hasRange">
        📊 范围: {{ formatNumber(minValue) }} ~ {{ formatNumber(maxValue) }}
      </div>
      
      <div class="number-tools">
        <button 
          @click="setZero"
          class="tool-btn"
          title="设为0"
        >
          0️⃣
        </button>
        <button 
          @click="setNull"
          class="tool-btn"
          title="设为NULL"
        >
          ∅
        </button>
        <button 
          v-if="isDecimal && localValue"
          @click="roundValue"
          class="tool-btn"
          title="四舍五入"
        >
          🔄
        </button>
      </div>
    </div>
    
    <!-- 计算器快捷键 -->
    <div class="calculator-hint" v-if="showCalculatorHint">
      💡 支持基本运算: +, -, *, /, %, ^
    </div>
    
    <!-- 数值格式化显示 -->
    <div class="number-preview" v-if="showPreview">
      <div class="preview-label">格式化预览:</div>
      <div class="preview-value">{{ formattedValue }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: [Number, String, null],
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
    type: [Number, String, null],
    default: null
  }
})

const emit = defineEmits([
  'update:modelValue',
  'validate'
])

// 引用
const inputRef = ref(null)

// 响应式数据
const localValue = ref(null)
const isFocused = ref(false)
const showCalculatorHint = ref(false)

// 计算属性
const dataType = computed(() => (props.column.data_type || '').toLowerCase())

const isInteger = computed(() => {
  return dataType.value.includes('int') || 
         dataType.value.includes('serial') ||
         dataType.value === 'integer'
})

const isDecimal = computed(() => {
  return dataType.value.includes('decimal') ||
         dataType.value.includes('numeric') ||
         dataType.value.includes('float') ||
         dataType.value.includes('double')
})

const precision = computed(() => {
  // 从数据类型中提取精度信息
  const match = dataType.value.match(/\((\d+)(?:,(\d+))?\)/)
  if (match) {
    return {
      total: parseInt(match[1]),
      scale: match[2] ? parseInt(match[2]) : 0
    }
  }
  return null
})

const stepValue = computed(() => {
  if (isInteger.value) return 1
  if (precision.value?.scale) return Math.pow(10, -precision.value.scale)
  return 0.01
})

const minValue = computed(() => {
  // 根据数据类型设置最小值
  if (dataType.value.includes('tinyint')) return -128
  if (dataType.value.includes('smallint')) return -32768
  if (dataType.value.includes('mediumint')) return -8388608
  if (dataType.value.includes('int')) return -2147483648
  if (dataType.value.includes('bigint')) return -9223372036854775808n
  
  if (dataType.value.includes('unsigned')) return 0
  
  return null
})

const maxValue = computed(() => {
  // 根据数据类型设置最大值
  if (dataType.value.includes('tinyint')) {
    return dataType.value.includes('unsigned') ? 255 : 127
  }
  if (dataType.value.includes('smallint')) {
    return dataType.value.includes('unsigned') ? 65535 : 32767
  }
  if (dataType.value.includes('mediumint')) {
    return dataType.value.includes('unsigned') ? 16777215 : 8388607
  }
  if (dataType.value.includes('int')) {
    return dataType.value.includes('unsigned') ? 4294967295 : 2147483647
  }
  
  return null
})

const hasRange = computed(() => {
  return minValue.value !== null || maxValue.value !== null
})

const canIncrement = computed(() => {
  return maxValue.value === null || localValue.value === null || localValue.value < maxValue.value
})

const canDecrement = computed(() => {
  return minValue.value === null || localValue.value === null || localValue.value > minValue.value
})

const placeholder = computed(() => {
  let hint = `输入 ${props.column.data_type || '数字'}`
  if (hasRange.value) {
    const min = minValue.value !== null ? formatNumber(minValue.value) : '无限制'
    const max = maxValue.value !== null ? formatNumber(maxValue.value) : '无限制'
    hint += ` (${min} ~ ${max})`
  }
  return hint
})

const showPreview = computed(() => {
  return isFocused.value && localValue.value !== null && localValue.value !== ''
})

const formattedValue = computed(() => {
  if (localValue.value === null || localValue.value === '') return ''
  
  const num = Number(localValue.value)
  if (isNaN(num)) return '无效数字'
  
  // 根据数据类型格式化
  if (isInteger.value) {
    return new Intl.NumberFormat('zh-CN').format(Math.round(num))
  }
  
  if (isDecimal.value && precision.value) {
    return num.toFixed(precision.value.scale)
  }
  
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  }).format(num)
})

// 方法
const handleInput = () => {
  // 处理计算表达式
  if (typeof localValue.value === 'string' && localValue.value.includes('+') || 
      localValue.value.includes('-') || localValue.value.includes('*') || 
      localValue.value.includes('/')) {
    try {
      localValue.value = Function(`"use strict"; return (${localValue.value})`)()
      showCalculatorHint.value = false
    } catch (e) {
      showCalculatorHint.value = true
    }
  }
  
  emit('update:modelValue', localValue.value)
  validateValue()
}

const handleFocus = () => {
  isFocused.value = true
  
  // 自动选中数值
  nextTick(() => {
    if (inputRef.value && localValue.value !== null) {
      inputRef.value.select()
    }
  })
}

const handleBlur = () => {
  isFocused.value = false
  showCalculatorHint.value = false
  
  // 格式化数值
  if (localValue.value !== null && localValue.value !== '') {
    const num = Number(localValue.value)
    if (!isNaN(num)) {
      if (isInteger.value) {
        localValue.value = Math.round(num)
      } else if (precision.value?.scale) {
        localValue.value = Number(num.toFixed(precision.value.scale))
      }
    }
  }
  
  validateValue()
}

const handleWheel = (event) => {
  if (!isFocused.value) return
  
  event.preventDefault()
  if (event.deltaY < 0) {
    increment()
  } else {
    decrement()
  }
}

const validateValue = () => {
  const errors = []
  
  if (localValue.value === null || localValue.value === '') {
    if (props.constraints.not_null) {
      errors.push('此字段不能为空')
    }
    emit('validate', errors)
    return
  }
  
  const num = Number(localValue.value)
  
  if (isNaN(num)) {
    errors.push('请输入有效的数字')
    emit('validate', errors)
    return
  }
  
  // 范围验证
  if (minValue.value !== null && num < minValue.value) {
    errors.push(`数值不能小于 ${formatNumber(minValue.value)}`)
  }
  
  if (maxValue.value !== null && num > maxValue.value) {
    errors.push(`数值不能大于 ${formatNumber(maxValue.value)}`)
  }
  
  // 整数验证
  if (isInteger.value && !Number.isInteger(num)) {
    errors.push('此字段只能输入整数')
  }
  
  // 精度验证
  if (precision.value && !isInteger.value) {
    const decimalPlaces = (num.toString().split('.')[1] || '').length
    if (decimalPlaces > precision.value.scale) {
      errors.push(`小数位数不能超过 ${precision.value.scale} 位`)
    }
  }
  
  emit('validate', errors)
}

const formatNumber = (num) => {
  return new Intl.NumberFormat('zh-CN').format(num)
}

const increment = () => {
  if (!canIncrement.value) return
  
  const current = localValue.value === null ? 0 : Number(localValue.value)
  localValue.value = current + stepValue.value
  
  // 确保不超过最大值
  if (maxValue.value !== null && localValue.value > maxValue.value) {
    localValue.value = maxValue.value
  }
  
  handleInput()
}

const decrement = () => {
  if (!canDecrement.value) return
  
  const current = localValue.value === null ? 0 : Number(localValue.value)
  localValue.value = current - stepValue.value
  
  // 确保不低于最小值
  if (minValue.value !== null && localValue.value < minValue.value) {
    localValue.value = minValue.value
  }
  
  handleInput()
}

const setZero = () => {
  localValue.value = 0
  emit('update:modelValue', 0)
  validateValue()
  focusInput()
}

const setNull = () => {
  localValue.value = null
  emit('update:modelValue', null)
  validateValue()
  focusInput()
}

const roundValue = () => {
  if (localValue.value === null) return
  
  const num = Number(localValue.value)
  if (!isNaN(num)) {
    localValue.value = Math.round(num)
    handleInput()
  }
}

const focusInput = () => {
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
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
  localValue.value = newValue
}, { immediate: true })
</script>

<style scoped>
.number-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 280px;
}

.number-input-group {
  display: flex;
  align-items: stretch;
  gap: 2px;
}

.number-input {
  flex: 1;
  border: 2px solid var(--border-color);
  border-radius: 4px 0 0 4px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: var(--font-mono, 'Monaco', monospace);
  color: var(--text-color);
  background: white;
  transition: all 0.2s ease;
  text-align: right;
}

.number-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.number-controls {
  display: flex;
  flex-direction: column;
  border: 2px solid var(--border-color);
  border-left: none;
  border-radius: 0 4px 4px 0;
  overflow: hidden;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 50%;
  border: none;
  background: var(--gray-100);
  cursor: pointer;
  font-size: 10px;
  color: var(--gray-600);
  transition: all 0.2s ease;
}

.control-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--gray-50);
}

.increment-btn {
  border-bottom: 1px solid var(--border-color);
}

.number-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.range-info {
  color: var(--gray-600);
  background: var(--gray-50);
  padding: 2px 8px;
  border-radius: 3px;
  border: 1px solid var(--gray-200);
}

.number-tools {
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

.calculator-hint {
  font-size: 10px;
  color: var(--blue-600);
  background: var(--blue-50);
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid var(--blue-200);
}

.number-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  background: var(--green-50);
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid var(--green-200);
}

.preview-label {
  color: var(--green-700);
  font-weight: 500;
}

.preview-value {
  font-family: var(--font-mono, 'Monaco', monospace);
  color: var(--green-800);
  font-weight: 600;
}

/* 隐藏默认的数字输入框箭头 */
.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.number-input[type=number] {
  -moz-appearance: textfield;
}

/* 占位符样式 */
.number-input::placeholder {
  color: var(--gray-400);
  font-style: italic;
  text-align: left;
}

/* 选中文本样式 */
.number-input::selection {
  background: rgba(59, 130, 246, 0.2);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .number-editor {
    min-width: 240px;
  }
  
  .number-input {
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .control-btn {
    width: 24px;
  }
  
  .number-footer {
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
  }
  
  .range-info {
    text-align: center;
  }
  
  .number-tools {
    justify-content: center;
  }
}
</style>