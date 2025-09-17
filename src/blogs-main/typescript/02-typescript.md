---
title: 02 基础类型

article: true
order: 2
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-05

description: 常见的 typescript 基础类型
footer: Always coding, always learning
---

<!-- more -->

## 变量声明

TypeScript 继承了 JavaScript 的变量声明方式，但在作用域和行为上有着重要的区别。

### var

```typescript
// var 会提升变量的定义到作用域的顶部
function printA() {
  var value1: number = 1
  if (true) {
    var value1: number = 2
    console.log(value1)  // 2
  }
  console.log(value1)    // 2
}
```

`var` 声明的变量会发生**变量提升**，这意味着变量的声明会被提升到函数作用域的顶部，导致内部的value1覆盖了外部的value1。

### let

```typescript
// let 只影响当前作用域的变量
function printC() {
  let value2: number = 1
  if (true) {
    let value2: number = 2
    console.log(value2)  // 2
  }
  console.log(value2)    // 1
}
```

`let` 声明的变量具有**块级作用域**，内部的value2不会影响外部的value2。

### const

const 声明的变量不能被修改

```typescript
const b: number = 2
```

## 运行代码

实时编译：

```bash
tsc -w
node index.js
```

直接运行：

```bash
ts-node index.ts
```

## 数字类型

```typescript
let num0: number = 111       // 普通数字
let num1: number = NaN       // not a number
let num2: number = Infinity  // 无穷大
let num3: number = 0b111     // 二进制 (7)
let num4: number = 0o77      // 八进制 (63)
let num5: number = 0xA56D    // 十六进制 (42349)
```

运行结果：`111 NaN Infinity 7 63 42349`

## 字符串类型

```typescript
let str0: string = 'chulan'   // 普通字符串
let str1: string = `${num0}`  // 模板字符串
```

运行结果：`chulan 111`

## 布尔类型

```typescript
// 无需多言
let bool0: boolean = true
let bool1: boolean = false
```

## 空值类型

### null 和 undefined

```typescript
let null0: null = null
let undefined0: undefined = undefined
```

在严格模式下，`null` 和 `undefined` 是不同的类型，不能相互赋值。

### void

```typescript
let v1: void = undefined
// let v2: void = null  // 严格模式下会报错
```

`void` 类型主要用于函数没有返回值的情况：

```typescript
function sayHello(): void {
  console.log("Hello, TypeScript!")
}
```

## 严格模式

我们可以通过 `tsc --init` 生成 `tsconfig.json`，然后修改 `strict` 为 `false` 来关闭严格模式，此模式会影响类型检查的严格程度：

- `void` 类型不能赋值为 `null`
- `null` 和 `undefined` 不能相互赋值

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/02-base-type/index.ts)。
