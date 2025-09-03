<template>
  <nav class="toolbar">
    <div class="toolbar-left">
      <NavigationTabs
        :active-panel="activePanel"
        @panel-select="handlePanelSelect"
      />
    </div>
    
    <div class="toolbar-right">
      <ActionButtons
        :ai-panel-open="aiPanelOpen"
        :ai-status="aiStatus"
        @ai-panel-toggle="handleAIPanelToggle"
        @theme-toggle="handleThemeToggle"
        @settings-open="handleSettingsOpen"
      />
    </div>
  </nav>
</template>

<script setup>
import NavigationTabs from './NavigationTabs.vue'
import ActionButtons from './ActionButtons.vue'
import { useToolbarActions } from './composables/useToolbarActions.js'

// Emits
const emit = defineEmits(['panel-toggle', 'theme-toggle', 'settings-open'])

// 使用工具栏操作逻辑
const {
  // 响应式数据
  activePanel,
  aiPanelOpen,
  
  // 计算属性
  aiStatus,
  
  // 方法
  selectPanel,
  toggleAIPanel
} = useToolbarActions()

// 方法包装，向父组件发送事件
const handlePanelSelect = (panelId) => {
  selectPanel(panelId)
  emit('panel-toggle', panelId)
}

const handleAIPanelToggle = () => {
  toggleAIPanel()
  emit('panel-toggle', 'ai')
}

const handleThemeToggle = () => {
  emit('theme-toggle')
}

const handleSettingsOpen = () => {
  emit('settings-open')
}
</script>

<style scoped>
.toolbar {
  background: #ffffff;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  padding: 0 16px;
  height: var(--toolbar-height);
  align-items: center;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
}
</style>