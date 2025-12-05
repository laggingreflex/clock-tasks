const PREFIX = '[clock-tasks]'

/**
 * Create a module-specific logger
 * Usage: const log = createLogger('TaskManager')
 */
export function createLogger(moduleName: string) {
  const modulePrefix = `${PREFIX}[${moduleName}]`

  return {
    log: (...args: any[]) => {
      console.log(modulePrefix, ...args)
    },
    info: (...args: any[]) => {
      console.info(modulePrefix, ...args)
    },
    warn: (...args: any[]) => {
      console.warn(modulePrefix, ...args)
    },
    error: (...args: any[]) => {
      console.error(modulePrefix, ...args)
    },
    debug: (...args: any[]) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(modulePrefix, ...args)
      }
    }
  }
}

/**
 * Global logger instance
 */
export const logger = {
  log: (...args: any[]) => {
    console.log(PREFIX, ...args)
  },
  info: (...args: any[]) => {
    console.info(PREFIX, ...args)
  },
  warn: (...args: any[]) => {
    console.warn(PREFIX, ...args)
  },
  error: (...args: any[]) => {
    console.error(PREFIX, ...args)
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(PREFIX, ...args)
    }
  }
}
