---
title: Typeof
icon: placeholder
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

TypeScript 具有强大的类型推导能力，在很多情况下可以自动推断出变量的类型，无需显式声明：

```typescript
// 就像这种ts非常简单就能推导出来是string，我们就没必要显示的写出来类型
let str = 'huaixi'  // 自动推导为 string 类型

// 其他基本类型的推导
let num = 123       // 推导为 number
let bool = true     // 推导为 boolean
let arr = [1, 2, 3] // 推导为 number[]

// 函数返回值推导
function add(a: number, b: number) {
  return a + b      // 返回值自动推导为 number
}

// 对象类型推导
let person = {
  name: 'chulan',
  age: 20
}
// 推导为 { name: string; age: number }
```

### 限制

当 TypeScript 无法推导出具体类型时，会使用 `any` 类型：

```typescript
// 若是不显示写出来类型，则会推导为any，我们可以赋值为任何类型
let num
num = 123; num = 'aaa'  // num 被推导为 any 类型

// 避免 any 的方法
let num2: number        // 显式声明类型
let num3 = 0           // 通过初始值推导

// 函数参数必须显式声明类型
function greet(name: string) {  // 参数类型必须声明
  return `Hello, ${name}`       // 返回值可以推导
}
```

## 类型别名

类型别名使用 `type` 关键字定义，和 C 语言的 `typedef` 比较像，但是 C 的 `typedef` 只能给现有类型起别名，TypeScript 的 `type` 可以创建新的类型结构：

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

## 类型别名 vs Interface

类型别名与 `interface` 很像，都是定义类型的契约，但有一些重要区别：

```typescript
// Interface 可以声明合并
interface Person {
  name: string
}

interface Person {
  age: number
}
// 自动合并为 { name: string; age: number }

// Type 不支持声明合并
type Animal = {
  name: string
}

// type Animal = {  // 错误：重复的标识符
//   age: number
// }

// Interface 支持继承
interface Student extends Person {
  grade: string
}

// Type 使用交叉类型实现类似功能
type Teacher = Person & {
  subject: string
}

// Interface 只能定义对象类型
interface Config {
  host: string
  port: number
}

// Type 可以定义任意类型
type Status = 'loading' | 'success' | 'error'
type StringOrNumber = string | number
type EventCallback = () => void
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
4. **与 Interface 区别**：`type` 不支持声明合并和继承，但支持联合类型等
5. **高级用法**：支持条件类型、泛型、映射类型等高级特性
6. **typeof 操作符**：获取变量的类型，避免重复定义
7. **实际应用**：在 API 类型定义、状态管理、事件处理等场景中广泛使用

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/13-typeof/index.ts)。