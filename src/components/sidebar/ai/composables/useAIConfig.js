import { ref, computed } from 'vue'
import { useAIStore } from '@/stores/ai.js'
import { useNotificationStore } from '@/stores/notification.js'

export function useAIConfig() {
  const aiStore = useAIStore()
  const notificationStore = useNotificationStore()
  
  // 响应式数据
  const showConfigDialog = ref(false)
  const isConfiguring = ref(false)
  
  // 计算属性
  const isConfigured = computed(() => {
    return aiStore.isConfigured
  })
  
  const configStatus = computed(() => {
    return aiStore.status || 'unconfigured'
  })
  
  const configStatusText = computed(() => {
    switch (configStatus.value) {
      case 'configured':
        return 'AI服务已配置'
      case 'configuring':
        return '正在配置...'
      case 'error':
        return '配置错误'
      default:
        return 'AI服务未配置'
    }
  })
  
  const configStatusColor = computed(() => {
    switch (configStatus.value) {
      case 'configured':
        return 'var(--success-color)'
      case 'configuring':
        return 'var(--warning-color)'
      case 'error':
        return 'var(--error-color)'
      default:
        return 'var(--gray-400)'
    }
  })
  
  // 方法
  const showConfiguration = () => {
    showConfigDialog.value = true
  }
  
  const hideConfiguration = () => {
    showConfigDialog.value = false
  }
  
  const saveConfig = async (config) => {
    try {
      isConfiguring.value = true
      await aiStore.updateConfig(config)
      notificationStore.success('AI配置已保存')
      hideConfiguration()
      return true
    } catch (error) {
      notificationStore.error(`AI配置保存失败: ${error.message}`)
      return false
    } finally {
      isConfiguring.value = false
    }
  }
  
  const testConfig = async (config) => {
    try {
      isConfiguring.value = true
      const result = await aiStore.testConfig(config)
      if (result.success) {
        notificationStore.success('AI服务连接测试成功')
      } else {
        notificationStore.error(`连接测试失败: ${result.error}`)
      }
      return result
    } catch (error) {
      notificationStore.error(`连接测试失败: ${error.message}`)
      return { success: false, error: error.message }
    } finally {
      isConfiguring.value = false
    }
  }
  
  const resetConfig = () => {
    notificationStore.confirm('确定要重置AI配置吗？', () => {
      aiStore.clearConfig()
      notificationStore.success('AI配置已重置')
    })
  }
  
  return {
    // 响应式数据
    showConfigDialog,
    isConfiguring,
    
    // 计算属性
    isConfigured,
    configStatus,
    configStatusText,
    configStatusColor,
    
    // 方法
    showConfiguration,
    hideConfiguration,
    saveConfig,
    testConfig,
    resetConfig
  }
}