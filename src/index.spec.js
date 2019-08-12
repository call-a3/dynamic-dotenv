import {
  writeFileSync,
  unlinkSync,
  mkdtempSync,
  rmdirSync,
  existsSync,
} from 'fs'
import { resolve, join } from 'path'
import { tmpdir } from 'os'
import dynamicDotenv from './index'

const originalProcessEnv = Object.freeze(
  JSON.parse(JSON.stringify(process.env)),
)

describe('dynamic-dotenv', () => {
  let baseDotenvPath
  beforeAll(() => {
    baseDotenvPath = mkdtempSync(join(tmpdir(), 'dynamic-dotenv-'))
  })

  afterAll(() => {
    rmdirSync(baseDotenvPath)
  })

  let dotenvPath
  let envFileCounter = 0
  beforeEach(() => {
    dotenvPath = resolve(baseDotenvPath, `.env-${envFileCounter++}`)
  })

  describe('when no options are provided', () => {
    let originalProcessCWD
    beforeAll(() => {
      originalProcessCWD = process.cwd
    })
    beforeEach(() => {
      process.cwd = jest.fn(() => baseDotenvPath)
    })
    afterEach(() => {
      process.cwd.mockClear()
    })
    afterAll(() => {
      process.cwd = originalProcessCWD
    })
    it('should use the default path when not overriden', () => {
      const dd = dynamicDotenv()
      expect(process.cwd).toHaveBeenCalled()
      dd.close()
    })
  })

  it('should not fail when the dotenv file is not initially there', () => {
    const dd = dynamicDotenv({ path: dotenvPath })
    dd.close()
  })

  it('should detect it when the dotenv file is added later', done => {
    const dd = dynamicDotenv({ path: dotenvPath })
    dd.on('change', () => {
      expect(process.env).toHaveProperty('DYNAMIC_DOTENV_VALUE', 'added')
      dd.close()
      done()
    }).on('ready', () => {
      setTimeout(() => {
        writeFileSync(dotenvPath, 'DYNAMIC_DOTENV_VALUE=added')
      }, 100)
    })
  })

  it('should emit an error when the dotenv file is not readable initially', done => {
    writeFileSync(dotenvPath, '', { mode: 0o111 })
    const dd = dynamicDotenv({ path: dotenvPath })
    dd.on('error', err => {
      expect(err).toBeInstanceOf(Error)
      dd.close()
      done()
    })
  })

  describe('when a dotenv file is present', () => {
    beforeEach(() => {
      writeFileSync(
        dotenvPath,
        `
        DYNAMIC_DOTENV_TO_BE_REWRITTEN=initial
        DYNAMIC_DOTENV_TO_BE_REMOVED=should_be_gone_after_rewrite
        `,
      )
    })

    afterEach(() => {
      if (existsSync(dotenvPath)) {
        unlinkSync(dotenvPath)
      }
      process.env = JSON.parse(JSON.stringify(originalProcessEnv))
    })

    it('should resolve with an EventEmitter', () => {
      const dd = dynamicDotenv({ path: dotenvPath })
      expect(dd).toBeInstanceOf(require('events'))
      dd.close()
    })

    it('should initially load the dotenv', () => {
      const dd = dynamicDotenv({ path: dotenvPath })
      dd.on('change', () => expect(true).toBe(false))
      expect(process.env).toHaveProperty(
        'DYNAMIC_DOTENV_TO_BE_REWRITTEN',
        'initial',
      )
      expect(process.env).toHaveProperty(
        'DYNAMIC_DOTENV_TO_BE_REMOVED',
        'should_be_gone_after_rewrite',
      )
      dd.close()
    })

    it('should not emit a change event the first time it loads', done => {
      let emittedChangeEvent = false
      const dd = dynamicDotenv({ path: dotenvPath })
      dd.on('change', () => {
        emittedChangeEvent = true
      })
      setTimeout(() => {
        dd.close()
        expect(emittedChangeEvent).toBe(false)
        done()
      }, 100)
    })

    it('should detect when a value gets added', done => {
      const dd = dynamicDotenv({ path: dotenvPath })
      dd.on('change', () => {
        expect(process.env).toHaveProperty('DYNAMIC_DOTENV_TO_BE_ADDED', 'new')
        dd.close()
        done()
      }).on('ready', () => {
        writeFileSync(
          dotenvPath,
          `
          DYNAMIC_DOTENV_TO_BE_REWRITTEN=rewritten
          DYNAMIC_DOTENV_TO_BE_REMOVED=should_be_gone_after_rewrite
          DYNAMIC_DOTENV_TO_BE_ADDED=new
          `,
        )
      })
    })

    it('should detect when a value gets changed', done => {
      const dd = dynamicDotenv({ path: dotenvPath })
      dd.on('change', () => {
        expect(process.env).toHaveProperty(
          'DYNAMIC_DOTENV_TO_BE_REWRITTEN',
          'rewritten',
        )
        dd.close()
        done()
      }).on('ready', () => {
        writeFileSync(
          dotenvPath,
          `
            DYNAMIC_DOTENV_TO_BE_REWRITTEN=rewritten
            DYNAMIC_DOTENV_TO_BE_REMOVED=should_be_gone_after_rewrite
            `,
        )
      })
    })

    it('should detect when a value gets removed', done => {
      const dd = dynamicDotenv({ path: dotenvPath })
      dd.on('change', () => {
        expect(process.env).not.toHaveProperty('DYNAMIC_DOTENV_TO_BE_REMOVED')
        dd.close()
        done()
      }).on('ready', () => {
        writeFileSync(
          dotenvPath,
          `
          DYNAMIC_DOTENV_TO_BE_REWRITTEN=rewritten
          `,
        )
      })
    })

    it('should revert changes made when the dotenv file gets removed', done => {
      const dd = dynamicDotenv({ path: dotenvPath })
      dd.on('change', parsed => {
        expect(parsed).toBe(null)
        expect(process.env).toEqual(originalProcessEnv)
        dd.close()
        done()
      }).on('ready', () => {
        expect(process.env).not.toEqual(originalProcessEnv)
        unlinkSync(dotenvPath)
      })
    })

    it('should revert changes made when the dynamic watcher is closed', () => {
      expect(process.env).toEqual(originalProcessEnv)
      const dd = dynamicDotenv({ path: dotenvPath })
      expect(process.env).not.toEqual(originalProcessEnv)
      dd.close()
      expect(process.env).toEqual(originalProcessEnv)
    })

    it('should emit an error when the dotenv file is no longer readable', done => {
      const dd = dynamicDotenv({ path: dotenvPath })
      dd.on('error', err => {
        expect(err).toHaveProperty('code', 'EACCES')
        dd.close()
        done()
      }).on('ready', () => {
        unlinkSync(dotenvPath)
        writeFileSync(dotenvPath, '', { mode: 0o111 })
      })
    })
  })
})
