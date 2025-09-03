/**
 * 连接配置加密工具
 * 使用 AES-GCM 加密算法保护敏感数据
 */

// 获取或生成加密密钥
const getEncryptionKey = async () => {
  // 检查是否已有密钥
  let keyData = localStorage.getItem('qusc-db-encryption-key')
  
  if (!keyData) {
    // 生成新的256位加密密钥
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // 可导出
      ['encrypt', 'decrypt']
    )
    
    // 导出密钥并保存
    const exportedKey = await crypto.subtle.exportKey('raw', key)
    const keyArray = new Uint8Array(exportedKey)
    const keyBase64 = btoa(String.fromCharCode(...keyArray))
    
    localStorage.setItem('qusc-db-encryption-key', keyBase64)
    keyData = keyBase64
  }
  
  // 导入密钥
  const keyBytes = new Uint8Array(
    atob(keyData).split('').map(char => char.charCodeAt(0))
  )
  
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

// 加密文本
export const encrypt = async (plaintext) => {
  if (!plaintext || typeof plaintext !== 'string') {
    return plaintext
  }
  
  try {
    const key = await getEncryptionKey()
    const iv = crypto.getRandomValues(new Uint8Array(12)) // 12字节IV用于AES-GCM
    
    const encodedPlaintext = new TextEncoder().encode(plaintext)
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encodedPlaintext
    )
    
    // 将IV和密文组合，转为base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(ciphertext), iv.length)
    
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('加密失败:', error)
    return plaintext // 加密失败时返回原文
  }
}

// 解密文本
export const decrypt = async (encryptedData) => {
  if (!encryptedData || typeof encryptedData !== 'string') {
    return encryptedData
  }
  
  // 检查是否是加密数据（简单检测：base64且长度足够）
  if (!isEncryptedData(encryptedData)) {
    return encryptedData // 不是加密数据，直接返回
  }
  
  try {
    const key = await getEncryptionKey()
    
    // 解码base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    )
    
    // 分离IV和密文
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    )
    
    return new TextDecoder().decode(decrypted)
  } catch (error) {
    console.error('解密失败:', error)
    return encryptedData // 解密失败时返回原数据
  }
}

// 检查是否是加密数据
const isEncryptedData = (data) => {
  if (typeof data !== 'string' || data.length < 32) {
    return false
  }
  
  // 简单检查：是否是有效的base64且长度合理
  try {
    const decoded = atob(data)
    return decoded.length >= 16 // 至少包含IV(12) + 少量密文
  } catch {
    return false
  }
}

// 加密连接配置中的敏感字段
export const encryptConnectionConfig = async (config) => {
  if (!config || typeof config !== 'object') {
    return config
  }
  
  const encryptedConfig = { ...config }
  const sensitiveFields = ['password', 'username'] // 加密密码和用户名
  
  for (const field of sensitiveFields) {
    if (encryptedConfig[field]) {
      encryptedConfig[field] = await encrypt(encryptedConfig[field])
      // 标记为已加密，便于识别
      encryptedConfig[`${field}_encrypted`] = true
    }
  }
  
  return encryptedConfig
}

// 解密连接配置中的敏感字段
export const decryptConnectionConfig = async (config) => {
  if (!config || typeof config !== 'object') {
    return config
  }
  
  const decryptedConfig = { ...config }
  const sensitiveFields = ['password', 'username']
  
  for (const field of sensitiveFields) {
    if (decryptedConfig[field] && decryptedConfig[`${field}_encrypted`]) {
      decryptedConfig[field] = await decrypt(decryptedConfig[field])
      // 清理加密标记
      delete decryptedConfig[`${field}_encrypted`]
    }
  }
  
  return decryptedConfig
}

// 批量加密多个连接配置
export const encryptAllConfigs = async (configs) => {
  if (!configs || typeof configs !== 'object') {
    return configs
  }
  
  const encryptedConfigs = {}
  
  for (const [name, config] of Object.entries(configs)) {
    encryptedConfigs[name] = await encryptConnectionConfig(config)
  }
  
  return encryptedConfigs
}

// 批量解密多个连接配置
export const decryptAllConfigs = async (configs) => {
  if (!configs || typeof configs !== 'object') {
    return configs
  }
  
  const decryptedConfigs = {}
  
  for (const [name, config] of Object.entries(configs)) {
    decryptedConfigs[name] = await decryptConnectionConfig(config)
  }
  
  return decryptedConfigs
}

// 重置加密密钥（危险操作，会导致所有加密数据无法解密）
export const resetEncryptionKey = () => {
  localStorage.removeItem('qusc-db-encryption-key')
  console.warn('加密密钥已重置，之前加密的数据将无法解密')
}

// 导出加密密钥（用于备份）
export const exportEncryptionKey = () => {
  const keyData = localStorage.getItem('qusc-db-encryption-key')
  if (!keyData) {
    throw new Error('未找到加密密钥')
  }
  return keyData
}

// 导入加密密钥（用于恢复）
export const importEncryptionKey = (keyData) => {
  if (!keyData || typeof keyData !== 'string') {
    throw new Error('无效的加密密钥格式')
  }
  
  try {
    // 验证密钥格式
    atob(keyData)
    localStorage.setItem('qusc-db-encryption-key', keyData)
    console.log('加密密钥已导入')
  } catch (error) {
    throw new Error('无效的加密密钥格式')
  }
}