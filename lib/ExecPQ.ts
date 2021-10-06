import 'core-js/features/set'
import 'core-js/features/promise'

interface Options {
  delay?: number,
  firstDelay?: number | null
}

interface QueueItemOptions {
  weight?: number
  offsetDelay?: number | null
}

interface QueueItem {
  handler: (...args: any[]) => any
  args: QueueItemOptions[]
  options: QueueItemOptions
  resolve: (value: unknown) => void
  reject: (reason?: any) => void
}

type TimerFlag = boolean

const defaultOptions: Options = {
  delay: 500,  // 从第二次开始出队开始，每次出队操作的时间间隔
  firstDelay: null,  // 第一次出队的延时，当值为null时不会进入下一轮事件循环
}

const queueItemDefaultOptions: QueueItemOptions = {
  weight: 0,  // 权重，在整理队列后值越大越先出队
  offsetDelay: null  // 额外的延时，当值为null时不会进入下一轮事件循环
}


export default class ExecPQ {
  static instance: ExecPQ
  queue: QueueItem[] = []
  options: Options = ({ ...defaultOptions })
  timer: number | null = null
  flag: TimerFlag = false
  weightSet = new Set<number>()

  constructor() {
    this.queue = []
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ExecPQ()
      this.instance.initInterval()
    }
    return this.instance
  }

  config(options: Options = {}) {
    this.options = Object.assign({}, defaultOptions, options)
  }

  initInterval() {
    this.flag = true
    if (!this.queue.length) {
      this.resetTimerAndFlag()
      return
    }

    if (typeof this.options.firstDelay === 'number') {
      setTimeout(() => {
        this.beforeDequeue()
      }, this.options.firstDelay)
    } else {
      this.beforeDequeue()
    }
  }

  beforeDequeue() {
    console.log('[ExecPQ] out queue start ' + new Date().getTime())
    this.dequeue()

    this.timer = setInterval(() => {
      if (!this.queue.length) {
        this.resetTimerAndFlag()
        console.log('[ExecPQ] out queue end ' + new Date().getTime())
        return
      }

      this.dequeue()
    }, this.options.delay)
  }

  dequeue() {
    if (!this.queue.length) {
      this.resetTimerAndFlag()
      return
    }
    
    const item = this.queue.shift() as QueueItem
    if (typeof item.options.offsetDelay === 'number') {
      setTimeout(() => {
        this.exec(item)
      }, item.options.offsetDelay)
    } else {
      this.exec(item)
    }
  }

  resetTimerAndFlag() {
    this.timer && clearInterval(this.timer)
    this.timer = null
    this.flag = false
  }

  exec(item: QueueItem) {
    if (item.handler instanceof Promise) {
      item.handler(...item.args)
        .then(item.resolve)
        .catch(item.reject)
    } else {
      try {
        item.resolve(item.handler(...item.args))
      } catch (e) {
        item.reject(e)
      }
    }
  }

  push({ handler, args = [], options = {} }: QueueItem) {
    options = Object.assign({}, queueItemDefaultOptions, options)

    return new Promise((resolve, reject) => {
      this.queue.push({
        handler: handler,
        args: args,
        options: options,
        resolve: resolve,
        reject: reject
      })

      if (!this.weightSet.has(options.weight || 0)) {
        this.weightSet.add(options.weight || 0)
        this.sort()
      }

      if (!this.timer && !this.flag) {
        this.initInterval()
      }
    })
  }

  sort() {
    this.queue.sort((item1, item2) => {
      const [weight1 = 0, weight2 = 0] = [item1.options.weight, item2.options.weight]
      return weight2 - weight1
    })
  }
}