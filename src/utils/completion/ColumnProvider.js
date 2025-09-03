/**
 * 字段补全提供器
 * 提供智能的数据库字段补全功能
 */

export class ColumnProvider {
  constructor(connectionStore, tableReference) {
    this.connectionStore = connectionStore
    this.tableReference = tableReference
    this.cache = new Map()
  }
  
  /**
   * 获取字段补全建议
   * @param {Object} context - SQL解析上下文
   * @returns {Array} 补全建议列表
   */
  async getCompletions(context) {
    const { currentWord, tables, aliases, beforeCursor } = context
    const currentSchema = this.connectionStore.getCurrentSchema()
    
    if (!currentSchema || currentSchema.length === 0) {
      return []
    }
    
    const cacheKey = `columns_${this.connectionStore.currentConnection?.id}_${currentWord}_${tables.map(t => t.name).join(',')}`
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }
    
    let suggestions = []
    
    // 解析字段引用模式
    const fieldContext = this.parseFieldContext(currentWord, beforeCursor)
    
    if (fieldContext.hasTablePrefix) {
      // 有表前缀的字段补全 (如: u.username)
      suggestions = await this.getTableSpecificColumns(fieldContext, currentSchema, aliases)
    } else {
      // 无表前缀的字段补全，包含所有相关表的字段
      suggestions = await this.getAllRelevantColumns(context, currentSchema)
    }
    
    const filtered = this.filterColumnSuggestions(suggestions, fieldContext.fieldPrefix)
    
    // 缓存结果
    this.cache.set(cacheKey, filtered)
    setTimeout(() => this.cache.delete(cacheKey), 30000) // 30秒过期
    
    return filtered
  }
  
  /**
   * 解析字段上下文
   */
  parseFieldContext(currentWord, beforeCursor) {
    const dotIndex = currentWord.lastIndexOf('.')
    
    if (dotIndex !== -1) {
      return {
        hasTablePrefix: true,
        tablePrefix: currentWord.slice(0, dotIndex),
        fieldPrefix: currentWord.slice(dotIndex + 1),
        fullContext: currentWord
      }
    }
    
    return {
      hasTablePrefix: false,
      tablePrefix: null,
      fieldPrefix: currentWord,
      fullContext: currentWord
    }
  }
  
  /**
   * 获取特定表的字段
   */
  async getTableSpecificColumns(fieldContext, currentSchema, aliases) {
    const { tablePrefix, fieldPrefix } = fieldContext
    const suggestions = []
    
    // 查找目标表
    let targetTableName = tablePrefix.toLowerCase()
    
    // 如果是别名，转换为实际表名
    if (aliases.has(targetTableName)) {
      targetTableName = aliases.get(targetTableName)
    }
    
    // 查找表结构
    const targetTable = currentSchema.find(table => 
      (table.name || table.table_name || '').toLowerCase() === targetTableName
    )
    
    if (!targetTable || !targetTable.columns) {
      return []
    }
    
    // 生成字段建议
    targetTable.columns.forEach(column => {
      const columnName = column.name || column.column_name
      if (!columnName) return
      
      suggestions.push({
        label: columnName,
        type: 'column',
        insertText: columnName,
        info: this.generateColumnInfo(column),
        detail: this.generateColumnDetail(column, targetTable),
        documentation: this.generateColumnDocumentation(column, targetTable),
        boost: this.calculateColumnBoost(column, fieldPrefix, true),
        iconClass: this.getColumnIcon(column),
        metadata: {
          tableName: targetTable.name || targetTable.table_name,
          dataType: column.data_type,
          nullable: column.nullable,
          defaultValue: column.default_value,
          isPrimaryKey: column.primary_key,
          isForeignKey: column.foreign_key,
          isUnique: column.unique,
          isIndexed: column.indexed
        }
      })
    })
    
    return suggestions
  }
  
  /**
   * 获取所有相关表的字段
   */
  async getAllRelevantColumns(context, currentSchema) {
    const { tables, currentWord } = context
    const suggestions = []
    
    // 如果没有明确的表引用，使用所有表
    const relevantTables = tables.length > 0 
      ? currentSchema.filter(table => 
          tables.some(t => 
            (table.name || table.table_name || '').toLowerCase() === t.name.toLowerCase()
          )
        )
      : currentSchema.slice(0, 3) // 限制为前3个表以避免过多建议
    
    relevantTables.forEach(table => {
      if (!table.columns) return
      
      table.columns.forEach(column => {
        const columnName = column.name || column.column_name
        if (!columnName) return
        
        // 决定插入文本格式
        const needsTablePrefix = tables.length > 1
        const tableAlias = this.findTableAlias(table, tables)
        const insertText = needsTablePrefix 
          ? `${tableAlias || table.name || table.table_name}.${columnName}`
          : columnName
        
        suggestions.push({
          label: columnName,
          type: 'column',
          insertText: insertText,
          info: this.generateColumnInfo(column),
          detail: this.generateColumnDetail(column, table),
          documentation: this.generateColumnDocumentation(column, table),
          boost: this.calculateColumnBoost(column, currentWord, false),
          iconClass: this.getColumnIcon(column),
          metadata: {
            tableName: table.name || table.table_name,
            tableAlias: tableAlias,
            dataType: column.data_type,
            nullable: column.nullable,
            defaultValue: column.default_value,
            isPrimaryKey: column.primary_key,
            isForeignKey: column.foreign_key
          }
        })
      })
    })
    
    return suggestions
  }
  
  /**
   * 查找表的别名
   */
  findTableAlias(table, tables) {
    const tableName = table.name || table.table_name
    const tableRef = tables.find(t => 
      t.name.toLowerCase() === tableName.toLowerCase()
    )
    return tableRef?.alias || null
  }
  
  /**
   * 生成字段信息
   */
  generateColumnInfo(column) {
    const parts = []
    
    if (column.data_type) {
      parts.push(column.data_type.toUpperCase())
    }
    
    if (column.primary_key) {
      parts.push('PRIMARY KEY')
    } else if (column.unique) {
      parts.push('UNIQUE')
    }
    
    if (column.foreign_key) {
      parts.push('FK')
    }
    
    if (!column.nullable) {
      parts.push('NOT NULL')
    }
    
    return parts.join(' • ')
  }
  
  /**
   * 生成字段详细信息
   */
  generateColumnDetail(column, table) {
    if (column.comment) {
      return column.comment
    }
    
    const details = []
    
    // 基于字段名推断用途
    const columnName = (column.name || column.column_name || '').toLowerCase()
    
    if (columnName.includes('id') && column.primary_key) {
      details.push('主键标识符')
    } else if (columnName.includes('id')) {
      details.push('标识符字段')
    } else if (columnName.includes('name') || columnName.includes('title')) {
      details.push('名称字段')
    } else if (columnName.includes('email')) {
      details.push('邮箱地址')
    } else if (columnName.includes('phone') || columnName.includes('tel')) {
      details.push('电话号码')
    } else if (columnName.includes('created') || columnName.includes('updated')) {
      details.push('时间戳字段')
    } else if (columnName.includes('status') || columnName.includes('state')) {
      details.push('状态字段')
    } else if (columnName.includes('count') || columnName.includes('total')) {
      details.push('计数字段')
    } else {
      details.push(`${table.name || table.table_name}表字段`)
    }
    
    return details.join(' • ')
  }
  
  /**
   * 生成字段文档
   */
  generateColumnDocumentation(column, table) {
    const docs = []
    
    docs.push(`**表**: ${table.name || table.table_name}`)
    docs.push(`**字段**: ${column.name || column.column_name}`)
    
    if (column.data_type) {
      let typeInfo = column.data_type
      if (column.character_maximum_length) {
        typeInfo += `(${column.character_maximum_length})`
      }
      docs.push(`**类型**: ${typeInfo}`)
    }
    
    if (column.comment) {
      docs.push(`**描述**: ${column.comment}`)
    }
    
    if (column.default_value !== null && column.default_value !== undefined) {
      docs.push(`**默认值**: ${column.default_value}`)
    }
    
    const constraints = []
    if (column.primary_key) constraints.push('主键')
    if (column.foreign_key) constraints.push('外键')
    if (column.unique) constraints.push('唯一')
    if (!column.nullable) constraints.push('非空')
    if (column.indexed) constraints.push('索引')
    
    if (constraints.length > 0) {
      docs.push(`**约束**: ${constraints.join(', ')}`)
    }
    
    return docs.join('\\n\\n')
  }
  
  /**
   * 计算字段补全权重
   */
  calculateColumnBoost(column, query, hasTablePrefix) {
    let boost = 10 // 基础权重
    const columnName = (column.name || column.column_name || '').toLowerCase()
    const queryLower = query.toLowerCase()
    
    // 查询匹配度
    if (columnName === queryLower) {
      boost += 50
    } else if (columnName.startsWith(queryLower)) {
      boost += 30
    } else if (columnName.includes(queryLower)) {
      boost += 15
    }
    
    // 字段特征加权
    if (column.primary_key) {
      boost += 20 // 主键最重要
    }
    
    if (column.foreign_key) {
      boost += 15 // 外键很重要
    }
    
    if (column.unique) {
      boost += 10 // 唯一字段重要
    }
    
    if (column.indexed) {
      boost += 5 // 有索引的字段重要
    }
    
    // 常用字段名加权
    if (columnName.includes('id')) {
      boost += 8
    } else if (columnName.includes('name')) {
      boost += 6
    } else if (columnName.includes('title')) {
      boost += 5
    }
    
    // 如果有表前缀，优先级更高（更精确的查询）
    if (hasTablePrefix) {
      boost += 10
    }
    
    // 非空字段稍微重要一些
    if (!column.nullable) {
      boost += 3
    }
    
    return boost
  }
  
  /**
   * 获取字段图标
   */
  getColumnIcon(column) {
    if (column.primary_key) return 'icon-key'
    if (column.foreign_key) return 'icon-foreign-key'
    
    const dataType = (column.data_type || '').toLowerCase()
    const columnName = (column.name || column.column_name || '').toLowerCase()
    
    // 根据数据类型
    if (dataType.includes('int') || dataType.includes('decimal') || dataType.includes('float') || dataType.includes('double')) {
      return 'icon-number'
    }
    if (dataType.includes('varchar') || dataType.includes('text') || dataType.includes('char')) {
      return 'icon-text'
    }
    if (dataType.includes('date') || dataType.includes('time') || dataType.includes('timestamp')) {
      return 'icon-date'
    }
    if (dataType.includes('bool')) {
      return 'icon-boolean'
    }
    if (dataType.includes('json')) {
      return 'icon-json'
    }
    if (dataType.includes('blob') || dataType.includes('binary')) {
      return 'icon-binary'
    }
    
    // 根据字段名
    if (columnName.includes('email')) return 'icon-email'
    if (columnName.includes('phone') || columnName.includes('tel')) return 'icon-phone'
    if (columnName.includes('url') || columnName.includes('link')) return 'icon-link'
    if (columnName.includes('image') || columnName.includes('photo') || columnName.includes('avatar')) return 'icon-image'
    if (columnName.includes('status') || columnName.includes('state')) return 'icon-status'
    
    return 'icon-column'
  }
  
  /**
   * 过滤字段建议
   */
  filterColumnSuggestions(suggestions, query) {
    if (!query) {
      return suggestions.sort((a, b) => b.boost - a.boost).slice(0, 20)
    }
    
    const queryLower = query.toLowerCase()
    
    return suggestions
      .filter(suggestion => 
        suggestion.label.toLowerCase().includes(queryLower)
      )
      .sort((a, b) => {
        // 精确匹配优先
        const aExact = a.label.toLowerCase() === queryLower
        const bExact = b.label.toLowerCase() === queryLower
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        // 前缀匹配优先
        const aPrefix = a.label.toLowerCase().startsWith(queryLower)
        const bPrefix = b.label.toLowerCase().startsWith(queryLower)
        if (aPrefix && !bPrefix) return -1
        if (!aPrefix && bPrefix) return 1
        
        // 按权重排序
        return b.boost - a.boost
      })
      .slice(0, 20) // 限制结果数量
  }
  
  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear()
  }
}