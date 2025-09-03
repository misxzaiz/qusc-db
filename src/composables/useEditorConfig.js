import { ref, computed, watch } from 'vue'
import { useUserPreferences } from './usePersistence'

// 预设主题配置
export const editorThemes = {
  'vs-light': {
    name: 'Visual Studio 浅色',
    background: '#ffffff',
    foreground: '#000000',
    selection: '#b3d4fc',
    lineNumber: '#999999',
    syntax: {
      keyword: '#0066cc',
      string: '#008000',
      comment: '#808080',
      number: '#0000ff',
      operator: '#000000'
    }
  },
  'vs-dark': {
    name: 'Visual Studio 深色', 
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    selection: '#264f78',
    lineNumber: '#858585',
    syntax: {
      keyword: '#569cd6',
      string: '#ce9178',
      comment: '#6a9955',
      number: '#b5cea8',
      operator: '#d4d4d4'
    }
  },
  'monokai': {
    name: 'Monokai',
    background: '#2d2d2d',
    foreground: '#f8f8f2',
    selection: '#49483e',
    lineNumber: '#90908a',
    syntax: {
      keyword: '#f92672',
      string: '#a6e22e',
      comment: '#75715e',
      number: '#ae81ff',
      operator: '#f8f8f2'
    }
  },
  'github': {
    name: 'GitHub',
    background: '#ffffff',
    foreground: '#24292e',
    selection: '#c8e1ff',
    lineNumber: '#1b1f234d',
    syntax: {
      keyword: '#d73a49',
      string: '#032f62',
      comment: '#6a737d',
      number: '#005cc5',
      operator: '#24292e'
    }
  },
  'dracula': {
    name: 'Dracula',
    background: '#282a36',
    foreground: '#f8f8f2',
    selection: '#44475a',
    lineNumber: '#6272a4',
    syntax: {
      keyword: '#ff79c6',
      string: '#f1fa8c',
      comment: '#6272a4',
      number: '#bd93f9',
      operator: '#ff79c6'
    }
  }
}

// 字体配置选项
export const fontFamilyOptions = [
  { name: 'Monaco (推荐)', value: 'Monaco, Menlo, "Ubuntu Mono", monospace' },
  { name: 'Consolas', value: 'Consolas, Monaco, "Lucida Console", monospace' },
  { name: 'Source Code Pro', value: '"Source Code Pro", Monaco, monospace' },
  { name: 'JetBrains Mono', value: '"JetBrains Mono", Monaco, monospace' },
  { name: 'Fira Code', value: '"Fira Code", Monaco, monospace' },
  { name: 'Cascadia Code', value: '"Cascadia Code", Monaco, monospace' },
  { name: '系统等宽字体', value: 'monospace' }
]

export function useEditorConfig() {
  const { state: preferences } = useUserPreferences()
  
  // 默认编辑器配置
  const defaultEditorSettings = {
    font: {
      size: 14,
      family: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      lineHeight: 1.5
    },
    theme: {
      name: 'vs-light',
      customColors: null // 用于自定义主题
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
      keywordCase: 'upper', // 'upper', 'lower', 'original'
      indentSize: 2,
      maxLineLength: 120,
      insertFinalNewline: true,
      trimTrailingWhitespace: true
    }
  }

  // 确保用户偏好中有编辑器设置
  if (!preferences.editorSettings || typeof preferences.editorSettings !== 'object') {
    preferences.editorSettings = { ...defaultEditorSettings }
  } else {
    // 合并默认设置，确保所有属性都存在
    preferences.editorSettings = {
      font: { ...defaultEditorSettings.font, ...preferences.editorSettings.font },
      theme: { ...defaultEditorSettings.theme, ...preferences.editorSettings.theme },
      behavior: { ...defaultEditorSettings.behavior, ...preferences.editorSettings.behavior },
      formatting: { ...defaultEditorSettings.formatting, ...preferences.editorSettings.formatting }
    }
  }
  
  // 编辑器配置响应式状态
  const editorConfig = computed(() => preferences.editorSettings)
  
  // 当前主题配置
  const currentTheme = computed(() => {
    const themeName = editorConfig.value.theme.name
    return editorThemes[themeName] || editorThemes['vs-light']
  })
  
  // 字体样式计算
  const fontStyle = computed(() => ({
    fontSize: `${editorConfig.value.font.size}px`,
    fontFamily: editorConfig.value.font.family,
    lineHeight: editorConfig.value.font.lineHeight
  }))
  
  // 编辑器样式计算
  const editorStyle = computed(() => ({
    ...fontStyle.value,
    backgroundColor: currentTheme.value.background,
    color: currentTheme.value.foreground,
    '--line-number-color': currentTheme.value.lineNumber,
    '--selection-color': currentTheme.value.selection,
    '--keyword-color': currentTheme.value.syntax.keyword,
    '--string-color': currentTheme.value.syntax.string,
    '--comment-color': currentTheme.value.syntax.comment,
    '--number-color': currentTheme.value.syntax.number,
    '--operator-color': currentTheme.value.syntax.operator
  }))
  
  // 更新配置方法
  const updateConfig = (path, value) => {
    const keys = path.split('.')
    let target = preferences.editorSettings
    
    // 导航到目标对象
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {}
      }
      target = target[key]
    }
    
    // 设置最终值
    const finalKey = keys[keys.length - 1]
    target[finalKey] = value
  }
  
  // 批量更新配置
  const updateMultipleConfigs = (updates) => {
    Object.entries(updates).forEach(([path, value]) => {
      updateConfig(path, value)
    })
  }
  
  // 重置配置
  const resetConfig = () => {
    Object.assign(preferences.editorSettings, defaultEditorSettings)
  }
  
  // 重置特定分类的配置
  const resetSection = (section) => {
    if (defaultEditorSettings[section]) {
      preferences.editorSettings[section] = { ...defaultEditorSettings[section] }
    }
  }
  
  // 导出配置
  const exportConfig = () => {
    return {
      version: '1.0',
      timestamp: Date.now(),
      config: JSON.parse(JSON.stringify(preferences.editorSettings))
    }
  }
  
  // 导入配置
  const importConfig = (configData) => {
    try {
      if (configData.config && typeof configData.config === 'object') {
        // 验证配置结构
        const validConfig = {
          font: { ...defaultEditorSettings.font, ...configData.config.font },
          theme: { ...defaultEditorSettings.theme, ...configData.config.theme },
          behavior: { ...defaultEditorSettings.behavior, ...configData.config.behavior },
          formatting: { ...defaultEditorSettings.formatting, ...configData.config.formatting }
        }
        
        Object.assign(preferences.editorSettings, validConfig)
        return true
      }
    } catch (error) {
      console.error('导入编辑器配置失败:', error)
    }
    return false
  }
  
  // 获取主题列表
  const getThemeList = () => {
    return Object.entries(editorThemes).map(([key, theme]) => ({
      key,
      name: theme.name,
      preview: theme
    }))
  }
  
  // 创建自定义主题
  const createCustomTheme = (name, colors) => {
    const customKey = `custom-${Date.now()}`
    editorThemes[customKey] = {
      name,
      ...colors
    }
    return customKey
  }
  
  // 便捷访问器
  const fontSize = computed({
    get: () => editorConfig.value.font.size,
    set: (value) => updateConfig('font.size', value)
  })
  
  const fontFamily = computed({
    get: () => editorConfig.value.font.family,
    set: (value) => updateConfig('font.family', value)
  })
  
  const themeName = computed({
    get: () => editorConfig.value.theme.name,
    set: (value) => updateConfig('theme.name', value)
  })
  
  const showLineNumbers = computed({
    get: () => editorConfig.value.behavior.showLineNumbers,
    set: (value) => updateConfig('behavior.showLineNumbers', value)
  })
  
  const autoComplete = computed({
    get: () => editorConfig.value.behavior.autoComplete,
    set: (value) => updateConfig('behavior.autoComplete', value)
  })
  
  const tabSize = computed({
    get: () => editorConfig.value.behavior.tabSize,
    set: (value) => updateConfig('behavior.tabSize', value)
  })
  
  // 监听配置变化，应用到DOM
  watch(editorStyle, (newStyle) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      Object.entries(newStyle).forEach(([property, value]) => {
        if (property.startsWith('--')) {
          root.style.setProperty(property, value)
        }
      })
    }
  }, { immediate: true })
  
  return {
    // 配置状态
    editorConfig,
    currentTheme,
    fontStyle,
    editorStyle,
    
    // 更新方法
    updateConfig,
    updateMultipleConfigs,
    resetConfig,
    resetSection,
    
    // 导入导出
    exportConfig,
    importConfig,
    
    // 主题管理
    getThemeList,
    createCustomTheme,
    
    // 便捷访问器
    fontSize,
    fontFamily,
    themeName,
    showLineNumbers,
    autoComplete,
    tabSize,
    
    // 常量
    editorThemes,
    fontFamilyOptions,
    defaultEditorSettings
  }
}