<template>
  <select
    ref="selectRef"
    v-model="editValue"
    class="inline-boolean-select"
    :class="{ 'has-error': hasError }"
    @blur="handleBlur"
    @keydown="handleKeydown"
    @change="handleChange"
    @focus="handleFocus"
  >
    <option v-if="!isRequired" value="">-- 选择 --</option>
    <option value="1">是 / True</option>
    <option value="0">否 / False</option>
  </select>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  value: {
    type: [String, Number, Boolean],
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
const selectRef = ref(null)
const editValue = ref('')
const hasError = ref(false)
const originalValue = ref(props.value)

// 计算属性
const isRequired = computed(() => props.constraints.not_null)

// 方法
const convertToSelectValue = (value) => {
  if (value === null || value === undefined || value === '') return ''
  if (value === true || value === 1 || value === '1') return '1'
  if (value === false || value === 0 || value === '0') return '0'
  return ''
}

const convertFromSelectValue = (value) => {
  if (value === '1') return true
  if (value === '0') return false
  return null
}

const handleFocus = () => {
  hasError.value = false
}

const handleChange = () => {
  hasError.value = false
  // 选择后自动保存
  setTimeout(() => save(), 100) // 延迟一点确保值已更新
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
      
    case ' ': // 空格键切换值
      event.preventDefault()
      if (editValue.value === '1') {
        editValue.value = '0'
      } else if (editValue.value === '0') {
        editValue.value = isRequired.value ? '1' : ''
      } else {
        editValue.value = '1'
      }
      handleChange()
      break
  }
}

const validate = () => {
  if (isRequired.value && editValue.value === '') {
    hasError.value = true
    return false
  }
  return true
}

const save = () => {
  if (!validate()) {
    nextTick(() => selectRef.value?.focus())
    return false
  }
  
  const currentValue = convertFromSelectValue(editValue.value)
  const originalConverted = convertFromSelectValue(convertToSelectValue(originalValue.value))
  
  if (currentValue !== originalConverted) {
    emit('save', currentValue)
  } else {
    emit('cancel')
  }
  return true
}

const cancel = () => {
  editValue.value = convertToSelectValue(originalValue.value)
  hasError.value = false
  emit('cancel')
}

const focus = () => {
  nextTick(() => {
    if (selectRef.value) {
      selectRef.value.focus()
    }
  })
}

// 监听 props.value 变化
watch(() => props.value, (newValue) => {
  editValue.value = convertToSelectValue(newValue)
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
.inline-boolean-select {
  width: 100%;
  height: 100%;
  border: 2px solid #f59e0b;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
  line-height: 1.4;
  background: #ffffff;
  color: #1f2937;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
  outline: none;
  transition: all 0.15s ease;
  cursor: pointer;
}

.inline-boolean-select:focus {
  border-color: #d97706;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
}

.inline-boolean-select.has-error {
  border-color: #ef4444;
  background-color: #fef2f2;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
}

.inline-boolean-select.has-error:focus {
  border-color: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

.inline-boolean-select option {
  padding: 8px;
  background: #ffffff;
  color: #1f2937;
}

.inline-boolean-select option:hover {
  background: #f3f4f6;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .inline-boolean-select {
    border-width: 3px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .inline-boolean-select {
    transition: none;
  }
}
</style>