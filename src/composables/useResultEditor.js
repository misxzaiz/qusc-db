import { ref, computed, reactive, watch } from 'vue'
import { useDataValidation } from './useDataValidation.js'
import { useNotificationStore } from '@/stores/notification.js'
import { useConnectionStore } from '@/stores/connection.js'

/**
 * 结果编辑器 Composable
 * 核心的查询结果编辑功能，包括状态管理、变更追踪、数据验证等
 */
export function useResultEditor(originalRows, tableSchema) {
  const notificationStore = useNotificationStore()
  const connectionStore = useConnectionStore()
  
  // 编辑状态
  const editableRows = ref([...originalRows])
  const pendingChanges = ref(new Map())
  const editingCell = ref(null)
  const isCommitting = ref(false)
  const changeHistory = ref([])
  
  // 表结构信息
  const schema = ref({})
  
  // 监听表结构变化
  watch(tableSchema, (newSchema) => {
    if (newSchema && newSchema.table_name) {
      const isDifferent = !schema.value?.table_name || 
                         schema.value.table_name !== newSchema.table_name ||
                         schema.value.columns?.length !== newSchema.columns?.length
      
      if (isDifferent) {
        console.log('🔄 useResultEditor 更新表结构:', {
          from: schema.value?.table_name || 'unknown',
          to: newSchema?.table_name || 'unknown',
          columns: newSchema?.columns?.length || 0,
          inferred: newSchema.inferred,
          fallback: newSchema.fallback
        })
        schema.value = newSchema
      }
    }
  }, { immediate: true, deep: true })
  
  // 计算属性
  const hasChanges = computed(() => pendingChanges.value.size > 0)
  
  const changeCount = computed(() => pendingChanges.value.size)
  
  const canCommit = computed(() => {
    return hasChanges.value && !isCommitting.value && validateAllChanges()
  })
  
  // 获取表的主键字段
  const primaryKeyColumns = computed(() => {
    if (!schema.value.columns) return []
    return schema.value.columns
      .filter(col => col.primary_key || col.is_primary_key)
      .map(col => col.name || col.column_name)
  })
  
  // 获取表名
  const tableName = computed(() => {
    return schema.value.table_name || schema.value.name || 'unknown_table'
  })
  
  // 方法
  
  /**
   * 开始编辑单元格
   */
  const startEdit = (rowIndex, colIndex) => {
    if (isReadonlyRow(rowIndex) || isReadonlyColumn(colIndex)) {
      notificationStore.warning('该单元格为只读，无法编辑')
      return false
    }
    
    editingCell.value = {
      rowIndex,
      colIndex,
      originalValue: editableRows.value[rowIndex]?.[colIndex],
      startTime: Date.now()
    }
    
    return true
  }
  
  /**
   * 保存单元格编辑
   */
  const saveCell = (rowIndex, colIndex, newValue) => {
    const originalValue = originalRows[rowIndex]?.[colIndex]
    
    // 如果值没有改变，不需要保存
    if (newValue === originalValue) {
      cancelEdit()
      return
    }
    
    // 验证新值
    const column = getColumnMetadata(colIndex)
    const constraints = getColumnConstraints(colIndex)
    const { validateValue, formatForDatabase } = useDataValidation(column, constraints)
    
    const errors = validateValue(newValue)
    if (errors.length > 0) {
      notificationStore.error('验证失败: ' + errors.join(', '))
      return false
    }
    
    // 格式化值
    const formattedValue = formatForDatabase(newValue)
    
    // 更新编辑表格数据
    if (!editableRows.value[rowIndex]) {
      editableRows.value[rowIndex] = [...originalRows[rowIndex]]
    }
    editableRows.value[rowIndex][colIndex] = formattedValue
    
    // 记录变更
    const changeKey = `${rowIndex}_${colIndex}`
    const change = {
      rowIndex,
      colIndex,
      columnName: getColumnName(colIndex),
      oldValue: originalValue,
      newValue: formattedValue,
      timestamp: Date.now(),
      validated: true
    }
    
    pendingChanges.value.set(changeKey, change)
    
    // 添加到历史记录
    changeHistory.value.push({
      action: 'cell_edit',
      change: { ...change },
      timestamp: Date.now()
    })
    
    // 清除编辑状态
    editingCell.value = null
    
    console.log(`📝 保存单元格编辑: [${rowIndex}, ${colIndex}] ${originalValue} -> ${formattedValue}`)
    
    return true
  }
  
  /**
   * 取消编辑
   */
  const cancelEdit = () => {
    editingCell.value = null
  }
  
  /**
   * 检查单元格是否已修改
   */
  const isModified = (rowIndex, colIndex) => {
    const changeKey = `${rowIndex}_${colIndex}`
    return pendingChanges.value.has(changeKey)
  }
  
  /**
   * 检查行是否有修改
   */
  const hasRowChanges = (rowIndex) => {
    for (const [key] of pendingChanges.value) {
      if (key.startsWith(`${rowIndex}_`)) {
        return true
      }
    }
    return false
  }
  
  /**
   * 验证所有变更
   */
  const validateAllChanges = () => {
    for (const change of pendingChanges.value.values()) {
      if (!change.validated) {
        const column = getColumnMetadata(change.colIndex)
        const constraints = getColumnConstraints(change.colIndex)
        const { validateValue } = useDataValidation(column, constraints)
        
        const errors = validateValue(change.newValue)
        if (errors.length > 0) {
          return false
        }
      }
    }
    return true
  }
  
  /**
   * 生成UPDATE SQL语句
   */
  const generateSQL = () => {
    if (pendingChanges.value.size === 0) return ''
    
    // 按行分组变更
    const changesByRow = new Map()
    for (const change of pendingChanges.value.values()) {
      if (!changesByRow.has(change.rowIndex)) {
        changesByRow.set(change.rowIndex, [])
      }
      changesByRow.get(change.rowIndex).push(change)
    }
    
    const sqlStatements = []
    
    for (const [rowIndex, rowChanges] of changesByRow.entries()) {
      const setClauses = []
      const whereClause = buildWhereClause(rowIndex)
      
      if (!whereClause) {
        console.warn(`无法为行 ${rowIndex} 生成WHERE子句，跳过`)
        continue
      }
      
      for (const change of rowChanges) {
        const formattedValue = formatValueForSQL(change.newValue, change.colIndex)
        setClauses.push(`${change.columnName} = ${formattedValue}`)
      }
      
      const sql = `UPDATE ${tableName.value} SET ${setClauses.join(', ')} WHERE ${whereClause}`
      sqlStatements.push(sql)
    }
    
    return sqlStatements.join(';\n') + ';'
  }
  
  /**
   * 构建WHERE子句
   */
  const buildWhereClause = (rowIndex) => {
    const row = originalRows[rowIndex]
    if (!row) {
      console.warn(`❌ 无法找到原始行数据: ${rowIndex}`)
      return null
    }
    
    console.log(`🔍 构建WHERE子句 - 行${rowIndex}:`, row)
    
    // 优先使用主键
    if (primaryKeyColumns.value.length > 0) {
      const conditions = []
      for (const pkCol of primaryKeyColumns.value) {
        const colIndex = getColumnIndexByName(pkCol)
        if (colIndex !== -1 && row[colIndex] !== null && row[colIndex] !== undefined) {
          const originalValue = row[colIndex]
          const formattedValue = formatValueForSQL(originalValue, colIndex)
          conditions.push(`${pkCol} = ${formattedValue}`)
          console.log(`🔑 主键条件: ${pkCol} = ${formattedValue} (原值: ${originalValue})`)
        }
      }
      if (conditions.length > 0) {
        const whereClause = conditions.join(' AND ')
        console.log(`✅ 主键WHERE子句: ${whereClause}`)
        return whereClause
      }
    }
    
    // 如果没有主键，使用所有非空且未被修改的字段作为条件
    const conditions = []
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const originalValue = row[colIndex]
      
      // 跳过空值
      if (originalValue === null || originalValue === undefined) {
        continue
      }
      
      // 跳过已修改的字段，避免在WHERE中使用不稳定的值
      if (isModified(rowIndex, colIndex)) {
        console.log(`⚠️ 跳过已修改字段 ${getColumnName(colIndex)}`)
        continue
      }
      
      const columnName = getColumnName(colIndex)
      const formattedValue = formatValueForSQL(originalValue, colIndex)
      conditions.push(`${columnName} = ${formattedValue}`)
      console.log(`📝 条件: ${columnName} = ${formattedValue} (原值: ${originalValue})`)
    }
    
    if (conditions.length === 0) {
      console.warn(`❌ 无法为行 ${rowIndex} 生成WHERE条件 - 所有字段都为空或已修改`)
      return null
    }
    
    const whereClause = conditions.join(' AND ')
    console.log(`✅ 完整WHERE子句: ${whereClause}`)
    return whereClause
  }
  
  /**
   * 格式化值为SQL格式
   */
  const formatValueForSQL = (value, colIndex) => {
    if (value === null || value === undefined) {
      return 'NULL'
    }
    
    const column = getColumnMetadata(colIndex)
    const dataType = (column?.data_type || '').toLowerCase()
    
    // 字符串类型需要引号并转义
    if (dataType.includes('char') || dataType.includes('text') || 
        dataType.includes('enum') || dataType.includes('set')) {
      return `'${String(value).replace(/'/g, "''")}'`
    }
    
    // 日期时间类型需要引号
    if (dataType.includes('date') || dataType.includes('time') || dataType.includes('timestamp')) {
      return `'${value}'`
    }
    
    // JSON类型需要引号
    if (dataType.includes('json')) {
      const jsonStr = typeof value === 'string' ? value : JSON.stringify(value)
      return `'${jsonStr.replace(/'/g, "''")}'`
    }
    
    // 布尔类型转换为数字
    if (dataType.includes('bool') || dataType.includes('tinyint')) {
      return value ? '1' : '0'
    }
    
    // 数字类型直接返回
    return String(value)
  }
  
  /**
   * 提交所有变更
   */
  const commitChanges = async () => {
    if (!canCommit.value) {
      throw new Error('当前状态无法提交变更')
    }
    
    isCommitting.value = true
    
    try {
      const sql = generateSQL()
      console.log('📤 提交SQL:', sql)
      
      // 使用真实的数据库连接执行SQL
      const connection = connectionStore.currentConnection
      if (!connection) {
        throw new Error('没有可用的数据库连接')
      }
      
      const result = await connectionStore.executeQuery(connection.id, sql)
      console.log('✅ 提交结果:', result)
      
      // 提交成功，将变更应用到原始数据并清除变更记录
      applyChangesToOriginal()
      clearAllChanges()
      
      notificationStore.success(`成功提交 ${changeCount.value} 处修改`)
      
    } catch (error) {
      console.error('提交变更失败:', error)
      notificationStore.error('提交失败: ' + error.message)
      throw error
    } finally {
      isCommitting.value = false
    }
  }
  
  /**
   * 将变更应用到原始数据
   */
  const applyChangesToOriginal = () => {
    for (const change of pendingChanges.value.values()) {
      if (originalRows[change.rowIndex]) {
        originalRows[change.rowIndex][change.colIndex] = change.newValue
      }
    }
  }
  
  /**
   * 撤销所有变更
   */
  const revertAll = () => {
    // 恢复编辑数据到原始状态
    editableRows.value = originalRows.map(row => [...row])
    
    // 清除所有变更记录
    clearAllChanges()
    
    // 取消当前编辑
    cancelEdit()
    
    notificationStore.info('已撤销所有未提交的修改')
  }
  
  /**
   * 撤销单个变更
   */
  const revertChange = (rowIndex, colIndex) => {
    const changeKey = `${rowIndex}_${colIndex}`
    
    if (pendingChanges.value.has(changeKey)) {
      // 恢复原始值
      editableRows.value[rowIndex][colIndex] = originalRows[rowIndex][colIndex]
      
      // 移除变更记录
      pendingChanges.value.delete(changeKey)
      
      notificationStore.info('已撤销该单元格的修改')
    }
  }
  
  /**
   * 清除所有变更记录
   */
  const clearAllChanges = () => {
    pendingChanges.value.clear()
    changeHistory.value = []
  }
  
  /**
   * 检查行是否只读
   */
  const isReadonlyRow = (rowIndex) => {
    // 这里可以添加行级别的只读逻辑
    // 例如：某些系统记录、已删除的记录等
    return false
  }
  
  /**
   * 检查列是否只读
   */
  const isReadonlyColumn = (colIndex) => {
    const column = getColumnMetadata(colIndex)
    if (!column) return false
    
    // 主键通常只读（除非是新记录）
    if (column.primary_key || column.is_primary_key) return true
    
    // 自动递增字段只读
    if (column.auto_increment || column.is_auto_increment) return true
    
    // 计算字段只读
    if (column.generated || column.is_generated) return true
    
    // 时间戳字段（如果是自动更新的）
    if (column.extra && column.extra.includes('on update')) return true
    
    return false
  }
  
  /**
   * 获取列元数据
   */
  const getColumnMetadata = (colIndex) => {
    if (!schema.value.columns || !schema.value.columns[colIndex]) {
      return {
        name: `column_${colIndex}`,
        data_type: 'varchar',
        column_name: `column_${colIndex}`
      }
    }
    return schema.value.columns[colIndex]
  }
  
  /**
   * 获取列约束
   */
  const getColumnConstraints = (colIndex) => {
    const column = getColumnMetadata(colIndex)
    return {
      not_null: column.not_null || column.is_nullable === 'NO',
      max_length: column.max_length || column.character_maximum_length,
      primary_key: column.primary_key || column.is_primary_key,
      unique: column.unique || column.is_unique,
      auto_increment: column.auto_increment || column.is_auto_increment,
      default_value: column.default_value || column.column_default,
      numeric_precision: column.numeric_precision,
      numeric_scale: column.numeric_scale,
      enum_values: column.enum_values
    }
  }
  
  /**
   * 获取列名
   */
  const getColumnName = (colIndex) => {
    const column = getColumnMetadata(colIndex)
    return column.name || column.column_name || `column_${colIndex}`
  }
  
  /**
   * 根据列名获取列索引
   */
  const getColumnIndexByName = (columnName) => {
    if (!schema.value.columns) return -1
    
    for (let i = 0; i < schema.value.columns.length; i++) {
      const col = schema.value.columns[i]
      if ((col.name || col.column_name) === columnName) {
        return i
      }
    }
    return -1
  }
  
  /**
   * 获取变更统计
   */
  const getChangeStats = () => {
    const stats = {
      totalChanges: pendingChanges.value.size,
      changesByType: new Map(),
      affectedRows: new Set(),
      affectedColumns: new Set()
    }
    
    for (const change of pendingChanges.value.values()) {
      const column = getColumnMetadata(change.colIndex)
      const dataType = column.data_type || 'unknown'
      
      stats.changesByType.set(dataType, (stats.changesByType.get(dataType) || 0) + 1)
      stats.affectedRows.add(change.rowIndex)
      stats.affectedColumns.add(change.columnName)
    }
    
    return {
      ...stats,
      affectedRows: stats.affectedRows.size,
      affectedColumns: stats.affectedColumns.size
    }
  }
  
  /**
   * 导出变更为JSON
   */
  const exportChanges = () => {
    const changes = []
    
    for (const change of pendingChanges.value.values()) {
      changes.push({
        row: change.rowIndex,
        column: change.columnName,
        oldValue: change.oldValue,
        newValue: change.newValue,
        timestamp: change.timestamp
      })
    }
    
    return {
      tableName: tableName.value,
      timestamp: Date.now(),
      changes: changes,
      stats: getChangeStats()
    }
  }
  
  /**
   * 导入变更
   */
  const importChanges = (exportedData) => {
    if (exportedData.tableName !== tableName.value) {
      throw new Error('表名不匹配，无法导入变更')
    }
    
    for (const change of exportedData.changes) {
      const colIndex = getColumnIndexByName(change.column)
      if (colIndex !== -1) {
        saveCell(change.row, colIndex, change.newValue)
      }
    }
    
    notificationStore.success(`成功导入 ${exportedData.changes.length} 处变更`)
  }
  
  return {
    // 状态
    editableRows,
    pendingChanges,
    editingCell,
    isCommitting,
    changeHistory,
    hasChanges,
    changeCount,
    canCommit,
    
    // 编辑方法
    startEdit,
    saveCell,
    cancelEdit,
    isModified,
    hasRowChanges,
    
    // 提交相关
    validateAllChanges,
    generateSQL,
    commitChanges,
    revertAll,
    revertChange,
    
    // 工具方法
    isReadonlyRow,
    isReadonlyColumn,
    getColumnMetadata,
    getColumnConstraints,
    getColumnName,
    getChangeStats,
    exportChanges,
    importChanges
  }
}