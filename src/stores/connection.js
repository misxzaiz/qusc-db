import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { 
  encryptConnectionConfig, 
  decryptConnectionConfig, 
  decryptAllConfigs 
} from '@/utils/encryption.js'

// 简化的Connection Store，避免复杂的导入问题
export const useConnectionStore = defineStore('connection', () => {
  // 状态
  const connections = ref(new Map())
  const activeConnections = ref([])
  const currentConnection = ref(null)
  const schemas = ref(new Map())
  const queryHistory = ref([])
  const isConnecting = ref(false)

  // 连接配置模板
  const connectionTemplates = reactive({
    mysql: {
      db_type: 'MySQL',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: ''
    },
    redis: {
      db_type: 'Redis',
      host: 'localhost',
      port: 6379,
      password: ''
    },
    postgresql: {
      db_type: 'PostgreSQL',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '',
      database: 'postgres' // PostgreSQL 的默认数据库
    }
  })

  // 检查是否在 Tauri 环境中
  const isTauriEnvironment = () => {
    return typeof window !== 'undefined' &&
      window.__TAURI__ &&
      typeof window.__TAURI__ === 'object' &&
      typeof window.__TAURI__.core?.invoke === 'function'
  }
  // 连接数据库 (重命名为connectToDatabase以匹配组件调用)
  const connectToDatabase = async (config) => {
    // 防止重复连接
    if (isConnecting.value) {
      console.warn('连接正在进行中，忽略重复请求')
      return
    }
    
    isConnecting.value = true

    try {
      console.log('开始连接数据库:', config)

      // 检查是否已有相同配置的连接
      const existingConnection = Array.from(connections.value.values()).find(conn => 
        conn.config.db_type === config.db_type &&
        conn.config.host === config.host &&
        conn.config.port === config.port &&
        conn.config.username === config.username &&
        conn.config.database === config.database
      )
      
      if (existingConnection) {
        console.log('发现相同配置的连接，使用现有连接:', existingConnection.id)
        currentConnection.value = existingConnection
        return existingConnection.id
      }

      // 检查是否在Tauri环境中
      const hasInvokeFunction = typeof window !== 'undefined' &&
        window.__TAURI__ &&
        typeof window.__TAURI__ === 'object' &&
        typeof window.__TAURI__.core?.invoke === 'function'

      if (hasInvokeFunction) {
        console.log('使用Tauri后端连接数据库')

        try {
          // 准备发送给后端的配置数据
          const backendConfig = {
            db_type: config.db_type,
            host: config.host,
            port: parseInt(config.port) || (config.db_type === 'Redis' ? 6379 : 3306),
            username: config.username || null,
            password: config.password || null,
            database: config.database || null,
            options: config.options || {}
          }

          console.log('发送给后端的配置:', backendConfig)

          // 调用Tauri后端命令建立连接 - 使用驼峰命名
          const result = await window.__TAURI__.core.invoke('connect_database', {
            dbType: backendConfig.db_type,
            host: backendConfig.host,
            port: backendConfig.port,
            username: backendConfig.username,
            password: backendConfig.password,
            database: backendConfig.database
          })

          console.log('Tauri连接结果:', result)

          // 后端直接返回连接ID字符串
          if (result) {
            const connectionId = result
            console.log('新连接ID:', connectionId)
            console.log('当前连接数量:', connections.value.size)
            console.log('现有连接IDs:', Array.from(connections.value.keys()))
            
            // 检查是否已存在相同连接
            if (connections.value.has(connectionId)) {
              console.warn('连接ID已存在，将覆盖:', connectionId)
            }
            
            // 保存连接信息
            const connectionInfo = {
              id: connectionId,
              config: { ...config },
              connectedAt: new Date(),
              status: 'connected'
            }

            connections.value.set(connectionId, connectionInfo)
            currentConnection.value = connectionInfo
            
            // 更新活动连接列表
            const activeConn = {
              id: connectionId,
              name: `${config.host}:${config.port}`,
              type: config.db_type,
              config: config
            }
            
            // 检查是否已在活动连接列表中
            if (!activeConnections.value.find(conn => conn.id === connectionId)) {
              activeConnections.value.push(activeConn)
            }
            
            console.log('连接保存后数量:', connections.value.size)

            // 获取数据库结构
            try {
              const schemaResult = await window.__TAURI__.core.invoke('get_database_schema', {
                connectionId: connectionId
              })

              if (schemaResult && schemaResult.tables) {
                schemas.value.set(connectionId, schemaResult.tables)
              } else {
                // 如果获取结构失败，使用空数组
                schemas.value.set(connectionId, [])
              }
            } catch (schemaError) {
              console.warn('获取数据库结构失败:', schemaError)
              schemas.value.set(connectionId, [])
            }

            return connectionId
          } else {
            throw new Error('连接失败: 后端返回无效结果')
          }
        } catch (tauriError) {
          console.error('Tauri连接失败:', tauriError)
          throw new Error(`连接失败: ${tauriError.message || tauriError}`)
        }
      } else {
        throw new Error('Tauri 环境未就绪，无法连接数据库')
      }
    } catch (error) {
      console.error('数据库连接失败:', error)
      throw error
    } finally {
      isConnecting.value = false
    }
  }

  // 断开连接
  const disconnect = async (connectionId) => {
    try {
      if (isTauriEnvironment()) {
        // 调用后端断开连接
        await window.__TAURI__.core.invoke('disconnect_database', {
          connectionId: connectionId
        })
      }

      connections.value.delete(connectionId)
      schemas.value.delete(connectionId)

      // 从活动连接列表中移除
      const index = activeConnections.value.findIndex(conn => conn.id === connectionId)
      if (index > -1) {
        activeConnections.value.splice(index, 1)
      }

      if (currentConnection.value?.id === connectionId) {
        currentConnection.value = null
      }
    } catch (error) {
      console.error('断开连接失败:', error)
      throw error
    }
  }

  // 执行查询
  const executeQuery = async (connectionId, query) => {
    try {
      if (!isTauriEnvironment()) {
        throw new Error('Tauri 环境未就绪，无法执行查询')
      }

      // 调用后端执行查询
      const result = await window.__TAURI__.core.invoke('execute_query', {
        connectionId: connectionId,
        query: query.trim()
      })

      // 添加到查询历史
      addToHistory(query, result)

      return result
    } catch (error) {
      console.error('查询执行失败:', error)

      // 添加失败的查询到历史
      addToHistory(query, null, error.toString())

      throw error
    }
  }

  // 获取数据库结构
  const refreshSchema = async (connectionId) => {
    try {
      if (!isTauriEnvironment()) {
        throw new Error('Tauri 环境未就绪，无法获取数据库结构')
      }

      // 调用后端获取数据库结构
      const result = await window.__TAURI__.core.invoke('get_database_schema', {
        connectionId: connectionId
      })

      // 更新本地缓存
      schemas.value.set(connectionId, result)

      return result
    } catch (error) {
      console.error('获取数据库结构失败:', error)
      throw error
    }
  }

  // 测试连接
  const testConnection = async (config) => {
    try {
      console.log('开始测试连接:', config)
      console.log('Tauri环境检测:', !!window.__TAURI__)

      // 检查是否在Tauri环境中 - 直接检查core.invoke
      const hasInvokeFunction = typeof window !== 'undefined' &&
        window.__TAURI__ &&
        typeof window.__TAURI__ === 'object' &&
        typeof window.__TAURI__.core?.invoke === 'function'

      console.log('Tauri环境检测:', hasInvokeFunction)
      console.log('window.__TAURI__:', window.__TAURI__)
      console.log('window.__TAURI__类型:', typeof window.__TAURI__)
      console.log('invoke函数:', typeof window.__TAURI__?.invoke)
      console.log('core.invoke函数:', typeof window.__TAURI__?.core?.invoke)

      if (hasInvokeFunction) {
        console.log('使用Tauri后端测试连接')

        try {
          // 准备发送给后端的配置数据
          const backendConfig = {
            db_type: config.db_type, // 确保这是 'MySQL' 或 'Redis' 字符串
            host: config.host,
            port: parseInt(config.port) || 3306,
            username: config.username || null,
            password: config.password || null,
            database: config.database || null,
            options: config.options || {}
          }

          console.log('发送给后端的配置:', backendConfig)

          // 调用Tauri后端命令 - 使用core.invoke
          // 传递单独的参数，使用驼峰命名
          const result = await window.__TAURI__.core.invoke('test_database_connection', {
            dbType: backendConfig.db_type,
            host: backendConfig.host,
            port: backendConfig.port,
            username: backendConfig.username,
            password: backendConfig.password,
            database: backendConfig.database
          })

          console.log('Tauri测试结果:', result)
          // 返回标准化的结果格式
          return {
            success: result === true,
            error: result === true ? null : (result?.error || '未知错误')
          }
        } catch (tauriError) {
          console.error('Tauri调用失败:', tauriError)
          console.error('错误详情:', tauriError.message || tauriError)
          // 返回标准化的错误格式
          return {
            success: false,
            error: tauriError.message || tauriError.toString() || 'Tauri调用失败'
          }
        }
      } else {
        // 返回标准化的错误格式
        return {
          success: false,
          error: 'Tauri 环境未就绪，无法测试连接'
        }
      }

    } catch (error) {
      console.error('连接测试失败:', error)
      // 返回标准化的错误格式
      return {
        success: false,
        error: error.message || error.toString() || '连接测试失败'
      }
    }
  }

  // 添加到查询历史
  const addToHistory = (query, result, error = null) => {
    const historyItem = {
      id: Date.now(),
      query: query.trim(),
      result,
      error,
      executedAt: new Date(),
      connectionId: currentConnection.value?.id,
      success: !error
    }

    queryHistory.value.unshift(historyItem)

    // 限制历史记录数量
    if (queryHistory.value.length > 100) {
      queryHistory.value = queryHistory.value.slice(0, 100)
    }
  }

  // 清空查询历史
  const clearHistory = () => {
    queryHistory.value = []
  }

  // 获取连接信息
  const getConnection = (connectionId) => {
    return connections.value.get(connectionId)
  }

  // 获取当前连接的结构
  const getCurrentSchema = () => {
    if (!currentConnection.value) return []
    return schemas.value.get(currentConnection.value.id) || []
  }

  // 获取当前连接的表列表（从schema中提取）
  const getTables = () => {
    const schema = getCurrentSchema()
    if (Array.isArray(schema)) {
      // 根据真实数据结构，表名字段是 'name'
      return schema.map(table => table.name || table.table_name || table).filter(Boolean)
    }
    return []
  }

  // 保存连接配置
  const saveConnectionConfig = async (name, config) => {
    try {
      const encryptedConfig = await encryptConnectionConfig(config)
      const saved = JSON.parse(localStorage.getItem('qusc-db-connections') || '{}')
      saved[name] = encryptedConfig
      localStorage.setItem('qusc-db-connections', JSON.stringify(saved))
    } catch (error) {
      console.error('保存连接配置失败:', error)
      throw new Error('保存连接配置失败: ' + error.message)
    }
  }

  // 添加新连接
  const addConnection = async (data) => {
    try {
      // 生成唯一的连接名称
      const name = data.name || `${data.config.host}_${data.config.port}_${Date.now()}`
      
      // 保存连接配置
      await saveConnectionConfig(name, data.config)
      
      return {
        success: true,
        id: name,
        message: '连接已保存'
      }
    } catch (error) {
      console.error('添加连接失败:', error)
      throw error
    }
  }

  // 更新连接
  const updateConnection = async (connectionId, data) => {
    try {
      // 删除旧的连接配置
      deleteConnectionConfig(connectionId)
      
      // 使用新的名称（如果提供）或保持原有名称
      const name = data.name || connectionId
      
      // 保存更新后的连接配置
      await saveConnectionConfig(name, data.config)
      
      return {
        success: true,
        id: name,
        message: '连接已更新'
      }
    } catch (error) {
      console.error('更新连接失败:', error)
      throw error
    }
  }

  // 加载连接配置
  const loadConnectionConfigs = async () => {
    try {
      const saved = JSON.parse(localStorage.getItem('qusc-db-connections') || '{}')
      return await decryptAllConfigs(saved)
    } catch (error) {
      console.error('加载连接配置失败:', error)
      return {}
    }
  }

  // 删除连接配置
  const deleteConnectionConfig = (name) => {
    const saved = JSON.parse(localStorage.getItem('qusc-db-connections') || '{}')
    delete saved[name]
    localStorage.setItem('qusc-db-connections', JSON.stringify(saved))
  }

  // 选择数据库
  const selectDatabase = async (connectionId, databaseName) => {
    try {
      if (!isTauriEnvironment()) {
        throw new Error('Tauri 环境未就绪，无法选择数据库')
      }

      // 调用后端选择数据库
      await window.__TAURI__.core.invoke('use_database', {
        connectionId: connectionId,
        databaseName: databaseName
      })

      // 重新获取数据库结构（现在应该显示表而不是数据库）
      const schema = await refreshSchema(connectionId)
      
      return schema
    } catch (error) {
      console.error('选择数据库失败:', error)
      throw error
    }
  }

  // 获取数据库列表
  const getDatabases = async (connectionId) => {
    try {
      if (!isTauriEnvironment()) {
        throw new Error('Tauri 环境未就绪，无法获取数据库列表')
      }

      // 调用后端获取数据库列表
      const databases = await window.__TAURI__.core.invoke('get_databases', {
        connectionId: connectionId
      })
      
      return databases
    } catch (error) {
      console.error('获取数据库列表失败:', error)
      throw error
    }
  }

  // 获取指定数据库的表列表
  const getDatabaseTables = async (connectionId, databaseName) => {
    try {
      if (!isTauriEnvironment()) {
        throw new Error('Tauri 环境未就绪，无法获取数据库表')
      }

      // 调用后端获取指定数据库的表列表
      const tables = await window.__TAURI__.core.invoke('get_database_tables', {
        connectionId: connectionId,
        databaseName: databaseName
      })
      
      return tables
    } catch (error) {
      console.error('获取数据库表失败:', error)
      throw error
    }
  }

  // 获取查询统计
  const getQueryStats = () => {
    const total = queryHistory.value.length
    const successful = queryHistory.value.filter(h => h.success).length
    const failed = total - successful

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) : 0
    }
  }

  return {
    // 状态
    connections,
    activeConnections,
    currentConnection,
    schemas,
    queryHistory,
    isConnecting,
    connectionTemplates,

    // 方法
    connect: connectToDatabase,
    connectToDatabase,
    disconnect,
    executeQuery,
    refreshSchema,
    testConnection,
    addToHistory,
    clearHistory,
    getConnection,
    getCurrentSchema,
    getTables,
    saveConnectionConfig,
    addConnection,
    updateConnection,
    loadConnectionConfigs,
    deleteConnectionConfig,
    getQueryStats,
    selectDatabase,
    getDatabases,
    getDatabaseTables,
    
    // 兼容性别名
    disconnectFromDatabase: disconnect,
    setCurrentConnection: (connection) => { currentConnection.value = connection },
    getConnectionById: getConnection
  }
})
