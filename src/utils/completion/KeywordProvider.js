/**
 * 关键字补全提供器
 * 提供SQL关键字的智能补全
 */

export class KeywordProvider {
  constructor() {
    this.cache = new Map()
    this.initializeKeywords()
  }
  
  /**
   * 初始化SQL关键字数据
   */
  initializeKeywords() {
    this.keywords = {
      // 基础语句关键字
      statements: [
        { label: 'SELECT', info: '查询语句', detail: '从表中选择数据', boost: 25 },
        { label: 'INSERT', info: '插入语句', detail: '向表中插入新记录', boost: 20 },
        { label: 'UPDATE', info: '更新语句', detail: '修改表中的记录', boost: 20 },
        { label: 'DELETE', info: '删除语句', detail: '从表中删除记录', boost: 18 },
        { label: 'CREATE', info: '创建语句', detail: '创建数据库对象', boost: 15 },
        { label: 'ALTER', info: '修改语句', detail: '修改表结构', boost: 12 },
        { label: 'DROP', info: '删除语句', detail: '删除数据库对象', boost: 10 }
      ],
      
      // 子句关键字
      clauses: [
        { label: 'FROM', info: 'FROM子句', detail: '指定查询的数据表', boost: 30 },
        { label: 'WHERE', info: 'WHERE子句', detail: '指定查询条件', boost: 30 },
        { label: 'JOIN', info: 'JOIN子句', detail: '连接多个表', boost: 25 },
        { label: 'INNER JOIN', info: '内连接', detail: '返回两表的交集', boost: 25 },
        { label: 'LEFT JOIN', info: '左连接', detail: '返回左表所有记录', boost: 25 },
        { label: 'RIGHT JOIN', info: '右连接', detail: '返回右表所有记录', boost: 20 },
        { label: 'FULL JOIN', info: '全连接', detail: '返回两表的并集', boost: 15 },
        { label: 'GROUP BY', info: 'GROUP BY子句', detail: '按字段分组', boost: 20 },
        { label: 'ORDER BY', info: 'ORDER BY子句', detail: '按字段排序', boost: 20 },
        { label: 'HAVING', info: 'HAVING子句', detail: '分组后过滤条件', boost: 15 },
        { label: 'LIMIT', info: 'LIMIT子句', detail: '限制返回记录数', boost: 18 },
        { label: 'OFFSET', info: 'OFFSET子句', detail: '跳过指定记录数', boost: 15 }
      ],
      
      // 操作符
      operators: [
        { label: 'AND', info: '逻辑与', detail: '连接多个条件（都必须为真）', boost: 25 },
        { label: 'OR', info: '逻辑或', detail: '连接多个条件（任一为真即可）', boost: 25 },
        { label: 'NOT', info: '逻辑非', detail: '否定条件', boost: 20 },
        { label: 'LIKE', info: '模糊匹配', detail: '使用通配符进行模糊查询', boost: 22 },
        { label: 'IN', info: '包含操作符', detail: '检查值是否在指定列表中', boost: 22 },
        { label: 'NOT IN', info: '不包含操作符', detail: '检查值是否不在指定列表中', boost: 18 },
        { label: 'EXISTS', info: '存在操作符', detail: '检查子查询是否返回结果', boost: 15 },
        { label: 'NOT EXISTS', info: '不存在操作符', detail: '检查子查询是否不返回结果', boost: 15 },
        { label: 'BETWEEN', info: '范围操作符', detail: '检查值是否在指定范围内', boost: 20 },
        { label: 'IS NULL', info: '空值检查', detail: '检查字段是否为空', boost: 20 },
        { label: 'IS NOT NULL', info: '非空检查', detail: '检查字段是否不为空', boost: 20 }
      ],
      
      // 聚合函数
      aggregates: [
        { label: 'COUNT', info: '计数函数', detail: '统计记录数量', boost: 25, insertText: 'COUNT(*)' },
        { label: 'SUM', info: '求和函数', detail: '计算数值字段的总和', boost: 20, insertText: 'SUM()' },
        { label: 'AVG', info: '平均值函数', detail: '计算数值字段的平均值', boost: 20, insertText: 'AVG()' },
        { label: 'MAX', info: '最大值函数', detail: '获取字段的最大值', boost: 20, insertText: 'MAX()' },
        { label: 'MIN', info: '最小值函数', detail: '获取字段的最小值', boost: 20, insertText: 'MIN()' }
      ],
      
      // 字符串函数
      stringFunctions: [
        { label: 'CONCAT', info: '字符串连接', detail: '连接多个字符串', boost: 18, insertText: 'CONCAT()' },
        { label: 'SUBSTRING', info: '子字符串', detail: '提取字符串的一部分', boost: 15, insertText: 'SUBSTRING()' },
        { label: 'LENGTH', info: '字符串长度', detail: '获取字符串的长度', boost: 15, insertText: 'LENGTH()' },
        { label: 'UPPER', info: '转大写', detail: '将字符串转换为大写', boost: 12, insertText: 'UPPER()' },
        { label: 'LOWER', info: '转小写', detail: '将字符串转换为小写', boost: 12, insertText: 'LOWER()' },
        { label: 'TRIM', info: '去除空格', detail: '去除字符串首尾空格', boost: 15, insertText: 'TRIM()' }
      ],
      
      // 日期函数
      dateFunctions: [
        { label: 'NOW', info: '当前时间', detail: '获取当前日期和时间', boost: 20, insertText: 'NOW()' },
        { label: 'CURDATE', info: '当前日期', detail: '获取当前日期', boost: 18, insertText: 'CURDATE()' },
        { label: 'CURTIME', info: '当前时间', detail: '获取当前时间', boost: 15, insertText: 'CURTIME()' },
        { label: 'DATE', info: '日期提取', detail: '从日期时间中提取日期部分', boost: 15, insertText: 'DATE()' },
        { label: 'YEAR', info: '年份提取', detail: '从日期中提取年份', boost: 12, insertText: 'YEAR()' },
        { label: 'MONTH', info: '月份提取', detail: '从日期中提取月份', boost: 12, insertText: 'MONTH()' },
        { label: 'DAY', info: '日期提取', detail: '从日期中提取日', boost: 12, insertText: 'DAY()' }
      ],
      
      // 其他关键字
      misc: [
        { label: 'DISTINCT', info: '去重', detail: '去除重复记录', boost: 22 },
        { label: 'UNION', info: '联合', detail: '合并两个查询结果', boost: 18 },
        { label: 'UNION ALL', info: '全联合', detail: '合并两个查询结果（包含重复）', boost: 15 },
        { label: 'AS', info: '别名', detail: '为表或字段设置别名', boost: 25 },
        { label: 'ON', info: '连接条件', detail: '指定表连接的条件', boost: 20 },
        { label: 'USING', info: '使用字段连接', detail: '使用相同字段名进行连接', boost: 12 },
        { label: 'ASC', info: '升序', detail: '按升序排列', boost: 15 },
        { label: 'DESC', info: '降序', detail: '按降序排列', boost: 15 },
        { label: 'NULL', info: '空值', detail: '表示空值', boost: 15 },
        { label: 'TRUE', info: '真值', detail: '布尔真值', boost: 12 },
        { label: 'FALSE', info: '假值', detail: '布尔假值', boost: 12 }
      ]
    }
    
    // 合并所有关键字
    this.allKeywords = [
      ...this.keywords.statements,
      ...this.keywords.clauses,
      ...this.keywords.operators,
      ...this.keywords.aggregates,
      ...this.keywords.stringFunctions,
      ...this.keywords.dateFunctions,
      ...this.keywords.misc
    ]
  }
  
  /**
   * 获取关键字补全建议
   * @param {Object} context - SQL解析上下文
   * @returns {Array} 补全建议列表
   */
  getCompletions(context) {
    const { currentWord, currentClause, statementType, beforeCursor } = context
    const cacheKey = `keywords_${currentWord}_${currentClause}_${statementType}`
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }
    
    // 根据上下文获取相关关键字
    let relevantKeywords = this.getContextualKeywords(context)
    
    // 过滤和排序
    const suggestions = this.filterKeywords(relevantKeywords, currentWord)
      .map(keyword => ({
        label: keyword.label,
        type: 'keyword',
        insertText: keyword.insertText || keyword.label,
        info: keyword.info,
        detail: keyword.detail,
        documentation: this.generateKeywordDocumentation(keyword, context),
        boost: this.calculateKeywordBoost(keyword, currentWord, context),
        iconClass: this.getKeywordIcon(keyword)
      }))
    
    // 缓存结果
    this.cache.set(cacheKey, suggestions)
    setTimeout(() => this.cache.delete(cacheKey), 60000) // 1分钟过期
    
    return suggestions
  }
  
  /**
   * 根据上下文获取相关关键字
   */
  getContextualKeywords(context) {
    const { currentClause, statementType, beforeCursor } = context
    let keywords = []
    
    switch (currentClause) {
      case 'SELECT':
        keywords = [
          ...this.keywords.aggregates,
          ...this.keywords.stringFunctions,
          ...this.keywords.dateFunctions,
          ...this.keywords.misc.filter(k => ['DISTINCT', 'AS'].includes(k.label))
        ]
        
        // 如果SELECT子句看起来完整了，提供下一个可能的子句
        if (this.isSelectClauseComplete(beforeCursor)) {
          keywords.push(...this.keywords.clauses.filter(k => 
            ['FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT'].includes(k.label)
          ))
        }
        break
        
      case 'FROM':
        keywords = [
          ...this.keywords.clauses.filter(k => k.label.includes('JOIN')),
          ...this.keywords.misc.filter(k => k.label === 'AS')
        ]
        break
        
      case 'WHERE':
        keywords = [
          ...this.keywords.operators,
          ...this.keywords.clauses.filter(k => 
            ['GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT'].includes(k.label)
          )
        ]
        break
        
      case 'JOIN':
        keywords = [
          ...this.keywords.misc.filter(k => ['ON', 'USING', 'AS'].includes(k.label)),
          ...this.keywords.clauses.filter(k => k.label.includes('JOIN'))
        ]
        break
        
      case 'GROUP BY':
        keywords = [
          ...this.keywords.clauses.filter(k => 
            ['HAVING', 'ORDER BY', 'LIMIT'].includes(k.label)
          ),
          ...this.keywords.misc.filter(k => ['ASC', 'DESC'].includes(k.label))
        ]
        break
        
      case 'ORDER BY':
        keywords = [
          ...this.keywords.misc.filter(k => ['ASC', 'DESC'].includes(k.label)),
          ...this.keywords.clauses.filter(k => k.label === 'LIMIT')
        ]
        break
        
      case 'HAVING':
        keywords = [
          ...this.keywords.operators,
          ...this.keywords.aggregates,
          ...this.keywords.clauses.filter(k => 
            ['ORDER BY', 'LIMIT'].includes(k.label)
          )
        ]
        break
        
      default:
        // 默认情况下，根据语句类型提供相关关键字
        if (statementType === 'SELECT') {
          keywords = [
            ...this.keywords.clauses,
            ...this.keywords.operators,
            ...this.keywords.misc
          ]
        } else {
          keywords = this.allKeywords
        }
    }
    
    return keywords
  }
  
  /**
   * 检查SELECT子句是否看起来完整
   */
  isSelectClauseComplete(beforeCursor) {
    const selectMatch = beforeCursor.match(/SELECT\s+(.+)$/i)
    if (!selectMatch) return false
    
    const selectPart = selectMatch[1].trim()
    
    // 如果包含聚合函数或多个字段，可能已经完整
    return selectPart.includes(',') || 
           selectPart.includes('(') || 
           /\w+\.\w+/.test(selectPart) ||
           selectPart.length > 10
  }
  
  /**
   * 过滤关键字
   */
  filterKeywords(keywords, query) {
    if (!query) {
      return keywords.sort((a, b) => b.boost - a.boost)
    }
    
    const queryUpper = query.toUpperCase()
    
    return keywords
      .filter(keyword => 
        keyword.label.includes(queryUpper) || 
        keyword.info.toUpperCase().includes(queryUpper)
      )
      .sort((a, b) => {
        // 精确匹配优先
        const aExact = a.label === queryUpper
        const bExact = b.label === queryUpper
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        // 前缀匹配优先
        const aPrefix = a.label.startsWith(queryUpper)
        const bPrefix = b.label.startsWith(queryUpper)
        if (aPrefix && !bPrefix) return -1
        if (!aPrefix && bPrefix) return 1
        
        // 按权重排序
        return b.boost - a.boost
      })
  }
  
  /**
   * 计算关键字权重
   */
  calculateKeywordBoost(keyword, query, context) {
    let boost = keyword.boost || 10
    
    if (query) {
      const queryUpper = query.toUpperCase()
      
      if (keyword.label === queryUpper) {
        boost += 50
      } else if (keyword.label.startsWith(queryUpper)) {
        boost += 30
      } else if (keyword.label.includes(queryUpper)) {
        boost += 15
      }
    }
    
    // 根据上下文调整权重
    if (context.currentClause) {
      // 在相应子句中提升相关关键字权重
      if (context.currentClause === 'WHERE' && keyword.label.includes('AND') || keyword.label.includes('OR')) {
        boost += 10
      }
      if (context.currentClause === 'SELECT' && keyword.info.includes('函数')) {
        boost += 8
      }
    }
    
    return boost
  }
  
  /**
   * 生成关键字文档
   */
  generateKeywordDocumentation(keyword, context) {
    const docs = [`**${keyword.label}**`, '', keyword.detail]
    
    // 添加使用示例
    const example = this.getKeywordExample(keyword, context)
    if (example) {
      docs.push('', '**示例**:', '```sql', example, '```')
    }
    
    // 添加相关关键字
    const related = this.getRelatedKeywords(keyword)
    if (related.length > 0) {
      docs.push('', `**相关**: ${related.join(', ')}`)
    }
    
    return docs.join('\\n')
  }
  
  /**
   * 获取关键字使用示例
   */
  getKeywordExample(keyword, context) {
    const examples = {
      'SELECT': 'SELECT column1, column2 FROM table_name',
      'WHERE': 'SELECT * FROM users WHERE age > 18',
      'JOIN': 'SELECT * FROM users u JOIN orders o ON u.id = o.user_id',
      'GROUP BY': 'SELECT department, COUNT(*) FROM employees GROUP BY department',
      'ORDER BY': 'SELECT * FROM products ORDER BY price DESC',
      'HAVING': 'SELECT department, COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 5',
      'COUNT': 'SELECT COUNT(*) FROM users',
      'LIKE': 'SELECT * FROM users WHERE name LIKE \'%john%\'',
      'BETWEEN': 'SELECT * FROM products WHERE price BETWEEN 10 AND 100',
      'IN': 'SELECT * FROM users WHERE status IN (\'active\', \'pending\')'
    }
    
    return examples[keyword.label]
  }
  
  /**
   * 获取相关关键字
   */
  getRelatedKeywords(keyword) {
    const relations = {
      'SELECT': ['FROM', 'WHERE', 'GROUP BY', 'ORDER BY'],
      'WHERE': ['AND', 'OR', 'LIKE', 'IN', 'BETWEEN'],
      'JOIN': ['ON', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN'],
      'GROUP BY': ['HAVING', 'COUNT', 'SUM', 'AVG'],
      'ORDER BY': ['ASC', 'DESC', 'LIMIT'],
      'COUNT': ['GROUP BY', 'HAVING', 'SUM', 'AVG'],
      'AND': ['OR', 'NOT', 'WHERE', 'HAVING'],
      'OR': ['AND', 'NOT', 'WHERE', 'HAVING']
    }
    
    return relations[keyword.label] || []
  }
  
  /**
   * 获取关键字图标
   */
  getKeywordIcon(keyword) {
    if (keyword.info.includes('函数')) return 'icon-function'
    if (keyword.info.includes('子句')) return 'icon-clause'
    if (keyword.info.includes('操作符')) return 'icon-operator'
    if (['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(keyword.label)) return 'icon-statement'
    
    return 'icon-keyword'
  }
  
  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear()
  }
}