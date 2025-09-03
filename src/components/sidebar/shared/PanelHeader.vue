<template>
  <div class="panel-header">
    <h3>{{ title }}</h3>
    <div class="panel-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--gray-50);
  height: var(--header-height);
}

.panel-header h3 {
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-800);
  margin: 0;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>