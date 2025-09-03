import { ref } from 'vue'
import { useNotificationStore } from '@/stores/notification.js'
import { useConnectionStore } from '@/stores/connection.js'
import { useQueryHistoryStore } from '@/stores/queryHistory.js'
import { formatSQL } from '@/utils/sqlFormatter.js'
import { 
  createPaginationTools,
  UserLimitStrategies 
} from '@/utils/pagination/index.js'

export function useQueryExecution() {
  const isExecuting = ref(false)
  const notificationStore = useNotificationStore()
  const connectionStore = useConnectionStore()
  const queryHistoryStore = useQueryHistoryStore()
  
  // 初始化分页工具
  const paginationTools = createPaginationTools({
    defaultPageSize: 20,
    maxComplexity: 8,
    cacheSize: 100,
    cacheTTL: 5 * 60 * 1000 // 5分钟
  })
  
  // 分割查询语句
  const splitQueries = (text) => {
    const queries = []
    let currentQuery = ''
    let inString = false
    let stringChar = ''
    let escaped = false
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      
      if (escaped) {
        currentQuery += char
        escaped = false
        continue
      }
      
      if (char === '\\') {
        escaped = true
        currentQuery += char
        continue
      }
      
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true
        stringChar = char
        currentQuery += char
      } else if (inString && char === stringChar) {
        inString = false
        stringChar = ''
        currentQuery += char
      } else if (!inString && char === ';') {
        if (currentQuery.trim()) {
          queries.push(currentQuery.trim())
        }
        currentQuery = ''
      } else {
        currentQuery += char
      }
    }
    
    if (currentQuery.trim()) {
      queries.push(currentQuery.trim())
    }
    
    return queries.filter(q => q.length > 0)
  }
  
  // 获取要执行的查询语句
  const getQueryToExecute = (sqlEditor, currentQuery) => {
    // 如果有选中文本，优先执行选中的文本
    if (sqlEditor && sqlEditor.getSelection) {
      const selectedText = sqlEditor.getSelection().trim()
      if (selectedText) {
        return selectedText
      }
    }
    
    // 如果没有选中文本，返回当前编辑器的全部内容
    const allText = currentQuery || (sqlEditor && sqlEditor.getValue ? sqlEditor.getValue() : '')
    return allText.trim()
  }
  
  // 检查是否是SELECT查询
  const isSelectQuery = (query) => {
    return /^\s*SELECT\s+/i.test(query.trim())
  }
  
  // 生成COUNT查询
  const getCountQuery = (query) => {
    const trimmedQuery = query.trim()
    const queryWithoutOrderBy = trimmedQuery.replace(/\s+ORDER\s+BY\s+[^;]*$/i, '')
    
    if (/\bGROUP\s+BY\b/i.test(queryWithoutOrderBy)) {
      return `SELECT COUNT(*) FROM (${queryWithoutOrderBy}) AS count_query`
    }
    
    return queryWithoutOrderBy.replace(/^\s*SELECT\s+.*?\s+FROM\s+/i, 'SELECT COUNT(*) FROM ')
  }
  
  // 处理查询语句，为SELECT添加默认LIMIT
  const processQueryWithLimit = (query, offset = 0, pageSize = 20) => {
    let trimmedQuery = query.trim()
    
    // 只处理SELECT语句（忽略大小写，允许前面有注释）
    const selectMatch = trimmedQuery.match(/^\s*(?:\/\*.*?\*\/\s*)?(?:--.*?\n\s*)?SELECT\s+/is)
    if (!selectMatch) {
      return query
    }
    
    // 移除末尾的分号以便处理
    let hasSemicolon = false
    if (trimmedQuery.endsWith(';')) {
      trimmedQuery = trimmedQuery.slice(0, -1).trim()
      hasSemicolon = true
    }
    
    // 改进的LIMIT检测：更准确地匹配LIMIT子句
    // 使用更严格的正则，避免在字符串或注释中的LIMIT被误判
    const limitPattern = /\bLIMIT\s+(?:\d+\s*,\s*)?\d+(?:\s+OFFSET\s+\d+)?\s*$/i
    
    if (limitPattern.test(trimmedQuery)) {
      // 已经有LIMIT，不再添加新的LIMIT
      return hasSemicolon ? trimmedQuery + ';' : trimmedQuery
    }
    
    // 更智能的SQL结构分析
    // 查找可能的子句位置，按优先级顺序：LIMIT > ORDER BY > GROUP BY > HAVING > WHERE
    const sqlParts = {
      main: trimmedQuery,
      orderBy: '',
      groupBy: '',
      having: '',
      where: ''
    }
    
    // 从后往前匹配各个子句，避免嵌套查询的干扰
    let remainingQuery = trimmedQuery
    
    // 匹配ORDER BY（最后一个）
    const orderByMatch = remainingQuery.match(/^(.*?)(\s+ORDER\s+BY\s+.+?)$/i)
    if (orderByMatch) {
      sqlParts.main = orderByMatch[1].trim()
      sqlParts.orderBy = orderByMatch[2]
      remainingQuery = sqlParts.main
    }
    
    // 匹配GROUP BY和HAVING
    const groupByMatch = remainingQuery.match(/^(.*?)(\s+GROUP\s+BY\s+.+?)(\s+HAVING\s+.+?)?$/i)
    if (groupByMatch) {
      sqlParts.main = groupByMatch[1].trim()
      sqlParts.groupBy = groupByMatch[2] || ''
      sqlParts.having = groupByMatch[3] || ''
    }
    
    // 构建最终查询
    const limitClause = offset > 0 ? ` LIMIT ${offset}, ${pageSize}` : ` LIMIT ${pageSize}`
    
    let finalQuery = sqlParts.main + 
                    sqlParts.groupBy + 
                    sqlParts.having + 
                    sqlParts.orderBy + 
                    limitClause
    
    // 恢复分号
    return hasSemicolon ? finalQuery + ';' : finalQuery
  }
  
  // 执行查询
  const executeQuery = async (connectionId, query, page = 1, pageSize = 20, shouldGetTotal = false) => {
    if (!connectionId || !query) {
      notificationStore.warning('请选择连接并输入查询语句')
      return null
    }
    
    const currentConnection = connectionStore.currentConnection
    if (!currentConnection) {
      notificationStore.warning('连接已断开，请重新选择连接')
      return null
    }
    
    const offset = (page - 1) * pageSize
    const processedQuery = processQueryWithLimit(query, offset, pageSize)
    
    isExecuting.value = true
    const startTime = Date.now()
    let result = null
    let error = null
    
    try {
      let totalRecords = 0
      
      if ((page === 1 || shouldGetTotal) && isSelectQuery(query)) {
        try {
          const countQuery = getCountQuery(query)
          const countResult = await connectionStore.executeQuery(currentConnection.id, countQuery)
          if (countResult?.rows?.length > 0) {
            totalRecords = parseInt(countResult.rows[0][0]) || 0
          }
        } catch (countError) {
          console.warn('获取总记录数失败:', countError)
        }
      }
      
      result = await connectionStore.executeQuery(currentConnection.id, processedQuery)
      
      if (result) {
        result.hasLimit = processedQuery !== query
        result.currentPage = page
        result.pageSize = pageSize
        result.hasNextPage = result.rows && result.rows.length === pageSize
        result.totalRecords = totalRecords
        result.executedQuery = query
      }
      
      return result
    } catch (queryError) {
      error = queryError
      throw queryError
    } finally {
      isExecuting.value = false
      
      // 记录查询历史（无论成功还是失败）
      const duration = Date.now() - startTime
      try {
        queryHistoryStore.addToHistory({
          query,
          connection: currentConnection,
          result,
          duration,
          error
        })
      } catch (historyError) {
        console.warn('保存查询历史失败:', historyError)
      }
    }
  }
  
  // 格式化SQL（使用专业sql-formatter）
  const formatSQLQuery = (query) => {
    if (!query || !query.trim()) {
      return query
    }
    
    return formatSQL(query, {
      tabWidth: 2,
      keywordCase: 'upper',
      functionCase: 'upper',
    })
  }
  
  // 增强的批量执行查询（支持独立分页）
  const executeBatchQueries = async (connectionId, queries, options = {}) => {
    const {
      onProgress = null,
      continueOnError = true,
      pagination = {
        enabled: true,
        defaultPageSize: 20,
        respectUserLimit: true,
        autoCount: true,
        userLimitStrategy: UserLimitStrategies.PRESERVE
      }
    } = options

    if (!connectionId || !queries || queries.length === 0) {
      notificationStore.warning('请选择连接并输入查询语句')
      return null
    }
    
    const currentConnection = connectionStore.currentConnection
    if (!currentConnection) {
      notificationStore.warning('连接已断开，请重新选择连接')
      return null
    }
    
    isExecuting.value = true
    const startTime = Date.now()
    const results = []
    let totalErrors = 0
    
    try {
      // 初始化批量分页管理器
      if (pagination.enabled) {
        paginationTools.batchManager.initializeBatchPagination(queries, {
          defaultPageSize: pagination.defaultPageSize,
          respectUserLimit: pagination.respectUserLimit,
          enablePagination: pagination.enabled
        })
      }
      
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i].trim()
        if (!query) continue
        
        // 报告进度
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: queries.length,
            query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            currentQuery: query
          })
        }
        
        try {
          let processedQuery = query
          let result = null
          let paginationInfo = null
          let countResult = 0
          
          // 检查是否启用分页且查询支持分页
          if (pagination.enabled && paginationTools.batchManager.isPaginationEnabled(i)) {
            // 获取分页查询信息
            paginationInfo = paginationTools.batchManager.getPaginatedQuery(i, 1, pagination.defaultPageSize)
            
            if (paginationInfo) {
              processedQuery = paginationInfo.query
              
              // 执行COUNT查询（如果需要）
              if (pagination.autoCount && paginationInfo.countQuery) {
                try {
                  const countQueryInfo = paginationTools.countGenerator.generate(query, {
                    connectionId: currentConnection.id,
                    useCache: true,
                    maxComplexity: paginationTools.config.maxComplexity
                  })
                  
                  if (countQueryInfo) {
                    countResult = await paginationTools.countGenerator.executeCountQueryWithCache(
                      (connId, countQuery) => connectionStore.executeQuery(connId, countQuery),
                      currentConnection.id,
                      countQueryInfo,
                      query
                    )
                  }
                } catch (countError) {
                  console.warn(`查询 ${i + 1} COUNT执行失败:`, countError.message)
                }
              }
            }
          } else {
            // 回退到原有的LIMIT处理逻辑
            processedQuery = processQueryWithLimit(query, 0, pagination.defaultPageSize)
          }
          
          // 执行主查询
          result = await connectionStore.executeQuery(currentConnection.id, processedQuery)
          
          // 增强结果信息
          if (result) {
            result.hasLimit = processedQuery !== query
            result.executedQuery = query
            result.originalQuery = query
            
            // 添加分页信息
            if (paginationInfo) {
              result.pagination = {
                enabled: true,
                currentPage: 1,
                pageSize: pagination.defaultPageSize,
                totalRecords: countResult,
                totalPages: countResult > 0 ? Math.ceil(countResult / pagination.defaultPageSize) : 0,
                hasMore: result.rows && result.rows.length >= pagination.defaultPageSize,
                hasUserLimit: paginationInfo.meta.hasUserLimit,
                userLimit: paginationInfo.meta.userLimit
              }
              
              // 更新分页状态
              paginationTools.batchManager.updatePaginationState(i, {
                totalRecords: countResult,
                currentPage: 1,
                pageSize: pagination.defaultPageSize
              })
            } else {
              result.pagination = {
                enabled: false,
                legacy: true
              }
            }
          }
          
          results.push({
            index: i,
            query,
            success: true,
            result,
            error: null,
            executedAt: new Date(),
            paginationInfo: paginationInfo ? {
              enabled: true,
              hasUserLimit: paginationInfo.meta.hasUserLimit,
              complexity: paginationInfo.meta.complexity
            } : { enabled: false }
          })
          
          // 保存到查询历史
          try {
            queryHistoryStore.addToHistory({
              query,
              connection: currentConnection,
              result,
              duration: Date.now() - startTime,
              error: null
            })
          } catch (historyError) {
            console.warn('保存查询历史失败:', historyError)
          }
          
        } catch (error) {
          totalErrors++
          console.error(`查询 ${i + 1} 执行失败:`, error)
          
          const errorResult = {
            index: i,
            query,
            success: false,
            result: null,
            error: error.message || error.toString(),
            executedAt: new Date(),
            paginationInfo: { enabled: false, error: true }
          }
          
          results.push(errorResult)
          
          // 保存错误到查询历史
          try {
            queryHistoryStore.addToHistory({
              query,
              connection: currentConnection,
              result: null,
              duration: Date.now() - startTime,
              error: error.message || error.toString()
            })
          } catch (historyError) {
            console.warn('保存查询历史失败:', historyError)
          }
          
          // 如果不继续执行遇到错误的查询，则停止
          if (!continueOnError) {
            notificationStore.error(`查询 ${i + 1} 执行失败，已停止批量执行: ${error.message}`)
            break
          }
        }
      }
      
      const duration = Date.now() - startTime
      const successCount = results.filter(r => r.success).length
      const paginationEnabledCount = results.filter(r => r.paginationInfo?.enabled).length
      
      // 显示批量执行结果通知
      let message = ''
      if (totalErrors === 0) {
        message = `批量执行完成：共 ${successCount} 条查询执行成功`
        if (paginationEnabledCount > 0) {
          message += `，其中 ${paginationEnabledCount} 条支持分页`
        }
        message += `，耗时 ${duration}ms`
        notificationStore.success(message)
      } else if (successCount > 0) {
        message = `批量执行完成：${successCount} 条成功，${totalErrors} 条失败，耗时 ${duration}ms`
        notificationStore.warning(message)
      } else {
        notificationStore.error(`批量执行失败：所有 ${queries.length} 条查询都执行失败`)
      }
      
      return {
        success: totalErrors === 0,
        results,
        totalQueries: queries.length,
        successCount,
        errorCount: totalErrors,
        duration,
        pagination: {
          enabled: pagination.enabled,
          supportedQueries: paginationEnabledCount,
          batchManagerStats: pagination.enabled ? paginationTools.batchManager.getStatistics() : null
        }
      }
      
    } finally {
      isExecuting.value = false
    }
  }
  
  // 执行单个分页查询
  const executeQueryWithPagination = async (connectionId, query, page = 1, pageSize = 20, options = {}) => {
    const {
      shouldGetTotal = true,
      useCache = true,
      respectUserLimit = true
    } = options

    if (!connectionId || !query) {
      notificationStore.warning('请选择连接并输入查询语句')
      return null
    }
    
    const currentConnection = connectionStore.currentConnection
    if (!currentConnection) {
      notificationStore.warning('连接已断开，请重新选择连接')
      return null
    }

    try {
      // 创建分页构建器
      const builder = paginationTools.createBuilder(query)
      const meta = builder.getPaginationMeta()
      
      if (!meta.isPaginable) {
        // 不是SELECT查询，直接执行原查询
        return await connectionStore.executeQuery(currentConnection.id, query)
      }

      // 构建分页查询
      const paginatedQuery = builder.buildPaginatedQuery(page, pageSize, {
        respectUserLimit
      })

      let totalRecords = 0

      // 获取总记录数（如果需要）
      if (shouldGetTotal) {
        try {
          const countQueryInfo = paginationTools.countGenerator.generate(query, {
            connectionId: currentConnection.id,
            useCache,
            maxComplexity: paginationTools.config.maxComplexity
          })
          
          if (countQueryInfo) {
            totalRecords = await paginationTools.countGenerator.executeCountQueryWithCache(
              (connId, countQuery) => connectionStore.executeQuery(connId, countQuery),
              currentConnection.id,
              countQueryInfo,
              query
            )
          }
        } catch (countError) {
          console.warn('获取总记录数失败:', countError.message)
        }
      }

      // 执行分页查询
      const result = await connectionStore.executeQuery(currentConnection.id, paginatedQuery)

      if (result) {
        result.hasLimit = paginatedQuery !== query
        result.executedQuery = query
        result.originalQuery = query
        result.pagination = {
          enabled: true,
          currentPage: page,
          pageSize: pageSize,
          totalRecords,
          totalPages: totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0,
          hasMore: result.rows && result.rows.length >= pageSize,
          hasUserLimit: meta.hasUserLimit,
          userLimit: meta.userLimit,
          complexity: meta.complexity
        }
      }

      return result
    } catch (error) {
      console.error('分页查询执行失败:', error)
      throw error
    }
  }
  
  // 根据执行模式处理查询
  const executeWithMode = async (connectionId, queryText, hasSelection = false, selectedText = null) => {
    // 获取实际要执行的查询文本
    const actualQuery = hasSelection && selectedText ? selectedText : queryText
    
    if (!actualQuery || !actualQuery.trim()) {
      notificationStore.warning('请输入SQL查询或选择要执行的查询')
      return null
    }

    // 批量模式：强制分割并批量执行
    const queries = splitQueries(actualQuery)
    return await executeBatchQueries(connectionId, queries)
  }
  
  return {
    isExecuting,
    splitQueries,
    getQueryToExecute,
    executeQuery,
    executeBatchQueries,
    executeQueryWithPagination,
    executeWithMode,
    formatSQL: formatSQLQuery,
    // 分页工具的直接访问（用于高级用途）
    paginationTools
  }
}