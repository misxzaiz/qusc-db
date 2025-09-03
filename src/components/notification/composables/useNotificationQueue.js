import { computed } from 'vue'
import { useNotificationStore } from '@/stores/notification.js'

export function useNotificationQueue() {
  const notificationStore = useNotificationStore()
  
  // 计算属性
  const notifications = computed(() => notificationStore.notifications)
  const notificationCount = computed(() => notifications.value.length)
  const hasNotifications = computed(() => notifications.value.length > 0)
  
  // 按优先级和类型分组
  const notificationsByPriority = computed(() => {
    const priorityOrder = {
      'error': 1,
      'warning': 2,
      'loading': 3,
      'progress': 4,
      'info': 5,
      'success': 6
    }
    
    return notifications.value.sort((a, b) => {
      const priorityA = priorityOrder[a.type] || 99
      const priorityB = priorityOrder[b.type] || 99
      
      // 优先级相同时按时间排序（新的在前）
      if (priorityA === priorityB) {
        return new Date(b.timestamp) - new Date(a.timestamp)
      }
      
      return priorityA - priorityB
    })
  })
  
  // 按类型统计
  const notificationsByType = computed(() => {
    return notifications.value.reduce((acc, notification) => {
      const type = notification.type || 'info'
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(notification)
      return acc
    }, {})
  })
  
  // 未读通知（可扩展功能）
  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.read).length
  })
  
  // 持久化通知（duration为0的通知）
  const persistentNotifications = computed(() => {
    return notifications.value.filter(n => n.duration === 0)
  })
  
  // 临时通知（有自动隐藏时间的通知）
  const temporaryNotifications = computed(() => {
    return notifications.value.filter(n => n.duration > 0)
  })
  
  // 方法
  const dismissNotification = (id) => {
    notificationStore.hide(id)
  }
  
  const dismissAll = () => {
    notificationStore.clear()
  }
  
  const markAsRead = (id) => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
    }
  }
  
  const markAllAsRead = () => {
    notifications.value.forEach(n => {
      n.read = true
    })
  }
  
  // 通知过滤
  const filterByType = (type) => {
    return notifications.value.filter(n => n.type === type)
  }
  
  const filterByDateRange = (startDate, endDate) => {
    return notifications.value.filter(n => {
      const notificationDate = new Date(n.timestamp)
      return notificationDate >= startDate && notificationDate <= endDate
    })
  }
  
  // 获取最新通知
  const getLatestNotification = () => {
    if (notifications.value.length === 0) return null
    return notifications.value[0]
  }
  
  // 获取通知统计信息
  const getNotificationStats = () => {
    return notificationStore.getStats()
  }
  
  return {
    // 响应式数据
    notifications,
    notificationCount,
    hasNotifications,
    unreadCount,
    
    // 计算属性
    notificationsByPriority,
    notificationsByType,
    persistentNotifications,
    temporaryNotifications,
    
    // 方法
    dismissNotification,
    dismissAll,
    markAsRead,
    markAllAsRead,
    filterByType,
    filterByDateRange,
    getLatestNotification,
    getNotificationStats
  }
}