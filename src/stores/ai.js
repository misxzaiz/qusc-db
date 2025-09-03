import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

// 简化的AI Store，直接从前端调用第三方服务API
export const useAIStore = defineStore('ai', () => {
  // 状态
  const isConfigured = ref(false)
  const currentProvider = ref('deepseek')
  const apiKey = ref('')
  const baseUrl = ref('')
  const model = ref('deepseek-coder')
  const isGenerating = ref(false)
  const conversationHistory = ref([])
  const history = ref([]) // 添加history属性，与AISidebar.vue中的引用匹配
  const suggestions = ref([]) // 添加suggestions属性，与AISidebar.vue中的引用匹配
  const templates = ref([])
  const selectedTables = ref([]) // 当前用户选中的表
  const suggestedRole = ref(null) // 推荐的角色
  const customRoles = ref({}) // 存储自定义角色
  const settings = reactive({
    temperature: 0.1,
    maxTokens: 8192,  // 提升默认token数到8K，支持更长的回答
    autoOptimize: true,
    explainQueries: true,
    saveHistory: true
  })

  // AI服务提供商配置
  const providers = reactive({
    deepseek: {
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1/chat/completions',
      models: ['deepseek-coder', 'deepseek-chat'],
      requiresKey: true
    },
    openai: {
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1/chat/completions',
      models: ['gpt-4', 'gpt-3.5-turbo'],
      requiresKey: true
    },
    claude: {
      name: 'Claude',
      baseUrl: 'https://api.anthropic.com/v1/messages',
      models: ['claude-3-opus', 'claude-3-sonnet'],
      requiresKey: true
    }
  })

  // 初始化AI服务
  const initialize = async () => {
    try {
      loadConfiguration()
      loadCustomRolesFromStorage() // 加载自定义角色
      // 如果有API密钥，则认为已配置
      if (apiKey.value && currentProvider.value) {
        isConfigured.value = true
      }
      return isConfigured.value
    } catch (error) {
      console.error('AI服务初始化失败:', error)
      return false
    }
  }

  // 配置AI服务
  const configure = async (config) => {
    try {
      // 直接在前端配置AI服务
      currentProvider.value = config.provider
      apiKey.value = config.apiKey
      baseUrl.value = config.baseUrl || providers[config.provider]?.baseUrl
      model.value = config.model || providers[config.provider]?.models[0]
      
      // 测试API连接
      await testConnection()
      
      isConfigured.value = true
      saveConfiguration()
      return true
    } catch (error) {
      console.error('AI服务配置失败:', error)
      throw error
    }
  }

  // 测试API连接
  const testConnection = async () => {
    // 简单的连接测试，发送一个简单的请求
    try {
      // 使用更简单的请求进行测试，避免消耗过多token
      const provider = currentProvider.value
      const endpoint = baseUrl.value
      
      // 构建一个简单的请求
      let requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: null
      }
      
      if (provider === 'deepseek') {
        requestOptions.headers['Authorization'] = `Bearer ${apiKey.value}`
        requestOptions.body = JSON.stringify({
          model: model.value,
          messages: [
            { role: "user", content: "Hello" }
          ],
          max_tokens: 5 // 只需要很少的token
        })
      } else if (provider === 'openai') {
        requestOptions.headers['Authorization'] = `Bearer ${apiKey.value}`
        requestOptions.body = JSON.stringify({
          model: model.value,
          messages: [
            { role: "user", content: "Hello" }
          ],
          max_tokens: 5
        })
      } else if (provider === 'claude') {
        requestOptions.headers['x-api-key'] = apiKey.value
        requestOptions.headers['anthropic-version'] = '2023-06-01'
        requestOptions.body = JSON.stringify({
          model: model.value,
          messages: [
            { role: "user", content: "Hello" }
          ],
          max_tokens: 5
        })
      } else {
        throw new Error(`不支持的AI提供商: ${provider}`)
      }

      const response = await fetch(endpoint, requestOptions)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API请求失败 (${response.status}): ${errorText}`)
      }

      return true
    } catch (error) {
      console.error('API connection test failed:', error)
      throw new Error(`API连接测试失败: ${error.message}`)
    }
  }

  // 调用AI API
  const callAI = async (prompt, systemPrompt = "", context = null, chatHistory = null, onStream = null) => {
    if (!isConfigured.value) {
      throw new Error('AI服务未配置')
    }

    const provider = currentProvider.value
    const endpoint = baseUrl.value
    
    // 构建消息
    const messages = []
    
    // 添加系统提示
    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt
      })
    }
    
    // 添加聊天历史
    if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
      // 只保留最近的10条消息，避免上下文过长
      const recentHistory = chatHistory.slice(-10)
      messages.push(...recentHistory)
    }
    
    // 构建用户提示，只有在有context时才包含数据库结构
    let userContent = prompt
    if (context) {
      // 智能转换上下文格式
      let contextStr = ''
      
      if (typeof context === 'string') {
        contextStr = context
      } else if (context.schema && Array.isArray(context.schema)) {
        // 使用建表语句替代JSON，显著减少字符数
        // 如果有焦点表，只传递焦点表；没有焦点表才传递全部
        const focusedTables = context.focusedTables?.map(t => t.name) || null
        
        if (focusedTables && focusedTables.length > 0) {
          // 只传递用户@引用的表
          const filteredSchema = context.schema.filter(table => {
            const tableName = table.name || table.table_name
            return focusedTables.includes(tableName)
          })
          contextStr = convertSchemaToCreateSQL(filteredSchema, focusedTables)
        } else {
          // 这个分支实际上不应该到达，因为如果没有焦点表，上层就不会传递context
          contextStr = convertSchemaToCreateSQL(context.schema, focusedTables)
        }
      } else if (Array.isArray(context)) {
        // 直接是schema数组的情况
        contextStr = convertSchemaToCreateSQL(context)
      } else {
        // 其他复杂对象，仍使用JSON但进行优化
        contextStr = JSON.stringify(context, (key, value) => {
          // 过滤不必要的字段以减少大小
          if (key === 'nullable' && value === true) return undefined
          if (key === 'primary_key' && value === false) return undefined
          return value
        })
      }
      
      // 适当提高长度限制，因为建表语句更易读
      if (contextStr.length > 6000) {
        contextStr = contextStr.substring(0, 6000) + "...(已截断)"
      }
      userContent = `用户需求：${prompt}\n\n数据库结构：\n${contextStr}`
    }
    
    // 添加用户提示
    messages.push({
      role: "user",
      content: userContent
    })
    
    // 根据不同的提供商构建请求
    let requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: null
    }
    
    // 是否使用流式输出
    const useStream = !!onStream

    // 为流式请求设置正确的Accept头
    if (useStream) {
      requestOptions.headers['Accept'] = 'text/event-stream'
    }
    
    if (provider === 'deepseek') {
      requestOptions.headers['Authorization'] = `Bearer ${apiKey.value}`
      requestOptions.body = JSON.stringify({
        model: model.value,
        messages: messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: useStream
      })
    } else if (provider === 'openai') {
      requestOptions.headers['Authorization'] = `Bearer ${apiKey.value}`
      requestOptions.body = JSON.stringify({
        model: model.value,
        messages: messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: useStream
      })
    } else if (provider === 'claude') {
      requestOptions.headers['x-api-key'] = apiKey.value
      requestOptions.headers['anthropic-version'] = '2023-06-01'
      requestOptions.body = JSON.stringify({
        model: model.value,
        messages: messages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: useStream
      })
    } else {
      throw new Error(`不支持的AI提供商: ${provider}`)
    }
    
    try {
      
      // 如果提供了流式回调函数，使用流式处理
      if (useStream) {
        return await handleStreamResponse(endpoint, requestOptions, provider, onStream)
      } else {
        // 否则使用普通请求
        return await handleNormalResponse(endpoint, requestOptions, provider)
      }
    } catch (error) {
      console.error(`AI API调用失败:`, error)
      throw error
    }
  }
  
  // 处理普通响应
  const handleNormalResponse = async (endpoint, requestOptions, provider) => {
    const response = await fetch(endpoint, requestOptions)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API请求失败 (${response.status}): ${errorText}`)
    }
    
    const data = await response.json()
    
    // 根据不同的提供商解析响应
    let content = ''
    if (provider === 'deepseek' || provider === 'openai') {
      content = data.choices[0].message.content
    } else if (provider === 'claude') {
      content = data.content[0].text
    }
    
    return content
  }
  
  // 处理流式响应
  const handleStreamResponse = async (endpoint, requestOptions, provider, onStream) => {
    const response = await fetch(endpoint, requestOptions)
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API请求失败 (${response.status}): ${errorText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let fullContent = ''
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        const chunk = decoder.decode(value)
        
        // 处理不同提供商的流式响应格式
        if (provider === 'deepseek' || provider === 'openai') {
          // 处理SSE格式的响应
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const jsonStr = line.substring(6).trim()
                // 跳过空字符串和非JSON内容
                if (!jsonStr || jsonStr === '' || !jsonStr.startsWith('{')) {
                  continue
                }
                const data = JSON.parse(jsonStr)
                const content = data.choices[0]?.delta?.content || ''
                if (content) {
                  fullContent += content
                  onStream(content, fullContent)
                }
              } catch (e) {
                // 只在调试模式下输出警告，避免控制台噪音
                console.debug('跳过无效的流式响应行:', line.substring(6), e.message)
              }
            }
          }
        } else if (provider === 'claude') {
          // Claude的流式响应处理
          try {
            const trimmedChunk = chunk.trim()
            if (trimmedChunk && trimmedChunk.startsWith('{')) {
              const data = JSON.parse(trimmedChunk)
              const content = data.delta?.text || ''
              if (content) {
                fullContent += content
                onStream(content, fullContent)
              }
            }
          } catch (e) {
            console.debug('跳过无效的Claude流式响应:', chunk, e.message)
          }
        }
      }
    } catch (error) {
      console.error('流式读取错误:', error)
      throw error
    }
    
    return fullContent
  }

  // 生成SQL
  const generateSQL = async (prompt, context = null) => {
    if (!isConfigured.value) {
      throw new Error('AI服务未配置')
    }

    isGenerating.value = true
    
    try {
      const systemPrompt = "你是一个SQL专家助手。用户会用自然语言描述需求，你需要生成对应的SQL语句。请只返回SQL语句，不需要额外的解释。"
      
      // 调用AI API生成SQL
      const result = await callAI(prompt, systemPrompt, context)
      
      // 提取SQL语句（去除markdown格式）
      const sql = extractSQLFromResponse(result)
      
      // 添加到对话历史
      if (settings.saveHistory) {
        addToHistory('user', prompt)
        addToHistory('assistant', sql)
      }
      
      return { sql, explanation: 'AI 生成的 SQL 查询' }
    } catch (error) {
      console.error('SQL生成失败:', error)
      throw error
    } finally {
      isGenerating.value = false
    }
  }

  // 优化SQL
  const optimizeSQL = async (sql, context = null) => {
    if (!isConfigured.value) {
      throw new Error('AI服务未配置')
    }

    isGenerating.value = true
    
    try {
      const systemPrompt = "你是一个SQL优化专家。分析用户提供的SQL语句，提供优化建议和改进后的SQL。请返回优化后的SQL语句和简要的优化说明。"
      
      // 调用AI API优化SQL
      const result = await callAI(sql, systemPrompt, context)
      
      return { sql: result, explanation: 'AI 优化后的 SQL 查询' }
    } catch (error) {
      console.error('SQL优化失败:', error)
      throw error
    } finally {
      isGenerating.value = false
    }
  }

  // 解释错误
  const explainError = async (error, sql = null) => {
    if (!isConfigured.value) {
      throw new Error('AI服务未配置')
    }

    isGenerating.value = true
    
    try {
      const systemPrompt = "你是一个SQL错误诊断专家。分析错误信息，提供详细的错误原因分析和具体的解决方案。"
      const prompt = sql 
        ? `SQL语句：\n${sql}\n\n错误信息：\n${error}\n\n请解释错误原因并提供修复建议。`
        : `错误信息：\n${error}\n\n请解释可能的原因和解决方案。`
      
      // 调用AI API解释错误
      const result = await callAI(prompt, systemPrompt)
      
      return result
    } catch (err) {
      console.error('错误解释失败:', err)
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  // 解释查询
  const explainQuery = async (sql) => {
    if (!isConfigured.value) {
      throw new Error('AI服务未配置')
    }

    isGenerating.value = true
    
    try {
      const systemPrompt = "你是一个SQL解释专家。详细解释SQL语句的执行逻辑、各个部分的作用，以及查询的业务含义。"
      const prompt = `请详细解释以下SQL语句：\n${sql}`
      
      // 调用AI API解释查询
      const result = await callAI(prompt, systemPrompt)
      
      return result
    } catch (error) {
      console.error('查询解释失败:', error)
      throw error
    } finally {
      isGenerating.value = false
    }
  }
  
  // 生成智能建议
  const generateSuggestions = async (schema = null) => {
    if (!isConfigured.value) {
      throw new Error('AI服务未配置')
    }

    isGenerating.value = true
    
    try {
      // 默认建议，如果AI调用失败也能显示一些内容
      const defaultSuggestions = [
        {
          id: 'default-1',
          type: 'best_practice',
          icon: '💡',
          title: '使用索引优化查询',
          description: '为经常在WHERE子句中使用的列添加索引，可以显著提高查询性能。'
        },
        {
          id: 'default-2',
          type: 'performance',
          icon: '⚡',
          title: '避免SELECT *',
          description: '只选择需要的列，而不是使用SELECT *，可以减少数据传输和处理时间。'
        }
      ]
      
      if (!schema || schema.length === 0) {
        suggestions.value = defaultSuggestions
        return suggestions.value
      }
      
      const systemPrompt = "你是一个数据库专家。根据提供的数据库结构，生成有用的SQL建议和最佳实践。"
      const prompt = `根据以下数据库结构，生成5条有用的SQL建议：\n${typeof schema === 'string' ? schema : JSON.stringify(schema)}`
      
      try {
        // 调用AI API生成建议
        const result = await callAI(prompt, systemPrompt)
        
        // 解析AI响应，生成建议列表
        // 这里简化处理，实际应用中可能需要更复杂的解析逻辑
        const aiSuggestions = result.split('\n\n').filter(s => s.trim()).map((suggestion, index) => {
          const lines = suggestion.split('\n')
          const title = lines[0].replace(/^\d+\.\s*/, '').trim()
          const description = lines.slice(1).join(' ').trim()
          
          return {
            id: `ai-${index}`,
            type: getRandomSuggestionType(),
            icon: getSuggestionIcon(title),
            title: title,
            description: description
          }
        })
        
        suggestions.value = aiSuggestions.length > 0 ? aiSuggestions : defaultSuggestions
      } catch (error) {
        console.error('生成建议失败，使用默认建议:', error)
        suggestions.value = defaultSuggestions
      }
      
      return suggestions.value
    } catch (error) {
      console.error('生成建议失败:', error)
      throw error
    } finally {
      isGenerating.value = false
    }
  }
  
  // 辅助函数：获取随机建议类型
  const getRandomSuggestionType = () => {
    const types = ['best_practice', 'performance', 'security', 'table_suggestion']
    return types[Math.floor(Math.random() * types.length)]
  }
  
  // 辅助函数：根据标题获取建议图标
  const getSuggestionIcon = (title) => {
    if (title.toLowerCase().includes('index') || title.toLowerCase().includes('索引')) {
      return '📊'
    } else if (title.toLowerCase().includes('join') || title.toLowerCase().includes('连接')) {
      return '🔗'
    } else if (title.toLowerCase().includes('security') || title.toLowerCase().includes('安全')) {
      return '🔒'
    } else if (title.toLowerCase().includes('performance') || title.toLowerCase().includes('性能')) {
      return '⚡'
    } else {
      return '💡'
    }
  }
  
  // 从响应中提取SQL语句
  const extractSQLFromResponse = (content) => {
    // 移除markdown代码块标记
    const contentTrimmed = content.trim()
    
    // 查找SQL代码块
    if (contentTrimmed.includes("```sql")) {
      const sqlStart = contentTrimmed.indexOf("```sql") + 6
      const sqlEnd = contentTrimmed.indexOf("```", sqlStart)
      if (sqlEnd > sqlStart) {
        return contentTrimmed.substring(sqlStart, sqlEnd).trim()
      }
    }
    
    // 查找普通代码块
    if (contentTrimmed.includes("```")) {
      const sqlStart = contentTrimmed.indexOf("```") + 3
      const sqlEnd = contentTrimmed.indexOf("```", sqlStart)
      if (sqlEnd > sqlStart) {
        return contentTrimmed.substring(sqlStart, sqlEnd).trim()
      }
    }
    
    // 如果没有找到代码块，返回原内容
    return contentTrimmed
  }

  // 业务场景识别
  const identifyBusinessScenario = (tableNames) => {
    if (!tableNames || tableNames.length === 0) return 'general'
    
    const tables = tableNames.map(name => name.toLowerCase())
    
    // 权限管理系统
    if (tables.some(t => t.includes('sys_') || t.includes('permission') || t.includes('role'))) {
      return 'permission_system'
    }
    
    // 电商场景
    if (tables.some(t => t.includes('user') || t.includes('customer')) && 
        tables.some(t => t.includes('order') || t.includes('product'))) {
      return 'ecommerce'
    }
    
    // 社交媒体场景
    if (tables.some(t => t.includes('user') || t.includes('member')) && 
        tables.some(t => t.includes('post') || t.includes('comment') || t.includes('like'))) {
      return 'social_media'
    }
    
    // 金融场景
    if (tables.some(t => t.includes('account') || t.includes('transaction') || t.includes('payment'))) {
      return 'finance'
    }
    
    // 内容管理场景
    if (tables.some(t => t.includes('article') || t.includes('post') || t.includes('content'))) {
      return 'cms'
    }
    
    // 人力资源场景
    if (tables.some(t => t.includes('employee') || t.includes('staff') || t.includes('department'))) {
      return 'hr'
    }
    
    // 测试数据
    if (tables.some(t => t.includes('test_'))) {
      return 'testing'
    }
    
    return 'general'
  }

  // 推断表的业务类型
  const inferBusinessType = (tableName) => {
    const name = tableName.toLowerCase()
    
    if (name.includes('user') || name.includes('customer') || name.includes('member')) return 'user_management'
    if (name.includes('order') || name.includes('purchase')) return 'transaction'
    if (name.includes('product') || name.includes('item') || name.includes('goods')) return 'inventory'
    if (name.includes('post') || name.includes('article') || name.includes('content')) return 'content'
    if (name.includes('comment') || name.includes('review') || name.includes('feedback')) return 'engagement'
    if (name.includes('payment') || name.includes('transaction') || name.includes('account')) return 'financial'
    if (name.includes('category') || name.includes('tag') || name.includes('classification')) return 'taxonomy'
    if (name.includes('log') || name.includes('history') || name.includes('audit')) return 'tracking'
    
    return 'general'
  }

  // 找到相关联的表
  const findRelatedTables = (selectedTables, fullSchema) => {
    if (!selectedTables || selectedTables.length === 0) return []
    
    const related = new Set()
    
    // 基于表名推断关系
    selectedTables.forEach(tableName => {
      const name = tableName.toLowerCase()
      
      fullSchema.forEach(table => {
        const otherName = (table.name || '').toLowerCase()
        if (otherName !== name && !selectedTables.includes(table.name)) {
          // 查找可能相关的表
          if (name.includes('user') && otherName.includes('role')) related.add(table.name)
          if (name.includes('user') && otherName.includes('group')) related.add(table.name)
          if (name.includes('role') && otherName.includes('permission')) related.add(table.name)
          if (name.includes('sys_') && otherName.includes('sys_')) related.add(table.name)
          // 权限系统相关表
          if (name.includes('permission') && otherName.includes('role')) related.add(table.name)
        }
      })
    })
    
    return Array.from(related).slice(0, 5) // 限制相关表数量
  }

  // 构建增强的上下文
  const buildEnhancedContext = (selectedTables = []) => {
    const fullSchema = getCurrentSchema()
    
    if (selectedTables.length === 0) {
      // 如果没有选中表，返回简化的上下文
      return {
        schema: fullSchema,
        businessContext: 'general',
        tableCount: fullSchema.length
      }
    }
    
    // 构建增强上下文
    const businessContext = identifyBusinessScenario(selectedTables)
    const relatedTables = findRelatedTables(selectedTables, fullSchema)
    
    const focusedTables = selectedTables.map(tableName => {
      const tableSchema = fullSchema.find(t => (t.table_name || t.name) === tableName)
      return {
        name: tableName,
        structure: tableSchema,
        businessType: inferBusinessType(tableName),
        fieldCount: tableSchema?.columns?.length || 0
      }
    })
    
    return {
      // 用户选中的核心表
      focusedTables,
      
      // 相关联的表
      relatedTables: relatedTables.map(tableName => ({
        name: tableName,
        structure: fullSchema.find(t => (t.table_name || t.name) === tableName),
        relationshipType: 'suggested'
      })),
      
      // 业务场景
      businessContext,
      
      // 表数量统计
      stats: {
        selectedCount: selectedTables.length,
        relatedCount: relatedTables.length,
        totalCount: fullSchema.length
      },
      
      // 完整schema（作为备用）
      fullSchema
    }
  }

  // 获取当前Schema的辅助方法
  const getCurrentSchema = () => {
    // 这里需要从connection store获取当前schema
    // 因为不能直接导入connectionStore避免循环依赖，所以先返回空数组
    // 实际使用时会从调用方传入
    return []
  }

  // 智能角色推荐系统
  const suggestRoleBasedOnTables = (selectedTables, businessContext) => {
    if (!selectedTables || selectedTables.length === 0) {
      return null
    }
    
    const tableNames = selectedTables.map(name => name.toLowerCase())
    
    // 预定义的角色模板
    const roleTemplates = {
      permission_system: {
        role: 'permission_analyst',
        name: '🔐 权限管理专家',
        icon: '🔐',
        prompt: `你是一位权限管理系统分析专家，精通RBAC权限模型和用户访问控制。
        当前关注的表: ${selectedTables.join(', ')}
        
        你的专长包括:
        - 用户权限分析和访问控制
        - 角色权限分配和管理
        - 安全策略制定和审计
        - 权限继承和层级关系分析
        - 系统安全漏洞检测
        
        请从权限管理和系统安全的角度提供专业分析。`,
        templates: ['用户权限审计', '角色权限分析', '权限继承查询', '安全风险检测']
      },
      
      testing: {
        role: 'test_analyst',
        name: '🧪 测试数据分析师',
        icon: '🧪',
        prompt: `你是一位测试数据分析专家，专注于数据质量检测和测试场景构建。
        当前关注的表: ${selectedTables.join(', ')}
        
        你的专长包括:
        - 测试数据质量分析
        - 边界值和异常数据检测
        - 数据完整性验证
        - 性能测试数据分析
        - 测试覆盖率评估
        
        请从测试和质量保证的角度提供专业分析。`,
        templates: ['数据质量检测', '异常数据分析', '性能基准测试', '数据覆盖率统计']
      },
      
      ecommerce: {
        role: 'ecommerce_analyst',
        name: '🛍️ 电商分析师',
        icon: '🛍️',
        prompt: `你是一位专业的电商数据分析师，擅长分析用户行为、订单趋势、商品销售和业务增长。
        当前关注的表: ${selectedTables.join(', ')}
        
        你的专长包括:
        - 用户行为分析和用户画像构建
        - 订单趋势分析和销售预测  
        - 商品分析和库存优化
        - 用户生命周期价值(LTV)分析
        - 转化漏斗分析和优化建议
        
        请用专业而易懂的方式回答用户的数据分析需求。`,
        templates: ['用户RFM分析', '销售趋势分析', '商品热度排行', '用户复购分析']
      },
      
      social_media: {
        role: 'social_analyst',
        name: '📱 社交媒体分析师',
        icon: '📱',
        prompt: `你是一位社交媒体数据分析专家，专注于用户互动、内容表现和社区运营分析。
        当前关注的表: ${selectedTables.join(', ')}
        
        你的专长包括:
        - 用户互动行为分析
        - 内容热度和传播分析
        - 用户活跃度和留存分析
        - 社区健康度评估
        - 内容策略优化建议
        
        请从社交媒体运营的角度提供专业的数据洞察。`,
        templates: ['用户活跃度分析', '内容互动统计', '用户增长趋势', '热门话题挖掘']
      },
      
      finance: {
        role: 'financial_analyst',
        name: '💰 金融数据分析师',
        icon: '💰',
        prompt: `你是一位金融数据分析专家，精通交易分析、风险评估和财务建模。
        当前关注的表: ${selectedTables.join(', ')}
        
        你的专长包括:
        - 交易模式和异常检测
        - 资金流向和风险分析
        - 用户信用评估
        - 财务报表分析
        - 合规性检查
        
        请提供准确、合规的金融数据分析建议。`,
        templates: ['交易异常检测', '资金流向分析', '用户风险评估', '财务健康检查']
      },
      
      hr: {
        role: 'hr_analyst',
        name: '👥 人力资源分析师',
        icon: '👥',
        prompt: `你是一位人力资源数据分析专家，专注于员工管理、绩效分析和组织优化。
        当前关注的表: ${selectedTables.join(', ')}
        
        你的专长包括:
        - 员工绩效和考核分析
        - 人员流动和离职分析
        - 薪酬结构和公平性分析
        - 部门效率评估
        - 人才招聘和培养建议
        
        请从人力资源管理的角度提供专业分析。`,
        templates: ['员工绩效分析', '离职率统计', '薪酬公平性', '部门效率对比']
      },
      
      cms: {
        role: 'content_analyst',
        name: '📝 内容分析师',
        icon: '📝',
        prompt: `你是一位内容数据分析专家，专注于内容表现、用户阅读行为和内容策略优化。
        当前关注的表: ${selectedTables.join(', ')}
        
        你的专长包括:
        - 内容表现和质量分析
        - 用户阅读行为分析
        - 内容分类和标签优化
        - SEO和流量分析
        - 内容策略建议
        
        请从内容运营的角度提供专业的数据洞察。`,
        templates: ['内容热度排行', '用户阅读偏好', '内容质量评估', '流量来源分析']
      }
    }
    
    // 根据业务场景推荐角色
    if (roleTemplates[businessContext]) {
      return roleTemplates[businessContext]
    }
    
    // 如果没有匹配的预设角色，生成通用分析师角色
    return {
      role: 'data_analyst',
      name: '📊 数据分析师',
      icon: '📊',
      prompt: `你是一位专业的数据分析师，擅长从数据中发现洞察和价值。
      当前关注的表: ${selectedTables.join(', ')}
      
      你的专长包括:
      - 数据探索和模式发现
      - 统计分析和趋势识别
      - 数据可视化建议
      - SQL查询优化
      - 业务指标构建
      
      请根据数据特征提供专业的分析建议。`,
      templates: ['数据概览分析', '趋势识别', '异常值检测', '关联性分析']
    }
  }

  // 生成自定义角色（基于关键词）
  const generateCustomRole = async (keywords, selectedTables = []) => {
    if (!isConfigured.value) {
      throw new Error('AI服务未配置')
    }
    
    const systemPrompt = `你是一个AI角色生成专家。根据用户提供的关键词和数据库表结构，生成一个专业的AI助手角色。

请返回JSON格式的角色定义，包含以下字段：
{
  "role": "角色ID（英文，用下划线）",
  "name": "角色显示名称（带emoji）",
  "icon": "代表性emoji",
  "prompt": "详细的角色设定和专业能力描述",
  "templates": ["常用查询模板1", "常用查询模板2", "常用查询模板3", "常用查询模板4"]
}

角色应该：
- 专业且有针对性
- 能够理解特定领域的业务逻辑
- 提供实用的数据分析建议
- 语言风格符合角色定位`
    
    const prompt = `关键词: ${keywords}
当前数据库表: ${selectedTables.join(', ')}

请生成一个适合这个场景的专业AI助手角色。`
    
    try {
      const response = await callAI(prompt, systemPrompt)
      
      // 提取JSON内容（处理markdown代码块）
      let jsonString = response.trim()
      
      // 移除markdown代码块标记
      if (jsonString.includes('```json')) {
        const start = jsonString.indexOf('```json') + 7
        const end = jsonString.lastIndexOf('```')
        if (end > start) {
          jsonString = jsonString.substring(start, end).trim()
        }
      } else if (jsonString.includes('```')) {
        const start = jsonString.indexOf('```') + 3
        const end = jsonString.lastIndexOf('```')
        if (end > start) {
          jsonString = jsonString.substring(start, end).trim()
        }
      }
      
      // 查找JSON对象的开始和结束
      const jsonStart = jsonString.indexOf('{')
      const jsonEnd = jsonString.lastIndexOf('}')
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        jsonString = jsonString.substring(jsonStart, jsonEnd + 1)
      }
      
      const role = JSON.parse(jsonString)
      
      // 保存到自定义角色集合中
      saveCustomRole(role)
      
      return role
    } catch (error) {
      console.error('生成自定义角色失败:', error)
      // 返回默认角色
      const defaultRole = {
        role: 'custom_analyst',
        name: `🎯 ${keywords}专家`,
        icon: '🎯',
        prompt: `你是一位${keywords}领域的数据分析专家。请根据用户需求提供专业的数据分析建议。`,
        templates: ['数据概览', '趋势分析', '深度洞察', '优化建议']
      }
      
      // 也要保存默认角色
      saveCustomRole(defaultRole)
      
      return defaultRole
    }
  }

  // 保存自定义角色
  const saveCustomRole = (role) => {
    if (!role || !role.role) return
    
    customRoles.value[role.role] = {
      ...role,
      createdAt: new Date(),
      isCustom: true
    }
    
    // 持久化到localStorage
    saveCustomRolesToStorage()
  }

  // 获取自定义角色
  const getCustomRole = (roleId) => {
    return customRoles.value[roleId] || null
  }

  // 获取所有自定义角色
  const getAllCustomRoles = () => {
    return Object.values(customRoles.value)
  }

  // 删除自定义角色
  const deleteCustomRole = (roleId) => {
    if (customRoles.value[roleId]) {
      delete customRoles.value[roleId]
      saveCustomRolesToStorage()
      return true
    }
    return false
  }

  // 保存自定义角色到localStorage
  const saveCustomRolesToStorage = () => {
    try {
      localStorage.setItem('qusc-db-custom-roles', JSON.stringify(customRoles.value))
    } catch (error) {
      console.error('保存自定义角色失败:', error)
    }
  }

  // 从localStorage加载自定义角色
  const loadCustomRolesFromStorage = () => {
    try {
      const saved = localStorage.getItem('qusc-db-custom-roles')
      if (saved) {
        customRoles.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载自定义角色失败:', error)
      customRoles.value = {}
    }
  }

  // 更新选中的表
  const updateSelectedTables = (tables) => {
    selectedTables.value = tables || []
    
    // 当表选择变化时，自动推荐角色
    if (tables && tables.length > 0) {
      const businessContext = identifyBusinessScenario(tables)
      const role = suggestRoleBasedOnTables(tables, businessContext)
      suggestedRole.value = role
    } else {
      suggestedRole.value = null
    }
  }

  // 修改buildEnhancedContext方法，使用store中的schema数据
  const buildEnhancedContextWithSchema = (schema, tables = null) => {
    const tablesToUse = tables || selectedTables.value
    
    if (tablesToUse.length === 0) {
      // 如果没有选中表，返回简化的上下文
      return {
        schema: schema,
        businessContext: 'general',
        tableCount: schema.length
      }
    }
    
    // 构建增强上下文
    const businessContext = identifyBusinessScenario(tablesToUse)
    const relatedTables = findRelatedTables(tablesToUse, schema)
    
    const focusedTables = tablesToUse.map(tableName => {
      const tableSchema = schema.find(t => t.name === tableName)
      return {
        name: tableName,
        structure: tableSchema,
        businessType: inferBusinessType(tableName),
        fieldCount: tableSchema?.columns?.length || 0
      }
    })
    
    return {
      // 用户选中的核心表
      focusedTables,
      
      // 相关联的表
      relatedTables: relatedTables.map(tableName => ({
        name: tableName,
        structure: schema.find(t => t.name === tableName),
        relationshipType: 'suggested'
      })),
      
      // 业务场景
      businessContext,
      
      // 表数量统计
      stats: {
        selectedCount: tablesToUse.length,
        relatedCount: relatedTables.length,
        totalCount: schema.length
      },
      
      // 完整schema（作为备用）
      fullSchema: schema,
      
      // 智能提示
      suggestions: generateContextualSuggestions(tablesToUse, businessContext)
    }
  }

  // 生成上下文相关的建议
  const generateContextualSuggestions = (tables, businessContext) => {
    const suggestions = []
    
    if (businessContext === 'permission_system') {
      suggestions.push(
        '分析用户角色权限分配情况',
        '检查权限继承关系和层级结构',
        '审计系统权限安全风险',
        '统计角色和权限使用情况'
      )
    } else if (businessContext === 'testing') {
      suggestions.push(
        '检测数据完整性和一致性',
        '分析数据分布和边界值',
        '统计数据覆盖率和缺失值',
        '验证数据类型和约束条件'
      )
    } else if (businessContext === 'ecommerce') {
      suggestions.push(
        '分析用户购买行为和偏好',
        '计算用户生命周期价值(LTV)',
        '分析商品销售趋势和热度',
        '构建用户RFM模型'
      )
    } else if (businessContext === 'social_media') {
      suggestions.push(
        '分析用户活跃度和互动模式',
        '识别热门内容和趋势',
        '计算用户留存和流失',
        '分析内容传播路径'
      )
    } else if (businessContext === 'finance') {
      suggestions.push(
        '检测异常交易模式',
        '分析资金流向和风险',
        '计算用户信用评分',
        '监控合规性指标'
      )
    } else {
      suggestions.push(
        '探索数据分布和模式',
        '识别数据质量问题',
        '分析表间关联关系',
        '优化查询性能'
      )
    }
    
    return suggestions.slice(0, 4) // 限制建议数量
  }

  // 添加到对话历史
  const addToHistory = (role, content, metadata = {}) => {
    const historyItem = {
      id: Date.now(),
      role,
      content,
      metadata,
      timestamp: new Date()
    }
    
    conversationHistory.value.unshift(historyItem)
    
    // 限制历史记录数量
    if (conversationHistory.value.length > 50) {
      conversationHistory.value = conversationHistory.value.slice(0, 50)
    }
  }

  // 清空对话历史
  const clearHistory = () => {
    conversationHistory.value = []
  }

  // 保存配置
  const saveConfiguration = () => {
    const config = {
      provider: currentProvider.value,
      apiKey: apiKey.value, // 保存API密钥
      baseUrl: baseUrl.value,
      model: model.value,
      settings: { ...settings }
    }
    
    localStorage.setItem('qusc-db-ai-config', JSON.stringify(config))
  }

  // 加载配置
  const loadConfiguration = () => {
    try {
      const saved = localStorage.getItem('qusc-db-ai-config')
      if (saved) {
        const config = JSON.parse(saved)
        currentProvider.value = config.provider || 'deepseek'
        
        // 加载API密钥
        if (config.apiKey) {
          apiKey.value = config.apiKey
          isConfigured.value = true
        }
        
        // 确保provider存在
        const provider = providers[currentProvider.value]
        if (provider) {
          baseUrl.value = config.baseUrl || provider.baseUrl
          model.value = config.model || provider.models[0]
        } else {
          // 如果provider不存在，使用默认值
          currentProvider.value = 'deepseek'
          baseUrl.value = config.baseUrl || providers.deepseek.baseUrl
          model.value = config.model || providers.deepseek.models[0]
        }
        
        if (config.settings) {
          Object.assign(settings, config.settings)
        }
      } else {
        // 如果没有保存的配置，设置默认值
        currentProvider.value = 'deepseek'
        baseUrl.value = providers.deepseek.baseUrl
        model.value = providers.deepseek.models[0]
      }
    } catch (error) {
      console.error('加载AI配置失败:', error)
      // 发生错误时设置默认值
      currentProvider.value = 'deepseek'
      baseUrl.value = providers.deepseek.baseUrl
      model.value = providers.deepseek.models[0]
    }
  }

  // 重置配置
  const resetConfiguration = () => {
    isConfigured.value = false
    currentProvider.value = 'deepseek'
    apiKey.value = ''
    baseUrl.value = ''
    model.value = 'deepseek-coder'
    
    localStorage.removeItem('qusc-db-ai-config')
  }

  // 获取可用模型
  const getAvailableModels = () => {
    return providers[currentProvider.value]?.models || []
  }

  // 更新AI配置（为useAIConfig提供支持）
  const updateConfig = async (config) => {
    return await configure(config)
  }

  // 测试AI配置（为useAIConfig提供支持）
  const testConfig = async (config) => {
    try {
      // 临时设置配置进行测试
      const oldProvider = currentProvider.value
      const oldApiKey = apiKey.value
      const oldBaseUrl = baseUrl.value
      const oldModel = model.value
      
      currentProvider.value = config.provider
      apiKey.value = config.apiKey
      baseUrl.value = config.baseUrl || providers[config.provider]?.baseUrl
      model.value = config.model || providers[config.provider]?.models[0]
      
      const result = await testConnection()
      
      // 恢复原配置
      currentProvider.value = oldProvider
      apiKey.value = oldApiKey
      baseUrl.value = oldBaseUrl
      model.value = oldModel
      
      return { success: result, error: result ? null : 'API连接测试失败' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // 清除AI配置（为useAIConfig提供支持）
  const clearConfig = () => {
    resetConfiguration()
  }

  // 将表结构转换为简洁的建表语句
  const convertSchemaToCreateSQL = (schema, focusedTables = null) => {
    if (!schema || !Array.isArray(schema)) return ''
    
    // 如果已经是过滤后的schema（只包含焦点表），显示完整信息
    // 如果是完整schema，进行智能筛选
    let tablesToShow = schema
    if (!focusedTables || focusedTables.length === 0) {
      // 没有焦点表时，限制显示表的数量
      tablesToShow = schema.slice(0, 8)
    }
    // 如果有焦点表且schema已经被过滤，直接使用
    
    const sqlStatements = tablesToShow.map(table => {
      const tableName = table.name || table.table_name
      const columns = table.columns || []
      
      // 对于@引用的表，显示更多信息；对于其他表，显示关键信息
      const isTargetTable = !focusedTables || focusedTables.includes(tableName)
      
      let columnsToShow = columns
      if (!isTargetTable && columns.length > 8) {
        // 非目标表只显示关键列
        const importantColumns = columns.filter(col => 
          col.primary_key || col.name.includes('_id') || !col.nullable
        )
        const otherColumns = columns.filter(col => 
          !col.primary_key && !col.name.includes('_id') && col.nullable
        )
        columnsToShow = [
          ...importantColumns,
          ...otherColumns.slice(0, Math.max(3, 8 - importantColumns.length))
        ]
      }
      
      const columnDefinitions = columnsToShow.map(col => {
        let def = `  ${col.name} ${col.data_type}`
        if (!col.nullable) def += ' NOT NULL'
        if (col.primary_key) def += ' PRIMARY KEY'
        return def
      }).join(',\n')
      
      let sql = `CREATE TABLE ${tableName} (\n${columnDefinitions}`
      if (columns.length > columnsToShow.length) {
        sql += `,\n  -- ... 还有${columns.length - columnsToShow.length}个其他字段`
      }
      sql += '\n);'
      
      return sql
    }).join('\n\n')
    
    if (schema.length > tablesToShow.length) {
      return sqlStatements + `\n\n-- 数据库还包含其他${schema.length - tablesToShow.length}个表`
    }
    
    return sqlStatements
  }

  // 更新AI设置
  const updateSettings = (key, value) => {
    if (key.includes('.')) {
      // 处理嵌套键，如 'ai.maxTokens'
      const keys = key.split('.')
      if (keys[0] === 'ai' && keys[1] in settings) {
        settings[keys[1]] = value
        saveConfiguration() // 保存到本地存储
      }
    } else if (key in settings) {
      settings[key] = value
      saveConfiguration() // 保存到本地存储
    }
  }

  return {
    // 状态
    isConfigured,
    currentProvider,
    apiKey,
    baseUrl,
    model,
    isGenerating,
    conversationHistory,
    history, // 添加history属性
    suggestions, // 添加suggestions属性
    templates,
    selectedTables,
    suggestedRole,
    customRoles, // 添加自定义角色状态
    settings,
    providers,
    
    // 方法
    initialize,
    configure,
    testConnection,
    callAI, // 暴露callAI方法
    generateSQL,
    optimizeSQL,
    explainError,
    explainQuery,
    addToHistory,
    clearHistory,
    saveConfiguration,
    loadConfiguration,
    resetConfiguration,
    getAvailableModels,
    extractSQLFromResponse, // 暴露extractSQLFromResponse方法
    
    // 新增的智能功能
    buildEnhancedContext,
    buildEnhancedContextWithSchema,
    identifyBusinessScenario,
    suggestRoleBasedOnTables,
    generateCustomRole,
    findRelatedTables,
    inferBusinessType,
    updateSelectedTables,
    generateContextualSuggestions,
    
    // 自定义角色管理
    saveCustomRole,
    getCustomRole,
    getAllCustomRoles,
    deleteCustomRole,
    saveCustomRolesToStorage,
    loadCustomRolesFromStorage,
    
    // useAIConfig支持方法
    updateConfig,
    testConfig,
    clearConfig,
    updateSettings, // 导出新的更新设置方法
    convertSchemaToCreateSQL // 导出Schema转换方法
  }
})