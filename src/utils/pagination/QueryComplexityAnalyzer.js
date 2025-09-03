/**
 * 查询复杂度分析器
 * 负责分析SQL查询的复杂度并提供COUNT查询生成建议
 */
export class QueryComplexityAnalyzer {
  /**
   * 分析查询复杂度
   * @param {string} query SQL查询语句
   * @returns {Object} 复杂度分析结果
   */
  static analyze(query) {
    const features = this.extractFeatures(query)
    const score = this.calculateComplexityScore(features)
    const level = this.getComplexityLevel(score)
    const isCountable = this.isCountable(features)
    const strategy = this.getRecommendedStrategy(features, score)

    return {
      features,
      score,
      level,
      isCountable,
      recommendedStrategy: strategy,
      warnings: this.generateWarnings(features, score),
      optimizationHints: this.generateOptimizationHints(features)
    }
  }

  /**
   * 提取查询特征
   * @param {string} query SQL查询语句
   * @returns {Object} 查询特征对象
   */
  static extractFeatures(query) {
    const upperQuery = query.toUpperCase()
    
    return {
      // 基本特征
      hasDistinct: /\bDISTINCT\b/i.test(query),
      hasGroupBy: /\bGROUP\s+BY\b/i.test(query),
      hasHaving: /\bHAVING\b/i.test(query),
      hasOrderBy: /\bORDER\s+BY\b/i.test(query),
      hasLimit: /\bLIMIT\b/i.test(query),
      
      // 复杂特征
      hasUnion: /\bUNION(?:\s+ALL)?\b/i.test(query),
      hasSubquery: this.detectSubqueries(query),
      hasWindow: /\bOVER\s*\(/i.test(query),
      hasCTE: /\bWITH\s+\w+/i.test(query),
      
      // 连接类型
      hasJoin: /\b(?:INNER|LEFT|RIGHT|FULL|CROSS)\s+JOIN\b/i.test(query),
      hasImplicitJoin: this.detectImplicitJoin(query),
      
      // 聚合和函数
      hasAggregate: /\b(?:COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT|ARRAY_AGG)\s*\(/i.test(query),
      hasAnalyticFunction: /\b(?:ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|FIRST_VALUE|LAST_VALUE)\s*\(/i.test(query),
      
      // 数据修改
      hasExists: /\bEXISTS\s*\(/i.test(query),
      hasIn: /\bIN\s*\(/i.test(query),
      hasCase: /\bCASE\s+(?:WHEN|\w+)/i.test(query),
      
      // 复杂度指标
      nestedLevel: this.calculateNestingLevel(query),
      tableCount: this.countTables(query),
      subqueryCount: this.countSubqueries(query),
      joinCount: this.countJoins(query)
    }
  }

  /**
   * 检测子查询
   * @param {string} query SQL查询
   * @returns {boolean} 是否包含子查询
   */
  static detectSubqueries(query) {
    // 简化的子查询检测：查找括号内的SELECT
    const selectPattern = /\bSELECT\b/gi
    const matches = query.match(selectPattern) || []
    return matches.length > 1
  }

  /**
   * 检测隐式连接
   * @param {string} query SQL查询
   * @returns {boolean} 是否包含隐式连接
   */
  static detectImplicitJoin(query) {
    // 检测FROM子句中的多个表（用逗号分隔）
    const fromMatch = query.match(/\bFROM\s+([^;]+?)(?:\s+WHERE|\s+GROUP|\s+ORDER|\s+LIMIT|$)/i)
    if (!fromMatch) return false
    
    const fromClause = fromMatch[1]
    const tableCount = (fromClause.match(/,/g) || []).length + 1
    return tableCount > 1
  }

  /**
   * 计算嵌套层级
   * @param {string} query SQL查询
   * @returns {number} 最大嵌套层级
   */
  static calculateNestingLevel(query) {
    let maxLevel = 0
    let currentLevel = 0
    
    for (let i = 0; i < query.length; i++) {
      if (query[i] === '(') {
        currentLevel++
        maxLevel = Math.max(maxLevel, currentLevel)
      } else if (query[i] === ')') {
        currentLevel--
      }
    }
    
    return maxLevel
  }

  /**
   * 统计表数量
   * @param {string} query SQL查询
   * @returns {number} 表数量估算
   */
  static countTables(query) {
    // 简化统计：计算FROM和JOIN关键字数量
    const fromCount = (query.match(/\bFROM\b/gi) || []).length
    const joinCount = (query.match(/\b(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\b/gi) || []).length
    const commaCount = (query.match(/,(?![^(]*\))/g) || []).length // 排除函数参数中的逗号
    
    return fromCount + joinCount + commaCount
  }

  /**
   * 统计子查询数量
   * @param {string} query SQL查询
   * @returns {number} 子查询数量
   */
  static countSubqueries(query) {
    const selectMatches = query.match(/\bSELECT\b/gi) || []
    return Math.max(0, selectMatches.length - 1) // 减去主查询
  }

  /**
   * 统计连接数量
   * @param {string} query SQL查询
   * @returns {number} 连接数量
   */
  static countJoins(query) {
    return (query.match(/\b(?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\b/gi) || []).length
  }

  /**
   * 计算复杂度得分
   * @param {Object} features 查询特征
   * @returns {number} 复杂度得分
   */
  static calculateComplexityScore(features) {
    let score = 0
    
    // 基础特征权重
    if (features.hasDistinct) score += 2
    if (features.hasGroupBy) score += 2
    if (features.hasHaving) score += 1
    
    // 高复杂度特征权重
    if (features.hasUnion) score += 4
    if (features.hasWindow) score += 4
    if (features.hasCTE) score += 3
    if (features.hasAnalyticFunction) score += 3
    
    // 连接复杂度
    if (features.hasJoin) score += 1
    if (features.hasImplicitJoin) score += 2
    score += features.joinCount
    
    // 嵌套复杂度
    score += features.nestedLevel * 2
    score += features.subqueryCount
    
    // 表数量影响
    if (features.tableCount > 3) score += features.tableCount - 3
    
    // 其他特征
    if (features.hasExists) score += 1
    if (features.hasIn) score += 1
    if (features.hasCase) score += 1
    
    return score
  }

  /**
   * 获取复杂度等级
   * @param {number} score 复杂度得分
   * @returns {string} 复杂度等级
   */
  static getComplexityLevel(score) {
    if (score === 0) return 'SIMPLE'
    if (score <= 3) return 'MODERATE'
    if (score <= 8) return 'COMPLEX'
    if (score <= 15) return 'VERY_COMPLEX'
    return 'EXTREMELY_COMPLEX'
  }

  /**
   * 判断是否可以生成COUNT查询
   * @param {Object} features 查询特征
   * @returns {boolean} 是否可生成COUNT
   */
  static isCountable(features) {
    // 不可COUNT的情况
    if (features.hasWindow) return false       // 窗口函数
    if (features.hasAnalyticFunction) return false // 分析函数
    if (features.hasUnion) return false        // UNION查询复杂
    if (features.nestedLevel > 3) return false // 嵌套过深
    
    return true
  }

  /**
   * 获取推荐的COUNT生成策略
   * @param {Object} features 查询特征
   * @param {number} score 复杂度得分
   * @returns {string} 推荐策略
   */
  static getRecommendedStrategy(features, score) {
    if (!this.isCountable(features)) return 'SKIP'
    
    if (score === 0) return 'DIRECT_TRANSFORM'
    if (score <= 3) return 'SIMPLE_SUBQUERY'
    if (score <= 8) return 'OPTIMIZED_SUBQUERY'
    if (score <= 15) return 'CACHED_ESTIMATE'
    
    return 'SKIP'
  }

  /**
   * 生成警告信息
   * @param {Object} features 查询特征
   * @param {number} score 复杂度得分
   * @returns {Array} 警告数组
   */
  static generateWarnings(features, score) {
    const warnings = []
    
    if (features.hasWindow) {
      warnings.push('查询包含窗口函数，无法生成精确的COUNT')
    }
    
    if (features.hasUnion) {
      warnings.push('UNION查询的COUNT生成可能不准确')
    }
    
    if (features.nestedLevel > 3) {
      warnings.push('查询嵌套层级过深，可能影响性能')
    }
    
    if (features.subqueryCount > 2) {
      warnings.push('多个子查询可能导致COUNT查询执行缓慢')
    }
    
    if (score > 15) {
      warnings.push('查询过于复杂，建议简化或跳过COUNT统计')
    }
    
    return warnings
  }

  /**
   * 生成优化提示
   * @param {Object} features 查询特征
   * @returns {Array} 优化提示数组
   */
  static generateOptimizationHints(features) {
    const hints = []
    
    if (features.hasDistinct && !features.hasGroupBy) {
      hints.push('考虑添加合适的索引来优化DISTINCT操作')
    }
    
    if (features.hasImplicitJoin) {
      hints.push('建议使用显式JOIN语法替代隐式连接')
    }
    
    if (features.joinCount > 3) {
      hints.push('多表连接建议检查索引覆盖情况')
    }
    
    if (features.hasSubquery && !features.hasExists) {
      hints.push('考虑将子查询改写为JOIN以提升性能')
    }
    
    if (features.hasOrderBy && features.hasLimit) {
      hints.push('ORDER BY + LIMIT组合建议使用合适的索引')
    }
    
    return hints
  }

  /**
   * 生成复杂度报告
   * @param {string} query SQL查询
   * @returns {Object} 详细报告
   */
  static generateReport(query) {
    const analysis = this.analyze(query)
    
    return {
      ...analysis,
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(analysis)
    }
  }

  /**
   * 生成分析摘要
   * @param {Object} analysis 分析结果
   * @returns {string} 摘要文本
   */
  static generateSummary(analysis) {
    const { level, score, isCountable, features } = analysis
    
    let summary = `查询复杂度: ${level} (得分: ${score})`
    
    if (!isCountable) {
      summary += '，无法生成COUNT查询'
    } else {
      summary += `，推荐策略: ${analysis.recommendedStrategy}`
    }
    
    const keyFeatures = []
    if (features.hasGroupBy) keyFeatures.push('GROUP BY')
    if (features.hasJoin) keyFeatures.push(`${features.joinCount}个连接`)
    if (features.hasSubquery) keyFeatures.push(`${features.subqueryCount}个子查询`)
    if (features.hasWindow) keyFeatures.push('窗口函数')
    
    if (keyFeatures.length > 0) {
      summary += `，包含: ${keyFeatures.join(', ')}`
    }
    
    return summary
  }
}