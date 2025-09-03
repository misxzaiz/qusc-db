import { ref } from 'vue'
import { useNotificationStore } from '@/stores/notification.js'

export function useDataImport() {
  const notificationStore = useNotificationStore()
  
  const isImporting = ref(false)
  const supportedFormats = [
    { key: 'json', name: 'JSON', extension: 'json', mime: 'application/json' },
    { key: 'csv', name: 'CSV', extension: 'csv', mime: 'text/csv' },
    { key: 'tsv', name: 'TSV', extension: 'tsv', mime: 'text/tab-separated-values' },
    { key: 'sql', name: 'SQL Insert', extension: 'sql', mime: 'text/plain' }
  ]
  
  // 检测文件格式
  const detectFormat = (file) => {
    const extension = file.name.split('.').pop().toLowerCase()
    return supportedFormats.find(f => f.extension === extension) || null
  }
  
  // CSV解析器
  const parseCSV = (content, options = {}) => {
    const {
      delimiter = ',',
      hasHeaders = true,
      skipEmptyLines = true,
      maxRows = 10000
    } = options
    
    const lines = content.split('\n')
    const rows = []
    let columns = []
    let currentRow = ''
    let inQuotes = false
    let i = 0
    
    // 解析CSV行（处理引号内的换行）
    const parsedLines = []
    for (let line of lines) {
      currentRow += line
      
      // 计算引号数量
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        }
      }
      
      if (!inQuotes) {
        if (skipEmptyLines && currentRow.trim() === '') {
          currentRow = ''
          continue
        }
        parsedLines.push(currentRow)
        currentRow = ''
      } else {
        currentRow += '\n'
      }
    }
    
    // 解析字段
    const parseRow = (line) => {
      const fields = []
      let field = ''
      let inQuotes = false
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        const nextChar = line[j + 1]
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // 双引号转义
            field += '"'
            j++ // 跳过下一个引号
          } else {
            // 切换引号状态
            inQuotes = !inQuotes
          }
        } else if (char === delimiter && !inQuotes) {
          // 字段分隔符
          fields.push(field.trim())
          field = ''
        } else {
          field += char
        }
      }
      
      fields.push(field.trim())
      return fields
    }
    
    // 处理表头
    if (hasHeaders && parsedLines.length > 0) {
      columns = parseRow(parsedLines[0]).map((name, index) => ({
        name: name || `column_${index}`,
        type: 'TEXT'
      }))
      i = 1
    } else {
      // 自动生成列名
      const firstRow = parsedLines.length > 0 ? parseRow(parsedLines[0]) : []
      columns = firstRow.map((_, index) => ({
        name: `column_${index}`,
        type: 'TEXT'
      }))
      i = 0
    }
    
    // 处理数据行
    for (let lineIndex = i; lineIndex < parsedLines.length && rows.length < maxRows; lineIndex++) {
      const fields = parseRow(parsedLines[lineIndex])
      
      // 补齐或截断字段以匹配列数
      while (fields.length < columns.length) {
        fields.push('')
      }
      if (fields.length > columns.length) {
        fields.splice(columns.length)
      }
      
      rows.push(fields)
    }
    
    return {
      columns,
      rows,
      totalRows: rows.length,
      hasMore: parsedLines.length - i > maxRows
    }
  }
  
  // JSON解析器
  const parseJSON = (content, options = {}) => {
    const { maxRows = 10000 } = options
    
    let data
    try {
      data = JSON.parse(content)
    } catch (error) {
      throw new Error('JSON格式错误: ' + error.message)
    }
    
    // 处理不同的JSON结构
    let rows = []
    let columns = []
    
    if (Array.isArray(data)) {
      // 数组格式
      if (data.length === 0) {
        throw new Error('JSON数组为空')
      }
      
      // 从第一个对象推断列结构
      const firstItem = data[0]
      if (typeof firstItem === 'object' && firstItem !== null) {
        columns = Object.keys(firstItem).map(key => ({
          name: key,
          type: 'TEXT'
        }))
        
        rows = data.slice(0, maxRows).map(item => {
          return columns.map(col => {
            const value = item[col.name]
            return value === null || value === undefined ? '' : String(value)
          })
        })
      } else {
        // 简单数组
        columns = [{ name: 'value', type: 'TEXT' }]
        rows = data.slice(0, maxRows).map(item => [String(item)])
      }
    } else if (data && typeof data === 'object') {
      // 检查是否有metadata格式（我们自己导出的格式）
      if (data.metadata && data.data && Array.isArray(data.data)) {
        columns = data.metadata.columns || []
        rows = data.data.slice(0, maxRows).map(item => {
          return columns.map(col => {
            const value = item[col.name]
            return value === null || value === undefined ? '' : String(value)
          })
        })
      } else {
        // 单个对象，转为单行
        columns = Object.keys(data).map(key => ({
          name: key,
          type: 'TEXT'
        }))
        
        rows = [columns.map(col => {
          const value = data[col.name]
          return value === null || value === undefined ? '' : String(value)
        })]
      }
    } else {
      throw new Error('不支持的JSON结构')
    }
    
    return {
      columns,
      rows,
      totalRows: rows.length,
      hasMore: Array.isArray(data) ? data.length > maxRows : false
    }
  }
  
  // SQL解析器（简单的INSERT语句解析）
  const parseSQL = (content, options = {}) => {
    const { maxRows = 10000 } = options
    
    // 提取INSERT语句
    const insertRegex = /INSERT\s+INTO\s+\w+\s*\(([^)]+)\)\s+VALUES\s*(.*?);/gis
    const matches = [...content.matchAll(insertRegex)]
    
    if (matches.length === 0) {
      throw new Error('未找到有效的INSERT语句')
    }
    
    // 解析第一个INSERT语句
    const firstMatch = matches[0]
    const columnsPart = firstMatch[1]
    const valuesPart = firstMatch[2]
    
    // 解析列名
    const columns = columnsPart
      .split(',')
      .map(col => col.trim().replace(/[`'"]/g, ''))
      .map(name => ({ name, type: 'TEXT' }))
    
    // 解析VALUES
    const valuesRegex = /\(([^)]+)\)/g
    const valueMatches = [...valuesPart.matchAll(valuesRegex)]
    
    const rows = []
    for (let i = 0; i < valueMatches.length && rows.length < maxRows; i++) {
      const valueString = valueMatches[i][1]
      const values = []
      let current = ''
      let inString = false
      let stringChar = ''
      
      for (let j = 0; j < valueString.length; j++) {
        const char = valueString[j]
        
        if (!inString && (char === "'" || char === '"')) {
          inString = true
          stringChar = char
        } else if (inString && char === stringChar) {
          inString = false
          stringChar = ''
        } else if (!inString && char === ',') {
          values.push(current.trim().replace(/^['"]|['"]$/g, ''))
          current = ''
          continue
        }
        current += char
      }
      
      if (current.trim()) {
        values.push(current.trim().replace(/^['"]|['"]$/g, ''))
      }
      
      // 处理NULL值
      const processedValues = values.map(val => {
        if (val.toUpperCase() === 'NULL') return ''
        return val
      })
      
      rows.push(processedValues)
    }
    
    return {
      columns,
      rows,
      totalRows: rows.length,
      hasMore: valueMatches.length > maxRows
    }
  }
  
  // 读取文件内容
  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        resolve(e.target.result)
      }
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }
      
      reader.readAsText(file, 'utf-8')
    })
  }
  
  // 导入数据
  const importData = async (file, options = {}) => {
    if (!file) {
      throw new Error('请选择要导入的文件')
    }
    
    isImporting.value = true
    
    try {
      const format = detectFormat(file)
      if (!format) {
        throw new Error('不支持的文件格式')
      }
      
      const content = await readFile(file)
      let result
      
      switch (format.key) {
        case 'csv':
          result = parseCSV(content, options)
          break
        case 'tsv':
          result = parseCSV(content, { ...options, delimiter: '\t' })
          break
        case 'json':
          result = parseJSON(content, options)
          break
        case 'sql':
          result = parseSQL(content, options)
          break
        default:
          throw new Error(`不支持的格式: ${format.name}`)
      }
      
      result.format = format.key
      result.filename = file.name
      result.fileSize = file.size
      
      notificationStore.success(`成功导入 ${result.totalRows} 行数据`)
      
      return result
    } catch (error) {
      notificationStore.error('导入失败: ' + error.message)
      throw error
    } finally {
      isImporting.value = false
    }
  }
  
  // 预览导入数据
  const previewImport = async (file, options = {}) => {
    const previewOptions = { 
      ...options, 
      maxRows: Math.min(options.maxRows || 100, 100) 
    }
    
    try {
      const result = await importData(file, previewOptions)
      return {
        ...result,
        isPreview: true,
        previewRows: Math.min(result.rows.length, 5) // 只显示前5行作为预览
      }
    } catch (error) {
      throw new Error('预览失败: ' + error.message)
    }
  }
  
  // 验证数据
  const validateData = (data) => {
    const errors = []
    
    if (!data.columns || data.columns.length === 0) {
      errors.push('没有找到列定义')
    }
    
    if (!data.rows || data.rows.length === 0) {
      errors.push('没有找到数据行')
    }
    
    if (data.columns && data.rows) {
      // 检查数据一致性
      const inconsistentRows = data.rows.filter(row => 
        row.length !== data.columns.length
      )
      
      if (inconsistentRows.length > 0) {
        errors.push(`发现 ${inconsistentRows.length} 行数据与列数不匹配`)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  // 获取文件信息
  const getFileInfo = (file) => {
    const format = detectFormat(file)
    
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      format: format ? format.name : '未知格式',
      supported: !!format
    }
  }
  
  return {
    // 状态
    isImporting,
    supportedFormats,
    
    // 导入方法
    importData,
    previewImport,
    
    // 解析方法
    parseCSV,
    parseJSON,
    parseSQL,
    
    // 工具方法
    detectFormat,
    readFile,
    validateData,
    getFileInfo
  }
}