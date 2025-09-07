<template>
  <div class="app">
    <!-- 工具栏 -->
    <AppToolbar 
      @panel-toggle="handlePanelToggle"
      @theme-toggle="handleThemeToggle"
      @settings-open="handleSettingsOpen"
      :active-panel="activePanel"
      :ai-panel-open="aiPanelOpen"
    />
    
    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧边栏 -->
      <LeftSidebar 
        :expanded="leftSidebarExpanded"
        :active-panel="activePanel"
        @connection-select="handleConnectionSelect"
        @schema-refresh="handleSchemaRefresh"
      />
      
      <!-- 工作区 -->
      <Workspace 
        ref="workspaceRef"
        :current-connection="currentConnection"
        @query-execute="handleQueryExecute"
      />
      
      <!-- 右侧AI助手 -->
      <AISidebar 
        :expanded="aiPanelOpen"
        :current-connection="currentConnection"
        @close="handleAIClose"
        @sql-generate="handleSQLGenerate"
      />
    </div>
    
    
    <!-- 通知组件 -->
    <NotificationToast />
    
    <!-- 对话框系统 -->
    <DialogSystem />
    
    <!-- 设置对话框 -->
    <SettingsDialog 
      :visible="showSettings"
      @update:visible="showSettings = $event"
      @close="showSettings = false"
    />

    <!-- Redis操作对话框 -->
    <RedisOperationDialog
      v-if="showRedisDialog"
      ref="redisDialogRef"
      :visible="showRedisDialog"
      :operation="currentRedisOperation"
      :key-name="redisOperationData.keyName"
      :data-type="redisOperationData.dataType"
      :connection-id="redisOperationData.connectionId"
      :database-name="redisOperationData.databaseName"
      @confirm="handleRedisDialogConfirm"
      @cancel="handleRedisDialogCancel"
      @update:visible="showRedisDialog = $event"
    />
    
    <!-- 确认对话框 -->
    <ConfirmDialog
      v-if="showConfirmDialog"
      ref="confirmDialogRef"
      :visible="showConfirmDialog"
      :title="confirmDialogData.title"
      :message="confirmDialogData.message"
      :type="confirmDialogData.type"
      :confirm-text="confirmDialogData.confirmText"
      @confirm="handleConfirmDialogConfirm"
      @cancel="handleConfirmDialogCancel"
      @update:visible="showConfirmDialog = $event"
    />

    <!-- UI主题管理器 -->
    <UIThemeManager 
      :current-db-type="currentConnection?.config?.db_type || 'MySQL'"
      :connection-id="currentConnection?.id || ''"
      :show-quick-switch="true"
      :allow-customization="true"
      @theme-change="handleThemeChange"
      @db-theme-change="handleDbThemeChange"
      @layout-change="handleLayoutChange"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useConnectionStore } from './stores/connection'
import { useAIStore } from './stores/ai'
import { useNotificationStore } from './stores/notification'
import { useThemeStore } from './stores/theme'
import { useTheme } from './composables/useTheme.js'
import { useShortcuts, useAppShortcuts } from './composables/useShortcuts.js'
import { useUserPreferences } from './composables/usePersistence.js'
import { useRedisOperationManager } from './composables/useRedisOperationManager.ts'

// 组件导入
import AppToolbar from './components/toolbar/index.vue'
import LeftSidebar from './components/sidebar/left/index.vue'
import Workspace from './components/workspace/index.vue'
import AISidebar from './components/sidebar/ai/index.vue'
import NotificationToast from './components/notification/index.vue'
import DialogSystem from './components/dialog/index.vue'
import SettingsDialog from './components/settings/SettingsDialog.vue'
import UIThemeManager from './components/database-renderers/UIThemeManager.vue'
import RedisOperationDialog from './components/dialog/RedisOperationDialog.vue'
import ConfirmDialog from './components/dialog/ConfirmDialog.vue'

// 状态管理
const connectionStore = useConnectionStore()
const aiStore = useAIStore()
const notificationStore = useNotificationStore()
const themeStore = useThemeStore()

// 用户体验功能
const { toggleTheme, initTheme } = useTheme()
const { init: initShortcuts } = useShortcuts()
const { registerCommonShortcuts } = useAppShortcuts()
const preferences = useUserPreferences()

// Redis操作管理器
const {
  showDialog: showRedisDialog,
  currentOperation: currentRedisOperation,
  operationData: redisOperationData,
  dialogRef: redisDialogRef,
  initEventListeners: initRedisEvents,
  cleanupEventListeners: cleanupRedisEvents,
  handleDialogConfirm: handleRedisDialogConfirm,
  handleDialogCancel: handleRedisDialogCancel
} = useRedisOperationManager()

// 响应式数据
const activePanel = ref('')
const leftSidebarExpanded = ref(false)
const aiPanelOpen = ref(false)
const currentConnection = ref(null)
const aiStatus = ref('未配置')
const showSettings = ref(false)
const workspaceRef = ref(null)
const notification = reactive({
  show: false,
  message: '',
  type: 'success'
})

// 面板切换处理
const handlePanelToggle = (panelName) => {
  if (panelName === 'ai') {
    aiPanelOpen.value = !aiPanelOpen.value
    showNotification(aiPanelOpen.value ? '已打开AI助手' : '已关闭AI助手')
  } else {
    if (activePanel.value === panelName && leftSidebarExpanded.value) {
      leftSidebarExpanded.value = false
      return
    }
    
    activePanel.value = panelName
    leftSidebarExpanded.value = true
    showNotification(`已打开${getPanelName(panelName)}`)
  }
}

// 连接选择处理
const handleConnectionSelect = async (connectionConfig) => {
  try {
    const connectionId = await connectionStore.connect(connectionConfig)
    currentConnection.value = {
      id: connectionId,
      config: connectionConfig
    }

    // 更新主题系统的数据库上下文
    themeStore.updateDatabaseContext(connectionId, connectionConfig.db_type)
    
    showNotification('数据库连接成功')
  } catch (error) {
    showNotification(`连接失败: ${error}`, 'error')
  }
}

// 结构刷新处理
const handleSchemaRefresh = async () => {
  if (!currentConnection.value) {
    showNotification('请先选择数据库连接', 'warning')
    return
  }
  
  try {
    await connectionStore.refreshSchema(currentConnection.value.id)
    showNotification('数据库结构已刷新')
  } catch (error) {
    showNotification(`刷新失败: ${error}`, 'error')
  }
}

// 查询执行处理
const handleQueryExecute = async (query) => {
  if (!currentConnection.value) {
    showNotification('请先连接数据库', 'warning')
    return
  }
  
  try {
    const result = await connectionStore.executeQuery(currentConnection.value.id, query)
    showNotification(`查询成功，返回 ${result.rows.length} 条记录`)
    return result
  } catch (error) {
    showNotification(`查询失败: ${error}`, 'error')
    throw error
  }
}

// AI关闭处理
const handleAIClose = () => {
  aiPanelOpen.value = false
  showNotification('已关闭AI助手')
}

// SQL生成处理
const handleSQLGenerate = async (prompt, context) => {
  try {
    const sql = await aiStore.generateSQL(prompt, context)
    showNotification('SQL已生成')
    return sql
  } catch (error) {
    showNotification(`SQL生成失败: ${error}`, 'error')
    throw error
  }
}

// 通知显示
const showNotification = (message, type = 'success') => {
  notification.message = message
  notification.type = type
  notification.show = true
  
  setTimeout(() => {
    notification.show = false
  }, 3000)
}

// 隐藏通知
const hideNotification = () => {
  notification.show = false
}

// 主题变化处理
const handleThemeChange = (themeInfo) => {
  themeStore.updateGlobalTheme(themeInfo.theme)
  if (themeInfo.colors) {
    themeStore.updateCustomColors(themeInfo.colors)
  }
  showNotification('主题已更新')
}

const handleDbThemeChange = (dbThemeInfo) => {
  themeStore.updateDatabaseContext(currentConnection.value?.id, dbThemeInfo.dbType)
  showNotification(`${dbThemeInfo.dbType} 主题已更新`)
}

const handleLayoutChange = (layoutInfo) => {
  themeStore.updateLayoutConfig(layoutInfo)
  showNotification('布局配置已更新')
}

// 主题切换处理
const handleThemeToggle = () => {
  themeStore.updateGlobalTheme(
    themeStore.currentGlobalTheme === 'light' ? 'dark' : 'light'
  )
  showNotification('主题已切换')
}

// 设置对话框打开处理
const handleSettingsOpen = () => {
  showSettings.value = true
}

// 获取面板名称
const getPanelName = (panelName) => {
  const names = {
    connections: '连接管理',
    history: '查询历史'
  }
  return names[panelName] || panelName
}

// 全局执行查询处理函数
const handleGlobalExecuteQuery = () => {
  if (!workspaceRef.value) {
    showNotification('工作区未准备就绪', 'warning')
    return
  }
  
  // 触发工作区执行查询，使用专门的快捷键方法
  try {
    workspaceRef.value.executeQueryFromShortcut()
  } catch (error) {
    console.error('执行查询失败:', error)
    showNotification('执行查询失败', 'error')
  }
}

// 组件挂载时初始化
onMounted(async () => {
  try {
    // 初始化主题系统
    initTheme()
    themeStore.initTheme()
    
    // 初始化Redis事件监听器
    initRedisEvents()
    
    // 初始化全局快捷键
    initShortcuts()
    
    // 注册应用级快捷键
    registerCommonShortcuts({
      executeQuery: handleGlobalExecuteQuery,
      toggleTheme: () => {
        handleThemeToggle()
      },
      toggleAI: () => {
        aiPanelOpen.value = !aiPanelOpen.value
        showNotification(aiPanelOpen.value ? '已打开AI助手' : '已关闭AI助手')
      },
      toggleSidebar: () => {
        leftSidebarExpanded.value = !leftSidebarExpanded.value
        showNotification(leftSidebarExpanded.value ? '已展开侧边栏' : '已收起侧边栏')
      },
      refreshSchema: async () => {
        if (currentConnection.value) {
          try {
            await connectionStore.refreshSchema(currentConnection.value.id)
            showNotification('数据库结构已刷新')
          } catch (error) {
            showNotification(`刷新失败: ${error}`, 'error')
          }
        } else {
          showNotification('请先选择数据库连接', 'warning')
        }
      }
    })

    // 初始化AI服务（如果有配置）
    await aiStore.initialize()
    aiStatus.value = 'AI就绪'
  } catch (error) {
    console.warn('AI服务初始化失败:', error)
    aiStatus.value = 'AI未配置'
  }
})

// 组件卸载时清理
onBeforeUnmount(() => {
  cleanupRedisEvents()
})

// 确认对话框状态
const showConfirmDialog = ref(false)
const confirmDialogData = ref({})
const confirmDialogRef = ref(null)
const confirmDialogResolver = ref(null)

// 确认对话框处理函数
function handleConfirmDialogConfirm() {
  if (confirmDialogResolver.value) {
    confirmDialogResolver.value(true)
  }
  showConfirmDialog.value = false
  confirmDialogData.value = {}
}

function handleConfirmDialogCancel() {
  if (confirmDialogResolver.value) {
    confirmDialogResolver.value(false)
  }
  showConfirmDialog.value = false
  confirmDialogData.value = {}
}

// 全局确认对话框事件监听
window.addEventListener('show-confirm-dialog', (event) => {
  const { title, message, type, confirmText, resolve } = event.detail
  
  confirmDialogData.value = {
    title: title || '确认',
    message,
    type: type || 'info',
    confirmText
  }
  confirmDialogResolver.value = resolve
  showConfirmDialog.value = true
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffffff;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 1px;
  background: #e2e8f0;
}
</style>