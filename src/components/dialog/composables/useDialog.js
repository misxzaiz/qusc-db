import { ref, reactive, nextTick } from 'vue'

// 对话框状态管理
const dialogs = reactive({})

export function useDialog() {
  // 创建对话框实例
  const createDialog = (id, options = {}) => {
    if (dialogs[id]) {
      console.warn(`Dialog with id "${id}" already exists`)
      return dialogs[id]
    }
    
    dialogs[id] = reactive({
      id,
      visible: false,
      type: options.type || 'base',
      ...options
    })
    
    return dialogs[id]
  }
  
  // 显示对话框
  const showDialog = (id, options = {}) => {
    if (!dialogs[id]) {
      createDialog(id, options)
    }
    
    // 更新选项
    Object.assign(dialogs[id], options)
    dialogs[id].visible = true
    
    return new Promise((resolve, reject) => {
      dialogs[id].resolve = resolve
      dialogs[id].reject = reject
    })
  }
  
  // 隐藏对话框
  const hideDialog = (id, result = null) => {
    if (dialogs[id]) {
      dialogs[id].visible = false
      
      if (dialogs[id].resolve) {
        dialogs[id].resolve(result)
        delete dialogs[id].resolve
        delete dialogs[id].reject
      }
    }
  }
  
  // 关闭对话框（取消操作）
  const closeDialog = (id, reason = 'cancel') => {
    if (dialogs[id]) {
      dialogs[id].visible = false
      
      if (dialogs[id].reject) {
        dialogs[id].reject(new Error(reason))
        delete dialogs[id].resolve
        delete dialogs[id].reject
      }
    }
  }
  
  // 销毁对话框
  const destroyDialog = (id) => {
    if (dialogs[id]) {
      dialogs[id].visible = false
      delete dialogs[id]
    }
  }
  
  // 检查对话框是否存在
  const hasDialog = (id) => {
    return !!dialogs[id]
  }
  
  // 获取对话框状态
  const getDialog = (id) => {
    return dialogs[id] || null
  }
  
  // 获取所有对话框
  const getAllDialogs = () => {
    return { ...dialogs }
  }
  
  // 关闭所有对话框
  const closeAllDialogs = () => {
    Object.keys(dialogs).forEach(id => {
      closeDialog(id, 'close_all')
    })
  }
  
  return {
    dialogs,
    createDialog,
    showDialog,
    hideDialog,
    closeDialog,
    destroyDialog,
    hasDialog,
    getDialog,
    getAllDialogs,
    closeAllDialogs
  }
}

// 便捷方法 - 确认对话框
export function useConfirmDialog() {
  const { showDialog, hideDialog, closeDialog } = useDialog()
  
  const confirm = (message, options = {}) => {
    const dialogId = `confirm_${Date.now()}`
    
    const defaultOptions = {
      type: 'confirm',
      message,
      title: '确认',
      size: 'small',
      showCancel: true,
      showConfirm: true,
      cancelText: '取消',
      confirmText: '确定',
      ...options
    }
    
    return showDialog(dialogId, defaultOptions)
      .then((result) => {
        hideDialog(dialogId, result)
        return result
      })
      .catch((error) => {
        closeDialog(dialogId, error.message)
        throw error
      })
  }
  
  const warning = (message, options = {}) => {
    return confirm(message, {
      type: 'warning',
      title: '警告',
      icon: '⚠️',
      ...options
    })
  }
  
  const error = (message, options = {}) => {
    return confirm(message, {
      type: 'error',
      title: '错误',
      icon: '❌',
      showCancel: false,
      confirmText: '知道了',
      ...options
    })
  }
  
  const info = (message, options = {}) => {
    return confirm(message, {
      type: 'info',
      title: '提示',
      icon: 'ℹ️',
      showCancel: false,
      confirmText: '知道了',
      ...options
    })
  }
  
  const success = (message, options = {}) => {
    return confirm(message, {
      type: 'success',
      title: '成功',
      icon: '✅',
      showCancel: false,
      confirmText: '知道了',
      ...options
    })
  }
  
  // 危险操作确认
  const dangerous = (message, options = {}) => {
    return confirm(message, {
      type: 'error',
      title: '危险操作',
      icon: '⚠️',
      requireInput: true,
      inputLabel: '请输入 "确认" 以继续',
      inputPlaceholder: '确认',
      inputValidator: (value) => value === '确认',
      confirmText: '执行操作',
      ...options
    })
  }
  
  return {
    confirm,
    warning,
    error,
    info,
    success,
    dangerous
  }
}

// 便捷方法 - 表单对话框
export function useFormDialog() {
  const { showDialog, hideDialog, closeDialog } = useDialog()
  
  const openForm = (title, fields, options = {}) => {
    const dialogId = `form_${Date.now()}`
    
    const defaultOptions = {
      type: 'form',
      title,
      fields,
      size: 'medium',
      showCancel: true,
      showSubmit: true,
      cancelText: '取消',
      submitText: '确定',
      ...options
    }
    
    return showDialog(dialogId, defaultOptions)
      .then((result) => {
        hideDialog(dialogId, result)
        return result
      })
      .catch((error) => {
        closeDialog(dialogId, error.message)
        throw error
      })
  }
  
  const editForm = (title, initialData, fields, options = {}) => {
    return openForm(title, fields, {
      initialData,
      submitText: '保存',
      ...options
    })
  }
  
  const createForm = (title, fields, options = {}) => {
    return openForm(title, fields, {
      submitText: '创建',
      ...options
    })
  }
  
  return {
    openForm,
    editForm,
    createForm
  }
}

// 便捷方法 - 快速操作
export function useQuickDialog() {
  const { confirm, warning, error, info, success } = useConfirmDialog()
  const { openForm } = useFormDialog()
  
  // 删除确认
  const confirmDelete = (itemName = '该项目') => {
    return warning(`确定要删除 ${itemName} 吗？`, {
      title: '确认删除',
      confirmText: '删除',
      type: 'warning'
    })
  }
  
  // 保存确认
  const confirmSave = (message = '确定要保存更改吗？') => {
    return confirm(message, {
      title: '保存确认',
      confirmText: '保存'
    })
  }
  
  // 离开确认
  const confirmLeave = (message = '有未保存的更改，确定要离开吗？') => {
    return warning(message, {
      title: '确认离开',
      confirmText: '离开',
      cancelText: '留下'
    })
  }
  
  // 重置确认
  const confirmReset = (message = '确定要重置所有设置吗？') => {
    return warning(message, {
      title: '重置确认',
      confirmText: '重置'
    })
  }
  
  // 快速输入对话框
  const prompt = (message, defaultValue = '', options = {}) => {
    return openForm('输入', [], {
      size: 'small',
      message,
      initialData: { input: defaultValue },
      validationRules: {
        input: ['required']
      },
      submitText: '确定',
      ...options
    }).then(result => result.input)
  }
  
  return {
    confirm,
    warning,
    error,
    info,
    success,
    confirmDelete,
    confirmSave,
    confirmLeave,
    confirmReset,
    prompt
  }
}

// 全局对话框管理器
export function useGlobalDialog() {
  const dialogState = reactive({
    activeDialogs: {},
    zIndexCounter: 1000
  })
  
  const registerDialog = (id, component) => {
    dialogState.activeDialogs[id] = {
      id,
      component,
      zIndex: dialogState.zIndexCounter++,
      visible: false
    }
  }
  
  const unregisterDialog = (id) => {
    delete dialogState.activeDialogs[id]
  }
  
  const bringToFront = (id) => {
    if (dialogState.activeDialogs[id]) {
      dialogState.activeDialogs[id].zIndex = dialogState.zIndexCounter++
    }
  }
  
  const getTopDialog = () => {
    const dialogs = Object.values(dialogState.activeDialogs)
    if (dialogs.length === 0) return null
    
    return dialogs.reduce((top, current) => 
      current.zIndex > top.zIndex ? current : top
    )
  }
  
  const closeTopDialog = () => {
    const topDialog = getTopDialog()
    if (topDialog) {
      // 触发关闭事件
      topDialog.component?.close?.()
    }
  }
  
  // ESC键处理
  const handleEscapeKey = () => {
    closeTopDialog()
  }
  
  return {
    dialogState,
    registerDialog,
    unregisterDialog,
    bringToFront,
    getTopDialog,
    closeTopDialog,
    handleEscapeKey
  }
}