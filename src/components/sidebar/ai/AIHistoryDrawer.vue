<template>
  <div class="history-drawer" :class="{ 'drawer-open': showHistory }">
    <div class="drawer-header">
      <h3>📝 AI历史记录</h3>
      <div class="drawer-actions">
        <button 
          class="btn-ghost btn-sm" 
          @click="exportHistory"
          title="导出历史"
          :disabled="!hasHistory"
        >
          📤
        </button>
        <button 
          class="btn-ghost btn-sm" 
          @click="clearAllHistory"
          title="清空历史"
          :disabled="!hasHistory"
        >
          🗑️
        </button>
        <button 
          class="btn-ghost btn-sm" 
          @click="closeHistory"
          title="关闭"
        >
          ×
        </button>
      </div>
    </div>
    
    <div class="drawer-content">
      <!-- 搜索和过滤 -->
      <div class="drawer-filters" v-if="hasHistory">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索AI历史..."
        >
        
        <div class="type-filters">
          <button
            v-for="type in typeFilters"
            :key="type.value"
            class="type-filter"
            :class="{ active: selectedType === type.value }"
            @click="selectedType = type.value"
          >
            {{ type.icon }} {{ type.label }}
            <span class="type-count">{{ getTypeCount(type.value) }}</span>
          </button>
        </div>
      </div>
      
      <!-- 历史记录列表 -->
      <div class="history-list">
        <div 
          v-for="item in displayHistory" 
          :key="item.id"
          class="history-item"
          :class="{ error: !item.success }"
          @click="loadHistoryItem(item)"
        >
          <div class="history-type">{{ getHistoryTypeIcon(item.type) }}</div>
          <div class="history-content">
            <div class="history-input">{{ truncateText(item.input, 40) }}</div>
            <div class="history-meta">
              <span class="history-time">{{ formatTime(item.timestamp) }}</span>
              <span class="history-type-label">• {{ getHistoryTypeLabel(item.type) }}</span>
            </div>
          </div>
          <div class="history-actions">
            <button 
              class="btn-ghost action-btn"
              @click.stop="deleteHistoryItem(item.id)"
              title="删除"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <EmptyState
          v-if="!hasHistory"
          icon=" "
          message="暂无AI使用记录"
        />
        
        <EmptyState
          v-else-if="displayHistory.length === 0"
          icon="🔍"
          message="没有找到匹配的记录"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import EmptyState from '../shared/EmptyState.vue'
import { useAIHistory } from './composables/useAIHistory'
import { useNotificationStore } from '@/stores/notification.js'

// Props
const props = defineProps({
  showHistory: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['close'])

const notificationStore = useNotificationStore()

// 使用AI历史管理器
const {
  // 响应式数据
  searchQuery,
  selectedType,
  
  // 计算属性
  aiHistory,
  hasHistory,
  typeCount,
  
  // 方法
  loadHistoryItem,
  deleteHistoryItem: deleteItem,
  clearAllHistory: clearHistory,
  exportHistory: exportHistoryData,
  getHistoryTypeIcon,
  getHistoryTypeLabel,
  truncateText,
  formatTime
} = useAIHistory()

// 本地计算属性
const displayHistory = computed(() => aiHistory.value)

const typeFilters = [
  { value: 'all', label: '全部', icon: '📋' },
  { value: 'sql-generation', label: 'SQL生成', icon: '🔮' },
  { value: 'error-explanation', label: '错误解释', icon: ' ' },
  { value: 'optimization', label: 'SQL优化', icon: '⚡' }
]

// 方法
const closeHistory = () => {
  emit('close')
}

const getTypeCount = (type) => {
  if (type === 'all') {
    return Object.values(typeCount.value).reduce((sum, count) => sum + count, 0)
  }
  return typeCount.value[type] || 0
}

const deleteHistoryItem = (itemId) => {
  notificationStore.confirm('确定要删除这条AI记录吗？', () => {
    deleteItem(itemId)
  })
}

const clearAllHistory = () => {
  clearHistory()
}

const exportHistory = () => {
  exportHistoryData()
}
</script>

<style scoped>
.history-drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: 280px;
  height: 100%;
  background: white;
  border-left: 1px solid var(--border-color);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.history-drawer.drawer-open {
  transform: translateX(0);
}

.drawer-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--gray-50);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-header h3 {
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-800);
  margin: 0;
}

.drawer-actions {
  display: flex;
  gap: 4px;
}

.btn-sm {
  padding: 4px 6px;
  font-size: 11px;
  border-radius: 3px;
}

.drawer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-filters {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--gray-50);
}

.search-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 11px;
  background: white;
  margin-bottom: 8px;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.type-filters {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.type-filter {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--gray-600);
  text-align: left;
}

.type-filter:hover {
  background: var(--gray-100);
  border-color: var(--primary-color);
}

.type-filter.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.type-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 600;
  min-width: 14px;
  text-align: center;
}

.history-list {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  margin-bottom: 6px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-item:hover {
  background: var(--gray-50);
  border-color: var(--primary-color);
}

.history-item.error {
  border-left: 3px solid var(--error-color);
}

.history-type {
  flex-shrink: 0;
  font-size: 14px;
  margin-top: 2px;
}

.history-content {
  flex: 1;
  min-width: 0;
}

.history-input {
  font-size: 11px;
  color: var(--gray-800);
  line-height: 1.3;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.history-meta {
  font-size: 9px;
  color: var(--gray-500);
}

.history-time {
  color: var(--gray-600);
}

.history-type-label {
  color: var(--primary-color);
  font-weight: 500;
}

.history-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.history-item:hover .history-actions {
  opacity: 1;
}

.action-btn {
  padding: 2px 4px;
  font-size: 10px;
  border-radius: 3px;
}
</style>