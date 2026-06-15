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