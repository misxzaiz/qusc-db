import { QueryComplexityAnalyzer } from './QueryComplexityAnalyzer.js'

/**
 * COUNT查询缓存
 * 缓存COUNT查询结果以提升性能
 */
class CountQueryCache {
  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) { // 5分钟TTL
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttlMs
  }

  generateKey(query, connectionId) {
    const normalizedQuery = this.normalizeQuery(query)
    return `${connectionId}:${this.hashQuery(normalizedQuery)}`
  }

  get(query, connectionId) {
    const key = this.generateKey(query, connectionId)
    const cached = this.cache.get(key)
    
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return cached.count
  }

  set(query, connectionId, count) {
    const key = this.generateKey(query, connectionId)
    
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      count,
      timestamp: Date.now()
    })
  }

  normalizeQuery(query) {
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/;$/, '')
  }

  hashQuery(query) {
    let hash = 0
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString()
  }

  cleanup() {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key)
      }
    }
  }

  clear() {
    this.cache.clear()
  }
}

/**
 * 增强的COUNT查询生成器
 * 基于查询复杂度分析生成优化的COUNT查询
 */
export class EnhancedCountQueryGenerator {
  constructor() {
    this.cache = new CountQueryCache()
  }

  /**
   * 生成COUNT查询
   * @param {string} originalQuery 原始查询
   * @param {Object} options 选项
   * @returns {Object|null} COUNT查询信息
   */
  generate(originalQuery, options = {}) {
    const {
      connectionId = null,
      useCache = true,
      maxComplexity = 8,
      forceGenerate = false
    } = options

    // 检查缓存
    if (useCache && connectionId) {
      const cachedCount = this.cache.get(originalQuery, connectionId)
      if (cachedCount !== null) {
        return {
          query: null,
          cachedResult: cachedCount,
          strategy: 'CACHED',
          fromCache: true
        }
      }
    }

    // 分析查询复杂度
    const analysis = QueryComplexityAnalyzer.analyze(originalQuery)

    // 检查是否可以生成COUNT
    if (!analysis.isCountable && !forceGenerate) {
      return {
        query: null,
        analysis,
        strategy: 'SKIP',
        reason: 'Query is not countable',
        warnings: analysis.warnings
      }
    }

    // 检查复杂度限制
    if (analysis.score > maxComplexity && !forceGenerate) {
      return {
        query: null,
        analysis,
        strategy: 'SKIP',
        reason: `Complexity score ${analysis.score} exceeds limit ${maxComplexity}`,
        warnings: analysis.warnings
      }
    }

    // 根据推荐策略生成COUNT查询
    const countQuery = this.generateByStrategy(originalQuery, analysis.recommendedStrategy, analysis.features)

    return {
      query: countQuery,
      analysis,
      strategy: analysis.recommendedStrategy,
      fromCache: false,
      warnings: analysis.warnings,
      optimizationHints: analysis.optimizationHints
    }
  }

  /**
   * 根据策略生成COUNT查询
   * @param {string} query 原始查询
   * @param {string} strategy 生成策略
   * @param {Object} features 查询特征
   * @returns {string|null} COUNT查询
   */
  generateByStrategy(query, strategy, features) {
    switch (strategy) {
      case 'DIRECT_TRANSFORM':
        return this.directTransform(query)
      
      case 'SIMPLE_SUBQUERY':
        return this.simpleSubquery(query, features)
      
      case 'OPTIMIZED_SUBQUERY':
        return this.optimizedSubquery(query, features)
      
      case 'CACHED_ESTIMATE':
        return this.cachedEstimate(query, features)
      
      case 'SKIP':
      default:
        return null
    }
  }

  /**
   * 策略1: 直接转换（简单SELECT）
   * @param {string} query 原始查询
   * @returns {string} COUNT查询
   */
  directTransform(query) {
    return query
      .replace(/;\s*$/, '')  // 移除分号
      .replace(/^\s*SELECT\s+.*?\s+FROM\s+/i, 'SELECT COUNT(*) FROM ')
      .replace(/\s+ORDER\s+BY\s+[^;]*$/i, '')  // 移除ORDER BY
      .replace(/\s+LIMIT\s+[^;]*$/i, '')       // 移除LIMIT
  }

  /**
   * 策略2: 简单子查询（带GROUP BY但不复杂）
   * @param {string} query 原始查询
   * @param {Object} features 查询特征
   * @returns {string} COUNT查询
   */
  simpleSubquery(query, features) {
    let cleanQuery = query
      .replace(/;\s*$/, '')  // 移除分号
      .replace(/\s+ORDER\s+BY\s+[^;]*$/i, '')  // 移除ORDER BY
      .replace(/\s+LIMIT\s+[^;]*$/i, '')       // 移除LIMIT

    // 对于DISTINCT查询但没有GROUP BY，保持子查询结构
    if (features.hasDistinct && !features.hasGroupBy) {
      return `SELECT COUNT(*) FROM (${cleanQuery}) AS count_subquery`
    }

    // 对于有GROUP BY的查询，使用子查询包装
    if (features.hasGroupBy) {
      return `SELECT COUNT(*) FROM (${cleanQuery}) AS count_subquery`
    }

    // 其他情况，尝试直接转换
    return this.directTransform(query)
  }

  /**
   * 策略3: 优化子查询（复杂查询）
   * @param {string} query 原始查询
   * @param {Object} features 查询特征
   * @returns {string} COUNT查询
   */
  optimizedSubquery(query, features) {
    let cleanQuery = query
      .replace(/;\s*$/, '')  // 移除分号
      .replace(/\s+ORDER\s+BY\s+[^;]*$/i, '')  // 移除ORDER BY
      .replace(/\s+LIMIT\s+[^;]*$/i, '')       // 移除LIMIT

    // 尝试优化SELECT子句
    if (features.hasGroupBy) {
      const optimizedQuery = this.optimizeGroupByQuery(cleanQuery)
      return `SELECT COUNT(*) FROM (${optimizedQuery}) AS count_subquery`
    }

    // 其他复杂查询直接包装
    return `SELECT COUNT(*) FROM (${cleanQuery}) AS count_subquery`
  }

  /**
   * 策略4: 缓存估算（非常复杂的查询）
   * @param {string} query 原始查询
   * @param {Object} features 查询特征
   * @returns {string|null} 估算查询或null
   */
  cachedEstimate(query, features) {
    // 对于非常复杂的查询，可以考虑：
    // 1. 使用表统计信息估算
    // 2. 返回null，不提供COUNT
    // 3. 使用EXPLAIN来估算

    console.warn('查询复杂度较高，跳过精确COUNT生成:', {
      query: query.substring(0, 100) + '...',
      features: Object.keys(features).filter(k => features[k])
    })

    return null
  }

  /**
   * 优化GROUP BY查询的SELECT子句
   * @param {string} query 查询语句
   * @returns {string} 优化后的查询
   */
  optimizeGroupByQuery(query) {
    const groupByMatch = query.match(/GROUP\s+BY\s+([^;]+?)(?:\s+HAVING|$)/i)
    
    if (groupByMatch) {
      const groupFields = groupByMatch[1].trim()
      
      // 尝试提取GROUP BY字段，简化SELECT子句
      const simplifiedSelect = `SELECT ${groupFields}`
      const fromMatch = query.match(/\s+FROM\s+.*/i)
      
      if (fromMatch) {
        return simplifiedSelect + fromMatch[0]
      }
    }
    
    return query
  }

  /**
   * 执行COUNT查询并缓存结果
   * @param {Function} executeQuery 查询执行函数
   * @param {string} connectionId 连接ID
   * @param {Object} countQueryInfo COUNT查询信息
   * @param {string} originalQuery 原始查询
   * @returns {Promise<number>} COUNT结果
   */
  async executeCountQueryWithCache(executeQuery, connectionId, countQueryInfo, originalQuery) {
    // 如果有缓存结果，直接返回
    if (countQueryInfo?.fromCache) {
      return countQueryInfo.cachedResult || 0
    }

    // 如果没有COUNT查询，返回0
    if (!countQueryInfo?.query) {
      return 0
    }

    try {
      const result = await executeQuery(connectionId, countQueryInfo.query)
      const count = parseInt(result?.rows?.[0]?.[0]) || 0

      // 缓存结果
      if (connectionId) {
        this.cache.set(originalQuery, connectionId, count)
      }

      return count
    } catch (error) {
      console.warn('COUNT查询执行失败:', error.message)
      return 0
    }
  }

  /**
   * 批量生成COUNT查询
   * @param {Array<string>} queries 查询数组
   * @param {Object} options 选项
   * @returns {Array} COUNT查询信息数组
   */
  generateBatch(queries, options = {}) {
    return queries.map((query, index) => {
      const trimmedQuery = query.trim()
      if (!trimmedQuery) return null

      try {
        const countInfo = this.generate(trimmedQuery, {
          ...options,
          // 为每个查询添加唯一标识
          queryIndex: index
        })

        return {
          ...countInfo,
          originalQuery: trimmedQuery,
          queryIndex: index
        }
      } catch (error) {
        console.warn(`生成COUNT查询失败 (索引 ${index}):`, error.message)
        return {
          query: null,
          error: error.message,
          strategy: 'ERROR',
          queryIndex: index,
          originalQuery: trimmedQuery
        }
      }
    })
  }

  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计信息
   */
  getCacheStatistics() {
    return {
      size: this.cache.cache.size,
      maxSize: this.cache.maxSize,
      ttl: this.cache.ttl
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupCache() {
    this.cache.cleanup()
  }

  /**
   * 清空所有缓存
   */
  clearCache() {
    this.cache.clear()
  }
}