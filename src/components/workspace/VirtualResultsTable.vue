<template>
  <div class="results-table-enhanced" ref="containerRef">
    <!-- 下拉刷新指示器 -->
    <div 
      v-if="pullRefreshEnabled && isPulling" 
      class="pull-refresh-indicator"
      :class="{ active: pullDistance > refreshThreshold }"
    >
      <div class="refresh-icon" :style="{ transform: `rotate(${Math.min(pullDistance / refreshThreshold * 180, 180)}deg)` }">
        {{ pullDistance > refreshThreshold ? '🔄' : '⬇️' }}
      </div>
      <span class="refresh-text">
        {{ pullDistance > refreshThreshold ? '释放刷新' : '下拉刷新' }}
      </span>
    </div>

    <!-- 虚拟滚动表格容器 -->
    <div 
      class="virtual-table-container"
      ref="scrollContainer"
      @scroll="handleScroll"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 表格头部 -->
      <div class="table-header" :style="{ transform: `translateX(${-scrollLeft}px)` }">
        <div class="header-row">
          <div 
            v-for="(column, index) in columns" 
            :key="index"
            class="header-cell"
            :style="getColumnStyle(index)"
          >
            {{ column }}
          </div>
        </div>
      </div>

      <!-- 虚拟滚动内容 -->
      <div class="virtual-content" :style="{ height: `${totalHeight}px` }">
        <!-- 可见行渲染 -->
        <div 
          class="visible-rows" 
          :style="{ 
            transform: `translateY(${startIndex * itemHeight}px) translateX(${-scrollLeft}px)`
          }"
        >
          <div
            v-for="(row, index) in visibleRows"
            :key="startIndex + index"
            class="table-row"
            :class="{ even: (startIndex + index) % 2 === 0 }"
          >
            <div 
              v-for="(cell, cellIndex) in row" 
              :key="cellIndex"
              class="table-cell"
              :style="getColumnStyle(cellIndex)"
              :title="formatCellTooltip(cell)"
            >
              {{ formatCellDisplay(cell) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多指示器 -->
      <div v-if="hasMore && !isLoading" class="load-more-indicator">
        <div class="load-more-text">滚动到底部加载更多</div>
      </div>

      <!-- 加载中指示器 -->
      <div v-if="isLoading" class="loading-indicator">
        <div class="loading-spinner">⏳</div>
        <span class="loading-text">加载中...</span>
      </div>
    </div>

    <!-- 滚动提示 -->
    <div v-if="showScrollHint" class="scroll-hint">
      ← 左右滑动查看更多列 →
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

const props = defineProps({
  columns: {
    type: Array,
    default: () => []
  },
  rows: {
    type: Array,
    default: () => []
  },
  itemHeight: {
    type: Number,
    default: 36
  },
  bufferSize: {
    type: Number,
    default: 5
  },
  hasMore: {
    type: Boolean,
    default: false
  },
  pullRefreshEnabled: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'refresh',
  'load-more',
  'scroll'
])

// 响应式数据
const containerRef = ref(null)
const scrollContainer = ref(null)
const scrollTop = ref(0)
const scrollLeft = ref(0)
const containerHeight = ref(0)
const showScrollHint = ref(false)
const isLoading = ref(false)
const columnWidths = ref([])

// 下拉刷新相关
const isPulling = ref(false)
const pullDistance = ref(0)
const refreshThreshold = ref(60)
const touchStartY = ref(0)

// 计算属性
const totalHeight = computed(() => props.rows.length * props.itemHeight)

const visibleCount = computed(() => {
  return Math.ceil(containerHeight.value / props.itemHeight) + props.bufferSize * 2
})

const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.itemHeight) - props.bufferSize
  return Math.max(0, index)
})

const endIndex = computed(() => {
  return Math.min(props.rows.length, startIndex.value + visibleCount.value)
})

const visibleRows = computed(() => {
  return props.rows.slice(startIndex.value, endIndex.value)
})

// 方法
const calculateColumnWidths = () => {
  if (!props.columns.length || !props.rows.length) {
    columnWidths.value = props.columns.map(() => 120)
    return
  }
  
  const widths = []
  const minWidth = 80
  const maxWidth = 300
  
  props.columns.forEach((column, index) => {
    // 计算表头宽度
    let headerWidth = column.length * 8 + 24 // 大概字符宽度 + padding
    
    // 计算前100行数据的最大宽度
    let maxDataWidth = 0
    const sampleRows = props.rows.slice(0, 100)
    
    sampleRows.forEach(row => {
      if (row[index] !== undefined && row[index] !== null) {
        const cellText = String(row[index])
        const cellWidth = Math.min(cellText.length * 7 + 24, 400) // 限制最大显示宽度
        maxDataWidth = Math.max(maxDataWidth, cellWidth)
      }
    })
    
    // 取表头和数据宽度的最大值，但限制在合理范围内
    const finalWidth = Math.max(minWidth, Math.min(maxWidth, Math.max(headerWidth, maxDataWidth)))
    widths.push(finalWidth)
  })
  
  columnWidths.value = widths
}

const getColumnStyle = (index) => {
  const width = columnWidths.value[index] || 120
  return {
    width: `${width}px`,
    minWidth: `${width}px`,
    maxWidth: `${width}px`,
    flexShrink: 0
  }
}

const formatCellDisplay = (cell) => {
  if (cell === null) return 'NULL'
  if (cell === undefined) return ''
  if (typeof cell === 'string' && cell.length > 50) {
    return cell.substring(0, 50) + '...'
  }
  return String(cell)
}

const formatCellTooltip = (cell) => {
  if (cell === null) return 'NULL'
  if (cell === undefined) return '空值'
  return String(cell)
}

const handleScroll = (event) => {
  const target = event.target
  scrollTop.value = target.scrollTop
  scrollLeft.value = target.scrollLeft
  
  // 检查是否需要加载更多
  if (props.hasMore && !isLoading.value) {
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight
    if (scrollBottom < 100) { // 距离底部100px时加载
      loadMore()
    }
  }
  
  // 隐藏滚动提示
  if (showScrollHint.value && target.scrollLeft > 50) {
    showScrollHint.value = false
  }
  
  emit('scroll', {
    scrollTop: scrollTop.value,
    scrollLeft: scrollLeft.value
  })
}

const loadMore = async () => {
  if (isLoading.value || !props.hasMore) return
  
  isLoading.value = true
  try {
    await emit('load-more')
  } finally {
    isLoading.value = false
  }
}

// 下拉刷新相关
const handleTouchStart = (event) => {
  if (!props.pullRefreshEnabled) return
  
  touchStartY.value = event.touches[0].clientY
  if (scrollTop.value === 0) {
    isPulling.value = true
  }
}

const handleTouchMove = (event) => {
  if (!isPulling.value) return
  
  const currentY = event.touches[0].clientY
  const distance = currentY - touchStartY.value
  
  if (distance > 0 && scrollTop.value === 0) {
    event.preventDefault()
    pullDistance.value = Math.min(distance * 0.5, refreshThreshold.value * 1.5)
  }
}

const handleTouchEnd = () => {
  if (!isPulling.value) return
  
  if (pullDistance.value > refreshThreshold.value) {
    // 触发刷新
    refresh()
  }
  
  isPulling.value = false
  pullDistance.value = 0
}

const refresh = async () => {
  if (isLoading.value) return
  
  isLoading.value = true
  try {
    await emit('refresh')
  } finally {
    isLoading.value = false
  }
}

const updateContainerHeight = () => {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    containerHeight.value = rect.height
  }
}

const checkTableOverflow = () => {
  nextTick(() => {
    if (!scrollContainer.value) return
    
    const container = scrollContainer.value
    const hasHorizontalOverflow = container.scrollWidth > container.clientWidth
    showScrollHint.value = hasHorizontalOverflow && container.scrollLeft < 50
    
    if (showScrollHint.value) {
      setTimeout(() => {
        showScrollHint.value = false
      }, 3000)
    }
  })
}

// 生命周期
onMounted(() => {
  updateContainerHeight()
  calculateColumnWidths()
  checkTableOverflow()
  window.addEventListener('resize', updateContainerHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})

// 监听数据变化
watch(() => props.rows, () => {
  calculateColumnWidths()
  checkTableOverflow()
}, { immediate: true })

watch(() => props.columns, () => {
  calculateColumnWidths()
  checkTableOverflow()
}, { immediate: true })
</script>

<style scoped>
.results-table-enhanced {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.pull-refresh-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: var(--gray-25, #fefefe);
  border-bottom: 1px solid var(--border-color);
  transition: all 0.2s ease;
  font-size: 12px;
  color: var(--gray-600);
}

.pull-refresh-indicator.active {
  background: var(--primary-color-light);
  color: var(--primary-color);
}

.refresh-icon {
  transition: transform 0.2s ease;
}

.virtual-table-container {
  flex: 1;
  overflow: auto;
  position: relative;
}

.table-header {
  position: sticky;
  top: 0;
  background: var(--gray-50, #f8f9fa);
  border-bottom: 2px solid var(--border-color);
  z-index: 10;
}

.header-row {
  display: flex;
  min-width: fit-content;
}

.header-cell {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-700);
  background: var(--gray-50, #f8f9fa);
  border-right: 1px solid var(--border-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.virtual-content {
  position: relative;
  width: 100%;
}

.visible-rows {
  position: absolute;
  top: 0;
  width: 100%;
}

.table-row {
  display: flex;
  min-width: fit-content;
  border-bottom: 1px solid var(--gray-200);
}

.table-row:hover {
  background: var(--gray-25, #fefefe);
}

.table-row.even {
  background: rgba(0, 0, 0, 0.01);
}

.table-row.even:hover {
  background: var(--gray-25, #fefefe);
}

.table-cell {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-color);
  border-right: 1px solid var(--gray-200);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.load-more-indicator {
  padding: 12px;
  text-align: center;
  color: var(--gray-500);
  font-size: 12px;
  background: var(--gray-25, #fefefe);
  border-top: 1px solid var(--border-color);
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: var(--gray-25, #fefefe);
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--gray-600);
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.scroll-hint {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  pointer-events: none;
  z-index: 20;
}

/* 自定义滚动条 */
.virtual-table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.virtual-table-container::-webkit-scrollbar-track {
  background: var(--gray-100);
  border-radius: 4px;
}

.virtual-table-container::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: 4px;
}

.virtual-table-container::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-cell,
  .table-cell {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .pull-refresh-indicator,
  .loading-indicator {
    padding: 8px;
    font-size: 11px;
  }
}
</style>