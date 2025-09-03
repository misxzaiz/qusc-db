// 侧边栏宽度管理
import { ref, computed, watch } from 'vue'

// 默认宽度配置
const DEFAULT_AI_SIDEBAR_WIDTH = 320
const MIN_AI_SIDEBAR_WIDTH = 280
const MAX_AI_SIDEBAR_WIDTH = 600

// 响应式状态
const aiSidebarWidth = ref(DEFAULT_AI_SIDEBAR_WIDTH)
const isResizing = ref(false)

// 从localStorage加载保存的宽度
const loadSavedWidth = () => {
  try {
    const saved = localStorage.getItem('qusc-db-ai-sidebar-width')
    if (saved) {
      const width = parseInt(saved)
      if (width >= MIN_AI_SIDEBAR_WIDTH && width <= MAX_AI_SIDEBAR_WIDTH) {
        aiSidebarWidth.value = width
      }
    }
  } catch (error) {
    console.warn('加载AI侧边栏宽度失败:', error)
  }
}

// 保存宽度到localStorage
const saveWidth = (width) => {
  try {
    localStorage.setItem('qusc-db-ai-sidebar-width', width.toString())
  } catch (error) {
    console.warn('保存AI侧边栏宽度失败:', error)
  }
}

// 设置宽度（带验证和保存）
const setAISidebarWidth = (width) => {
  const clampedWidth = Math.max(MIN_AI_SIDEBAR_WIDTH, Math.min(MAX_AI_SIDEBAR_WIDTH, width))
  aiSidebarWidth.value = clampedWidth
  saveWidth(clampedWidth)
  updateCSSVariable(clampedWidth)
}

// 更新CSS变量
const updateCSSVariable = (width) => {
  document.documentElement.style.setProperty('--ai-sidebar-width', `${width}px`)
}

// 重置为默认宽度
const resetAISidebarWidth = () => {
  setAISidebarWidth(DEFAULT_AI_SIDEBAR_WIDTH)
}

// 监听宽度变化，实时更新CSS变量
watch(aiSidebarWidth, (newWidth) => {
  updateCSSVariable(newWidth)
}, { immediate: true })

// 侧边栏拖拽调节功能
export const useAISidebarResize = () => {
  // 初始化：加载保存的宽度
  loadSavedWidth()

  // 开始拖拽调节
  const startResize = (event) => {
    event.preventDefault()
    isResizing.value = true
    
    const startX = event.clientX
    const startWidth = aiSidebarWidth.value

    const onMouseMove = (moveEvent) => {
      if (!isResizing.value) return
      
      const deltaX = startX - moveEvent.clientX // 注意：从右侧拖拽，所以是相反的
      const newWidth = startWidth + deltaX
      
      // 实时更新宽度（不保存，只在拖拽结束时保存）
      const clampedWidth = Math.max(MIN_AI_SIDEBAR_WIDTH, Math.min(MAX_AI_SIDEBAR_WIDTH, newWidth))
      aiSidebarWidth.value = clampedWidth
      updateCSSVariable(clampedWidth)
    }

    const onMouseUp = () => {
      if (isResizing.value) {
        isResizing.value = false
        // 拖拽结束时保存宽度
        saveWidth(aiSidebarWidth.value)
      }
      
      // 清理事件监听
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mouseleave', onMouseUp)
      
      // 移除拖拽时的鼠标样式
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    // 添加拖拽时的鼠标样式
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    // 添加事件监听
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('mouseleave', onMouseUp) // 鼠标离开页面时也结束拖拽
  }

  // 双击重置宽度
  const onDoubleClick = () => {
    resetAISidebarWidth()
  }

  // 预设宽度选项
  const presetWidths = [
    { name: '紧凑', width: 280 },
    { name: '标准', width: 320 },
    { name: '宽松', width: 380 },
    { name: '超宽', width: 480 }
  ]

  // 应用预设宽度
  const applyPresetWidth = (width) => {
    setAISidebarWidth(width)
  }

  return {
    // 响应式数据
    aiSidebarWidth: computed(() => aiSidebarWidth.value),
    isResizing: computed(() => isResizing.value),
    
    // 常量
    MIN_AI_SIDEBAR_WIDTH,
    MAX_AI_SIDEBAR_WIDTH,
    DEFAULT_AI_SIDEBAR_WIDTH,
    
    // 方法
    setAISidebarWidth,
    resetAISidebarWidth,
    startResize,
    onDoubleClick,
    
    // 预设选项
    presetWidths,
    applyPresetWidth
  }
}