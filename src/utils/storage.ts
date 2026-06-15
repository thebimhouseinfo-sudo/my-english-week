import { UserStats } from '../types';

// Biến lưu trữ tạm thời dữ liệu khôi phục từ Blogger trong quá trình load app
let bloggerRestoredStats: UserStats | null = null;
let isBloggerListenerInitialized = false;

// Simple cookie get/set helpers
function setCookie(name: string, value: string, days = 365) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = 'expires=' + d.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Strict`;
  } catch (e) {
    console.error('Cookie set error:', e);
  }
}

function getCookie(name: string): string | null {
  try {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  } catch (e) {
    console.error('Cookie get error:', e);
  }
  return null;
}

// Simple IndexedDB wrapper
const DB_NAME = 'my_english_week_db';
const STORE_NAME = 'stats_store';
const KEY = 'user_stats';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIndexedDB(stats: UserStats): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(stats, KEY);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IndexedDB save failed:', e);
  }
}

async function loadFromIndexedDB(): Promise<UserStats | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(KEY);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB load failed:', e);
    return null;
  }
}

/**
 * Helper để bắn tín hiệu đồng bộ lên trang cha (Blogger)
 */
function sendProgressToBlogger(jsonStr: string) {
  try {
    window.parent.postMessage({
      type: 'SAVE_PROGRESS',
      progressData: jsonStr
    }, '*');
  } catch (e) {
    console.warn('PostMessage gửi tới Blogger thất bại:', e);
  }
}

/**
 * Saves stats to localStorage, Cookies, IndexedDB, and Blogger parent window.
 */
export async function persistStats(stats: UserStats): Promise<void> {
  const jsonStr = JSON.stringify(stats);
  
  // 1. LocalStorage
  try {
    localStorage.setItem('my_english_week_stats_v3', jsonStr);
  } catch (e) {
    console.warn('LocalStorage write failed:', e);
  }

  // 2. Cookie
  setCookie('my_english_week_stats_v3', jsonStr);

  // 3. IndexedDB
  await saveToIndexedDB(stats);

  // 4. Đồng bộ ra Blogger bên ngoài
  sendProgressToBlogger(jsonStr);
}

/**
 * Loads stats using all sources (Blogger Message, localStorage, Cookies, and IndexedDB)
 * to ensure maximum reliability and recovery on iOS Safari.
 */
export async function retrieveStats(defaultStats: UserStats): Promise<UserStats> {
  // BƯỚC KHỞI ĐẦU: Thiết lập lắng nghe phản hồi dữ liệu từ Blogger nếu chưa làm
  if (!isBloggerListenerInitialized) {
    isBloggerListenerInitialized = true;
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'RESPONSE_PROGRESS') {
        const rawData = event.data.progressData;
        if (rawData) {
          try {
            bloggerRestoredStats = JSON.parse(rawData);
            // Tiện tay khôi phục lại bộ nhớ đệm local phòng hờ
            localStorage.setItem('my_english_week_stats_v3', rawData);
            setCookie('my_english_week_stats_v3', rawData);
            if (bloggerRestoredStats) {
              saveToIndexedDB(bloggerRestoredStats).catch(console.error);
            }
          } catch (e) {
            console.error('Lỗi phân tích dữ liệu nhận từ Blogger:', e);
          }
        }
      }
    });
  }

  // PHÁT TÍN HIỆU ĐÒI DỮ LIỆU TỪ BLOGGER MẸ
  try {
    window.parent.postMessage({ type: 'REQUEST_PROGRESS' }, '*');
  } catch (e) {
    console.warn('Không thể gửi yêu cầu dữ liệu lên trang mẹ:', e);
  }

  // Chờ một khoảng thời gian siêu ngắn (khoảng 300ms) để sự kiện message kịp phản hồi từ trang mẹ
  await new Promise((resolve) => setTimeout(resolve, 300));

  // ƯU TIÊN SỐ 1: Nếu nhận được dữ liệu cứu cánh từ Blogger, lấy dùng ngay!
  if (bloggerRestoredStats) {
    return bloggerRestoredStats;
  }

  // --- CƠ CHẾ DỰ PHÒNG CŨ (Khi chạy độc lập không qua iFrame Blogger) ---
  let loadedStr: string | null = null;

  // 1. Try LocalStorage
  try {
    loadedStr = localStorage.getItem('my_english_week_stats_v3');
  } catch (e) {
    console.warn('LocalStorage read failed:', e);
  }

  // 2. Try Cookie
  if (!loadedStr) {
    loadedStr = getCookie('my_english_week_stats_v3');
  }

  if (loadedStr) {
    try {
      const parsed = JSON.parse(loadedStr);
      // Asynchronously restore IndexedDB if it was empty
      saveToIndexedDB(parsed).catch(console.error);
      return parsed;
    } catch (e) {
      console.error('Failed to parse stats string:', e);
    }
  }

  // 3. Try IndexedDB
  const idbStats = await loadFromIndexedDB();
  if (idbStats) {
    // Restore LocalStorage and Cookie
    try {
      localStorage.setItem('my_english_week_stats_v3', JSON.stringify(idbStats));
    } catch (e) {}
    setCookie('my_english_week_stats_v3', JSON.stringify(idbStats));
    return idbStats;
  }

  return defaultStats;
}

/**
 * Completely clears stats from all sources.
 */
export async function clearAllStats(): Promise<void> {
  try {
    localStorage.removeItem('my_english_week_stats_v3');
  } catch (e) {}
  
  setCookie('my_english_week_stats_v3', '', -1);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(KEY);
  } catch (e) {}

  // Xóa trắng luôn trên kho lưu trữ của Blogger mẹ
  try {
    window.parent.postMessage({
      type: 'SAVE_PROGRESS',
      progressData: ''
    }, '*');
  } catch (e) {}
}

/**
 * ====== ĐỒNG BỘ TIẾN TRÌNH QUA MÃ (CROSS-DEVICE SYNC CODE) ======
 * Cho phép phụ huynh tạo một "mã đồng bộ" chứa toàn bộ tiến trình học của bé,
 * rồi nhập mã đó trên máy/thiết bị khác để bé học tiếp không bị mất dữ liệu.
 * Mã được mã hóa Base64 từ JSON, có thêm tiền tố phiên bản và checksum đơn giản
 * để phát hiện mã bị nhập sai/lỗi.
 */

const SYNC_CODE_PREFIX = 'MEW1-'; // "My English Week" version 1

// Simple checksum: sum of char codes mod 9999, padded to 4 digits
function computeChecksum(str: string): string {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum = (sum + str.charCodeAt(i) * (i + 1)) % 9999;
  }
  return sum.toString().padStart(4, '0');
}

// UTF-8 safe base64 encode/decode (handles Vietnamese characters)
function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function base64ToUtf8(str: string): string {
  return decodeURIComponent(escape(atob(str)));
}

/**
 * Tạo mã đồng bộ từ toàn bộ tiến trình học của bé (UserStats).
 * Trả về chuỗi dạng "MEW1-<checksum>-<base64data>" để phụ huynh copy/chia sẻ.
 */
export function generateSyncCode(stats: UserStats): string {
  const jsonStr = JSON.stringify(stats);
  const encoded = utf8ToBase64(jsonStr);
  const checksum = computeChecksum(encoded);
  return `${SYNC_CODE_PREFIX}${checksum}-${encoded}`;
}

/**
 * Giải mã một mã đồng bộ trở lại UserStats.
 * Trả về null nếu mã không hợp lệ (sai định dạng hoặc checksum không khớp).
 */
export function parseSyncCode(code: string): UserStats | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith(SYNC_CODE_PREFIX)) return null;

    const rest = trimmed.slice(SYNC_CODE_PREFIX.length);
    const separatorIndex = rest.indexOf('-');
    if (separatorIndex === -1) return null;

    const checksum = rest.slice(0, separatorIndex);
    const encoded = rest.slice(separatorIndex + 1);

    if (computeChecksum(encoded) !== checksum) return null;

    const jsonStr = base64ToUtf8(encoded);
    const parsed = JSON.parse(jsonStr);

    // Basic shape validation
    if (typeof parsed !== 'object' || parsed === null) return null;

    return parsed as UserStats;
  } catch (e) {
    console.error('Lỗi giải mã sync code:', e);
    return null;
  }
}

/**
 * Áp dụng tiến trình từ mã đồng bộ: lưu vào tất cả các nguồn lưu trữ (localStorage,
 * cookie, IndexedDB, Blogger) giống persistStats, để máy mới tiếp tục học đúng tiến trình.
 */
export async function applySyncCode(code: string): Promise<UserStats | null> {
  const stats = parseSyncCode(code);
  if (!stats) return null;
  await persistStats(stats);
  return stats;
}