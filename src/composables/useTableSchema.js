import { ref } from 'vue'
import { useConnectionStore } from '@/stores/connection.js'

/**
 * 表结构和数据类型处理 Composable
 * 用于获取表结构元数据、进行数据类型转换等功能
 */
export function useTableSchema() {
  const connectionStore = useConnectionStore()
  const cachedSchemas = ref(new Map()) // 缓存表结构信息
  
  /**
   * 获取表结构元数据
   */
  const fetchTableSchema = async (tableName) => {
    if (!tableName) {
      console.warn('表名为空，无法获取表结构')
      return null
    }
    
    // 检查缓存
    const cacheKey = `${connectionStore.currentConnection?.id}_${tableName}`
    if (cachedSchemas.value.has(cacheKey)) {
      console.log('🔍 使用缓存的表结构:', tableName)
      return cachedSchemas.value.get(cacheKey)
    }
    
    try {
      const connection = connectionStore.currentConnection
      if (!connection) {
        throw new Error('没有可用的数据库连接')
      }
      
      // 通过INFORMATION_SCHEMA获取表结构
      const schemaSql = `
        SELECT 
          COLUMN_NAME as column_name,
          DATA_TYPE as data_type,
          IS_NULLABLE as is_nullable,
          COLUMN_DEFAULT as column_default,
          COLUMN_KEY as column_key,
          EXTRA as extra,
          CHARACTER_MAXIMUM_LENGTH as max_length,
          NUMERIC_PRECISION as numeric_precision,
          NUMERIC_SCALE as numeric_scale,
          ORDINAL_POSITION as ordinal_position
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `
      
      console.log(`🔍 获取表结构: ${tableName}`)
      const result = await connectionStore.executeQuery(connection.id, schemaSql.replace('?', `'${tableName}'`))
      
      if (!result?.rows || result.rows.length === 0) {
        console.warn(`表 ${tableName} 不存在或无字段`)
        return null
      }
      
      // 构建表结构对象
      const schema = {
        table_name: tableName,
        name: tableName,
        columns: result.rows.map((row, index) => ({
          name: row[0], // column_name
          column_name: row[0],
          data_type: row[1], // data_type
          is_nullable: row[2] === 'YES',
          not_null: row[2] === 'NO',
          column_default: row[3],
          primary_key: row[4] === 'PRI',
          is_primary_key: row[4] === 'PRI',
          auto_increment: (row[5] || '').includes('auto_increment'),
          is_auto_increment: (row[5] || '').includes('auto_increment'),
          max_length: row[6],
          character_maximum_length: row[6],
          numeric_precision: row[7],
          numeric_scale: row[8],
          ordinal_position: row[9] || index + 1,
          extra: row[5] || ''
        }))
      }
      
      // 缓存结果
      cachedSchemas.value.set(cacheKey, schema)
      console.log(`✅ 获取表结构成功: ${tableName}，共 ${schema.columns.length} 个字段`)
      
      return schema
      
    } catch (error) {
      console.error('获取表结构失败:', error)
      return null
    }
  }
  
  /**
   * 从查询语句中提取表名（改进实现）
   */
  const extractTableName = (query) => {
    if (!query) return null
    
    try {
      const cleanQuery = query.trim().replace(/;\s*$/, '') // 移除末尾分号
      console.log(`🔍 分析SQL表名: ${cleanQuery.substring(0, 100)}...`)
      
      // 正则表达式匹配各种表名模式
      const patterns = [
        // SELECT ... FROM table_name 或 SELECT ... FROM `table_name`
        /FROM\s+(?:`([^`]+)`|([\w]+))/i,
        // SELECT ... FROM db.table_name
        /FROM\s+(?:`[^`]+`\.|\w+\.)(?:`([^`]+)`|([\w]+))/i,
        // UPDATE table_name SET
        /UPDATE\s+(?:`([^`]+)`|([\w]+))\s+SET/i,
        // INSERT INTO table_name
        /INSERT\s+INTO\s+(?:`([^`]+)`|([\w]+))/i,
        // DELETE FROM table_name
        /DELETE\s+FROM\s+(?:`([^`]+)`|([\w]+))/i
      ]
      
      for (const pattern of patterns) {
        const match = cleanQuery.match(pattern)
        if (match) {
          // 获取匹配的表名（不包含反引号）
          const tableName = match[1] || match[2]
          if (tableName && tableName !== 'unknown_table') {
            console.log(`✅ 提取到表名: ${tableName}`)
            return tableName.toLowerCase()
          }
        }
      }
      
      console.warn(`⚠️ 无法从 SQL 中提取表名: ${cleanQuery.substring(0, 50)}`)
      return null
      
    } catch (error) {
      console.error('提取表名失败:', error)
      return null
    }
  }
  
  /**
   * 从查询结果中推断表结构
   * @param {Object} queryResult - 查询结果
   * @param {string} originalSQL - 原始 SQL 语句
   * @returns {Promise<Object>} 表结构信息
   */
  const inferTableSchemaFromQuery = async (queryResult, originalSQL) => {
    if (!queryResult || !queryResult.columns) {
      console.warn('查询结果为空，无法推断表结构')
      return null
    }
    
    // 尝试从 SQL 中提取表名
    const tableName = extractTableName(originalSQL)
    console.log(`🎯 检测到的表名: ${tableName}`)
    
    if (tableName && tableName !== 'unknown_table') {
      // 尝试获取真实的表结构
      const realSchema = await fetchTableSchema(tableName)
      if (realSchema) {
        console.log(`✨ 获取到真实表结构: ${tableName}`)
        return realSchema
      }
    }
    
    // 无法获取真实结构时，基于查询结果推断
    console.log('🤔 无法获取真实表结构，开始推断...')
    
    const columns = queryResult.columns.map((column, index) => {
      const columnName = typeof column === 'string' ? column : 
        (column.name || column.column_name || `column_${index}`)
      
      return {
        name: columnName,
        column_name: columnName,
        data_type: inferDataTypeFromSample(queryResult.rows, index),
        is_nullable: true, // 保守估计
        not_null: false,
        column_default: null,
        column_key: '',
        primary_key: false,
        is_primary_key: false,
        auto_increment: false,
        is_auto_increment: false,
        max_length: null,
        character_maximum_length: null,
        numeric_precision: null,
        numeric_scale: null,
        ordinal_position: index + 1,
        extra: '',
        inferred: true // 标记为推断的
      }
    })
    
    const inferredTableName = tableName || 'inferred_table'
    
    return {
      table_name: inferredTableName,
      name: inferredTableName,
      columns: columns,
      inferred: true
    }
  }
  
  /**
   * 从样本数据推断数据类型
   */
  const inferDataTypeFromSample = (rows, columnIndex) => {
    if (!rows || rows.length === 0) return 'varchar'
    
    const samples = rows.slice(0, 50)
      .map(row => row[columnIndex])
      .filter(val => val !== null && val !== undefined && val !== '')
    
    if (samples.length === 0) return 'varchar'
    
    // 检查是否是数字
    const numericCount = samples.filter(val => {
      const num = Number(val)
      return !isNaN(num) && isFinite(num)
    }).length
    
    if (numericCount / samples.length > 0.8) {
      const hasDecimals = samples.some(val => String(val).includes('.'))
      return hasDecimals ? 'decimal' : 'int'
    }
    
    // 检查是否是日期
    const dateCount = samples.filter(val => {
      if (typeof val === 'object' && val instanceof Date) return true
      const dateStr = String(val)
      return dateStr.match(/^\d{4}-\d{2}-\d{2}/) || dateStr.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:/)
    }).length
    
    if (dateCount / samples.length > 0.8) {
      return 'datetime'
    }
    
    // 检查是否是布尔值
    const boolCount = samples.filter(val => {
      return val === true || val === false || val === 0 || val === 1 || 
             val === '0' || val === '1' || val === 'true' || val === 'false'
    }).length
    
    if (boolCount / samples.length > 0.8) {
      return 'tinyint'
    }
    
    return 'varchar'
  }
  
  /**
   * 数据类型转换工具
   */
  const convertStringToType = (value, dataType) => {
    if (value === null || value === undefined) return null
    
    const upperType = (dataType || '').toUpperCase()
    
    try {
      // 整数类型
      if (upperType.includes('INT') || upperType.includes('INTEGER')) {
        return value === '' ? null : parseInt(value, 10)
      }
      
      // 浮点数类型
      if (upperType.includes('DECIMAL') || upperType.includes('FLOAT') || 
          upperType.includes('DOUBLE') || upperType.includes('NUMERIC')) {
        return value === '' ? null : parseFloat(value)
      }
      
      // 日期时间类型
      if (upperType.includes('DATE') || upperType.includes('TIME') || upperType.includes('TIMESTAMP')) {
        if (value === '' || value === '0000-00-00' || value === '0000-00-00 00:00:00') {
          return null
        }
        try {
          return new Date(value)
        } catch (dateError) {
          console.warn(`日期转换失败: ${value}`)
          return value // 转换失败时保持原值
        }
      }
      
      // 布尔类型
      if (upperType.includes('BOOL') || (upperType === 'TINYINT' && value !== null)) {
        return value === '1' || value === 1 || value === 'true' || value === true
      }
      
      // JSON类型
      if (upperType.includes('JSON')) {
        if (value === '' || value === null) return null
        try {
          return typeof value === 'string' ? JSON.parse(value) : value
        } catch (jsonError) {
          console.warn(`JSON转换失败: ${value}`)
          return value
        }
      }
      
      // 默认返回字符串
      return value
    } catch (error) {
      console.warn(`类型转换失败: ${value} -> ${dataType}`, error)
      return value // 转换失败时返回原值
    }
  }
  
  /**
   * 处理查询结果，进行类型转换
   */
  const processQueryResult = async (result, query) => {
    if (!result?.rows || !result?.columns) {
      return result
    }
    
    try {
      // 尝试从查询中提取表名
      const tableName = extractTableName(query)
      
      if (tableName) {
        // 获取表结构
        const schema = await fetchTableSchema(tableName)
        
        if (schema?.columns) {
          console.log(`🔄 开始类型转换，表: ${tableName}`)
          
          // 转换每行数据的类型
          const processedRows = result.rows.map(row => 
            row.map((value, colIndex) => {
              const column = schema.columns[colIndex]
              if (column) {
                const convertedValue = convertStringToType(value, column.data_type)
                // 只在调试模式下输出转换详情
                if (process.env.NODE_ENV === 'development' && convertedValue !== value) {
                  console.log(`🔄 ${column.column_name}: "${value}" (${typeof value}) -> "${convertedValue}" (${typeof convertedValue})`)
                }
                return convertedValue
              }
              return value
            })
          )
          
          return {
            ...result,
            rows: processedRows,
            schema: schema, // 附加表结构信息
            originalRows: result.rows // 保留原始数据用于对比
          }
        }
      }
      
      // 如果无法获取表结构，返回原始结果
      return result
      
    } catch (error) {
      console.warn('查询结果类型转换失败:', error)
      return result
    }
  }
  
  /**
   * 根据数据类型判断是否为复杂类型（需要浮窗编辑）
   */
  const isComplexType = (dataType, maxLength = null) => {
    if (!dataType) return false
    
    const upperType = dataType.toUpperCase()
    
    // JSON类型
    if (upperType.includes('JSON')) return true
    
    // 长文本类型
    if (upperType.includes('TEXT') && upperType !== 'TEXT') return true // LONGTEXT, MEDIUMTEXT
    if (upperType.includes('BLOB')) return true
    if (upperType.includes('BINARY')) return true
    
    // 长度超过阈值的VARCHAR
    if (upperType.includes('VARCHAR') && maxLength && maxLength > 100) return true
    
    return false
  }
  
  /**
   * 根据数据类型获取合适的编辑器组件名
   */
  const getEditorComponent = (column) => {
    if (!column?.data_type) return 'TextEditor'
    
    const dataType = column.data_type.toUpperCase()
    const maxLength = column.max_length || column.character_maximum_length
    
    // 复杂类型使用浮窗编辑器
    if (isComplexType(column.data_type, maxLength)) {
      return 'CellEditor' // 浮窗编辑器
    }
    
    // 简单类型使用内联编辑器
    if (dataType.includes('INT') || dataType.includes('DECIMAL') || 
        dataType.includes('FLOAT') || dataType.includes('DOUBLE')) {
      return 'NumberEditor'
    }
    
    if (dataType.includes('DATE') || dataType.includes('TIME')) {
      return 'DateEditor'
    }
    
    if (dataType.includes('BOOL') || (dataType === 'TINYINT' && maxLength === 1)) {
      return 'BooleanEditor'
    }
    
    return 'TextEditor' // 默认文本编辑器
  }
  
  /**
   * 清除缓存
   */
  const clearSchemaCache = (tableName = null) => {
    if (tableName) {
      const cacheKey = `${connectionStore.currentConnection?.id}_${tableName}`
      cachedSchemas.value.delete(cacheKey)
    } else {
      cachedSchemas.value.clear()
    }
  }
  
  return {
    // 表结构相关
    fetchTableSchema,
    extractTableName,
    inferTableSchemaFromQuery,
    clearSchemaCache,
    
    // 类型转换相关
    convertStringToType,
    processQueryResult,
    
    // 编辑器选择相关
    isComplexType,
    getEditorComponent,
    
    // 状态
    cachedSchemas
  }
}