<template>
  <component
    :is="editorComponent"
    v-bind="editorProps"
    @save="handleSave"
    @cancel="handleCancel"
    @navigate="handleNavigate"
  />
</template>

<script setup>
import { computed } from 'vue'
import InlineTextInput from './InlineTextInput.vue'
import InlineNumberInput from './InlineNumberInput.vue'
import InlineDateTimeInput from './InlineDateTimeInput.vue'
import InlineBooleanSelect from './InlineBooleanSelect.vue'

const props = defineProps({
  value: {
    type: [String, Number, Boolean, Date],
    default: null
  },
  column: {
    type: Object,
    required: true
  },
  constraints: {
    type: Object,
    default: () => ({})
  },
  autoFocus: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['save', 'cancel', 'navigate'])

// 编辑器组件映射
const editorComponentMap = {
  // 文本类型
  'varchar': InlineTextInput,
  'char': InlineTextInput,
  'text': InlineTextInput,
  'tinytext': InlineTextInput,
  'mediumtext': InlineTextInput,
  'enum': InlineTextInput, // 简单枚举先用文本，复杂的可以后续扩展为选择器
  'set': InlineTextInput,
  
  // 数字类型
  'tinyint': InlineNumberInput,
  'smallint': InlineNumberInput,
  'mediumint': InlineNumberInput,
  'int': InlineNumberInput,
  'integer': InlineNumberInput,
  'bigint': InlineNumberInput,
  'decimal': InlineNumberInput,
  'numeric': InlineNumberInput,
  'float': InlineNumberInput,
  'double': InlineNumberInput,
  'real': InlineNumberInput,
  
  // 日期时间类型
  'date': InlineDateTimeInput,
  'datetime': InlineDateTimeInput,
  'timestamp': InlineDateTimeInput,
  'time': InlineDateTimeInput,
  'year': InlineNumberInput, // YEAR类型当作数字处理
  
  // 布尔类型
  'boolean': InlineBooleanSelect,
  'bool': InlineBooleanSelect
}

// 计算属性
const dataType = computed(() => {
  const type = props.column.data_type?.toLowerCase() || 'varchar'
  
  // 特殊处理 TINYINT(1) 作为布尔类型
  if (type === 'tinyint') {
    const precision = props.column.numeric_precision || props.column.column_type?.match(/\((\d+)\)/)?.[1]
    if (precision === '1' || precision === 1) {
      return 'boolean'
    }
  }
  
  return type
})

const editorComponent = computed(() => {
  return editorComponentMap[dataType.value] || InlineTextInput
})

const editorProps = computed(() => {
  return {
    value: props.value,
    column: props.column,
    constraints: props.constraints,
    autoFocus: props.autoFocus
  }
})

// 事件处理
const handleSave = (value) => {
  emit('save', value)
}

const handleCancel = () => {
  emit('cancel')
}

const handleNavigate = (navigationInfo) => {
  emit('navigate', navigationInfo)
}

// 暴露数据类型和组件信息给父组件调试使用
defineExpose({
  dataType,
  editorComponent: editorComponent.value.name,
  column: props.column
})
</script>