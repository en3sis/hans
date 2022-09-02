export const COMMAND_COOLDOWN = new Set()

export const hasCooldown = (key: string) => COMMAND_COOLDOWN.has(key)
export const addCooldown = (key: string) => COMMAND_COOLDOWN.add(key)
export const deleteCooldown = (key: string, duration: number) =>
  setTimeout(() => COMMAND_COOLDOWN.delete(key), duration)
