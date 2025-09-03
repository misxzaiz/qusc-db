<template>
  <input
    ref="inputRef"
    v-model="editValue"
    :type="inputType"
    class="inline-text-input"
    :class="{ 'has-error': hasError }"
    :placeholder="placeholder"
    :maxlength="maxLength"
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
const inputType = computed(() => {
  const dataType = props.column.data_type?.toLowerCase()
  if (dataType?.includes('email')) return 'email'
  if (dataType?.includes('url')) return 'url'
  return 'text'
})

const maxLength = computed(() => {
  return props.constraints.max_length || props.column.character_maximum_length || null
})

const placeholder = computed(() => {
  if (props.constraints.not_null) {
    return '必填字段'
  }
  return `输入${props.column.name || '值'}...`
})

// 方法
const handleFocus = () => {
  hasError.value = false
  // 全选文本便于快速替换
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.select()
    }
  })
}

const handleInput = () => {
  hasError.value = false
  // 实时验证可以在这里添加
}

const handleBlur = () => {
  // 失焦自动保存
  save()
}

const handleKeydown = (event) => {
  const { key, shiftKey, ctrlKey, metaKey } = event
  
  // 阻止默认的键盘事件冒泡到表格
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
  
  // 必填验证
  if (props.constraints.not_null && (value === '' || value == null)) {
    hasError.value = true
    return false
  }
  
  // 长度验证
  if (maxLength.value && String(value).length > maxLength.value) {
    hasError.value = true
    return false
  }
  
  return true
}

const save = () => {
  if (!validate()) {
    // 验证失败时聚焦输入框
    nextTick(() => inputRef.value?.focus())
    return false
  }
  
  // 只有值发生变化时才触发保存
  if (editValue.value !== originalValue.value) {
    emit('save', editValue.value)
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
.inline-text-input {
  width: 100%;
  height: 100%;
  border: 2px solid #3b82f6;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
  line-height: 1.4;
  background: #ffffff;
  color: #1f2937;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
  outline: none;
  transition: all 0.15s ease;
}

.inline-text-input:focus {
  border-color: #1d4ed8;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.inline-text-input.has-error {
  border-color: #ef4444;
  background-color: #fef2f2;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
}

.inline-text-input.has-error:focus {
  border-color: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

.inline-text-input::placeholder {
  color: #9ca3af;
  font-style: italic;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .inline-text-input {
    border-width: 3px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .inline-text-input {
    transition: none;
  }
}
</style>