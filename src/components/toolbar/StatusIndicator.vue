<template>
  <span 
    class="status-indicator" 
    :class="statusClass"
    :title="statusText"
  />
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  status: {
    type: String,
    default: 'unknown'
  }
})

// 计算属性
const statusClass = computed(() => {
  switch (props.status) {
    case 'ready':
    case 'configured':
      return 'connected'
    case 'error':
    case 'failed':
      return 'disconnected'
    case 'configuring':
    case 'loading':
      return 'connecting'
    default:
      return 'disconnected'
  }
})

const statusText = computed(() => {
  switch (props.status) {
    case 'ready':
    case 'configured':
      return '已连接'
    case 'error':
    case 'failed':
      return '连接失败'
    case 'configuring':
    case 'loading':
      return '连接中...'
    default:
      return '未连接'
  }
})
</script>

<style scoped>
.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  
  &.connected {
    background: var(--success-color);
  }
  
  &.disconnected {
    background: var(--gray-400);
  }
  
  &.connecting {
    background: var(--warning-color);
    animation: pulse 1.5s infinite;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>