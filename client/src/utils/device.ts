/**
 * Utility functions for mobile device detection and performance profiling.
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileAgent = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSmallScreen = window.innerWidth <= 1024 || (window.innerWidth <= 1180 && hasTouch);
  return hasTouch && (isMobileAgent || isSmallScreen);
}

export function getRecommendedPixelRatio(cinematic: boolean): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const isMobile = isMobileDevice();

  if (isMobile) {
    // In mobile GPUs (Mali, Adreno, Apple A-series), 1.0 - 1.15 prevents thermal throttling
    return cinematic ? Math.min(dpr, 1.2) : Math.min(dpr, 1.0);
  }

  // Desktop
  return cinematic ? Math.min(dpr, 1.5) : Math.min(dpr, 1.25);
}
