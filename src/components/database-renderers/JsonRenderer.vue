<template>
  <div class="json-renderer">
    <div class="json-container">
      <pre class="json-display" :class="{ editable: editable }"><code>{{ formattedData }}</code></pre>
    </div>
    
    <div v-if="editable" class="json-actions">
      <button class="btn btn-primary" @click="updateData">
        <Icon name="save" />
        保存更改
      </button>
      <button class="btn btn-secondary" @click="resetData">
        <Icon name="refresh" />
        重置
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps({
  data: {
    type: [Object, Array, String],
    default: () => ({})
  },
  editable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['data-update'])

const localData = ref(null)

const formattedData = computed(() => {
  try {
    const dataToFormat = localData.value !== null ? localData.value : props.data
    return JSON.stringify(dataToFormat, null, 2)
  } catch (error) {
    return String(props.data || '')
  }
})

const updateData = () => {
  try {
    const parsedData = JSON.parse(formattedData.value)
    emit('data-update', parsedData)
  } catch (error) {
    console.error('Invalid JSON:', error)
  }
}

const resetData = () => {
  localData.value = null
}

watch(() => props.data, () => {
  localData.value = null
}, { immediate: true })
</script>

<style scoped>
.json-renderer {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.json-container {
  flex: 1;
  overflow: auto;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
}

.json-display {
  margin: 0;
  padding: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #2d3748;
  background: transparent;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.json-display.editable {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 1rem;
  outline: none;
}

.json-display.editable:focus {
  border-color: #3182ce;
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
}

.json-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: #f7fafc;
  border-top: 1px solid #e2e8f0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3182ce;
  color: white;
}

.btn-primary:hover {
  background: #2c5282;
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #cbd5e0;
}
</style>