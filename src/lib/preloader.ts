/**
 * AssetPreloader Utility
 * 
 * Fetches images, converts them to Blob ObjectURLs, and serves them instantly.
 * This guarantees ZERO network delay when React mounts the images.
 */

class AssetPreloader {
  private cache: Map<string, string> = new Map();
  private loadedCount: number = 0;
  private totalToLoad: number = 0;
  private onProgress?: (progress: number) => void;

  public async preloadImage(url: string): Promise<string> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      this.cache.set(url, objectUrl);
      this.loadedCount++;
      this.updateProgress();
      
      return objectUrl;
    } catch (e) {
      console.warn(`Failed to preload blob for: ${url}`, e);
      return url; // Fallback to raw URL
    }
  }

  public getCachedUrl(url: string): string {
    return this.cache.get(url) || url;
  }

  private updateProgress() {
    if (this.onProgress && this.totalToLoad > 0) {
      this.onProgress(this.loadedCount / this.totalToLoad);
    }
  }

  public setTotal(total: number) {
    this.totalToLoad = total;
  }

  public setOnProgress(cb: (progress: number) => void) {
    this.onProgress = cb;
  }
}

export const assetPreloader = new AssetPreloader();
