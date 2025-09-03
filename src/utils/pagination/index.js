/**
 * 分页工具集入口文件
 * 提供统一的分页相关工具导入
 */

export { SelectPaginationBuilder } from './SelectPaginationBuilder.js'
export { BatchQueryPaginationManager } from './BatchQueryPaginationManager.js'
export { QueryComplexityAnalyzer } from './QueryComplexityAnalyzer.js'
export { EnhancedCountQueryGenerator } from './EnhancedCountQueryGenerator.js'

// 导入类用于内部使用
import { SelectPaginationBuilder } from './SelectPaginationBuilder.js'
import { BatchQueryPaginationManager } from './BatchQueryPaginationManager.js'
import { QueryComplexityAnalyzer } from './QueryComplexityAnalyzer.js'
import { EnhancedCountQueryGenerator } from './EnhancedCountQueryGenerator.js'

/**
 * 创建分页管理器实例
 * @param {Object} options 配置选项
 * @returns {Object} 分页工具实例
 */
export function createPaginationTools(options = {}) {
  const {
    cacheSize = 100,
    cacheTTL = 5 * 60 * 1000,
    defaultPageSize = 20,
    maxComplexity = 8
  } = options

  const countGenerator = new EnhancedCountQueryGenerator()
  const batchManager = new BatchQueryPaginationManager()

  return {
    countGenerator,
    batchManager,
    
    // 便捷方法
    createBuilder: (query) => new SelectPaginationBuilder(query),
    analyzeComplexity: (query) => QueryComplexityAnalyzer.analyze(query),
    
    // 配置信息
    config: {
      cacheSize,
      cacheTTL,
      defaultPageSize,
      maxComplexity
    }
  }
}

/**
 * 分页策略常量
 */
export const PaginationStrategies = {
  DIRECT_TRANSFORM: 'DIRECT_TRANSFORM',
  SIMPLE_SUBQUERY: 'SIMPLE_SUBQUERY', 
  OPTIMIZED_SUBQUERY: 'OPTIMIZED_SUBQUERY',
  CACHED_ESTIMATE: 'CACHED_ESTIMATE',
  SKIP: 'SKIP',
  ERROR: 'ERROR',
  CACHED: 'CACHED'
}

/**
 * 复杂度等级常量
 */
export const ComplexityLevels = {
  SIMPLE: 'SIMPLE',
  MODERATE: 'MODERATE',
  COMPLEX: 'COMPLEX',
  VERY_COMPLEX: 'VERY_COMPLEX',
  EXTREMELY_COMPLEX: 'EXTREMELY_COMPLEX'
}

/**
 * 用户LIMIT处理策略
 */
export const UserLimitStrategies = {
  PRESERVE: 'preserve',      // 保持原样，将LIMIT作为页面大小
  OVERRIDE: 'override',      // 覆盖用户LIMIT，使用新的页面大小
  ASK_USER: 'ask_user'       // 询问用户如何处理
}