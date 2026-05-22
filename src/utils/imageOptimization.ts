/**
 * Image Optimization Utilities for Mobile Devices
 * Provides polyfills and optimizations for better mobile image rendering
 */

/**
 * Apply object-fit polyfill for older mobile browsers
 * This ensures images maintain their aspect ratio properly on all devices
 */
export function applyObjectFitPolyfill() {
  // Check if object-fit is supported
  if ('objectFit' in document.documentElement.style) {
    return; // Native support, no polyfill needed
  }

  // Apply polyfill for browsers that don't support object-fit
  const images = document.querySelectorAll('img[style*="object-fit"], video[style*="object-fit"]');
  
  images.forEach((img) => {
    const element = img as HTMLImageElement | HTMLVideoElement;
    const objectFit = window.getComputedStyle(element).getPropertyValue('object-fit');
    
    if (objectFit === 'cover' || objectFit === 'contain') {
      const parent = element.parentElement;
      if (!parent) return;
      
      // Create wrapper if needed
      if (!parent.classList.contains('object-fit-polyfill')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'object-fit-polyfill';
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        
        parent.insertBefore(wrapper, element);
        wrapper.appendChild(element);
      }
      
      // Apply polyfill styles
      element.style.position = 'absolute';
      element.style.top = '50%';
      element.style.left = '50%';
      element.style.transform = 'translate(-50%, -50%)';
      
      if (objectFit === 'cover') {
        element.style.minWidth = '100%';
        element.style.minHeight = '100%';
        element.style.width = 'auto';
        element.style.height = 'auto';
      } else if (objectFit === 'contain') {
        element.style.maxWidth = '100%';
        element.style.maxHeight = '100%';
        element.style.width = 'auto';
        element.style.height = 'auto';
      }
    }
  });
}

/**
 * Lazy load images for better mobile performance
 * @param selector - CSS selector for images to lazy load
 */
export function lazyLoadImages(selector: string = 'img[data-src]') {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px', // Start loading 50px before image enters viewport
      threshold: 0.01,
    });

    document.querySelectorAll(selector).forEach((img) => {
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers without IntersectionObserver
    document.querySelectorAll(selector).forEach((img) => {
      const element = img as HTMLImageElement;
      const src = element.dataset.src;
      if (src) {
        element.src = src;
        element.removeAttribute('data-src');
      }
    });
  }
}

/**
 * Optimize image loading based on device pixel ratio
 * @param baseUrl - Base URL of the image
 * @param sizes - Available image sizes
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  sizes: { width: number; url: string }[] = []
): string {
  if (sizes.length === 0) return baseUrl;

  const dpr = window.devicePixelRatio || 1;
  const screenWidth = window.innerWidth * dpr;

  // Find the smallest image that's larger than the screen width
  const optimizedSize = sizes
    .sort((a, b) => a.width - b.width)
    .find((size) => size.width >= screenWidth);

  return optimizedSize?.url || sizes[sizes.length - 1].url || baseUrl;
}

/**
 * Preload critical images for better perceived performance
 * @param urls - Array of image URLs to preload
 */
export function preloadImages(urls: string[]) {
  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Check if device is on a slow connection
 * @returns true if connection is slow
 */
export function isSlowConnection(): boolean {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) return false;

  // Check for slow connection types
  const slowConnectionTypes = ['slow-2g', '2g', '3g'];
  if (slowConnectionTypes.includes(connection.effectiveType)) {
    return true;
  }

  // Check for save-data preference
  if (connection.saveData) {
    return true;
  }

  return false;
}

/**
 * Get responsive image srcset string
 * @param baseUrl - Base URL of the image
 * @param widths - Array of widths to generate srcset for
 * @returns srcset string
 */
export function generateSrcSet(baseUrl: string, widths: number[] = [320, 640, 960, 1280, 1920]): string {
  return widths
    .map((width) => `${baseUrl}?w=${width} ${width}w`)
    .join(', ');
}

/**
 * Get responsive image sizes string based on breakpoints
 * @returns sizes string
 */
export function getResponsiveSizes(): string {
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
}

/**
 * Detect if device supports WebP format
 * @returns Promise<boolean>
 */
export async function supportsWebP(): Promise<boolean> {
  if (!window.createImageBitmap) return false;

  const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  
  try {
    const blob = await fetch(webpData).then((r) => r.blob());
    return await createImageBitmap(blob).then(() => true, () => false);
  } catch {
    return false;
  }
}

/**
 * Get optimized image format based on browser support
 * @param url - Original image URL
 * @returns Optimized URL with format parameter
 */
export async function getOptimizedFormat(url: string): Promise<string> {
  const webpSupported = await supportsWebP();
  
  if (webpSupported && !url.includes('.webp')) {
    // Add format parameter if your backend supports it
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}format=webp`;
  }
  
  return url;
}

/**
 * Responsive image component helper
 * Returns props for responsive image rendering
 */
export function getResponsiveImageProps(src: string, alt: string = '') {
  return {
    src,
    alt,
    loading: 'lazy' as const,
    decoding: 'async' as const,
    srcSet: generateSrcSet(src),
    sizes: getResponsiveSizes(),
  };
}

/**
 * Handle image load errors with fallback
 * @param event - Error event
 * @param fallbackSrc - Fallback image URL
 */
export function handleImageError(
  event: Event,
  fallbackSrc: string = '/placeholder-image.jpg'
) {
  const img = event.target as HTMLImageElement;
  if (img.src !== fallbackSrc) {
    img.src = fallbackSrc;
  }
}

/**
 * Optimize video poster images for mobile
 * @param videoElement - Video element
 * @param posterUrl - Poster image URL
 */
export function optimizeVideoPoster(
  videoElement: HTMLVideoElement,
  posterUrl: string
) {
  // Only load poster on mobile to save bandwidth
  if (window.innerWidth <= 768) {
    videoElement.poster = posterUrl;
  }
  
  // Preload metadata only on mobile
  if (window.innerWidth <= 768) {
    videoElement.preload = 'metadata';
  } else {
    videoElement.preload = 'auto';
  }
}

/**
 * Calculate optimal thumbnail size based on viewport
 * @returns Optimal thumbnail dimensions
 */
export function getOptimalThumbnailSize(): { width: number; height: number } {
  const viewportWidth = window.innerWidth;
  const dpr = window.devicePixelRatio || 1;

  if (viewportWidth <= 480) {
    return { width: 160 * dpr, height: 240 * dpr };
  } else if (viewportWidth <= 768) {
    return { width: 200 * dpr, height: 300 * dpr };
  } else {
    return { width: 300 * dpr, height: 450 * dpr };
  }
}

/**
 * Debounce function for resize events
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Initialize responsive image optimizations
 * Call this once on app initialization
 */
export function initImageOptimizations() {
  // Apply object-fit polyfill
  applyObjectFitPolyfill();
  
  // Setup lazy loading
  lazyLoadImages();
  
  // Re-apply on window resize (debounced)
  const handleResize = debounce(() => {
    applyObjectFitPolyfill();
  }, 250);
  
  window.addEventListener('resize', handleResize);
  
  // Re-apply when images are dynamically added
  if ('MutationObserver' in window) {
    const observer = new MutationObserver(() => {
      applyObjectFitPolyfill();
      lazyLoadImages();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}
