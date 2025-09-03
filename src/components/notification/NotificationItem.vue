<template>
  <div 
    class="notification-item"
    :class="[
      `notification-${notification.type}`,
      { 
        visible: notification.visible,
        persistent: isPersistent,
        dismissible: isDismissible,
        'has-actions': hasActions
      }
    ]"
    @click="handleClick"
  >
    <!-- 通知图标 -->
    <div class="notification-icon">
      <NotificationIcon :type="notification.type" />
    </div>
    
    <!-- 通知内容 -->
    <div class="notification-content">
      <div class="notification-message">{{ notification.message }}</div>
      
      <!-- 进度条（仅进度类型通知显示） -->
      <div 
        v-if="notification.type === 'progress'" 
        class="notification-progress"
      >
        <div 
          class="progress-bar"
          :style="{ width: `${notification.progress || 0}%` }"
        ></div>
      </div>
      
      <!-- 通知时间 -->
      <div class="notification-timestamp">{{ formattedTime }}</div>
    </div>
    
    <!-- 通知操作 -->
    <div class="notification-actions" v-if="hasActions || isDismissible">
      <!-- 自定义操作 -->
      <button
        v-for="action in notification.actions"
        :key="action.label"
        class="action-btn"
        :class="`btn-${action.type}`"
        @click.stop="handleActionClick(action)"
      >
        {{ action.label }}
      </button>
      
      <!-- 关闭按钮 -->
      <button 
        v-if="isDismissible"
        class="dismiss-btn"
        @click.stop="handleDismiss"
        title="关闭通知"
      >
        ×
      </button>
    </div>
    
    <!-- 自动隐藏倒计时指示器 -->
    <div 
      v-if="!isPersistent && notification.duration > 0"
      class="auto-dismiss-indicator"
      :style="{ animationDuration: `${notification.duration}ms` }"
    ></div>
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
  }
})

// Emits
const emit = defineEmits(['dismiss', 'click', 'action'])

// 计算属性
const isPersistent = computed(() => props.notification.duration === 0)
const isDismissible = computed(() => props.dismissible && !['loading'].includes(props.notification.type))
const hasActions = computed(() => props.notification.actions && props.notification.actions.length > 0)

const formattedTime = computed(() => {
  const now = new Date()
  const notificationTime = new Date(props.notification.timestamp)
  const diff = now - notificationTime
  
  if (diff < 60000) { // 小于1分钟
    return '刚刚'
  } else if (diff < 3600000) { // 小于1小时
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) { // 小于1天
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    return notificationTime.toLocaleDateString()
  }
})

// 方法
const handleClick = () => {
  emit('click', props.notification)
}

const handleDismiss = () => {
  emit('dismiss', props.notification.id)
}

const handleActionClick = (action) => {
  emit('action', { notification: props.notification, action })
  if (action.handler) {
    action.handler()
  }
}
</script>

<style scoped>
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 8px;
  transform: translateX(100%);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border-left: 4px solid transparent;
}

.notification-item.visible {
  transform: translateX(0);
}

.notification-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 通知类型样式 */
.notification-success {
  border-left-color: var(--success-color);
}

.notification-error {
  border-left-color: var(--error-color);
}

.notification-warning {
  border-left-color: var(--warning-color);
}

.notification-info {
  border-left-color: var(--primary-color);
}

.notification-loading {
  border-left-color: var(--primary-color);
}

.notification-progress {
  border-left-color: var(--primary-color);
}

/* 持久化通知样式 */
.notification-item.persistent {
  background: var(--gray-50);
  border: 1px solid var(--border-color);
}

.notification-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-message {
  font-size: 14px;
  color: var(--gray-800);
  line-height: 1.4;
  margin-bottom: 4px;
}

.notification-progress {
  width: 100%;
  height: 4px;
  background: var(--gray-200);
  border-radius: 2px;
  margin: 8px 0;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--primary-color);
  transition: width 0.3s ease;
  border-radius: 2px;
}

.notification-timestamp {
  font-size: 11px;
  color: var(--gray-500);
}

.notification-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--gray-100);
  color: var(--gray-700);
  border-color: var(--border-color);
}

.btn-secondary:hover {
  background: var(--gray-200);
}

.dismiss-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--gray-200);
  color: var(--gray-600);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: var(--gray-300);
    color: var(--gray-800);
  }
}

/* 自动隐藏指示器 */
.auto-dismiss-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--primary-color);
  width: 100%;
  transform-origin: left;
  animation: shrinkWidth linear;
}

@keyframes shrinkWidth {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* 加载状态的特殊样式 */
.notification-loading .notification-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>