<template>
  <div class="query-tabs-compact">
    <!-- 内联统计信息 + Tab导航 -->
    <div class="unified-header" ref="headerContainer">
      <!-- 右侧：Tab列表 -->
      <div class="tab-list-container">
        <div class="tab-list-compact" :style="{ transform: `translateX(${scrollOffset}px)` }">
          <div
            v-for="(query, index) in queries"
            :key="index"
            class="tab-item-compact"
            :class="{ active: activeTab === index, success: query.success, error: !query.success }"
            @click="$emit('switch-tab', index)"
            :title="getTabTooltip(query, index)"
          >
            <span class="tab-label">{{ getStatusIcon(query) }}{{ getTabLabel(query, index) }}</span>
          </div>
        </div>
        
        <!-- 滚动控制按钮 -->
        <button 
          v-if="showScrollButtons"
          class="scroll-btn-compact scroll-left"
          @click="scrollTabs(-1)"
          :disabled="scrollOffset >= 0"
        >
          ◀
        </button>
        <button 
          v-if="showScrollButtons"
          class="scroll-btn-compact scroll-right"
          @click="scrollTabs(1)"
          :disabled="!canScrollRight"
        >
          ▶
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  queries: {
    type: Array,
    required: true,
    default: () => []
  },
  activeTab: {
    type: Number,
    default: 0
  },
  batchSummary: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['switch-tab'])

// 响应式数据
const headerContainer = ref(null)
const scrollOffset = ref(0)
const showScrollButtons = ref(false)
const canScrollRight = ref(false)

// 计算属性
const tabWidth = 60 // 压缩后的Tab宽度

// 方法
const getStatusIcon = (query) => {
  if (query.success === undefined) return '⏳'
  return query.success ? '✅' : '❌'
}

const getTabLabel = (query, index) => {
  // 极简标签：Q1, Q2, Q3...
  return `Q${index + 1}`
}

const getTabCount = (query) => {
  if (!query.success) return ''
  
  if (query.result?.rows) {
    const count = query.result.rows.length
    return count > 999 ? '999+' : count.toString()
  }
  
  if (query.result?.affectedRows !== undefined) {
    return `${query.result.affectedRows}`
  }
  
  return '✓'
}

const getTabTooltip = (query, index) => {
  const sql = query.query?.trim() || ''
  const preview = sql.length > 80 ? sql.substring(0, 80) + '...' : sql
  const status = query.success ? '✅ 执行成功' : '❌ 执行失败'
  const summary = getTabSummary(query)
  const time = query.result?.execution_time ? `${query.result.execution_time}ms` : ''
  
  return `查询 ${index + 1}\n${status} • ${summary} ${time ? '• ' + time : ''}\n\n${preview}`
}

const getTabSummary = (query) => {
  if (!query.success) return '执行失败'
  
  if (query.result?.rows) {
    const rowCount = query.result.rows.length
    if (rowCount === 0) return '无结果'
    return `${rowCount}行`
  }
  
  if (query.result?.affectedRows !== undefined) {
    return `影响${query.result.affectedRows}行`
  }
  
  return '成功'
}

// 滚动控制
const updateScrollButtons = () => {
  if (!headerContainer.value || !props.queries || !Array.isArray(props.queries)) return
  
  const container = headerContainer.value.querySelector('.tab-list-container')
  if (!container) return
  
  const totalWidth = props.queries.length * tabWidth
  const containerWidth = container.clientWidth - 60 // 留出滚动按钮空间
  
  showScrollButtons.value = totalWidth > containerWidth
  canScrollRight.value = Math.abs(scrollOffset.value) < (totalWidth - containerWidth)
}

const scrollTabs = (direction) => {
  const container = headerContainer.value?.querySelector('.tab-list-container')
  if (!container) return
  
  const containerWidth = container.clientWidth - 60
  const totalWidth = props.queries.length * tabWidth
  const maxScroll = totalWidth - containerWidth
  
  const scrollAmount = containerWidth * 0.5 // 滚动容器宽度的50%
  
  if (direction > 0) {
    // 向右滚动 (显示右侧Tab)
    scrollOffset.value = Math.max(-maxScroll, scrollOffset.value - scrollAmount)
  } else {
    // 向左滚动 (显示左侧Tab)
    scrollOffset.value = Math.min(0, scrollOffset.value + scrollAmount)
  }
  
  updateScrollButtons()
}

// 确保活跃Tab可见
const scrollToActiveTab = () => {
  if (!headerContainer.value) return
  
  const container = headerContainer.value.querySelector('.tab-list-container')
  if (!container) return
  
  const activeIndex = props.activeTab
  const containerWidth = container.clientWidth - 60
  const activeTabStart = activeIndex * tabWidth
  const activeTabEnd = activeTabStart + tabWidth
  
  const currentViewStart = -scrollOffset.value
  const currentViewEnd = currentViewStart + containerWidth
  
  if (activeTabStart < currentViewStart) {
    // 活跃Tab在视图左侧，向左滚动
    scrollOffset.value = -activeTabStart
  } else if (activeTabEnd > currentViewEnd) {
    // 活跃Tab在视图右侧，向右滚动
    scrollOffset.value = -(activeTabEnd - containerWidth)
  }
  
  updateScrollButtons()
}

// 生命周期
onMounted(() => {
  nextTick(() => {
    updateScrollButtons()
    scrollToActiveTab()
  })
  
  window.addEventListener('resize', updateScrollButtons)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScrollButtons)
})

// 监听activeTab变化
import { watch } from 'vue'
watch(() => props.activeTab, () => {
  nextTick(scrollToActiveTab)
})

watch(() => props.queries?.length || 0, () => {
  nextTick(updateScrollButtons)
})
</script>

<style scoped>
.query-tabs-compact {
  background: var(--bg-color, #ffffff);
  border-bottom: 1px solid var(--border-color);
}

.unified-header {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 8px;
  background: var(--gray-25, #fefefe);
}

/* 内联批量统计 */
.batch-stats-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 12px;
  padding-right: 12px;
  border-right: 1px solid var(--border-color);
  flex-shrink: 0;
}

.stat-compact {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 4px;
  border-radius: 3px;
}

.stat-compact.success {
  color: var(--success-color, #16a34a);
  background: rgba(22, 163, 74, 0.1);
}

.stat-compact.error {
  color: var(--error-color, #dc2626);
  background: rgba(220, 38, 38, 0.1);
}

.stat-compact.duration {
  color: var(--warning-color, #f59e0b);
  background: rgba(245, 158, 11, 0.1);
}

/* Tab列表容器 */
.tab-list-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-width: 0;
}

.tab-list-compact {
  display: flex;
  transition: transform 0.3s ease;
  height: 32px;
}

.tab-item-compact {
  flex: 0 0 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px;
  border-right: 1px solid var(--border-color);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  background: var(--gray-50, #f8f9fa);
  font-size: 10px;
  height: 30px;
}

.tab-item-compact:hover {
  background: var(--gray-100, #f1f3f4);
}

.tab-item-compact.active {
  background: white;
  border-bottom-color: var(--primary-color);
}

.tab-item-compact.success {
  border-left: 2px solid var(--success-color, #16a34a);
}

.tab-item-compact.error {
  border-left: 2px solid var(--error-color, #dc2626);
}

.tab-label {
  font-weight: 600;
  color: var(--text-color);
  font-size: 10px;
}

.tab-count {
  font-size: 9px;
  font-weight: 500;
  color: var(--gray-600);
  min-width: 12px;
  text-align: right;
}

.tab-item-compact.success .tab-count {
  color: var(--success-color, #16a34a);
}

.tab-item-compact.error .tab-count {
  color: var(--error-color, #dc2626);
}

/* 紧凑滚动按钮 */
.scroll-btn-compact {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  z-index: 10;
  transition: all 0.2s ease;
}

.scroll-btn-compact:hover:not(:disabled) {
  background: var(--gray-50);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.scroll-btn-compact:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.scroll-left {
  left: 4px;
}

.scroll-right {
  right: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .unified-header {
    padding: 0 4px;
  }
  
  .batch-stats-inline {
    gap: 4px;
    margin-right: 8px;
    padding-right: 8px;
  }
  
  .tab-item-compact {
    flex: 0 0 50px;
    padding: 0 4px;
  }
  
  .tab-label {
    font-size: 9px;
  }
  
  .stat-compact {
    font-size: 10px;
    padding: 1px 3px;
  }
}
</style>