<template>
  <FormDialog
    :visible="visible"
    title="应用设置"
    icon="⚙️"
    size="large"
    :show-cancel="false"
    :show-submit="false"
    :closable="true"
    :mask-closable="false"
    :resizable="true"
    help-text="个性化你的QuSC-DB体验设置"
    @update:visible="$emit('update:visible', $event)"
    @close="$emit('close')"
  >
    <template #default>
      <div class="settings-container">
        <!-- 设置导航 -->
        <div class="settings-sidebar">
          <div class="settings-nav">
            <button
              v-for="category in categories"
              :key="category.key"
              class="nav-item"
              :class="{ active: activeCategory === category.key }"
              @click="activeCategory = category.key"
            >
              <span class="nav-icon">{{ category.icon }}</span>
              <span class="nav-label">{{ category.name }}</span>
            </button>
          </div>
        </div>
        
        <!-- 设置内容 -->
        <div class="settings-content">
          <div class="settings-header">
            <h2 class="category-title">
              {{ currentCategory?.name }}
            </h2>
            <p class="category-description">
              {{ currentCategory?.description }}
            </p>
          </div>
          
          <div class="settings-body">
            <!-- AI助手设置 -->
            <div v-if="activeCategory === 'ai'" class="settings-section">
              <AISettings
                  :preferences="preferences"
                  @setting-change="handleSettingChange"
              />
            </div>
          </div>
          
          <!-- 设置操作 -->
          <div class="settings-actions">
            <button type="button" class="btn btn-secondary" @click="handleReset">
              重置当前分类
            </button>
            <button type="button" class="btn btn-primary" @click="handleSave">
              保存设置
            </button>
          </div>
        </div>
      </div>
    </template>
  </FormDialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import FormDialog from '../dialog/FormDialog.vue'
import AISettings from './AISettings.vue'
import { useUserPreferences } from '@/composables/usePersistence.js'
import { useTheme } from '@/composables/useTheme.js'
import { useNotificationStore } from '@/stores/notification.js'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible', 'close'])

// 状态管理
const preferences = useUserPreferences()
const { setTheme, currentTheme } = useTheme()
const notificationStore = useNotificationStore()

// 响应式数据
const activeCategory = ref('ai')

// 设置分类
const categories = [
  {
    key: 'ai',
    name: 'AI助手',
    icon: ' ',
    description: 'AI服务配置和智能功能设置'
  }
]

// 计算属性
const currentCategory = computed(() => {
  return categories.find(cat => cat.key === activeCategory.value)
})

// 方法
const handleSettingChange = (key, value) => {
  // 使用点号路径设置嵌套属性
  const keys = key.split('.')
  let target = preferences.state
  
  for (let i = 0; i < keys.length - 1; i++) {
    target = target[keys[i]]
  }
  
  target[keys[keys.length - 1]] = value
}

const handleSave = () => {
  preferences.save()
  notificationStore.success('设置已保存')
}

const handleReset = () => {
  // 重置当前分类的设置
  notificationStore.confirm('确定要重置当前分类的所有设置吗？', () => {
    // 这里可以实现分类级别的重置逻辑
    notificationStore.success('设置已重置')
  })
}

const handleResetSettings = () => {
  notificationStore.confirm('确定要重置所有设置到默认值吗？此操作不可撤销。', () => {
    preferences.reset()
    notificationStore.success('所有设置已重置')
  })
}

// 监听设置变化
watch(() => preferences.state.theme, (newTheme) => {
  if (newTheme !== currentTheme.value) {
    setTheme(newTheme)
  }
})
</script>

<style scoped>
.settings-container {
  display: flex;
  height: 500px;
  min-height: 500px;
}

.settings-sidebar {
  width: 200px;
  border-right: 1px solid var(--border-color);
  background: var(--gray-50);
}

.settings-nav {
  padding: 8px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 13px;
  color: var(--gray-700);
  text-align: left;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.nav-item:hover {
  background: var(--gray-100);
  color: var(--gray-800);
}

.nav-item.active {
  background: var(--primary-color);
  color: white;
}

.nav-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.nav-label {
  font-weight: 500;
}

.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-color);
}

.category-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--gray-800);
  margin: 0 0 4px;
}

.category-description {
  font-size: 13px;
  color: var(--gray-600);
  margin: 0;
}

.settings-body {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

.settings-section {
  max-width: 600px;
}

.settings-actions {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--gray-50);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-container {
    flex-direction: column;
    height: auto;
  }
  
  .settings-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  
  .settings-nav {
    display: flex;
    overflow-x: auto;
    padding: 8px;
  }
  
  .nav-item {
    white-space: nowrap;
    min-width: auto;
    margin-right: 4px;
    margin-bottom: 0;
  }
}
</style>