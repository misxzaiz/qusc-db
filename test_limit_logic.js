// 测试LIMIT添加逻辑的脚本
// 这是一个临时测试文件，用于验证SQL LIMIT添加功能

// 复制processQueryWithLimit函数进行测试
const processQueryWithLimit = (query, offset = 0, pageSize = 20) => {
  let trimmedQuery = query.trim()
  
  // 只处理SELECT语句（忽略大小写，允许前面有注释）
  const selectMatch = trimmedQuery.match(/^\s*(?:\/\*.*?\*\/\s*)?(?:--.*?\n\s*)?SELECT\s+/is)
  if (!selectMatch) {
    return query
  }
  
  // 移除末尾的分号以便处理
  let hasSemicolon = false
  if (trimmedQuery.endsWith(';')) {
    trimmedQuery = trimmedQuery.slice(0, -1).trim()
    hasSemicolon = true
  }
  
  // 改进的LIMIT检测：更准确地匹配LIMIT子句
  const limitPattern = /\bLIMIT\s+(?:\d+\s*,\s*)?\d+(?:\s+OFFSET\s+\d+)?\s*$/i
  
  if (limitPattern.test(trimmedQuery)) {
    // 已经有LIMIT，不再添加新的LIMIT
    return hasSemicolon ? trimmedQuery + ';' : trimmedQuery
  }
  
  // 更智能的SQL结构分析
  const sqlParts = {
    main: trimmedQuery,
    orderBy: '',
    groupBy: '',
    having: '',
    where: ''
  }
  
  // 从后往前匹配各个子句，避免嵌套查询的干扰
  let remainingQuery = trimmedQuery
  
  // 匹配ORDER BY（最后一个）
  const orderByMatch = remainingQuery.match(/^(.*?)(\s+ORDER\s+BY\s+.+?)$/i)
  if (orderByMatch) {
    sqlParts.main = orderByMatch[1].trim()
    sqlParts.orderBy = orderByMatch[2]
    remainingQuery = sqlParts.main
  }
  
  // 匹配GROUP BY和HAVING
  const groupByMatch = remainingQuery.match(/^(.*?)(\s+GROUP\s+BY\s+.+?)(\s+HAVING\s+.+?)?$/i)
  if (groupByMatch) {
    sqlParts.main = groupByMatch[1].trim()
    sqlParts.groupBy = groupByMatch[2] || ''
    sqlParts.having = groupByMatch[3] || ''
  }
  
  // 构建最终查询
  const limitClause = offset > 0 ? ` LIMIT ${offset}, ${pageSize}` : ` LIMIT ${pageSize}`
  
  let finalQuery = sqlParts.main + 
                  sqlParts.groupBy + 
                  sqlParts.having + 
                  sqlParts.orderBy + 
                  limitClause
  
  // 恢复分号
  return hasSemicolon ? finalQuery + ';' : finalQuery
}

// 测试用例
const testCases = [
  {
    name: '基本SELECT查询',
    input: 'SELECT * FROM users',
    expected: 'SELECT * FROM users LIMIT 20'
  },
  {
    name: '带分号的SELECT查询', 
    input: 'SELECT * FROM users;',
    expected: 'SELECT * FROM users LIMIT 20;'
  },
  {
    name: '带ORDER BY的查询',
    input: 'SELECT * FROM users ORDER BY id DESC',
    expected: 'SELECT * FROM users ORDER BY id DESC LIMIT 20'
  },
  {
    name: '带ORDER BY和分号的查询',
    input: 'SELECT * FROM users ORDER BY name ASC;',
    expected: 'SELECT * FROM users ORDER BY name ASC LIMIT 20;'
  },
  {
    name: '已有LIMIT的查询',
    input: 'SELECT * FROM users LIMIT 10',
    expected: 'SELECT * FROM users LIMIT 10'
  },
  {
    name: '已有LIMIT和分号的查询',
    input: 'SELECT * FROM users LIMIT 5;',
    expected: 'SELECT * FROM users LIMIT 5;'
  },
  {
    name: '带GROUP BY的查询',
    input: 'SELECT category, COUNT(*) FROM products GROUP BY category',
    expected: 'SELECT category, COUNT(*) FROM products GROUP BY category LIMIT 20'
  },
  {
    name: '带GROUP BY和ORDER BY的查询',
    input: 'SELECT category, COUNT(*) FROM products GROUP BY category ORDER BY COUNT(*) DESC',
    expected: 'SELECT category, COUNT(*) FROM products GROUP BY category ORDER BY COUNT(*) DESC LIMIT 20'
  },
  {
    name: 'INSERT查询（不应添加LIMIT）',
    input: 'INSERT INTO users (name) VALUES ("test")',
    expected: 'INSERT INTO users (name) VALUES ("test")'
  },
  {
    name: 'UPDATE查询（不应添加LIMIT）',
    input: 'UPDATE users SET name = "test" WHERE id = 1',
    expected: 'UPDATE users SET name = "test" WHERE id = 1'
  },
  {
    name: '带注释的SELECT查询',
    input: '/* 获取用户列表 */ SELECT * FROM users',
    expected: '/* 获取用户列表 */ SELECT * FROM users LIMIT 20'
  }
]

// 运行测试
console.log('🧪 开始测试LIMIT添加逻辑...\n')

let passedTests = 0
let totalTests = testCases.length

testCases.forEach((testCase, index) => {
  const result = processQueryWithLimit(testCase.input)
  const passed = result === testCase.expected
  
  if (passed) {
    passedTests++
    console.log(`✅ 测试 ${index + 1}: ${testCase.name}`)
  } else {
    console.log(`❌ 测试 ${index + 1}: ${testCase.name}`)
    console.log(`   输入: ${testCase.input}`)
    console.log(`   期望: ${testCase.expected}`)
    console.log(`   实际: ${result}`)
  }
})

console.log(`\n📊 测试结果: ${passedTests}/${totalTests} 通过`)

if (passedTests === totalTests) {
  console.log('🎉 所有测试通过！LIMIT添加逻辑工作正常！')
} else {
  console.log('⚠️  部分测试失败，需要修复逻辑')
}