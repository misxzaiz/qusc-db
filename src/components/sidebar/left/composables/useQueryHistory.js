import { ref, computed, onMounted } from 'vue'
import { useQueryHistoryStore } from '@/stores/queryHistory.js'
import { useNotificationStore } from '@/stores/notification.js'

export function useQueryHistory() {
  const queryHistoryStore = useQueryHistoryStore()
  const notificationStore = useNotificationStore()
  
  // 响应式数据
  const searchQuery = ref('')
  const filterType = ref('all') // all, success, error, favorites
  
  // 计算属性
  const queryHistory = computed(() => {
    let history = [...queryHistoryStore.histories]
    
    // 搜索过滤
    if (searchQuery.value.trim()) {
      queryHistoryStore.setSearchTerm(searchQuery.value)
      history = queryHistoryStore.filteredHistories
    } else {
      queryHistoryStore.setSearchTerm('')
      history = queryHistoryStore.histories
    }
    
    // 状态过滤
    if (filterType.value === 'success') {
      history = history.filter(item => !item.lastError)
    } else if (filterType.value === 'error') {
      history = history.filter(item => item.lastError)
    } else if (filterType.value === 'favorites') {
      history = history.filter(item => item.isFavorite)
    }
    
    return history.sort((a, b) => new Date(b.lastExecutedAt) - new Date(a.lastExecutedAt))
  })
  
  const hasHistory = computed(() => {
    return queryHistoryStore.histories.length > 0
  })
  
  const totalCount = computed(() => {
    return queryHistoryStore.histories.length
  })
  
  const successCount = computed(() => {
    return queryHistoryStore.histories.filter(item => !item.lastError).length
  })
  
  const errorCount = computed(() => {
    return queryHistoryStore.histories.filter(item => item.lastError).length
  })
  
  const favoriteCount = computed(() => {
    return queryHistoryStore.favoriteHistories.length
  })
  
  // 方法
  const loadHistoryQuery = (historyItem) => {
    // 触发全局事件，让工作区加载查询
    window.dispatchEvent(new CustomEvent('load-query', {
      detail: { 
        query: historyItem.query,
        connection: historyItem.connection
      }
    }))
    
    notificationStore.success('查询已加载到编辑器')
  }
  
  const copyQuery = async (query) => {
    try {
      await navigator.clipboard.writeText(query)
      notificationStore.success('查询已复制到剪贴板')
    } catch (error) {
      notificationStore.error('复制失败')
    }
  }
  
  const deleteHistoryItem = (historyId) => {
    try {
      queryHistoryStore.removeHistory(historyId)
      notificationStore.success('历史记录已删除')
    } catch (error) {
      notificationStore.error('删除失败: ' + error.message)
    }
  }
  
  const toggleFavorite = (historyId) => {
    try {
      queryHistoryStore.toggleFavorite(historyId)
      const history = queryHistoryStore.histories.find(h => h.id === historyId)
      if (history) {
        notificationStore.success(history.isFavorite ? '已添加到收藏' : '已取消收藏')
      }
    } catch (error) {
      notificationStore.error('操作失败: ' + error.message)
    }
  }
  
  const clearHistory = () => {
    notificationStore.confirm('确定要清空所有查询历史吗？此操作无法撤销。', () => {
      queryHistoryStore.clearHistory()
      notificationStore.success('查询历史已清空')
    })
  }
  
  const exportHistory = () => {
    try {
      const data = queryHistoryStore.exportHistory()
      const jsonData = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `query-history-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      URL.revokeObjectURL(url)
      notificationStore.success('查询历史已导出')
    } catch (error) {
      notificationStore.error('导出失败: ' + error.message)
    }
  }
  
  const importHistory = (data, mergeMode = 'merge') => {
    try {
      queryHistoryStore.importHistory(data, mergeMode)
      notificationStore.success('查询历史已导入')
    } catch (error) {
      notificationStore.error('导入失败: ' + error.message)
    }
  }
  
  const updateHistory = (id, updates) => {
    try {
      queryHistoryStore.updateHistory(id, updates)
      notificationStore.success('历史记录已更新')
    } catch (error) {
      notificationStore.error('更新失败: ' + error.message)
    }
  }
  
  const truncateQuery = (query, length = 60) => {
    return query.length > length ? query.substring(0, length) + '...' : query
  }
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return '刚刚'
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}小时前`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}天前`
    
    return date.toLocaleDateString()
  }
  
  const formatDuration = (ms) => {
    if (!ms) return '0ms'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }
  
  const getQueryTypeIcon = (query) => {
    const trimmed = query.trim().toUpperCase()
    if (trimmed.startsWith('SELECT')) return '🔍'
    if (trimmed.startsWith('INSERT')) return '➕'
    if (trimmed.startsWith('UPDATE')) return '✏️'
    if (trimmed.startsWith('DELETE')) return '🗑️'
    if (trimmed.startsWith('CREATE')) return '🔨'
    if (trimmed.startsWith('DROP')) return '💥'
    return '📝'
  }
  
  // 生命周期
  onMounted(() => {
    queryHistoryStore.initialize()
  })
  
  return {
    // 响应式数据
    searchQuery,
    filterType,
    
    // 计算属性
    queryHistory,
    hasHistory,
    totalCount,
    successCount,
    errorCount,
    favoriteCount,
    
    // Store引用
    queryHistoryStore,
    
    // 方法
    loadHistoryQuery,
    copyQuery,
    deleteHistoryItem,
    toggleFavorite,
    clearHistory,
    exportHistory,
    importHistory,
    updateHistory,
    truncateQuery,
    formatTime,
    formatDuration,
    getQueryTypeIcon
  }
}