import NodeCache from 'node-cache'

const CACHE = new NodeCache()
/**
 * @param key String of the cached
 * @param value  Value to be cached
 * @param ttl time to live in minutes
 */
export const setToCache = (key: string, value: string | object, ttl = 3) => {
  if (typeof value === 'string') {
    CACHE.set(key, value, ttl * 60)
  }

  return CACHE.set(key, JSON.stringify(value), ttl * 60)
}

// Creates a function for getting an item from the cache
export const getFromCache = (key: string): never | null => {
  const value = CACHE.get(key)
  return value ? JSON.parse(value as string) : null
}
