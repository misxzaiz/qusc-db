<template>
  <div class="smart-chat-interface">
    <!-- 紧凑头部信息栏 -->
    <div class="compact-chat-header">
      <div class="header-info">
        <span v-if="currentConnection" class="connection-badge">
          📊 {{ currentConnection.config?.name || '数据库' }} ({{ totalTables }}张表)
        </span>
      </div>
      
      <div class="header-actions">
        <button 
          class="btn-compact" 
          @click="showRoleGenerator = !showRoleGenerator"
          :class="{ active: showRoleGenerator }"
          title="生成角色"
        >🎭</button>
        <button 
          class="btn-compact clear" 
          @click="clearChat"
          :disabled="chatMessages.length === 0"
          title="清空对话"
        >🗑️</button>
      </div>
    </div>

    <!-- 角色生成器 -->
    <div class="role-generator-panel" v-show="showRoleGenerator">
      <!-- 紧凑角色选择器 -->
      <div class="compact-role-selector">
        <select
            v-model="currentRole"
            class="role-dropdown"
            @change="selectRole(currentRole)"
        >
          <option
              v-for="role in aiRoles"
              :key="role.id"
              :value="role.id"
          >
            {{ role.icon }} {{ role.name }}
          </option>
        </select>

        <!-- 推荐角色快速切换按钮 -->
        <button
            v-if="suggestedRole && suggestedRole.role !== currentRole"
            class="quick-adopt-btn"
            @click="adoptRecommendedRole"
            :title="`快速切换到推荐角色: ${suggestedRole.name}`"
        >
          {{ suggestedRole.icon }}
        </button>
      </div>

      <div class="generator-header">
        <span class="icon">🎭</span>
        <span class="title">AI角色生成器</span>
      </div>
      <div class="generator-input">
        <input 
          v-model="roleKeywords" 
          placeholder="输入关键词生成专业角色，如：电商分析、金融风控、数据挖掘..."
          class="keywords-input"
          @keydown.enter="generateRole"
        />
        <button 
          class="generate-btn"
          @click="generateRole"
          :disabled="!roleKeywords.trim() || isGeneratingRole"
        >
          {{ isGeneratingRole ? '⏳' : '生成' }}
        </button>
      </div>
      <div v-if="generatedRole" class="generated-role">
        <div class="role-preview">
          <span class="role-icon">{{ generatedRole.icon }}</span>
          <div class="role-details">
            <div class="role-name">{{ generatedRole.name }}</div>
            <div class="role-desc">{{ generatedRole.prompt.substring(0, 100) }}...</div>
          </div>
          <button 
            class="adopt-role-btn"
            @click="adoptGeneratedRole"
          >
            采用
          </button>
        </div>
      </div>

      <!-- 智能功能区域 - 紧凑模式 -->
      <div class="compact-features">
        <!-- 推荐角色 - 紧凑显示 -->
        <div class="role-recommendation-compact" v-if="suggestedRole">
          <span class="recommend-label">推荐:</span>
          <button
              class="role-chip recommended"
              @click="adoptRecommendedRole"
              :class="{ active: currentRole === suggestedRole.role }"
          >
            {{ suggestedRole.icon }} {{ suggestedRole.name }}
          </button>
        </div>

        <!-- 智能建议 - 横向显示 -->
        <div class="suggestions-horizontal" v-if="contextualSuggestions.length > 0">
          <span class="suggestions-label">💡</span>
          <div class="suggestions-chips">
            <button
                v-for="(suggestion, index) in contextualSuggestions.slice(0, 3)"
                :key="index"
                class="suggestion-chip"
                @click="applySuggestion(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>
      </div>
    </div>





    <!-- 聊天消息区域 -->
    <div class="chat-messages" ref="chatContainer">
      <div v-if="chatMessages.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <div class="empty-text">
          {{ selectedTables.length > 0 ? '开始分析你选择的数据表吧！' : '连接数据库后选择表进行智能分析' }}
        </div>
        <div class="empty-hint" v-if="selectedTables.length > 0">
          试试问："{{ getRandomSuggestion() }}"
        </div>
      </div>
      
      <div 
        v-for="(message, index) in chatMessages" 
        :key="index"
        class="message-item"
        :class="message.role"
      >
        <div class="message-avatar">
          <span v-if="message.role === 'user'">👤</span>
          <span v-else-if="message.role === 'assistant'">{{ getCurrentRoleIcon() }}</span>
          <span v-else>ℹ️</span>
        </div>
        <div class="message-content">
          <!-- 常规消息渲染 -->
          <MarkdownRenderer 
            v-if="message.role === 'assistant'"
            :content="message.content"
            :is-compact="false"
            @copy-code="handleCodeCopy"
            class="ai-message-renderer"
          />
          <div v-else class="message-text" v-html="formatMessage(message.content)"></div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input-area">
      <div class="input-wrapper">
        <textarea
          v-model="chatInput"
          class="chat-input enhanced"
          placeholder="输入@表名来引用数据表，然后用自然语言描述你的查询需求..."
          @keydown="handleKeyDown"
          @input="$event => chatInput = $event.target.value"
          rows="2"
        ></textarea>
        
        <!-- @表名自动补全建议 -->
        <div class="table-suggestions-dropdown" v-if="showSuggestions && tableSuggestions.length > 0">
          <div
            v-for="(suggestion, index) in tableSuggestions.slice(0, 5)"
            :key="suggestion.name"
            class="suggestion-item"
            :class="{ selected: index === selectedIndex }"
            @click="handleTableSuggestionClick(suggestion)"
          >
            <div class="suggestion-name">{{ suggestion.displayName }}</div>
            <div class="suggestion-info">
              {{ suggestion.columns }}字段 • {{ suggestion.recordCount }}条记录
            </div>
          </div>
        </div>
        <button 
          class="send-button enhanced"
          :disabled="!chatInput.trim() || isGenerating"
          @click="sendMessage"
        >
          <span v-if="isGenerating">⏳</span>
          <span v-else>🚀</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useAIStore } from '@/stores/ai.js'
import { useConnectionStore } from '@/stores/connection.js'
import { useNotificationStore } from '@/stores/notification.js'
import { useTableReference } from '@/composables/useTableReference.js'
import MarkdownRenderer from './MarkdownRenderer.vue'
import * as marked from 'marked'

// Stores
const aiStore = useAIStore()
const connectionStore = useConnectionStore()
const notificationStore = useNotificationStore()

// 表引用功能
const { 
  currentTableReferences,
  tableSuggestions,
  showSuggestions,
  selectedIndex,
  handleInputChange,
  selectTableSuggestion,
  validateTableReferences,
  navigateUp,
  navigateDown,
  selectCurrentSuggestion
} = useTableReference()

// 响应式数据
const chatInput = ref('')
const chatMessages = ref([])
const currentRole = ref('analyst')
const chatContainer = ref(null)

// 界面控制
const showRoleGenerator = ref(false)

// 角色生成
const roleKeywords = ref('')
const generatedRole = ref(null)
const isGeneratingRole = ref(false)

// 表选择
const internalSelectedTables = ref([])


// 双向同步表选择
watch(internalSelectedTables, (newTables) => {
  aiStore.updateSelectedTables(newTables)
}, { deep: true })

// 反向同步：当AI Store的选中表变化时，更新内部状态
watch(() => aiStore.selectedTables, (newTables) => {
  if (JSON.stringify(newTables) !== JSON.stringify(internalSelectedTables.value)) {
    internalSelectedTables.value = [...newTables]
  }
}, { deep: true, immediate: true })

// 计算属性
const currentConnection = computed(() => connectionStore.currentConnection)
const selectedTables = computed(() => aiStore.selectedTables)
const suggestedRole = computed(() => aiStore.suggestedRole)
const isGenerating = computed(() => aiStore.isGenerating)
const totalTables = computed(() => {
  const schema = connectionStore.getCurrentSchema()
  return schema.length
})

const contextualSuggestions = computed(() => {
  if (selectedTables.value.length > 0) {
    const schema = connectionStore.getCurrentSchema()
    const context = aiStore.buildEnhancedContextWithSchema(schema)
    return context.suggestions || []
  }
  return []
})

const showSmartFeatures = computed(() => {
  return selectedTables.value.length > 0 || suggestedRole.value || contextualSuggestions.value.length > 0
})

const businessScenarioText = computed(() => {
  if (selectedTables.value.length > 0) {
    const schema = connectionStore.getCurrentSchema()
    const context = aiStore.buildEnhancedContextWithSchema(schema)
    const scenarios = {
      permission_system: '权限管理系统',
      testing: '测试数据分析',
      ecommerce: '电商业务',
      hr: '人力资源',
      finance: '金融系统',
      cms: '内容管理',
      general: '通用分析'
    }
    return scenarios[context.businessContext] || '数据分析'
  }
  return '数据分析'
})

// AI角色定义 - 改为响应式
const aiRoles = ref([
  { id: 'analyst', name: '数据分析师', icon: '📊' },
  { id: 'dba', name: 'DBA专家', icon: '🔧' },
  { id: 'teacher', name: 'SQL导师', icon: '🎓' },
  { id: 'consultant', name: '业务顾问', icon: '💼' }
])

// 方法
const selectRole = (roleId) => {
  currentRole.value = roleId
  
  // 保存角色选择到localStorage
  try {
    localStorage.setItem('qusc-db-last-selected-role', roleId)
  } catch (error) {
    console.error('保存角色选择失败:', error)
  }
  
  if (chatMessages.value.length > 0) {
    const roleName = aiRoles.value.find(r => r.id === roleId)?.name || '助手'
    chatMessages.value.push({
      role: 'system',
      content: `*切换到${roleName}角色*`
    })
    scrollToBottom()
  }
}

const adoptRecommendedRole = () => {
  if (suggestedRole.value) {
    currentRole.value = suggestedRole.value.role
    
    // 保存角色选择到localStorage
    try {
      localStorage.setItem('qusc-db-last-selected-role', suggestedRole.value.role)
    } catch (error) {
      console.error('保存角色选择失败:', error)
    }
    
    chatMessages.value.push({
      role: 'system',
      content: `*已切换到${suggestedRole.value.name}*`
    })
    scrollToBottom()
  }
}

const applySuggestion = (suggestion) => {
  chatInput.value = suggestion
}

const getCurrentRoleIcon = () => {
  if (currentRole.value === suggestedRole.value?.role) {
    return suggestedRole.value.icon
  }
  return aiRoles.value.find(r => r.id === currentRole.value)?.icon || ' '
}

const getRandomSuggestion = () => {
  if (contextualSuggestions.value.length > 0) {
    return contextualSuggestions.value[0]
  }
  return selectedTables.value.length > 0 
    ? `分析 ${selectedTables.value[0]} 表的数据分布`
    : '帮我分析数据库结构'
}

const sendMessage = async () => {
  if (!chatInput.value.trim() || isGenerating.value) return
  
  const userMessage = chatInput.value.trim()
  
  // 立即清空输入框，避免用户继续输入时内容被清空
  chatInput.value = ''
  
  // 直接使用传统AI对话模式处理所有消息
  await handleTraditionalChat(userMessage)
}



// 传统AI对话处理
const handleTraditionalChat = async (userMessage) => {
  // 添加用户消息（如果还没有添加）
  if (!chatMessages.value.some(msg => msg.content === userMessage && msg.role === 'user')) {
    chatMessages.value.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    })
  }
  
  scrollToBottom()
  
  try {
    // 只有当用户@引用了表时，才构建数据库上下文
    const referencedTables = currentTableReferences.value
    let context = null
    
    if (referencedTables.length > 0) {
      // 用户使用了@表名引用，构建相关上下文
      const schema = connectionStore.getCurrentSchema()
      if (schema.length > 0) {
        context = aiStore.buildEnhancedContextWithSchema(schema)
        context.focusedTables = referencedTables.map(tableName => ({ name: tableName }))
      }
    }
    // 如果没有@引用，context保持为null，不传递任何表信息
    
    // 构建聊天历史
    const chatHistory = chatMessages.value
      .filter(msg => msg.role !== 'system')
      .slice(-10) // 最近10条消息
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    
    // 获取当前角色的提示词
    const rolePrompt = getCurrentRolePrompt()
    
    // 添加AI正在思考的消息
    const thinkingMessage = {
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date()
    }
    chatMessages.value.push(thinkingMessage)
    scrollToBottom()
    
    // 调用AI API (流式响应)
    const result = await aiStore.callAI(
      userMessage,
      rolePrompt,
      context,
      chatHistory,
      (chunk, accumulated) => {
        // 找到当前的流式消息并更新
        const streamingMessageIndex = chatMessages.value.findIndex(msg => msg.isStreaming)
        if (streamingMessageIndex !== -1) {
          // 创建新的消息对象以确保响应式更新
          const updatedMessage = {
            ...chatMessages.value[streamingMessageIndex],
            content: accumulated
          }
          // 使用Vue.set或直接替换数组项来触发响应式更新
          chatMessages.value.splice(streamingMessageIndex, 1, updatedMessage)
        }
        // 使用nextTick确保DOM更新后再滚动
        nextTick(() => {
          scrollToBottom()
        })
      }
    )
    
    // 确保最终内容是完整的并设置流式状态为false
    const finalMessageIndex = chatMessages.value.findIndex(msg => msg.isStreaming)
    if (finalMessageIndex !== -1) {
      chatMessages.value[finalMessageIndex] = {
        ...chatMessages.value[finalMessageIndex],
        content: result || chatMessages.value[finalMessageIndex].content,
        isStreaming: false
      }
    }
    
  } catch (error) {
    console.error('AI对话失败:', error)
    
    // 移除思考中的消息
    const thinkingIndex = chatMessages.value.findIndex(msg => msg.isStreaming)
    if (thinkingIndex !== -1) {
      chatMessages.value.splice(thinkingIndex, 1)
    }
    
    // 添加错误消息
    chatMessages.value.push({
      role: 'assistant',
      content: `抱歉，处理您的请求时出现了错误：${error.message}`,
      error: true,
      timestamp: new Date()
    })
    
    notificationStore?.error('AI对话失败', { description: error.message })
  }
  
  scrollToBottom()
}


// 监听输入变化以支持@表名解析
watch(chatInput, (newValue) => {
  handleInputChange(newValue)
})

// 处理表名建议点击
const handleTableSuggestionClick = (suggestion) => {
  const newValue = selectTableSuggestion(suggestion)
  chatInput.value = newValue
  
  // 重新解析引用以更新状态
  handleInputChange(newValue)
  
  // 焦点回到输入框
  nextTick(() => {
    const inputElement = document.querySelector('.chat-input')
    if (inputElement) {
      inputElement.focus()
    }
  })
}

// 添加@表名自动补全的键盘处理
const handleKeyDown = (event) => {
  if (showSuggestions.value && tableSuggestions.value.length > 0) {
    // 上下键导航
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      navigateUp()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      navigateDown()
      return
    }
    
    // Tab或Enter键确认选择
    if (event.key === 'Tab' || event.key === 'Enter') {
      event.preventDefault()
      const newValue = selectCurrentSuggestion()
      if (newValue) {
        chatInput.value = newValue
        // 重新解析引用以更新状态
        handleInputChange(newValue)
        
        // 焦点回到输入框
        nextTick(() => {
          const inputElement = document.querySelector('.chat-input')
          if (inputElement) {
            inputElement.focus()
          }
        })
      }
      return
    }
    
    // Escape键关闭建议
    if (event.key === 'Escape') {
      showSuggestions.value = false
      selectedIndex.value = -1
      return
    }
  }
  
  // 普通Enter键发送消息
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

const getCurrentRolePrompt = () => {
  return getRolePrompt() // 使用现有的getRolePrompt函数
}

const getRolePrompt = () => {
  // 检查是否有推荐角色被采用
  if (currentRole.value === suggestedRole.value?.role && suggestedRole.value) {
    return suggestedRole.value.prompt
  }
  
  // 检查是否是自定义角色
  const customRole = aiStore.getCustomRole(currentRole.value)
  if (customRole) {
    return customRole.prompt
  }
  
  // 默认角色提示词
  const rolePrompts = {
    analyst: '你是一位专业的数据分析师，擅长从数据中发现模式和洞察。请用数据驱动的方式分析问题，提供清晰的结论和建议。',
    dba: '你是一位资深的数据库管理员，精通SQL查询优化、数据库设计和性能调优。请从技术角度提供专业的数据库建议。',
    teacher: '你是一位耐心的SQL导师，善于用简单易懂的方式解释复杂的数据库概念。请循序渐进地教学，并提供实例。',
    consultant: '你是一位业务顾问，能将数据分析结果转化为具体的商业建议。请关注业务价值和实施可行性。'
  }
  
  return rolePrompts[currentRole.value] || rolePrompts.analyst
}

const formatMessage = (content) => {
  try {
    return marked.parse(content)
  } catch (error) {
    return content
  }
}

const handleInputKeyDown = (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    sendMessage()
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const clearChat = () => {
  chatMessages.value = []
}

// 处理代码复制
const handleCodeCopy = (code) => {
  notificationStore.success('代码已复制到剪贴板')
}

// 测试表选择
const testTableSelection = (tables) => {
  aiStore.updateSelectedTables(tables)
}

// 移除表
const removeTable = (table) => {
  const newTables = selectedTables.value.filter(t => t !== table)
  aiStore.updateSelectedTables(newTables)
  internalSelectedTables.value = newTables
}

// 生成角色
const generateRole = async () => {
  if (!roleKeywords.value.trim() || isGeneratingRole.value) return
  
  isGeneratingRole.value = true
  try {
    const role = await aiStore.generateCustomRole(roleKeywords.value.trim(), selectedTables.value)
    generatedRole.value = role
    notificationStore.success('角色生成成功！')
  } catch (error) {
    console.error('角色生成失败:', error)
    notificationStore.error(`角色生成失败: ${error.message}`)
  } finally {
    isGeneratingRole.value = false
  }
}

// 采用生成的角色
const adoptGeneratedRole = () => {
  if (generatedRole.value) {
    currentRole.value = generatedRole.value.role
    
    // 保存到AI Store的自定义角色中
    aiStore.saveCustomRole(generatedRole.value)
    
    // 保存角色选择到localStorage
    try {
      localStorage.setItem('qusc-db-last-selected-role', generatedRole.value.role)
    } catch (error) {
      console.error('保存角色选择失败:', error)
    }
    
    // 添加生成的角色到aiRoles中（临时显示）
    const tempRole = {
      id: generatedRole.value.role,
      name: generatedRole.value.name.replace(/^\S+\s/, ''), // 移除emoji
      icon: generatedRole.value.icon
    }
    
    if (!aiRoles.value.some(r => r.id === tempRole.id)) {
      aiRoles.value.push(tempRole)
    }
    
    chatMessages.value.push({
      role: 'system',
      content: `*已切换到自定义角色: ${generatedRole.value.name}*`
    })
    
    scrollToBottom()
    showRoleGenerator.value = false
    roleKeywords.value = ''
    
    // 不要清空generatedRole，保留引用
    // generatedRole.value = null  // 删除这一行
  }
}

// 组件挂载
onMounted(async () => {
  
  // 加载自定义角色到aiRoles中
  loadCustomRoles()
  
  // 恢复上次选择的角色
  loadLastSelectedRole()
})

// 加载自定义角色到下拉选择器
const loadCustomRoles = () => {
  const customRolesList = aiStore.getAllCustomRoles()
  
  customRolesList.forEach(customRole => {
    const tempRole = {
      id: customRole.role,
      name: customRole.name.replace(/^\S+\s/, ''), // 移除emoji
      icon: customRole.icon
    }
    
    // 如果还没有添加过，则添加到aiRoles中
    if (!aiRoles.value.some(r => r.id === tempRole.id)) {
      aiRoles.value.push(tempRole)
    }
  })
}

// 恢复上次选择的角色
const loadLastSelectedRole = () => {
  try {
    const lastRole = localStorage.getItem('qusc-db-last-selected-role')
    if (lastRole && aiRoles.value.some(r => r.id === lastRole)) {
      currentRole.value = lastRole
    }
  } catch (error) {
    console.error('加载上次选择的角色失败:', error)
  }
}
</script>

<style scoped>
.smart-chat-interface {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafafa;
}

.compact-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  min-height: 36px;
}

.connection-badge {
  font-size: 11px;
  color: #1f2937;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 2px;
}

.btn-compact {
  width: 24px;
  height: 24px;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #f3f4f6;
  }
  
  &.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  
  &.clear:hover:not(:disabled) {
    background: #fee2e2;
    border-color: #fca5a5;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.table-selector-panel,
.role-generator-panel {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 4px 8px;
}

.generator-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 10px;
  color: #6b7280;
  font-weight: 600;
}

.generator-input {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.keywords-input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 10px;
  outline: none;
  
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
}

.generate-btn {
  padding: 4px 8px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #2563eb;
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
}

.role-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 4px;
}

.role-details {
  flex: 1;
}

.role-name {
  font-size: 10px;
  font-weight: 600;
  color: #0369a1;
}

.role-desc {
  font-size: 8px;
  color: #6b7280;
  margin-top: 1px;
}

.adopt-role-btn {
  padding: 2px 6px;
  background: #0369a1;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 8px;
  cursor: pointer;
}

.compact-features {
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.selected-tables-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.bar-label {
  font-size: 12px;
  color: #64748b;
}

.table-chips {
  display: flex;
  gap: 4px;
  flex: 1;
}

.table-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 10px;
  font-size: 9px;
  font-weight: 500;
}

.remove-chip {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  
  &:hover {
    color: #dc2626;
  }
}

.scenario-badge {
  padding: 2px 6px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 8px;
  font-size: 8px;
  font-weight: 600;
}

.role-recommendation-compact {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #fef7ff;
}

.recommend-label {
  font-size: 9px;
  color: #86198f;
  font-weight: 500;
}

.role-chip {
  padding: 3px 8px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.recommended {
    background: #f59e0b;
  }
  
  &.active {
    background: #10b981;
  }
  
  &:hover {
    transform: translateY(-1px);
  }
}

.suggestions-horizontal {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  overflow-x: auto;
}

.suggestions-label {
  font-size: 12px;
  color: #6366f1;
  flex-shrink: 0;
}

.suggestions-chips {
  display: flex;
  gap: 4px;
  flex: 1;
}

.suggestion-chip {
  padding: 3px 6px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  color: #4338ca;
  font-size: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  
  &:hover {
    background: #c7d2fe;
    transform: translateY(-1px);
  }
}

.smart-features {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 16px;
}

.role-recommendation {
  margin-bottom: 12px;
}

.recommendation-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
}

.recommendation-header .icon {
  font-size: 14px;
}

.role-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
  
  &.active {
    background: linear-gradient(135deg, #10b981, #059669);
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }
}

.role-icon {
  font-size: 20px;
}

.role-info {
  flex: 1;
  text-align: left;
}

.role-name {
  font-weight: 600;
  font-size: 14px;
}

.role-desc {
  font-size: 11px;
  opacity: 0.9;
}

.adopt-btn {
  font-size: 11px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  font-weight: 500;
}

.suggestions-panel {
  margin-top: 12px;
}

.suggestions-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.suggestion-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  
  &:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;
    transform: translateY(-1px);
  }
}

.suggestion-text {
  font-size: 11px;
  color: #475569;
  flex: 1;
}

.apply-icon {
  font-size: 12px;
  color: #64748b;
  margin-left: 6px;
}

.compact-role-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.role-dropdown {
  flex: 1;
  min-width: 140px;
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 11px;
  background: #f9fafb;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &:hover {
    background: white;
    border-color: #9ca3af;
  }
}

.quick-adopt-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  
  &.system {
    justify-content: center;
    .message-content {
      color: #6b7280;
      font-style: italic;
      font-size: 12px;
    }
  }
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: #f3f4f6;
  flex-shrink: 0;
  
  .message-item.assistant & {
    background: #dbeafe;
  }
  
  .message-item.user & {
    background: #f0f9ff;
  }
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-text {
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  font-size: 13px;
  line-height: 1.5;
  
  .message-item.user & {
    background: #eff6ff;
    border-color: #bfdbfe;
  }
  
  .message-item.assistant & {
    background: #f8fafc;
    border-color: #e2e8f0;
  }
}

/* AI消息的Markdown渲染器样式 */
.ai-message-renderer {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  
  .message-item.assistant & {
    background: #f8fafc;
    border-color: #e2e8f0;
  }
}

/* 增强AI消息的视觉效果 */
.message-item.assistant .ai-message-renderer {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
}

.message-item.assistant .ai-message-renderer::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #3b82f6, #1d4ed8);
  border-radius: 12px 0 0 12px;
}


/* @表名自动补全下拉框 */
.table-suggestions-dropdown {
  position: absolute;
  top: -2px; /* 稍微向上移动，贴近输入框 */
  left: 0;
  right: 60px; /* 为发送按钮留出空间 */
  background: white;
  border: 2px solid #3b82f6; /* 更明显的边框 */
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  max-height: 240px;
  overflow-y: auto;
  z-index: 9999; /* 提高z-index */
  transform: translateY(-100%); /* 向上显示 */
}

.suggestion-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggestion-item:hover,
.suggestion-item.selected {
  background-color: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.suggestion-item.selected {
  background-color: #dbeafe;
  font-weight: 600;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  font-family: 'Consolas', 'Monaco', monospace; /* 代码字体 */
}

.suggestion-info {
  font-size: 11px;
  color: #6b7280;
  display: flex;
  gap: 8px;
  align-items: center;
}

.suggestion-info::before {
  content: "📊";
  margin-right: 4px;
}

/* 输入提示样式 */
.input-footer.enhanced {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.table-refs {
  font-size: 11px;
  color: #6366f1;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #c7d2fe;
  font-weight: 500;
}

/* 表引用状态显示 */
.table-references-status {
  padding: 8px 16px 0;
  display: flex;
  justify-content: center;
}


/* 增强的输入框和发送按钮 */
.chat-input.enhanced {
  position: relative;
  background: white;
  border: 2px solid #d1d5db;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chat-input.enhanced:focus {
  background: white;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

/* @表名高亮显示 */
.chat-input.enhanced:focus::placeholder {
  color: #6366f1;
  font-weight: 500;
}

.send-button.enhanced {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  padding: 10px 16px;
  font-size: 18px;
}

.send-button.enhanced:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}

/* 响应式设计调整 */
@media (max-width: 768px) {
  .compact-chat-header {
    padding: 6px 8px;
  }
  
  .table-suggestions-dropdown {
    max-height: 180px;
  }
  
  .table-refs {
    align-self: stretch;
    text-align: center;
  }
}

.chat-input-area {
  background: linear-gradient(135deg, #fafafa 0%, #f0f9ff 100%);
  border-top: 1px solid #e5e7eb;
  padding: 16px 20px;
  border-radius: 0 0 12px 12px;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  position: relative; /* 添加相对定位，确保下拉框正确定位 */
}

.chat-input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease;
  
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

.send-button {
  padding: 8px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }
}

.input-footer {
  margin-top: 6px;
  text-align: center;
  color: #6b7280;
}

.debug-panel {
  margin-top: 12px;
  padding: 8px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
}

.debug-header {
  font-size: 11px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 6px;
}

.debug-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 4px;
}

.debug-btn {
  font-size: 9px;
  padding: 4px 6px;
  background: #fbbf24;
  color: #92400e;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
  
  &:hover {
    background: #f59e0b;
    color: white;
  }
}

.debug-info {
  text-align: center;
  color: #92400e;
  font-size: 9px;
}

</style>