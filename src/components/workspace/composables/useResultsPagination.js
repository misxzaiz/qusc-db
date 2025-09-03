import { ref, computed } from 'vue'
import { useNotificationStore } from '@/stores/notification.js'

export function useResultsPagination() {
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalRecords = ref(0)
  const jumpToPage = ref('')
  
  const notificationStore = useNotificationStore()
  
  const totalPages = computed(() => {
    if (totalRecords.value === 0 || pageSize.value === 0) return 0
    return Math.ceil(totalRecords.value / pageSize.value)
  })
  
  const resetPagination = () => {
    currentPage.value = 1
    totalRecords.value = 0
    jumpToPage.value = ''
  }
  
  const updatePaginationFromResult = (result) => {
    if (result) {
      currentPage.value = result.currentPage || 1
      totalRecords.value = result.totalRecords || 0
    }
  }
  
  const validatePageNumber = (page) => {
    if (page < 1) return false
    if (totalPages.value > 0 && page > totalPages.value) return false
    return true
  }
  
  const handleJumpToPage = () => {
    const page = parseInt(jumpToPage.value)
    if (isNaN(page) || page < 1) {
      notificationStore.warning('请输入有效的页码')
      return null
    }
    
    if (totalPages.value > 0 && page > totalPages.value) {
      notificationStore.warning(`页码不能超过总页数 ${totalPages.value}`)
      return null
    }
    
    jumpToPage.value = ''
    return page
  }
  
  const handleJumpKeydown = (event, onJump) => {
    if (event.key === 'Enter') {
      const page = handleJumpToPage()
      if (page && onJump) {
        onJump(page)
      }
    }
  }
  
  const goToPreviousPage = () => {
    if (currentPage.value <= 1) return null
    return currentPage.value - 1
  }
  
  const goToNextPage = () => {
    return currentPage.value + 1
  }
  
  return {
    currentPage,
    pageSize,
    totalRecords,
    totalPages,
    jumpToPage,
    resetPagination,
    updatePaginationFromResult,
    validatePageNumber,
    handleJumpToPage,
    handleJumpKeydown,
    goToPreviousPage,
    goToNextPage
  }
}