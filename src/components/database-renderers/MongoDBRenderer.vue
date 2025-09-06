<template>
  <div class="mongodb-renderer">
    <div class="mongodb-info">
      <Icon name="layers" />
      <span>MongoDB 文档</span>
    </div>
    
    <div class="mongodb-content">
      <JsonRenderer 
        :data="queryData"
        :editable="editable"
        @data-update="handleDataUpdate"
      />
    </div>
  </div>
</template>

<script>
import Icon from '@/components/common/Icon.vue'
import JsonRenderer from './JsonRenderer.vue'

export default {
  name: 'MongoDBRenderer',
  components: {
    Icon,
    JsonRenderer
  },
  props: {
    queryData: {
      type: Object,
      required: true
    },
    connectionId: {
      type: String,
      required: true
    },
    editable: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'document-update',
    'document-delete',
    'field-update',
    'pipeline-execute',
    'export-documents'
  ],
  setup(props, { emit }) {
    const handleDataUpdate = (data) => {
      emit('document-update', data)
    }
    
    return {
      handleDataUpdate
    }
  }
}
</script>

<style lang="scss" scoped>
.mongodb-renderer {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  .mongodb-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #f0fdf4;
    border-bottom: 1px solid #bbf7d0;
    color: #047857;
    font-weight: 600;
  }
  
  .mongodb-content {
    flex: 1;
    overflow: hidden;
  }
}
</style>