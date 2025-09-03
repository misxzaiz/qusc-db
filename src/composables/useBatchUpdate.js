import { ref, computed } from 'vue'
import { useConnectionStore } from '@/stores/connection.js'
import { useNotificationStore } from '@/stores/notification.js'

/**
 * 批量更新 Composable
 * 专门处理批量数据库更新操作，包括事务管理、冲突检测等
 */
export function useBatchUpdate() {
  const connectionStore = useConnectionStore()
  const notificationStore = useNotificationStore()
  
  // 状态管理
  const isExecuting = ref(false)
  const executionProgress = ref(0)
  const executionResults = ref([])
  const lastExecution = ref(null)
  
  // 执行选项
  const executionOptions = ref({
    useTransaction: true,
    continueOnError: false,
    batchSize: 100,
    enableRollback: true,
    dryRun: false,
    timeout: 30000 // 30秒超时
  })
  
  /**
   * 执行批量更新
   */
  const executeBatchUpdate = async (sqlStatements, options = {}) => {
    if (isExecuting.value) {
      throw new Error('已有批量更新正在执行中')
    }
    
    // 合并执行选项
    const execOptions = { ...executionOptions.value, ...options }
    
    isExecuting.value = true
    executionProgress.value = 0
    executionResults.value = []
    
    const startTime = Date.now()
    const statements = Array.isArray(sqlStatements) ? sqlStatements : [sqlStatements]
    
    console.log(`🚀 开始执行批量更新，共 ${statements.length} 条SQL语句`)
    
    try {
      let result
      
      if (execOptions.useTransaction) {
        result = await executeWithTransaction(statements, execOptions)
      } else {
        result = await executeWithoutTransaction(statements, execOptions)
      }
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      // 记录执行结果
      lastExecution.value = {
        timestamp: endTime,
        executionTime,
        totalStatements: statements.length,
        successCount: result.successCount,
        errorCount: result.errorCount,
        options: execOptions,
        results: result.results
      }
      
      notificationStore.success(
        `批量更新完成：${result.successCount} 成功，${result.errorCount} 失败，耗时 ${executionTime}ms`
      )
      
      return result
      
    } catch (error) {
      console.error('批量更新执行失败:', error)
      notificationStore.error('批量更新失败: ' + error.message)
      throw error
    } finally {
      isExecuting.value = false
      executionProgress.value = 100
    }
  }
  
  /**
   * 使用事务执行批量更新
   */
  const executeWithTransaction = async (statements, options) => {
    const connection = connectionStore.currentConnection
    if (!connection) {
      throw new Error('没有可用的数据库连接')
    }
    
    const results = []
    let successCount = 0
    let errorCount = 0
    
    try {
      // 开始事务
      console.log('📦 开始事务')
      if (!options.dryRun) {
        await executeSQL('BEGIN')
      }
      
      // 执行所有语句
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]
        
        try {
          console.log(`📝 执行语句 ${i + 1}/${statements.length}: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`)
          
          let result
          if (options.dryRun) {
            result = { type: 'dry_run', statement, affectedRows: 0 }
          } else {
            result = await executeSQL(statement)
          }
          
          results.push({
            index: i,
            statement,
            success: true,
            result,
            timestamp: Date.now()
          })
          
          successCount++
          
        } catch (error) {
          console.error(`❌ 语句 ${i + 1} 执行失败:`, error)
          
          results.push({
            index: i,
            statement,
            success: false,
            error: error.message,
            timestamp: Date.now()
          })
          
          errorCount++
          
          // 如果不继续执行错误语句，抛出异常回滚事务
          if (!options.continueOnError) {
            throw new Error(`语句 ${i + 1} 执行失败: ${error.message}`)
          }
        }
        
        // 更新进度
        executionProgress.value = Math.round(((i + 1) / statements.length) * 100)
        
        // 批量大小限制检查
        if (options.batchSize && (i + 1) % options.batchSize === 0) {
          console.log(`📊 已处理 ${i + 1}/${statements.length} 条语句`)
        }
      }
      
      // 检查是否有错误
      if (errorCount > 0 && !options.continueOnError) {
        throw new Error(`批量更新包含 ${errorCount} 个错误，事务将回滚`)
      }
      
      // 提交事务
      if (!options.dryRun) {
        console.log('✅ 提交事务')
        await executeSQL('COMMIT')
      }
      
      return {
        success: true,
        successCount,
        errorCount,
        results,
        message: options.dryRun ? 'DRY RUN 模拟执行成功' : '事务执行成功'
      }
      
    } catch (error) {
      // 回滚事务
      if (!options.dryRun && options.enableRollback) {
        try {
          console.log('🔄 回滚事务')
          await executeSQL('ROLLBACK')
        } catch (rollbackError) {
          console.error('回滚失败:', rollbackError)
        }
      }
      
      return {
        success: false,
        successCount,
        errorCount,
        results,
        error: error.message,
        message: '事务执行失败并已回滚'
      }
    }
  }
  
  /**
   * 不使用事务执行批量更新
   */
  const executeWithoutTransaction = async (statements, options) => {
    const results = []
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      try {
        console.log(`📝 执行语句 ${i + 1}/${statements.length}: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`)
        
        let result
        if (options.dryRun) {
          result = { type: 'dry_run', statement, affectedRows: 0 }
        } else {
          result = await executeSQL(statement)
        }
        
        results.push({
          index: i,
          statement,
          success: true,
          result,
          timestamp: Date.now()
        })
        
        successCount++
        
      } catch (error) {
        console.error(`❌ 语句 ${i + 1} 执行失败:`, error)
        
        results.push({
          index: i,
          statement,
          success: false,
          error: error.message,
          timestamp: Date.now()
        })
        
        errorCount++
        
        // 如果不继续执行错误语句，停止执行
        if (!options.continueOnError) {
          break
        }
      }
      
      // 更新进度
      executionProgress.value = Math.round(((i + 1) / statements.length) * 100)
    }
    
    return {
      success: errorCount === 0,
      successCount,
      errorCount,
      results,
      message: options.dryRun ? 'DRY RUN 模拟执行完成' : '批量执行完成'
    }
  }
  
  /**
   * 执行单条SQL语句
   */
  const executeSQL = async (sql) => {
    const connection = connectionStore.currentConnection
    if (!connection) {
      throw new Error('没有可用的数据库连接')
    }
    
    try {
      console.log('🔧 执行SQL:', sql)
      const result = await connectionStore.executeQuery(connection.id, sql)
      
      return {
        affectedRows: result.affectedRows || 0,
        insertId: result.insertId,
        warningCount: result.warningCount || 0,
        message: result.message || 'Query OK'
      }
    } catch (error) {
      console.error('SQL执行失败:', error)
      throw error
    }
  }
  
  /**
   * 分析SQL语句的影响范围
   */
  const analyzeSQLImpact = (statements) => {
    const analysis = {
      totalStatements: statements.length,
      statementTypes: new Map(),
      affectedTables: new Set(),
      riskLevel: 'LOW',
      warnings: []
    }
    
    for (const sql of statements) {
      const upperSQL = sql.trim().toUpperCase()
      
      // 统计语句类型
      let type = 'OTHER'
      if (upperSQL.startsWith('UPDATE')) type = 'UPDATE'
      else if (upperSQL.startsWith('INSERT')) type = 'INSERT'
      else if (upperSQL.startsWith('DELETE')) type = 'DELETE'
      else if (upperSQL.startsWith('ALTER')) type = 'ALTER'
      else if (upperSQL.startsWith('DROP')) type = 'DROP'
      else if (upperSQL.startsWith('CREATE')) type = 'CREATE'
      
      analysis.statementTypes.set(type, (analysis.statementTypes.get(type) || 0) + 1)
      
      // 提取表名（简单实现）
      const tableMatch = upperSQL.match(/(?:UPDATE|INSERT INTO|DELETE FROM|ALTER TABLE|DROP TABLE|CREATE TABLE)\\s+`?([\\w]+)`?/i)
      if (tableMatch) {
        analysis.affectedTables.add(tableMatch[1].toLowerCase())
      }
      
      // 风险评估
      if (upperSQL.includes('DROP') || upperSQL.includes('TRUNCATE')) {
        analysis.riskLevel = 'HIGH'
        analysis.warnings.push('包含DROP或TRUNCATE语句，存在数据丢失风险')
      } else if (upperSQL.includes('DELETE') && !upperSQL.includes('WHERE')) {
        analysis.riskLevel = 'HIGH'
        analysis.warnings.push('包含无WHERE条件的DELETE语句')
      } else if (upperSQL.includes('UPDATE') && !upperSQL.includes('WHERE')) {
        analysis.riskLevel = 'HIGH'
        analysis.warnings.push('包含无WHERE条件的UPDATE语句')
      } else if (type === 'ALTER') {
        analysis.riskLevel = analysis.riskLevel === 'LOW' ? 'MEDIUM' : analysis.riskLevel
        analysis.warnings.push('包含ALTER语句，可能影响表结构')
      }
    }
    
    // 转换Map为对象便于序列化
    analysis.statementTypes = Object.fromEntries(analysis.statementTypes)
    analysis.affectedTables = Array.from(analysis.affectedTables)
    
    return analysis
  }
  
  /**
   * 生成执行预览
   */
  const generateExecutionPreview = (statements, options = {}) => {
    const analysis = analyzeSQLImpact(statements)
    
    return {
      analysis,
      options: { ...executionOptions.value, ...options },
      estimatedTime: statements.length * 100, // 简单估算
      recommendations: generateRecommendations(analysis)
    }
  }
  
  /**
   * 生成建议
   */
  const generateRecommendations = (analysis) => {
    const recommendations = []
    
    if (analysis.riskLevel === 'HIGH') {
      recommendations.push({
        type: 'WARNING',
        message: '建议先执行DRY RUN模式预览结果',
        action: 'enable_dry_run'
      })
      
      recommendations.push({
        type: 'WARNING', 
        message: '建议启用事务模式确保数据一致性',
        action: 'enable_transaction'
      })
    }
    
    if (analysis.totalStatements > 100) {
      recommendations.push({
        type: 'INFO',
        message: `语句数量较多(${analysis.totalStatements})，建议设置合适的批量大小`,
        action: 'set_batch_size'
      })
    }
    
    if (analysis.affectedTables.length > 5) {
      recommendations.push({
        type: 'INFO',
        message: `涉及多个表(${analysis.affectedTables.length})，建议检查表之间的依赖关系`,
        action: 'check_dependencies'
      })
    }
    
    return recommendations
  }
  
  /**
   * 取消正在执行的批量操作
   */
  const cancelExecution = async () => {
    if (!isExecuting.value) {
      return false
    }
    
    try {
      // 这里应该实现实际的取消逻辑
      // 比如关闭数据库连接、取消查询等
      
      console.log('🛑 取消批量更新执行')
      
      // 如果在事务中，尝试回滚
      if (executionOptions.value.useTransaction && executionOptions.value.enableRollback) {
        await executeSQL('ROLLBACK')
      }
      
      isExecuting.value = false
      notificationStore.warning('批量更新已被取消')
      
      return true
    } catch (error) {
      console.error('取消执行失败:', error)
      return false
    }
  }
  
  // 计算属性
  const canExecute = computed(() => {
    return !isExecuting.value && connectionStore.currentConnection
  })
  
  const executionStatus = computed(() => {
    if (isExecuting.value) {
      return {
        status: 'RUNNING',
        progress: executionProgress.value,
        message: '正在执行批量更新...'
      }
    }
    
    if (lastExecution.value) {
      const hasErrors = lastExecution.value.errorCount > 0
      return {
        status: hasErrors ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        message: hasErrors ? '执行完成但包含错误' : '执行成功完成'
      }
    }
    
    return {
      status: 'READY',
      message: '准备执行批量更新'
    }
  })
  
  return {
    // 状态
    isExecuting,
    executionProgress,
    executionResults,
    lastExecution,
    executionOptions,
    canExecute,
    executionStatus,
    
    // 方法
    executeBatchUpdate,
    analyzeSQLImpact,
    generateExecutionPreview,
    generateRecommendations,
    cancelExecution
  }
}