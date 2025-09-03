import { ref, reactive, computed, watch, readonly } from 'vue'
import { useAIStore } from '@/stores/ai.js'
import { useConnectionStore } from '@/stores/connection.js'
import { useMCP } from './useMCP.js'
import { useTableReference } from './useTableReference.js'

export function useMCPWorkflow() {
  const aiStore = useAIStore()
  const connectionStore = useConnectionStore()
  const { 
    mcpConnected, 
    getEnhancedContext, 
    validateSQL, 
    executeSmartQuery 
  } = useMCP()
  
  const { 
    parseTableReferences,
    enhanceContextWithReferences,
    validateTableReferences 
  } = useTableReference()

  // 工作流状态
  const currentStep = ref('input') // input, analysis, generation, validation, execution, insights
  const isProcessing = ref(false)
  const workflowState = reactive({
    userQuery: '',
    referencedTables: [],
    connectionId: null,
    context: null,
    generatedSQL: '',
    validation: null,
    executionResult: null,
    insights: [],
    error: null,
    // 流式输出状态
    streaming: {
      isActive: false,
      currentStep: null,
      partialContent: '',
      fullContent: ''
    }
  })

  // 工作流步骤配置
  const workflowSteps = [
    { 
      key: 'input', 
      name: '输入解析', 
      description: '解析用户输入和@表名引用',
      icon: '📝'
    },
    { 
      key: 'analysis', 
      name: '上下文分析', 
      description: '分析数据库结构和业务场景',
      icon: '🔍'
    },
    { 
      key: 'generation', 
      name: 'SQL生成', 
      description: 'AI生成优化的SQL查询',
      icon: ' '
    },
    { 
      key: 'validation', 
      name: 'SQL验证', 
      description: '验证SQL安全性和性能',
      icon: '✅'
    },
    { 
      key: 'execution', 
      name: '查询执行', 
      description: '执行查询并收集性能数据',
      icon: '⚡'
    },
    { 
      key: 'insights', 
      name: '洞察生成', 
      description: '生成业务洞察和建议',
      icon: '💡'
    }
  ]

  // 计算属性
  const currentStepInfo = computed(() => {
    return workflowSteps.find(step => step.key === currentStep.value)
  })

  const progress = computed(() => {
    const stepIndex = workflowSteps.findIndex(step => step.key === currentStep.value)
    return ((stepIndex + 1) / workflowSteps.length) * 100
  })

  const canProceed = computed(() => {
    switch (currentStep.value) {
      case 'input':
        return workflowState.userQuery.trim().length > 0 && 
               workflowState.referencedTables.length > 0 &&
               workflowState.connectionId
      case 'analysis':
        return workflowState.context !== null
      case 'generation':
        return workflowState.generatedSQL.trim().length > 0
      case 'validation':
        // 验证通过条件：success为true，且如果有data.valid字段则必须为true
        return workflowState.validation && 
               workflowState.validation.success && 
               (workflowState.validation.data?.valid !== false)
      case 'execution':
        return workflowState.executionResult !== null
      default:
        return true
    }
  })

  // 重置工作流
  const resetWorkflow = () => {
    currentStep.value = 'input'
    isProcessing.value = false
    
    Object.assign(workflowState, {
      userQuery: '',
      referencedTables: [],
      connectionId: null,
      context: null,
      generatedSQL: '',
      validation: null,
      executionResult: null,
      insights: [],
      error: null
    })
  }

  // 启动工作流 (支持流式进度回调)
  const startWorkflow = async (userInput, connectionId = null, onStreamProgress = null) => {
    if (!mcpConnected.value) {
      throw new Error('MCP服务未连接，请先初始化')
    }

    resetWorkflow()
    
    workflowState.userQuery = userInput.trim()
    workflowState.connectionId = connectionId || connectionStore.currentConnection?.id
    
    if (!workflowState.connectionId) {
      throw new Error('没有可用的数据库连接')
    }

    // 解析表引用
    const references = parseTableReferences(userInput)
    workflowState.referencedTables = references.map(ref => ref.tableName)

    if (workflowState.referencedTables.length === 0) {
      throw new Error('请在查询中使用@表名引用至少一个表')
    }

    // 验证表引用
    const validation = validateTableReferences(userInput)
    if (!validation.valid) {
      throw new Error(`表引用验证失败: ${validation.errors.join(', ')}`)
    }

    console.log('启动MCP智能工作流:', {
      userQuery: workflowState.userQuery,
      referencedTables: workflowState.referencedTables,
      connectionId: workflowState.connectionId
    })

    return await executeWorkflow(onStreamProgress)
  }

  // 执行工作流 (支持流式进度回调)
  const executeWorkflow = async (onStreamProgress = null) => {
    isProcessing.value = true
    workflowState.error = null

    try {
      // Step 1: 输入解析 (已完成)
      currentStep.value = 'input'
      await new Promise(resolve => setTimeout(resolve, 300)) // 模拟处理时间

      // Step 2: 上下文分析
      currentStep.value = 'analysis'
      console.log('开始上下文分析...')
      
      const contextResult = await enhanceContextWithReferences(
        workflowState.userQuery, 
        workflowState.connectionId
      )
      workflowState.context = contextResult.context
      
      console.log('上下文分析完成:', contextResult)

      // Step 3: SQL生成 (调用AI Store - 流式输出)
      currentStep.value = 'generation'
      console.log('开始生成SQL...')
      
      const sqlResult = await generateSQLWithAI(
        workflowState.userQuery,
        workflowState.context,
        (progress) => {
          // 流式进度回调 - 传递给外部组件
          console.log('SQL生成进度:', progress.type, progress.current?.length || 0, '字符')
          onStreamProgress?.(progress)
        }
      )
      workflowState.generatedSQL = sqlResult.sql
      
      console.log('SQL生成完成:', sqlResult)

      // Step 4: SQL验证
      currentStep.value = 'validation'
      console.log('开始验证SQL...')
      
      const validationResult = await validateSQL(
        workflowState.generatedSQL,
        workflowState.context
      )
      workflowState.validation = validationResult
      
      console.log('SQL验证详细结果:', {
        success: validationResult.success,
        hasData: !!validationResult.data,
        dataValid: validationResult.data?.valid,
        dataErrors: validationResult.data?.errors,
        fullResult: validationResult
      })
      
      // 修正验证逻辑：优先检查success字段，容错处理valid字段
      if (!validationResult.success) {
        const errorMessage = validationResult.error || 
                           validationResult.data?.errors?.join(', ') || 
                           validationResult.message ||
                           '验证服务返回失败状态'
        throw new Error(`SQL验证失败: ${errorMessage}`)
      }
      
      // 如果有data.valid字段且为false，检查是否为严重错误
      if (validationResult.data && 
          typeof validationResult.data.valid === 'boolean' && 
          !validationResult.data.valid) {
        
        // 构建详细错误信息
        let errorDetails = []
        
        if (validationResult.data.errors && Array.isArray(validationResult.data.errors)) {
          errorDetails = validationResult.data.errors
        } else if (validationResult.data.error) {
          errorDetails.push(validationResult.data.error)
        } else if (validationResult.data.message) {
          errorDetails.push(validationResult.data.message)
        }
        
        // 检查是否为可忽略的警告（比如性能建议）
        const hasOnlyWarnings = errorDetails.length > 0 && 
          errorDetails.every(error => 
            typeof error === 'string' && 
            (error.includes('建议') || error.includes('优化') || error.includes('警告'))
          )
        
        if (hasOnlyWarnings) {
          // 如果只是警告，记录但不阻止执行
          console.warn('SQL验证警告:', errorDetails.join(', '))
        } else {
          // 如果是严重错误，抛出异常
          const errorMessage = errorDetails.length > 0 
            ? errorDetails.join(', ')
            : 'SQL语法或安全性验证未通过，请检查查询语句'
          
          console.warn('SQL验证失败详情:', {
            sql: workflowState.generatedSQL.substring(0, 200) + '...',
            validationResult,
            errorDetails
          })
          
          throw new Error(`SQL验证失败: ${errorMessage}`)
        }
      }
      
      console.log('SQL验证完成:', validationResult)

      // Step 5: 查询执行
      currentStep.value = 'execution'
      console.log('开始执行查询...')
      
      const executionResult = await executeSmartQuery(
        workflowState.generatedSQL,
        {
          includePerformance: true,
          includeStats: true
        }
      )
      workflowState.executionResult = executionResult
      
      console.log('查询执行完成:', executionResult)

      // Step 6: 洞察生成 (流式输出)
      currentStep.value = 'insights'
      console.log('开始生成洞察...')
      
      const insights = await generateInsightsWithAI(
        workflowState.executionResult,
        workflowState.context,
        workflowState.userQuery,
        (progress) => {
          // 流式进度回调 - 传递给外部组件
          console.log('洞察生成进度:', progress.type, progress.partialInsights?.length || 0, '个洞察')
          onStreamProgress?.(progress)
        }
      )
      workflowState.insights = insights
      
      console.log('洞察生成完成:', insights)

      return {
        success: true,
        result: {
          userQuery: workflowState.userQuery,
          referencedTables: workflowState.referencedTables,
          sql: workflowState.generatedSQL,
          executionResult: workflowState.executionResult,
          insights: workflowState.insights,
          context: workflowState.context,
          validation: workflowState.validation
        }
      }

    } catch (error) {
      console.error('工作流执行失败:', error)
      workflowState.error = error.message || error
      throw error
    } finally {
      isProcessing.value = false
    }
  }

  // 使用AI生成SQL (支持流式输出)
  const generateSQLWithAI = async (userQuery, context, onProgress = null) => {
    try {
      // 构建AI提示词
      const systemPrompt = buildSQLGenerationPrompt(context)
      
      console.log('开始流式生成SQL...')
      
      // 流式调用AI Store生成SQL
      const aiResponse = await aiStore.callAI(
        userQuery,
        systemPrompt,
        context,
        [], // 空的聊天历史
        onProgress ? (chunk, fullContent) => {
          // 更新流式状态
          workflowState.streaming.isActive = true
          workflowState.streaming.currentStep = 'sql_generation'
          workflowState.streaming.partialContent = chunk
          workflowState.streaming.fullContent = fullContent
          
          // 调用进度回调
          onProgress({
            step: 'sql_generation',
            type: 'streaming',
            partial: chunk,
            current: fullContent,
            isComplete: false
          })
          
          console.log('SQL生成进度:', fullContent.length, '字符')
        } : null
      )

      // 完成流式输出
      if (onProgress) {
        workflowState.streaming.isActive = false
        onProgress({
          step: 'sql_generation',
          type: 'complete',
          result: aiResponse,
          isComplete: true
        })
      }

      // 提取SQL
      const sql = aiStore.extractSQLFromResponse(aiResponse)
      
      console.log('SQL生成完成:', sql.substring(0, 100) + '...')
      
      return {
        sql,
        aiResponse,
        explanation: 'AI生成的SQL查询'
      }
    } catch (error) {
      console.error('AI SQL生成失败:', error)
      
      // 错误时停止流式输出
      workflowState.streaming.isActive = false
      if (onProgress) {
        onProgress({
          step: 'sql_generation',
          type: 'error',
          error: error.message
        })
      }
      
      throw new Error(`SQL生成失败: ${error.message || error}`)
    }
  }

  // 构建SQL生成提示词
  const buildSQLGenerationPrompt = (context) => {
    if (!context || !context.data) {
      return "你是一个SQL专家，请根据用户需求生成准确的SQL查询。"
    }

    const contextData = context.data
    let prompt = "你是一个专业的SQL分析专家。基于以下数据库上下文生成准确的SQL查询：\n\n"

    // 添加表结构信息
    if (contextData.tables) {
      prompt += "数据库表结构:\n"
      
      Object.entries(contextData.tables).forEach(([tableName, tableContext]) => {
        prompt += `\n表 ${tableName}:\n`
        
        if (tableContext.structure && tableContext.structure.columns) {
          tableContext.structure.columns.forEach(column => {
            prompt += `  - ${column.name} (${column.data_type})`
            if (column.primary_key) prompt += ' [主键]'
            if (!column.nullable) prompt += ' [非空]'
            prompt += '\n'
          })
        }

        if (tableContext.business_type) {
          prompt += `  业务类型: ${tableContext.business_type}\n`
        }
      })
    }

    // 添加关系信息
    if (contextData.relationships && contextData.relationships.length > 0) {
      prompt += "\n表关系:\n"
      contextData.relationships.forEach(rel => {
        prompt += `  - ${rel.from_table} → ${rel.to_table} (${rel.relationship_type})\n`
      })
    }

    // 添加建议
    if (contextData.suggestions && contextData.suggestions.length > 0) {
      prompt += "\n分析建议:\n"
      contextData.suggestions.forEach(suggestion => {
        prompt += `  - ${suggestion}\n`
      })
    }

    prompt += "\n请基于以上信息生成准确、高效的SQL查询。确保：\n"
    prompt += "1. 使用正确的表名和字段名\n"
    prompt += "2. 考虑表之间的关系\n"
    prompt += "3. 优化查询性能\n"
    prompt += "4. 只返回SQL语句，用```sql标记\n"

    return prompt
  }

  // 使用AI生成洞察 (支持流式输出)
  const generateInsightsWithAI = async (executionResult, context, userQuery, onProgress = null) => {
    try {
      if (!executionResult || !executionResult.data) {
        return []
      }

      const resultData = executionResult.data
      
      // 构建洞察生成提示词
      let insightPrompt = `基于以下SQL查询结果，生成有价值的业务洞察：\n\n`
      insightPrompt += `用户查询: ${userQuery}\n`
      insightPrompt += `结果行数: ${resultData.row_count || resultData.rows?.length || 0}\n`
      insightPrompt += `执行时间: ${resultData.execution_time || 0}ms\n`

      if (resultData.statistics) {
        insightPrompt += `\n数据统计:\n`
        insightPrompt += `- 总行数: ${resultData.statistics.row_count}\n`
        insightPrompt += `- 列数: ${resultData.statistics.column_count}\n`
      }

      if (resultData.quality_issues && resultData.quality_issues.length > 0) {
        insightPrompt += `\n数据质量问题:\n`
        resultData.quality_issues.forEach(issue => {
          insightPrompt += `- ${issue}\n`
        })
      }

      insightPrompt += `\n请生成3-5个简洁的业务洞察，每个洞察包含：\n`
      insightPrompt += `- 洞察标题（简短）\n`
      insightPrompt += `- 详细描述\n`
      insightPrompt += `- 置信度(1-100)\n`

      console.log('开始流式生成洞察...')
      
      // 流式调用AI生成洞察
      const aiResponse = await aiStore.callAI(
        insightPrompt,
        "你是一位专业的数据分析师，擅长从查询结果中发现业务价值和趋势。",
        context,
        [], // 空的聊天历史
        onProgress ? (chunk, fullContent) => {
          // 更新流式状态
          workflowState.streaming.isActive = true
          workflowState.streaming.currentStep = 'insights_generation'
          workflowState.streaming.partialContent = chunk
          workflowState.streaming.fullContent = fullContent
          
          // 尝试解析部分洞察
          const partialInsights = parseInsightsFromResponse(fullContent)
          
          // 调用进度回调
          onProgress({
            step: 'insights_generation',
            type: 'streaming',
            partial: chunk,
            current: fullContent,
            partialInsights,
            isComplete: false
          })
          
          console.log('洞察生成进度:', partialInsights.length, '个洞察')
        } : null
      )

      // 完成流式输出
      if (onProgress) {
        workflowState.streaming.isActive = false
        onProgress({
          step: 'insights_generation',
          type: 'complete',
          result: aiResponse,
          isComplete: true
        })
      }

      // 解析AI响应生成洞察数组
      const insights = parseInsightsFromResponse(aiResponse)
      
      console.log('洞察生成完成:', insights.length, '个洞察')
      
      return insights
    } catch (error) {
      console.error('生成洞察失败:', error)
      
      // 错误时停止流式输出
      workflowState.streaming.isActive = false
      if (onProgress) {
        onProgress({
          step: 'insights_generation',
          type: 'error',
          error: error.message
        })
      }
      
      // 返回基础洞察
      return [
        {
          id: 'basic-1',
          type: 'performance',
          icon: '📊',
          title: '查询执行完成',
          description: `成功执行查询，返回${executionResult.data?.rows?.length || 0}条结果`,
          confidence: 90
        }
      ]
    }
  }

  // 解析洞察响应
  const parseInsightsFromResponse = (response) => {
    // 简单的洞察解析逻辑
    const insights = []
    const lines = response.split('\n').filter(line => line.trim())
    
    let currentInsight = null
    let idCounter = 1

    lines.forEach(line => {
      const trimmedLine = line.trim()
      
      // 检测标题行（通常以数字开头或包含特殊字符）
      if (/^[\d\-\*]/.test(trimmedLine) || trimmedLine.includes('洞察') || trimmedLine.includes('发现')) {
        if (currentInsight) {
          insights.push(currentInsight)
        }
        
        currentInsight = {
          id: `insight-${idCounter++}`,
          type: 'business',
          icon: '💡',
          title: trimmedLine.replace(/^[\d\-\*\s]+/, ''),
          description: '',
          confidence: 85
        }
      } else if (currentInsight && trimmedLine.length > 0) {
        currentInsight.description += (currentInsight.description ? ' ' : '') + trimmedLine
      }
    })

    if (currentInsight) {
      insights.push(currentInsight)
    }

    // 如果解析失败，返回默认洞察
    if (insights.length === 0) {
      insights.push({
        id: 'default-1',
        type: 'general',
        icon: '📋',
        title: '数据查询成功',
        description: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
        confidence: 80
      })
    }

    return insights.slice(0, 5) // 最多5个洞察
  }

  // 跳转到指定步骤
  const goToStep = (stepKey) => {
    if (workflowSteps.find(step => step.key === stepKey)) {
      currentStep.value = stepKey
    }
  }

  return {
    // 状态
    currentStep,
    isProcessing,
    workflowState: readonly(workflowState),
    workflowSteps,

    // 计算属性
    currentStepInfo,
    progress,
    canProceed,

    // 方法
    resetWorkflow,
    startWorkflow,
    executeWorkflow,
    goToStep,
    generateSQLWithAI,
    generateInsightsWithAI
  }
}