<template>
  <BaseDialog
    :visible="visible"
    :title="title"
    :icon="typeIcon"
    :size="size"
    :closable="closable"
    :mask-closable="maskClosable"
    :loading="loading"
    :show-default-footer="true"
    :show-cancel="showCancel"
    :show-confirm="showConfirm"
    :cancel-text="cancelText"
    :confirm-text="confirmText"
    :confirm-enabled="!loading"
    @update:visible="$emit('update:visible', $event)"
    @confirm="handleConfirm"
    @cancel="handleCancel"
    @close="handleClose"
  >
    <div class="confirm-content">
      <!-- 确认图标 -->
      <div class="confirm-icon" :class="`icon-${type}`">
        {{ typeIcon }}
      </div>
      
      <!-- 确认消息 -->
      <div class="confirm-message">
        <div class="message-title" v-if="messageTitle">
          {{ messageTitle }}
        </div>
        <div class="message-content">
          <slot>{{ message }}</slot>
        </div>
        
        <!-- 详细信息 -->
        <div v-if="details || $slots.details" class="message-details">
          <slot name="details">{{ details }}</slot>
        </div>
        
        <!-- 输入确认 -->
        <div v-if="requireInput" class="confirm-input">
          <label class="input-label">{{ inputLabel }}</label>
          <input
            v-model="inputValue"
            type="text"
            class="input"
            :placeholder="inputPlaceholder"
            @keyup.enter="handleConfirm"
            ref="inputRef"
          />
          <div v-if="inputHint" class="input-hint">{{ inputHint }}</div>
        </div>
        
        <!-- 确认选项 -->
        <div v-if="showCheckbox" class="confirm-options">
          <label class="checkbox-label">
            <input
              v-model="checkboxValue"
              type="checkbox"
              class="checkbox"
            />
            <span class="checkbox-text">{{ checkboxText }}</span>
          </label>
        </div>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import BaseDialog from './BaseDialog.vue'

// Props
const props = defineProps({
  // 基础属性
  visible: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'warning', 'error', 'success', 'question'].includes(value)
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  messageTitle: {
    type: String,
    default: ''
  },
  details: {
    type: String,
    default: ''
  },
  
  // 对话框配置
  size: {
    type: String,
    default: 'small'
  },
  closable: {
    type: Boolean,
    default: true
  },
  maskClosable: {
    type: Boolean,
    default: false
  },
  
  // 按钮配置
  showCancel: {
    type: Boolean,
    default: true
  },
  showConfirm: {
    type: Boolean,
    default: true
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  
  // 高级功能
  requireInput: {
    type: Boolean,
    default: false
  },
  inputLabel: {
    type: String,
    default: '请确认操作'
  },
  inputPlaceholder: {
    type: String,
    default: '输入确认信息'
  },
  inputHint: {
    type: String,
    default: ''
  },
  inputValidator: {
    type: Function,
    default: null
  },
  
  // 复选框选项
  showCheckbox: {
    type: Boolean,
    default: false
  },
  checkboxText: {
    type: String,
    default: '我已了解后果'
  },
  
  // 自动关闭
  autoCloseDelay: {
    type: Number,
    default: 0
  }
})

// Emits
const emit = defineEmits([
  'update:visible', 
  'confirm', 
  'cancel', 
  'close'
])

// 响应式数据
const loading = ref(false)
const inputValue = ref('')
const checkboxValue = ref(false)
const inputRef = ref(null)
const autoCloseTimer = ref(null)

// 计算属性
const typeIcon = computed(() => {
  switch (props.type) {
    case 'warning':
      return '⚠️'
    case 'error':
      return '❌'
    case 'success':
      return '✅'
    case 'question':
      return '❓'
    default:
      return 'ℹ️'
  }
})

const computedTitle = computed(() => {
  if (props.title) return props.title
  
  switch (props.type) {
    case 'warning':
      return '警告'
    case 'error':
      return '错误'
    case 'success':
      return '成功'
    case 'question':
      return '确认'
    default:
      return '提示'
  }
})

const canConfirm = computed(() => {
  if (props.requireInput && props.inputValidator) {
    return props.inputValidator(inputValue.value)
  }
  
  if (props.requireInput && !inputValue.value.trim()) {
    return false
  }
  
  if (props.showCheckbox && !checkboxValue.value) {
    return false
  }
  
  return true
})

// 方法
const handleConfirm = async () => {
  if (!canConfirm.value || loading.value) return
  
  loading.value = true
  
  try {
    const confirmData = {
      type: props.type,
      message: props.message,
      input: props.requireInput ? inputValue.value : null,
      checkbox: props.showCheckbox ? checkboxValue.value : null
    }
    
    await emit('confirm', confirmData)
    
    // 成功后关闭对话框
    emit('update:visible', false)
  } catch (error) {
    console.error('确认操作失败:', error)
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}

const handleClose = () => {
  emit('close')
}

// 自动关闭功能
const startAutoClose = () => {
  if (props.autoCloseDelay > 0) {
    autoCloseTimer.value = setTimeout(() => {
      handleConfirm()
    }, props.autoCloseDelay)
  }
}

const stopAutoClose = () => {
  if (autoCloseTimer.value) {
    clearTimeout(autoCloseTimer.value)
    autoCloseTimer.value = null
  }
}

// 重置状态
const resetState = () => {
  inputValue.value = ''
  checkboxValue.value = false
  loading.value = false
  stopAutoClose()
}

// 生命周期
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    resetState()
    
    // 聚焦到输入框
    if (props.requireInput) {
      await nextTick()
      inputRef.value?.focus()
    }
    
    // 启动自动关闭
    startAutoClose()
  } else {
    stopAutoClose()
  }
})

// 导出组件实例方法
defineExpose({
  confirm: handleConfirm,
  cancel: handleCancel,
  resetState
})
</script>

<style scoped>
.confirm-content {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  min-height: 80px;
}

.confirm-icon {
  font-size: 32px;
  flex-shrink: 0;
  margin-top: 4px;
}

.icon-warning {
  color: var(--warning-color);
}

.icon-error {
  color: var(--error-color);
}

.icon-success {
  color: var(--success-color);
}

.icon-question {
  color: var(--primary-color);
}

.icon-info {
  color: var(--primary-color);
}

.confirm-message {
  flex: 1;
  min-width: 0;
}

.message-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-800);
  margin-bottom: 8px;
}

.message-content {
  font-size: 14px;
  color: var(--gray-700);
  line-height: 1.5;
  margin-bottom: 12px;
}

.message-details {
  font-size: 12px;
  color: var(--gray-600);
  background: var(--gray-50);
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid var(--gray-300);
  margin-bottom: 16px;
}

.confirm-input {
  margin-top: 16px;
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 6px;
}

.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 14px;
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.input-hint {
  font-size: 11px;
  color: var(--gray-500);
  margin-top: 4px;
}

.confirm-options {
  margin-top: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--gray-700);
}

.checkbox {
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  cursor: pointer;
}

.checkbox:checked {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-text {
  user-select: none;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .confirm-content {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .confirm-icon {
    align-self: center;
    margin-top: 0;
  }
}
</style>