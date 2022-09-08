import NodeCache from 'node-cache'

const CACHE = new NodeCache()
// Creates a function for adding an item to the cache that has a ttl of 3 minutes
export const setToCache = (key: string, value: string | object, ttl = 180) => {
  if (typeof value === 'string') {
    CACHE.set(key, value, ttl)
  }

  CACHE.set(key, JSON.stringify(value), ttl)
}

// Creates a function for getting an item from the cache
export const getFromCache = (key: string): never | null => {
  const value = CACHE.get(key)
  return value ? JSON.parse(value as string) : null
}
