<template>
  <div class="ai-config-panel">
    <div class="config-status">
      <div class="status-indicator" :style="{ backgroundColor: configStatusColor }"></div>
      <span class="status-text">{{ configStatusText }}</span>
    </div>
    
    <div v-if="!isConfigured" class="config-prompt">
      <div class="config-icon">⚙️</div>
      <div class="config-message">
        配置AI服务以使用智能功能
      </div>
      <div class="config-features">
        <div class="feature-item">🔮 智能SQL生成</div>
        <div class="feature-item">  错误智能解释</div>
        <div class="feature-item">⚡ SQL性能优化</div>
        <div class="feature-item">📊 数据库分析</div>
      </div>
      <button 
        class="btn btn-primary" 
        @click="showConfiguration"
        :disabled="isConfiguring"
      >
        {{ isConfiguring ? '配置中...' : '配置AI服务' }}
      </button>
    </div>
    
    <div v-else class="config-ready">
      <div class="ready-icon">✅</div>
      <div class="ready-message">AI服务已就绪</div>
      <div class="ready-actions">
        <button 
          class="btn btn-secondary btn-sm" 
          @click="showConfiguration"
        >
          重新配置
        </button>
        <button 
          class="btn btn-ghost btn-sm" 
          @click="resetConfig"
        >
          重置配置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAIConfig } from './composables/useAIConfig'

// 使用AI配置管理器
const {
  // 响应式数据
  isConfiguring,
  
  // 计算属性
  isConfigured,
  configStatusText,
  configStatusColor,
  
  // 方法
  showConfiguration,
  resetConfig
} = useAIConfig()
</script>

<style scoped>
.ai-config-panel {
  padding: 20px;
  text-align: center;
}

.config-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 8px 12px;
  background: var(--gray-50);
  border-radius: var(--border-radius);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--gray-700);
}

.config-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.config-icon {
  font-size: 48px;
  opacity: 0.8;
}

.config-message {
  font-size: 14px;
  color: var(--gray-600);
  line-height: 1.4;
  max-width: 200px;
}

.config-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 8px 0;
}

.feature-item {
  font-size: 12px;
  color: var(--gray-500);
  text-align: left;
  padding: 4px 0;
  border-bottom: 1px dashed var(--border-color);
}

.feature-item:last-child {
  border-bottom: none;
}

.config-ready {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.ready-icon {
  font-size: 32px;
}

.ready-message {
  font-size: 14px;
  color: var(--success-color);
  font-weight: 500;
}

.ready-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}
</style>