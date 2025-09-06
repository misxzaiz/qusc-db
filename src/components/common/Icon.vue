<template>
  <span 
    v-if="iconMap[name]" 
    :style="iconStyle"
    class="emoji-icon"
  >{{ iconContent }}</span>
  <i v-else :class="iconClass" :style="iconStyle"></i>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: '1em'
  },
  color: {
    type: String,
    default: 'currentColor'
  }
})

// 简单的图标映射，使用字符或CSS类
const iconMap = {
  // 数据库相关
  'database': '🗄️',
  'table': '📊',
  'key': '🔑',
  'server': '🖥️',
  'layers': '📚',
  
  // UI操作
  'chevron-right': '▶️',
  'chevron-down': '🔽',
  'x': '✖️',
  'close': '✖️',
  'search': '🔍',
  'edit': '✏️',
  'eye': '👁️',
  'trash': '🗑️',
  'download': '⬇️',
  'upload': '⬆️',
  'save': '💾',
  'refresh': '🔄',
  'refresh-cw': '🔄',
  'plus': '➕',
  'minus': '➖',
  'check': '✅',
  'check-square': '☑️',
  'square': '⬜',
  'settings': '⚙️',
  'help-circle': '❓',
  'info': 'ℹ️',
  'alert-circle': '⚠️',
  'loading': '⌛',
  'activity': '📈',
  'monitor': '📺',
  'stop': '⏹️',
  'play': '▶️',
  'pause': '⏸️',
  
  // 主题和样式
  'palette': '🎨',
  'sun': '☀️',
  'moon': '🌙',
  'lightbulb': '💡',
  'code': '💻',
  'zap': '⚡',
  'git-branch': '🌲',
  
  // 文件和文档
  'file-text': '📄',
  'folder': '📁',
  'document': '📃',
  'history': '📜',
  
  // 数据类型
  'text': '📝',
  'hash': '#️⃣',
  'list': '📋',
  'set': '🔢',
  'zset': '🔢',
  'stream': '🌊',
  'hyperloglog': '📊',
  'bitmap': '🖼️',
  
  // 通用
  'grid': '⚏',
  'columns': '📊',
  'function': '🔧',
  'terminal': '💻',
  'clock': '🕐',
  'memory': '🧠',
  'share-2': '🔗',
  'trending-up': '📈',
  'index': '📇'
}

const iconClass = computed(() => {
  // 如果是已知的emoji图标，返回空class
  if (iconMap[props.name]) {
    return ''
  }
  
  // 否则尝试使用CSS图标类（比如Font Awesome、Material Icons等）
  return `icon-${props.name}`
})

const iconStyle = computed(() => ({
  fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size,
  color: props.color,
  display: 'inline-block',
  lineHeight: '1',
  verticalAlign: 'middle'
}))

const iconContent = computed(() => {
  return iconMap[props.name] || props.name
})
</script>

<style scoped>
.emoji-icon {
  user-select: none;
}
</style>