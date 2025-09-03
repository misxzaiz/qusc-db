import { ref, reactive, onMounted, onUnmounted } from 'vue'

// 快捷键状态
const shortcuts = reactive({})
const disabledContexts = ref(new Set())
const globalDisabled = ref(false)

// 修饰键映射
const modifierKeys = {
  ctrl: 'ctrlKey',
  cmd: 'metaKey',
  alt: 'altKey',
  shift: 'shiftKey'
}

// 特殊键映射
const specialKeys = {
  enter: 'Enter',
  escape: 'Escape',
  space: ' ',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown'
}

export function useShortcuts() {
  // 解析快捷键字符串
  const parseShortcut = (shortcut) => {
    const parts = shortcut.toLowerCase().split('+').map(p => p.trim())
    const modifiers = {}
    let key = ''
    
    parts.forEach(part => {
      if (modifierKeys[part]) {
        modifiers[modifierKeys[part]] = true
      } else {
        key = specialKeys[part] || part.toUpperCase()
      }
    })
    
    return { modifiers, key }
  }
  
  // 检查事件是否匹配快捷键
  const matchesShortcut = (event, shortcutConfig) => {
    const { modifiers, key } = shortcutConfig
    
    // 检查修饰键
    for (const [modKey, required] of Object.entries(modifiers)) {
      if (event[modKey] !== required) {
        return false
      }
    }
    
    // 检查其他修饰键是否未按下
    for (const modKey of Object.values(modifierKeys)) {
      if (!modifiers[modKey] && event[modKey]) {
        return false
      }
    }
    
    // 检查主键
    return event.key === key || event.code === key
  }
  
  // 注册快捷键
  const registerShortcut = (shortcut, handler, options = {}) => {
    const {
      context = 'global',
      description = '',
      preventDefault = true,
      stopPropagation = false,
      priority = 0,
      enabled = true
    } = options
    
    const config = {
      ...parseShortcut(shortcut),
      handler,
      context,
      description,
      preventDefault,
      stopPropagation,
      priority,
      enabled,
      shortcut
    }
    
    const id = `${context}_${shortcut}_${Date.now()}`
    shortcuts[id] = config
    
    return id
  }
  
  // 注销快捷键
  const unregisterShortcut = (id) => {
    delete shortcuts[id]
  }
  
  // 启用/禁用快捷键
  const toggleShortcut = (id, enabled) => {
    if (shortcuts[id]) {
      shortcuts[id].enabled = enabled
    }
  }
  
  // 禁用特定上下文的快捷键
  const disableContext = (context) => {
    disabledContexts.value.add(context)
  }
  
  // 启用特定上下文的快捷键
  const enableContext = (context) => {
    disabledContexts.value.delete(context)
  }
  
  // 全局启用/禁用快捷键
  const setGlobalEnabled = (enabled) => {
    globalDisabled.value = !enabled
  }
  
  // 获取快捷键信息
  const getShortcutInfo = (id) => {
    return shortcuts[id] || null
  }
  
  // 获取所有快捷键
  const getAllShortcuts = () => {
    return Object.entries(shortcuts).map(([id, config]) => ({
      id,
      ...config
    }))
  }
  
  // 按上下文分组快捷键
  const getShortcutsByContext = () => {
    const grouped = {}
    
    Object.entries(shortcuts).forEach(([id, config]) => {
      if (!grouped[config.context]) {
        grouped[config.context] = []
      }
      grouped[config.context].push({ id, ...config })
    })
    
    return grouped
  }
  
  // 格式化快捷键显示
  const formatShortcut = (shortcut) => {
    return shortcut
      .split('+')
      .map(key => {
        const trimmedKey = key.trim().toLowerCase()
        const keyMap = {
          ctrl: '⌃',
          cmd: '⌘',
          alt: '⌥',
          shift: '⇧',
          enter: '⏎',
          escape: '⎋',
          space: '␣',
          tab: '⇥',
          backspace: '⌫',
          delete: '⌦',
          arrowup: '↑',
          arrowdown: '↓',
          arrowleft: '←',
          arrowright: '→'
        }
        
        return keyMap[trimmedKey] || key.trim().toUpperCase()
      })
      .join('')
  }
  
  // 处理键盘事件
  const handleKeyEvent = (event) => {
    // 全局禁用检查
    if (globalDisabled.value) return
    
    // 忽略在输入框中的按键，但允许带修饰键的组合键
    const tagName = event.target.tagName.toLowerCase()
    const isInput = ['input', 'textarea', 'select'].includes(tagName) ||
                   event.target.contentEditable === 'true'
    
    // 检查是否在CodeMirror编辑器中
    const isCodeMirror = event.target.closest('.cm-editor') !== null
    
    // 对于输入框，只允许带有Ctrl或Meta键的快捷键
    if ((isInput || isCodeMirror) && !event.ctrlKey && !event.metaKey) return
    
    // 按优先级排序快捷键
    const sortedShortcuts = Object.entries(shortcuts)
      .map(([id, config]) => ({ id, ...config }))
      .filter(config => config.enabled)
      .filter(config => !disabledContexts.value.has(config.context))
      .sort((a, b) => b.priority - a.priority)
    
    // 查找匹配的快捷键
    for (const config of sortedShortcuts) {
      if (matchesShortcut(event, config)) {
        if (config.preventDefault) {
          event.preventDefault()
        }
        
        if (config.stopPropagation) {
          event.stopPropagation()
        }
        
        // 执行处理函数
        try {
          config.handler(event)
        } catch (error) {
          console.error(`快捷键处理错误: ${config.shortcut}`, error)
        }
        
        break // 只执行第一个匹配的快捷键
      }
    }
  }
  
  // 生命周期管理
  let isInitialized = false
  
  const init = () => {
    if (isInitialized) return
    
    document.addEventListener('keydown', handleKeyEvent, true)
    isInitialized = true
  }
  
  const destroy = () => {
    if (!isInitialized) return
    
    document.removeEventListener('keydown', handleKeyEvent, true)
    isInitialized = false
  }
  
  return {
    // 注册管理
    registerShortcut,
    unregisterShortcut,
    toggleShortcut,
    
    // 上下文管理
    disableContext,
    enableContext,
    setGlobalEnabled,
    
    // 信息获取
    getShortcutInfo,
    getAllShortcuts,
    getShortcutsByContext,
    
    // 工具方法
    formatShortcut,
    parseShortcut,
    
    // 生命周期
    init,
    destroy,
    
    // 状态
    shortcuts: shortcuts,
    isInitialized: () => isInitialized
  }
}

// 预设快捷键集合
export function useAppShortcuts() {
  const { registerShortcut } = useShortcuts()
  
  // 通用快捷键
  const registerCommonShortcuts = (handlers = {}) => {
    const shortcuts = []
    
    // 标签页管理
    if (handlers.newTab) {
      shortcuts.push(registerShortcut('ctrl+t', handlers.newTab, {
        context: 'app',
        description: '新建标签页'
      }))
    }
    
    if (handlers.closeTab) {
      shortcuts.push(registerShortcut('ctrl+w', handlers.closeTab, {
        context: 'app',
        description: '关闭当前标签页'
      }))
    }
    
    if (handlers.nextTab) {
      shortcuts.push(registerShortcut('ctrl+tab', handlers.nextTab, {
        context: 'app',
        description: '切换到下一个标签页'
      }))
    }
    
    if (handlers.prevTab) {
      shortcuts.push(registerShortcut('ctrl+shift+tab', handlers.prevTab, {
        context: 'app',
        description: '切换到上一个标签页'
      }))
    }
    
    // 查询相关
    if (handlers.executeQuery) {
      shortcuts.push(registerShortcut('ctrl+enter', handlers.executeQuery, {
        context: 'editor',
        description: '执行SQL查询'
      }))
      
      shortcuts.push(registerShortcut('f5', handlers.executeQuery, {
        context: 'editor',
        description: '执行SQL查询'
      }))
    }
    
    if (handlers.formatSQL) {
      shortcuts.push(registerShortcut('ctrl+shift+f', handlers.formatSQL, {
        context: 'editor',
        description: '格式化SQL'
      }))
    }
    
    // 界面切换
    if (handlers.toggleSidebar) {
      shortcuts.push(registerShortcut('ctrl+b', handlers.toggleSidebar, {
        context: 'app',
        description: '切换侧边栏'
      }))
    }
    
    if (handlers.toggleAI) {
      shortcuts.push(registerShortcut('ctrl+shift+a', handlers.toggleAI, {
        context: 'app',
        description: '切换AI助手'
      }))
    }
    
    // 主题切换
    if (handlers.toggleTheme) {
      shortcuts.push(registerShortcut('ctrl+shift+t', handlers.toggleTheme, {
        context: 'app',
        description: '切换主题'
      }))
    }
    
    // 搜索和导航
    if (handlers.globalSearch) {
      shortcuts.push(registerShortcut('ctrl+k', handlers.globalSearch, {
        context: 'app',
        description: '全局搜索'
      }))
    }
    
    if (handlers.commandPalette) {
      shortcuts.push(registerShortcut('ctrl+shift+p', handlers.commandPalette, {
        context: 'app',
        description: '命令面板'
      }))
    }
    
    // 保存和刷新
    if (handlers.saveFile) {
      shortcuts.push(registerShortcut('ctrl+s', handlers.saveFile, {
        context: 'editor',
        description: '保存文件'
      }))
    }
    
    if (handlers.refreshSchema) {
      shortcuts.push(registerShortcut('f5', handlers.refreshSchema, {
        context: 'app',
        description: '刷新数据库结构'
      }))
    }
    
    return shortcuts
  }
  
  return {
    registerCommonShortcuts
  }
}