---
title: Builtin
icon: placeholder
article: true
order: 9
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-06

description: 内置类型，内置对象，还有一个代码雨的demo
footer: Always coding, always learning
---

<!-- more -->

## ECMAScript 内置对象

TypeScript 为所有 ECMAScript 标准对象提供了类型定义，这些类型通常对应于通过 `new` 操作符创建的对象：

```typescript
// ECMAScript内置
// 类型为对应new出来的类型
let num: Number = new Number(1)
let date: Date = new Date()
let reg: RegExp = new RegExp(/.*?/)
let error: Error = new Error('error')
let xhr: XMLHttpRequest = new XMLHttpRequest()

console.log(num.valueOf())    // 1
console.log(date.getTime())   // 当前时间戳
console.log(reg.test('test')) // true
console.log(error.message)    // 'error'
```

需要注意的是，基本类型和包装对象类型是不同的：

```typescript
// 基本类型 vs 包装对象类型
let primitiveNum: number = 1        // 基本类型
let objectNum: Number = new Number(1) // 包装对象类型

// 通常我们使用基本类型
let str: string = 'hello'
let bool: boolean = true
let n: number = 42
```

## DOM 相关类型

TypeScript 为所有 DOM 元素提供了详细的类型定义。元素类型通常遵循 `HTML[元素名称]Element` 的命名规则：

```typescript
// DOM相关
// 类型为HTML(元素名称)Element, 但是若是section这种无特殊标签的类型实际上会修正为HTMLElement
// 下面有两个例子，一个是非空断言，一个是类型守卫
let element1: HTMLDivElement = document.querySelector('div')!
let element2 = document.querySelector('section')
if (element2) {
  console.log(element2.tagName) // 'SECTION'
}

// 查询多个元素
let elements1: NodeList = document.querySelectorAll('div')
let elements2: NodeListOf<HTMLDivElement | HTMLCanvasElement> = document.querySelectorAll('div,canvas')

// 不同元素类型的示例
let input: HTMLInputElement = document.createElement('input')
let button: HTMLButtonElement = document.createElement('button')
let img: HTMLImageElement = document.createElement('img')

input.value = 'hello'
button.onclick = () => console.log('clicked')
img.src = 'image.jpg'
```

### 常用 DOM 元素类型

以下是一些常用的 DOM 元素类型：

```typescript
// 常用的DOM元素类型
let form: HTMLFormElement = document.querySelector('form')!
let anchor: HTMLAnchorElement = document.querySelector('a')!
let table: HTMLTableElement = document.querySelector('table')!
let canvas: HTMLCanvasElement = document.querySelector('canvas')!
let video: HTMLVideoElement = document.querySelector('video')!

// 事件相关类型
let clickEvent: MouseEvent = new MouseEvent('click')
let keyEvent: KeyboardEvent = new KeyboardEvent('keydown')
let customEvent: CustomEvent = new CustomEvent('custom')

// 事件处理函数类型
const handleClick = (event: MouseEvent): void => {
  console.log(event.clientX, event.clientY)
}

const handleKeyDown = (event: KeyboardEvent): void => {
  console.log(event.key, event.code)
}
```

## BOM 相关类型

浏览器对象模型（BOM）相关的类型定义：

```typescript
// BOM：浏览器或者Window内容
let local: Storage = localStorage
let lo: Location = location
let promise: Promise<string> = new Promise((resolve, reject) => {
  resolve('successful')
  reject('failed')
})

promise.then(res => {
  console.log(res) // 'successful'
})

let cookie: string = document.cookie

// 其他BOM对象
let hist: History = history
let nav: Navigator = navigator
let screen: Screen = window.screen
let console: Console = window.console
```

小彩蛋：这里展示一个[代码雨](http://39.105.13.0:50000/coderain.html)的demo，有兴趣可以自己实现一下。


## 实际应用示例

结合内置类型的实际应用场景：

```typescript
// 表单处理示例
function handleFormSubmit(event: Event): void {
  event.preventDefault()

  const form = event.target as HTMLFormElement
  const formData = new FormData(form)

  // 类型安全的表单数据处理
  const username = formData.get('username') as string
  const email = formData.get('email') as string

  console.log({ username, email })
}

// 本地存储工具函数
function setLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

function getLocalStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.error('Failed to read from localStorage:', error)
    return null
  }
}

// 使用示例
setLocalStorage('user', { name: 'chulan', age: 20 })
const user = getLocalStorage<{ name: string; age: number }>('user')
```

## 小结

TypeScript 的内置类型系统非常完善，主要包含：

1. **ECMAScript 内置对象**：Number、Date、RegExp、Error 等标准对象类型
2. **DOM 类型**：HTMLElement 及其子类型，提供完整的 DOM 操作类型支持
3. **BOM 类型**：Window、Location、Storage 等浏览器对象类型

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/09-builtin/index.ts)。
