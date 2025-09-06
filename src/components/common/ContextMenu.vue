<template>
  <teleport to="body">
    <div 
      v-if="visible"
      class="context-menu-overlay"
      @click="handleOverlayClick"
      @contextmenu.prevent
    >
      <div 
        class="context-menu"
        :style="menuStyle"
        @click.stop
      >
        <!-- 如果有items属性，渲染菜单项 -->
        <template v-if="items && items.length > 0">
          <template v-for="(item, index) in items" :key="item.id">
            <!-- 分隔符 -->
            <div v-if="item.separator" class="menu-separator"></div>
            
            <!-- 普通菜单项 -->
            <div 
              v-else
              class="menu-item"
              :class="{
                'menu-item-danger': item.danger,
                'menu-item-disabled': item.disabled
              }"
              @click="handleItemClick(item)"
              @mouseenter="handleItemHover(item)"
            >
              <!-- 图标 -->
              <i v-if="item.icon" :class="item.icon" class="menu-icon"></i>
              <div v-else class="menu-icon-placeholder"></div>
              
              <!-- 标签 -->
              <span class="menu-label">{{ item.label }}</span>
              
              <!-- 快捷键 -->
              <span v-if="item.shortcut" class="menu-shortcut">{{ item.shortcut }}</span>
              
              <!-- 子菜单箭头 -->
              <i v-if="item.children" class="fas fa-chevron-right menu-arrow"></i>
            </div>
          </template>
        </template>
        
        <!-- 否则使用slot -->
        <slot v-else />
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  x: {
    type: Number,
    default: 0
  },
  y: {
    type: Number,
    default: 0
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  items: {
    type: Array,
    default: () => []
  },
  context: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'item-click'])

const menuStyle = computed(() => {
  if (!props.visible) {
    return { display: 'none' }
  }
  
  // 优先使用position对象，否则使用x,y属性
  const x = props.position?.x ?? props.x
  const y = props.position?.y ?? props.y
  
  // 计算菜单位置，避免超出屏幕
  const maxWidth = window.innerWidth
  const maxHeight = window.innerHeight
  const menuWidth = 200 // 预估菜单宽度
  const menuHeight = (props.items?.length || 5) * 32 + 8 // 预估菜单高度
  
  let left = x
  let top = y
  
  // 防止右边超出
  if (left + menuWidth > maxWidth) {
    left = maxWidth - menuWidth - 10
  }
  
  // 防止底部超出
  if (top + menuHeight > maxHeight) {
    top = maxHeight - menuHeight - 10
  }
  
  // 防止左边和顶部超出
  left = Math.max(5, left)
  top = Math.max(5, top)
  
  return {
    left: `${left}px`,
    top: `${top}px`,
    display: 'block'
  }
})

function handleOverlayClick() {
  emit('close')
}

function handleClose() {
  emit('close')
}

function handleItemClick(item) {
  if (item.disabled || item.separator) {
    return
  }
  
  emit('item-click', item)
  emit('close')
}

function handleItemHover(item) {
  // 预留子菜单功能
  console.log('Hover item:', item.label)
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: transparent;
}

.context-menu {
  position: fixed;
  background: var(--bg-primary, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 180px;
  max-width: 250px;
  font-size: 12px;
  z-index: 1001;
  animation: menuFadeIn 0.15s ease-out;
  user-select: none;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  user-select: none;
}

.menu-item:hover {
  background: var(--gray-50, #f8fafc);
}

.menu-item-danger {
  color: var(--error-color, #ef4444);
}

.menu-item-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.menu-item-disabled {
  color: var(--text-tertiary, #94a3b8);
  cursor: not-allowed;
}

.menu-item-disabled:hover {
  background: transparent;
}

.menu-icon {
  width: 16px;
  text-align: center;
  margin-right: 8px;
  font-size: 11px;
  flex-shrink: 0;
}

.menu-icon-placeholder {
  width: 16px;
  margin-right: 8px;
  flex-shrink: 0;
}

.menu-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-shortcut {
  color: var(--text-tertiary, #94a3b8);
  font-size: 10px;
  margin-left: 12px;
  flex-shrink: 0;
}

.menu-arrow {
  margin-left: 8px;
  font-size: 10px;
  color: var(--text-tertiary, #94a3b8);
  flex-shrink: 0;
}

.menu-separator {
  height: 1px;
  background: var(--border-color, #e2e8f0);
  margin: 4px 8px;
}

/* 深色主题适配 */
[data-theme="dark"] .context-menu {
  background: var(--bg-primary, #1e293b);
  border-color: var(--border-color, #475569);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .menu-item:hover {
  background: var(--gray-700, #334155);
}

[data-theme="dark"] .menu-item-danger:hover {
  background: rgba(239, 68, 68, 0.2);
}

[data-theme="dark"] .menu-separator {
  background: var(--border-color, #475569);
}
</style>