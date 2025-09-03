import { ref } from 'vue'
import { useNotificationStore } from '@/stores/notification.js'

export function useDataExport() {
  const notificationStore = useNotificationStore()
  
  const isExporting = ref(false)
  const supportedFormats = [
    { key: 'json', name: 'JSON', extension: 'json', mime: 'application/json' },
    { key: 'csv', name: 'CSV', extension: 'csv', mime: 'text/csv' },
    { key: 'tsv', name: 'TSV', extension: 'tsv', mime: 'text/tab-separated-values' },
    { key: 'xml', name: 'XML', extension: 'xml', mime: 'application/xml' },
    { key: 'sql', name: 'SQL Insert', extension: 'sql', mime: 'text/plain' },
    { key: 'excel', name: 'Excel', extension: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  ]
  
  // JSON格式导出
  const exportToJSON = (data, options = {}) => {
    const {
      filename = 'export',
      pretty = true,
      includeMetadata = true
    } = options
    
    let exportData = data
    
    if (includeMetadata && data.rows && data.columns) {
      exportData = {
        metadata: {
          exported_at: new Date().toISOString(),
          total_rows: data.rows.length,
          columns: data.columns.map(col => ({
            name: col.name || col,
            type: col.type || 'unknown'
          })),
          query: data.query || '',
          connection: data.connection || ''
        },
        data: data.rows.map((row, index) => {
          const obj = { _row_id: index + 1 }
          data.columns.forEach((col, colIndex) => {
            const columnName = col.name || col || `column_${colIndex}`
            obj[columnName] = row[colIndex]
          })
          return obj
        })
      }
    }
    
    const jsonString = pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData)
    return {
      content: jsonString,
      filename: `${filename}.json`,
      mime: 'application/json'
    }
  }
  
  // CSV格式导出
  const exportToCSV = (data, options = {}) => {
    const {
      filename = 'export',
      delimiter = ',',
      includeHeaders = true,
      encoding = 'utf-8-bom'
    } = options
    
    if (!data.rows || !data.columns) {
      throw new Error('数据格式不正确，缺少rows或columns')
    }
    
    const rows = []
    
    // 添加表头
    if (includeHeaders) {
      const headers = data.columns.map(col => {
        const name = col.name || col || 'column'
        // 转义包含分隔符或引号的字段
        return name.includes(delimiter) || name.includes('"') || name.includes('\n')
          ? `"${name.replace(/"/g, '""')}"` 
          : name
      })
      rows.push(headers.join(delimiter))
    }
    
    // 添加数据行
    data.rows.forEach(row => {
      const csvRow = row.map(cell => {
        let value = cell === null || cell === undefined ? '' : String(cell)
        // 转义包含分隔符或引号的字段
        return value.includes(delimiter) || value.includes('"') || value.includes('\n')
          ? `"${value.replace(/"/g, '""')}"` 
          : value
      })
      rows.push(csvRow.join(delimiter))
    })
    
    let content = rows.join('\n')
    
    // 添加BOM以支持中文
    if (encoding === 'utf-8-bom') {
      content = '\uFEFF' + content
    }
    
    return {
      content,
      filename: `${filename}.csv`,
      mime: 'text/csv;charset=utf-8'
    }
  }
  
  // TSV格式导出（Tab分隔）
  const exportToTSV = (data, options = {}) => {
    return exportToCSV(data, { 
      ...options, 
      delimiter: '\t',
      filename: options.filename || 'export',
    })
  }
  
  // XML格式导出
  const exportToXML = (data, options = {}) => {
    const {
      filename = 'export',
      rootElement = 'data',
      rowElement = 'row'
    } = options
    
    if (!data.rows || !data.columns) {
      throw new Error('数据格式不正确，缺少rows或columns')
    }
    
    const escapeXML = (str) => {
      return String(str === null || str === undefined ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += `<${rootElement}>\n`
    
    // 添加元数据
    xml += '  <metadata>\n'
    xml += `    <exported_at>${new Date().toISOString()}</exported_at>\n`
    xml += `    <total_rows>${data.rows.length}</total_rows>\n`
    xml += '    <columns>\n'
    data.columns.forEach(col => {
      const name = col.name || col || 'column'
      xml += `      <column name="${escapeXML(name)}" type="${escapeXML(col.type || 'unknown')}"/>\n`
    })
    xml += '    </columns>\n'
    xml += '  </metadata>\n'
    
    // 添加数据
    xml += '  <records>\n'
    data.rows.forEach((row, rowIndex) => {
      xml += `    <${rowElement} id="${rowIndex + 1}">\n`
      data.columns.forEach((col, colIndex) => {
        const columnName = col.name || col || `column_${colIndex}`
        const value = row[colIndex]
        xml += `      <${escapeXML(columnName)}>${escapeXML(value)}</${escapeXML(columnName)}>\n`
      })
      xml += `    </${rowElement}>\n`
    })
    xml += '  </records>\n'
    xml += `</${rootElement}>`
    
    return {
      content: xml,
      filename: `${filename}.xml`,
      mime: 'application/xml'
    }
  }
  
  // SQL Insert语句导出
  const exportToSQL = (data, options = {}) => {
    const {
      filename = 'export',
      tableName = 'exported_data',
      includeCreateTable = true,
      batchSize = 1000
    } = options
    
    if (!data.rows || !data.columns) {
      throw new Error('数据格式不正确，缺少rows或columns')
    }
    
    const escapeSQL = (value) => {
      if (value === null || value === undefined) return 'NULL'
      if (typeof value === 'number') return value
      if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
      return `'${String(value).replace(/'/g, "''")}'`
    }
    
    const columnNames = data.columns.map(col => {
      const name = col.name || col || 'column'
      return `\`${name}\``
    })
    
    let sql = `-- 导出数据 - ${new Date().toISOString()}\n`
    sql += `-- 总计 ${data.rows.length} 行数据\n\n`
    
    // 创建表语句
    if (includeCreateTable) {
      sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`
      sql += `CREATE TABLE \`${tableName}\` (\n`
      sql += data.columns.map(col => {
        const name = col.name || col || 'column'
        const type = col.type || 'TEXT'
        return `  \`${name}\` ${type}`
      }).join(',\n')
      sql += '\n);\n\n'
    }
    
    // 插入数据
    if (data.rows.length > 0) {
      sql += `INSERT INTO \`${tableName}\` (${columnNames.join(', ')}) VALUES\n`
      
      const batches = []
      for (let i = 0; i < data.rows.length; i += batchSize) {
        batches.push(data.rows.slice(i, i + batchSize))
      }
      
      batches.forEach((batch, batchIndex) => {
        const values = batch.map(row => {
          const rowValues = row.map(escapeSQL)
          return `  (${rowValues.join(', ')})`
        })
        
        if (batchIndex > 0) {
          sql += `\nINSERT INTO \`${tableName}\` (${columnNames.join(', ')}) VALUES\n`
        }
        
        sql += values.join(',\n') + ';\n'
      })
    }
    
    return {
      content: sql,
      filename: `${filename}.sql`,
      mime: 'text/plain'
    }
  }
  
  // 通用导出方法
  const exportData = async (data, format, options = {}) => {
    if (!data) {
      throw new Error('没有数据可以导出')
    }
    
    isExporting.value = true
    
    try {
      let result
      
      switch (format) {
        case 'json':
          result = exportToJSON(data, options)
          break
        case 'csv':
          result = exportToCSV(data, options)
          break
        case 'tsv':
          result = exportToTSV(data, options)
          break
        case 'xml':
          result = exportToXML(data, options)
          break
        case 'sql':
          result = exportToSQL(data, options)
          break
        case 'excel':
          // Excel导出需要额外的库，这里先抛出错误
          throw new Error('Excel格式导出功能正在开发中')
        default:
          throw new Error(`不支持的导出格式: ${format}`)
      }
      
      // 创建并下载文件
      const blob = new Blob([result.content], { type: result.mime })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      URL.revokeObjectURL(url)
      
      notificationStore.success(`数据已导出为 ${result.filename}`)
      
      return result
    } catch (error) {
      notificationStore.error('导出失败: ' + error.message)
      throw error
    } finally {
      isExporting.value = false
    }
  }
  
  // 获取格式信息
  const getFormatInfo = (format) => {
    return supportedFormats.find(f => f.key === format)
  }
  
  // 预览导出内容
  const previewExport = (data, format, options = {}) => {
    try {
      let result
      const previewOptions = { ...options, filename: 'preview' }
      
      switch (format) {
        case 'json':
          result = exportToJSON(data, previewOptions)
          break
        case 'csv':
          result = exportToCSV(data, previewOptions)
          break
        case 'tsv':
          result = exportToTSV(data, previewOptions)
          break
        case 'xml':
          result = exportToXML(data, previewOptions)
          break
        case 'sql':
          result = exportToSQL(data, previewOptions)
          break
        default:
          throw new Error(`不支持预览格式: ${format}`)
      }
      
      return {
        content: result.content,
        size: new Blob([result.content]).size,
        filename: result.filename
      }
    } catch (error) {
      throw new Error('预览生成失败: ' + error.message)
    }
  }
  
  return {
    // 状态
    isExporting,
    supportedFormats,
    
    // 导出方法
    exportData,
    exportToJSON,
    exportToCSV,
    exportToTSV,
    exportToXML,
    exportToSQL,
    
    // 工具方法
    getFormatInfo,
    previewExport
  }
}