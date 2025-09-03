<template>
  <div class="ai-display-settings" v-show="isVisible">
    <div class="settings-header">
      <h4>💡 显示设置</h4>
      <button class="close-btn" @click="$emit('close')" title="关闭">×</button>
    </div>
    
    <div class="settings-content">
      <!-- 宽度调节 -->
      <div class="setting-group">
        <label class="setting-label">📐 侧边栏宽度</label>
        <div class="width-controls">
          <div class="width-slider">
            <input 
              type="range" 
              :min="MIN_AI_SIDEBAR_WIDTH" 
              :max="MAX_AI_SIDEBAR_WIDTH" 
              :value="currentWidth"
              @input="handleWidthChange"
              class="slider"
            />
            <div class="width-display">
              <span class="current-width">{{ currentWidth }}px</span>
              <button 
                class="reset-btn" 
                @click="resetWidth"
                title="重置为默认宽度"
              >
                ↺
              </button>
            </div>
          </div>
          
          <!-- 预设宽度按钮 -->
          <div class="preset-buttons">
            <button 
              v-for="preset in presetWidths"
              :key="preset.name"
              class="preset-btn"
              :class="{ active: currentWidth === preset.width }"
              @click="applyPresetWidth(preset.width)"
              :title="`${preset.name} (${preset.width}px)`"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- 显示模式 -->
      <div class="setting-group">
        <label class="setting-label">🎨 显示模式</label>
        <div class="display-modes">
          <label class="mode-option">
            <input 
              type="radio" 
              value="normal" 
              v-model="displayMode"
              @change="updateDisplayMode"
            />
            <span class="mode-label">标准模式</span>
          </label>
          <label class="mode-option">
            <input 
              type="radio" 
              value="compact" 
              v-model="displayMode"
              @change="updateDisplayMode"
            />
            <span class="mode-label">紧凑模式</span>
          </label>
        </div>
      </div>
      
      <!-- 其他设置 -->
      <div class="setting-group">
        <label class="setting-label">⚙️ 功能选项</label>
        <div class="feature-toggles">
          <label class="toggle-option">
            <input 
              type="checkbox" 
              v-model="showCodeLineNumbers"
              @change="updateCodeSettings"
            />
            <span class="toggle-label">代码行号</span>
          </label>
          <label class="toggle-option">
            <input 
              type="checkbox" 
              v-model="enableSyntaxHighlight"
              @change="updateCodeSettings"
            />
            <span class="toggle-label">语法高亮</span>
          </label>
          <label class="toggle-option">
            <input 
              type="checkbox" 
              v-model="autoScrollToBottom"
              @change="updateScrollSettings"
            />
            <span class="toggle-label">自动滚动</span>
          </label>
        </div>
      </div>
    </div>
    
    <!-- 快捷提示 -->
    <div class="settings-footer">
      <div class="tips">
        💡 拖拽左侧边缘可快速调节宽度，双击重置
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAISidebarResize } from '@/composables/useAISidebarResize.js'

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['close', 'settings-change'])

// 使用侧边栏调节功能
const {
  aiSidebarWidth,
  MIN_AI_SIDEBAR_WIDTH,
  MAX_AI_SIDEBAR_WIDTH,
  setAISidebarWidth,
  resetAISidebarWidth,
  presetWidths,
  applyPresetWidth
} = useAISidebarResize()

// 当前宽度
const currentWidth = computed(() => aiSidebarWidth.value)

// 显示设置
const displayMode = ref('normal')
const showCodeLineNumbers = ref(true)
const enableSyntaxHighlight = ref(true)
const autoScrollToBottom = ref(true)

// 加载保存的设置
const loadSettings = () => {
  try {
    const savedMode = localStorage.getItem('qusc-db-ai-display-mode')
    if (savedMode) {
      displayMode.value = savedMode
    }
    
    const codeSettings = JSON.parse(localStorage.getItem('qusc-db-ai-code-settings') || '{}')
    showCodeLineNumbers.value = codeSettings.lineNumbers !== false
    enableSyntaxHighlight.value = codeSettings.syntaxHighlight !== false
    
    const scrollSettings = JSON.parse(localStorage.getItem('qusc-db-ai-scroll-settings') || '{}')
    autoScrollToBottom.value = scrollSettings.autoScroll !== false
  } catch (error) {
    console.warn('加载AI设置失败:', error)
  }
}

// 保存设置
const saveSettings = () => {
  try {
    localStorage.setItem('qusc-db-ai-display-mode', displayMode.value)
    localStorage.setItem('qusc-db-ai-code-settings', JSON.stringify({
      lineNumbers: showCodeLineNumbers.value,
      syntaxHighlight: enableSyntaxHighlight.value
    }))
    localStorage.setItem('qusc-db-ai-scroll-settings', JSON.stringify({
      autoScroll: autoScrollToBottom.value
    }))
  } catch (error) {
    console.warn('保存AI设置失败:', error)
  }
}

// 处理宽度变化
const handleWidthChange = (event) => {
  const newWidth = parseInt(event.target.value)
  setAISidebarWidth(newWidth)
}

// 重置宽度
const resetWidth = () => {
  resetAISidebarWidth()
}

// 更新显示模式
const updateDisplayMode = () => {
  saveSettings()
  emit('settings-change', {
    type: 'display-mode',
    value: displayMode.value
  })
}

// 更新代码设置
const updateCodeSettings = () => {
  saveSettings()
  emit('settings-change', {
    type: 'code-settings',
    value: {
      lineNumbers: showCodeLineNumbers.value,
      syntaxHighlight: enableSyntaxHighlight.value
    }
  })
}

// 更新滚动设置
const updateScrollSettings = () => {
  saveSettings()
  emit('settings-change', {
    type: 'scroll-settings',
    value: {
      autoScroll: autoScrollToBottom.value
    }
  })
}

// 初始化
loadSettings()
</script>

<style scoped>
.ai-display-settings {
  position: absolute;
  top: 44px;
  right: 12px;
  width: 280px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  font-size: 12px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  background: #f8fafc;
  border-radius: 8px 8px 0 0;
}

.settings-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #9ca3af;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.settings-content {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  font-size: 12px;
}

.width-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.width-slider {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #e5e7eb;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #6366f1;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #6366f1;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.width-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-width {
  font-weight: 600;
  color: #6366f1;
  font-family: monospace;
}

.reset-btn {
  padding: 2px 6px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: #e5e7eb;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.preset-btn {
  padding: 4px 8px;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 500;
  transition: all 0.2s ease;
  color: #6b7280;
}

.preset-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.preset-btn.active {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
}

.display-modes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.mode-option input[type="radio"] {
  margin: 0;
}

.mode-label {
  font-size: 12px;
  color: #374151;
}

.feature-toggles {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toggle-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.toggle-option input[type="checkbox"] {
  margin: 0;
}

.toggle-label {
  font-size: 12px;
  color: #374151;
}

.settings-footer {
  padding: 12px 16px;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
  border-radius: 0 0 8px 8px;
}

.tips {
  font-size: 10px;
  color: #9ca3af;
  text-align: center;
  line-height: 1.4;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .ai-display-settings {
    right: 8px;
    width: calc(100vw - 32px);
    max-width: 300px;
  }
  
  .preset-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>