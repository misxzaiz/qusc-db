<template>
  <FormDialog
    :visible="visible"
    :title="connection ? '编辑连接' : '新建连接'"
    icon="🔗"
    size="large"
    :initial-data="formData"
    :validation-rules="validationRules"
    :submit-handler="handleSubmit"
    submit-text="保存连接"
    help-text="请确保所有连接信息正确，保存后将自动测试连接"
    @update:visible="$emit('update:visible', $event)"
    @submit="handleSuccess"
    @cancel="$emit('cancel')"
  >
    <template #default="{ formData, errors, validateField }">
      <!-- 连接名称 -->
      <div class="form-group">
        <label class="required">连接名称</label>
        <input 
          v-model="formData.name" 
          type="text" 
          class="input" 
          :class="{ error: errors.name }"
          placeholder="输入连接名称"
          @blur="validateField('name')"
        />
        <div v-if="errors.name" class="field-error">{{ errors.name }}</div>
      </div>
      
      <!-- 数据库类型 -->
      <div class="form-group">
        <label class="required">数据库类型</label>
        <select 
          v-model="formData.config.db_type" 
          class="select" 
          :class="{ error: errors['config.db_type'] }"
          @change="handleDbTypeChange(formData); validateField('config.db_type')"
          @blur="validateField('config.db_type')"
        >
          <option value="">选择数据库类型</option>
          <option value="MySQL">MySQL</option>
          <option value="Redis">Redis</option>
          <option value="PostgreSQL">PostgreSQL</option>
        </select>
        <div v-if="errors['config.db_type']" class="field-error">{{ errors['config.db_type'] }}</div>
      </div>
      
      <!-- 主机和端口 -->
      <div class="form-row">
        <div class="form-group">
          <label class="required">主机地址</label>
          <input 
            v-model="formData.config.host" 
            type="text" 
            class="input" 
            :class="{ error: errors['config.host'] }"
            placeholder="localhost"
            @blur="validateField('config.host')"
          />
          <div v-if="errors['config.host']" class="field-error">{{ errors['config.host'] }}</div>
        </div>
        
        <div class="form-group">
          <label class="required">端口</label>
          <input 
            v-model.number="formData.config.port" 
            type="number" 
            class="input" 
            :class="{ error: errors['config.port'] }"
            :placeholder="getDefaultPort(formData.config.db_type)"
            @blur="validateField('config.port')"
            @input="validateField('config.port')"
          />
          <div v-if="errors['config.port']" class="field-error">{{ errors['config.port'] }}</div>
        </div>
      </div>
      
      <!-- 认证信息 -->
      <div class="form-row" v-if="requiresAuth(formData.config.db_type)">
        <div class="form-group">
          <label>用户名</label>
          <input 
            v-model="formData.config.username" 
            type="text" 
            class="input"
            placeholder="数据库用户名"
          />
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input 
            v-model="formData.config.password" 
            type="password" 
            class="input"
            placeholder="数据库密码"
          />
        </div>
      </div>
      
      <!-- 数据库名（MySQL/PostgreSQL） -->
      <div class="form-group" v-if="requiresDatabase(formData.config.db_type)">
        <label>数据库名</label>
        <input 
          v-model="formData.config.database" 
          type="text" 
          class="input"
          placeholder="数据库名称（可选）"
        />
        <div class="form-hint">不指定数据库名将连接到默认数据库</div>
      </div>
      
      <!-- SSL选项 -->
      <div class="form-group" v-if="supportsSsl(formData.config.db_type)">
        <label class="checkbox-label">
          <input 
            v-model="formData.config.ssl" 
            type="checkbox" 
            class="checkbox"
          />
          <span class="checkbox-text">使用SSL连接</span>
        </label>
      </div>
      
      <!-- 连接超时 -->
      <div class="form-group">
        <label>连接超时（秒）</label>
        <input 
          v-model.number="formData.config.timeout" 
          type="number" 
          class="input"
          placeholder="30"
          min="1"
          max="300"
        />
        <div class="form-hint">连接超时时间，默认30秒</div>
      </div>
    </template>
  </FormDialog>
</template>

<script setup>
import { computed, watch } from 'vue'
import FormDialog from './FormDialog.vue'
import { useConnectionStore } from '@/stores/connection.js'
import { useNotificationStore } from '@/stores/notification.js'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  connection: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:visible', 'save', 'cancel'])

// Stores
const connectionStore = useConnectionStore()
const notificationStore = useNotificationStore()

// 表单数据
const formData = computed(() => {
  if (props.connection) {
    return {
      name: props.connection.name || '',
      config: {
        name: props.connection.name || '',
        db_type: props.connection.config?.db_type || '',
        host: props.connection.config?.host || 'localhost',
        port: props.connection.config?.port || getDefaultPortForType(props.connection.config?.db_type),
        username: props.connection.config?.username || '',
        password: props.connection.config?.password || '',
        database: props.connection.config?.database || '',
        ssl: props.connection.config?.ssl || false,
        timeout: props.connection.config?.timeout || 30
      }
    }
  }
  
  return {
    name: '',
    config: {
      name: '',
      db_type: '',
      host: 'localhost',
      port: null, // 初始为null，当选择数据库类型时会自动设置
      username: '',
      password: '',
      database: '',
      ssl: false,
      timeout: 30
    }
  }
})

// 表单验证规则
const validationRules = {
  name: ['required'],
  'config.db_type': ['required'],
  'config.host': ['required'],
  'config.port': [
    {
      rule: 'required',
      message: '请选择数据库类型以自动设置端口，或手动输入端口号'
    },
    {
      rule: 'min',
      params: [1],
      message: '端口号必须大于0'
    },
    {
      rule: 'max',
      params: [65535],
      message: '端口号不能超过65535'
    }
  ]
}

// 方法
const getDefaultPort = (dbType) => {
  const portMap = {
    'MySQL': '3306',
    'PostgreSQL': '5432',
    'Redis': '6379'
  }
  return portMap[dbType] || ''
}

const getDefaultPortForType = (dbType) => {
  const portMap = {
    'MySQL': 3306,
    'PostgreSQL': 5432,
    'Redis': 6379
  }
  return portMap[dbType] || null
}

const requiresAuth = (dbType) => {
  return ['MySQL', 'PostgreSQL'].includes(dbType)
}

const requiresDatabase = (dbType) => {
  return ['MySQL', 'PostgreSQL'].includes(dbType)
}

const supportsSsl = (dbType) => {
  return ['MySQL', 'PostgreSQL'].includes(dbType)
}

const handleDbTypeChange = (formData) => {
  // 自动设置默认端口（总是更新为对应数据库的默认端口）
  const defaultPort = getDefaultPort(formData.config.db_type)
  if (defaultPort) {
    formData.config.port = parseInt(defaultPort)
    // 触发端口字段的验证
    setTimeout(() => {
      // 使用setTimeout确保DOM更新后再验证
      const portField = document.querySelector('input[type="number"]')
      if (portField) {
        portField.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, 0)
  }
}

const handleSubmit = async (data) => {
  try {
    // 测试连接
    const testResult = await connectionStore.testConnection(data.config)
    
    if (!testResult.success) {
      throw new Error(`连接测试失败: ${testResult.error}`)
    }
    
    // 保存连接
    let result
    if (props.connection) {
      result = await connectionStore.updateConnection(props.connection.id, data)
    } else {
      result = await connectionStore.addConnection(data)
    }
    
    notificationStore.success(
      props.connection ? '连接已更新' : '连接已保存',
      3000
    )
    
    return result
  } catch (error) {
    notificationStore.error(error.message, 5000)
    throw error
  }
}

const handleSuccess = (result) => {
  emit('save', result)
}
</script>