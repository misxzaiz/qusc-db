<template>
  <aside class="ai-sidebar" :class="{ expanded, resizing: isResizing }">
    <!-- 拖拽调节手柄 -->
    <ResizeHandle :show-indicator="isResizing" />
    
    <div class="panel-content">
      <div class="ai-content">
        <!-- AI配置面板 -->
        <AIConfigPanel v-if="!isConfigured" />
        
        <!-- AI功能区域 -->
        <div v-else class="ai-features">
          <AIChatPanel 
            :show-history-button="hasHistory"
            @toggle-history="toggleHistory" 
          />
        </div>
      </div>
    </div>
    
    <!-- AI配置对话框 -->
    <AIConfigDialog 
      :visible="showConfigDialog"
      @update:visible="showConfigDialog = $event"
      @save="saveAIConfig"
      @cancel="hideConfiguration"
    />

    <!-- AI历史记录抽屉 -->
    <AIHistoryDrawer
      :show-history="showHistory"
      @close="closeHistory"
    />
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import ResizeHandle from '../ResizeHandle.vue'
import PanelHeader from '../shared/PanelHeader.vue'
import AIConfigPanel from './AIConfigPanel.vue'
import AIChatPanel from './AIChatPanel.vue'
import AIHistoryDrawer from './AIHistoryDrawer.vue'
import AIConfigDialog from '../../dialog/AIConfigFormDialog.vue'
import { useAIConfig } from './composables/useAIConfig'
import { useAIHistory } from './composables/useAIHistory'
import { useAISidebarResize } from '@/composables/useAISidebarResize.js'

// Props
const props = defineProps({
  expanded: {
    type: Boolean,
    default: false
  },
  currentConnection: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['close'])

// 使用AI配置管理器
const {
  // 响应式数据
  showConfigDialog,
  
  // 计算属性
  isConfigured,
  
  // 方法
  hideConfiguration,
  saveConfig
} = useAIConfig()

// 使用AI历史管理器
const {
  // 响应式数据
  showHistory,
  
  // 计算属性
  hasHistory,
  
  // 方法
  toggleHistory,
  closeHistory
} = useAIHistory()

// 使用侧边栏调节功能
const { isResizing } = useAISidebarResize()

// 方法
const saveAIConfig = async (config) => {
  return await saveConfig(config)
}
</script>

<style scoped>
.ai-sidebar {
  width: var(--ai-sidebar-width);
  background: white;
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.3s ease;
  position: relative;
  z-index: 20;
}

.ai-sidebar.resizing {
  transition: none; /* 拖拽时禁用过渡动画 */
  box-shadow: -2px 0 8px rgba(99, 102, 241, 0.1);
}

.ai-sidebar:not(.expanded) {
  width: 0;
  overflow: hidden;
}

.panel-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ai-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-features {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.btn-icon {
  padding: 4px 8px;
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
}
</style>