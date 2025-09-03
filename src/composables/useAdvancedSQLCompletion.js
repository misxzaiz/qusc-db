import { ref, computed, watch } from 'vue'
import { useConnectionStore } from '@/stores/connection.js'
import { useTableReference } from '@/composables/useTableReference.js'

/**
 * 高级SQL智能补全系统
 * 基于现有架构，提供上下文感知的智能补全功能
 */
export function useAdvancedSQLCompletion() {
  const connectionStore = useConnectionStore()
  const tableReference = useTableReference()
  
  // 状态管理
  const completionSuggestions = ref([])
  const showCompletions = ref(false)
  const selectedIndex = ref(0)
  const isLoading = ref(false)
  const completionCache = new Map()
  
  // 缓存键生成
  const getCacheKey = (sql, cursorPos, connectionId) => {
    return `${connectionId}_${sql.slice(0, cursorPos)}_${cursorPos}`
  }
  
  // SQL上下文解析
  const parseContext = (sql, cursorPos) => {
    const beforeCursor = sql.slice(0, cursorPos).toUpperCase()
    const afterCursor = sql.slice(cursorPos)
    
    // 检测当前SQL语句类型
    const statementType = getStatementType(beforeCursor)
    
    // 检测当前所在的SQL子句
    const currentClause = getCurrentClause(beforeCursor)
    
    // 检测是否在表名或字段名位置
    const completionType = getCompletionType(beforeCursor, currentClause)
    
    // 提取已有的表引用和别名
    const { tables, aliases } = extractTables(sql)
    
    // 检测光标前的词汇
    const currentWord = getCurrentWord(beforeCursor)
    
    return {
      statementType,
      currentClause,
      completionType,
      tables,
      aliases,
      currentWord,
      beforeCursor,
      afterCursor,
      cursorPos
    }
  }
  
  // 获取SQL语句类型
  const getStatementType = (sql) => {
    const trimmed = sql.trim()
    if (trimmed.startsWith('SELECT')) return 'SELECT'
    if (trimmed.startsWith('INSERT')) return 'INSERT'
    if (trimmed.startsWith('UPDATE')) return 'UPDATE'
    if (trimmed.startsWith('DELETE')) return 'DELETE'
    if (trimmed.startsWith('CREATE')) return 'CREATE'
    if (trimmed.startsWith('ALTER')) return 'ALTER'
    if (trimmed.startsWith('DROP')) return 'DROP'
    return 'UNKNOWN'
  }
  
  // 获取当前SQL子句
  const getCurrentClause = (sql) => {
    const clauses = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT']
    let currentClause = 'SELECT'
    
    for (const clause of clauses) {
      const lastIndex = sql.lastIndexOf(clause)
      if (lastIndex !== -1) {
        // 检查是否是最后出现的子句
        const laterClause = clauses.find(c => 
          sql.lastIndexOf(c) > lastIndex && clauses.indexOf(c) > clauses.indexOf(clause)
        )
        if (!laterClause) {
          currentClause = clause
          break
        }
      }
    }
    
    return currentClause
  }
  
  // 获取补全类型
  const getCompletionType = (sql, clause) => {
    const trimmed = sql.trim()
    
    // 检查是否在点号后面 (字段补全)
    if (trimmed.endsWith('.')) {
      return 'COLUMN'
    }
    
    // 检查是否在表名位置
    if (clause === 'FROM' || clause === 'JOIN') {
      const words = trimmed.split(/\s+/)
      const lastWord = words[words.length - 1]
      if (clause === 'FROM' || (clause === 'JOIN' && !lastWord.includes('.'))) {
        return 'TABLE'
      }
    }
    
    // 检查是否在字段名位置
    if (clause === 'SELECT' || clause === 'WHERE' || clause === 'GROUP BY' || clause === 'ORDER BY') {
      return 'COLUMN_OR_KEYWORD'
    }
    
    return 'KEYWORD'
  }
  
  // 提取表名和别名
  const extractTables = (sql) => {
    const tables = []
    const aliases = new Map()
    
    // 匹配FROM子句中的表（修复AS关键字处理）
    const fromMatches = sql.match(/FROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi)
    if (fromMatches) {
      fromMatches.forEach(match => {
        const cleanMatch = match.replace(/FROM\s+/i, '').trim()
        const parts = cleanMatch.split(/\s+/)
        const tableName = parts[0]
        
        // 正确处理AS关键字
        let alias = null
        if (parts.length === 2 && parts[1].toUpperCase() !== 'AS') {
          // 情况： FROM users u
          alias = parts[1]
        } else if (parts.length === 3 && parts[1].toUpperCase() === 'AS') {
          // 情况： FROM users AS u
          alias = parts[2]
        }
        
        console.log(`📁 FROM解析: ${tableName} -> 别名: ${alias || '无'}`)
        
        tables.push({ name: tableName, alias })
        if (alias && alias !== tableName) {
          aliases.set(alias.toLowerCase(), tableName.toLowerCase())
        }
        // 表名本身也可以作为引用
        aliases.set(tableName.toLowerCase(), tableName.toLowerCase())
      })
    }
    
    // 匹配JOIN子句中的表（修复AS关键字处理）
    const joinMatches = sql.match(/JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi)
    if (joinMatches) {
      joinMatches.forEach(match => {
        const cleanMatch = match.replace(/.*JOIN\s+/i, '').trim()
        const parts = cleanMatch.split(/\s+/)
        const tableName = parts[0]
        
        // 正确处理AS关键字
        let alias = null
        if (parts.length === 2 && parts[1].toUpperCase() !== 'AS') {
          // 情况： JOIN orders o
          alias = parts[1]
        } else if (parts.length === 3 && parts[1].toUpperCase() === 'AS') {
          // 情况： JOIN orders AS o
          alias = parts[2]
        }
        
        console.log(`🔗 JOIN解析: ${tableName} -> 别名: ${alias || '无'}`)
        
        tables.push({ name: tableName, alias })
        if (alias && alias !== tableName) {
          aliases.set(alias.toLowerCase(), tableName.toLowerCase())
        }
        // 表名本身也可以作为引用
        aliases.set(tableName.toLowerCase(), tableName.toLowerCase())
      })
    }
    
    return { tables, aliases }
  }
  
  // 获取光标前的当前词汇
  const getCurrentWord = (sql) => {
    const match = sql.match(/[\w.]*$/)
    return match ? match[0] : ''
  }
  
  // 表名补全
  const getTableCompletions = async (context) => {
    const currentSchema = connectionStore.getCurrentSchema()
    if (!currentSchema || currentSchema.length === 0) return []
    
    const suggestions = currentSchema.map(table => ({
      label: table.name || table.table_name,
      type: 'table',
      info: `表 • ${table.columns?.length || 0}个字段`,
      detail: table.comment || '数据表',
      insertText: table.name || table.table_name,
      boost: 10,
      iconClass: 'icon-table'
    }))
    
    return filterSuggestions(suggestions, context.currentWord)
  }
  
  // 找到最佳的表引用（优先使用别名）
  const findBestTableReference = (table, tables) => {
    const tableName = table.name || table.table_name
    
    // 在tables中查找对应的表信息
    const tableInfo = tables.find(t => 
      (t.name || '').toLowerCase() === tableName.toLowerCase()
    )
    
    // 如果有别名，优先使用别名
    if (tableInfo && tableInfo.alias) {
      console.log(`✨ 使用表别名: ${tableName} -> ${tableInfo.alias}`)
      return tableInfo.alias
    }
    
    // 否则使用表名
    console.log(`📋 使用表名: ${tableName}`)
    return tableName
  }
  
  // 字段补全
  const getColumnCompletions = async (context) => {
    const { currentWord, tables, aliases } = context
    const suggestions = []
    
    // 解析字段引用 (例: u.username)
    let targetTable = null
    let fieldPrefix = ''
    
    if (currentWord.includes('.')) {
      const parts = currentWord.split('.')
      const tableAlias = parts[0]
      fieldPrefix = parts[1] || ''
      
      // 查找对应的表名
      if (aliases.has(tableAlias)) {
        targetTable = aliases.get(tableAlias)
      } else {
        // 可能直接是表名
        targetTable = tables.find(t => t.name === tableAlias)?.name
      }
    } else {
      // 没有表前缀，提供所有相关表的字段
      fieldPrefix = currentWord
    }
    
    const currentSchema = connectionStore.getCurrentSchema()
    if (!currentSchema) return suggestions
    
    // 获取目标表的字段
    const relevantTables = targetTable 
      ? [currentSchema.find(t => (t.name || t.table_name) === targetTable)]
      : currentSchema.filter(t => 
          tables.some(table => (t.name || t.table_name) === table.name)
        )
    
    relevantTables.forEach(table => {
      if (!table || !table.columns) return
      
      table.columns.forEach(column => {
        const columnName = column.name || column.column_name
        if (!columnName) return
        
        // 构建正确的字段引用（修复别名问题）
        let insertText = columnName // 默认只插入字段名
        
        if (targetTable && currentWord.includes('.')) {
          // 情况： u.| -> u.username
          // 只需要插入字段名，因为别名已经在前面了
          insertText = columnName
        } else if (!currentWord.includes('.')) {
          // 情况： 无表前缀的全局字段补全
          // 需要找到合适的表别名或表名
          const tableReference = findBestTableReference(table, tables)
          insertText = `${tableReference}.${columnName}`
        }
        
        console.log(`📝 生成字段补全: ${columnName} -> insertText: ${insertText}`)
        
        suggestions.push({
          label: columnName,
          type: 'column',
          info: `${column.data_type || 'unknown'} • ${table.name || table.table_name}`,
          detail: column.comment || `${table.name || table.table_name}表字段`,
          insertText: insertText,
          boost: columnName.toLowerCase().startsWith(fieldPrefix.toLowerCase()) ? 15 : 5,
          iconClass: getColumnIcon(column),
          tableOrigin: table.name || table.table_name
        })
      })
    })
    
    return filterSuggestions(suggestions, fieldPrefix)
  }
  
  // 关键字补全
  const getKeywordCompletions = (context) => {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
      'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'DISTINCT',
      'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'INDEX',
      'AND', 'OR', 'NOT', 'LIKE', 'IN', 'EXISTS', 'BETWEEN', 'IS NULL', 'IS NOT NULL'
    ]
    
    return keywords
      .filter(keyword => 
        keyword.toLowerCase().includes(context.currentWord.toLowerCase())
      )
      .map(keyword => ({
        label: keyword,
        type: 'keyword',
        info: 'SQL关键字',
        insertText: keyword,
        boost: keyword.toLowerCase().startsWith(context.currentWord.toLowerCase()) ? 20 : 10,
        iconClass: 'icon-keyword'
      }))
  }
  
  // 获取字段图标
  const getColumnIcon = (column) => {
    const type = (column.data_type || '').toLowerCase()
    if (column.primary_key) return 'icon-key'
    if (type.includes('int') || type.includes('number')) return 'icon-number'
    if (type.includes('varchar') || type.includes('text') || type.includes('char')) return 'icon-text'
    if (type.includes('date') || type.includes('time')) return 'icon-date'
    if (type.includes('bool')) return 'icon-boolean'
    return 'icon-column'
  }
  
  // 过滤和排序建议
  const filterSuggestions = (suggestions, query) => {
    if (!query) return suggestions.sort((a, b) => b.boost - a.boost)
    
    const lowerQuery = query.toLowerCase()
    
    return suggestions
      .filter(suggestion => 
        suggestion.label.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => {
        // 精确匹配优先
        const aExact = a.label.toLowerCase() === lowerQuery
        const bExact = b.label.toLowerCase() === lowerQuery
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        // 前缀匹配优先
        const aPrefix = a.label.toLowerCase().startsWith(lowerQuery)
        const bPrefix = b.label.toLowerCase().startsWith(lowerQuery)
        if (aPrefix && !bPrefix) return -1
        if (!aPrefix && bPrefix) return 1
        
        // 按boost值排序
        return b.boost - a.boost
      })
  }
  
  // 主要的补全获取函数
  const getCompletions = async (sql, cursorPos) => {
    if (!connectionStore.currentConnection) {
      return []
    }
    
    isLoading.value = true
    
    try {
      const context = parseContext(sql, cursorPos)
      let suggestions = []
      
      // 根据上下文类型获取相应的补全建议
      switch (context.completionType) {
        case 'TABLE':
          suggestions = await getTableCompletions(context)
          break
        case 'COLUMN':
          suggestions = await getColumnCompletions(context)
          break
        case 'COLUMN_OR_KEYWORD':
          // 组合字段和关键字补全
          const columnSuggestions = await getColumnCompletions(context)
          const keywordSuggestions = getKeywordCompletions(context)
          suggestions = [...columnSuggestions, ...keywordSuggestions]
          break
        default:
          suggestions = getKeywordCompletions(context)
      }
      
      return suggestions.slice(0, 20) // 限制建议数量
    } catch (error) {
      console.error('获取补全建议失败:', error)
      return []
    } finally {
      isLoading.value = false
    }
  }
  
  // 处理补全请求
  const handleCompletionRequest = async (sql, cursorPos) => {
    const suggestions = await getCompletions(sql, cursorPos)
    
    completionSuggestions.value = suggestions
    showCompletions.value = suggestions.length > 0
    selectedIndex.value = 0
    
    return suggestions
  }
  
  // 选择补全建议
  const selectCompletion = (index) => {
    if (index >= 0 && index < completionSuggestions.value.length) {
      const suggestion = completionSuggestions.value[index]
      showCompletions.value = false
      return suggestion
    }
    return null
  }
  
  // 键盘导航
  const navigateUp = () => {
    if (completionSuggestions.value.length === 0) return
    selectedIndex.value = selectedIndex.value <= 0 
      ? completionSuggestions.value.length - 1 
      : selectedIndex.value - 1
  }
  
  const navigateDown = () => {
    if (completionSuggestions.value.length === 0) return
    selectedIndex.value = selectedIndex.value >= completionSuggestions.value.length - 1 
      ? 0 
      : selectedIndex.value + 1
  }
  
  const selectCurrent = () => {
    return selectCompletion(selectedIndex.value)
  }
  
  // 隐藏补全面板
  const hideCompletions = () => {
    showCompletions.value = false
    completionSuggestions.value = []
    selectedIndex.value = 0
  }
  
  // 监听连接变化，清空缓存
  watch(
    () => connectionStore.currentConnection,
    () => {
      completionCache.clear()
      hideCompletions()
    }
  )
  
  return {
    // 状态
    completionSuggestions,
    showCompletions,
    selectedIndex,
    isLoading,
    
    // 方法
    getCompletions,
    handleCompletionRequest,
    selectCompletion,
    selectCurrent,
    navigateUp,
    navigateDown,
    hideCompletions,
    
    // 解析方法（供其他组件使用）
    parseContext,
    getTableCompletions,
    getColumnCompletions,
    getKeywordCompletions
  }
}