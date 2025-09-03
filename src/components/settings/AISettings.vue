<template>
  <div class="ai-settings">
    <div class="settings-group">
      <h3 class="group-title">AI服务配置</h3>
      <p class="group-description">
        配置AI服务以启用智能SQL生成、错误解释和数据库分析功能
      </p>
      
      <!-- 配置状态 -->
      <div class="config-status-card" :class="{ configured: isConfigured }">
        <div class="status-header">
          <div class="status-indicator" :style="{ backgroundColor: configStatusColor }"></div>
          <span class="status-text">{{ configStatusText }}</span>
          <button 
            v-if="isConfigured"
            type="button"
            class="btn btn-ghost btn-sm"
            @click="showConfiguration"
          >
            重新配置
          </button>
        </div>
        
        <div v-if="isConfigured" class="config-details">
          <div class="config-item">
            <span class="label">服务商:</span>
            <span class="value">{{ currentProvider || '未知' }}</span>
          </div>
          <div class="config-item">
            <span class="label">模型:</span>
            <span class="value">{{ currentModel || '未知' }}</span>
          </div>
          <div class="config-item">
            <span class="label">API状态:</span>
            <span class="value" :class="{ success: isConfigured }">
              {{ isConfigured ? '已连接' : '未连接' }}
            </span>
          </div>
        </div>
        
        <div v-if="!isConfigured" class="config-prompt">
          <button 
            type="button"
            class="btn btn-primary"
            @click="showConfiguration"
            :disabled="isConfiguring"
          >
            {{ isConfiguring ? '配置中...' : '配置AI服务' }}
          </button>
        </div>
      </div>
      
      <!-- AI功能设置 -->
      <div v-if="isConfigured" class="ai-features-settings">
        <h4 class="feature-title">功能设置</h4>
        
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">自动SQL优化建议</label>
            <p class="setting-description">AI会自动分析你的SQL并提供优化建议</p>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input 
                type="checkbox" 
                :checked="preferences.ai?.autoOptimize ?? true"
                @change="handleSettingChange('ai.autoOptimize', $event.target.checked)"
              >
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">详细查询解释</label>
            <p class="setting-description">显示SQL查询的详细执行逻辑解释</p>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input 
                type="checkbox" 
                :checked="preferences.ai?.explainQueries ?? true"
                @change="handleSettingChange('ai.explainQueries', $event.target.checked)"
              >
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">保存AI对话历史</label>
            <p class="setting-description">保存与AI助手的对话记录</p>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input 
                type="checkbox" 
                :checked="preferences.ai?.saveHistory ?? true"
                @change="handleSettingChange('ai.saveHistory', $event.target.checked)"
              >
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <!-- 温度参数设置 -->
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">响应创新性</label>
            <p class="setting-description">控制AI回答的创新程度 (0-1，越高越创新)</p>
          </div>
          <div class="setting-control range-control">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1"
              :value="preferences.ai?.temperature ?? aiStore.settings.temperature"
              @input="handleSettingChange('ai.temperature', parseFloat($event.target.value))"
              class="range-slider"
            >
            <span class="range-value">{{ (preferences.ai?.temperature ?? aiStore.settings.temperature).toFixed(1) }}</span>
          </div>
        </div>
        
        <!-- 最大Token数设置 -->
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">回答长度限制</label>
            <p class="setting-description">控制AI单次回答的最大长度。更高的token数支持更详细的分析和解释</p>
          </div>
          <div class="setting-control">
            <select 
              :value="preferences.ai?.maxTokens ?? aiStore.settings.maxTokens"
              @change="handleSettingChange('ai.maxTokens', parseInt($event.target.value))"
              class="select"
            >
              <option value="1024">短回答 (1K)</option>
              <option value="2048">标准回答 (2K)</option>
              <option value="4096">长回答 (4K)</option>
              <option value="8192">超长回答 (8K)</option>
              <option value="16384">专业回答 (16K)</option>
              <option value="32768">详细回答 (32K)</option>
              <option value="65536">最大回答 (64K)</option>
              <option value="131072">极限回答 (128K)</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- 数据隐私设置 -->
      <div class="privacy-settings">
        <h4 class="feature-title">数据隐私</h4>
        
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">敏感数据保护</label>
            <p class="setting-description">在发送给AI时自动过滤敏感数据</p>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input 
                type="checkbox" 
                :checked="preferences.ai?.protectSensitiveData ?? true"
                @change="handleSettingChange('ai.protectSensitiveData', $event.target.checked)"
              >
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="privacy-note">
          <div class="note-icon">🔒</div>
          <div class="note-content">
            <p><strong>隐私承诺:</strong> 我们致力于保护您的数据隐私。数据库结构信息只会在您明确同意的情况下发送给AI服务商，用于提供更好的查询建议。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- AI配置对话框 -->
  <AIConfigDialog 
    :visible="showConfigDialog"
    @update:visible="showConfigDialog = $event"
    @save="handleConfigSave"
    @cancel="hideConfiguration"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useAIStore } from '@/stores/ai.js'
import { useNotificationStore } from '@/stores/notification.js'
import { useAIConfig } from '../sidebar/ai/composables/useAIConfig.js'
import AIConfigDialog from '../dialog/AIConfigFormDialog.vue'

// Props
const props = defineProps({
  preferences: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['setting-change'])

// Stores
const aiStore = useAIStore()
const notificationStore = useNotificationStore()

// 使用AI配置管理器
const {
  showConfigDialog,
  isConfiguring,
  isConfigured,
  configStatusText,
  configStatusColor,
  showConfiguration,
  hideConfiguration,
  saveConfig
} = useAIConfig()

// 计算属性
const currentProvider = computed(() => aiStore.currentProvider)
const currentModel = computed(() => aiStore.model)

// 方法
const handleSettingChange = (key, value) => {
  // 直接更新AI store的设置
  aiStore.updateSettings(key, value)
  // 同时通知父组件
  emit('setting-change', key, value)
  
  // 显示保存成功提示
  const settingNames = {
    'ai.temperature': '响应创新性',
    'ai.maxTokens': '回答长度限制',
    'ai.autoOptimize': '自动SQL优化',
    'ai.explainQueries': '详细查询解释',
    'ai.saveHistory': '保存对话历史'
  }
  
  const settingName = settingNames[key] || '设置'
  notificationStore.success(`${settingName}已更新`, { duration: 2000 })
}

const handleConfigSave = async (config) => {
  try {
    await saveConfig(config)
    notificationStore.success('AI配置已保存')
  } catch (error) {
    notificationStore.error(`保存配置失败: ${error.message}`)
  }
}
</script>

<style scoped>
.ai-settings {
  max-width: 600px;
}

.settings-group {
  margin-bottom: 32px;
}

.group-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-800);
  margin: 0 0 8px;
}

.group-description {
  font-size: 13px;
  color: var(--gray-600);
  margin: 0 0 20px;
  line-height: 1.4;
}

.config-status-card {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 16px;
  margin-bottom: 24px;
  background: var(--gray-50);
  transition: all 0.2s ease;
}

.config-status-card.configured {
  background: var(--success-light);
  border-color: var(--success-color);
}

.status-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-700);
}

.config-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-item .label {
  font-size: 12px;
  color: var(--gray-600);
}

.config-item .value {
  font-size: 12px;
  font-weight: 500;
  color: var(--gray-800);
}

.config-item .value.success {
  color: var(--success-color);
}

.config-prompt {
  text-align: center;
}

.ai-features-settings,
.privacy-settings {
  margin-top: 24px;
}

.feature-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-800);
  margin: 0 0 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
  margin-right: 16px;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-800);
  margin-bottom: 4px;
}

.setting-description {
  font-size: 12px;
  color: var(--gray-600);
  margin: 0;
  line-height: 1.4;
}

.setting-control {
  flex-shrink: 0;
}

.range-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-slider {
  width: 100px;
}

.range-value {
  font-size: 12px;
  color: var(--gray-600);
  min-width: 24px;
  text-align: center;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--gray-300);
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.privacy-note {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--info-light);
  border: 1px solid var(--info-color);
  border-radius: var(--border-radius);
  margin-top: 16px;
}

.note-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.note-content p {
  font-size: 12px;
  color: var(--gray-700);
  margin: 0;
  line-height: 1.4;
}
</style>