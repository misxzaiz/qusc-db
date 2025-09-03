/**
 * SELECT查询分页构建器
 * 负责分析和构建SELECT查询的分页版本
 */
export class SelectPaginationBuilder {
  constructor(originalQuery) {
    this.originalQuery = originalQuery.trim()
    this.meta = this.analyzeQuery()
  }

  /**
   * 分析查询语句，提取分页相关信息
   * @returns {Object} 查询元数据
   */
  analyzeQuery() {
    const query = this.originalQuery
    
    // 检测是否为SELECT查询
    const isSelect = /^\s*(?:\/\*.*?\*\/\s*)?(?:--.*?\n\s*)?SELECT\s+/is.test(query)
    
    if (!isSelect) {
      return {
        originalQuery: query,
        isPaginable: false,
        hasUserLimit: false,
        isSelect: false
      }
    }

    // 分析LIMIT子句
    const limitInfo = this.analyzeLimitClause(query)
    
    // 分析查询结构
    const structure = this.analyzeQueryStructure(query)
    
    return {
      originalQuery: query,
      isPaginable: true,
      isSelect: true,
      hasUserLimit: limitInfo.hasLimit,
      userLimit: limitInfo.limit,
      userOffset: limitInfo.offset,
      limitClause: limitInfo.fullClause,
      structure,
      complexity: this.calculateComplexity(structure)
    }
  }

  /**
   * 分析LIMIT子句
   * @param {string} query 查询语句
   * @returns {Object} LIMIT信息
   */
  analyzeLimitClause(query) {
    // 移除末尾分号
    let cleanQuery = query.replace(/;\s*$/, '').trim()
    
    // 匹配LIMIT子句的多种格式
    const limitPatterns = [
      /\bLIMIT\s+(\d+)\s+OFFSET\s+(\d+)\s*$/i,  // LIMIT n OFFSET m
      /\bLIMIT\s+(\d+)\s*,\s*(\d+)\s*$/i,       // LIMIT offset, count (MySQL格式)
      /\bLIMIT\s+(\d+)\s*$/i                     // LIMIT n
    ]
    
    for (const pattern of limitPatterns) {
      const match = cleanQuery.match(pattern)
      if (match) {
        if (pattern.source.includes('OFFSET')) {
          // LIMIT n OFFSET m 格式
          return {
            hasLimit: true,
            limit: parseInt(match[1]),
            offset: parseInt(match[2]),
            fullClause: match[0]
          }
        } else if (pattern.source.includes(',')) {
          // LIMIT offset, count 格式 (MySQL)
          return {
            hasLimit: true,
            limit: parseInt(match[2]),
            offset: parseInt(match[1]),
            fullClause: match[0]
          }
        } else {
          // LIMIT n 格式
          return {
            hasLimit: true,
            limit: parseInt(match[1]),
            offset: 0,
            fullClause: match[0]
          }
        }
      }
    }
    
    return {
      hasLimit: false,
      limit: null,
      offset: null,
      fullClause: null
    }
  }

  /**
   * 分析查询结构
   * @param {string} query 查询语句
   * @returns {Object} 查询结构信息
   */
  analyzeQueryStructure(query) {
    return {
      hasDistinct: /\bDISTINCT\b/i.test(query),
      hasGroupBy: /\bGROUP\s+BY\b/i.test(query),
      hasHaving: /\bHAVING\b/i.test(query),
      hasOrderBy: /\bORDER\s+BY\b/i.test(query),
      hasUnion: /\bUNION\b/i.test(query),
      hasSubquery: /\bSELECT\b.*\bFROM\s*\([^)]*\bSELECT\b/i.test(query),
      hasWindow: /\bOVER\s*\(/i.test(query),
      hasJoin: /\b(?:INNER|LEFT|RIGHT|FULL|CROSS)\s+JOIN\b/i.test(query),
      hasAggregate: /\b(?:COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT)\s*\(/i.test(query)
    }
  }

  /**
   * 计算查询复杂度
   * @param {Object} structure 查询结构
   * @returns {number} 复杂度得分
   */
  calculateComplexity(structure) {
    let score = 0
    if (structure.hasDistinct) score += 2
    if (structure.hasGroupBy) score += 2
    if (structure.hasHaving) score += 1
    if (structure.hasUnion) score += 3
    if (structure.hasSubquery) score += 2
    if (structure.hasWindow) score += 3
    if (structure.hasJoin) score += 1
    return score
  }

  /**
   * 构建分页查询
   * @param {number} page 页码（从1开始）
   * @param {number} pageSize 页面大小
   * @param {Object} options 选项
   * @returns {string} 分页查询语句
   */
  buildPaginatedQuery(page = 1, pageSize = 20, options = {}) {
    if (!this.meta.isPaginable) {
      return this.originalQuery
    }

    const { respectUserLimit = true } = options
    
    // 处理已有LIMIT的情况
    if (this.meta.hasUserLimit) {
      return this.handleUserDefinedLimit(page, pageSize, respectUserLimit)
    }
    
    // 处理无LIMIT的情况
    return this.addPaginationLimit(page, pageSize)
  }

  /**
   * 处理用户已定义LIMIT的情况
   * @param {number} page 页码
   * @param {number} pageSize 页面大小  
   * @param {boolean} respectUserLimit 是否尊重用户LIMIT
   * @returns {string} 处理后的查询
   */
  handleUserDefinedLimit(page, pageSize, respectUserLimit) {
    if (respectUserLimit) {
      // 将用户LIMIT作为页面大小进行分页
      const userPageSize = this.meta.userLimit
      const offset = (page - 1) * userPageSize + (this.meta.userOffset || 0)
      
      return this.originalQuery.replace(
        this.meta.limitClause,
        `LIMIT ${userPageSize} OFFSET ${offset}`
      )
    } else {
      // 替换用户LIMIT为新的分页参数
      const offset = (page - 1) * pageSize
      return this.originalQuery.replace(
        this.meta.limitClause,
        `LIMIT ${pageSize} OFFSET ${offset}`
      )
    }
  }

  /**
   * 为无LIMIT的查询添加分页
   * @param {number} page 页码
   * @param {number} pageSize 页面大小
   * @returns {string} 添加分页后的查询
   */
  addPaginationLimit(page, pageSize) {
    let query = this.originalQuery
    
    // 移除末尾分号
    const hasSemicolon = query.endsWith(';')
    if (hasSemicolon) {
      query = query.slice(0, -1).trim()
    }
    
    // 计算偏移量
    const offset = (page - 1) * pageSize
    
    // 智能插入LIMIT子句（在ORDER BY之后，其他子句之前）
    const limitClause = offset > 0 ? ` LIMIT ${pageSize} OFFSET ${offset}` : ` LIMIT ${pageSize}`
    
    // 使用现有的智能SQL结构分析逻辑
    const finalQuery = this.insertLimitClause(query, limitClause)
    
    return hasSemicolon ? finalQuery + ';' : finalQuery
  }

  /**
   * 智能插入LIMIT子句
   * @param {string} query 查询语句
   * @param {string} limitClause LIMIT子句
   * @returns {string} 插入LIMIT后的查询
   */
  insertLimitClause(query, limitClause) {
    // 从后往前匹配各个子句
    let remainingQuery = query
    let orderByClause = ''
    
    // 匹配ORDER BY（最后一个）
    const orderByMatch = remainingQuery.match(/^(.*?)(\s+ORDER\s+BY\s+.+?)$/i)
    if (orderByMatch) {
      remainingQuery = orderByMatch[1].trim()
      orderByClause = orderByMatch[2]
    }
    
    // 构建最终查询：主查询 + LIMIT + ORDER BY
    return remainingQuery + limitClause + orderByClause
  }

  /**
   * 构建COUNT查询（基础版本，后续会被EnhancedCountQueryGenerator替代）
   * @returns {string|null} COUNT查询语句
   */
  buildCountQuery() {
    if (!this.meta.isPaginable) {
      return null
    }

    // 如果查询复杂度过高，跳过COUNT生成
    if (this.meta.complexity > 5) {
      return null
    }

    let query = this.originalQuery
      .replace(/;\s*$/, '')  // 移除分号
      .replace(/\s+ORDER\s+BY\s+[^;]*$/i, '')  // 移除ORDER BY
      .replace(/\s+LIMIT\s+[^;]*$/i, '')       // 移除LIMIT
    
    // 处理GROUP BY查询
    if (this.meta.structure.hasGroupBy) {
      return `SELECT COUNT(*) FROM (${query}) AS count_subquery`
    }
    
    // 简单SELECT转换
    return query.replace(/^\s*SELECT\s+.*?\s+FROM\s+/i, 'SELECT COUNT(*) FROM ')
  }

  /**
   * 获取分页元数据
   * @returns {Object} 分页元数据
   */
  getPaginationMeta() {
    return { ...this.meta }
  }
}