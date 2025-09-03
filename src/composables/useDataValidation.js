import { ref } from 'vue'

/**
 * 数据验证 Composable
 * 提供字段值的验证功能，支持各种数据类型和约束
 */
export function useDataValidation(column, constraints) {
  const validationErrors = ref([])
  
  // 数据类型检查函数
  const isValidType = (value, dataType) => {
    if (value === null || value === undefined || value === '') {
      return true // 空值交给非空约束处理
    }
    
    const type = dataType.toLowerCase()
    
    try {
      // 整数类型
      if (type.includes('int') || type.includes('serial')) {
        const num = Number(value)
        return Number.isInteger(num) && !isNaN(num)
      }
      
      // 浮点数类型
      if (type.includes('decimal') || type.includes('numeric') || 
          type.includes('float') || type.includes('double')) {
        const num = Number(value)
        return !isNaN(num) && isFinite(num)
      }
      
      // 字符串类型
      if (type.includes('char') || type.includes('text') || 
          type.includes('varchar') || type.includes('longtext') ||
          type.includes('mediumtext') || type.includes('tinytext')) {
        return typeof value === 'string'
      }
      
      // 日期时间类型
      if (type.includes('date') || type.includes('time') || type.includes('timestamp')) {
        if (typeof value === 'string') {
          const date = new Date(value)
          return !isNaN(date.getTime())
        }
        return value instanceof Date && !isNaN(value.getTime())
      }
      
      // 布尔类型
      if (type.includes('bool') || type.includes('tinyint')) {
        if (typeof value === 'boolean') return true
        if (typeof value === 'number') return value === 0 || value === 1
        if (typeof value === 'string') {
          const lower = value.toLowerCase()
          return ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'].includes(lower)
        }
        return false
      }
      
      // JSON类型
      if (type.includes('json')) {
        if (typeof value === 'object') return true
        if (typeof value === 'string') {
          try {
            JSON.parse(value)
            return true
          } catch (e) {
            return false
          }
        }
        return false
      }
      
      // 二进制类型
      if (type.includes('blob') || type.includes('binary')) {
        return typeof value === 'string' || value instanceof ArrayBuffer || value instanceof Uint8Array
      }
      
      // ENUM类型
      if (type.includes('enum')) {
        // 这里需要从约束中获取可选值列表
        if (constraints.enum_values && Array.isArray(constraints.enum_values)) {
          return constraints.enum_values.includes(value)
        }
        return true // 如果没有约束信息，暂时通过
      }
      
      // 默认通过
      return true
    } catch (e) {
      return false
    }
  }
  
  // 长度验证
  const validateLength = (value, maxLength) => {
    if (!value) return true
    const length = String(value).length
    return length <= maxLength
  }
  
  // 数值范围验证
  const validateRange = (value, min, max) => {
    if (value === null || value === undefined || value === '') return true
    const num = Number(value)
    if (isNaN(num)) return false
    
    if (min !== null && num < min) return false
    if (max !== null && num > max) return false
    return true
  }
  
  // 精度验证（小数位数）
  const validatePrecision = (value, precision, scale) => {
    if (!value) return true
    const num = Number(value)
    if (isNaN(num)) return false
    
    // 检查总位数
    const totalDigits = num.toString().replace(/[.-]/g, '').length
    if (totalDigits > precision) return false
    
    // 检查小数位数
    if (scale !== undefined) {
      const decimalPart = num.toString().split('.')[1] || ''
      if (decimalPart.length > scale) return false
    }
    
    return true
  }
  
  // 正则表达式验证
  const validatePattern = (value, pattern) => {
    if (!value || !pattern) return true
    try {
      const regex = new RegExp(pattern)
      return regex.test(String(value))
    } catch (e) {
      return true // 如果正则表达式无效，跳过验证
    }
  }
  
  // 唯一性验证（这里只是接口，实际需要查询数据库）
  const validateUniqueness = async (value, tableName, columnName, currentRowId) => {
    // 这里需要实际的数据库查询
    // 暂时返回true，实际应该调用API检查唯一性
    return true
  }
  
  // 主验证函数
  const validateValue = (value) => {
    const errors = []
    const dataType = column.data_type || column.type || 'varchar'
    
    // 非空验证
    if (constraints.not_null) {
      if (value === null || value === undefined || 
          (typeof value === 'string' && value.trim() === '')) {
        errors.push('此字段不能为空')
        return errors // 如果是空值且不允许为空，直接返回
      }
    }
    
    // 如果值为空但允许为空，跳过后续验证
    if (value === null || value === undefined || 
        (typeof value === 'string' && value.trim() === '')) {
      return errors
    }
    
    // 数据类型验证
    if (!isValidType(value, dataType)) {
      errors.push(`值类型与字段类型 ${dataType} 不匹配`)
    }
    
    // 长度验证
    if (constraints.max_length || constraints.character_maximum_length) {
      const maxLen = constraints.max_length || constraints.character_maximum_length
      if (!validateLength(value, maxLen)) {
        errors.push(`长度不能超过 ${maxLen} 个字符`)
      }
    }
    
    // 数值范围验证
    if (dataType.includes('int') || dataType.includes('decimal') || 
        dataType.includes('float') || dataType.includes('double')) {
      
      // 从数据类型中提取范围信息
      let min = null, max = null
      
      if (dataType.includes('tinyint')) {
        min = dataType.includes('unsigned') ? 0 : -128
        max = dataType.includes('unsigned') ? 255 : 127
      } else if (dataType.includes('smallint')) {
        min = dataType.includes('unsigned') ? 0 : -32768
        max = dataType.includes('unsigned') ? 65535 : 32767
      } else if (dataType.includes('mediumint')) {
        min = dataType.includes('unsigned') ? 0 : -8388608
        max = dataType.includes('unsigned') ? 16777215 : 8388607
      } else if (dataType.includes('int')) {
        min = dataType.includes('unsigned') ? 0 : -2147483648
        max = dataType.includes('unsigned') ? 4294967295 : 2147483647
      }
      
      if (constraints.min_value !== undefined) min = constraints.min_value
      if (constraints.max_value !== undefined) max = constraints.max_value
      
      if (!validateRange(value, min, max)) {
        if (min !== null && max !== null) {
          errors.push(`数值必须在 ${min} 到 ${max} 之间`)
        } else if (min !== null) {
          errors.push(`数值不能小于 ${min}`)
        } else if (max !== null) {
          errors.push(`数值不能大于 ${max}`)
        }
      }
    }
    
    // 精度验证
    if ((dataType.includes('decimal') || dataType.includes('numeric')) && 
        constraints.numeric_precision) {
      if (!validatePrecision(
        value, 
        constraints.numeric_precision, 
        constraints.numeric_scale
      )) {
        errors.push(`数值精度不符合要求 (${constraints.numeric_precision}${
          constraints.numeric_scale ? `,${constraints.numeric_scale}` : ''
        })`)
      }
    }
    
    // 模式验证
    if (constraints.pattern) {
      if (!validatePattern(value, constraints.pattern)) {
        errors.push('值不符合指定的格式要求')
      }
    }
    
    // 枚举值验证
    if (constraints.enum_values && Array.isArray(constraints.enum_values)) {
      if (!constraints.enum_values.includes(value)) {
        errors.push(`值必须是以下选项之一: ${constraints.enum_values.join(', ')}`)
      }
    }
    
    // JSON格式验证
    if (dataType.includes('json') && typeof value === 'string') {
      try {
        JSON.parse(value)
      } catch (e) {
        errors.push('JSON格式不正确: ' + e.message)
      }
    }
    
    // 日期格式验证
    if (dataType.includes('date') || dataType.includes('time') || dataType.includes('timestamp')) {
      if (typeof value === 'string') {
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          errors.push('日期时间格式不正确')
        } else {
          // 检查日期范围
          if (dataType === 'date') {
            const minDate = new Date('1000-01-01')
            const maxDate = new Date('9999-12-31')
            if (date < minDate || date > maxDate) {
              errors.push('日期超出允许范围 (1000-01-01 到 9999-12-31)')
            }
          }
        }
      }
    }
    
    return errors
  }
  
  // 批量验证多个值
  const validateMultiple = (values) => {
    const results = new Map()
    
    values.forEach((value, key) => {
      const errors = validateValue(value)
      if (errors.length > 0) {
        results.set(key, errors)
      }
    })
    
    return results
  }
  
  // 验证字段约束兼容性
  const validateConstraints = () => {
    const warnings = []
    
    // 检查约束冲突
    if (constraints.not_null && constraints.default_value === null) {
      warnings.push('字段不允许为空但默认值为NULL')
    }
    
    if (constraints.unique && constraints.auto_increment) {
      // 通常是合理的，但可以提醒
      warnings.push('自动递增字段通常已经是唯一的')
    }
    
    if (constraints.max_length && constraints.max_length <= 0) {
      warnings.push('最大长度必须大于0')
    }
    
    return warnings
  }
  
  // 获取字段的建议值
  const getSuggestedValues = () => {
    const suggestions = []
    const dataType = (column.data_type || '').toLowerCase()
    
    // 根据数据类型提供建议
    if (dataType.includes('bool')) {
      suggestions.push(true, false)
    } else if (dataType.includes('int')) {
      suggestions.push(0, 1, -1)
      if (constraints.auto_increment) {
        suggestions.push('(自动生成)')
      }
    } else if (dataType.includes('date')) {
      const now = new Date()
      suggestions.push(
        now.toISOString().split('T')[0], // 今天
        new Date(now.getTime() - 86400000).toISOString().split('T')[0], // 昨天
        new Date(now.getTime() + 86400000).toISOString().split('T')[0]  // 明天
      )
    } else if (dataType.includes('time')) {
      suggestions.push('00:00:00', '12:00:00', '23:59:59')
    } else if (dataType.includes('json')) {
      suggestions.push('{}', '[]', '{"key": "value"}')
    }
    
    // 添加枚举值
    if (constraints.enum_values && Array.isArray(constraints.enum_values)) {
      suggestions.push(...constraints.enum_values)
    }
    
    // 添加默认值
    if (constraints.default_value !== undefined && constraints.default_value !== null) {
      suggestions.unshift(constraints.default_value)
    }
    
    return [...new Set(suggestions)] // 去重
  }
  
  // 格式化值为数据库存储格式
  const formatForDatabase = (value) => {
    if (value === null || value === undefined) return null
    
    const dataType = (column.data_type || '').toLowerCase()
    
    try {
      // 布尔值转换
      if (dataType.includes('bool') || dataType.includes('tinyint')) {
        if (typeof value === 'boolean') return value ? 1 : 0
        if (typeof value === 'string') {
          const lower = value.toLowerCase()
          if (['true', '1', 'yes', 'y'].includes(lower)) return 1
          if (['false', '0', 'no', 'n'].includes(lower)) return 0
        }
        return value ? 1 : 0
      }
      
      // 数字类型
      if (dataType.includes('int') || dataType.includes('decimal') || 
          dataType.includes('float') || dataType.includes('double')) {
        const num = Number(value)
        if (isNaN(num)) return value // 保持原值，让验证器处理错误
        
        if (dataType.includes('int')) {
          return Math.round(num)
        }
        
        // 处理精度
        if (constraints.numeric_scale !== undefined) {
          return Number(num.toFixed(constraints.numeric_scale))
        }
        
        return num
      }
      
      // JSON类型
      if (dataType.includes('json')) {
        if (typeof value === 'object') {
          return JSON.stringify(value)
        }
        if (typeof value === 'string') {
          // 验证JSON格式
          JSON.parse(value)
          return value
        }
      }
      
      // 日期时间类型
      if (dataType.includes('date') || dataType.includes('time') || dataType.includes('timestamp')) {
        if (value instanceof Date) {
          if (dataType === 'date') {
            return value.toISOString().split('T')[0]
          } else if (dataType === 'time') {
            return value.toTimeString().split(' ')[0]
          } else {
            return value.toISOString().replace('T', ' ').replace('Z', '')
          }
        }
        if (typeof value === 'string') {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            return formatForDatabase.call(this, date)
          }
        }
      }
      
      // 字符串类型 - 处理长度截断
      if (typeof value === 'string' && 
          (constraints.max_length || constraints.character_maximum_length)) {
        const maxLen = constraints.max_length || constraints.character_maximum_length
        if (value.length > maxLen) {
          return value.substring(0, maxLen)
        }
      }
      
      return value
    } catch (e) {
      return value // 格式化失败，返回原值
    }
  }
  
  return {
    validationErrors,
    validateValue,
    validateMultiple,
    validateConstraints,
    isValidType,
    getSuggestedValues,
    formatForDatabase
  }
}