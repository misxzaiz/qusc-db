import { ref, computed, nextTick } from 'vue'

export function useTabManager() {
  const tabs = ref([
    {
      id: 1,
      name: '查询 1',
      icon: '📝',
      query: '',
      result: null,
      error: null
    }
  ])
  
  const activeTab = ref(1)
  const nextTabId = ref(2)
  
  const currentTab = computed(() => {
    return tabs.value.find(tab => tab.id === activeTab.value) || tabs.value[0]
  })
  
  const createNewTab = () => {
    const newTab = {
      id: nextTabId.value++,
      name: `查询 ${nextTabId.value - 1}`,
      icon: '📝',
      query: '',
      result: null,
      error: null
    }
    
    tabs.value.push(newTab)
    activeTab.value = newTab.id
    
    return newTab
  }
  
  const switchTab = (tabId) => {
    activeTab.value = tabId
  }
  
  const closeTab = (tabId) => {
    if (tabs.value.length <= 1) return false
    
    const index = tabs.value.findIndex(tab => tab.id === tabId)
    if (index === -1) return false
    
    tabs.value.splice(index, 1)
    
    if (activeTab.value === tabId) {
      const newIndex = Math.min(index, tabs.value.length - 1)
      activeTab.value = tabs.value[newIndex].id
    }
    
    return true
  }
  
  const updateTabName = (tabId, name) => {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.name = name
    }
  }
  
  const updateTabQuery = (tabId, query) => {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.query = query
    }
  }
  
  const updateTabResult = (tabId, result) => {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.result = result
      tab.error = null
    }
  }
  
  const updateTabError = (tabId, error) => {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.error = error
      tab.result = null
    }
  }
  
  return {
    tabs,
    activeTab,
    currentTab,
    createNewTab,
    switchTab,
    closeTab,
    updateTabName,
    updateTabQuery,
    updateTabResult,
    updateTabError
  }
}