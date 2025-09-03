<template>
  <div 
    class="connection-item list-item"
    :class="{ 
      active: connection.isActive,
      connecting: isConnecting 
    }"
    @click="$emit('connect', connection)"
  >
    <div class="connection-status">
      <div 
        class="status-indicator"
        :class="{
          connected: connection.isActive,
          disconnected: !connection.isActive,
          connecting: isConnecting
        }"
      ></div>
    </div>
    
    <div class="connection-info">
      <div class="connection-name">{{ connection.name }}</div>
      <div class="connection-details">
        {{ connection.config.db_type }} • {{ connection.config.host }}:{{ connection.config.port }}
      </div>
      <div v-if="connection.config.database" class="connection-database">
        数据库: {{ connection.config.database }}
      </div>
    </div>
    
    <div class="connection-actions" v-if="!isConnecting">
      <button 
        class="btn-ghost tooltip action-btn" 
        data-tooltip="编辑连接"
        @click.stop="$emit('edit', connection)"
      >
        ✏️
      </button>
      <button 
        class="btn-ghost tooltip action-btn" 
        data-tooltip="删除连接"
        @click.stop="$emit('delete', connection.name)"
      >
        🗑️
      </button>
    </div>
    
    <div class="connection-loading" v-else>
      <div class="loading"></div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  connection: {
    type: Object,
    required: true
  },
  isConnecting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['connect', 'edit', 'delete'])
</script>

<style scoped>
.connection-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.connection-item:hover {
}

.connection-item.active {
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
}

.connection-item.connecting {
  opacity: 0.7;
  cursor: wait;
}

.connection-status {
  flex-shrink: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.status-indicator.connected {
  background: var(--success-color);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.status-indicator.disconnected {
  background: var(--gray-300);
}

.status-indicator.connecting {
  background: var(--warning-color);
  animation: pulse 1.5s infinite;
}

.connection-info {
  flex: 1;
  min-width: 0;
}

.connection-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-800);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connection-details {
  font-size: 11px;
  color: var(--gray-500);
  margin-bottom: 2px;
}

.connection-database {
  font-size: 10px;
  color: var(--primary-color);
  font-weight: 500;
}

.connection-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.connection-item:hover .connection-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px;
  font-size: 12px;
  border-radius: 3px;
}

.connection-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>