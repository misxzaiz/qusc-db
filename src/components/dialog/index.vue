<template>
  <div class="dialog-system">
    <!-- 基础对话框 -->
    <BaseDialog
      v-for="dialog in baseDialogs"
      :key="dialog.id"
      v-bind="dialog"
      @update:visible="handleDialogVisibleChange(dialog.id, $event)"
      @confirm="handleDialogConfirm(dialog.id, $event)"
      @cancel="handleDialogCancel(dialog.id, $event)"
      @close="handleDialogClose(dialog.id, $event)"
    >
      <slot :name="dialog.id" :dialog="dialog" />
    </BaseDialog>
    
    <!-- 确认对话框 -->
    <ConfirmDialog
      v-for="dialog in confirmDialogs"
      :key="dialog.id"
      v-bind="dialog"
      @update:visible="handleDialogVisibleChange(dialog.id, $event)"
      @confirm="handleDialogConfirm(dialog.id, $event)"
      @cancel="handleDialogCancel(dialog.id, $event)"
      @close="handleDialogClose(dialog.id, $event)"
    />
    
    <!-- 表单对话框 -->
    <FormDialog
      v-for="dialog in formDialogs"
      :key="dialog.id"
      v-bind="dialog"
      @update:visible="handleDialogVisibleChange(dialog.id, $event)"
      @submit="handleDialogConfirm(dialog.id, $event)"
      @cancel="handleDialogCancel(dialog.id, $event)"
      @close="handleDialogClose(dialog.id, $event)"
    >
      <slot :name="dialog.id" :dialog="dialog" />
    </FormDialog>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BaseDialog from './BaseDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import FormDialog from './FormDialog.vue'
import { useDialog } from './composables/useDialog.js'

// 使用对话框管理器
const { dialogs, hideDialog, closeDialog } = useDialog()

// 按类型分组对话框
const baseDialogs = computed(() => 
  Object.values(dialogs).filter(dialog => 
    !dialog.type || dialog.type === 'base'
  )
)

const confirmDialogs = computed(() => 
  Object.values(dialogs).filter(dialog => 
    ['confirm', 'info', 'warning', 'error', 'success', 'question'].includes(dialog.type)
  )
)

const formDialogs = computed(() => 
  Object.values(dialogs).filter(dialog => 
    dialog.type === 'form'
  )
)

// 事件处理
const handleDialogVisibleChange = (id, visible) => {
  if (!visible) {
    closeDialog(id, 'visibility_change')
  }
}

const handleDialogConfirm = (id, result) => {
  hideDialog(id, result)
}

const handleDialogCancel = (id) => {
  closeDialog(id, 'cancel')
}

const handleDialogClose = (id) => {
  closeDialog(id, 'close')
}
</script>

<style scoped>
.dialog-system {
  /* 对话框系统容器 */
}
</style>