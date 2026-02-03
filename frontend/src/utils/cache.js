// Enhanced in-memory cache with TTL and size management

class Cache {
  constructor() {
    this.cache = new Map();
    this.sizeLimit = 100; // Limit cache size to prevent memory issues
  }

  set(key, value, ttl = 60000) { // Default TTL is 60 seconds
    // Check if cache is at size limit
    if (this.cache.size >= this.sizeLimit) {
      // Remove oldest entry (first in map iteration)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiration = Date.now() + ttl;
    this.cache.set(key, { value, expiration, timestamp: Date.now() });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiration) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiration) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Enhanced cleanup that removes expired items and limits size
  cleanup() {
    for (const [key, item] of this.cache.entries()) {
      if (Date.now() > item.expiration) {
        this.cache.delete(key);
      }
    }

    // If cache is still too large, remove oldest entries
    if (this.cache.size > this.sizeLimit) {
      const entries = Array.from(this.cache.entries());
      // Sort by timestamp to remove oldest entries first
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const excessCount = this.cache.size - this.sizeLimit;
      for (let i = 0; i < excessCount; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  // Run cleanup every 5 minutes
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, 300000); // 5 minutes
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.sizeLimit,
      entries: Array.from(this.cache.keys())
    };
  }

  // Get cache size
  getSize() {
    return this.cache.size;
  }
}

// Create a global cache instance
const globalCache = new Cache();
globalCache.startCleanupInterval();

export default globalCache;