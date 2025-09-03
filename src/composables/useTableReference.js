import { ref, computed, watch } from 'vue'
import { useConnectionStore } from '@/stores/connection.js'

export function useTableReference() {
  const connectionStore = useConnectionStore()
  
  // 状态
  const currentInput = ref('')
  const currentTableReferences = ref([])
  const tableSuggestions = ref([])
  const showSuggestions = ref(false)
  const isLoadingContext = ref(false)
  const selectedIndex = ref(-1) // 键盘选择的索引
  
  // 表引用解析
  const parseTableReferences = (input) => {
    const tablePattern = /@([a-zA-Z_][a-zA-Z0-9_]*)/g
    const matches = []
    let match

    while ((match = tablePattern.exec(input)) !== null) {
      matches.push({
        fullMatch: match[0],        // @users
        tableName: match[1],        // users
        startIndex: match.index,    // 位置信息
        endIndex: match.index + match[0].length
      })
    }

    return matches
  }

  // 智能表名补全
  const getTableSuggestions = async (partial) => {
    const currentSchema = connectionStore.getCurrentSchema()
    if (!currentSchema || currentSchema.length === 0) {
      return []
    }

    const partialLower = partial.toLowerCase()
    const filtered = currentSchema.filter(table => {
      const tableName = table.name || table.table_name || ''
      return tableName.toLowerCase().includes(partialLower)
    })

    return filtered.map(table => {
      const tableName = table.name || table.table_name || ''
      const columnCount = table.columns?.length || 0
      
      return {
        name: tableName,
        displayName: `@${tableName}`,
        recordCount: table.recordCount || 'Unknown',
        description: table.comment || generateTableDescription(table),
        columns: columnCount,
        structure: table
      }
    }).slice(0, 10) // 限制建议数量
  }

  // 自动生成表描述
  const generateTableDescription = (table) => {
    const columnCount = table.columns?.length || 0
    let desc = `${columnCount}个字段的数据表`

    if (table.columns) {
      const hasTimeColumn = table.columns.some(col => 
        col.name && (
          col.name.includes('time') || 
          col.name.includes('date') || 
          col.name.includes('created') || 
          col.name.includes('updated')
        )
      )
      
      const hasPrimaryKey = table.columns.some(col => col.primary_key)
      
      if (hasTimeColumn) desc += '，包含时间字段'
      if (hasPrimaryKey) desc += '，有主键'
    }

    return desc
  }

  // 处理输入变化
  const handleInputChange = async (input) => {
    currentInput.value = input
    
    // 解析@表名引用
    const references = parseTableReferences(input)
    const tableNames = references.map(ref => ref.tableName)
    currentTableReferences.value = tableNames

    // 检查是否需要显示表名建议
    const lastAtIndex = input.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      const afterAt = input.substring(lastAtIndex + 1)
      
      // 检查@后面是否是有效的表名字符或为空（刚输入@时）
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(afterAt) || afterAt === '' || /^[a-zA-Z0-9_]*$/.test(afterAt)) {
        try {
          const suggestions = await getTableSuggestions(afterAt)
          tableSuggestions.value = suggestions
          showSuggestions.value = suggestions.length > 0
          selectedIndex.value = -1 // 重置选择索引
          return
        } catch (error) {
          console.warn('获取表名建议失败:', error)
        }
      }
    }

    showSuggestions.value = false
    tableSuggestions.value = []
  }

  // 选择表名建议
  const selectTableSuggestion = (suggestion, inputElement) => {
    const lastAtIndex = currentInput.value.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      const beforeAt = currentInput.value.substring(0, lastAtIndex)
      // 简化逻辑：直接从@符号位置开始替换
      const afterAt = currentInput.value.substring(lastAtIndex + 1)
      // 找到@后面第一个空格或结束位置
      const nextSpaceIndex = afterAt.search(/[\s\n\r]|$/)
      const afterSelection = nextSpaceIndex >= 0 ? afterAt.substring(nextSpaceIndex) : ''
      
      // 构建新的输入内容
      const newValue = beforeAt + suggestion.displayName + ' ' + afterSelection.trimStart()
      
      // 更新内部状态
      currentInput.value = newValue
      
      console.log('选择表名:', suggestion.name)
      console.log('更新输入:', newValue)
      
      // 返回新值给调用者更新Vue响应式变量
      return newValue
    }

    showSuggestions.value = false
    tableSuggestions.value = []
    
    return currentInput.value
  }

  // 键盘导航方法
  const navigateUp = () => {
    if (tableSuggestions.value.length === 0) return
    selectedIndex.value = selectedIndex.value <= 0 
      ? tableSuggestions.value.length - 1 
      : selectedIndex.value - 1
  }

  const navigateDown = () => {
    if (tableSuggestions.value.length === 0) return
    selectedIndex.value = selectedIndex.value >= tableSuggestions.value.length - 1 
      ? 0 
      : selectedIndex.value + 1
  }

  const selectCurrentSuggestion = () => {
    if (selectedIndex.value >= 0 && selectedIndex.value < tableSuggestions.value.length) {
      const suggestion = tableSuggestions.value[selectedIndex.value]
      return selectTableSuggestion(suggestion)
    }
    return null
  }

  // 表引用上下文增强（简化版，不依赖MCP）
  const enhanceContextWithReferences = async (input, connectionId = null) => {
    const references = parseTableReferences(input)
    if (references.length === 0) {
      return {
        hasReferences: false,
        references: [],
        tableNames: [],
        context: null,
        inputWithReferences: input
      }
    }

    const tableNames = references.map(ref => ref.tableName)
    const currentConnectionId = connectionId || connectionStore.currentConnection?.id

    if (!currentConnectionId) {
      throw new Error('没有可用的数据库连接')
    }

    isLoadingContext.value = true

    try {
      console.log('解析表引用上下文:', { tableNames, connectionId: currentConnectionId })
      
      // 获取基础的表结构信息
      const tablesInfo = tableNames.map(tableName => {
        const preview = getTablePreview(tableName)
        return {
          name: tableName,
          preview
        }
      }).filter(item => item.preview !== null)
      
      return {
        hasReferences: true,
        references,
        tableNames,
        context: tablesInfo, // 返回基础表信息而不是MCP增强上下文
        inputWithReferences: input,
        connectionId: currentConnectionId
      }
    } catch (error) {
      console.error('解析表引用上下文失败:', error)
      throw error
    } finally {
      isLoadingContext.value = false
    }
  }

  // 验证表引用
  const validateTableReferences = (input) => {
    const references = parseTableReferences(input)
    const currentSchema = connectionStore.getCurrentSchema()
    
    if (!currentSchema || currentSchema.length === 0) {
      return {
        valid: references.length === 0,
        errors: references.length > 0 ? ['没有可用的数据库连接'] : [],
        references
      }
    }

    const schemaTableNames = currentSchema.map(table => 
      (table.name || table.table_name || '').toLowerCase()
    )

    const errors = []
    const validReferences = []
    
    for (const ref of references) {
      const tableName = ref.tableName.toLowerCase()
      if (schemaTableNames.includes(tableName)) {
        validReferences.push(ref)
      } else {
        errors.push(`表 '${ref.tableName}' 不存在`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      references: validReferences,
      invalidReferences: references.filter(ref => 
        !schemaTableNames.includes(ref.tableName.toLowerCase())
      )
    }
  }

  // 获取表预览信息
  const getTablePreview = (tableName) => {
    const currentSchema = connectionStore.getCurrentSchema()
    if (!currentSchema) return null

    const table = currentSchema.find(t => 
      (t.name || t.table_name || '') === tableName
    )

    if (!table) return null

    return {
      name: table.name || table.table_name,
      columns: table.columns || [],
      comment: table.comment || '',
      columnCount: table.columns?.length || 0,
      description: generateTableDescription(table)
    }
  }

  // 计算属性
  const hasValidReferences = computed(() => {
    if (currentTableReferences.value.length === 0) return false
    const validation = validateTableReferences(currentInput.value)
    return validation.valid
  })

  const referencedTablesInfo = computed(() => {
    return currentTableReferences.value.map(tableName => ({
      name: tableName,
      preview: getTablePreview(tableName)
    }))
  })

  return {
    // 状态
    currentInput,
    currentTableReferences,
    tableSuggestions,
    showSuggestions,
    isLoadingContext,
    selectedIndex,

    // 计算属性
    hasValidReferences,
    referencedTablesInfo,

    // 方法
    parseTableReferences,
    getTableSuggestions,
    handleInputChange,
    selectTableSuggestion,
    enhanceContextWithReferences,
    validateTableReferences,
    getTablePreview,
    generateTableDescription,
    
    // 键盘导航方法
    navigateUp,
    navigateDown,
    selectCurrentSuggestion
  }
}