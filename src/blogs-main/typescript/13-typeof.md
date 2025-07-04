---
title: 13 类型别名

article: true
order: 13
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-07

description: 类型推论以及类型别名
footer: Always coding, always learning
---

<!-- more -->

## 类型推导

ts 具有强大的类型推导能力，在很多情况下可以自动推断出变量的类型，无需显式声明：

```typescript
let str = 'huaixi'  // 推导为 string 类型
let num = 123       // 推导为 number
let bool = true     // 推导为 boolean
let arr = [1, 2, 3] // 推导为 number[]

// 返回值自动推导为 number
function add(a: number, b: number) {
  return a + b
}

// 对象类型推导
let person = {
  name: 'chulan',
  age: 20
}
// 推导为 { name: string; age: number }
```

当时当 ts 无法推导出具体类型时，会使用 `any` 类型，这样就会导致补全还有别的东西缺失：

```typescript
let num
num = 123; num = 'aaa'  // num 被推导为 any 类型
```

## 类型别名

类型别名使用 `type` 关键字定义，和 C 语言的 `typedef` 比较像，但是 C 的 `typedef` 只能给现有类型起别名，ts 的 `type` 可以创建新的类型结构：

```typescript
type s = string | number | (() => void)
let str2: s = 'bbb'

// 基础类型别名
type ID = string | number
type UserName = string
type Age = number

// 函数类型别名
type EventHandler = (event: Event) => void
type Calculator = (a: number, b: number) => number

// 对象类型别名
type User = {
  id: ID
  name: UserName
  age: Age
}

// 使用类型别名
const user: User = {
  id: 1,
  name: 'chulan',
  age: 20
}

const handleClick: EventHandler = (event) => {
  console.log('Button clicked')
}
```

## 高级类型别名

类型别名支持条件类型、泛型等高级特性：

```typescript
// type高级用法
type num2 = 1 extends number ? 1 : 0 // extends在type是包含的意思，结果为 1

// 条件类型
type IsString<T> = T extends string ? true : false
type Test1 = IsString<string>  // true
type Test2 = IsString<number>  // false

// 泛型类型别名
type Container<T> = {
  value: T
  getValue(): T
  setValue(value: T): void
}

type StringContainer = Container<string>
type NumberContainer = Container<number>

// 映射类型
type Readonly<T> = {
  readonly [P in keyof T]: T[P]
}

type ReadonlyUser = Readonly<User>
// 等价于：
// {
//   readonly id: ID
//   readonly name: UserName
//   readonly age: Age
// }

// 实用工具类型
type Partial<T> = {
  [P in keyof T]?: T[P]
}

type OptionalUser = Partial<User>
// 所有属性变为可选
```

## typeof 操作符

`typeof` 操作符可以获取变量的类型，在类型推导中非常有用：

```typescript
// 获取变量的类型
const config = {
  host: 'localhost',
  port: 3000,
  ssl: false
}

type Config = typeof config
// 等价于：
// {
//   host: string
//   port: number
//   ssl: boolean
// }

// 获取函数的类型
function createUser(name: string, age: number) {
  return { name, age, id: Math.random() }
}

type CreateUserFunction = typeof createUser
type UserType = ReturnType<typeof createUser>

// 获取数组元素类型
const fruits = ['apple', 'banana', 'orange']
type Fruit = typeof fruits[number]  // string

// 获取对象属性类型
type HostType = typeof config.host  // string
type PortType = typeof config.port  // number
```

## 实际应用场景

类型推导和类型别名在实际开发中的应用：

```typescript
// API 响应类型定义
type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

type UserResponse = ApiResponse<User>
type UserListResponse = ApiResponse<User[]>

// 状态管理
type LoadingState = 'idle' | 'loading' | 'success' | 'error'

type AppState = {
  user: User | null
  loading: LoadingState
  error: string | null
}

// 事件处理
type EventMap = {
  click: MouseEvent
  keydown: KeyboardEvent
  change: Event
}

type EventListener<K extends keyof EventMap> = (event: EventMap[K]) => void

// 表单验证
type ValidationRule<T> = {
  required?: boolean
  validator?: (value: T) => boolean | string
}

type FormRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>
}

type UserFormRules = FormRules<User>
```

## 小结

本节内容主要总结如下：

1. **类型推导**：TypeScript 能自动推断大部分类型，减少冗余的类型声明
2. **推导限制**：无法推导时使用 `any`，应该避免这种情况
3. **类型别名**：使用 `type` 创建类型别名，比 C 语言的 `typedef` 更强大
4. **高级用法**：支持条件类型、泛型、映射类型等高级特性
5. **typeof 操作符**：获取变量的类型，避免重复定义
6. **实际应用**：在 API 类型定义、状态管理、事件处理等场景中广泛使用

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/13-typeof/index.ts)。