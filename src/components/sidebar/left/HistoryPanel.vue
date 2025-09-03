<template>
  <div class="history-panel panel">
    <PanelHeader title="查询历史">
      <template #actions>
        <button 
          class="btn btn-secondary tooltip" 
          data-tooltip="搜索历史"
          @click="showSearch = !showSearch"
        >
          🔍
        </button>
        <button 
          class="btn btn-secondary tooltip" 
          data-tooltip="导入历史"
          @click="showImportDialog = true"
          :disabled="!hasHistory"
        >
          📥
        </button>
        <button 
          class="btn btn-secondary tooltip" 
          data-tooltip="导出历史"
          @click="exportHistory"
          :disabled="!hasHistory"
        >
          📤
        </button>
        <button 
          class="btn btn-secondary tooltip" 
          data-tooltip="清空历史"
          @click="clearHistory"
          :disabled="!hasHistory"
        >
          🗑️
        </button>
      </template>
    </PanelHeader>
    
    <!-- 搜索和过滤 -->
    <div v-if="showSearch" class="history-filters">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索查询历史..."
          class="input search-input"
        >
      </div>
      
      <div class="filter-tabs">
        <button
          v-for="tab in filterTabs"
          :key="tab.key"
          class="filter-tab"
          :class="{ active: filterType === tab.key }"
          @click="filterType = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>
    </div>
    
    <div class="panel-content">
      <HistoryList
        :histories="queryHistory"
        @load="loadHistoryQuery"
        @copy="copyQuery"
        @delete="handleDeleteHistoryItem"
        @toggle-favorite="toggleFavorite"
        @edit="handleEditHistory"
      />
    </div>
    
    <!-- 编辑对话框 -->
    <HistoryEditDialog
      v-if="showEditDialog"
      :history="editingHistory"
      @update="updateHistory"
      @close="showEditDialog = false"
    />
    
    <!-- 导入对话框 -->
    <ImportDialog
      v-if="showImportDialog"
      @import="handleImportHistory"
      @close="showImportDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import PanelHeader from '../shared/PanelHeader.vue'
import HistoryList from './HistoryList.vue'
import HistoryEditDialog from '../../workspace/HistoryEditDialog.vue'
import ImportDialog from '../../workspace/ImportDialog.vue'
import { useQueryHistory } from './composables/useQueryHistory'
import { useNotificationStore } from '@/stores/notification.js'

const notificationStore = useNotificationStore()

// 响应式状态
const showSearch = ref(false)
const showEditDialog = ref(false)
const showImportDialog = ref(false)
const editingHistory = ref(null)

// 使用查询历史管理器
const {
  // 响应式数据
  searchQuery,
  filterType,
  
  // 计算属性
  queryHistory,
  hasHistory,
  totalCount,
  successCount,
  errorCount,
  favoriteCount,
  
  // 方法
  loadHistoryQuery,
  copyQuery,
  deleteHistoryItem,
  toggleFavorite,
  clearHistory: clearHistoryData,
  exportHistory: exportHistoryData,
  importHistory,
  updateHistory
} = useQueryHistory()

// 计算属性
const filterTabs = computed(() => [
  { key: 'all', label: '全部', count: totalCount.value },
  { key: 'success', label: '成功', count: successCount.value },
  { key: 'error', label: '错误', count: errorCount.value },
  { key: 'favorites', label: '收藏', count: favoriteCount.value }
])

// 方法
const handleDeleteHistoryItem = (historyId) => {
  notificationStore.confirm('确定要删除这条历史记录吗？', () => {
    deleteHistoryItem(historyId)
  })
}

const handleEditHistory = (history) => {
  editingHistory.value = history
  showEditDialog.value = true
}

const clearHistory = () => {
  clearHistoryData()
}

const exportHistory = () => {
  exportHistoryData()
}

const handleImportHistory = (data, mergeMode) => {
  importHistory(data, mergeMode)
  showImportDialog.value = false
}
</script>

<style scoped>
.history-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.history-filters {
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  padding: 12px;
}

.search-box {
  margin-bottom: 8px;
}

.search-input {
  width: 100%;
  font-size: 12px;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
}

.filter-tab {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
}

.filter-tab:hover {
  background: var(--gray-100);
}

.filter-tab.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.tab-count {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 1px 4px;
  font-size: 9px;
  min-width: 14px;
  text-align: center;
}

.filter-tab.active .tab-count {
  background: rgba(255, 255, 255, 0.3);
}

.panel-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>