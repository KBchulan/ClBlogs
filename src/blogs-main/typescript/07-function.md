---
title: Function
icon: placeholder
article: true
order: 7
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-05

description: 函数的相关介绍，这个章节非常easy
footer: Always coding, always learning
---

<!-- more -->

## 基础函数定义

TypeScript 中可以为函数的参数和返回值指定类型，确保函数调用的类型安全：

```typescript
// 指定参数和返回值类型
function add(...args: number[]): number {
  return args.reduce((sum, current) => sum + current, 0)
}

// 箭头函数写法
const add2 = (...args: number[]): number => {
  return args.reduce((sum, current) => sum + current, 0)
}

console.log(add(1, 2, 3, 4)) // 10
console.log(add2(5, 6, 7))   // 18
```

## 默认参数和可选参数

支持默认参数和可选参数，提供更灵活的函数调用方式，注意，可选参数必须放在最后：

```typescript
// 默认参数
function add3(a: number = 3, b: number = 5): number {
  return a + b
}

// 可选参数（使用 ? 标记）
function add3else(a: number = 3, b?: number): number {
  return a + (b ?? 0)     // 空值合并运算符，如果b为null或undefined返回0
}

console.log(add3())        // 8 (使用默认值)
console.log(add3(10))      // 15 (a=10, b=5)
console.log(add3else(10))  // 10 (a=10, b为undefined)
```

## 对象参数

当函数参数较多时，可以使用对象作为参数，结合接口定义提供更好的类型检查：

```typescript
interface Person {
  name: string
  age: number
}

function add4(person1: Person = { name: 'a', age: 5 },
  person2: Person = { name: 'b', age: 6 }): number {
  return person1.age + person2.age
}

const result = add4(
  { name: 'chulan', age: 20 },
  { name: 'alice', age: 25 }
)
console.log(result) // 45
```

## 函数重载

函数重载允许一个函数根据不同的参数类型和数量有不同的行为，这在处理多种输入情况时非常有用：

```typescript
let user: number[] = [1, 2, 3]

// 重载签名
function findNum(): number[];                   // 查询所有的
function findNum(id: number): number[];         // 查询指定id
function findNum(nums: number[]): number[];     // 添加数组

// 实现签名
function findNum(ids?: number | number[]): number[] {
  if (typeof ids == 'number') {
    return user.filter(v => v == ids)
  }
  else if (Array.isArray(ids)) {
    user.push(...ids)
    return user
  }
  else {
    return user
  }
}

console.log(findNum())           // [1, 2, 3]
console.log(findNum(2))          // [2]
console.log(findNum([4, 5]))     // [1, 2, 3, 4, 5]
```

## 函数类型定义

可以使用类型别名或接口来定义函数类型，让函数签名更加清晰：

```typescript
// 使用类型别名定义函数类型
type MathOperation = (a: number, b: number) => number

const multiply: MathOperation = (a, b) => a * b
const divide: MathOperation = (a, b) => a / b

// 使用接口定义函数类型
interface Calculator {
  (operation: string, a: number, b: number): number
}

const calculator: Calculator = (operation, a, b) => {
  switch (operation) {
    case 'add': return a + b
    case 'subtract': return a - b
    default: return 0
  }
}
```

## 高阶函数

TypeScript 对高阶函数（接受函数作为参数或返回函数的函数）提供了很好的类型支持：

```typescript
// 接受函数作为参数
function processArray<T>(arr: T[], processor: (item: T) => T): T[] {
  return arr.map(processor)
}

const numbers = [1, 2, 3, 4]
const doubled = processArray(numbers, x => x * 2)
console.log(doubled) // [2, 4, 6, 8]

// 返回函数
function createMultiplier(factor: number): (num: number) => number {
  return (num: number) => num * factor
}

const double = createMultiplier(2)
const triple = createMultiplier(3)
console.log(double(5))  // 10
console.log(triple(5))  // 15
```

## 小结

本节主要包含以下内容：

1. **基础定义**：为参数和返回值指定类型，确保类型安全
2. **默认参数**：提供参数默认值，简化函数调用
3. **可选参数**：使用 `?` 标记，增加函数灵活性
4. **对象参数**：结合接口，处理复杂参数结构
5. **函数重载**：同一函数名处理不同类型的输入
6. **函数类型**：使用类型别名和接口定义函数签名
7. **高阶函数**：函数式编程的重要概念

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/07-function/index.ts)。

