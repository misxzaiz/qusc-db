<template>
  <FormDialog
    :visible="visible"
    title="配置AI服务"
    icon=" "
    size="medium"
    :initial-data="formData"
    :validation-rules="validationRules"
    :submit-handler="handleSubmit"
    submit-text="保存配置"
    help-text="配置完成后将自动测试AI服务连接"
    @update:visible="$emit('update:visible', $event)"
    @submit="handleSuccess"
    @cancel="$emit('cancel')"
  >
    <template #default="{ formData, errors, validateField }">
      <!-- AI服务提供商 -->
      <div class="form-group">
        <label class="required">AI服务提供商</label>
        <select 
          v-model="formData.provider" 
          class="select" 
          :class="{ error: errors.provider }"
          @change="handleProviderChange(formData)"
        >
          <option value="deepseek">DeepSeek</option>
        </select>
        <div v-if="errors.provider" class="field-error">{{ errors.provider }}</div>
      </div>
      
      <!-- API密钥 -->
      <div class="form-group">
        <label class="required">API密钥</label>
        <div class="input-group">
          <input 
            v-model="formData.apiKey" 
            :type="showApiKey ? 'text' : 'password'" 
            class="input" 
            :class="{ error: errors.apiKey }"
            placeholder="输入API密钥"
            @blur="validateField('apiKey')"
          />
          <button 
            type="button" 
            class="input-addon-btn"
            @click="showApiKey = !showApiKey"
            :title="showApiKey ? '隐藏' : '显示'"
          >
            {{ showApiKey ? '🙈' : '👁️' }}
          </button>
        </div>
        <div v-if="errors.apiKey" class="field-error">{{ errors.apiKey }}</div>
        <div class="form-hint">
          请确保API密钥有效且有足够的配额
        </div>
      </div>
      
      <!-- API端点 -->
      <div class="form-group">
        <label class="required">API端点</label>
        <input 
          v-model="formData.baseUrl" 
          type="url" 
          class="input" 
          :class="{ error: errors.baseUrl }"
          placeholder="https://api.deepseek.com/v1/chat/completions"
          @blur="validateField('baseUrl')"
        />
        <div v-if="errors.baseUrl" class="field-error">{{ errors.baseUrl }}</div>
      </div>
      
      <!-- 模型名称 -->
      <div class="form-group">
        <label class="required">模型名称</label>
        <select 
          v-model="formData.model" 
          class="select" 
          :class="{ error: errors.model }"
        >
          <option 
            v-for="model in availableModels" 
            :key="model.value" 
            :value="model.value"
          >
            {{ model.label }}
          </option>
        </select>
        <div v-if="errors.model" class="field-error">{{ errors.model }}</div>
      </div>
      
      <!-- 高级设置 -->
      <details class="advanced-settings">
        <summary class="advanced-title">高级设置</summary>
        
        <div class="advanced-content">
          <!-- 最大Token数 -->
          <div class="form-group">
            <label>最大Token数</label>
            <input 
              v-model.number="formData.maxTokens" 
              type="number" 
              class="input"
              placeholder="2048"
              min="100"
              max="32000"
            />
            <div class="form-hint">单次请求的最大Token数量</div>
          </div>
          
          <!-- 温度参数 -->
          <div class="form-group">
            <label>温度参数</label>
            <input 
              v-model.number="formData.temperature" 
              type="number" 
              class="input"
              placeholder="0.1"
              min="0"
              max="2"
              step="0.1"
            />
            <div class="form-hint">控制回答的随机性，0-2之间，越高越随机</div>
          </div>
        </div>
      </details>
    </template>
  </FormDialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import FormDialog from './FormDialog.vue'
import { useAIStore } from '@/stores/ai.js'
import { useNotificationStore } from '@/stores/notification.js'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible', 'save', 'cancel'])

// Stores
const aiStore = useAIStore()
const notificationStore = useNotificationStore()

// 响应式数据
const showApiKey = ref(false)

// 表单数据
const formData = computed(() => ({
  provider: aiStore.currentProvider || 'deepseek',
  apiKey: aiStore.apiKey || '',
  baseUrl: aiStore.baseUrl || 'https://api.deepseek.com/v1/chat/completions',
  model: aiStore.model || 'deepseek-coder',
  maxTokens: aiStore.settings?.maxTokens || 2048,
  temperature: aiStore.settings?.temperature || 0.1
}))

// 可用模型列表
const availableModels = computed(() => {
  const modelMap = {
    'deepseek': [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' }
    ],
    'openai': [
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    'claude': [
      { value: 'claude-3-opus', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' }
    ]
  }
  
  return modelMap[formData.value.provider] || []
})

// 表单验证规则
const validationRules = {
  provider: ['required'],
  apiKey: ['required'],
  baseUrl: ['required', 'url'],
  model: ['required']
}

// 方法
const handleProviderChange = (formData) => {
  // 根据提供商自动设置默认端点和模型
  const defaults = {
    'deepseek': {
      baseUrl: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-coder'
    },
    'openai': {
      baseUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo'
    },
    'claude': {
      baseUrl: 'https://api.anthropic.com/v1/messages',
      model: 'claude-3-sonnet'
    }
  }
  
  const providerDefaults = defaults[formData.provider]
  if (providerDefaults) {
    formData.baseUrl = providerDefaults.baseUrl
    formData.model = providerDefaults.model
  }
}

const handleSubmit = async (data) => {
  try {
    // 测试AI服务连接
    const testResult = await aiStore.testConfig(data)
    
    if (!testResult.success) {
      throw new Error(`AI服务连接测试失败: ${testResult.error}`)
    }
    
    // 保存配置
    await aiStore.updateConfig(data)
    
    notificationStore.success('AI配置已保存', 3000)
    
    return data
  } catch (error) {
    notificationStore.error(error.message, 5000)
    throw error
  }
}

const handleSuccess = (result) => {
  emit('save', result)
}
</script>

<style scoped>
.input-group {
  display: flex;
  align-items: stretch;
}

.input-group .input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
}

.input-addon-btn {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-left: none;
  border-top-right-radius: var(--border-radius);
  border-bottom-right-radius: var(--border-radius);
  background: var(--gray-50);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.input-addon-btn:hover {
  background: var(--gray-100);
}

.advanced-settings {
  margin-top: 20px;
}

.advanced-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-700);
  cursor: pointer;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 16px;
  user-select: none;
}

.advanced-title:hover {
  color: var(--primary-color);
}

.advanced-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>