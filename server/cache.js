import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const defaultTTL = parseInt(process.env.CACHE_TTL_SECONDS || '1200', 10); // default 20 mins

// Initialize cache with standard TTL and check period of 2 minutes
const memoryCache = new NodeCache({
  stdTTL: defaultTTL,
  checkperiod: 120,
  useClones: false
});

export const cache = {
  get(key) {
    return memoryCache.get(key);
  },

  set(key, val, ttl = defaultTTL) {
    return memoryCache.set(key, val, ttl);
  },

  has(key) {
    return memoryCache.has(key);
  },

  del(key) {
    return memoryCache.del(key);
  },

  flush() {
    return memoryCache.flushAll();
  },

  getStats() {
    return {
      keys: memoryCache.keys().length,
      hits: memoryCache.getStats().hits,
      misses: memoryCache.getStats().misses,
      ksize: memoryCache.getStats().ksize,
      vsize: memoryCache.getStats().vsize
    };
  }
};

export default cache;
