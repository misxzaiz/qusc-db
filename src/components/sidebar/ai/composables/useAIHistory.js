import { ref, computed } from 'vue'
import { useAIStore } from '@/stores/ai.js'
import { useNotificationStore } from '@/stores/notification.js'

export function useAIHistory() {
  const aiStore = useAIStore()
  const notificationStore = useNotificationStore()
  
  // 响应式数据
  const showHistory = ref(false)
  const searchQuery = ref('')
  const selectedType = ref('all') // all, sql-generation, error-explanation, optimization
  
  // 计算属性
  const aiHistory = computed(() => {
    let history = aiStore.history || []
    
    // 类型过滤
    if (selectedType.value !== 'all') {
      history = history.filter(item => item.type === selectedType.value)
    }
    
    // 搜索过滤
    if (searchQuery.value.trim()) {
      const search = searchQuery.value.toLowerCase()
      history = history.filter(item => 
        item.input.toLowerCase().includes(search) ||
        (item.output && item.output.toLowerCase().includes(search))
      )
    }
    
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  })
  
  const recentHistory = computed(() => {
    return aiHistory.value.slice(0, 20) // 显示最近20条
  })
  
  const hasHistory = computed(() => {
    return aiHistory.value.length > 0
  })
  
  const totalCount = computed(() => {
    return aiStore.history?.length || 0
  })
  
  const typeCount = computed(() => {
    const counts = {}
    if (aiStore.history) {
      aiStore.history.forEach(item => {
        counts[item.type] = (counts[item.type] || 0) + 1
      })
    }
    return counts
  })
  
  // 方法
  const toggleHistory = () => {
    showHistory.value = !showHistory.value
  }
  
  const closeHistory = () => {
    showHistory.value = false
  }
  
  const loadHistoryItem = (item) => {
    // 根据类型执行不同的加载操作
    switch (item.type) {
      case 'sql-generation':
        // 加载生成的SQL到编辑器
        window.dispatchEvent(new CustomEvent('load-query', {
          detail: { query: item.output }
        }))
        notificationStore.success('SQL已加载到编辑器')
        break
      case 'error-explanation':
        // 显示错误解释
        notificationStore.info(item.output, 8000)
        break
      case 'optimization':
        // 加载优化后的SQL
        window.dispatchEvent(new CustomEvent('load-query', {
          detail: { query: item.output }
        }))
        notificationStore.success('优化后的SQL已加载到编辑器')
        break
      default:
        notificationStore.info('历史记录已加载')
    }
    
    closeHistory()
  }
  
  const deleteHistoryItem = (itemId) => {
    try {
      aiStore.deleteHistoryItem(itemId)
      notificationStore.success('历史记录已删除')
    } catch (error) {
      notificationStore.error('删除失败')
    }
  }
  
  const clearAllHistory = () => {
    notificationStore.confirm('确定要清空所有AI历史记录吗？', () => {
      aiStore.clearHistory()
      notificationStore.success('AI历史记录已清空')
      closeHistory()
    })
  }
  
  const exportHistory = () => {
    try {
      const historyData = aiHistory.value.map(item => ({
        type: item.type,
        input: item.input,
        output: item.output,
        timestamp: item.timestamp,
        success: item.success
      }))
      
      const jsonData = JSON.stringify(historyData, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-history-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      URL.revokeObjectURL(url)
      notificationStore.success('AI历史记录已导出')
    } catch (error) {
      notificationStore.error('导出失败')
    }
  }
  
  const getHistoryTypeIcon = (type) => {
    switch (type) {
      case 'sql-generation':
        return '🔮'
      case 'error-explanation':
        return ' '
      case 'optimization':
        return '⚡'
      case 'schema-analysis':
        return '📊'
      default:
        return '💬'
    }
  }
  
  const getHistoryTypeLabel = (type) => {
    switch (type) {
      case 'sql-generation':
        return 'SQL生成'
      case 'error-explanation':
        return '错误解释'
      case 'optimization':
        return 'SQL优化'
      case 'schema-analysis':
        return '结构分析'
      default:
        return '其他'
    }
  }
  
  const truncateText = (text, length = 40) => {
    if (!text) return ''
    return text.length > length ? text.substring(0, length) + '...' : text
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
  
  return {
    // 响应式数据
    showHistory,
    searchQuery,
    selectedType,
    
    // 计算属性
    aiHistory,
    recentHistory,
    hasHistory,
    totalCount,
    typeCount,
    
    // 方法
    toggleHistory,
    closeHistory,
    loadHistoryItem,
    deleteHistoryItem,
    clearAllHistory,
    exportHistory,
    getHistoryTypeIcon,
    getHistoryTypeLabel,
    truncateText,
    formatTime
  }
}