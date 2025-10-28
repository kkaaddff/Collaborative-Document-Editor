import CryptoJS from 'crypto-js';

/**
 * 使用 AES 加密文本
 */
export function encryptText(text, key) {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, key);
    return encrypted.toString();
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('加密失败');
  }
}

/**
 * 使用 AES 解密文本
 */
export function decryptText(encryptedText, key) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('解密失败');
  }
}

/**
 * 加密对象（JSON）
 */
export function encryptObject(obj, key) {
  const jsonString = JSON.stringify(obj);
  return encryptText(jsonString, key);
}

/**
 * 解密对象（JSON）
 */
export function decryptObject(encryptedText, key) {
  const decrypted = decryptText(encryptedText, key);
  return JSON.parse(decrypted);
}

