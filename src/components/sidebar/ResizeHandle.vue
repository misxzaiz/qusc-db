<template>
  <div 
    class="resize-handle" 
    :class="{ 'resize-handle--resizing': isResizing }"
    @mousedown="startResize"
    @dblclick="onDoubleClick"
    title="拖拽调节宽度，双击重置"
  >
    <div class="resize-handle__grip">
      <div class="grip-line"></div>
      <div class="grip-line"></div>
      <div class="grip-line"></div>
    </div>
    
    <!-- 宽度指示器 -->
    <div class="width-indicator" v-if="showIndicator">
      {{ currentWidth }}px
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAISidebarResize } from '@/composables/useAISidebarResize.js'

// Props
const props = defineProps({
  showIndicator: {
    type: Boolean,
    default: true
  }
})

// 使用侧边栏调节功能
const {
  aiSidebarWidth,
  isResizing,
  startResize: startResizeHandler,
  onDoubleClick: resetHandler
} = useAISidebarResize()

// 当前宽度（用于显示）
const currentWidth = computed(() => aiSidebarWidth.value)

// 开始调节大小
const startResize = (event) => {
  startResizeHandler(event)
}

// 双击重置
const onDoubleClick = () => {
  resetHandler()
}
</script>

<style scoped>
.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: all 0.2s ease;
}

.resize-handle:hover {
  background: rgba(99, 102, 241, 0.1);
}

.resize-handle--resizing {
  background: rgba(99, 102, 241, 0.2);
  width: 6px;
}

.resize-handle__grip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.resize-handle:hover .resize-handle__grip,
.resize-handle--resizing .resize-handle__grip {
  opacity: 1;
}

.grip-line {
  width: 2px;
  height: 12px;
  background: #6366f1;
  border-radius: 1px;
}

.resize-handle--resizing .grip-line {
  background: #4f46e5;
}

.width-indicator {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  background: rgba(99, 102, 241, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  pointer-events: none;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 1000;
}

.resize-handle--resizing .width-indicator {
  opacity: 1;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .resize-handle {
    width: 8px;
  }
  
  .resize-handle--resizing {
    width: 12px;
  }
  
  .resize-handle__grip {
    opacity: 1; /* 移动端始终显示 */
  }
  
  .grip-line {
    width: 3px;
    height: 16px;
  }
}

/* 为拖拽状态添加全局样式 */
.resize-handle--resizing {
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    cursor: col-resize;
    z-index: 9999;
  }
}
</style>