<template>
  <div class="toast-notification">
    <div 
      class="toast-item"
      :class="[
        `toast-${notification.type}`,
        notification.position || 'top-right',
        { 
          visible: notification.visible,
          compact: isCompact 
        }
      ]"
    >
      <div class="toast-content">
        <NotificationIcon :type="notification.type" />
        <div class="toast-message">{{ notification.message }}</div>
      </div>
      
      <button 
        v-if="dismissible"
        class="toast-dismiss"
        @click="$emit('dismiss', notification.id)"
      >
        ×
      </button>
      
      <!-- 进度条 -->
      <div 
        v-if="notification.type === 'progress'" 
        class="toast-progress"
      >
        <div 
          class="toast-progress-bar"
          :style="{ width: `${notification.progress || 0}%` }"
        ></div>
      </div>
      
      <!-- 自动关闭指示器 -->
      <div 
        v-if="notification.duration > 0"
        class="toast-timer"
        :style="{ animationDuration: `${notification.duration}ms` }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import NotificationIcon from './NotificationIcon.vue'

// Props
const props = defineProps({
  notification: {
    type: Object,
    required: true
  },
  dismissible: {
    type: Boolean,
    default: true
  },
  compact: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['dismiss'])

// 计算属性
const isCompact = computed(() => props.compact || props.notification.compact)
</script>

<style scoped>
.toast-notification {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 8px;
  transform: translateX(100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  border-left: 4px solid transparent;
  min-width: 280px;
  max-width: 400px;
}

.toast-item.visible {
  transform: translateX(0);
}

.toast-item.compact {
  padding: 8px 12px;
  min-width: 200px;
}

/* 位置样式 */
.toast-item.top-right {
  position: fixed;
  top: 20px;
  right: 20px;
}

.toast-item.top-left {
  position: fixed;
  top: 20px;
  left: 20px;
  transform: translateX(-100%);
}

.toast-item.top-left.visible {
  transform: translateX(0);
}

.toast-item.bottom-right {
  position: fixed;
  bottom: 20px;
  right: 20px;
}

.toast-item.bottom-left {
  position: fixed;
  bottom: 20px;
  left: 20px;
  transform: translateX(-100%);
}

.toast-item.bottom-left.visible {
  transform: translateX(0);
}

.toast-item.top-center {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translate(-50%, -100%);
}

.toast-item.top-center.visible {
  transform: translate(-50%, 0);
}

.toast-item.bottom-center {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translate(-50%, 100%);
}

.toast-item.bottom-center.visible {
  transform: translate(-50%, 0);
}

/* 通知类型样式 */
.toast-success {
  border-left-color: var(--success-color);
}

.toast-error {
  border-left-color: var(--error-color);
}

.toast-warning {
  border-left-color: var(--warning-color);
}

.toast-info {
  border-left-color: var(--primary-color);
}

.toast-loading {
  border-left-color: var(--primary-color);
}

.toast-progress {
  border-left-color: var(--primary-color);
}

.toast-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.toast-message {
  font-size: 14px;
  color: var(--gray-800);
  line-height: 1.4;
}

.toast-dismiss {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--gray-200);
  color: var(--gray-600);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &:hover {
    background: var(--gray-300);
    color: var(--gray-800);
  }
}

.toast-progress {
  position: absolute;
  bottom: 4px;
  left: 4px;
  right: 4px;
  height: 3px;
  background: var(--gray-200);
  border-radius: 2px;
  overflow: hidden;
}

.toast-progress-bar {
  height: 100%;
  background: var(--primary-color);
  transition: width 0.3s ease;
  border-radius: 2px;
}

.toast-timer {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--primary-color);
  width: 100%;
  transform-origin: left;
  animation: shrinkWidth linear;
  opacity: 0.6;
}

@keyframes shrinkWidth {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* 响应式设计 */
@media (max-width: 480px) {
  .toast-item {
    left: 16px !important;
    right: 16px !important;
    min-width: auto;
    max-width: none;
    transform: translateY(-100%);
  }
  
  .toast-item.visible {
    transform: translateY(0);
  }
  
  .toast-item.top-center,
  .toast-item.bottom-center {
    transform: translateY(-100%);
  }
  
  .toast-item.top-center.visible,
  .toast-item.bottom-center.visible {
    transform: translateY(0);
  }
}
</style>