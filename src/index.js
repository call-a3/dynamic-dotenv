/** eslint-env: jest */

import EventEmitter from 'events'
import { resolve } from 'path'
import { existsSync } from 'fs'

import { watch } from 'chokidar'
import { config } from 'dotenv'

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export default function dynamicDotenv(options = {}) {
  // determine the path to watch, using the same default as dotenv
  const path = options.path || resolve(process.cwd(), '.env')

  // backup the original process.env for when we need cleaning
  const originalEnvironment = clone(process.env)

  // create an EventEmitter to use as the return value
  const emitter = new EventEmitter()

  const loadDotEnv = function loadDotEnv({ skipChangeEvent = false } = {}) {
    resetProcessEnv()

    if (existsSync(path)) {
      const result = config(options)
      if (result.parsed) {
        if (!skipChangeEvent) {
          emitter.emit('change', result.parsed)
        }
      } else {
        if (result.error && emitter.listeners('error').length) {
          // only emit error when there's listeners for it.
          // otherwise will treat this as an uncaught error, crashing the process, which we don't want
          emitter.emit('error', result.error)
        }
      }
    }
  }

  const resetProcessEnv = function resetProcessEnv() {
    process.env = clone(originalEnvironment)
  }

  loadDotEnv({ skipChangeEvent: true })

  // start watching
  const sentinel = watch(path, {
    disableGlobbing: true,
    ignoreInitial: true,
    awaitWriteFinish: true,
    persistent: false,
    ignorePermissionErrors: false,
  })
    // catch events when the file gets added, changed or deleted
    .on('add', () => {
      loadDotEnv()
    })
    .on('change', () => {
      loadDotEnv()
    })
    .on('unlink', () => {
      resetProcessEnv()
      emitter.emit('change', null)
    })
    // forward errors
    .on('error', err => {
      emitter.emit('error', err)
    })
    .on('ready', () => {
      // the file might have changed between the synchronous first load (if it occurred)
      // and now that the watching is set up
      loadDotEnv({ skipChangeEvent: true })
      emitter.emit('ready')
    })

  // return the event emitter
  // augmented with a method to let consumers indicate loss of interest
  return Object.assign(emitter, {
    close() {
      emitter.removeAllListeners()
      sentinel.close()
      resetProcessEnv()
    },
  })
}
