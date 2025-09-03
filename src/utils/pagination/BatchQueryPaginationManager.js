import { SelectPaginationBuilder } from './SelectPaginationBuilder.js'

/**
 * 批量查询分页管理器
 * 负责管理批量查询中每个SELECT查询的分页状态
 */
export class BatchQueryPaginationManager {
  constructor() {
    // 存储每个查询的分页构建器
    this.queryBuilders = new Map()
    // 存储每个查询的分页状态
    this.paginationStates = new Map()
    // 存储查询索引到原始查询的映射
    this.queryMapping = new Map()
  }

  /**
   * 初始化批量查询的分页支持
   * @param {Array<string>} queries 查询语句数组
   * @param {Object} options 初始化选项
   */
  initializeBatchPagination(queries, options = {}) {
    const {
      defaultPageSize = 20,
      respectUserLimit = true,
      enablePagination = true
    } = options

    queries.forEach((query, index) => {
      const trimmedQuery = query.trim()
      if (!trimmedQuery) return

      // 创建分页构建器
      const builder = new SelectPaginationBuilder(trimmedQuery)
      const meta = builder.getPaginationMeta()

      // 只为可分页的SELECT查询创建分页状态
      if (enablePagination && meta.isPaginable) {
        this.queryBuilders.set(index, builder)
        this.queryMapping.set(index, trimmedQuery)
        
        // 确定页面大小：用户LIMIT优先，否则使用默认值
        let pageSize = defaultPageSize
        if (respectUserLimit && meta.hasUserLimit) {
          pageSize = meta.userLimit
        }

        // 初始化分页状态
        this.paginationStates.set(index, {
          currentPage: 1,
          pageSize: pageSize,
          totalRecords: 0,
          totalPages: 0,
          hasMore: false,
          isCountLoading: false,
          countError: null,
          // 元数据
          originalQuery: trimmedQuery,
          hasUserLimit: meta.hasUserLimit,
          userLimit: meta.userLimit,
          userOffset: meta.userOffset,
          complexity: meta.complexity
        })
      }
    })

    console.log(`初始化分页管理器：共 ${queries.length} 个查询，${this.queryBuilders.size} 个支持分页`)
  }

  /**
   * 获取指定查询的分页信息
   * @param {number} queryIndex 查询索引
   * @param {number} page 页码
   * @param {number} pageSize 页面大小
   * @returns {Object|null} 分页查询信息
   */
  getPaginatedQuery(queryIndex, page = null, pageSize = null) {
    const builder = this.queryBuilders.get(queryIndex)
    const state = this.paginationStates.get(queryIndex)
    
    if (!builder || !state) {
      return null
    }

    // 使用传入的参数或状态中的默认值
    const currentPage = page !== null ? page : state.currentPage
    const currentPageSize = pageSize !== null ? pageSize : state.pageSize

    // 更新状态
    if (page !== null) state.currentPage = page
    if (pageSize !== null) state.pageSize = pageSize

    // 构建分页查询
    const paginatedQuery = builder.buildPaginatedQuery(currentPage, currentPageSize, {
      respectUserLimit: state.hasUserLimit
    })

    // 构建COUNT查询
    const countQuery = builder.buildCountQuery()

    return {
      query: paginatedQuery,
      countQuery: countQuery,
      originalQuery: state.originalQuery,
      meta: {
        queryIndex,
        currentPage,
        pageSize: currentPageSize,
        hasUserLimit: state.hasUserLimit,
        userLimit: state.userLimit,
        complexity: state.complexity,
        needsCount: countQuery !== null
      }
    }
  }

  /**
   * 更新查询的分页状态
   * @param {number} queryIndex 查询索引
   * @param {Object} updates 更新的状态
   */
  updatePaginationState(queryIndex, updates) {
    const state = this.paginationStates.get(queryIndex)
    if (!state) return

    // 合并更新
    Object.assign(state, updates)

    // 重新计算总页数
    if (updates.totalRecords !== undefined || updates.pageSize !== undefined) {
      state.totalPages = state.totalRecords > 0 
        ? Math.ceil(state.totalRecords / state.pageSize)
        : 0
    }

    // 检查是否还有更多页
    if (updates.currentPage !== undefined || updates.totalPages !== undefined) {
      state.hasMore = state.currentPage < state.totalPages
    }
  }

  /**
   * 获取指定查询的分页状态
   * @param {number} queryIndex 查询索引
   * @returns {Object|null} 分页状态
   */
  getPaginationState(queryIndex) {
    const state = this.paginationStates.get(queryIndex)
    return state ? { ...state } : null
  }

  /**
   * 获取所有可分页查询的状态
   * @returns {Map} 所有分页状态的Map
   */
  getAllPaginationStates() {
    const states = new Map()
    for (const [index, state] of this.paginationStates.entries()) {
      states.set(index, { ...state })
    }
    return states
  }

  /**
   * 检查指定查询是否支持分页
   * @param {number} queryIndex 查询索引
   * @returns {boolean} 是否支持分页
   */
  isPaginationEnabled(queryIndex) {
    return this.queryBuilders.has(queryIndex)
  }

  /**
   * 重置指定查询的分页状态
   * @param {number} queryIndex 查询索引
   */
  resetPagination(queryIndex) {
    const state = this.paginationStates.get(queryIndex)
    if (!state) return

    state.currentPage = 1
    state.totalRecords = 0
    state.totalPages = 0
    state.hasMore = false
    state.isCountLoading = false
    state.countError = null
  }

  /**
   * 重置所有查询的分页状态
   */
  resetAllPagination() {
    for (const index of this.paginationStates.keys()) {
      this.resetPagination(index)
    }
  }

  /**
   * 获取分页统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    return {
      totalQueries: this.queryMapping.size,
      paginableQueries: this.queryBuilders.size,
      queriesWithUserLimit: Array.from(this.paginationStates.values())
        .filter(state => state.hasUserLimit).length,
      averageComplexity: this.calculateAverageComplexity(),
      statesSnapshot: this.getAllPaginationStates()
    }
  }

  /**
   * 计算平均查询复杂度
   * @returns {number} 平均复杂度
   */
  calculateAverageComplexity() {
    const states = Array.from(this.paginationStates.values())
    if (states.length === 0) return 0
    
    const totalComplexity = states.reduce((sum, state) => sum + (state.complexity || 0), 0)
    return totalComplexity / states.length
  }

  /**
   * 清理管理器状态
   */
  cleanup() {
    this.queryBuilders.clear()
    this.paginationStates.clear()
    this.queryMapping.clear()
  }

  /**
   * 导出配置用于持久化
   * @returns {Object} 可序列化的配置对象
   */
  exportConfig() {
    const config = {
      queries: Array.from(this.queryMapping.entries()),
      states: Array.from(this.paginationStates.entries()).map(([index, state]) => [
        index,
        {
          ...state,
          // 移除不可序列化的字段
          originalQuery: undefined
        }
      ])
    }
    
    return config
  }

  /**
   * 从配置恢复状态
   * @param {Object} config 配置对象
   * @param {Array<string>} queries 查询数组
   */
  importConfig(config, queries) {
    this.cleanup()
    
    // 重新初始化
    this.initializeBatchPagination(queries)
    
    // 恢复状态
    if (config.states) {
      for (const [index, savedState] of config.states) {
        const currentState = this.paginationStates.get(index)
        if (currentState && savedState) {
          Object.assign(currentState, savedState, {
            // 恢复原始查询
            originalQuery: queries[index]
          })
        }
      }
    }
  }
}