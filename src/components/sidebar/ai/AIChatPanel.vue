<template>
  <div class="ai-chat-panel">
    <div class="chat-container">
      <SmartChatInterface />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SmartChatInterface from '../../ai/SmartChatInterface.vue'
import AIDisplaySettings from './AIDisplaySettings.vue'
import { useAIStore } from '@/stores/ai.js'

// Props
const props = defineProps({
  showHistoryButton: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['toggle-history', 'settings-change'])

// Stores
const aiStore = useAIStore()

// 显示设置状态
const showSettings = ref(false)

// 计算属性
const historyCount = computed(() => {
  return aiStore.history?.length || 0
})

// 切换设置面板
const toggleSettings = () => {
  showSettings.value = !showSettings.value
}

// 处理设置变化
const handleSettingsChange = (setting) => {
  console.log('设置变化:', setting)
  emit('settings-change', setting)
}
</script>

<style scoped>
.ai-chat-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative; /* 为设置面板提供定位上下文 */
}

.chat-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chat-actions {
  padding: 8px 12px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.btn-sm {
  padding: 6px 8px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-sm:hover {
  background: #f3f4f6;
}

.btn-sm.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.history-count {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 4px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 600;
  min-width: 16px;
  text-align: center;
}

.settings-btn {
  padding: 4px 6px;
  min-width: 28px;
  justify-content: center;
}

.settings-btn:hover {
  transform: rotate(45deg);
}

.settings-btn.active {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
  transform: rotate(45deg);
}
</style>