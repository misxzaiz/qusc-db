import { ref, reactive, watch, nextTick } from 'vue'

// 存储适配器接口
class StorageAdapter {
  get(key) { throw new Error('Not implemented') }
  set(key, value) { throw new Error('Not implemented') }
  remove(key) { throw new Error('Not implemented') }
  clear() { throw new Error('Not implemented') }
  keys() { throw new Error('Not implemented') }
}

// localStorage适配器
class LocalStorageAdapter extends StorageAdapter {
  get(key) {
    try {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.warn(`获取localStorage失败: ${key}`, error)
      return null
    }
  }
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.warn(`设置localStorage失败: ${key}`, error)
      return false
    }
  }
  
  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn(`删除localStorage失败: ${key}`, error)
      return false
    }
  }
  
  clear() {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.warn('清空localStorage失败', error)
      return false
    }
  }
  
  keys() {
    try {
      return Object.keys(localStorage)
    } catch (error) {
      console.warn('获取localStorage键列表失败', error)
      return []
    }
  }
}

// sessionStorage适配器
class SessionStorageAdapter extends StorageAdapter {
  get(key) {
    try {
      const value = sessionStorage.getItem(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.warn(`获取sessionStorage失败: ${key}`, error)
      return null
    }
  }
  
  set(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.warn(`设置sessionStorage失败: ${key}`, error)
      return false
    }
  }
  
  remove(key) {
    try {
      sessionStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn(`删除sessionStorage失败: ${key}`, error)
      return false
    }
  }
  
  clear() {
    try {
      sessionStorage.clear()
      return true
    } catch (error) {
      console.warn('清空sessionStorage失败', error)
      return false
    }
  }
  
  keys() {
    try {
      return Object.keys(sessionStorage)
    } catch (error) {
      console.warn('获取sessionStorage键列表失败', error)
      return []
    }
  }
}

// 内存存储适配器（fallback）
class MemoryStorageAdapter extends StorageAdapter {
  constructor() {
    super()
    this.data = new Map()
  }
  
  get(key) {
    return this.data.get(key) || null
  }
  
  set(key, value) {
    this.data.set(key, value)
    return true
  }
  
  remove(key) {
    return this.data.delete(key)
  }
  
  clear() {
    this.data.clear()
    return true
  }
  
  keys() {
    return Array.from(this.data.keys())
  }
}

// 存储管理器
const storageAdapters = {
  local: new LocalStorageAdapter(),
  session: new SessionStorageAdapter(),
  memory: new MemoryStorageAdapter()
}

// 默认配置
const defaultConfig = {
  prefix: 'qusc-db',
  adapter: 'local',
  debounceTime: 300,
  compression: false,
  encryption: false
}

export function usePersistence(config = {}) {
  const settings = { ...defaultConfig, ...config }
  const adapter = storageAdapters[settings.adapter] || storageAdapters.memory
  
  // 生成存储键
  const getStorageKey = (key) => {
    return settings.prefix ? `${settings.prefix}:${key}` : key
  }
  
  // 数据序列化和压缩
  const serialize = (data) => {
    let serialized = data
    
    // 这里可以添加压缩逻辑
    if (settings.compression) {
      // 实际项目中可以使用LZ-string等压缩库
      // serialized = compress(serialized)
    }
    
    // 这里可以添加加密逻辑
    if (settings.encryption) {
      // 实际项目中可以使用crypto-js等加密库
      // serialized = encrypt(serialized, key)
    }
    
    return serialized
  }
  
  // 数据反序列化和解压
  const deserialize = (data) => {
    let deserialized = data
    
    // 解密
    if (settings.encryption) {
      // deserialized = decrypt(deserialized, key)
    }
    
    // 解压
    if (settings.compression) {
      // deserialized = decompress(deserialized)
    }
    
    return deserialized
  }
  
  // 保存数据
  const save = (key, data, options = {}) => {
    const storageKey = getStorageKey(key)
    const serializedData = serialize(data)
    
    const metadata = {
      timestamp: Date.now(),
      version: '1.0',
      ...options.metadata
    }
    
    const payload = {
      data: serializedData,
      metadata
    }
    
    return adapter.set(storageKey, payload)
  }
  
  // 读取数据
  const load = (key, defaultValue = null) => {
    const storageKey = getStorageKey(key)
    const payload = adapter.get(storageKey)
    
    if (!payload) {
      return defaultValue
    }
    
    try {
      const data = deserialize(payload.data)
      return data !== null && data !== undefined ? data : defaultValue
    } catch (error) {
      console.warn(`反序列化数据失败: ${key}`, error)
      return defaultValue
    }
  }
  
  // 删除数据
  const remove = (key) => {
    const storageKey = getStorageKey(key)
    return adapter.remove(storageKey)
  }
  
  // 清空所有数据
  const clear = () => {
    if (settings.prefix) {
      // 只清理带前缀的键
      const keys = adapter.keys()
      const prefixedKeys = keys.filter(key => key.startsWith(`${settings.prefix}:`))
      
      let success = true
      prefixedKeys.forEach(key => {
        if (!adapter.remove(key)) {
          success = false
        }
      })
      
      return success
    } else {
      return adapter.clear()
    }
  }
  
  // 获取所有键
  const keys = () => {
    const allKeys = adapter.keys()
    
    if (settings.prefix) {
      return allKeys
        .filter(key => key.startsWith(`${settings.prefix}:`))
        .map(key => key.substring(`${settings.prefix}:`.length))
    }
    
    return allKeys
  }
  
  // 检查键是否存在
  const has = (key) => {
    return load(key) !== null
  }
  
  // 获取存储大小
  const size = () => {
    return keys().length
  }
  
  // 获取存储信息
  const info = () => {
    const allKeys = keys()
    let totalSize = 0
    
    allKeys.forEach(key => {
      try {
        const data = load(key)
        totalSize += JSON.stringify(data).length
      } catch (error) {
        // 忽略错误
      }
    })
    
    return {
      adapter: settings.adapter,
      keyCount: allKeys.length,
      estimatedSize: totalSize,
      prefix: settings.prefix
    }
  }
  
  // 导出数据
  const exportData = () => {
    const allKeys = keys()
    const data = {}
    
    allKeys.forEach(key => {
      data[key] = load(key)
    })
    
    return {
      version: '1.0',
      timestamp: Date.now(),
      data
    }
  }
  
  // 导入数据
  const importData = (importedData, options = {}) => {
    const { overwrite = false, validate = true } = options
    
    if (validate && (!importedData.data || typeof importedData.data !== 'object')) {
      throw new Error('无效的导入数据格式')
    }
    
    const results = {
      success: [],
      failed: [],
      skipped: []
    }
    
    Object.entries(importedData.data).forEach(([key, value]) => {
      try {
        if (!overwrite && has(key)) {
          results.skipped.push(key)
          return
        }
        
        if (save(key, value)) {
          results.success.push(key)
        } else {
          results.failed.push(key)
        }
      } catch (error) {
        console.warn(`导入数据失败: ${key}`, error)
        results.failed.push(key)
      }
    })
    
    return results
  }
  
  return {
    // 基础操作
    save,
    load,
    remove,
    clear,
    has,
    
    // 信息获取
    keys,
    size,
    info,
    
    // 数据迁移
    exportData,
    importData,
    
    // 工具方法
    getStorageKey,
    
    // 配置
    config: settings
  }
}

// 响应式持久化
export function useReactivePersistence(initialState = {}, key = 'app-state', options = {}) {
  const persistence = usePersistence(options)
  
  // 加载初始状态
  const savedState = persistence.load(key, {})
  const state = reactive({ ...initialState, ...savedState })
  
  // 防抖保存
  let saveTimer = null
  const debouncedSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    
    saveTimer = setTimeout(() => {
      persistence.save(key, state)
    }, options.debounceTime || 300)
  }
  
  // 监听状态变化
  watch(state, debouncedSave, { deep: true })
  
  // 重置状态
  const reset = () => {
    Object.keys(state).forEach(key => {
      delete state[key]
    })
    Object.assign(state, initialState)
    persistence.remove(key)
  }
  
  // 手动保存
  const save = () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    return persistence.save(key, state)
  }
  
  // 手动加载
  const load = () => {
    const savedState = persistence.load(key, {})
    Object.keys(state).forEach(key => {
      delete state[key]
    })
    Object.assign(state, initialState, savedState)
  }
  
  return {
    state,
    reset,
    save,
    load,
    persistence
  }
}

// 用户偏好设置管理
export function useUserPreferences() {
  const preferences = useReactivePersistence({
    // 界面设置
    theme: 'light',
    language: 'zh-CN',
    fontSize: 14,
    
    // 布局设置
    sidebarExpanded: true,
    aiPanelExpanded: false,
    windowLayout: {
      width: 1200,
      height: 800,
      maximized: false
    },
    
    // 编辑器设置
    editorSettings: {
      font: {
        size: 14,
        family: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        lineHeight: 1.5
      },
      theme: {
        name: 'vs-light',
        customColors: null
      },
      behavior: {
        autoFormat: true,
        autoComplete: true,
        showLineNumbers: true,
        enableCodeFolding: false,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: true,
        showWhitespace: false,
        highlightActiveLine: true,
        bracketMatching: true
      },
      formatting: {
        keywordCase: 'upper',
        indentSize: 2,
        maxLineLength: 120,
        insertFinalNewline: true,
        trimTrailingWhitespace: true
      }
    },
    
    // 查询设置
    querySettings: {
      autoExecute: false,
      maxRows: 1000,
      timeout: 30000,
      showExecutionTime: true
    },
    
    // 快捷键设置
    shortcuts: {},
    
    // 其他设置
    notifications: {
      enabled: true,
      position: 'top-right',
      duration: 3000
    },
    
    recentConnections: [],
    recentQueries: [],
    favorites: []
  }, 'user-preferences', {
    debounceTime: 500
  })
  
  // 便捷方法
  const setTheme = (theme) => {
    preferences.state.theme = theme
  }
  
  const setLayout = (layout) => {
    Object.assign(preferences.state.windowLayout, layout)
  }
  
  const setEditorConfig = (config) => {
    Object.assign(preferences.state.editorSettings, config)
  }
  
  const addRecentConnection = (connection) => {
    const recent = preferences.state.recentConnections
    const index = recent.findIndex(c => c.id === connection.id)
    
    if (index > -1) {
      recent.splice(index, 1)
    }
    
    recent.unshift(connection)
    
    // 保持最近连接数量限制
    if (recent.length > 10) {
      recent.splice(10)
    }
  }
  
  const addRecentQuery = (query) => {
    const recent = preferences.state.recentQueries
    const index = recent.findIndex(q => q.sql === query.sql)
    
    if (index > -1) {
      recent.splice(index, 1)
    }
    
    recent.unshift({
      ...query,
      timestamp: Date.now()
    })
    
    // 保持最近查询数量限制
    if (recent.length > 50) {
      recent.splice(50)
    }
  }
  
  const toggleFavorite = (item) => {
    const favorites = preferences.state.favorites
    const index = favorites.findIndex(f => f.id === item.id)
    
    if (index > -1) {
      favorites.splice(index, 1)
      return false
    } else {
      favorites.push({
        ...item,
        timestamp: Date.now()
      })
      return true
    }
  }
  
  return {
    ...preferences,
    
    // 便捷方法
    setTheme,
    setLayout,
    setEditorConfig,
    addRecentConnection,
    addRecentQuery,
    toggleFavorite
  }
}