# exec-pq

一个能将队列中的任务按照PQ调度的方式执行的工具

## install

```bash
npm i exec-pq
```

## how to use

ExecPQ被设计为单例模式，首先需要获取实例

```javascript
import { ExecPQ } from 'exec-pq'

const execPQ = ExecPQ.getInstance()  // or new ExecPQ
```

创建任务

```javascript
import { ExecPQ, Task } from 'exec-pq'

const execPQ = ExecPQ.getInstance()  // or new ExecPQ

const task1 = new Task(() => {
  return 1 + 2
})

const task2 = new Task(
  (a, b) => a + b,
  [1, 2]
)

const task3 = new Task(
  (a, b) => a + b,
  () => [1, 2]
)
```

在执行任务前可以对任务之间的执行间隔、第一个任务的延时进行配置

```javascript
execPQ.setConfig({
  delay: 500,  // interval between two tasks, the default value is 0
  firstDelay: 1000  // delay of the first task, the default value is 0
})
```

创建任务队列（默认队列优先级为0，优先级的值越大越优先）

```javascript
execPQ.queue([
  task1,
  task2,
  task3
])
```

创建任务队列后会自动开始执行队列中的任务，如果有更优先的任务，可以在创建队列时指定队列优先级，在执行下一个任务时会自动挑选最高优先的队列执行其中任务

```javascript
execPQ.queue([
  task1,
  task2,
  task3
], 10)
```

如果需要获取任务执行后的返回值，可以使用listen方法，获得一个promise

```javascript
// const task1 = new Task(...)
task1.listen().then(res => {
  console.log(res)
}).catch(e => {
  console.log(e)
})
```

ExecPQ的第一次执行任务会在下一轮事件循环中开始，所以可以在此之前监听任务的返回值而无需担心在监听时任务已执行完毕

```javascript
execPQ.queue([
  task1,
  task2,
  task3
])

// 可以在queue方法执行后再监听任务的返回值
task1.listen().then(res => {
  console.log(res)
}).catch(e => {
  console.log(e)
})
```

## API

### Task constructor and methods

#### new Task(handler: (...args: any[]) => any, args?: any[] | ((...rest: any[]) => any[]))

创建一个任务，第一个参数是需要执行的函数，第二个参数是给该函数的入参，示例：

```javascript
const task = new Task(
  (a, b) => a + b,
  [1, 2]
)
```

如果当前不确定入参，也可以传一个函数，该函数需返回一个数组作为最终入参，该函数会在执行任务前执行求得入参值：

```javascript
const task = new Task(
  (a, b) => a + b,
  () => [1, 2]
)
```

#### task.getArgs() :any[]

返回任务的最终入参，如果在new Task()时第二个参数传入的是函数则会执行该函数进行求值

#### task.listen(): Promise\<any\>

监听任务函数执行的结果，如果任务本身返回一个promise则会返回该promise，否则会自动创建一个promise

### ExecPQ constructor and methods

#### new ExecPQ(configOptions?: { delay?: number, firstDelay?: number, log?: (logContent: string) => any })

创建ExecPQ实例，可传入配置项（详见下文）

#### static getInstance(configOptions?: { delay?: number, firstDelay?: number, log?: (logContent: string) => any }): ExecPQ

创建ExecPQ实例，与直接使用`new`操作符创建实例的表现一致，可传入配置项（详见下文）

#### execPQ.setConfig(configOptions?: { delay?: number, firstDelay?: number, log?: (logContent: string) => any }): void

配置项设置

* delay 任务与任务之间的执行间隔，默认值为0
* firstDelay 第一个任务执行的延时，默认值为0
* log 日志打印的方法，默认为`console.log`

#### execPQ.getConfig(): { delay: number, firstDelay: number, log: (logContent: string) => any }

获取当前配置

#### execPQ.queue(taskList: Task[] | Task, weight: number = 0)

创建一个队列（如果有相同优先级队列中的任务还未执行的，则会并入到已有队列的末尾），第一个参数是以任务为项的数组，第二个参数选填，为队列的优先级，默认值为0

#### execPQ.isAllQueueClear(): boolean

返回一个布尔值表示是否已经清空所有队列（所有任务都已执行）

#### execPQ.getNextOperateQueue(): Task[] | null

返回当前要执行的下一个任务所在队列

#### execPQ.stop(): void

暂停，剩余任务将不会执行
