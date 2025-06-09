---
title: Never
icon: placeholder
article: true
order: 14
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-07

description: never类型的相关介绍和应用场景
footer: Always coding, always learning
---

<!-- more -->

## never 初见

never 类型通常出现在以下几种情况：

```typescript
// never是永远都不会发生值的类型，如下面这个
type A = string & number

// 抛出异常的函数
const hx = (): never => {
  throw new Error('huaixi')
}

// 无限循环的函数
function infiniteLoop(): never {
  while (true) {
    console.log('这个函数永远不会返回')
  }
}
```

## 穷尽性检查

never 类型最重要的应用场景是穷尽性检查，确保所有可能的情况都被处理：

```typescript
// 可以考虑一下B的类型增加会发生什么
type B = '唱' | '跳' | 'rap'

function kun(value: B) {
  switch (value) {
    case '唱':
      console.log('唱')
      break
    case '跳':
      console.log('跳')
      break
    case 'rap':
      console.log('rap')
      break
    default:
      // 如果所有情况都处理了，这里的value就是never类型
      const error: never = value
      break
  }
}

// 如果我们添加新的选项但忘记处理
type C = '唱' | '跳' | 'rap' | '篮球'

function kun2(value: C) {
  switch (value) {
    case '唱':
      console.log('唱')
      break
    case '跳':
      console.log('跳')
      break
    case 'rap':
      console.log('rap')
      break
    default:
      const error: never = value  // 错误！'篮球'不能赋值给never
      break
  }
}
```

## never 在类型运算中的应用

never 类型在类型运算中有特殊的行为：

```typescript
// 联合类型中的never会被忽略
type Union1 = string | never        // string

// 交叉类型中的never会使整个类型变成never
type Intersection1 = string & never  // never

// 函数参数中的never
function acceptNever(param: never): void {
  // 这个函数永远不能被调用，因为没有值可以赋给never
}
```

## 实际应用场景

### API 错误处理

```typescript
type ApiError = {
  code: number
  message: string
}

type ApiSuccess<T> = {
  data: T
}

type ApiResponse<T> = ApiSuccess<T> | ApiError

function handleResponse<T>(response: ApiResponse<T>): T {
  if ('data' in response) {
    return response.data
  } else if ('code' in response) {
    throw new Error(response.message)
  } else {
    // 这里应该是never，如果到达这里说明类型定义有问题
    const exhaustiveCheck: never = response
    throw new Error('Unexpected response type')
  }
}
```

### 状态机

```typescript
type State = 'idle' | 'loading' | 'success' | 'error'

function handleState(state: State): string {
  switch (state) {
    case 'idle':
      return '等待中'
    case 'loading':
      return '加载中'
    case 'success':
      return '成功'
    case 'error':
      return '错误'
    default:
      const exhaustiveCheck: never = state
      throw new Error(`Unhandled state: ${exhaustiveCheck}`)
  }
}
```

### 类型过滤

```typescript
type Exclude<T, U> = T extends U ? never : T

type StringOrNumber = string | number | boolean
type OnlyStringOrNumber = Exclude<StringOrNumber, boolean>  // string | number

// 提取函数类型
type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never
}[keyof T]

type Example = {
  name: string
  age: number
  greet(): void
  calculate(x: number): number
}

type FunctionKeys = FunctionPropertyNames<Example>  // 'greet' | 'calculate'
```

## never vs void vs undefined

理解这三种类型的区别很重要：

```typescript
// void: 函数没有返回值或隐式返回undefined
function logMessage(): void {
  console.log('Hello')
}

// undefined: 明确返回undefined
function returnUndefined(): undefined {
  return undefined
}

// never: 函数永远不会正常返回
function throwError(): never {
  throw new Error('Always throws')
}

function infiniteLoop(): never {
  while (true) {
    // 永远不会结束
  }
}
```

## 小结

本节内容主要总结如下：

1. **基本概念**：`never` 表示永不存在的值的类型，是所有类型的子类型
2. **产生场景**：抛出异常、无限循环、不可能的类型交叉等
3. **穷尽性检查**：确保 switch 语句或条件分支处理了所有可能的情况
4. **类型运算**：在联合类型中被忽略，在交叉类型中使整个类型变成 never
5. **实际应用**：API 错误处理、状态机、类型过滤、断言函数等
6. **类型区别**：与 `void` 和 `undefined` 有明确的语义差异
7. **类型安全**：帮助在编译时发现逻辑错误和遗漏的情况处理

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/14-never/index.ts)。

