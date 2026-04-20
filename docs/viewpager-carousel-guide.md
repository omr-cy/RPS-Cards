# Swipeable Carousel / ViewPager2 Implementation Guide

## Problem Statement
When implementing a swipeable horizontal page system (like `ViewPager2` in Android or `TabView` in iOS) in React, developers often encounter a severe "infinite scroll loop" bug or jittering. 

This usually happens when:
1. Native scrolling (`onScroll`) updates React `state`.
2. React `state` changes trigger a programmatic scroll (`scrollIntoView`).
3. The programmatic scroll triggers another `onScroll` event before it finishes.
4. The loop causes the UI to freeze, crash, or vibrate wildly.

## The Solution: Tolerant Syncing with CSS Scroll Snapping

This guide details the exact implementation used to build a crash-free, buttery-smooth ViewPager that relies on native CSS scrolling (zero-JS animations) while staying perfectly synced with React Router or Local State.

### 1. The CSS (Native Scroll Snapping)

We rely purely on CSS for the 60fps/120fps scrolling physics.

```tsx
<div 
  className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory"
  // Hide scrollbars cross-browser
  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
>
  {children.map((child, idx) => (
    <div key={idx} className="w-full h-full shrink-0 snap-center relative overflow-hidden">
      {/* Vertically scrolling page content goes here */}
      {child}
    </div>
  ))}
</div>
```

**Key CSS Properties:**
* `snap-x snap-mandatory`: Forces the browser to snap strictly to children.
* `shrink-0`: Prevents flex items from compressing.
* `w-full h-full snap-center`: Ensures each child fully occupies the viewport and aligns accurately in the center.
* `overflow-x-auto overflow-y-hidden`: Only allows horizontal swipe. Vertical scrolling should be delegated to the **child** contents.

### 2. The React Component (Decoupling the Loop)

The most critical part is decoupling the two-way sync between State and Scroll Position.

```tsx
import React, { useEffect, useRef } from 'react';

export const DashboardViewPager = ({ appState, setAppState, children }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<number | null>(null);

  // Sync React State -> Scroll Position (Programmatic Scroll)
  useEffect(() => {
    // 1. Map state to index
    const idx = appState === 'store' ? 0 : appState === 'menu' ? 1 : 2;
    const container = scrollRef.current;
    if (!container || !container.children[idx]) return;

    const child = container.children[idx] as HTMLElement;
    
    // 2. Calculate centers
    const containerRect = container.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();
    
    const containerCenter = containerRect.left + containerRect.width / 2;
    const childCenter = childRect.left + childRect.width / 2;

    // 3. The "Tolerance Lock" - crucial step!
    // Prevent React from scrolling if the CSS has already snapped the element reasonably close (within 20px).
    if (Math.abs(childCenter - containerCenter) > 20) {
      child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [appState]);

  // Sync Scroll Position -> React State (Native Swiping)
  const handleScroll = (e) => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    
    const container = e.currentTarget;

    // 1. Debounce scroll tracking (wait till snapping finishes)
    scrollTimeout.current = window.setTimeout(() => {
      let closestIdx = 1;
      let minDistance = Infinity;
      
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      
      // 2. Find the child closest to the center
      Array.from(container.children).forEach((child, idx) => {
        const rect = (child as HTMLElement).getBoundingClientRect();
        const childCenter = rect.left + rect.width / 2;
        const distance = Math.abs(childCenter - containerCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIdx = idx;
        }
      });

      // 3. Map index back to state
      const newState = closestIdx === 0 ? 'store' : closestIdx === 1 ? 'menu' : 'profile';
      
      // Update only if strictly necessary
      if (newState !== appState) {
        setAppState(newState);
      }
    }, 150); // Important: 150ms debounce
  };

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className="fixed inset-0 w-full h-full flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
    >
      {/* Render Pages */}
    </div>
  );
};
```

## Why this Architecture Prevents Crashes

1. **The Tolerance Check**: When you click a button to change `appState`, the React `useEffect` calls `scrollIntoView`. This creates a native scroll animation. As the target page hits the center, `handleScroll` debounces and evaluates. It correctly identifies the page, sees `newState === appState`, and skips further updates.
2. **Smooth Swiping Avoids Conflict**: If the user swipes naturally, `appState` doesn't change *until the swipe settles* (thanks to the 150ms debounce). When `setAppState` is finally fired, the `useEffect` fires, but sees `< 20px` difference in center alignment, so it **bypasses calling `scrollIntoView`**.
3. No infinite loop! The logic guarantees zero recursion.
4. Minimal JavaScript parsing: Utilizing strictly CSS (`snap-x`) means that even on low-end mobile devices, the pan gesture relies entirely on GPU compositor threads.

## Implementation Prerequisites
When wrapping views inside the pager, ensure those individual views correctly set custom independent vertical overflow:
```css
/* Inside the child */
.child-page {
  width: 100%;
  height: 100%;
  overflow-y: auto; 
}
```
If vertical overflow is placed on the parent `DashboardViewPager`, touch gestures (swiping up/down to read a page) may unintentionally glitch the horizontal scroll axis.
