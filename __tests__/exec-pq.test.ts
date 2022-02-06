import { ExecPQ, Task } from '../lib/ExecPQ'

describe('PQ为单例模式', () => {
  test('正确的静态属性instance', () => {
    const instance = ExecPQ.getInstance()
    expect(instance).toStrictEqual(ExecPQ.instance)
  })

  test('正确返回实例', () => {
    const instance = ExecPQ.getInstance()
    expect(instance).toStrictEqual(expect.any(ExecPQ))
  })

  test('返回同一实例', () => {
    expect(
      new Set([ExecPQ.getInstance(), ExecPQ.getInstance(), new ExecPQ(), ExecPQ.instance]).size
    ).toBe(1)
  })
})

describe('测试单次任务', () => {
  test('正常返回[宏任务]任务结果', async () => {
    const instance = new ExecPQ()
    const task = new Task(() => 1)
    instance.queue(task)
    expect(await task.listen()).toBe(1)
  })
  test('正常返回[微任务]任务结果', async () => {
    const instance = new ExecPQ()
    const task = new Task(() => {
      return Promise.resolve(1)
    })
    instance.queue(task)
    expect(await task.listen()).toBe(1)
  })
  test('任务中的报错需抛出', async () => {
    const instance = new ExecPQ()
    const task = new Task(() => {
      throw 'error: something broken'
    })
    instance.queue(task)
    try {
      await task.listen()
    } catch(err) {
      expect(err).toMatch('error: something broken')
    }
  })
  test('promise任务中的报错需抛出', async () => {
    const instance = new ExecPQ()
    const task = new Task(() => {
      return Promise.reject('error: something broken')
    })
    instance.queue(task)
    try {
      await task.listen()
    } catch(err) {
      expect(err).toMatch('error: something broken')
    }
  })
})

describe('PQ配置设置', () => {
  test('能成功配置', () => {
    const instance = ExecPQ.getInstance()
    instance.setConfig({
      delay: 500,
      firstDelay: 1000
    })
    expect(instance.getConfig()).toEqual({
      delay: 500,
      firstDelay: 1000
    })
  })

  test('配置生效', async () => {
    const instance = ExecPQ.getInstance()
    instance.setConfig({
      delay: 500,
      firstDelay: 1000
    })
    let task1StartTime, task2StartTime
    const task1 = new Task(() => {
      task1StartTime = new Date().getTime()
    })
    const task2 = new Task(() => {
      task2StartTime = new Date().getTime()
    })
    const startTime = new Date().getTime()
    instance.queue([task1, task2])
    await Promise.allSettled([task1.listen(), task2.listen()])

    expect(task1StartTime - startTime).toBeGreaterThanOrEqual(1000)
    expect(task2StartTime - task1StartTime).toBeGreaterThanOrEqual(500)
  })
})

describe('测试Task入参', () => {
  let task1Res
  test('handler的参数支持数组', async () => {
    const instance = new ExecPQ()
    const task1 = new Task(
      (a: number, b: number) => a + b,
      [2, 3]
    )
    instance.queue(task1)
    task1Res = await task1.listen()
    
    expect(task1Res).toBe(5)
  })
  test('handler的参数支持函数求值', async () => {
    const instance = new ExecPQ()
    const task2 = new Task(
      (a: number, b: number) => a + b,
      () => [task1Res, 1]
    )
    instance.queue(task2)
    expect(await task2.listen()).toBe(6)
  })
  test('对错误的入参进行报错', async () => {
    const instance = new ExecPQ()
    const task2 = {
      handler: (a: number, b: number) => a + b,
      args: [2, 3]
    }
    
    expect(() => { instance.queue(task2 as Task) }).toThrowError('the first argument should be the Task or task List')
  })
})

describe('测试运行次序', () => {
  test('同一权重队列运行次序正常', async () => {
    const instance = ExecPQ.getInstance()
    instance.setConfig({
      delay: 500
    })

    let results = []

    const task1 = new Task(() => 1)

    const task2 = new Task(() => 2)

    const task3 = new Task(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(3)
        }, 1100)
      })
    })

    const task4 = new Task(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(4)
        }, 0)
      })
    })

    const task5 = new Task(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(5)
        }, 0)
      })
    })
    instance.queue([
      task1,
      task2,
      task3,
      task4,
      task5
    ])

    await Promise.allSettled([
      task1.listen().then(res => { results.push(res) }),
      task2.listen().then(res => { results.push(res) }),
      task3.listen().then(res => { results.push(res) }),
      task4.listen().then(res => { results.push(res) }),
      task5.listen().then(res => { results.push(res) })
    ])

    expect(results).toEqual([1, 2, 4, 5, 3])
  }, 20 * 1000)

  test('不同权重队列运行次序正常', async () => {
    const instance = ExecPQ.getInstance()
    instance.setConfig({
      delay: 500
    })

    let results = []

    const task1 = new Task(() => 1)
    instance.queue(task1, 0)

    const task2 = new Task(() => 2)
    instance.queue(task2, 1)

    const task3 = new Task(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(3)
        }, 200)
      })
    })
    instance.queue(task3, 1)

    const task4 = new Task(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(4)
        }, 0)
      })
    })
    instance.queue(task4, 2)

    const task5 = new Task(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(5)
        }, 0)
      })
    })
    instance.queue(task5, 0)

    await Promise.allSettled([
      task1.listen().then(res => { results.push(res) }),
      task2.listen().then(res => { results.push(res) }),
      task3.listen().then(res => { results.push(res) }),
      task4.listen().then(res => { results.push(res) }),
      task5.listen().then(res => { results.push(res) })
    ])

    expect(results).toEqual([4, 2, 3, 1, 5])
  }, 20 * 1000)
})
