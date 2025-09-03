import { format } from 'sql-formatter'

/**
 * SQL格式化工具类
 * 提供多种数据库方言和格式化选项的支持
 */
export class SQLFormatter {
  constructor() {
    // 默认配置
    this.defaultOptions = {
      language: 'sql',
      dialect: 'mysql',
      tabWidth: 2,
      useTabs: false,
      keywordCase: 'upper',
      identifierCase: 'preserve',
      functionCase: 'upper',
      dataTypeCase: 'upper',
      linesBetweenQueries: 2,
    }
  }

  /**
   * 格式化SQL语句
   * @param {string} sql - 要格式化的SQL语句
   * @param {object} options - 格式化选项
   * @returns {string} 格式化后的SQL
   */
  format(sql, options = {}) {
    if (!sql || !sql.trim()) {
      return sql
    }

    try {
      const formatOptions = { ...this.defaultOptions, ...options }
      return format(sql, formatOptions)
    } catch (error) {
      console.error('SQL格式化失败:', error)
      return this.fallbackFormat(sql)
    }
  }

  /**
   * 根据数据库类型格式化SQL
   * @param {string} sql - SQL语句
   * @param {string} dbType - 数据库类型 (MySQL, PostgreSQL, SQLite, etc.)
   * @returns {string} 格式化后的SQL
   */
  formatForDatabase(sql, dbType) {
    const dialectMap = {
      'MySQL': 'mysql',
      'PostgreSQL': 'postgresql',
      'SQLite': 'sqlite',
      'Redis': 'redis', // Redis命令格式化
      'MariaDB': 'mariadb',
      'Oracle': 'oracle',
      'SQL Server': 'transactsql',
      'BigQuery': 'bigquery',
    }

    const dialect = dialectMap[dbType] || 'mysql'
    return this.format(sql, { dialect })
  }

  /**
   * 压缩SQL（移除多余空格和换行）
   * @param {string} sql - SQL语句
   * @returns {string} 压缩后的SQL
   */
  minify(sql) {
    if (!sql || !sql.trim()) {
      return sql
    }

    try {
      return format(sql, {
        ...this.defaultOptions,
        tabWidth: 0,
        linesBetweenQueries: 0,
      }).replace(/\s+/g, ' ').trim()
    } catch (error) {
      console.error('SQL压缩失败:', error)
      return sql.replace(/\s+/g, ' ').trim()
    }
  }

  /**
   * 美化SQL（使用更宽松的格式）
   * @param {string} sql - SQL语句
   * @returns {string} 美化后的SQL
   */
  beautify(sql) {
    return this.format(sql, {
      tabWidth: 4,
      linesBetweenQueries: 3,
      keywordCase: 'upper',
      functionCase: 'upper',
    })
  }

  /**
   * 降级格式化方案（当sql-formatter失败时使用）
   * @param {string} sql - SQL语句
   * @returns {string} 简单格式化的SQL
   */
  fallbackFormat(sql) {
    return sql
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/,/g, ',\n  ') // 逗号后换行并缩进
      .replace(/\b(SELECT|FROM|WHERE|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN)\b/gi, '\n$1') // 主要关键字前换行
      .replace(/\b(ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET)\b/gi, '\n$1') // 其他关键字前换行
      .replace(/\b(AND|OR)\b/gi, '\n  $1') // AND/OR前换行并缩进
      .replace(/^\s*\n/gm, '') // 移除空行
      .trim()
  }

  /**
   * 验证SQL语法（基础检查）
   * @param {string} sql - SQL语句
   * @returns {object} 验证结果
   */
  validate(sql) {
    if (!sql || !sql.trim()) {
      return { isValid: false, error: 'SQL语句不能为空' }
    }

    try {
      // 尝试格式化来检查语法
      format(sql, this.defaultOptions)
      return { isValid: true }
    } catch (error) {
      return { 
        isValid: false, 
        error: `SQL语法错误: ${error.message}` 
      }
    }
  }

  /**
   * 获取支持的数据库方言列表
   * @returns {Array} 方言列表
   */
  getSupportedDialects() {
    return [
      { name: 'MySQL', value: 'mysql' },
      { name: 'PostgreSQL', value: 'postgresql' },
      { name: 'SQLite', value: 'sqlite' },
      { name: 'MariaDB', value: 'mariadb' },
      { name: 'Oracle', value: 'oracle' },
      { name: 'SQL Server', value: 'transactsql' },
      { name: 'BigQuery', value: 'bigquery' },
    ]
  }
}

// 导出单例实例
export const sqlFormatter = new SQLFormatter()

// 导出便捷方法
export const formatSQL = (sql, options) => sqlFormatter.format(sql, options)
export const formatSQLForDB = (sql, dbType) => sqlFormatter.formatForDatabase(sql, dbType)
export const minifySQL = (sql) => sqlFormatter.minify(sql)
export const beautifySQL = (sql) => sqlFormatter.beautify(sql)
export const validateSQL = (sql) => sqlFormatter.validate(sql)