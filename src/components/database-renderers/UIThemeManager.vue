<template>
  <div class="ui-theme-manager" :class="currentThemeClass">
    <!-- 主题配置面板 -->
    <div v-if="showThemePanel" class="theme-panel" ref="themePanel">
      <div class="panel-header">
        <Icon name="palette" />
        <span>主题配置</span>
        <button class="close-btn" @click="closeThemePanel">
          <Icon name="x" />
        </button>
      </div>
      
      <div class="panel-content">
        <!-- 数据库主题选择 -->
        <div class="theme-section">
          <div class="section-title">数据库主题</div>
          <div class="db-themes">
            <div 
              v-for="(config, dbType) in databaseThemes"
              :key="dbType"
              class="db-theme-item"
              :class="{ active: currentDbType === dbType }"
              @click="selectDatabaseTheme(dbType)"
            >
              <div class="theme-preview">
                <div 
                  class="color-primary" 
                  :style="{ backgroundColor: config.theme.primaryColor }"
                ></div>
                <div 
                  class="color-accent" 
                  :style="{ backgroundColor: config.theme.accentColor }"
                ></div>
              </div>
              <div class="theme-info">
                <div class="theme-icon">{{ config.theme.icon }}</div>
                <div class="theme-name">{{ dbType }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 全局主题选择 -->
        <div class="theme-section">
          <div class="section-title">全局主题</div>
          <div class="global-themes">
            <div 
              v-for="theme in globalThemes"
              :key="theme.name"
              class="global-theme-item"
              :class="{ active: currentGlobalTheme === theme.name }"
              @click="selectGlobalTheme(theme.name)"
            >
              <div class="theme-preview">
                <div class="preview-bg" :style="{ backgroundColor: theme.background }">
                  <div class="preview-surface" :style="{ backgroundColor: theme.surface }">
                    <div class="preview-text" :style="{ color: theme.text }">Aa</div>
                  </div>
                </div>
              </div>
              <div class="theme-name">{{ theme.label }}</div>
            </div>
          </div>
        </div>

        <!-- 自定义颜色配置 -->
        <div class="theme-section" v-if="allowCustomization">
          <div class="section-title">
            自定义配置
            <button class="reset-btn" @click="resetCustomization">
              <Icon name="refresh-cw" />
              重置
            </button>
          </div>
          
          <div class="color-configs">
            <div class="color-config">
              <label>主色调</label>
              <input 
                type="color" 
                v-model="customColors.primary"
                @input="updateCustomTheme"
                class="color-picker"
              />
              <input 
                type="text" 
                v-model="customColors.primary"
                @input="updateCustomTheme"
                class="color-input"
                placeholder="#3b82f6"
              />
            </div>
            
            <div class="color-config">
              <label>辅助色</label>
              <input 
                type="color" 
                v-model="customColors.accent"
                @input="updateCustomTheme"
                class="color-picker"
              />
              <input 
                type="text" 
                v-model="customColors.accent"
                @input="updateCustomTheme"
                class="color-input"
                placeholder="#f59e0b"
              />
            </div>
            
            <div class="color-config">
              <label>背景色</label>
              <input 
                type="color" 
                v-model="customColors.background"
                @input="updateCustomTheme"
                class="color-picker"
              />
              <input 
                type="text" 
                v-model="customColors.background"
                @input="updateCustomTheme"
                class="color-input"
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>

        <!-- 布局配置 -->
        <div class="theme-section">
          <div class="section-title">布局配置</div>
          
          <div class="layout-options">
            <div class="option-group">
              <label>字体大小</label>
              <div class="slider-group">
                <input 
                  type="range" 
                  min="12" 
                  max="20" 
                  v-model="layoutConfig.fontSize"
                  @input="updateLayoutConfig"
                  class="slider"
                />
                <span class="value">{{ layoutConfig.fontSize }}px</span>
              </div>
            </div>
            
            <div class="option-group">
              <label>圆角大小</label>
              <div class="slider-group">
                <input 
                  type="range" 
                  min="0" 
                  max="16" 
                  v-model="layoutConfig.borderRadius"
                  @input="updateLayoutConfig"
                  class="slider"
                />
                <span class="value">{{ layoutConfig.borderRadius }}px</span>
              </div>
            </div>
            
            <div class="option-group">
              <label>间距密度</label>
              <select v-model="layoutConfig.density" @change="updateLayoutConfig" class="select">
                <option value="compact">紧凑</option>
                <option value="normal">正常</option>
                <option value="comfortable">舒适</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 预设主题 -->
        <div class="theme-section">
          <div class="section-title">预设主题</div>
          <div class="preset-themes">
            <button 
              v-for="preset in presetThemes"
              :key="preset.name"
              class="preset-btn"
              :class="{ active: currentPreset === preset.name }"
              @click="applyPreset(preset)"
            >
              <div class="preset-preview">
                <div 
                  class="preset-color"
                  :style="{ 
                    background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.accent} 100%)`
                  }"
                ></div>
              </div>
              <span>{{ preset.label }}</span>
            </button>
          </div>
        </div>
      </div>
      
      <div class="panel-footer">
        <button class="btn btn-secondary" @click="exportTheme">
          <Icon name="download" />
          导出主题
        </button>
        <button class="btn btn-secondary" @click="importTheme">
          <Icon name="upload" />
          导入主题
        </button>
        <button class="btn btn-primary" @click="saveTheme">
          <Icon name="save" />
          保存配置
        </button>
      </div>
    </div>

    <!-- 主题快速切换按钮 -->
    <div v-if="showQuickSwitch" class="theme-quick-switch">
      <button 
        class="quick-switch-btn"
        @click="toggleThemePanel"
        :title="showThemePanel ? '关闭主题面板' : '打开主题面板'"
      >
        <Icon name="palette" />
      </button>
      
      <div class="quick-themes" v-if="!showThemePanel">
        <button 
          v-for="theme in quickThemes"
          :key="theme.name"
          class="quick-theme-btn"
          :class="{ active: isThemeActive(theme) }"
          @click="applyQuickTheme(theme)"
          :title="theme.label"
        >
          <div 
            class="quick-color"
            :style="{ backgroundColor: theme.primary }"
          ></div>
        </button>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Icon from '@/components/common/Icon.vue'

export default {
  name: 'UIThemeManager',
  components: {
    Icon
  },
  props: {
    // 当前数据库类型
    currentDbType: {
      type: String,
      default: 'MySQL'
    },
    // 显示选项
    showQuickSwitch: {
      type: Boolean,
      default: true
    },
    allowCustomization: {
      type: Boolean,
      default: true
    },
    // 连接ID
    connectionId: {
      type: String,
      default: ''
    }
  },
  emits: [
    'theme-change',
    'db-theme-change',
    'layout-change'
  ],
  setup(props, { emit }) {
    // 响应式数据
    const themePanel = ref(null)
    const showThemePanel = ref(false)
    const currentGlobalTheme = ref('light')
    const currentPreset = ref('default')
    
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
      density: 'normal'
    })

    const databaseThemes = ref({})
    const loadedUIConfigs = ref({})
    let styleElement = null // 用于管理动态样式元素

    // 静态主题配置
    const globalThemes = [
      {
        name: 'light',
        label: '浅色主题',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1f2937'
      },
      {
        name: 'dark',
        label: '深色主题',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9'
      },
      {
        name: 'auto',
        label: '自动切换',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1f2937'
      }
    ]

    const presetThemes = [
      {
        name: 'default',
        label: '默认',
        primary: '#3b82f6',
        accent: '#f59e0b'
      },
      {
        name: 'ocean',
        label: '海洋蓝',
        primary: '#0891b2',
        accent: '#06b6d4'
      },
      {
        name: 'forest',
        label: '森林绿',
        primary: '#059669',
        accent: '#10b981'
      },
      {
        name: 'sunset',
        label: '夕阳红',
        primary: '#dc2626',
        accent: '#f59e0b'
      },
      {
        name: 'lavender',
        label: '薰衣草',
        primary: '#8b5cf6',
        accent: '#a855f7'
      },
      {
        name: 'rose',
        label: '玫瑰粉',
        primary: '#e11d48',
        accent: '#f43f5e'
      }
    ]

    const quickThemes = computed(() => {
      return [
        { name: 'mysql', label: 'MySQL', primary: '#00758f' },
        { name: 'postgresql', label: 'PostgreSQL', primary: '#336791' },
        { name: 'redis', label: 'Redis', primary: '#dc2626' },
        { name: 'mongodb', label: 'MongoDB', primary: '#47a248' }
      ]
    })

    // 计算属性
    const currentThemeClass = computed(() => {
      const classes = [`theme-${currentGlobalTheme.value}`]
      if (props.currentDbType) {
        classes.push(`db-${props.currentDbType.toLowerCase()}`)
      }
      if (layoutConfig.value.density !== 'normal') {
        classes.push(`density-${layoutConfig.value.density}`)
      }
      return classes.join(' ')
    })

    const dynamicStyles = computed(() => {
      const dbTheme = databaseThemes.value[props.currentDbType] || {}
      const dbColors = dbTheme.theme || {}
      
      return `
        :root {
          /* 数据库特定颜色 */
          --db-primary-color: ${dbColors.primaryColor || customColors.value.primary};
          --db-accent-color: ${dbColors.accentColor || customColors.value.accent};
          
          /* 全局颜色 */
          --theme-primary: ${customColors.value.primary};
          --theme-accent: ${customColors.value.accent};
          --theme-background: ${customColors.value.background};
          --theme-surface: ${customColors.value.surface};
          --theme-text: ${customColors.value.text};
          --theme-text-secondary: ${customColors.value.textSecondary};
          
          /* 布局变量 */
          --theme-font-size: ${layoutConfig.value.fontSize}px;
          --theme-border-radius: ${layoutConfig.value.borderRadius}px;
          --theme-spacing-unit: ${getSpacingUnit()}px;
          
          /* 组件特定变量 */
          --editor-font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
          --table-row-height: ${getTableRowHeight()}px;
          --button-height: ${getButtonHeight()}px;
        }
        
        /* 数据库特定样式 */
        .db-mysql {
          --db-theme-primary: #00758f;
          --db-theme-accent: #f29111;
        }
        
        .db-postgresql {
          --db-theme-primary: #336791;
          --db-theme-accent: #ffffff;
        }
        
        .db-redis {
          --db-theme-primary: #dc2626;
          --db-theme-accent: #ffffff;
        }
        
        .db-mongodb {
          --db-theme-primary: #47a248;
          --db-theme-accent: #ffffff;
        }
        
        .db-sqlite {
          --db-theme-primary: #003b57;
          --db-theme-accent: #ffffff;
        }
        
        /* 密度样式 */
        .density-compact {
          --theme-spacing-unit: 6px;
          --table-row-height: 32px;
          --button-height: 28px;
        }
        
        .density-comfortable {
          --theme-spacing-unit: 12px;
          --table-row-height: 48px;
          --button-height: 44px;
        }
        
        /* 主题特定样式 */
        .theme-dark {
          --theme-background: #0f172a;
          --theme-surface: #1e293b;
          --theme-text: #f1f5f9;
          --theme-text-secondary: #cbd5e1;
          
          color-scheme: dark;
        }
        
        .theme-light {
          --theme-background: #ffffff;
          --theme-surface: #f8fafc;
          --theme-text: #1f2937;
          --theme-text-secondary: #6b7280;
          
          color-scheme: light;
        }
      `
    })

    // 安全地应用动态样式的方法
    const applyDynamicStyles = () => {
      if (typeof document === 'undefined') return

      // 如果已存在样式元素，先移除
      if (styleElement) {
        styleElement.remove()
      }

      // 创建新的样式元素
      styleElement = document.createElement('style')
      styleElement.id = 'qusc-db-dynamic-theme'
      styleElement.textContent = dynamicStyles.value
      
      // 添加到head中
      document.head.appendChild(styleElement)
    }

    // 移除动态样式的方法
    const removeDynamicStyles = () => {
      if (styleElement) {
        styleElement.remove()
        styleElement = null
      }
    }

    // 方法
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

    const loadDatabaseUIConfigs = async () => {
      const dbTypes = ['MySQL', 'PostgreSQL', 'Redis', 'MongoDB', 'SQLite']
      
      // 检查是否在Tauri环境中
      const isTauriEnvironment = typeof window !== 'undefined' &&
        window.__TAURI__ &&
        typeof window.__TAURI__.core?.invoke === 'function'
      
      for (const dbType of dbTypes) {
        try {
          if (isTauriEnvironment) {
            const config = await window.__TAURI__.core.invoke('get_ui_config', {
              connectionId: props.connectionId || 'default',
              dbType
            })
            
            loadedUIConfigs.value[dbType] = config
            if (config && config.theme) {
              databaseThemes.value[dbType] = config
            }
          }
        } catch (err) {
          console.warn(`Failed to load UI config for ${dbType}:`, err)
        }
      }
    }

    const selectDatabaseTheme = (dbType) => {
      emit('db-theme-change', {
        dbType,
        theme: databaseThemes.value[dbType]
      })
    }

    const selectGlobalTheme = (themeName) => {
      currentGlobalTheme.value = themeName
      
      if (themeName === 'auto') {
        // 检测系统主题偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        currentGlobalTheme.value = prefersDark ? 'dark' : 'light'
        
        // 监听系统主题变化
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        mediaQuery.addEventListener('change', (e) => {
          currentGlobalTheme.value = e.matches ? 'dark' : 'light'
        })
      }
      
      emit('theme-change', {
        theme: themeName,
        colors: customColors.value
      })
    }

    const updateCustomTheme = () => {
      emit('theme-change', {
        theme: 'custom',
        colors: customColors.value
      })
    }

    const updateLayoutConfig = () => {
      emit('layout-change', layoutConfig.value)
    }

    const resetCustomization = () => {
      customColors.value = {
        primary: '#3b82f6',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1f2937',
        textSecondary: '#6b7280'
      }
      updateCustomTheme()
    }

    const applyPreset = (preset) => {
      currentPreset.value = preset.name
      customColors.value.primary = preset.primary
      customColors.value.accent = preset.accent
      updateCustomTheme()
    }

    const isThemeActive = (theme) => {
      return databaseThemes.value[props.currentDbType]?.theme?.primaryColor === theme.primary
    }

    const applyQuickTheme = (theme) => {
      const dbConfig = databaseThemes.value[theme.name.toUpperCase()]
      if (dbConfig) {
        selectDatabaseTheme(theme.name.toUpperCase())
      }
    }

    const toggleThemePanel = () => {
      showThemePanel.value = !showThemePanel.value
    }

    const closeThemePanel = () => {
      showThemePanel.value = false
    }

    const saveTheme = async () => {
      try {
        const themeData = {
          globalTheme: currentGlobalTheme.value,
          customColors: customColors.value,
          layoutConfig: layoutConfig.value,
          databaseThemes: databaseThemes.value
        }
        
        // 保存到本地存储或发送到后端
        localStorage.setItem('qusc-db-theme', JSON.stringify(themeData))
        
        // 可以调用Tauri命令保存到配置文件
        // await invoke('save_theme_config', { themeData })
        
        console.log('主题配置已保存')
      } catch (err) {
        console.error('保存主题配置失败:', err)
      }
    }

    const exportTheme = () => {
      const themeData = {
        name: '自定义主题',
        version: '1.0.0',
        globalTheme: currentGlobalTheme.value,
        customColors: customColors.value,
        layoutConfig: layoutConfig.value,
        databaseThemes: databaseThemes.value,
        exportTime: new Date().toISOString()
      }
      
      const blob = new Blob([JSON.stringify(themeData, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'qusc-db-theme.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const importTheme = () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              const themeData = JSON.parse(e.target.result)
              
              if (themeData.customColors) {
                customColors.value = themeData.customColors
              }
              if (themeData.layoutConfig) {
                layoutConfig.value = themeData.layoutConfig
              }
              if (themeData.globalTheme) {
                currentGlobalTheme.value = themeData.globalTheme
              }
              if (themeData.databaseThemes) {
                databaseThemes.value = { ...databaseThemes.value, ...themeData.databaseThemes }
              }
              
              console.log('主题配置已导入')
            } catch (err) {
              console.error('导入主题配置失败:', err)
            }
          }
          reader.readAsText(file)
        }
      }
      
      input.click()
    }

    const loadSavedTheme = () => {
      try {
        const saved = localStorage.getItem('qusc-db-theme')
        if (saved) {
          const themeData = JSON.parse(saved)
          
          if (themeData.customColors) {
            customColors.value = themeData.customColors
          }
          if (themeData.layoutConfig) {
            layoutConfig.value = themeData.layoutConfig  
          }
          if (themeData.globalTheme) {
            currentGlobalTheme.value = themeData.globalTheme
          }
        }
      } catch (err) {
        console.warn('加载保存的主题配置失败:', err)
      }
    }

    // 点击外部关闭面板
    const handleClickOutside = (event) => {
      if (themePanel.value && !themePanel.value.contains(event.target)) {
        closeThemePanel()
      }
    }

    // 监听props变化
    watch(() => props.currentDbType, async (newDbType) => {
      if (newDbType && databaseThemes.value[newDbType]) {
        selectDatabaseTheme(newDbType)
      }
      // 应用新的动态样式
      applyDynamicStyles()
    })

    // 监听主题变化并应用样式
    watch([customColors, layoutConfig, databaseThemes], () => {
      applyDynamicStyles()
    }, { deep: true })

    onMounted(async () => {
      loadSavedTheme()
      await loadDatabaseUIConfigs()
      
      document.addEventListener('click', handleClickOutside)
      
      // 初始应用动态样式
      applyDynamicStyles()
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
      // 清理动态样式
      removeDynamicStyles()
    })

    return {
      // refs
      themePanel,
      // reactive data
      showThemePanel,
      currentGlobalTheme,
      currentPreset,
      customColors,
      layoutConfig,
      databaseThemes,
      loadedUIConfigs,
      // static data
      globalThemes,
      presetThemes,
      // computed
      quickThemes,
      currentThemeClass,
      // methods
      applyDynamicStyles,
      removeDynamicStyles,
      loadDatabaseUIConfigs,
      selectDatabaseTheme,
      selectGlobalTheme,
      updateCustomTheme,
      updateLayoutConfig,
      resetCustomization,
      applyPreset,
      isThemeActive,
      applyQuickTheme,
      toggleThemePanel,
      closeThemePanel,
      saveTheme,
      exportTheme,
      importTheme
    }
  }
}
</script>

<style lang="scss" scoped>
.ui-theme-manager {
  position: relative;
}

.theme-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  max-height: 80vh;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  .panel-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 600;
    
    .close-btn {
      margin-left: auto;
      padding: 0.375rem;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 0.375rem;
      transition: all 0.2s;
      
      &:hover {
        background: #e2e8f0;
        color: #374151;
      }
    }
  }
  
  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    
    .theme-section {
      margin-bottom: 2rem;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .section-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 600;
        font-size: 0.875rem;
        color: #374151;
        margin-bottom: 1rem;
        
        .reset-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background: white;
          color: #6b7280;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          
          &:hover {
            background: #f3f4f6;
            color: #374151;
          }
        }
      }
      
      .db-themes {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 0.75rem;
        
        .db-theme-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          
          &:hover {
            border-color: #c7d2fe;
            background: #fafbff;
          }
          
          &.active {
            border-color: #3b82f6;
            background: #eff6ff;
          }
          
          .theme-preview {
            display: flex;
            gap: 2px;
            
            .color-primary, .color-accent {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
          }
          
          .theme-info {
            text-align: center;
            
            .theme-icon {
              font-size: 1.25rem;
              margin-bottom: 0.25rem;
            }
            
            .theme-name {
              font-size: 0.75rem;
              font-weight: 600;
              color: #374151;
            }
          }
        }
      }
      
      .global-themes {
        display: flex;
        gap: 0.75rem;
        
        .global-theme-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          
          &:hover {
            border-color: #c7d2fe;
          }
          
          &.active {
            border-color: #3b82f6;
            background: #eff6ff;
          }
          
          .theme-preview {
            width: 60px;
            height: 40px;
            border-radius: 0.375rem;
            overflow: hidden;
            
            .preview-bg {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              
              .preview-surface {
                width: 80%;
                height: 60%;
                border-radius: 0.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
                
                .preview-text {
                  font-size: 0.875rem;
                  font-weight: 600;
                }
              }
            }
          }
          
          .theme-name {
            font-size: 0.75rem;
            font-weight: 600;
            color: #374151;
          }
        }
      }
      
      .color-configs {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        
        .color-config {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          
          label {
            min-width: 80px;
            font-size: 0.875rem;
            color: #374151;
          }
          
          .color-picker {
            width: 40px;
            height: 32px;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            cursor: pointer;
            
            &::-webkit-color-swatch-wrapper {
              padding: 0;
            }
            
            &::-webkit-color-swatch {
              border: none;
              border-radius: 0.25rem;
            }
          }
          
          .color-input {
            flex: 1;
            padding: 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            font-family: monospace;
            font-size: 0.875rem;
            
            &:focus {
              outline: none;
              border-color: #3b82f6;
              box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
            }
          }
        }
      }
      
      .layout-options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        
        .option-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          
          label {
            font-size: 0.875rem;
            color: #374151;
          }
          
          .slider-group {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            
            .slider {
              width: 120px;
            }
            
            .value {
              min-width: 40px;
              font-size: 0.875rem;
              color: #6b7280;
              text-align: right;
            }
          }
          
          .select {
            padding: 0.375rem 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            background: white;
            font-size: 0.875rem;
            
            &:focus {
              outline: none;
              border-color: #3b82f6;
            }
          }
        }
      }
      
      .preset-themes {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 0.75rem;
        
        .preset-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 0.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.5rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.75rem;
          
          &:hover {
            border-color: #c7d2fe;
          }
          
          &.active {
            border-color: #3b82f6;
            background: #eff6ff;
          }
          
          .preset-preview {
            .preset-color {
              width: 32px;
              height: 20px;
              border-radius: 0.375rem;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
          }
        }
      }
    }
  }
  
  .panel-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
  }
}

.theme-quick-switch {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  z-index: 100;
  
  .quick-switch-btn {
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 50%;
    background: white;
    color: #6b7280;
    cursor: pointer;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.15);
      color: #374151;
    }
  }
  
  .quick-themes {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    
    .quick-theme-btn {
      width: 32px;
      height: 32px;
      border: 2px solid white;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.1);
      
      &:hover {
        transform: scale(1.1);
        box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.2);
      }
      
      &.active {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      
      .quick-color {
        width: 100%;
        height: 100%;
        border-radius: 50%;
      }
    }
  }
}
</style>