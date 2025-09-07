<template>
  <div v-if="visible" class="confirm-dialog-overlay" @click="handleOverlayClick">
    <div class="confirm-dialog" @click.stop>
      <div class="confirm-dialog-header">
        <h3 class="confirm-dialog-title">
          <i :class="iconClass" class="confirm-icon"></i>
          {{ title }}
        </h3>
      </div>
      
      <div class="confirm-dialog-body">
        <p class="confirm-message">{{ message }}</p>
      </div>
      
      <div class="confirm-dialog-footer">
        <button 
          class="btn btn-secondary" 
          @click="handleCancel"
          :disabled="loading"
        >
          取消
        </button>
        <button 
          class="btn" 
          :class="confirmButtonClass"
          @click="handleConfirm"
          :disabled="loading"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          {{ confirmText || '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '确认'
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info', // 'info', 'warning', 'danger'
    validator: (value) => ['info', 'warning', 'danger'].includes(value)
  },
  confirmText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

const loading = ref(false)

const iconClass = computed(() => {
  const icons = {
    info: 'fas fa-info-circle',
    warning: 'fas fa-exclamation-triangle',
    danger: 'fas fa-exclamation-triangle'
  }
  return icons[props.type] || icons.info
})

const confirmButtonClass = computed(() => {
  const classes = {
    info: 'btn-primary',
    warning: 'btn-warning',
    danger: 'btn-danger'
  }
  return classes[props.type] || classes.info
})

function handleOverlayClick() {
  if (!loading.value) {
    handleCancel()
  }
}

function handleCancel() {
  emit('update:visible', false)
  emit('cancel')
}

function handleConfirm() {
  loading.value = true
  emit('confirm')
  // Note: 父组件负责关闭对话框和重置loading状态
}

// 暴露方法供父组件调用
defineExpose({
  setLoading: (val) => { loading.value = val }
})
</script>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001; /* 比RedisOperationDialog高一层 */
}

.confirm-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 400px;
  max-width: 500px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.confirm-dialog-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.confirm-dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.confirm-icon {
  font-size: 18px;
}

.confirm-icon.fa-info-circle {
  color: #4a90e2;
}

.confirm-icon.fa-exclamation-triangle {
  color: #ff9800;
}

.confirm-dialog[data-type="danger"] .confirm-icon.fa-exclamation-triangle {
  color: #f44336;
}

.confirm-dialog-body {
  padding: 24px;
}

.confirm-message {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.confirm-dialog-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  background: #fafafa;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #666;
  border-color: #e0e0e0;
}

.btn-secondary:hover:not(:disabled) {
  background: #f8f8f8;
  border-color: #d0d0d0;
}

.btn-primary {
  background: #4a90e2;
  color: white;
  border-color: #4a90e2;
}

.btn-primary:hover:not(:disabled) {
  background: #357abd;
  border-color: #357abd;
}

.btn-warning {
  background: #ff9800;
  color: white;
  border-color: #ff9800;
}

.btn-warning:hover:not(:disabled) {
  background: #f57c00;
  border-color: #f57c00;
}

.btn-danger {
  background: #f44336;
  color: white;
  border-color: #f44336;
}

.btn-danger:hover:not(:disabled) {
  background: #d32f2f;
  border-color: #d32f2f;
}
</style>