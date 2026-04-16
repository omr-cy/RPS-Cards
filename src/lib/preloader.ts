/**
 * AssetPreloader Utility
 * 
 * Fetches images and converts them to Base64 Data URIs at runtime.
 * This ensures "In-Memory" instant access similar to hardcoded strings,
 * but allows for dynamic discovery of new themes.
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
      
      // Convert Blob to Base64 String (Data URI)
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      this.cache.set(url, dataUri);
      this.loadedCount++;
      this.updateProgress();
      
      return dataUri;
    } catch (e) {
      console.warn(`Failed to dynamically encode asset: ${url}`, e);
      return url; // Fallback to raw URL if encoding fails
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
    this.loadedCount = 0;
  }

  public setOnProgress(cb: (progress: number) => void) {
    this.onProgress = cb;
  }
}

export const assetPreloader = new AssetPreloader();
