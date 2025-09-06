<template>
  <teleport to="body">
    <div 
      v-if="visible"
      class="context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @contextmenu.prevent
      @click.stop
    >
      <slot />
    </div>
  </teleport>
  
  <!-- 背景遮罩，用于点击外部关闭菜单 -->
  <teleport to="body">
    <div 
      v-if="visible"
      class="context-menu-backdrop"
      @click="handleClose"
      @contextmenu.prevent="handleClose"
    />
  </teleport>
</template>

<script setup>
import { watch, nextTick } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['close'])

function handleClose() {
  emit('close')
}

// 调整菜单位置，防止超出屏幕
watch(() => props.visible, async (visible) => {
  if (visible) {
    await nextTick()
    const menu = document.querySelector('.context-menu')
    if (menu) {
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      // 如果菜单超出右边界，向左调整
      if (rect.right > viewportWidth) {
        menu.style.left = (viewportWidth - rect.width - 10) + 'px'
      }
      
      // 如果菜单超出下边界，向上调整
      if (rect.bottom > viewportHeight) {
        menu.style.top = (viewportHeight - rect.height - 10) + 'px'
      }
    }
  }
})
</script>

<style scoped>
.context-menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: transparent;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 4px 0;
  min-width: 140px;
  user-select: none;
}
</style>