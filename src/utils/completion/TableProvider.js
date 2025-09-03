/**
 * 表名补全提供器
 * 提供智能的数据库表名补全功能
 */

export class TableProvider {
  constructor(connectionStore, tableReference) {
    this.connectionStore = connectionStore
    this.tableReference = tableReference
    this.cache = new Map()
  }
  
  /**
   * 获取表名补全建议
   * @param {Object} context - SQL解析上下文
   * @returns {Array} 补全建议列表
   */
  async getCompletions(context) {
    const currentSchema = this.connectionStore.getCurrentSchema()
    if (!currentSchema || currentSchema.length === 0) {
      return []
    }
    
    const { currentWord } = context
    const cacheKey = `tables_${this.connectionStore.currentConnection?.id}_${currentWord}`
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }
    
    const suggestions = currentSchema.map(table => {
      const tableName = table.name || table.table_name
      const columnCount = table.columns?.length || 0
      const hasTimeColumns = this.hasTimeColumns(table)
      const hasPrimaryKey = this.hasPrimaryKey(table)
      
      return {
        label: tableName,
        type: 'table',
        insertText: tableName,
        info: this.generateTableInfo(table),
        detail: this.generateTableDetail(table),
        documentation: this.generateTableDocumentation(table),
        boost: this.calculateTableBoost(table, currentWord),
        iconClass: this.getTableIcon(table),
        metadata: {
          columnCount,
          hasTimeColumns,
          hasPrimaryKey,
          tableType: table.table_type || 'BASE TABLE',
          engine: table.engine,
          collation: table.collation
        }
      }
    })
    
    const filtered = this.filterSuggestions(suggestions, currentWord)
    
    // 缓存结果（1分钟过期）
    this.cache.set(cacheKey, filtered)
    setTimeout(() => this.cache.delete(cacheKey), 60000)
    
    return filtered
  }
  
  /**
   * 生成表信息简述
   */
  generateTableInfo(table) {
    const columnCount = table.columns?.length || 0
    const tableType = table.table_type || 'TABLE'
    return `${tableType} • ${columnCount}个字段`
  }
  
  /**
   * 生成表详细信息
   */
  generateTableDetail(table) {
    if (table.comment) {
      return table.comment
    }
    
    const details = []
    
    // 分析表结构特征
    if (table.columns) {
      const primaryKeys = table.columns.filter(col => col.primary_key)
      if (primaryKeys.length > 0) {
        details.push(`主键: ${primaryKeys.map(pk => pk.name).join(', ')}`)
      }
      
      const foreignKeys = table.columns.filter(col => col.foreign_key)
      if (foreignKeys.length > 0) {
        details.push(`${foreignKeys.length}个外键`)
      }
      
      const indexes = table.indexes || []
      if (indexes.length > 0) {
        details.push(`${indexes.length}个索引`)
      }
    }
    
    return details.length > 0 ? details.join(' • ') : '数据表'
  }
  
  /**
   * 生成表文档信息
   */
  generateTableDocumentation(table) {
    const docs = []
    
    if (table.comment) {
      docs.push(`**描述**: ${table.comment}`)
    }
    
    if (table.columns && table.columns.length > 0) {
      docs.push(`**字段数量**: ${table.columns.length}`)
      
      // 列出主要字段
      const importantColumns = table.columns
        .filter(col => col.primary_key || col.foreign_key || col.name.includes('id'))
        .slice(0, 5)
      
      if (importantColumns.length > 0) {
        docs.push(`**主要字段**: ${importantColumns.map(col => `\`${col.name}\``).join(', ')}`)
      }
    }
    
    if (table.engine) {
      docs.push(`**引擎**: ${table.engine}`)
    }
    
    if (table.collation) {
      docs.push(`**字符集**: ${table.collation}`)
    }
    
    // 估算记录数
    if (table.table_rows !== undefined) {
      docs.push(`**预估行数**: ${this.formatNumber(table.table_rows)}`)
    }
    
    return docs.join('\\n\\n')
  }
  
  /**
   * 计算表名补全的权重
   */
  calculateTableBoost(table, query) {
    let boost = 10 // 基础权重
    const tableName = (table.name || table.table_name || '').toLowerCase()
    const queryLower = query.toLowerCase()
    
    // 精确匹配
    if (tableName === queryLower) {
      boost += 50
    }
    // 前缀匹配
    else if (tableName.startsWith(queryLower)) {
      boost += 30
    }
    // 包含匹配
    else if (tableName.includes(queryLower)) {
      boost += 15
    }
    
    // 表特征加权
    if (table.columns) {
      // 字段较多的表可能更重要
      boost += Math.min(table.columns.length / 2, 10)
      
      // 有主键的表更重要
      if (table.columns.some(col => col.primary_key)) {
        boost += 5
      }
      
      // 有外键的表可能是关联表，稍微降低权重
      const foreignKeyCount = table.columns.filter(col => col.foreign_key).length
      if (foreignKeyCount > 2) {
        boost -= 2
      }
    }
    
    // 表类型加权
    if (table.table_type === 'BASE TABLE') {
      boost += 5
    } else if (table.table_type === 'VIEW') {
      boost += 3
    }
    
    return boost
  }
  
  /**
   * 获取表图标
   */
  getTableIcon(table) {
    if (table.table_type === 'VIEW') return 'icon-view'
    if (table.table_type === 'SYSTEM TABLE') return 'icon-system-table'
    
    // 根据表名特征推断图标
    const tableName = (table.name || table.table_name || '').toLowerCase()
    
    if (tableName.includes('user') || tableName.includes('account')) return 'icon-user-table'
    if (tableName.includes('order') || tableName.includes('transaction')) return 'icon-order-table'
    if (tableName.includes('product') || tableName.includes('item')) return 'icon-product-table'
    if (tableName.includes('log') || tableName.includes('audit')) return 'icon-log-table'
    if (tableName.includes('config') || tableName.includes('setting')) return 'icon-config-table'
    
    return 'icon-table'
  }
  
  /**
   * 检查表是否包含时间字段
   */
  hasTimeColumns(table) {
    if (!table.columns) return false
    
    return table.columns.some(col => {
      const colName = (col.name || '').toLowerCase()
      const dataType = (col.data_type || '').toLowerCase()
      
      return colName.includes('time') || 
             colName.includes('date') || 
             colName.includes('created') || 
             colName.includes('updated') ||
             dataType.includes('timestamp') ||
             dataType.includes('datetime') ||
             dataType.includes('date')
    })
  }
  
  /**
   * 检查表是否有主键
   */
  hasPrimaryKey(table) {
    if (!table.columns) return false
    return table.columns.some(col => col.primary_key)
  }
  
  /**
   * 过滤和排序建议
   */
  filterSuggestions(suggestions, query) {
    if (!query) {
      return suggestions.sort((a, b) => b.boost - a.boost)
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
      .slice(0, 15) // 限制结果数量
  }
  
  /**
   * 格式化数字
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }
  
  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear()
  }
}