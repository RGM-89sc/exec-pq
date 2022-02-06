type QueueWeight = number

type TimerFlag = boolean

interface Config {
  delay?: number,
  firstDelay?: number,
  log: (logContent: string) => any
}

const defaultConfig = {
  delay: 0,
  firstDelay: 0,
  log: console.log
}
const NAME = 'EXEC-PQ'

class ExecPQ {
  static instance: ExecPQ
  #queueMap = new Map<QueueWeight, Task[]>()
  #config: Config = defaultConfig
  #timer: ReturnType<typeof setTimeout> | null = null
  #flag: TimerFlag = false

  constructor(configOptions?: Partial<Config>) {
    if (!ExecPQ.instance) {
      ExecPQ.instance = this
    }
    configOptions && this.setConfig(configOptions)
    return ExecPQ.instance
  }

  static getInstance(configOptions?: Partial<Config>) {
    if (!this.instance) {
      this.instance = new ExecPQ(configOptions)
    } else {
      configOptions && this.instance.setConfig(configOptions)
    }
    return this.instance
  }

  setConfig(configOptions?: Partial<Config>) {
    if (configOptions) {
      this.#config = {
        delay: configOptions.delay || defaultConfig.delay,
        firstDelay: configOptions.firstDelay || defaultConfig.firstDelay,
        log: configOptions.log || console.log
      }
    }
    this.stop()
    this.#initInterval()
  }

  getConfig() {
    return { ...this.#config }
  }

  isAllQueueClear() {
    return ![...this.#queueMap.values()].some(queue => queue.length)
  }

  #initInterval() {
    if (this.#flag) {
      return
    }

    this.#flag = true
    if (this.isAllQueueClear()) {
      this.stop()
      return
    }

    setTimeout(() => {
      this.#dequeue()
      this.#timer = setInterval(() => {
        if (this.isAllQueueClear()) {
          this.stop()
          return
        }

        this.#dequeue()
      }, this.#config.delay)
    }, this.#config.firstDelay)
  }

  getNextOperateQueue(): Task[] | null {
    const queueWeightList: QueueWeight[] = [...this.#queueMap.keys()].sort((weight1, weight2) => weight2 - weight1)
    let targetQueue = null
    queueWeightList.some((weight: QueueWeight) => {
      const tempQueue = this.#queueMap.get(weight)
      if (tempQueue && tempQueue.length) {
        targetQueue = tempQueue
        return true
      }
      return false
    })
    return targetQueue
  }

  #dequeue() {
    if (this.isAllQueueClear()) {
      this.stop()
      return
    }

    const currentQueue = this.getNextOperateQueue()
    if (currentQueue && currentQueue.length) {
      this.#config.log(`[${NAME}]start to exec task when ${new Date().getTime()}`)
      const task = currentQueue.shift()
      task && task.exec()
    } else {
      this.stop()
    }
  }

  stop() {
    this.#timer && clearInterval(this.#timer)
    this.#timer = null
    this.#flag = false
    this.#config.log(`[${NAME}]queues are empty`)
  }

  queue(taskList: Task[] | Task, weight: QueueWeight = 0) {
    if (Array.isArray(taskList) ? taskList.some(task => !(task instanceof Task)) : !(taskList instanceof Task)) {
      throw 'the first argument should be the Task or task List'
    }

    if (!Array.isArray(taskList)) {
      taskList = [taskList]
    }

    const queue = this.#queueMap.get(weight)
    if (queue && queue.length) {
      queue.push(...taskList)
    } else {
      this.#queueMap.set(weight, taskList)
    }

    if (!this.#timer && !this.#flag) {
      this.#initInterval()
    }
  }
}



interface TaskHandler {
  (...args: any[]): any
}

type TaskHandlerArgs = any[] | ((...rest: any[]) => any[])

interface TaskEmitterHandler<TaskEmitterCarrier> {
  success: TaskEmitterCarrier extends Promise<any> ? (value?: any | PromiseLike<any>) => void : Function
  fail: TaskEmitterCarrier extends Promise<any> ? (reason?: any) => void : Function
}

interface TaskEmitter {
  success: TaskEmitterHandler<Promise<any>>['success']
  fail: TaskEmitterHandler<Promise<any>>['fail']
}

class Task {
  handler: TaskHandler
  args: TaskHandlerArgs
  #emitter: TaskEmitter | undefined

  constructor(handler: TaskHandler, args?: TaskHandlerArgs) {
    this.handler = handler
    this.args = args || []
  }

  getArgs(): any[] {
    if (typeof this.args === 'function') {
      return this.args() || []
    } else {
      return this.args
    }
  }

  exec() {
    const successHandler = this.#emitter?.success
    const failHandler = this.#emitter?.fail
    const successHandlerCallable = typeof successHandler === 'function'
    const failHandlerCallable = typeof failHandler === 'function'

    try {
      const result = this.handler(...this.getArgs())
      if (result instanceof Promise) {
        result.then(successHandlerCallable ? successHandler : () => {})
          .catch(failHandlerCallable ? failHandler : (err) => {
            throw err
          })
      } else {
        successHandlerCallable && successHandler(result)
      }
    } catch(err) {
      failHandlerCallable && failHandler(err)
    }
  }

  listen() {
    return new Promise((resolve, reject) => {
      this.#emitter = {
        success: resolve,
        fail: reject
      }
    })
  }
}



export {
  ExecPQ,
  Task
}

export default {
  ExecPQ,
  Task
}
