<template>
  <div class="notification-container">
    <!-- 固定式通知区域 -->
    <div 
      class="notification-panel"
      :class="{ 
        'panel-open': showPanel,
        'panel-compact': compactMode
      }"
      v-if="fixedNotifications.length > 0"
    >
      <div class="panel-header">
        <h3 class="panel-title">
          <NotificationIcon type="info" />
          通知 ({{ notificationCount }})
        </h3>
        <div class="panel-actions">
          <button 
            class="btn-ghost btn-sm"
            @click="markAllAsRead"
            :disabled="unreadCount === 0"
            title="全部已读"
          >
            📖
          </button>
          <button 
            class="btn-ghost btn-sm"
            @click="toggleCompactMode"
            :title="compactMode ? '展开视图' : '紧凑视图'"
          >
            {{ compactMode ? '📋' : '📝' }}
          </button>
          <button 
            class="btn-ghost btn-sm"
            @click="dismissAll"
            title="清空所有"
          >
            🗑️
          </button>
          <button 
            class="btn-ghost btn-sm"
            @click="togglePanel"
            :title="showPanel ? '收起' : '展开'"
          >
            {{ showPanel ? '▼' : '▲' }}
          </button>
        </div>
      </div>
      
      <div class="panel-content" v-if="showPanel">
        <div class="notifications-list">
          <NotificationItem
            v-for="notification in displayNotifications"
            :key="notification.id"
            :notification="notification"
            :dismissible="true"
            @dismiss="handleDismiss"
            @click="handleNotificationClick"
            @action="handleNotificationAction"
          />
          
          <div v-if="displayNotifications.length === 0" class="empty-state">
            <div class="empty-icon">🔔</div>
            <div class="empty-text">暂无通知</div>
          </div>
        </div>
      </div>
      
      <!-- 未读通知计数badge -->
      <div 
        v-if="unreadCount > 0 && !showPanel"
        class="unread-badge"
        @click="togglePanel"
      >
        {{ unreadCount }}
      </div>
    </div>
    
    <!-- Toast通知区域 -->
    <div class="toast-container">
      <TransitionGroup name="toast" tag="div">
        <ToastNotification
          v-for="notification in toastNotifications"
          :key="notification.id"
          :notification="notification"
          :dismissible="true"
          :compact="compactMode"
          @dismiss="handleDismiss"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import NotificationItem from './NotificationItem.vue'
import ToastNotification from './ToastNotification.vue'
import NotificationIcon from './NotificationIcon.vue'
import { useNotificationQueue } from './composables/useNotificationQueue.js'

// 响应式数据
const showPanel = ref(true)
const compactMode = ref(false)

// 使用通知队列管理器
const {
  // 响应式数据
  notifications,
  notificationCount,
  hasNotifications,
  unreadCount,
  
  // 计算属性
  notificationsByPriority,
  persistentNotifications,
  temporaryNotifications,
  
  // 方法
  dismissNotification,
  dismissAll,
  markAsRead,
  markAllAsRead
} = useNotificationQueue()

// 计算属性
const fixedNotifications = computed(() => {
  // 固定显示的通知：持久化通知 + 有操作的通知
  return notificationsByPriority.value.filter(n => 
    n.duration === 0 || (n.actions && n.actions.length > 0)
  )
})

const toastNotifications = computed(() => {
  // Toast显示的通知：临时通知且没有操作按钮
  return temporaryNotifications.value.filter(n => 
    !n.actions || n.actions.length === 0
  )
})

const displayNotifications = computed(() => {
  // 根据紧凑模式决定显示数量
  const maxDisplay = compactMode.value ? 3 : 10
  return fixedNotifications.value.slice(0, maxDisplay)
})

// 方法
const togglePanel = () => {
  showPanel.value = !showPanel.value
}

const toggleCompactMode = () => {
  compactMode.value = !compactMode.value
}

const handleDismiss = (notificationId) => {
  dismissNotification(notificationId)
}

const handleNotificationClick = (notification) => {
  // 点击通知标记为已读
  if (!notification.read) {
    markAsRead(notification.id)
  }
}

const handleNotificationAction = ({ notification, action }) => {
  // 处理通知操作
  if (action.handler) {
    action.handler()
  }
  
  // 某些操作后自动关闭通知
  if (action.autoClose !== false) {
    setTimeout(() => {
      dismissNotification(notification.id)
    }, 300)
  }
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1000;
}

.notification-panel {
  position: fixed;
  top: var(--toolbar-height, 50px);
  right: 16px;
  width: 360px;
  max-height: 60vh;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  transition: all 0.3s ease;
  transform: translateX(100%);
}

.notification-panel.panel-open {
  transform: translateX(0);
}

.notification-panel.panel-compact {
  width: 280px;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--gray-50);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-800);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-actions {
  display: flex;
  gap: 4px;
}

.btn-sm {
  padding: 4px 6px;
  font-size: 11px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--gray-600);
}

.btn-sm:hover {
  background: var(--gray-200);
  color: var(--gray-800);
}

.btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-content {
  max-height: 50vh;
  overflow-y: auto;
}

.notifications-list {
  padding: 8px;
}

.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: var(--gray-500);
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 14px;
}

.unread-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: var(--error-color);
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  animation: pulse 2s infinite;
}

.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

/* Toast过渡动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notification-panel {
    right: 8px;
    left: 8px;
    width: auto;
  }
  
  .toast-container {
    left: 16px;
    right: 16px;
    top: 16px;
  }
}

@media (max-width: 480px) {
  .notification-panel {
    top: 60px;
  }
  
  .panel-header {
    padding: 8px 12px;
  }
  
  .panel-title {
    font-size: 12px;
  }
}
</style>