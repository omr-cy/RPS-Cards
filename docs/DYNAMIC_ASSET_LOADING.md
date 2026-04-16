# Dynamic Runtime Asset Encoding & Preloading Guide

This guide describes the **Dynamic Runtime Base64 Encoding** strategy used to achieve near-instantaneous (0ms) asset rendering in web applications, specifically designed for high-performance UI components like game cards and icons.

## The Problem: The "Asset Flash"
Standard web asset loading (using `src="path/to/img"`) suffers from latency even when cached:
1. **Request Latency:** The browser must still verify headers or check local cache disk.
2. **Decode Latency:** Raster images need to be decoded as they enter the viewport.
3. **Visual Glitch:** This results in a "flash" or a few hundred milliseconds of empty space before the image appears.

## The Solution: RAM-Resident Base64 Mapping
Instead of relying on paths, we fetch all critical assets at startup, convert them to **Base64 Data URIs** at runtime, and store them as raw strings in a JavaScript `Map`.

### 1. The Core Utility (`AssetPreloader`)
The preloader fetches the file as a `Blob`, then uses `FileReader` to transform it into an "In-Memory" string.

```typescript
class AssetPreloader {
  private cache: Map<string, string> = new Map();

  public async preloadImage(url: string): Promise<string> {
    if (this.cache.has(url)) return this.cache.get(url)!;

    const response = await fetch(url);
    const blob = await response.blob();
    
    const dataUri = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    
    this.cache.set(url, dataUri);
    return dataUri;
  }

  public getCachedUrl(url: string): string {
    return this.cache.get(url) || url; // Returns Base64 if ready, else original path
  }
}
```

### 2. Integration Pattern
Wrap your application entry point with a preloading sequence:

```typescript
const initApp = async () => {
    const assets = ['/icons/fire.svg', '/themes/dark/card.png'];
    // 1. Convert all assets to Base64 in parallel
    await Promise.all(assets.map(url => preloader.preloadImage(url)));
    // 2. Only then, mount the React/Vue app
    setReady(true);
};
```

## Performance & Optimization: SVG vs PNG

### SVG (Recommended)
- **Architecture:** XML-based text.
- **Base64 Impact:** Minimal file size increase.
- **Memory:** Extremely lightweight in RAM.
- **Rendering:** Resolution independent (Infinitely sharp).

### PNG/JPG
- **Architecture:** Raster/Binary data.
- **Base64 Impact:** Size increases by ~33%.
- **Memory:** Can become heavy if using high-resolution images.
- **Usage:** Use only for complex textures or digital paintings.

## Advantages in Advanced Scenarios
- **Multiplayer/WebSocket:** Ensures that when an "Update" signal arrives via socket, the UI renders the new state instantly without waiting for a sub-second network load.
- **Offline Capability:** Once preloaded into RAM, the app can lose connection and assets will never "break" or disappear.
- **Seamless Theming:** Adding new skins/themes is as simple as adding their paths to the preload array; the system handles the encoding automatically.

---
*Created for the Card Clash Engine - 2026*
