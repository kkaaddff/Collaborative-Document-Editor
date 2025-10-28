import CryptoJS from 'crypto-js';

/**
 * 使用 AES 加密文本
 * @param text 要加密的文本
 * @param key 加密密钥（文档代码）
 * @returns 加密后的文本
 */
export function encryptText(text: string, key: string): string {
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
 * @param encryptedText 加密的文本
 * @param key 解密密钥（文档代码）
 * @returns 解密后的文本
 */
export function decryptText(encryptedText: string, key: string): string {
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
 * @param obj 要加密的对象
 * @param key 加密密钥
 * @returns 加密后的字符串
 */
export function encryptObject(obj: any, key: string): string {
  const jsonString = JSON.stringify(obj);
  return encryptText(jsonString, key);
}

/**
 * 解密对象（JSON）
 * @param encryptedText 加密的文本
 * @param key 解密密钥
 * @returns 解密后的对象
 */
export function decryptObject<T = any>(encryptedText: string, key: string): T {
  const decrypted = decryptText(encryptedText, key);
  return JSON.parse(decrypted);
}

