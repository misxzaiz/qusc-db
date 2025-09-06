import { invoke } from '@tauri-apps/api/core'

// TypeScript interfaces converted to JSDoc comments for better documentation

/**
 * @typedef {Object} DatabaseStructure
 * @property {string} connection_id
 * @property {'MySQL'|'PostgreSQL'|'Redis'|'MongoDB'|'SQLite'} db_type
 * @property {DatabaseNode[]} databases
 * @property {ConnectionInfo} connection_info
 */

/**
 * @typedef {Object} DatabaseNode
 * @property {string} name
 * @property {SizeInfo} [size_info]
 * @property {TableNode[]} tables
 * @property {ViewNode[]} views
 * @property {ProcedureNode[]} procedures
 * @property {FunctionNode[]} functions
 * @property {RedisKeyInfo} [redis_keys]
 * @property {MongoCollectionInfo} [mongodb_collections]
 */

/**
 * @typedef {Object} TableNode
 * @property {string} name
 * @property {SizeInfo} [size_info]
 * @property {number} [row_count]
 * @property {'Table'|'SystemTable'|'TemporaryTable'} table_type
 */

/**
 * @typedef {Object} ViewNode
 * @property {string} name
 * @property {string} [definition]
 */

/**
 * @typedef {Object} ProcedureNode
 * @property {string} name
 * @property {ParameterInfo[]} parameters
 */

/**
 * @typedef {Object} FunctionNode
 * @property {string} name
 * @property {string} [return_type]
 * @property {ParameterInfo[]} parameters
 */

/**
 * @typedef {Object} ParameterInfo
 * @property {string} name
 * @property {string} data_type
 * @property {'In'|'Out'|'InOut'} direction
 */

/**
 * @typedef {Object} RedisKeyInfo
 * @property {number} database_index
 * @property {number} key_count
 * @property {number} expires_count
 * @property {number} [memory_usage]
 * @property {RedisKeyNode[]} sample_keys
 */

/**
 * @typedef {Object} RedisKeyNode
 * @property {string} key
 * @property {'String'|'Hash'|'List'|'Set'|'ZSet'} data_type
 * @property {number} [ttl]
 * @property {number} [size]
 */

/**
 * @typedef {Object} MongoCollectionInfo
 * @property {MongoCollectionNode[]} collections
 * @property {GridFSBucketNode[]} gridfs_buckets
 */

/**
 * @typedef {Object} MongoCollectionNode
 * @property {string} name
 * @property {number} [document_count]
 * @property {number} [size]
 * @property {IndexInfo[]} indexes
 */

/**
 * @typedef {Object} GridFSBucketNode
 * @property {string} name
 * @property {number} [file_count]
 * @property {number} [total_size]
 */

/**
 * @typedef {Object} IndexInfo
 * @property {string} name
 * @property {string[]} columns
 * @property {boolean} unique
 * @property {string} index_type
 */

/**
 * @typedef {Object} SizeInfo
 * @property {number} bytes
 * @property {string} formatted
 */

/**
 * @typedef {Object} ConnectionInfo
 * @property {string} host
 * @property {number} port
 * @property {string} [username]
 * @property {string} [database_name]
 * @property {string} [server_version]
 */

export class DatabaseService {
  
  /**
   * 获取完整的数据库结构用于导航树
   * @param {string} connectionId - 数据库连接ID
   * @returns {Promise<DatabaseStructure>} 数据库结构信息
   */
  static async getDatabaseStructure(connectionId) {
    try {
      return await invoke('get_database_structure', { connectionId })
    } catch (error) {
      console.error('Failed to get database structure:', error)
      throw error
    }
  }
  
  /**
   * 获取Redis键列表和统计信息
   * @param {string} connectionId - 数据库连接ID
   * @param {number} [databaseIndex] - Redis数据库索引
   * @returns {Promise<RedisKeyInfo>} Redis键信息
   */
  static async getRedisStructure(connectionId, databaseIndex) {
    try {
      return await invoke('get_redis_structure', { 
        connectionId, 
        databaseIndex 
      })
    } catch (error) {
      console.error('Failed to get Redis structure:', error)
      throw error
    }
  }
  
  /**
   * 获取MongoDB集合和索引信息
   * @param {string} connectionId - 数据库连接ID
   * @param {string} databaseName - 数据库名称
   * @returns {Promise<MongoCollectionInfo>} MongoDB集合信息
   */
  static async getMongoDBStructure(connectionId, databaseName) {
    try {
      return await invoke('get_mongodb_structure', { 
        connectionId, 
        databaseName 
      })
    } catch (error) {
      console.error('Failed to get MongoDB structure:', error)
      throw error
    }
  }
  
  /**
   * 格式化文件大小
   * @param {number} [bytes] - 字节数
   * @returns {string} 格式化后的大小字符串
   */
  static formatSize(bytes) {
    if (!bytes) return '0B'
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)}${units[unitIndex]}`
  }
  
  /**
   * 格式化数量显示
   * @param {number} [count] - 数量
   * @returns {string} 格式化后的数量字符串
   */
  static formatCount(count) {
    if (!count) return '0'
    
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    
    return count.toString()
  }
}

export default DatabaseService