import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // 状态
  const currentGlobalTheme = ref('light') // 'light' | 'dark' | 'auto'
  const currentDbType = ref('MySQL')
  const currentConnectionId = ref('')
  const uiConfigs = ref(new Map()) // 存储各数据库的UI配置
  const customColors = ref({
    primary: '#3b82f6',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1f2937',
    textSecondary: '#6b7280'
  })
  const layoutConfig = ref({
    fontSize: 14,
    borderRadius: 8,
    density: 'normal' // 'compact' | 'normal' | 'comfortable'
  })

  // 数据库默认主题配置
  const defaultDatabaseThemes = {
    MySQL: {
      theme: {
        primaryColor: '#00758f',
        accentColor: '#f29111',
        icon: '🐬'
      },
      displayMode: 'Table',
      supportedOperations: ['Select', 'Insert', 'Update', 'Delete']
    },
    PostgreSQL: {
      theme: {
        primaryColor: '#336791',
        accentColor: '#ffffff',
        icon: '🐘'
      },
      displayMode: 'Table',
      supportedOperations: ['Select', 'Insert', 'Update', 'Delete']
    },
    Redis: {
      theme: {
        primaryColor: '#dc2626',
        accentColor: '#ffffff',
        icon: '🔴'
      },
      displayMode: 'KeyValue',
      supportedOperations: ['Get', 'Set', 'Keys', 'Monitor']
    },
    MongoDB: {
      theme: {
        primaryColor: '#47a248',
        accentColor: '#ffffff',
        icon: '🍃'
      },
      displayMode: 'Document',
      supportedOperations: ['Find', 'InsertOne', 'UpdateOne', 'DeleteOne']
    },
    SQLite: {
      theme: {
        primaryColor: '#003b57',
        accentColor: '#ffffff',
        icon: '💾'
      },
      displayMode: 'Table',
      supportedOperations: ['Select', 'Insert', 'Update', 'Delete']
    }
  }

  // 计算属性
  const currentDatabaseTheme = computed(() => {
    return uiConfigs.value.get(currentDbType.value) || defaultDatabaseThemes[currentDbType.value]
  })

  const isDarkMode = computed(() => {
    if (currentGlobalTheme.value === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return currentGlobalTheme.value === 'dark'
  })

  const themeVariables = computed(() => {
    const dbTheme = currentDatabaseTheme.value?.theme || {}
    const globalColors = isDarkMode.value ? getDarkColors() : getLightColors()
    
    return {
      // 全局颜色变量
      ...globalColors,
      // 数据库特定变量
      '--db-primary-color': dbTheme.primaryColor || customColors.value.primary,
      '--db-accent-color': dbTheme.accentColor || customColors.value.accent,
      // 布局变量
      '--theme-font-size': `${layoutConfig.value.fontSize}px`,
      '--theme-border-radius': `${layoutConfig.value.borderRadius}px`,
      '--theme-spacing-unit': getSpacingUnit() + 'px',
      // 组件变量
      '--table-row-height': getTableRowHeight() + 'px',
      '--button-height': getButtonHeight() + 'px'
    }
  })

  // 方法
  const getLightColors = () => ({
    '--theme-primary': customColors.value.primary,
    '--theme-accent': customColors.value.accent,
    '--theme-background': customColors.value.background,
    '--theme-surface': customColors.value.surface,
    '--theme-text': customColors.value.text,
    '--theme-text-secondary': customColors.value.textSecondary
  })

  const getDarkColors = () => ({
    '--theme-primary': '#60a5fa',
    '--theme-accent': '#fbbf24',
    '--theme-background': '#0f172a',
    '--theme-surface': '#1e293b',
    '--theme-text': '#f8fafc',
    '--theme-text-secondary': '#cbd5e1'
  })

  const getSpacingUnit = () => {
    const units = { compact: 6, normal: 8, comfortable: 12 }
    return units[layoutConfig.value.density] || 8
  }

  const getTableRowHeight = () => {
    const heights = { compact: 32, normal: 40, comfortable: 48 }
    return heights[layoutConfig.value.density] || 40
  }

  const getButtonHeight = () => {
    const heights = { compact: 28, normal: 36, comfortable: 44 }
    return heights[layoutConfig.value.density] || 36
  }

  const loadUIConfig = async (connectionId, dbType) => {
    try {
      // 检查是否在Tauri环境中，并使用现有的invoke函数
      const isTauriEnvironment = typeof window !== 'undefined' &&
        window.__TAURI__ &&
        typeof window.__TAURI__.core?.invoke === 'function'

      if (isTauriEnvironment) {
        // 直接使用已暴露的Tauri invoke函数
        const config = await window.__TAURI__.core.invoke('get_ui_config', {
          connectionId: connectionId || 'default',
          dbType
        })
        
        if (config) {
          uiConfigs.value.set(dbType, config)
          return config
        }
      }
      
      // 返回默认配置
      const defaultConfig = defaultDatabaseThemes[dbType]
      uiConfigs.value.set(dbType, defaultConfig)
      return defaultConfig
    } catch (error) {
      console.warn(`Failed to load UI config for ${dbType}:`, error)
      // 使用默认配置
      const defaultConfig = defaultDatabaseThemes[dbType]
      uiConfigs.value.set(dbType, defaultConfig)
      return defaultConfig
    }
  }

  const updateGlobalTheme = (theme) => {
    currentGlobalTheme.value = theme
    applyTheme()
    saveThemeConfig()
  }

  const updateDatabaseContext = (connectionId, dbType) => {
    currentConnectionId.value = connectionId
    currentDbType.value = dbType
    
    // 加载对应的UI配置
    if (dbType && !uiConfigs.value.has(dbType)) {
      loadUIConfig(connectionId, dbType)
    }
  }

  const updateCustomColors = (colors) => {
    customColors.value = { ...customColors.value, ...colors }
    applyTheme()
    saveThemeConfig()
  }

  const updateLayoutConfig = (config) => {
    layoutConfig.value = { ...layoutConfig.value, ...config }
    applyTheme()
    saveThemeConfig()
  }

  const applyTheme = () => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const variables = themeVariables.value

    // 应用CSS变量
    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })

    // 更新body类名
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-auto')
    document.body.classList.add(`theme-${currentGlobalTheme.value}`)

    // 更新数据库主题类名
    document.body.classList.remove('db-mysql', 'db-postgresql', 'db-redis', 'db-mongodb', 'db-sqlite')
    if (currentDbType.value) {
      document.body.classList.add(`db-${currentDbType.value.toLowerCase()}`)
    }

    // 设置data属性
    root.setAttribute('data-theme', currentGlobalTheme.value)
    root.setAttribute('data-db-type', currentDbType.value.toLowerCase())
    root.setAttribute('data-color-scheme', isDarkMode.value ? 'dark' : 'light')
    root.setAttribute('data-density', layoutConfig.value.density)
  }

  const saveThemeConfig = () => {
    try {
      const themeData = {
        globalTheme: currentGlobalTheme.value,
        customColors: customColors.value,
        layoutConfig: layoutConfig.value,
        timestamp: Date.now()
      }
      localStorage.setItem('qusc-db-theme', JSON.stringify(themeData))
    } catch (error) {
      console.warn('保存主题配置失败:', error)
    }
  }

  const loadSavedTheme = () => {
    try {
      const saved = localStorage.getItem('qusc-db-theme')
      if (saved) {
        const themeData = JSON.parse(saved)
        
        if (themeData.globalTheme) {
          currentGlobalTheme.value = themeData.globalTheme
        }
        if (themeData.customColors) {
          customColors.value = themeData.customColors
        }
        if (themeData.layoutConfig) {
          layoutConfig.value = themeData.layoutConfig
        }
      }
    } catch (error) {
      console.warn('加载保存的主题配置失败:', error)
    }
  }

  const exportTheme = () => {
    const themeData = {
      name: '自定义主题',
      version: '1.0.0',
      globalTheme: currentGlobalTheme.value,
      customColors: customColors.value,
      layoutConfig: layoutConfig.value,
      databaseConfigs: Object.fromEntries(uiConfigs.value),
      exportTime: new Date().toISOString()
    }
    
    return JSON.stringify(themeData, null, 2)
  }

  const importTheme = (themeJson) => {
    try {
      const themeData = JSON.parse(themeJson)
      
      if (themeData.globalTheme) {
        currentGlobalTheme.value = themeData.globalTheme
      }
      if (themeData.customColors) {
        customColors.value = themeData.customColors
      }
      if (themeData.layoutConfig) {
        layoutConfig.value = themeData.layoutConfig
      }
      if (themeData.databaseConfigs) {
        // 重建Map
        uiConfigs.value.clear()
        Object.entries(themeData.databaseConfigs).forEach(([key, value]) => {
          uiConfigs.value.set(key, value)
        })
      }
      
      applyTheme()
      saveThemeConfig()
      return true
    } catch (error) {
      console.error('导入主题失败:', error)
      return false
    }
  }

  const resetTheme = () => {
    currentGlobalTheme.value = 'light'
    customColors.value = {
      primary: '#3b82f6',
      accent: '#f59e0b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1f2937',
      textSecondary: '#6b7280'
    }
    layoutConfig.value = {
      fontSize: 14,
      borderRadius: 8,
      density: 'normal'
    }
    uiConfigs.value.clear()
    applyTheme()
    saveThemeConfig()
  }

  // 监听主题变化并自动应用
  watch([currentGlobalTheme, customColors, layoutConfig], () => {
    applyTheme()
  }, { deep: true })

  // 监听系统主题变化（自动模式）
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (currentGlobalTheme.value === 'auto') {
        applyTheme()
      }
    })
  }

  // 初始化
  const initTheme = () => {
    loadSavedTheme()
    applyTheme()
  }

  return {
    // 状态
    currentGlobalTheme: computed(() => currentGlobalTheme.value),
    currentDbType: computed(() => currentDbType.value),
    currentConnectionId: computed(() => currentConnectionId.value),
    currentDatabaseTheme,
    customColors: computed(() => customColors.value),
    layoutConfig: computed(() => layoutConfig.value),
    isDarkMode,
    themeVariables,

    // 方法
    loadUIConfig,
    updateGlobalTheme,
    updateDatabaseContext,
    updateCustomColors,
    updateLayoutConfig,
    applyTheme,
    saveThemeConfig,
    loadSavedTheme,
    exportTheme,
    importTheme,
    resetTheme,
    initTheme,

    // 工具方法
    defaultDatabaseThemes,
    getSpacingUnit,
    getTableRowHeight,
    getButtonHeight
  }
})