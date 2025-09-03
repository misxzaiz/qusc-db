<template>
  <span 
    class="notification-icon"
    :class="`icon-${type}`"
    :title="iconTitle"
  >
    {{ iconEmoji }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info', 'loading', 'progress'].includes(value)
  }
})

// 计算属性
const iconEmoji = computed(() => {
  switch (props.type) {
    case 'success':
      return '✅'
    case 'error':
      return '❌'
    case 'warning':
      return '⚠️'
    case 'info':
      return 'ℹ️'
    case 'loading':
      return '⏳'
    case 'progress':
      return '📊'
    default:
      return 'ℹ️'
  }
})

const iconTitle = computed(() => {
  switch (props.type) {
    case 'success':
      return '成功'
    case 'error':
      return '错误'
    case 'warning':
      return '警告'
    case 'info':
      return '信息'
    case 'loading':
      return '加载中'
    case 'progress':
      return '进度'
    default:
      return '通知'
  }
})
</script>

<style scoped>
.notification-icon {
  font-size: 16px;
  display: inline-block;
  line-height: 1;
}

.icon-success {
  color: var(--success-color);
}

.icon-error {
  color: var(--error-color);
}

.icon-warning {
  color: var(--warning-color);
}

.icon-info {
  color: var(--primary-color);
}

.icon-loading {
  color: var(--primary-color);
  animation: pulse 1.5s infinite;
}

.icon-progress {
  color: var(--primary-color);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>