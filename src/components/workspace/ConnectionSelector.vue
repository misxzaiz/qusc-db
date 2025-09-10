<template>
  <div class="connection-selector-modern">
    <!-- 连接选择器 -->
    <div class="selector-container connection-container">
      <i class="fas fa-server selector-icon"></i>
      <div class="selector-wrapper">
        <select 
          :value="selectedConnectionKey" 
          class="modern-select connection-select"
          @change="$emit('connection-change', $event.target.value)"
          :title="connectionTooltip"
        >
          <option value="">选择连接</option>
          <option 
            v-for="connection in connectionsList" 
            :key="connection.key" 
            :value="connection.key"
          >
            {{ connection.name }}
          </option>
        </select>
        <i class="fas fa-chevron-down dropdown-arrow"></i>
      </div>
      <div 
        class="status-indicator" 
        :class="connectionStatusClass"
        :title="connectionStatusText"
      ></div>
    </div>
    
    <!-- 数据库选择器 -->
    <div class="selector-container database-container">
      <i class="fas fa-database selector-icon"></i>
      <div class="selector-wrapper">
        <select 
          :value="selectedDatabase" 
          class="modern-select database-select"
          :disabled="!selectedConnectionKey || isLoadingDatabases"
          @change="$emit('database-change', $event.target.value)"
          :title="databaseTooltip"
        >
          <option value="">选择数据库</option>
          <option 
            v-for="database in availableDatabases" 
            :key="database" 
            :value="database"
          >
            {{ database }}
          </option>
        </select>
        <i class="fas fa-chevron-down dropdown-arrow"></i>
      </div>
      <div class="info-badge" v-if="selectedDatabase && tableCount > 0">
        {{ tableCount }}表
      </div>
      <div class="loading-indicator" v-if="isLoadingDatabases">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  selectedConnectionKey: {
    type: String,
    default: ''
  },
  selectedDatabase: {
    type: String,
    default: ''
  },
  connectionsList: {
    type: Array,
    default: () => []
  },
  availableDatabases: {
    type: Array,
    default: () => []
  },
  isLoadingDatabases: {
    type: Boolean,
    default: false
  },
  currentConnection: {
    type: Object,
    default: null
  },
  tableCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['connection-change', 'database-change'])

// 计算属性
const selectedConnection = computed(() => {
  return props.connectionsList.find(conn => conn.key === props.selectedConnectionKey)
})

const connectionStatusClass = computed(() => {
  if (!props.selectedConnectionKey) return 'status-none'
  if (!props.currentConnection) return 'status-disconnected'
  
  const status = props.currentConnection.status || 'disconnected'
  return `status-${status}`
})

const connectionStatusText = computed(() => {
  if (!props.selectedConnectionKey) return '未选择连接'
  if (!props.currentConnection) return '未连接'
  
  const statusMap = {
    connected: '已连接',
    connecting: '连接中...',
    disconnected: '连接断开',
    error: '连接错误'
  }
  
  return statusMap[props.currentConnection.status] || '未知状态'
})

const connectionTooltip = computed(() => {
  if (!selectedConnection.value) return '请选择一个数据库连接'
  
  const conn = selectedConnection.value
  const status = connectionStatusText.value
  const displayName = conn.displayName || conn.name || '未命名连接'
  const hostInfo = conn.host ? `${conn.host}:${conn.port || ''}` : '未知地址'
  
  return `连接名称: ${displayName}\n状态: ${status}\n地址: ${hostInfo}`
})

const databaseTooltip = computed(() => {
  if (!props.selectedDatabase) return '请选择数据库'
  if (props.tableCount > 0) {
    return `数据库: ${props.selectedDatabase}\n包含 ${props.tableCount} 个表`
  }
  return `数据库: ${props.selectedDatabase}`
})
</script>

<style scoped>
.connection-selector-modern {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 2px;
}

.selector-container {
  display: flex;
  align-items: center;
  gap: 3px;
  position: relative;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 3px 6px;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
  min-height: 24px;
}

.selector-container:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
  transform: translateY(-1px);
}

.selector-container:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.selector-icon {
  color: var(--gray-500);
  font-size: 11px;
  flex-shrink: 0;
  transition: color 0.2s ease;
  width: 12px;
  text-align: center;
}

.connection-container .selector-icon {
  color: var(--info-color);
}

.database-container .selector-icon {
  color: var(--success-color);
}

.selector-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.modern-select {
  width: 100%;
  min-width: 80px;
  max-width: 140px;
  padding: 2px 16px 2px 4px;
  border: none;
  background: transparent;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  appearance: none;
  outline: none;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modern-select:disabled {
  color: var(--gray-400);
  cursor: not-allowed;
}

.modern-select option {
  padding: 6px 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 10px;
  border-radius: 0;
  transition: all 0.2s ease;
}

.modern-select option:hover {
  background: var(--primary-color);
  color: white;
}

.modern-select option:checked {
  background: var(--primary-color);
  color: white;
  font-weight: 600;
}

.dropdown-arrow {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 8px;
  color: var(--gray-400);
  pointer-events: none;
  transition: all 0.2s ease;
}

.selector-container:hover .dropdown-arrow {
  color: var(--primary-color);
}

.selector-container.open .dropdown-arrow {
  transform: translateY(-50%) rotate(180deg);
  color: var(--primary-color);
}

.selector-container:focus-within .dropdown-arrow {
  color: var(--primary-color);
}

/* 状态指示器 */
.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.status-none {
  background: var(--gray-300);
}

.status-connected {
  background: var(--success-color);
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}

.status-connecting {
  background: var(--warning-color);
  animation: pulse 1.5s infinite;
}

.status-disconnected {
  background: var(--error-color);
}

.status-error {
  background: var(--error-color);
  animation: shake 0.5s ease-in-out;
}

/* 信息徽章 */
.info-badge {
  background: var(--success-color);
  color: white;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 8px;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.2;
}

.loading-indicator {
  color: var(--warning-color);
  font-size: 10px;
  animation: spin 1s linear infinite;
}

/* 动画效果 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.2);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .connection-selector-modern {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .selector-container {
    width: 100%;
  }
  
  .modern-select {
    min-width: 100px;
    font-size: 11px;
  }
}

/* 美化select的focus状态 */
.modern-select:focus {
  outline: none;
}

.modern-select:focus + .dropdown-arrow {
  color: var(--primary-color);
  transform: translateY(-50%) rotate(180deg);
}

/* 为现代浏览器提供更好的下拉样式 */
@supports (-webkit-appearance: none) {
  .modern-select {
    -webkit-appearance: none;
    -moz-appearance: none;
  }
  
  .modern-select::-ms-expand {
    display: none;
  }
}

/* 主题适配 */
[data-theme="dark"] .selector-container {
  background: var(--bg-secondary);
  border-color: var(--gray-600);
}

[data-theme="dark"] .selector-container:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

[data-theme="dark"] .modern-select option {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .modern-select option:hover {
  background: var(--primary-color);
  color: white;
}
</style>