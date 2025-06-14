---
title: Union

article: true
order: 8
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-06

description: 联合类型，交叉类型，类型断言以及一些常用的操作符
footer: Always coding, always learning
---

<!-- more -->

## 联合类型

联合类型允许一个变量支持多种类型，使用 `|` 符号连接不同的类型。这在处理可能有多种数据格式的场景时非常有用：

```typescript
let phone: number | string = 18737519552
phone = '+86-18737519552'

// 比如后端返回的东西里'true'和1都希望表示true，我们可以通过两次取!来实现这个操作
let fn = (type: number | boolean): boolean => {
  return !!type
}

console.log(fn(1))     // true
console.log(fn(0))     // false
console.log(fn(true))  // true
console.log(fn(false)) // false
```

## 交叉类型

交叉类型可以合并多个类型，使用 `&` 符号连接，这在需要组合多个接口或类型时特别有用。

```typescript
interface People {
  name: string,
  age: number
}

interface Man {
  sex: string
}

const fn2 = (huaixi: Man & People): void => {
  console.log(huaixi)
}

fn2({
  name: 'huaixi',
  age: 19,
  sex: 'man'
})
```

这里我们举一个例子，比如现在要在config里增加一个数据库配置，前面已经为基础配置(host + port)写了一个interface，后续数据库单独写一个interface，这两个取一个 & 是不是就ok了，假如你还有其他的如RabbitMQ一类的配置，都可以互不干扰的写进去对吧。

## 类型断言

类型断言是告诉 TypeScript 编译器变量的具体类型，可以使用 `as` 关键字或尖括号语法，需要注意的是，类型断言只是编译时的类型检查，不会进行实际的类型转换：

```typescript
// 此时若是传入string就会调用length方法，若是number就会返回一个undefined
// 说明这个as只是帮助我们通过这个编译，但是实际的运行时错误无法避免
let fn3 = (num: number | string): void => {
  console.log((num as string).length)
  console.log((<string>num).length)   // 不推荐，毕竟这种写法大家不常用
}

// 类型断言本质上只是为了通过编译，实际上没有任何转换，下面的例子，输入什么就输出什么
let fn4 = (type: any): boolean => {
  return (type as boolean)
}

console.log(fn4("hello"))  // "hello" (不是 boolean)
console.log(fn4(123))      // 123 (不是 boolean)
```

## 运算符补充

前面我们用到了一个空值合并的运算符，那这里自然要汇总一下比较特殊的运算符，基础的加减乘除就不说了。

### 非空断言操作符

使用 `!` 操作符告诉 TypeScript 某个值不会是 `null` 或 `undefined`，但要谨慎使用：

```typescript
// 非空断言(!)，这个只是为了去除一些null或者undefined一类的属性
const func1 = (num: string | null): number => {
  return num!.length  // 告诉ts num不会是null
}

console.log(func1("hello"))  // 5
// console.log(func1(null))  // 运行时会报错
```

### 可选链运算符

使用 `?.` 操作符安全地访问嵌套对象属性，避免因中间某个属性为 `null` 或 `undefined` 而导致的错误：

```typescript
const obj1 = {
  first: {
    second: {
      finally: 123
    }
  }
}

console.log(obj1?.first?.second?.finally) // 123 (正常访问)

// 但是如果过程中间有名字写错了，或者其他未知错误(比如null或者undefined)，
// 是不会直接抛出异常的，而是返回undefined
const obj2: any = null
console.log(obj2?.first?.second?.finally) // undefined (不会报错)
```

### 空值合并运算符

使用 `??` 操作符提供默认值，只有当左侧为 `null` 或 `undefined` 时才使用右侧的值：

```typescript
let n: number = 11
const num1: number = n ?? 15

console.log(num1)  // 11

let m: number | null = null
const num2: number = m ?? 20
console.log(num2)  // 20

// 注意：?? 与 || 的区别
let value1 = 0
console.log(value1 || 10)  // 10 (因为0是falsy值)
console.log(value1 ?? 10)  // 0  (因为0不是null或undefined)
```

### 数字字面量分隔符

使用下划线 `_` 作为数字分隔符，提高大数字的可读性：

```typescript
// 下面两种写法是等价的，但是第二种方便看
const num2: number = 123456789
const num3: number = 123_456_789

console.log(num2 === num3)  // true

// 在其他进制中也可以使用
const binary = 0b1010_0001
const hex = 0xFF_EC_DE_5E
const octal = 0o755_644
```

## 实际应用场景

结合这些特性，我们可以写出更安全和灵活的代码：

```typescript
// 处理API响应的实际例子
interface ApiResponse<T> {
  data: T | null
  error?: string
  status: number
}

function processApiResponse<T>(response: ApiResponse<T>): T | null {
  // 使用可选链和空值合并
  const status = response?.status ?? 500

  if (status >= 200 && status < 300) {
    return response.data
  }

  console.error(response?.error ?? 'Unknown error')
  return null
}

// 使用联合类型处理不同格式的ID
type UserId = string | number

function getUserInfo(id: UserId): string {
  // 类型断言和类型检查结合使用
  if (typeof id === 'string') {
    return `User ID: ${id}`
  } else {
    return `User ID: ${id.toString()}`
  }
}
```

## 小结

本节主要包含以下内容：

1. **联合类型**：使用 `|` 支持多种类型，增加代码灵活性
2. **交叉类型**：使用 `&` 合并多个类型，实现类型组合
3. **类型断言**：使用 `as` 告诉编译器具体类型，但不做实际转换
4. **非空断言**：使用 `!` 排除 null 和 undefined，需谨慎使用
5. **可选链**：使用 `?.` 安全访问嵌套属性，避免运行时错误
6. **空值合并**：使用 `??` 提供默认值，比 `||` 更精确
7. **数字分隔符**：使用 `_` 提高大数字可读性

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/08-union/index.ts)。

