/**
 * AssetPreloader Utility
 * 
 * Fetches images and converts them to Base64 Data URIs at runtime.
 * This ensures "In-Memory" instant access similar to hardcoded strings.
 * Now combined with IndexedDB for First Launch Optimization.
 */

const DB_NAME = 'CardClashAssets';
const STORE_NAME = 'Base64Cache';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getFromDB = async (key: string): Promise<string | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const saveToDB = async (key: string, value: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

class AssetPreloader {
  private memCache: Map<string, string> = new Map();
  private loadedCount: number = 0;
  private totalToLoad: number = 0;
  private onProgress?: (progress: number) => void;

  public async preloadImage(url: string, forceNetwork = false): Promise<string> {
    if (this.memCache.has(url)) return this.memCache.get(url)!;
    
    // Check IndexedDB
    if (!forceNetwork) {
      try {
        const cached = await getFromDB(url);
        if (cached) {
          this.memCache.set(url, cached);
          this.updateProgress();
          return cached;
        }
      } catch (e) {
        console.warn('IDB Read error', e);
      }
    }
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      this.memCache.set(url, dataUri);
      
      // Save to IDB for subsequent launches
      saveToDB(url, dataUri).catch(e => console.warn('IDB Write err', e));
      
      this.loadedCount++;
      this.updateProgress();
      
      return dataUri;
    } catch (e) {
      console.warn(`Failed to Base64 preload asset: ${url}`, e);
      this.loadedCount++; // Count even on fail so we don't block
      this.updateProgress();
      return url; 
    }
  }

  public getCachedUrl(url: string): string {
    return this.memCache.get(url) || url;
  }

  private updateProgress() {
    if (this.onProgress && this.totalToLoad > 0) {
      this.onProgress(Math.min(this.loadedCount / this.totalToLoad, 1));
    }
  }

  public setTotal(total: number) {
    this.totalToLoad = total;
    this.loadedCount = 0;
  }

  public setOnProgress(cb: (progress: number) => void) {
    this.onProgress = cb;
  }
}

export const assetPreloader = new AssetPreloader();
