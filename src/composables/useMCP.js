import { ref, reactive } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useNotificationStore } from '@/stores/notification.js'

// 全局MCP状态 (单例模式)
let mcpInstance = null

export function useMCP() {
  // 如果已经创建过实例，直接返回
  if (mcpInstance) {
    return mcpInstance
  }

  // 状态
  const mcpConnected = ref(false)
  const mcpTools = ref([])
  const isInitializing = ref(false)
  const lastError = ref(null)

  // 通知系统
  const notificationStore = useNotificationStore()

  // 初始化MCP连接
  const initializeMCP = async () => {
    if (isInitializing.value || mcpConnected.value) {
      return mcpConnected.value
    }

    isInitializing.value = true
    lastError.value = null

    try {
      console.log('开始初始化MCP服务器...')
      console.log('调用 invoke(mcp_initialize)...')
      
      const result = await invoke('mcp_initialize')
      console.log('MCP初始化结果:', result)
      
      console.log('调用 invoke(mcp_list_tools)...')
      // 获取可用工具列表
      const tools = await invoke('mcp_list_tools')
      console.log('可用MCP工具:', tools)
      
      mcpTools.value = tools
      mcpConnected.value = true
      
      console.log('MCP状态更新完成，mcpConnected =', mcpConnected.value)
      
      if (notificationStore) {
        notificationStore.success('MCP服务初始化成功', {
          description: `已加载${tools.length}个智能工具`
        })
      }
      
      return true
    } catch (error) {
      console.error('MCP初始化失败:', error)
      lastError.value = error.message || error
      mcpConnected.value = false
      
      if (notificationStore) {
        notificationStore.error('MCP服务初始化失败', {
          description: error.message || '请检查后端服务状态'
        })
      }
      
      return false
    } finally {
      isInitializing.value = false
    }
  }

  // 获取增强上下文 (后端MCP工具)
  const getEnhancedContext = async (tables, connectionId) => {
    if (!mcpConnected.value) {
      throw new Error('MCP服务未连接，请先初始化')
    }

    if (!tables || tables.length === 0) {
      throw new Error('表列表不能为空')
    }

    if (!connectionId) {
      throw new Error('连接ID不能为空')
    }

    try {
      console.log('获取增强上下文:', { tables, connectionId })
      
      const result = await invoke('mcp_get_enhanced_context', {
        tables,
        connectionId
      })
      
      console.log('增强上下文结果:', result)
      return result
    } catch (error) {
      console.error('获取增强上下文失败:', error)
      throw new Error(`获取上下文失败: ${error.message || error}`)
    }
  }

  // SQL验证和分析 (后端MCP工具)
  const validateSQL = async (sql, context = {}) => {
    if (!mcpConnected.value) {
      throw new Error('MCP服务未连接，请先初始化')
    }

    if (!sql || sql.trim().length === 0) {
      throw new Error('SQL语句不能为空')
    }

    try {
      console.log('验证SQL:', { sql: sql.substring(0, 100) + '...', context })
      
      const result = await invoke('mcp_validate_sql', {
        sql: sql.trim(),
        context
      })
      
      console.log('SQL验证结果:', result)
      return result
    } catch (error) {
      console.error('SQL验证失败:', error)
      throw new Error(`SQL验证失败: ${error.message || error}`)
    }
  }

  // 智能查询执行 (后端MCP工具)
  const executeSmartQuery = async (sql, options = {}) => {
    if (!mcpConnected.value) {
      throw new Error('MCP服务未连接，请先初始化')
    }

    if (!sql || sql.trim().length === 0) {
      throw new Error('SQL语句不能为空')
    }

    const defaultOptions = {
      includePerformance: true,
      includeStats: true,
      timeoutSeconds: 30
    }

    const queryOptions = { ...defaultOptions, ...options }

    try {
      console.log('执行智能查询:', { 
        sql: sql.substring(0, 100) + '...', 
        options: queryOptions 
      })
      
      const result = await invoke('mcp_execute_smart_query', {
        sql: sql.trim(),
        options: queryOptions
      })
      
      console.log('智能查询结果:', result)
      return result
    } catch (error) {
      console.error('智能查询执行失败:', error)
      throw new Error(`查询执行失败: ${error.message || error}`)
    }
  }

  // 完整的智能工作流 (前后端协作)
  const runSmartWorkflow = async (userInput, referencedTables, connectionId) => {
    if (!mcpConnected.value) {
      throw new Error('MCP服务未连接，请先初始化')
    }

    if (!userInput || userInput.trim().length === 0) {
      throw new Error('用户输入不能为空')
    }

    if (!referencedTables || referencedTables.length === 0) {
      throw new Error('必须指定至少一个表')
    }

    if (!connectionId) {
      throw new Error('连接ID不能为空')
    }

    try {
      const workflowResult = {
        userInput: userInput.trim(),
        referencedTables,
        connectionId,
        steps: [],
        context: null,
        sql: null,
        validation: null,
        executionResult: null,
        insights: null,
        success: false,
        error: null
      }

      // Step 1: 获取数据库上下文 (后端MCP)
      workflowResult.steps.push({ step: 1, name: '获取上下文', status: 'running' })
      
      const context = await getEnhancedContext(referencedTables, connectionId)
      workflowResult.context = context
      workflowResult.steps[0].status = 'completed'
      
      console.log('Step 1 完成: 上下文获取成功')

      // Step 2: AI分析生成SQL (这里需要调用AI Store)
      workflowResult.steps.push({ step: 2, name: 'AI生成SQL', status: 'running' })
      
      // 注意：这里需要与AI Store集成，暂时返回模拟结果
      const mockSQL = `SELECT * FROM ${referencedTables[0]} LIMIT 10`
      workflowResult.sql = mockSQL
      workflowResult.steps[1].status = 'completed'
      
      console.log('Step 2 完成: SQL生成成功')

      // Step 3: SQL验证 (后端MCP)
      workflowResult.steps.push({ step: 3, name: 'SQL验证', status: 'running' })
      
      const validation = await validateSQL(mockSQL, context)
      workflowResult.validation = validation
      workflowResult.steps[2].status = 'completed'
      
      console.log('Step 3 完成: SQL验证成功')

      // Step 4: 执行查询 (后端MCP)
      workflowResult.steps.push({ step: 4, name: '执行查询', status: 'running' })
      
      const executionResult = await executeSmartQuery(mockSQL, {
        includePerformance: true,
        includeStats: true
      })
      workflowResult.executionResult = executionResult
      workflowResult.steps[3].status = 'completed'
      
      console.log('Step 4 完成: 查询执行成功')

      // Step 5: 生成洞察 (这里需要调用AI Store进行分析)
      workflowResult.steps.push({ step: 5, name: '生成洞察', status: 'running' })
      
      // 模拟洞察生成
      const mockInsights = [
        {
          id: 'insight-1',
          type: 'performance',
          icon: '⚡',
          title: '查询性能良好',
          description: `查询执行时间为${executionResult.data?.execution_time || 0}ms，性能表现良好`,
          confidence: 85
        }
      ]
      
      workflowResult.insights = mockInsights
      workflowResult.steps[4].status = 'completed'
      workflowResult.success = true
      
      console.log('Step 5 完成: 洞察生成成功')

      return workflowResult
    } catch (error) {
      console.error('智能工作流执行失败:', error)
      throw error
    }
  }

  // 健康检查
  const healthCheck = async () => {
    try {
      const result = await invoke('mcp_health_check')
      console.log('MCP健康检查:', result)
      return result
    } catch (error) {
      console.error('MCP健康检查失败:', error)
      return {
        status: 'error',
        error: error.message || error,
        timestamp: new Date().toISOString()
      }
    }
  }

  // 获取工具列表
  const listTools = async () => {
    if (!mcpConnected.value) {
      return []
    }

    try {
      const tools = await invoke('mcp_list_tools')
      mcpTools.value = tools
      return tools
    } catch (error) {
      console.error('获取工具列表失败:', error)
      return []
    }
  }

  // 创建实例对象
  const instance = {
    // 状态
    mcpConnected,
    mcpTools,
    isInitializing,
    lastError,

    // 方法
    initializeMCP,
    getEnhancedContext,
    validateSQL,
    executeSmartQuery,
    runSmartWorkflow,
    healthCheck,
    listTools
  }

  // 缓存单例实例
  mcpInstance = instance
  
  return instance
}