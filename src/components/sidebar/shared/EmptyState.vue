<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <div class="empty-text">{{ message }}</div>
    <slot name="action" />
  </div>
</template>

<script setup>
const props = defineProps({
  icon: {
    type: String,
    default: '📄'
  },
  message: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--gray-500);
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.empty-text {
  font-size: 13px;
  margin-bottom: 16px;
  line-height: 1.4;
}
</style>