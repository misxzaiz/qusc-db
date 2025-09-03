<template>
  <div class="boolean-editor">
    <!-- 开关样式选择器 -->
    <div class="switch-container">
      <label class="switch-label">
        <input
          ref="inputRef"
          type="checkbox"
          v-model="localValue"
          class="switch-input"
          @change="handleChange"
          @focus="handleFocus"
          @blur="handleBlur"
        />
        <span class="switch-slider"></span>
        <span class="switch-text">
          {{ localValue ? trueLabel : falseLabel }}
        </span>
      </label>
    </div>
    
    <!-- 值显示和选项 -->
    <div class="boolean-options">
      <div class="value-display">
        <span class="value-label">当前值:</span>
        <code class="value-code" :class="{ true: localValue, false: !localValue }">
          {{ displayValue }}
        </code>
      </div>
      
      <div class="boolean-tools">
        <button 
          @click="setTrue"
          class="bool-btn true-btn"
          :class="{ active: localValue }"
          title="设为True"
        >
          ✅ True
        </button>
        <button 
          @click="setFalse"
          class="bool-btn false-btn"
          :class="{ active: !localValue && localValue !== null }"
          title="设为False"
        >
          ❌ False
        </button>
        <button 
          @click="setNull"
          class="bool-btn null-btn"
          :class="{ active: localValue === null }"
          title="设为NULL"
        >
          ∅ NULL
        </button>
      </div>
    </div>
    
    <!-- 数据库存储格式提示 -->
    <div class="storage-info" v-if="showStorageInfo">
      <div class="storage-title">💾 数据库存储格式:</div>
      <div class="storage-formats">
        <div class="format-item">
          <span class="format-label">True:</span>
          <code class="format-value">{{ storageFormat.true }}</code>
        </div>
        <div class="format-item">
          <span class="format-label">False:</span>
          <code class="format-value">{{ storageFormat.false }}</code>
        </div>
      </div>
    </div>
    
    <!-- 键盘快捷键提示 -->
    <div class="keyboard-hints" v-if="isFocused">
      <div class="hint-title">⌨️ 快捷键:</div>
      <div class="hint-items">
        <span class="hint-item"><kbd>Space</kbd> 切换</span>
        <span class="hint-item"><kbd>T</kbd> True</span>
        <span class="hint-item"><kbd>F</kbd> False</span>
        <span class="hint-item"><kbd>N</kbd> NULL</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: [Boolean, Number, String, null],
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
    type: [Boolean, Number, String, null],
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

// 计算属性
const dataType = computed(() => (props.column.data_type || '').toLowerCase())

const isTinyInt = computed(() => {
  return dataType.value.includes('tinyint')
})

const storageFormat = computed(() => {
  if (isTinyInt.value) {
    return {
      true: '1',
      false: '0'
    }
  }
  
  // MySQL BOOLEAN 实际是 TINYINT(1) 的别名
  if (dataType.value.includes('bool')) {
    return {
      true: '1',
      false: '0'
    }
  }
  
  return {
    true: 'TRUE',
    false: 'FALSE'
  }
})

const trueLabel = computed(() => {
  return isTinyInt.value ? '是' : 'True'
})

const falseLabel = computed(() => {
  return isTinyInt.value ? '否' : 'False'
})

const displayValue = computed(() => {
  if (localValue.value === null) return 'NULL'
  if (isTinyInt.value) {
    return localValue.value ? '1 (是)' : '0 (否)'
  }
  return localValue.value ? 'TRUE' : 'FALSE'
})

const showStorageInfo = computed(() => {
  return isFocused.value
})

// 方法
const handleChange = () => {
  emit('update:modelValue', localValue.value)
  validateValue()
}

const handleFocus = () => {
  isFocused.value = true
  
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeyDown)
}

const handleBlur = () => {
  isFocused.value = false
  validateValue()
  
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyDown)
}

const handleKeyDown = (event) => {
  // 阻止默认行为，避免影响其他组件
  if (!isFocused.value) return
  
  switch (event.key.toLowerCase()) {
    case ' ':
    case 'spacebar':
      event.preventDefault()
      toggle()
      break
    case 't':
      event.preventDefault()
      setTrue()
      break
    case 'f':
      event.preventDefault()
      setFalse()
      break
    case 'n':
      event.preventDefault()
      setNull()
      break
  }
}

const validateValue = () => {
  const errors = []
  
  if (localValue.value === null && props.constraints.not_null) {
    errors.push('此字段不能为空')
  }
  
  emit('validate', errors)
}

const toggle = () => {
  if (localValue.value === null) {
    localValue.value = true
  } else {
    localValue.value = !localValue.value
  }
  handleChange()
}

const setTrue = () => {
  localValue.value = true
  handleChange()
  focusInput()
}

const setFalse = () => {
  localValue.value = false
  handleChange()
  focusInput()
}

const setNull = () => {
  localValue.value = null
  emit('update:modelValue', null)
  validateValue()
  focusInput()
}

const focusInput = () => {
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  })
}

const parseValue = (value) => {
  if (value === null || value === undefined) return null
  
  // 处理数字形式
  if (typeof value === 'number') {
    return value !== 0
  }
  
  // 处理字符串形式
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'y') {
      return true
    }
    if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'n') {
      return false
    }
    if (lower === 'null' || lower === '') {
      return null
    }
  }
  
  return Boolean(value)
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
.boolean-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 280px;
  padding: 4px;
}

/* 开关容器 */
.switch-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background: var(--gray-25);
  border-radius: 8px;
  border: 2px solid var(--gray-200);
  transition: all 0.2s ease;
}

.switch-container:has(.switch-input:focus) {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.switch-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-slider {
  position: relative;
  width: 48px;
  height: 24px;
  background: var(--gray-300);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.switch-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.switch-input:checked + .switch-slider {
  background: var(--green-500);
}

.switch-input:checked + .switch-slider::before {
  transform: translateX(24px);
}

.switch-input:focus + .switch-slider {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.switch-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-800);
  min-width: 60px;
  text-align: left;
}

/* 值显示和选项 */
.boolean-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.value-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--gray-50);
  border-radius: 4px;
  border: 1px solid var(--gray-200);
  font-size: 12px;
}

.value-label {
  color: var(--gray-600);
  font-weight: 500;
}

.value-code {
  font-family: var(--font-mono, 'Monaco', monospace);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
  font-size: 11px;
}

.value-code.true {
  background: var(--green-100);
  color: var(--green-800);
}

.value-code.false {
  background: var(--red-100);
  color: var(--red-800);
}

.boolean-tools {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
}

.bool-btn {
  padding: 6px 12px;
  border: 1px solid var(--gray-300);
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.bool-btn:hover {
  background: var(--gray-100);
  border-color: var(--gray-400);
}

.true-btn.active {
  background: var(--green-500);
  border-color: var(--green-500);
  color: white;
}

.false-btn.active {
  background: var(--red-500);
  border-color: var(--red-500);
  color: white;
}

.null-btn.active {
  background: var(--gray-500);
  border-color: var(--gray-500);
  color: white;
}

/* 存储信息 */
.storage-info {
  background: var(--blue-50);
  border: 1px solid var(--blue-200);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 11px;
}

.storage-title {
  font-weight: 600;
  color: var(--blue-800);
  margin-bottom: 6px;
}

.storage-formats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.format-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.format-label {
  font-weight: 500;
  color: var(--blue-700);
  min-width: 40px;
}

.format-value {
  background: var(--blue-100);
  color: var(--blue-800);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: var(--font-mono, 'Monaco', monospace);
  font-size: 10px;
}

/* 键盘提示 */
.keyboard-hints {
  background: var(--purple-50);
  border: 1px solid var(--purple-200);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 10px;
}

.hint-title {
  font-weight: 600;
  color: var(--purple-800);
  margin-bottom: 6px;
}

.hint-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--purple-700);
}

.hint-item kbd {
  background: var(--purple-200);
  color: var(--purple-800);
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 9px;
  font-family: inherit;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .boolean-editor {
    min-width: 240px;
  }
  
  .switch-container {
    padding: 12px;
  }
  
  .switch-slider {
    width: 40px;
    height: 20px;
  }
  
  .switch-slider::before {
    width: 16px;
    height: 16px;
  }
  
  .switch-input:checked + .switch-slider::before {
    transform: translateX(20px);
  }
  
  .boolean-tools {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  
  .value-display {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .storage-formats,
  .hint-items {
    flex-direction: column;
    gap: 4px;
  }
}
</style>