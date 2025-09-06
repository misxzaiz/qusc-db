import DatabaseService from '@/services/databaseService'

/**
 * MySQL 数据库结构构建器
 */
export class MySQLStructureBuilder {
  /**
   * 构建 MySQL 数据库树节点
   * @param {Object} structure - 数据库结构数据
   * @param {Object} parentConnection - 父连接对象
   * @returns {Array} 树节点数组
   */
  static buildTreeNodes(structure, parentConnection) {
    const children = []
    
    if (!structure.databases) {
      return children
    }
    
    structure.databases.forEach(db => {
      const dbNode = {
        key: `${parentConnection.key}-${db.name}`,
        name: db.name,
        type: 'database',
        info: `${db.tables?.length || 0} 表`,
        children: this.buildDatabaseChildren(db, parentConnection),
        expanded: false
      }
      children.push(dbNode)
    })
    
    return children
  }
  
  /**
   * 构建数据库子节点（表、视图等）
   * @param {Object} database - 数据库信息
   * @param {Object} parentConnection - 父连接对象
   * @returns {Array} 子节点数组
   */
  static buildDatabaseChildren(database, parentConnection) {
    const children = []
    
    // 添加表节点
    if (database.tables && database.tables.length > 0) {
      const tablesFolder = {
        key: `${parentConnection.key}-${database.name}-tables`,
        name: '表',
        type: 'folder-tables',
        info: `${database.tables.length}`,
        children: this.buildTableNodes(database.tables, database, parentConnection),
        expanded: false
      }
      children.push(tablesFolder)
    }
    
    // 添加视图节点
    if (database.views && database.views.length > 0) {
      const viewsFolder = {
        key: `${parentConnection.key}-${database.name}-views`,
        name: '视图',
        type: 'folder-views',
        info: `${database.views.length}`,
        children: this.buildViewNodes(database.views, database, parentConnection),
        expanded: false
      }
      children.push(viewsFolder)
    }
    
    // 添加存储过程节点
    if (database.procedures && database.procedures.length > 0) {
      const proceduresFolder = {
        key: `${parentConnection.key}-${database.name}-procedures`,
        name: '存储过程',
        type: 'folder-procedures',
        info: `${database.procedures.length}`,
        children: this.buildProcedureNodes(database.procedures, database, parentConnection),
        expanded: false
      }
      children.push(proceduresFolder)
    }
    
    // 添加函数节点
    if (database.functions && database.functions.length > 0) {
      const functionsFolder = {
        key: `${parentConnection.key}-${database.name}-functions`,
        name: '函数',
        type: 'folder-functions',
        info: `${database.functions.length}`,
        children: this.buildFunctionNodes(database.functions, database, parentConnection),
        expanded: false
      }
      children.push(functionsFolder)
    }
    
    return children
  }
  
  /**
   * 构建表节点
   */
  static buildTableNodes(tables, database, parentConnection) {
    return tables.map(table => ({
      key: `${parentConnection.key}-${database.name}-table-${table.name}`,
      name: table.name,
      type: 'table',
      info: `${DatabaseService.formatCount(table.row_count)} 行`,
      meta: table // 保存完整的表信息
    }))
  }
  
  /**
   * 构建视图节点
   */
  static buildViewNodes(views, database, parentConnection) {
    return views.map(view => ({
      key: `${parentConnection.key}-${database.name}-view-${view.name}`,
      name: view.name,
      type: 'view',
      info: '视图',
      meta: view
    }))
  }
  
  /**
   * 构建存储过程节点
   */
  static buildProcedureNodes(procedures, database, parentConnection) {
    return procedures.map(procedure => ({
      key: `${parentConnection.key}-${database.name}-procedure-${procedure.name}`,
      name: procedure.name,
      type: 'procedure',
      info: '存储过程',
      meta: procedure
    }))
  }
  
  /**
   * 构建函数节点
   */
  static buildFunctionNodes(functions, database, parentConnection) {
    return functions.map(func => ({
      key: `${parentConnection.key}-${database.name}-function-${func.name}`,
      name: func.name,
      type: 'function',
      info: func.return_type || '函数',
      meta: func
    }))
  }
}