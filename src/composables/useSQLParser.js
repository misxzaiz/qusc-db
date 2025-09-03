/**
 * SQL语法解析器
 * 为智能补全提供精确的SQL上下文分析
 */

export function useSQLParser() {
  
  // SQL关键字定义
  const SQL_KEYWORDS = {
    STATEMENT_STARTERS: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'SHOW', 'DESCRIBE'],
    CLAUSES: ['FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET'],
    OPERATORS: ['AND', 'OR', 'NOT', 'LIKE', 'IN', 'EXISTS', 'BETWEEN', 'IS', 'NULL'],
    FUNCTIONS: ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CONCAT', 'SUBSTRING', 'LENGTH', 'UPPER', 'LOWER', 'DATE', 'NOW']
  }
  
  // 解析SQL上下文的主要函数
  const parseContext = (sql, cursorPosition) => {
    const beforeCursor = sql.slice(0, cursorPosition)
    const afterCursor = sql.slice(cursorPosition)
    
    return {
      statementType: detectStatementType(beforeCursor),
      currentClause: detectCurrentClause(beforeCursor),
      expectedCompletionType: detectCompletionType(beforeCursor),
      tables: extractTableReferences(sql),
      aliases: extractAliases(sql),
      currentWord: extractCurrentWord(beforeCursor),
      context: analyzeDetailedContext(beforeCursor, afterCursor),
      cursorPosition,
      beforeCursor,
      afterCursor
    }
  }
  
  // 检测SQL语句类型
  const detectStatementType = (sql) => {
    const trimmed = sql.trim().toUpperCase()
    
    for (const starter of SQL_KEYWORDS.STATEMENT_STARTERS) {
      if (trimmed.startsWith(starter)) {
        return starter
      }
    }
    
    return 'UNKNOWN'
  }
  
  // 检测当前所在的SQL子句
  const detectCurrentClause = (sql) => {
    const upperSql = sql.toUpperCase()
    let currentClause = 'SELECT' // 默认子句
    let lastClausePosition = -1
    
    // 按顺序查找SQL子句
    const clauseOrder = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT']
    
    for (const clause of clauseOrder) {
      const positions = findAllOccurrences(upperSql, clause)
      if (positions.length > 0) {
        const lastPos = positions[positions.length - 1]
        if (lastPos > lastClausePosition) {
          lastClausePosition = lastPos
          currentClause = clause
        }
      }
    }
    
    // 特殊处理JOIN子句
    const joinTypes = ['JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN']
    for (const joinType of joinTypes) {
      const positions = findAllOccurrences(upperSql, joinType)
      if (positions.length > 0) {
        const lastPos = positions[positions.length - 1]
        if (lastPos > lastClausePosition) {
          currentClause = 'JOIN'
        }
      }
    }
    
    return currentClause
  }
  
  // 检测期望的补全类型
  const detectCompletionType = (sql) => {
    const trimmed = sql.trim()
    const upperSql = trimmed.toUpperCase()
    
    // 检查是否在点号后面 - 明确的字段补全
    if (trimmed.endsWith('.')) {
      return 'COLUMN'
    }
    
    // 检查是否在表别名后面跟点号 - 字段补全
    const dotPattern = /(\w+)\.(\w*)$/
    if (dotPattern.test(trimmed)) {
      return 'COLUMN'
    }
    
    // 分析当前子句上下文
    const currentClause = detectCurrentClause(sql)
    
    switch (currentClause) {
      case 'SELECT':
        // SELECT子句中可能是字段名、函数或关键字
        if (isAfterComma(trimmed) || isAfterSelect(trimmed)) {
          return 'COLUMN_OR_FUNCTION'
        }
        return 'COLUMN_OR_KEYWORD'
        
      case 'FROM':
        // FROM子句中期望表名
        if (isExpectingTableName(trimmed, 'FROM')) {
          return 'TABLE'
        }
        return 'TABLE_OR_KEYWORD'
        
      case 'JOIN':
        // JOIN子句中期望表名
        if (isExpectingTableName(trimmed, 'JOIN')) {
          return 'TABLE'
        }
        return 'TABLE_OR_KEYWORD'
        
      case 'WHERE':
        // WHERE子句中可能是字段名、操作符或值
        return 'COLUMN_OR_OPERATOR'
        
      case 'GROUP BY':
      case 'ORDER BY':
        // GROUP BY和ORDER BY中期望字段名
        return 'COLUMN'
        
      case 'HAVING':
        // HAVING子句中期望字段名或聚合函数
        return 'COLUMN_OR_FUNCTION'
        
      default:
        return 'KEYWORD'
    }
  }
  
  // 提取表引用
  const extractTableReferences = (sql) => {
    const tables = []
    const upperSql = sql.toUpperCase()
    
    // 匹配FROM子句
    const fromPattern = /FROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi
    let match
    while ((match = fromPattern.exec(sql)) !== null) {
      tables.push({
        name: match[1],
        alias: match[2] || null,
        type: 'FROM'
      })
    }
    
    // 匹配各种JOIN子句
    const joinPattern = /((?:INNER|LEFT|RIGHT|FULL)\s+)?JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi
    while ((match = joinPattern.exec(sql)) !== null) {
      tables.push({
        name: match[2],
        alias: match[3] || null,
        type: 'JOIN',
        joinType: match[1] ? match[1].trim() : 'INNER'
      })
    }
    
    return tables
  }
  
  // 提取别名映射
  const extractAliases = (sql) => {
    const aliases = new Map()
    const tables = extractTableReferences(sql)
    
    tables.forEach(table => {
      if (table.alias) {
        aliases.set(table.alias.toLowerCase(), table.name.toLowerCase())
      }
      // 表名本身也可以作为引用
      aliases.set(table.name.toLowerCase(), table.name.toLowerCase())
    })
    
    return aliases
  }
  
  // 提取当前光标位置的单词
  const extractCurrentWord = (sql) => {
    // 匹配光标前的最后一个单词（可能包含点号）
    const match = sql.match(/[\w.]*$/)
    return match ? match[0] : ''
  }
  
  // 分析详细上下文
  const analyzeDetailedContext = (beforeCursor, afterCursor) => {
    return {
      isAfterComma: isAfterComma(beforeCursor),
      isAfterSelect: isAfterSelect(beforeCursor),
      isAfterFrom: isAfterFrom(beforeCursor),
      isAfterWhere: isAfterWhere(beforeCursor),
      isAfterJoin: isAfterJoin(beforeCursor),
      isInParentheses: isInParentheses(beforeCursor),
      isAfterOperator: isAfterOperator(beforeCursor),
      parenthesesLevel: countParentheses(beforeCursor),
      previousKeyword: getPreviousKeyword(beforeCursor)
    }
  }
  
  // 辅助函数：查找所有出现位置
  const findAllOccurrences = (str, searchStr) => {
    const positions = []
    let position = 0
    
    while ((position = str.indexOf(searchStr, position)) !== -1) {
      positions.push(position)
      position += searchStr.length
    }
    
    return positions
  }
  
  // 检查是否在逗号后面
  const isAfterComma = (sql) => {
    const trimmed = sql.trim()
    return trimmed.endsWith(',') || /,\s*\w*$/.test(trimmed)
  }
  
  // 检查是否在SELECT后面
  const isAfterSelect = (sql) => {
    return /SELECT\s+$/i.test(sql.trim())
  }
  
  // 检查是否在FROM后面
  const isAfterFrom = (sql) => {
    return /FROM\s+$/i.test(sql.trim())
  }
  
  // 检查是否在WHERE后面
  const isAfterWhere = (sql) => {
    return /WHERE\s+$/i.test(sql.trim())
  }
  
  // 检查是否在JOIN后面
  const isAfterJoin = (sql) => {
    return /(?:(?:INNER|LEFT|RIGHT|FULL)\s+)?JOIN\s+$/i.test(sql.trim())
  }
  
  // 检查是否期望表名
  const isExpectingTableName = (sql, clause) => {
    const pattern = new RegExp(`${clause}\\s+$`, 'i')
    return pattern.test(sql.trim())
  }
  
  // 检查是否在括号内
  const isInParentheses = (sql) => {
    let openCount = 0
    let closeCount = 0
    
    for (const char of sql) {
      if (char === '(') openCount++
      if (char === ')') closeCount++
    }
    
    return openCount > closeCount
  }
  
  // 检查是否在操作符后面
  const isAfterOperator = (sql) => {
    const operators = ['=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'IN', 'NOT IN', 'EXISTS', 'NOT EXISTS']
    const trimmed = sql.trim().toUpperCase()
    
    return operators.some(op => trimmed.endsWith(op))
  }
  
  // 计算括号层级
  const countParentheses = (sql) => {
    let level = 0
    for (const char of sql) {
      if (char === '(') level++
      if (char === ')') level--
    }
    return Math.max(0, level)
  }
  
  // 获取前一个关键字
  const getPreviousKeyword = (sql) => {
    const words = sql.trim().toUpperCase().split(/\s+/)
    const allKeywords = [
      ...SQL_KEYWORDS.STATEMENT_STARTERS,
      ...SQL_KEYWORDS.CLAUSES,
      ...SQL_KEYWORDS.OPERATORS,
      ...SQL_KEYWORDS.FUNCTIONS
    ]
    
    // 从后往前查找关键字
    for (let i = words.length - 1; i >= 0; i--) {
      if (allKeywords.includes(words[i])) {
        return words[i]
      }
    }
    
    return null
  }
  
  // 验证SQL语法（基础验证）
  const validateSQLSyntax = (sql) => {
    const errors = []
    
    // 检查括号匹配
    let parenthesesCount = 0
    for (const char of sql) {
      if (char === '(') parenthesesCount++
      if (char === ')') parenthesesCount--
      if (parenthesesCount < 0) {
        errors.push('括号不匹配：多余的右括号')
        break
      }
    }
    if (parenthesesCount > 0) {
      errors.push('括号不匹配：缺少右括号')
    }
    
    // 检查引号匹配
    const singleQuoteCount = (sql.match(/'/g) || []).length
    const doubleQuoteCount = (sql.match(/"/g) || []).length
    
    if (singleQuoteCount % 2 !== 0) {
      errors.push('单引号不匹配')
    }
    if (doubleQuoteCount % 2 !== 0) {
      errors.push('双引号不匹配')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  // 格式化SQL语句（简单格式化）
  const formatSQL = (sql) => {
    return sql
      .replace(/\s+/g, ' ')  // 合并多个空白字符
      .replace(/,\s*/g, ', ')  // 逗号后添加空格
      .replace(/\(\s*/g, '(')   // 左括号后去掉空格
      .replace(/\s*\)/g, ')')   // 右括号前去掉空格
      .trim()
  }
  
  // 检测SQL中的安全问题（基础检测）
  const detectSecurityIssues = (sql) => {
    const warnings = []
    const upperSql = sql.toUpperCase()
    
    // 检查潜在的SQL注入模式
    if (upperSql.includes('DROP TABLE') || upperSql.includes('DELETE FROM') || upperSql.includes('TRUNCATE')) {
      warnings.push('检测到潜在的危险操作')
    }
    
    // 检查是否有注释符号（可能用于SQL注入）
    if (sql.includes('--') || sql.includes('/*') || sql.includes('*/')) {
      warnings.push('检测到SQL注释符号')
    }
    
    return warnings
  }
  
  return {
    // 主要解析函数
    parseContext,
    
    // 辅助解析函数
    detectStatementType,
    detectCurrentClause,
    detectCompletionType,
    extractTableReferences,
    extractAliases,
    extractCurrentWord,
    
    // 验证和格式化
    validateSQLSyntax,
    formatSQL,
    detectSecurityIssues,
    
    // 常量
    SQL_KEYWORDS
  }
}