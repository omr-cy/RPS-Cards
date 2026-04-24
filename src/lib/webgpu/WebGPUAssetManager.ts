// WebGPU Assets Manager - Handles First Launch SVG to Atlas caching
export interface WebGPUSpriteMetadata {
  id: string;
  u0: number; v0: number;
  u1: number; v1: number;
  width: number; height: number;
}

export interface WebGPUAtlasData {
  imageBitmap: ImageBitmap | null;
  metadata: Record<string, WebGPUSpriteMetadata>;
}

const DB_NAME = 'WebGPUAssetsDB';
const STORE_NAME = 'AtlasCache';
const ATLAS_KEY = 'main_atlas';

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

export class WebGPUAssetManager {
  private _metadata: Record<string, WebGPUSpriteMetadata> = {};
  private _bitmap: ImageBitmap | null = null;
  private isProcessing = false;

  public async initialize(themes: any[], onProgress?: (p: number) => void): Promise<boolean> {
    const db = await openDB();
    
    // Check IndexedDB
    try {
      const cached = await new Promise<any>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(ATLAS_KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (cached && cached.blob && cached.metadata) {
        this._metadata = cached.metadata;
        this._bitmap = await createImageBitmap(cached.blob);
        return true; // Was cached (Subsequent Launch)
      }
    } catch (e) {
      console.warn("Cache read failed", e);
    }

    // First Launch: Render SVGs to Atlas
    this.isProcessing = true;
    try {
      await this.generateAtlas(themes, db, onProgress);
      return false; // First Launch occurred
    } finally {
      this.isProcessing = false;
    }
  }

  private loadSvg(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed ${url}`));
      img.src = url;
    });
  }

  private async generateAtlas(themes: any[], db: IDBDatabase, onProgress?: (p: number) => void) {
    const types = ['rock', 'paper', 'scissors'];
    const totalAssets = themes.length * types.length;
    let loadedCount = 0;

    const iconSize = 256;
    const padding = 2; // Prevent bleeding

    const cols = Math.ceil(Math.sqrt(totalAssets));
    const rows = Math.ceil(totalAssets / cols);

    const canvas = document.createElement('canvas');
    canvas.width = cols * (iconSize + padding * 2);
    canvas.height = rows * (iconSize + padding * 2);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("No 2D context");

    let cX = padding, cY = padding;

    for (const theme of themes) {
      for (const type of types) {
        const url = `${theme.path}/${type}.${theme.extension || 'svg'}`;
        try {
          const img = await this.loadSvg(url);
          ctx.drawImage(img, cX, cY, iconSize, iconSize);

          const id = `${theme.id}_${type}`;
          this._metadata[id] = {
            id,
            u0: cX / canvas.width,
            v0: cY / canvas.height,
            u1: (cX + iconSize) / canvas.width,
            v1: (cY + iconSize) / canvas.height,
            width: iconSize,
            height: iconSize
          };

          cX += iconSize + padding * 2;
          if (cX + iconSize > canvas.width) {
            cX = padding; cY += iconSize + padding * 2;
          }
        } catch (e) {
          console.warn(e);
        }

        loadedCount++;
        if (onProgress) onProgress(loadedCount / totalAssets);
      }
    }

    // Convert to Blob & Store in IndexedDB
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(), 'image/png');
    });

    this._bitmap = await createImageBitmap(blob);

    // Save to Cache
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put({ blob, metadata: this._metadata }, ATLAS_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  get metadata() { return this._metadata; }
  get bitmap() { return this._bitmap; }
}

export const wgpuAssetManager = new WebGPUAssetManager();
