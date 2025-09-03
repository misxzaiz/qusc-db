import { ref, computed } from 'vue'
import { useAIStore } from '@/stores/ai.js'

export function useToolbarActions() {
  const aiStore = useAIStore()
  
  // 响应式数据
  const activePanel = ref('')
  const aiPanelOpen = ref(false)
  
  // 计算属性
  const aiStatus = computed(() => {
    return aiStore.status || 'unknown'
  })
  
  // 面板配置
  const navigationPanels = [
    {
      id: 'connections',
      name: '连接',
      icon: '📊'
    },
    {
      id: 'history',
      name: '历史',
      icon: '📝'
    }
  ]
  
  // 方法
  const togglePanel = (panelId) => {
    if (panelId === 'ai') {
      aiPanelOpen.value = !aiPanelOpen.value
      return
    }
    
    if (activePanel.value === panelId) {
      activePanel.value = ''
    } else {
      activePanel.value = panelId
    }
  }
  
  const selectPanel = (panelId) => {
    activePanel.value = panelId
  }
  
  const toggleAIPanel = () => {
    aiPanelOpen.value = !aiPanelOpen.value
  }
  
  const closeAllPanels = () => {
    activePanel.value = ''
    aiPanelOpen.value = false
  }
  
  return {
    // 响应式数据
    activePanel,
    aiPanelOpen,
    
    // 计算属性
    aiStatus,
    navigationPanels,
    
    // 方法
    togglePanel,
    selectPanel,
    toggleAIPanel,
    closeAllPanels
  }
}