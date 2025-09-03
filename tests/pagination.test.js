/**
 * 分页功能单元测试
 * 测试SelectPaginationBuilder、BatchQueryPaginationManager等核心功能
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { 
  SelectPaginationBuilder,
  BatchQueryPaginationManager,
  QueryComplexityAnalyzer,
  EnhancedCountQueryGenerator
} from '../src/utils/pagination/index.js'

describe('SelectPaginationBuilder', () => {
  test('应该正确识别SELECT查询', () => {
    const simpleSelect = new SelectPaginationBuilder('SELECT * FROM users')
    const meta = simpleSelect.getPaginationMeta()
    
    expect(meta.isPaginable).toBe(true)
    expect(meta.isSelect).toBe(true)
    expect(meta.hasUserLimit).toBe(false)
  })

  test('应该正确识别非SELECT查询', () => {
    const insertQuery = new SelectPaginationBuilder('INSERT INTO users (name) VALUES ("test")')
    const meta = insertQuery.getPaginationMeta()
    
    expect(meta.isPaginable).toBe(false)
    expect(meta.isSelect).toBe(false)
  })

  test('应该正确检测已有的LIMIT子句', () => {
    const queryWithLimit = new SelectPaginationBuilder('SELECT * FROM users LIMIT 50')
    const meta = queryWithLimit.getPaginationMeta()
    
    expect(meta.hasUserLimit).toBe(true)
    expect(meta.userLimit).toBe(50)
    expect(meta.userOffset).toBe(0)
  })

  test('应该正确检测LIMIT OFFSET子句', () => {
    const queryWithOffset = new SelectPaginationBuilder('SELECT * FROM users LIMIT 20 OFFSET 100')
    const meta = queryWithOffset.getPaginationMeta()
    
    expect(meta.hasUserLimit).toBe(true)
    expect(meta.userLimit).toBe(20)
    expect(meta.userOffset).toBe(100)
  })

  test('应该正确检测MySQL风格的LIMIT', () => {
    const mysqlLimit = new SelectPaginationBuilder('SELECT * FROM users LIMIT 100, 20')
    const meta = mysqlLimit.getPaginationMeta()
    
    expect(meta.hasUserLimit).toBe(true)
    expect(meta.userLimit).toBe(20)
    expect(meta.userOffset).toBe(100)
  })

  test('应该为简单SELECT构建分页查询', () => {
    const builder = new SelectPaginationBuilder('SELECT * FROM users WHERE age > 18')
    const paginatedQuery = builder.buildPaginatedQuery(2, 10)
    
    expect(paginatedQuery).toBe('SELECT * FROM users WHERE age > 18 LIMIT 10 OFFSET 10')
  })

  test('应该为带ORDER BY的SELECT构建分页查询', () => {
    const builder = new SelectPaginationBuilder('SELECT * FROM users WHERE age > 18 ORDER BY created_at DESC')
    const paginatedQuery = builder.buildPaginatedQuery(1, 20)
    
    expect(paginatedQuery).toBe('SELECT * FROM users WHERE age > 18 LIMIT 20 ORDER BY created_at DESC')
  })

  test('应该正确处理用户已定义的LIMIT（尊重用户LIMIT）', () => {
    const builder = new SelectPaginationBuilder('SELECT * FROM users LIMIT 50')
    const paginatedQuery = builder.buildPaginatedQuery(2, 20, { respectUserLimit: true })
    
    // 第2页，用户LIMIT=50作为页面大小，所以偏移量是50
    expect(paginatedQuery).toBe('SELECT * FROM users LIMIT 50 OFFSET 50')
  })

  test('应该正确处理用户已定义的LIMIT（覆盖用户LIMIT）', () => {
    const builder = new SelectPaginationBuilder('SELECT * FROM users LIMIT 50')
    const paginatedQuery = builder.buildPaginatedQuery(2, 20, { respectUserLimit: false })
    
    // 第2页，使用新的pageSize=20，所以偏移量是20
    expect(paginatedQuery).toBe('SELECT * FROM users LIMIT 20 OFFSET 20')
  })

  test('应该为GROUP BY查询生成COUNT查询', () => {
    const builder = new SelectPaginationBuilder('SELECT status, COUNT(*) FROM users GROUP BY status')
    const countQuery = builder.buildCountQuery()
    
    expect(countQuery).toBe('SELECT COUNT(*) FROM (SELECT status, COUNT(*) FROM users GROUP BY status) AS count_subquery')
  })

  test('应该为简单查询生成直接COUNT查询', () => {
    const builder = new SelectPaginationBuilder('SELECT * FROM users WHERE age > 18')
    const countQuery = builder.buildCountQuery()
    
    expect(countQuery).toBe('SELECT COUNT(*) FROM users WHERE age > 18')
  })
})

describe('QueryComplexityAnalyzer', () => {
  test('应该正确分析简单查询', () => {
    const analysis = QueryComplexityAnalyzer.analyze('SELECT * FROM users')
    
    expect(analysis.level).toBe('SIMPLE')
    expect(analysis.score).toBe(0)
    expect(analysis.isCountable).toBe(true)
    expect(analysis.recommendedStrategy).toBe('DIRECT_TRANSFORM')
  })

  test('应该正确分析GROUP BY查询', () => {
    const analysis = QueryComplexityAnalyzer.analyze('SELECT status, COUNT(*) FROM users GROUP BY status')
    
    expect(analysis.level).toBe('MODERATE')
    expect(analysis.score).toBe(2)
    expect(analysis.features.hasGroupBy).toBe(true)
    expect(analysis.isCountable).toBe(true)
  })

  test('应该正确分析DISTINCT查询', () => {
    const analysis = QueryComplexityAnalyzer.analyze('SELECT DISTINCT department FROM users')
    
    expect(analysis.features.hasDistinct).toBe(true)
    expect(analysis.score).toBe(2)
    expect(analysis.isCountable).toBe(true)
  })

  test('应该正确分析窗口函数查询', () => {
    const analysis = QueryComplexityAnalyzer.analyze('SELECT *, ROW_NUMBER() OVER (ORDER BY id) FROM users')
    
    expect(analysis.features.hasWindow).toBe(true)
    expect(analysis.isCountable).toBe(false)
    expect(analysis.recommendedStrategy).toBe('SKIP')
  })

  test('应该正确分析JOIN查询', () => {
    const analysis = QueryComplexityAnalyzer.analyze('SELECT u.*, p.name FROM users u LEFT JOIN profiles p ON u.id = p.user_id')
    
    expect(analysis.features.hasJoin).toBe(true)
    expect(analysis.joinCount).toBe(1)
  })

  test('应该正确计算嵌套层级', () => {
    const analysis = QueryComplexityAnalyzer.analyze('SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)')
    
    expect(analysis.features.nestedLevel).toBeGreaterThan(0)
    expect(analysis.features.hasSubquery).toBe(true)
  })
})

describe('EnhancedCountQueryGenerator', () => {
  let generator

  beforeEach(() => {
    generator = new EnhancedCountQueryGenerator()
  })

  test('应该为简单查询生成直接转换的COUNT', () => {
    const result = generator.generate('SELECT * FROM users WHERE age > 18')
    
    expect(result.strategy).toBe('DIRECT_TRANSFORM')
    expect(result.query).toBe('SELECT COUNT(*) FROM users WHERE age > 18')
  })

  test('应该为GROUP BY查询生成子查询COUNT', () => {
    const result = generator.generate('SELECT status, COUNT(*) FROM users GROUP BY status')
    
    expect(result.strategy).toBe('SIMPLE_SUBQUERY')
    expect(result.query).toContain('SELECT COUNT(*) FROM (')
    expect(result.query).toContain(') AS count_subquery')
  })

  test('应该跳过窗口函数查询', () => {
    const result = generator.generate('SELECT *, ROW_NUMBER() OVER (ORDER BY id) FROM users')
    
    expect(result.strategy).toBe('SKIP')
    expect(result.query).toBeNull()
    expect(result.reason).toContain('not countable')
  })

  test('应该跳过过于复杂的查询', () => {
    const complexQuery = `
      WITH RECURSIVE cte AS (
        SELECT id, name, parent_id, 1 as level FROM categories WHERE parent_id IS NULL
        UNION ALL
        SELECT c.id, c.name, c.parent_id, cte.level + 1 
        FROM categories c 
        JOIN cte ON c.parent_id = cte.id
      )
      SELECT * FROM cte 
      JOIN products p ON p.category_id = cte.id
      WHERE cte.level > 2
      ORDER BY cte.level, cte.name
    `
    
    const result = generator.generate(complexQuery, { maxComplexity: 5 })
    
    expect(result.strategy).toBe('SKIP')
    expect(result.query).toBeNull()
  })

  test('应该正确处理缓存', () => {
    const query = 'SELECT * FROM users'
    
    // 第一次生成
    const result1 = generator.generate(query, { connectionId: 'test-conn' })
    expect(result1.fromCache).toBe(false)
    
    // 模拟缓存结果
    generator.cache.set(query, 'test-conn', 100)
    
    // 第二次应该从缓存获取
    const result2 = generator.generate(query, { connectionId: 'test-conn', useCache: true })
    expect(result2.fromCache).toBe(true)
    expect(result2.cachedResult).toBe(100)
  })

  test('应该批量生成COUNT查询', () => {
    const queries = [
      'SELECT * FROM users',
      'SELECT * FROM orders',
      'INSERT INTO logs (message) VALUES ("test")',
      'SELECT status, COUNT(*) FROM users GROUP BY status'
    ]
    
    const results = generator.generateBatch(queries)
    
    expect(results).toHaveLength(4)
    expect(results[0].strategy).toBe('DIRECT_TRANSFORM')
    expect(results[1].strategy).toBe('DIRECT_TRANSFORM')
    expect(results[2].strategy).toBe('SKIP') // 非SELECT查询
    expect(results[3].strategy).toBe('SIMPLE_SUBQUERY')
  })
})

describe('BatchQueryPaginationManager', () => {
  let manager

  beforeEach(() => {
    manager = new BatchQueryPaginationManager()
  })

  test('应该正确初始化批量查询分页', () => {
    const queries = [
      'SELECT * FROM users',
      'INSERT INTO logs (message) VALUES ("test")',
      'SELECT * FROM orders ORDER BY created_at DESC'
    ]
    
    manager.initializeBatchPagination(queries)
    
    // 应该只有SELECT查询支持分页
    expect(manager.isPaginationEnabled(0)).toBe(true)  // users query
    expect(manager.isPaginationEnabled(1)).toBe(false) // insert query
    expect(manager.isPaginationEnabled(2)).toBe(true)  // orders query
  })

  test('应该获取分页查询信息', () => {
    const queries = ['SELECT * FROM users WHERE age > 18']
    manager.initializeBatchPagination(queries)
    
    const paginationInfo = manager.getPaginatedQuery(0, 2, 10)
    
    expect(paginationInfo).toBeTruthy()
    expect(paginationInfo.query).toBe('SELECT * FROM users WHERE age > 18 LIMIT 10 OFFSET 10')
    expect(paginationInfo.meta.currentPage).toBe(2)
    expect(paginationInfo.meta.pageSize).toBe(10)
  })

  test('应该正确更新分页状态', () => {
    const queries = ['SELECT * FROM users']
    manager.initializeBatchPagination(queries)
    
    manager.updatePaginationState(0, {
      totalRecords: 100,
      currentPage: 3
    })
    
    const state = manager.getPaginationState(0)
    expect(state.totalRecords).toBe(100)
    expect(state.currentPage).toBe(3)
    expect(state.totalPages).toBe(5) // 100 / 20 = 5
    expect(state.hasMore).toBe(true)
  })

  test('应该正确处理用户LIMIT', () => {
    const queries = ['SELECT * FROM users LIMIT 50']
    manager.initializeBatchPagination(queries, {
      respectUserLimit: true
    })
    
    const state = manager.getPaginationState(0)
    expect(state.hasUserLimit).toBe(true)
    expect(state.userLimit).toBe(50)
    expect(state.pageSize).toBe(50) // 应该使用用户的LIMIT作为页面大小
  })

  test('应该获取统计信息', () => {
    const queries = [
      'SELECT * FROM users',
      'INSERT INTO logs (message) VALUES ("test")',
      'SELECT * FROM orders',
      'UPDATE users SET last_login = NOW()'
    ]
    
    manager.initializeBatchPagination(queries)
    
    const stats = manager.getStatistics()
    expect(stats.totalQueries).toBe(2) // 只有SELECT查询被管理
    expect(stats.paginableQueries).toBe(2)
  })

  test('应该重置分页状态', () => {
    const queries = ['SELECT * FROM users']
    manager.initializeBatchPagination(queries)
    
    // 更新状态
    manager.updatePaginationState(0, {
      totalRecords: 100,
      currentPage: 3
    })
    
    // 重置
    manager.resetPagination(0)
    
    const state = manager.getPaginationState(0)
    expect(state.currentPage).toBe(1)
    expect(state.totalRecords).toBe(0)
    expect(state.hasMore).toBe(false)
  })

  test('应该支持配置导出和导入', () => {
    const queries = ['SELECT * FROM users', 'SELECT * FROM orders']
    manager.initializeBatchPagination(queries)
    
    // 更新一些状态
    manager.updatePaginationState(0, { totalRecords: 100 })
    manager.updatePaginationState(1, { totalRecords: 50 })
    
    // 导出配置
    const config = manager.exportConfig()
    expect(config.queries).toHaveLength(2)
    expect(config.states).toHaveLength(2)
    
    // 创建新的管理器并导入配置
    const newManager = new BatchQueryPaginationManager()
    newManager.importConfig(config, queries)
    
    const state0 = newManager.getPaginationState(0)
    expect(state0.totalRecords).toBe(100)
  })
})

// 集成测试
describe('分页功能集成测试', () => {
  test('完整的分页流程', () => {
    const query = 'SELECT * FROM users WHERE age > 18 ORDER BY created_at DESC'
    
    // 1. 创建分页构建器
    const builder = new SelectPaginationBuilder(query)
    expect(builder.getPaginationMeta().isPaginable).toBe(true)
    
    // 2. 分析复杂度
    const analysis = QueryComplexityAnalyzer.analyze(query)
    expect(analysis.isCountable).toBe(true)
    
    // 3. 生成COUNT查询
    const generator = new EnhancedCountQueryGenerator()
    const countInfo = generator.generate(query)
    expect(countInfo.query).toBeTruthy()
    
    // 4. 构建分页查询
    const paginatedQuery = builder.buildPaginatedQuery(2, 10)
    expect(paginatedQuery).toContain('LIMIT 10 OFFSET 10')
    expect(paginatedQuery).toContain('ORDER BY created_at DESC')
  })

  test('批量查询分页集成', () => {
    const queries = [
      'SELECT * FROM users',
      'SELECT id, name FROM products WHERE price > 100',
      'INSERT INTO logs (message) VALUES ("test")',
      'SELECT status, COUNT(*) FROM orders GROUP BY status'
    ]
    
    // 初始化批量管理器
    const manager = new BatchQueryPaginationManager()
    manager.initializeBatchPagination(queries)
    
    // 验证只有SELECT查询支持分页
    expect(manager.isPaginationEnabled(0)).toBe(true)
    expect(manager.isPaginationEnabled(1)).toBe(true)
    expect(manager.isPaginationEnabled(2)).toBe(false)
    expect(manager.isPaginationEnabled(3)).toBe(true)
    
    // 为每个支持的查询生成分页信息
    const paginationInfo0 = manager.getPaginatedQuery(0, 1, 20)
    const paginationInfo1 = manager.getPaginatedQuery(1, 1, 20)
    const paginationInfo3 = manager.getPaginatedQuery(3, 1, 20)
    
    expect(paginationInfo0.query).toContain('LIMIT 20')
    expect(paginationInfo1.query).toContain('LIMIT 20')
    expect(paginationInfo3.countQuery).toContain('count_subquery') // GROUP BY查询的COUNT
    
    // 生成COUNT查询
    const generator = new EnhancedCountQueryGenerator()
    const countResults = generator.generateBatch(queries)
    
    expect(countResults[0].strategy).toBe('DIRECT_TRANSFORM')
    expect(countResults[1].strategy).toBe('DIRECT_TRANSFORM')
    expect(countResults[2].strategy).toBe('SKIP')
    expect(countResults[3].strategy).toBe('SIMPLE_SUBQUERY')
  })

  test('用户LIMIT处理策略', () => {
    const queryWithLimit = 'SELECT * FROM users WHERE active = 1 LIMIT 50'
    
    const builder = new SelectPaginationBuilder(queryWithLimit)
    const meta = builder.getPaginationMeta()
    
    expect(meta.hasUserLimit).toBe(true)
    expect(meta.userLimit).toBe(50)
    
    // 测试不同的处理策略
    const respectUserLimit = builder.buildPaginatedQuery(2, 20, { respectUserLimit: true })
    const overrideUserLimit = builder.buildPaginatedQuery(2, 20, { respectUserLimit: false })
    
    expect(respectUserLimit).toContain('LIMIT 50 OFFSET 50') // 使用用户LIMIT作为页面大小
    expect(overrideUserLimit).toContain('LIMIT 20 OFFSET 20') // 使用新的页面大小
  })
})