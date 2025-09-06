<template>
  <div 
    class="connection-header" 
    @click="handleToggle"
    :class="{ 'expanded': connection.expanded }"
  >
    <i 
      class="fas fa-chevron-right expand-icon" 
      :class="{ 'expanded': connection.expanded }"
    ></i>
    <i :class="getDbTypeIcon(connection.config.db_type)" class="db-icon"></i>
    <span class="connection-name">{{ connection.name }}</span>
    <span class="connection-info">{{ connection.info }}</span>
    <span 
      class="connection-status" 
      :class="getStatusClass(connection.status)"
      :title="getStatusText(connection.status)"
    >
      ●
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  connection: {
    type: Object,
    required: true
  }
})

// Events
const emit = defineEmits(['toggle'])

// 处理点击切换
function handleToggle() {
  emit('toggle', props.connection)
}

// 获取数据库类型图标
function getDbTypeIcon(dbType) {
  const iconMap = {
    MySQL: 'fas fa-database',
    PostgreSQL: 'fas fa-database', 
    Redis: 'fas fa-cube',
    MongoDB: 'fas fa-leaf',
    SQLite: 'fas fa-database'
  }
  return iconMap[dbType] || 'fas fa-database'
}

// 获取连接状态样式
function getStatusClass(status) {
  const statusMap = {
    'connected': 'status-connected',
    'disconnected': 'status-disconnected', 
    'connecting': 'status-connecting',
    'error': 'status-error'
  }
  return statusMap[status] || 'status-disconnected'
}

// 获取状态文本
function getStatusText(status) {
  const textMap = {
    'connected': '已连接',
    'disconnected': '未连接',
    'connecting': '连接中...',
    'error': '连接错误'
  }
  return textMap[status] || '未连接'
}
</script>

<style scoped>
.connection-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.connection-header:hover {
  background: #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.expand-icon {
  transition: transform 0.2s ease;
  color: #6c757d;
  font-size: 12px;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.db-icon {
  color: #495057;
  font-size: 14px;
}

.connection-name {
  flex: 1;
  color: #333;
  font-weight: 600;
}

.connection-info {
  font-size: 11px;
  color: #6c757d;
}

.connection-status {
  font-size: 10px;
  transition: color 0.2s ease;
}

.status-connected {
  color: #28a745;
}

.status-disconnected {
  color: #dc3545;
}

.status-connecting {
  color: #ffc107;
  animation: pulse 1.5s infinite;
}

.status-error {
  color: #dc3545;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>