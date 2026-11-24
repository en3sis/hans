import pino from 'pino'
import { format } from 'util'

const isDev = process.env.ISDEV === 'true' || process.env.NODE_ENV !== 'production'

const pinoInstance = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
})

const formatArgs = (args: unknown[]): string => format(...(args as [unknown, ...unknown[]]))

export const log = {
  info: (...args: unknown[]) => pinoInstance.info(formatArgs(args)),
  error: (...args: unknown[]) => pinoInstance.error(formatArgs(args)),
  warn: (...args: unknown[]) => pinoInstance.warn(formatArgs(args)),
  debug: (...args: unknown[]) => pinoInstance.debug(formatArgs(args)),
}
