const PREFIX = '[clock-tasks]'

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
    console.debug(PREFIX, ...args)
  }
}
