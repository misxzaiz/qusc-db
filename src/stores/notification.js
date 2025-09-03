import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  // 通知队列
  const notifications = ref([])
  const maxNotifications = 5

  // 显示通知
  const show = (message, type = 'success', duration = 3000, actions = []) => {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type,
      duration,
      actions,
      timestamp: new Date(),
      visible: true
    }

    notifications.value.unshift(notification)

    // 限制通知数量
    if (notifications.value.length > maxNotifications) {
      notifications.value = notifications.value.slice(0, maxNotifications)
    }

    // 自动隐藏
    if (duration > 0) {
      setTimeout(() => {
        hide(notification.id)
      }, duration)
    }

    return notification.id
  }

  // 隐藏通知
  const hide = (id) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value[index].visible = false
      
      // 延迟移除以支持动画
      setTimeout(() => {
        const currentIndex = notifications.value.findIndex(n => n.id === id)
        if (currentIndex > -1) {
          notifications.value.splice(currentIndex, 1)
        }
      }, 300)
    }
  }

  // 清空所有通知
  const clear = () => {
    notifications.value.forEach(n => {
      n.visible = false
    })
    
    setTimeout(() => {
      notifications.value = []
    }, 300)
  }

  // 便捷方法
  const success = (message, duration = 3000, actions = []) => {
    return show(message, 'success', duration, actions)
  }

  const error = (message, duration = 5000, actions = []) => {
    return show(message, 'error', duration, actions)
  }

  const warning = (message, duration = 4000, actions = []) => {
    return show(message, 'warning', duration, actions)
  }

  const info = (message, duration = 3000, actions = []) => {
    return show(message, 'info', duration, actions)
  }

  // 带确认的通知
  const confirm = (message, onConfirm, onCancel = null) => {
    const actions = [
      {
        label: '确认',
        type: 'primary',
        handler: () => {
          onConfirm && onConfirm()
          hide(notificationId)
        }
      }
    ]

    if (onCancel) {
      actions.push({
        label: '取消',
        type: 'secondary',
        handler: () => {
          onCancel && onCancel()
          hide(notificationId)
        }
      })
    }

    const notificationId = show(message, 'info', 0, actions)
    return notificationId
  }

  // 带操作的通知
  const withActions = (message, type, actions, duration = 0) => {
    return show(message, type, duration, actions)
  }

  // 进度通知
  const progress = (message, initialProgress = 0) => {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type: 'progress',
      progress: initialProgress,
      timestamp: new Date(),
      visible: true
    }

    notifications.value.unshift(notification)

    // 限制通知数量
    if (notifications.value.length > maxNotifications) {
      notifications.value = notifications.value.slice(0, maxNotifications)
    }

    // 返回更新进度的方法
    const updateProgress = (progress, newMessage = null) => {
      const index = notifications.value.findIndex(n => n.id === notification.id)
      if (index > -1) {
        notifications.value[index].progress = progress
        if (newMessage) {
          notifications.value[index].message = newMessage
        }
        
        // 如果进度达到100%，自动隐藏
        if (progress >= 100) {
          setTimeout(() => {
            hide(notification.id)
          }, 1000)
        }
      }
    }

    return {
      id: notification.id,
      updateProgress,
      hide: () => hide(notification.id)
    }
  }

  // 加载通知
  const loading = (message) => {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type: 'loading',
      timestamp: new Date(),
      visible: true
    }

    notifications.value.unshift(notification)

    // 限制通知数量
    if (notifications.value.length > maxNotifications) {
      notifications.value = notifications.value.slice(0, maxNotifications)
    }

    return {
      id: notification.id,
      hide: () => hide(notification.id),
      success: (successMessage) => {
        hide(notification.id)
        return success(successMessage)
      },
      error: (errorMessage) => {
        hide(notification.id)
        return error(errorMessage)
      }
    }
  }

  // 获取通知统计
  const getStats = () => {
    const now = new Date()
    const today = notifications.value.filter(n => {
      const notificationDate = new Date(n.timestamp)
      return notificationDate.toDateString() === now.toDateString()
    })

    const typeStats = notifications.value.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {})

    return {
      total: notifications.value.length,
      today: today.length,
      typeStats
    }
  }

  return {
    // 状态
    notifications,
    
    // 基础方法
    show,
    hide,
    clear,
    
    // 便捷方法
    success,
    error,
    warning,
    info,
    confirm,
    withActions,
    progress,
    loading,
    
    // 工具方法
    getStats
  }
})