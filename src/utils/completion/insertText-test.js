/**
 * 字段补全插入格式修复测试
 * 验证AS别名的字段补全是否插入正确的格式
 */

// 测试场景
const insertTextTestCases = [
  {
    name: 'AS别名字段补全 - 标准格式',
    sql: 'SELECT u. FROM users AS u',
    cursorPos: 9, // 在 u. 后面
    expectedBehavior: {
      tableName: 'users',
      tableAlias: 'u',
      currentWord: 'u.',
      shouldInsert: 'username', // 只插入字段名，因为别名已存在
      expectedResult: 'SELECT u.username FROM users AS u'
    }
  },
  
  {
    name: 'JOIN中的AS别名字段补全',
    sql: 'SELECT u.username, o. FROM users AS u JOIN orders AS o ON u.id = o.user_id',
    cursorPos: 20, // 在 o. 后面
    expectedBehavior: {
      tableName: 'orders',
      tableAlias: 'o', 
      currentWord: 'o.',
      shouldInsert: 'order_id', // 只插入字段名
      expectedResult: 'SELECT u.username, o.order_id FROM users AS u JOIN orders AS o ON u.id = o.user_id'
    }
  },
  
  {
    name: '无AS关键字的别名',
    sql: 'SELECT u. FROM users u',
    cursorPos: 9, // 在 u. 后面
    expectedBehavior: {
      tableName: 'users',
      tableAlias: 'u',
      currentWord: 'u.',
      shouldInsert: 'username', // 只插入字段名
      expectedResult: 'SELECT u.username FROM users u'
    }
  },
  
  {
    name: '全局字段补全 - 应该使用别名',
    sql: 'SELECT  FROM users AS u', // 光标在SELECT后面
    cursorPos: 7,
    expectedBehavior: {
      tableName: 'users',
      tableAlias: 'u',
      currentWord: '',
      shouldInsert: 'u.username', // 应该包含别名前缀
      expectedResult: 'SELECT u.username FROM users AS u'
    }
  },
  
  {
    name: '混合别名格式',
    sql: 'SELECT  FROM users AS u JOIN orders o', // 光标在SELECT后面
    cursorPos: 7,
    expectedBehavior: {
      tableName: 'users', // 假设选择users表的字段
      tableAlias: 'u',
      currentWord: '',
      shouldInsert: 'u.username', // 应该使用别名前缀
      expectedResult: 'SELECT u.username FROM users AS u JOIN orders o'
    }
  }
]

console.log('📋 字段补全插入格式测试用例:')
insertTextTestCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`)
  console.log(`   SQL: "${testCase.sql}"`)
  console.log(`   光标位置: ${testCase.cursorPos}`)
  console.log(`   期望插入: "${testCase.expectedBehavior.shouldInsert}"`)
  console.log(`   期望结果: "${testCase.expectedBehavior.expectedResult}"`)
})

console.log('\n🎯 修复重点:')
console.log('1. 当用户输入 "u." 时，补全应该只插入字段名 (如 "username")')
console.log('2. 当用户进行全局字段补全时，应该使用表别名作为前缀 (如 "u.username")')
console.log('3. 优先使用别名而不是原表名')
console.log('4. 正确解析AS关键字，避免将"AS"当作别名')

// 导出测试用例供实际测试使用
export { insertTextTestCases }