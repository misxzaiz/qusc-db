import { computed } from 'vue'

/**
 * 编辑策略管理 Composable
 * 根据数据类型和字段特征智能选择编辑方式
 */
export function useEditingStrategy() {
  
  /**
   * 判断字段是否应该使用内联编辑
   * @param {Object} column - 列元数据
   * @param {Object} constraints - 字段约束
   * @returns {boolean} 是否使用内联编辑
   */
  const shouldUseInlineEdit = (column, constraints = {}) => {
    if (!column) return false
    
    const dataType = (column.data_type || '').toLowerCase()
    const maxLength = column.max_length || 
                     column.character_maximum_length || 
                     constraints.max_length
    
    // 复杂类型必须使用浮窗编辑
    const complexTypes = [
      'json',
      'longtext',
      'mediumtext',
      'blob', 
      'mediumblob',
      'longblob',
      'binary',
      'varbinary',
      'geometry',
      'point',
      'linestring',
      'polygon'
    ]
    
    // 检查是否是复杂数据类型
    if (complexTypes.some(type => dataType.includes(type))) {
      console.log(`🔧 字段 ${column.name} 类型 ${dataType} 使用浮窗编辑`)
      return false
    }
    
    // 长文本字段使用浮窗编辑
    if (maxLength && maxLength > 100) {
      console.log(`🔧 字段 ${column.name} 长度 ${maxLength} > 100，使用浮窗编辑`)
      return false
    }
    
    // TEXT 类型默认使用浮窗编辑（除非明确标记为短文本）
    if (dataType === 'text' && (!maxLength || maxLength > 255)) {
      console.log(`🔧 字段 ${column.name} TEXT类型使用浮窗编辑`)
      return false
    }
    
    // 其他情况使用内联编辑
    console.log(`✅ 字段 ${column.name} 类型 ${dataType} 使用内联编辑`)
    return true
  }
  
  /**
   * 获取编辑策略信息
   * @param {Object} column - 列元数据
   * @param {Object} constraints - 字段约束
   * @returns {Object} 编辑策略信息
   */
  const getEditingStrategy = (column, constraints = {}) => {
    const isInline = shouldUseInlineEdit(column, constraints)
    const dataType = (column.data_type || '').toLowerCase()
    
    return {
      mode: isInline ? 'inline' : 'modal',
      dataType,
      reason: getStrategyReason(column, constraints, isInline),
      component: isInline ? getInlineEditorType(dataType) : 'CellEditor',
      features: getEditorFeatures(dataType, isInline)
    }
  }
  
  /**
   * 获取选择策略的原因（用于调试和用户提示）
   */
  const getStrategyReason = (column, constraints, isInline) => {
    const dataType = (column.data_type || '').toLowerCase()
    const maxLength = column.max_length || 
                     column.character_maximum_length || 
                     constraints.max_length
    
    if (!isInline) {
      const complexTypes = ['json', 'longtext', 'blob', 'binary']
      if (complexTypes.some(type => dataType.includes(type))) {
        return `复杂数据类型 ${dataType}`
      }
      if (maxLength && maxLength > 100) {
        return `字段长度 ${maxLength} 超过100`
      }
      if (dataType === 'text') {
        return '长文本类型'
      }
      return '需要详细编辑界面'
    }
    
    return `简单类型 ${dataType}，适合快速编辑`
  }
  
  /**
   * 根据数据类型确定内联编辑器类型
   */
  const getInlineEditorType = (dataType) => {
    // 文本类型
    if (['varchar', 'char', 'tinytext', 'enum', 'set'].includes(dataType)) {
      return 'text'
    }
    
    // 数字类型
    if (['tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint', 
         'decimal', 'numeric', 'float', 'double', 'real'].includes(dataType)) {
      return 'number'
    }
    
    // 日期时间类型
    if (['date', 'datetime', 'timestamp', 'time'].includes(dataType)) {
      return 'datetime'
    }
    
    // 布尔类型
    if (['boolean', 'bool'].includes(dataType)) {
      return 'boolean'
    }
    
    // 年份类型
    if (dataType === 'year') {
      return 'number'
    }
    
    // 默认为文本
    return 'text'
  }
  
  /**
   * 获取编辑器功能特性
   */
  const getEditorFeatures = (dataType, isInline) => {
    const features = {
      validation: true,
      keyboardNav: isInline,
      autoSave: isInline,
      formatters: true,
      constraints: true
    }
    
    if (isInline) {
      features.quickEdit = true
      features.excelLike = true
      features.enterToNext = true
      features.tabToNext = true
    } else {
      features.richEditor = true
      features.preview = true
      features.detailedValidation = true
    }
    
    return features
  }
  
  /**
   * 检查字段是否支持特定的编辑功能
   */
  const supportsFeature = (column, feature) => {
    const strategy = getEditingStrategy(column)
    return strategy.features[feature] || false
  }
  
  /**
   * 获取推荐的编辑方式列表（用于设置界面）
   */
  const getEditingModeOptions = () => {
    return [
      {
        value: 'auto',
        label: '智能选择',
        description: '根据数据类型自动选择最合适的编辑方式'
      },
      {
        value: 'inline',
        label: '内联编辑',
        description: '在表格内直接编辑，类似Excel体验'
      },
      {
        value: 'modal',
        label: '浮窗编辑',
        description: '弹出编辑器窗口，适合复杂数据'
      }
    ]
  }
  
  /**
   * 根据用户设置覆盖策略
   */
  const applyUserPreference = (strategy, userPreference) => {
    if (userPreference === 'auto') {
      return strategy // 使用智能选择
    }
    
    if (userPreference === 'inline' || userPreference === 'modal') {
      return {
        ...strategy,
        mode: userPreference,
        reason: `用户偏好: ${userPreference === 'inline' ? '内联编辑' : '浮窗编辑'}`
      }
    }
    
    return strategy
  }
  
  /**
   * 批量分析多个字段的编辑策略
   */
  const analyzeTableEditingStrategy = (columns, tableSchema = {}) => {
    if (!columns || !Array.isArray(columns)) {
      return { strategies: [], summary: null }
    }
    
    const strategies = columns.map((column, index) => {
      const constraints = getColumnConstraints(column, tableSchema, index)
      return {
        column: column,
        index: index,
        strategy: getEditingStrategy(column, constraints)
      }
    })
    
    // 统计信息
    const summary = {
      totalColumns: columns.length,
      inlineCount: strategies.filter(s => s.strategy.mode === 'inline').length,
      modalCount: strategies.filter(s => s.strategy.mode === 'modal').length,
      dataTypeBreakdown: {}
    }
    
    // 数据类型分布
    strategies.forEach(({ strategy }) => {
      const type = strategy.dataType
      summary.dataTypeBreakdown[type] = (summary.dataTypeBreakdown[type] || 0) + 1
    })
    
    return { strategies, summary }
  }
  
  /**
   * 获取列约束信息（辅助函数）
   */
  const getColumnConstraints = (column, tableSchema, index) => {
    // 如果有表结构信息，使用表结构中的约束
    if (tableSchema?.columns?.[index]) {
      const schemaColumn = tableSchema.columns[index]
      return {
        not_null: schemaColumn.not_null || schemaColumn.is_nullable === 'NO',
        max_length: schemaColumn.max_length || schemaColumn.character_maximum_length,
        primary_key: schemaColumn.primary_key || schemaColumn.is_primary_key,
        unique: schemaColumn.unique || schemaColumn.is_unique,
        auto_increment: schemaColumn.auto_increment || schemaColumn.is_auto_increment,
        default_value: schemaColumn.default_value || schemaColumn.column_default,
        numeric_precision: schemaColumn.numeric_precision,
        numeric_scale: schemaColumn.numeric_scale,
        enum_values: schemaColumn.enum_values
      }
    }
    
    // 否则尝试从列信息中提取
    return {
      not_null: column.not_null || column.is_nullable === 'NO',
      max_length: column.max_length || column.character_maximum_length,
      primary_key: column.primary_key || column.is_primary_key,
      unique: column.unique || column.is_unique,
      auto_increment: column.auto_increment || column.is_auto_increment,
      default_value: column.default_value || column.column_default,
      numeric_precision: column.numeric_precision,
      numeric_scale: column.numeric_scale,
      enum_values: column.enum_values
    }
  }
  
  return {
    shouldUseInlineEdit,
    getEditingStrategy,
    getInlineEditorType,
    supportsFeature,
    getEditingModeOptions,
    applyUserPreference,
    analyzeTableEditingStrategy
  }
}