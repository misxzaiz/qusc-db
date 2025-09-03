import { ref, computed, watch, onMounted } from 'vue'

// 主题定义
const themes = {
  light: {
    name: '浅色',
    icon: '☀️',
    colors: {
      // 主色调
      '--primary-color': '#3b82f6',
      '--primary-light': '#60a5fa',
      '--primary-dark': '#2563eb',
      
      // 背景色
      '--bg-color': '#ffffff',
      '--bg-secondary': '#f8fafc',
      '--bg-tertiary': '#f1f5f9',
      
      // 文字颜色
      '--text-primary': '#1e293b',
      '--text-secondary': '#475569',
      '--text-muted': '#64748b',
      '--text-disabled': '#94a3b8',
      
      // 边框和分割线
      '--border-color': '#e2e8f0',
      '--border-light': '#f1f5f9',
      '--border-dark': '#cbd5e1',
      
      // 状态色
      '--success-color': '#10b981',
      '--warning-color': '#f59e0b',
      '--error-color': '#ef4444',
      '--info-color': '#06b6d4',
      
      // 灰色阶
      '--gray-50': '#f8fafc',
      '--gray-100': '#f1f5f9',
      '--gray-200': '#e2e8f0',
      '--gray-300': '#cbd5e1',
      '--gray-400': '#94a3b8',
      '--gray-500': '#64748b',
      '--gray-600': '#475569',
      '--gray-700': '#334155',
      '--gray-800': '#1e293b',
      '--gray-900': '#0f172a',
      
      // 阴影
      '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '--shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      '--shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      
      // 特殊背景
      '--overlay-bg': 'rgba(0, 0, 0, 0.5)',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
      '--code-bg': '#f8fafc',
      '--sidebar-bg': '#ffffff'
    }
  },
  
  dark: {
    name: '深色',
    icon: '🌙',
    colors: {
      // 主色调
      '--primary-color': '#60a5fa',
      '--primary-light': '#93c5fd',
      '--primary-dark': '#3b82f6',
      
      // 背景色
      '--bg-color': '#0f172a',
      '--bg-secondary': '#1e293b',
      '--bg-tertiary': '#334155',
      
      // 文字颜色
      '--text-primary': '#f8fafc',
      '--text-secondary': '#e2e8f0',
      '--text-muted': '#cbd5e1',
      '--text-disabled': '#64748b',
      
      // 边框和分割线
      '--border-color': '#334155',
      '--border-light': '#475569',
      '--border-dark': '#1e293b',
      
      // 状态色
      '--success-color': '#34d399',
      '--warning-color': '#fbbf24',
      '--error-color': '#f87171',
      '--info-color': '#22d3ee',
      
      // 灰色阶
      '--gray-50': '#334155',
      '--gray-100': '#475569',
      '--gray-200': '#64748b',
      '--gray-300': '#94a3b8',
      '--gray-400': '#cbd5e1',
      '--gray-500': '#e2e8f0',
      '--gray-600': '#f1f5f9',
      '--gray-700': '#f8fafc',
      '--gray-800': '#ffffff',
      '--gray-900': '#ffffff',
      
      // 阴影
      '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      '--shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
      '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      '--shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
      
      // 特殊背景
      '--overlay-bg': 'rgba(0, 0, 0, 0.7)',
      '--glass-bg': 'rgba(15, 23, 42, 0.8)',
      '--code-bg': '#1e293b',
      '--sidebar-bg': '#1e293b'
    }
  },
  
  auto: {
    name: '跟随系统',
    icon: '🔄',
    colors: {} // 自动模式会根据系统主题动态选择
  }
}

// 当前主题状态
const currentTheme = ref('light')
const systemTheme = ref('light')

export function useTheme() {
  // 计算属性
  const isDarkMode = computed(() => {
    if (currentTheme.value === 'auto') {
      return systemTheme.value === 'dark'
    }
    return currentTheme.value === 'dark'
  })
  
  const activeTheme = computed(() => {
    if (currentTheme.value === 'auto') {
      return themes[systemTheme.value]
    }
    return themes[currentTheme.value]
  })
  
  const availableThemes = computed(() => {
    return Object.keys(themes).map(key => ({
      key,
      ...themes[key]
    }))
  })
  
  // 检测系统主题
  const detectSystemTheme = () => {
    if (typeof window === 'undefined') return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemTheme.value = mediaQuery.matches ? 'dark' : 'light'
    
    // 监听系统主题变化
    const handleChange = (e) => {
      systemTheme.value = e.matches ? 'dark' : 'light'
    }
    
    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }
  
  // 应用主题到DOM
  const applyTheme = (theme) => {
    if (typeof document === 'undefined') return
    
    const root = document.documentElement
    const themeData = theme === 'auto' ? themes[systemTheme.value] : themes[theme]
    
    if (themeData && themeData.colors) {
      Object.entries(themeData.colors).forEach(([property, value]) => {
        root.style.setProperty(property, value)
      })
    }
    
    // 更新body类名
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-auto')
    document.body.classList.add(`theme-${theme}`)
    
    // 设置data属性用于CSS选择器
    root.setAttribute('data-theme', theme)
    root.setAttribute('data-color-scheme', isDarkMode.value ? 'dark' : 'light')
  }
  
  // 切换主题
  const setTheme = (theme) => {
    if (!themes[theme]) {
      console.warn(`Unknown theme: ${theme}`)
      return
    }
    
    currentTheme.value = theme
    applyTheme(theme)
    
    // 持久化到localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('app-theme', theme)
    }
  }
  
  // 切换到下一个主题
  const toggleTheme = () => {
    const themeKeys = Object.keys(themes)
    const currentIndex = themeKeys.indexOf(currentTheme.value)
    const nextIndex = (currentIndex + 1) % themeKeys.length
    setTheme(themeKeys[nextIndex])
  }
  
  // 从localStorage加载主题
  const loadSavedTheme = () => {
    if (typeof localStorage === 'undefined') return
    
    const savedTheme = localStorage.getItem('app-theme')
    if (savedTheme && themes[savedTheme]) {
      currentTheme.value = savedTheme
    }
  }
  
  // 获取主题偏好建议
  const getThemeRecommendation = () => {
    const hour = new Date().getHours()
    
    if (hour >= 6 && hour < 18) {
      return {
        theme: 'light',
        reason: '白天时段建议使用浅色主题以减少眼部疲劳'
      }
    } else {
      return {
        theme: 'dark',
        reason: '夜间时段建议使用深色主题以保护视力'
      }
    }
  }
  
  // 主题过渡效果
  const enableThemeTransition = () => {
    if (typeof document === 'undefined') return
    
    const css = `
      * {
        transition: background-color 0.3s ease, 
                    color 0.3s ease, 
                    border-color 0.3s ease,
                    box-shadow 0.3s ease !important;
      }
    `
    
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    
    // 移除过渡效果（避免影响其他动画）
    setTimeout(() => {
      document.head.removeChild(style)
    }, 300)
  }
  
  // 初始化主题
  const initTheme = () => {
    // 检测系统主题
    const cleanup = detectSystemTheme()
    
    // 加载保存的主题
    loadSavedTheme()
    
    // 应用主题
    applyTheme(currentTheme.value)
    
    return cleanup
  }
  
  // 监听主题变化
  watch([currentTheme, systemTheme], () => {
    if (currentTheme.value === 'auto') {
      applyTheme('auto')
    }
  })
  
  // 组件挂载时初始化
  let cleanup = null
  onMounted(() => {
    cleanup = initTheme()
  })
  
  return {
    // 状态
    currentTheme: computed(() => currentTheme.value),
    systemTheme: computed(() => systemTheme.value),
    isDarkMode,
    activeTheme,
    availableThemes,
    
    // 方法
    setTheme,
    toggleTheme,
    detectSystemTheme,
    applyTheme,
    loadSavedTheme,
    getThemeRecommendation,
    enableThemeTransition,
    initTheme,
    
    // 工具方法
    themes,
    cleanup: () => cleanup?.()
  }
}