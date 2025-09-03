<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div 
        v-if="visible"
        class="dialog-overlay"
        :class="{ 
          'overlay-blur': blurBackground,
          'overlay-dark': darkBackground 
        }"
        @click="handleOverlayClick"
      >
        <div 
          class="dialog"
          :class="[
            `dialog-${size}`,
            { 
              'dialog-closable': closable,
              'dialog-draggable': draggable,
              'dialog-fullscreen': fullscreen
            }
          ]"
          :style="dialogStyle"
          @click.stop
          ref="dialogRef"
        >
          <!-- 对话框头部 -->
          <div 
            class="dialog-header" 
            :class="{ 'header-draggable': draggable }"
            @mousedown="handleDragStart"
          >
            <div class="header-content">
              <!-- 图标 -->
              <div v-if="icon" class="dialog-icon">{{ icon }}</div>
              
              <!-- 标题 -->
              <h3 class="dialog-title">
                <slot name="title">{{ title }}</slot>
              </h3>
            </div>
            
            <!-- 头部操作 -->
            <div class="header-actions">
              <slot name="header-actions" />
              
              <!-- 全屏切换 -->
              <button 
                v-if="resizable"
                class="header-btn"
                @click="toggleFullscreen"
                :title="fullscreen ? '退出全屏' : '全屏'"
              >
                {{ fullscreen ? '🗗' : '🗖' }}
              </button>
              
              <!-- 关闭按钮 -->
              <button 
                v-if="closable"
                class="header-btn close-btn"
                @click="handleClose"
                title="关闭"
              >
                ×
              </button>
            </div>
          </div>
          
          <!-- 对话框内容 -->
          <div 
            class="dialog-body"
            :class="{ 'body-scrollable': scrollable }"
          >
            <slot />
          </div>
          
          <!-- 对话框底部 -->
          <div 
            v-if="$slots.footer || showDefaultFooter"
            class="dialog-footer"
          >
            <slot name="footer">
              <div class="footer-actions" v-if="showDefaultFooter">
                <button 
                  v-if="showCancel"
                  class="btn btn-secondary"
                  @click="handleCancel"
                  :disabled="loading"
                >
                  {{ cancelText }}
                </button>
                <button 
                  v-if="showConfirm"
                  class="btn btn-primary"
                  @click="handleConfirm"
                  :disabled="loading || !confirmEnabled"
                  :class="{ loading: loading }"
                >
                  <span v-if="loading" class="loading-spinner">⏳</span>
                  {{ confirmText }}
                </button>
              </div>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

// Props
const props = defineProps({
  // 基础属性
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '对话框'
  },
  icon: {
    type: String,
    default: ''
  },
  
  // 尺寸和位置
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large', 'extra-large'].includes(value)
  },
  width: {
    type: [String, Number],
    default: null
  },
  height: {
    type: [String, Number],
    default: null
  },
  top: {
    type: [String, Number],
    default: '15vh'
  },
  
  // 功能开关
  closable: {
    type: Boolean,
    default: true
  },
  maskClosable: {
    type: Boolean,
    default: true
  },
  draggable: {
    type: Boolean,
    default: false
  },
  resizable: {
    type: Boolean,
    default: false
  },
  scrollable: {
    type: Boolean,
    default: true
  },
  
  // 外观
  blurBackground: {
    type: Boolean,
    default: false
  },
  darkBackground: {
    type: Boolean,
    default: false
  },
  
  // 按钮配置
  showDefaultFooter: {
    type: Boolean,
    default: false
  },
  showCancel: {
    type: Boolean,
    default: true
  },
  showConfirm: {
    type: Boolean,
    default: true
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  confirmEnabled: {
    type: Boolean,
    default: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible', 'close', 'confirm', 'cancel', 'opened', 'closed'])

// 响应式数据
const dialogRef = ref(null)
const fullscreen = ref(false)
const dragState = ref({
  isDragging: false,
  startX: 0,
  startY: 0,
  startLeft: 0,
  startTop: 0
})

// 计算属性
const dialogStyle = computed(() => {
  const style = {}
  
  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  
  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }
  
  // 移除top样式，使用CSS的align-items: center来居中
  // 这样可以避免定位计算错误导致的遮挡问题
  
  return style
})

// 方法
const handleOverlayClick = () => {
  if (props.maskClosable) {
    handleClose()
  }
}

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  if (props.closable) {
    handleClose()
  }
}

const toggleFullscreen = () => {
  fullscreen.value = !fullscreen.value
}

// 拖拽功能
const handleDragStart = (e) => {
  if (!props.draggable || fullscreen.value) return
  
  dragState.value = {
    isDragging: true,
    startX: e.clientX,
    startY: e.clientY,
    startLeft: dialogRef.value.offsetLeft,
    startTop: dialogRef.value.offsetTop
  }
  
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
  e.preventDefault()
}

const handleDragMove = (e) => {
  if (!dragState.value.isDragging) return
  
  const deltaX = e.clientX - dragState.value.startX
  const deltaY = e.clientY - dragState.value.startY
  
  const newLeft = dragState.value.startLeft + deltaX
  const newTop = dragState.value.startTop + deltaY
  
  dialogRef.value.style.left = `${newLeft}px`
  dialogRef.value.style.top = `${newTop}px`
  dialogRef.value.style.transform = 'none'
}

const handleDragEnd = () => {
  dragState.value.isDragging = false
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
}

// ESC键关闭
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.closable) {
    handleClose()
  }
}

// 生命周期
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await nextTick()
    emit('opened')
    document.addEventListener('keydown', handleKeydown)
  } else {
    emit('closed')
    document.removeEventListener('keydown', handleKeydown)
    // 重置状态
    fullscreen.value = false
    if (dialogRef.value) {
      dialogRef.value.style.left = ''
      dialogRef.value.style.top = ''
      dialogRef.value.style.transform = ''
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  box-sizing: border-box;
}

.dialog-overlay.overlay-blur {
  backdrop-filter: blur(4px);
}

.dialog-overlay.overlay-dark {
  background: rgba(0, 0, 0, 0.7);
}

.dialog {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-width: 90vw;
  max-height: 85vh;
  width: auto;
  position: relative;
  margin: 0;
  box-sizing: border-box;
}

.dialog-small {
  width: 400px;
}

.dialog-medium {
  width: 600px;
}

.dialog-large {
  width: 800px;
}

.dialog-extra-large {
  width: 1000px;
}

.dialog-fullscreen {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  border-radius: 0;
  top: 0 !important;
  left: 0 !important;
  transform: none !important;
}

.dialog-draggable {
  position: absolute;
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--gray-50);
  border-radius: var(--border-radius) var(--border-radius) 0 0;
}

.header-draggable {
  cursor: move;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.dialog-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-800);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--gray-600);
  transition: all 0.2s ease;
}

.header-btn:hover {
  background: var(--gray-200);
  color: var(--gray-800);
}

.close-btn {
  font-size: 18px;
  font-weight: bold;
}

.close-btn:hover {
  background: var(--error-color);
  color: white;
}

.dialog-body {
  flex: 1;
  padding: 20px;
  overflow: hidden;
  min-height: 0; /* 确保flex子元素能够正确收缩 */
}

.body-scrollable {
  overflow-y: auto;
  /* 确保滚动条不会被遮挡 */
  scrollbar-width: thin;
  scrollbar-color: var(--gray-400) transparent;
}

.body-scrollable::-webkit-scrollbar {
  width: 8px;
}

.body-scrollable::-webkit-scrollbar-track {
  background: transparent;
}

.body-scrollable::-webkit-scrollbar-thumb {
  background: var(--gray-400);
  border-radius: 4px;
}

.body-scrollable::-webkit-scrollbar-thumb:hover {
  background: var(--gray-500);
}

.dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--gray-50);
  border-radius: 0 0 var(--border-radius) var(--border-radius);
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: var(--border-radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-primary:disabled {
  background: var(--gray-400);
  border-color: var(--gray-400);
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: var(--gray-700);
  border-color: var(--border-color);
}

.btn-secondary:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 对话框动画 */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-enter-active .dialog,
.dialog-leave-active .dialog {
  transition: transform 0.3s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog {
  transform: scale(0.9) translateY(-20px);
}

.dialog-leave-to .dialog {
  transform: scale(0.9) translateY(-20px);
}

/* Tauri桌面应用优化 */
@media screen {
  .dialog-overlay {
    /* 确保在桌面环境下对话框不会被系统UI遮挡 */
    padding: 40px 20px;
  }
  
  .dialog {
    /* 为桌面应用提供更合适的最大高度 */
    max-height: 80vh;
  }
  
  /* 确保对话框在窗口调整大小时保持居中 */
  .dialog-fullscreen {
    width: 95vw !important;
    height: 95vh !important;
    max-width: 95vw !important;
    max-height: 95vh !important;
    margin: 2.5vh 2.5vw;
  }
}

/* 响应式设计 */
@media (max-width: 1024px) and (max-height: 800px) {
  .dialog {
    max-height: 90vh;
  }
  
  .dialog-body {
    max-height: calc(90vh - 140px); /* 减去头部和底部高度 */
  }
}

@media (max-width: 768px) {
  .dialog {
    width: 100% !important;
    max-width: 100vw;
    margin: 0;
    border-radius: 0;
    height: 100vh;
    max-height: 100vh;
  }
  
  .dialog-header {
    border-radius: 0;
  }
  
  .dialog-footer {
    border-radius: 0;
  }
}
</style>