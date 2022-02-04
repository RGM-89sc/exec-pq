import ExecPQ from '../lib/ExecPQ'

describe('ExecPQ为单例模式', () => {
  test('正确的静态属性instance', () => {
    const instance = new ExecPQ()
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

describe('测试运行次序', () => {
  test('次序正常', async () => {
    const instance = ExecPQ.getInstance()
    instance.config({
      delay: 500,
      firstDelay: null
    })

    let results = []

    results.push(await instance.push({
      handler() {
        return 1
      }
    }))

    results.push(await instance.push({
      handler() {
        return 2
      }
    }))

    results.push(await instance.push({
      handler() {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve(3)
          }, 1000)
        })
      }
    }))

    results.push(await instance.push({
      handler() {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve(4)
          }, 0)
        })
      }
    }))

    expect(results).toEqual([1, 2, 3, 4])
  })
})