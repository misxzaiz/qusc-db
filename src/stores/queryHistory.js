import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePersistence } from '@/composables/usePersistence.js'

export const useQueryHistoryStore = defineStore('queryHistory', () => {
  // 持久化配置
  const persistence = usePersistence({
    adapter: 'local',
    keyPrefix: 'qusc-db-history'
  })
  
  // 响应式状态
  const histories = ref([])
  const maxHistorySize = ref(100)
  const searchTerm = ref('')
  const selectedTags = ref(new Set())
  const sortBy = ref('timestamp') // timestamp, frequency, duration
  const sortOrder = ref('desc') // desc, asc
  
  // 计算属性
  const filteredHistories = computed(() => {
    let filtered = histories.value
    
    // 文本搜索过滤
    if (searchTerm.value) {
      const term = searchTerm.value.toLowerCase()
      filtered = filtered.filter(history => 
        history.query.toLowerCase().includes(term) ||
        history.description?.toLowerCase().includes(term) ||
        history.connection?.name?.toLowerCase().includes(term) ||
        history.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }
    
    // 标签过滤
    if (selectedTags.value.size > 0) {
      filtered = filtered.filter(history =>
        history.tags.some(tag => selectedTags.value.has(tag))
      )
    }
    
    // 排序
    filtered.sort((a, b) => {
      let valueA, valueB
      
      switch (sortBy.value) {
        case 'frequency':
          valueA = a.executionCount
          valueB = b.executionCount
          break
        case 'duration':
          valueA = a.lastDuration || 0
          valueB = b.lastDuration || 0
          break
        case 'timestamp':
        default:
          valueA = new Date(a.lastExecutedAt)
          valueB = new Date(b.lastExecutedAt)
          break
      }
      
      return sortOrder.value === 'desc' ? valueB - valueA : valueA - valueB
    })
    
    return filtered
  })
  
  const recentHistories = computed(() => {
    return histories.value
      .slice()
      .sort((a, b) => new Date(b.lastExecutedAt) - new Date(a.lastExecutedAt))
      .slice(0, 10)
  })
  
  const favoriteHistories = computed(() => {
    return histories.value.filter(h => h.isFavorite)
  })
  
  const allTags = computed(() => {
    const tags = new Set()
    histories.value.forEach(history => {
      history.tags.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  })
  
  const statistics = computed(() => {
    const stats = {
      totalQueries: histories.value.length,
      totalExecutions: histories.value.reduce((sum, h) => sum + h.executionCount, 0),
      averageDuration: 0,
      topConnections: {},
      queryTypes: {
        select: 0,
        insert: 0,
        update: 0,
        delete: 0,
        create: 0,
        drop: 0,
        other: 0
      }
    }
    
    let totalDuration = 0
    let durationCount = 0
    
    histories.value.forEach(history => {
      // 统计执行时长
      if (history.lastDuration) {
        totalDuration += history.lastDuration
        durationCount++
      }
      
      // 统计连接使用情况
      const connName = history.connection?.name || '未知连接'
      stats.topConnections[connName] = (stats.topConnections[connName] || 0) + history.executionCount
      
      // 统计查询类型
      const queryType = getQueryType(history.query)
      stats.queryTypes[queryType] = (stats.queryTypes[queryType] || 0) + history.executionCount
    })
    
    if (durationCount > 0) {
      stats.averageDuration = totalDuration / durationCount
    }
    
    return stats
  })
  
  // 辅助函数：获取查询类型
  const getQueryType = (query) => {
    const trimmed = query.trim().toUpperCase()
    if (trimmed.startsWith('SELECT')) return 'select'
    if (trimmed.startsWith('INSERT')) return 'insert'
    if (trimmed.startsWith('UPDATE')) return 'update'
    if (trimmed.startsWith('DELETE')) return 'delete'
    if (trimmed.startsWith('CREATE')) return 'create'
    if (trimmed.startsWith('DROP')) return 'drop'
    return 'other'
  }
  
  // 辅助函数：生成查询描述
  const generateDescription = (query) => {
    const trimmed = query.trim()
    const firstLine = trimmed.split('\n')[0]
    
    if (firstLine.length <= 50) {
      return firstLine
    }
    
    return firstLine.substring(0, 47) + '...'
  }
  
  // 添加查询到历史记录
  const addToHistory = (queryData) => {
    const {
      query,
      connection,
      result,
      duration,
      error,
      description: customDescription
    } = queryData
    
    const queryHash = generateQueryHash(query)
    const existingIndex = histories.value.findIndex(h => h.queryHash === queryHash)
    
    const historyItem = {
      id: existingIndex >= 0 ? histories.value[existingIndex].id : Date.now().toString(),
      queryHash,
      query: query.trim(),
      description: customDescription || generateDescription(query),
      connection: {
        id: connection.id,
        name: connection.name || connection.config?.database || 'Unknown',
        type: connection.config?.type || 'Unknown'
      },
      createdAt: existingIndex >= 0 ? histories.value[existingIndex].createdAt : new Date().toISOString(),
      lastExecutedAt: new Date().toISOString(),
      executionCount: existingIndex >= 0 ? histories.value[existingIndex].executionCount + 1 : 1,
      lastDuration: duration,
      lastResult: result ? {
        rowCount: result.rows?.length || 0,
        columnCount: result.columns?.length || 0,
        affectedRows: result.affectedRows
      } : null,
      lastError: error ? {
        message: error.message,
        code: error.code
      } : null,
      tags: existingIndex >= 0 ? histories.value[existingIndex].tags : generateAutoTags(query),
      isFavorite: existingIndex >= 0 ? histories.value[existingIndex].isFavorite : false,
      notes: existingIndex >= 0 ? histories.value[existingIndex].notes : ''
    }
    
    if (existingIndex >= 0) {
      // 更新现有历史记录
      histories.value[existingIndex] = historyItem
    } else {
      // 添加新的历史记录
      histories.value.unshift(historyItem)
      
      // 限制历史记录数量
      if (histories.value.length > maxHistorySize.value) {
        histories.value = histories.value.slice(0, maxHistorySize.value)
      }
    }
    
    saveToStorage()
  }
  
  // 生成查询哈希（用于去重）
  const generateQueryHash = (query) => {
    // 标准化查询语句用于生成哈希
    const normalized = query
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/;\s*$/, '')
      .toLowerCase()
    
    // 简单哈希算法
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转为32位整数
    }
    
    return hash.toString()
  }
  
  // 自动生成标签
  const generateAutoTags = (query) => {
    const tags = []
    const upperQuery = query.toUpperCase()
    
    // 基于查询类型添加标签
    const queryType = getQueryType(query)
    tags.push(queryType)
    
    // 基于关键字添加标签
    if (upperQuery.includes('JOIN')) tags.push('join')
    if (upperQuery.includes('WHERE')) tags.push('filtered')
    if (upperQuery.includes('GROUP BY')) tags.push('grouped')
    if (upperQuery.includes('ORDER BY')) tags.push('sorted')
    if (upperQuery.includes('LIMIT')) tags.push('limited')
    if (upperQuery.includes('DISTINCT')) tags.push('distinct')
    
    // 基于复杂度添加标签
    const lineCount = query.split('\n').length
    if (lineCount > 10) tags.push('complex')
    else if (lineCount > 3) tags.push('medium')
    else tags.push('simple')
    
    return tags
  }
  
  // 更新历史记录
  const updateHistory = (id, updates) => {
    const index = histories.value.findIndex(h => h.id === id)
    if (index >= 0) {
      histories.value[index] = { ...histories.value[index], ...updates }
      saveToStorage()
    }
  }
  
  // 删除历史记录
  const removeHistory = (id) => {
    const index = histories.value.findIndex(h => h.id === id)
    if (index >= 0) {
      histories.value.splice(index, 1)
      saveToStorage()
    }
  }
  
  // 批量删除历史记录
  const removeHistories = (ids) => {
    histories.value = histories.value.filter(h => !ids.includes(h.id))
    saveToStorage()
  }
  
  // 清空历史记录
  const clearHistory = () => {
    histories.value = []
    saveToStorage()
  }
  
  // 切换收藏状态
  const toggleFavorite = (id) => {
    const index = histories.value.findIndex(h => h.id === id)
    if (index >= 0) {
      histories.value[index].isFavorite = !histories.value[index].isFavorite
      saveToStorage()
    }
  }
  
  // 添加标签
  const addTag = (id, tag) => {
    const index = histories.value.findIndex(h => h.id === id)
    if (index >= 0 && !histories.value[index].tags.includes(tag)) {
      histories.value[index].tags.push(tag)
      saveToStorage()
    }
  }
  
  // 移除标签
  const removeTag = (id, tag) => {
    const index = histories.value.findIndex(h => h.id === id)
    if (index >= 0) {
      histories.value[index].tags = histories.value[index].tags.filter(t => t !== tag)
      saveToStorage()
    }
  }
  
  // 搜索和过滤
  const setSearchTerm = (term) => {
    searchTerm.value = term
  }
  
  const toggleTagFilter = (tag) => {
    if (selectedTags.value.has(tag)) {
      selectedTags.value.delete(tag)
    } else {
      selectedTags.value.add(tag)
    }
  }
  
  const clearFilters = () => {
    searchTerm.value = ''
    selectedTags.value.clear()
  }
  
  const setSorting = (field, order = 'desc') => {
    sortBy.value = field
    sortOrder.value = order
  }
  
  // 导入导出
  const exportHistory = () => {
    return {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      histories: histories.value,
      settings: {
        maxHistorySize: maxHistorySize.value
      }
    }
  }
  
  const importHistory = (data, mergeMode = 'replace') => {
    if (!data.histories || !Array.isArray(data.histories)) {
      throw new Error('无效的历史记录数据格式')
    }
    
    if (mergeMode === 'replace') {
      histories.value = data.histories
    } else if (mergeMode === 'merge') {
      const existingHashes = new Set(histories.value.map(h => h.queryHash))
      const newHistories = data.histories.filter(h => !existingHashes.has(h.queryHash))
      histories.value = [...histories.value, ...newHistories]
    }
    
    if (data.settings) {
      maxHistorySize.value = data.settings.maxHistorySize || 100
    }
    
    // 限制历史记录数量
    if (histories.value.length > maxHistorySize.value) {
      histories.value = histories.value
        .sort((a, b) => new Date(b.lastExecutedAt) - new Date(a.lastExecutedAt))
        .slice(0, maxHistorySize.value)
    }
    
    saveToStorage()
  }
  
  // 存储管理
  const saveToStorage = () => {
    persistence.save('histories', histories.value)
    persistence.save('settings', {
      maxHistorySize: maxHistorySize.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })
  }
  
  const loadFromStorage = () => {
    try {
      const savedHistories = persistence.load('histories')
      const savedSettings = persistence.load('settings')
      
      if (savedHistories && Array.isArray(savedHistories)) {
        histories.value = savedHistories
      }
      
      if (savedSettings) {
        maxHistorySize.value = savedSettings.maxHistorySize || 100
        sortBy.value = savedSettings.sortBy || 'timestamp'
        sortOrder.value = savedSettings.sortOrder || 'desc'
      }
    } catch (error) {
      console.warn('加载查询历史失败:', error)
    }
  }
  
  // 初始化
  const initialize = () => {
    loadFromStorage()
  }
  
  return {
    // 状态
    histories,
    maxHistorySize,
    searchTerm,
    selectedTags,
    sortBy,
    sortOrder,
    
    // 计算属性
    filteredHistories,
    recentHistories,
    favoriteHistories,
    allTags,
    statistics,
    
    // 操作方法
    addToHistory,
    updateHistory,
    removeHistory,
    removeHistories,
    clearHistory,
    toggleFavorite,
    addTag,
    removeTag,
    
    // 搜索和过滤
    setSearchTerm,
    toggleTagFilter,
    clearFilters,
    setSorting,
    
    // 导入导出
    exportHistory,
    importHistory,
    
    // 初始化
    initialize
  }
})