---
title: AnyType

article: true
order: 3
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-05

description: ts 的类型层级和顶级类型，以及一些类型的列举
footer: Always coding, always learning
---

<!-- more -->

## 环境准备

在开始之前，我们需要安装一些必要的工具，这个其实在上一节已经用到了：

```bash
# 安装 ts-node 用于直接运行 TypeScript 文件
npm install -g ts-node

# 安装 Node.js 类型声明文件
npm install @types/node -D
```

安装完成后，我们就可以直接运行 ts 文件了：

```bash
ts-node index.ts
```

## 类型层级

TypeScript 的类型系统是分层级的，理解这个层级关系是关键：

```text
TypeScript 类型层级（从高到低）：
1. any, unknown (顶级类型)
2. Object, object, {}
3. Number, String, Boolean (包装对象类型)
4. number, string, boolean (原始类型)
5. 1, 'hello', true (字面量类型)
6. never (底层类型)
```

**核心原则**：高等级的类型可以覆盖低等级的类型，理解了这个本节就结束了。

## 顶级类型

这两种类型是 ts 中最宽泛的类型，它可以表示任何值，下面的例子换成unknown也可以：

```typescript
let a: any = 1
a = 'hello'
a = true
a = null
a = undefined
a = void 0
a = []
a = {}
a = () => { }
a = new Promise((resolve, reject) => { })
a = new Date()
a = new Error('error')
a = new Array()
a = new Object()
a = new Function()
```

## 区别

### 赋值限制

`unknown` 只能赋值给 `unknown` 和 `any` 类型：

```typescript
let b: unknown = 1
let tmp: number = 2
// tmp = b  // error: 不能将类型"unknown"分配给类型"number"

// 正确的做法是先进行类型检查
if (typeof b === 'number') {
  tmp = b  // 现在可以了
}
```

### 属性访问限制

`unknown` 无法直接读取任何属性，也无法调用任何方法：

```typescript
let c: unknown = {
  name: 'John',
  age: 20
}
// console.log(c.name); // error: 对象的类型为 "unknown"

// 正确的做法是先进行类型断言或类型守卫
if (typeof c === 'object' && c !== null && 'name' in c) {
  console.log((c as { name: string }).name)
}
```

## 类型安全性对比

```typescript
// any: 完全关闭类型检查
let anyValue: any = 'hello'
console.log(anyValue.foo.bar.baz) // 编译通过，但运行时报错

// unknown: 保持类型安全
let unknownValue: unknown = 'hello'
// console.log(unknownValue.foo) // 编译错误，必须先检查类型
```

## 常见类型概览

以下是 ts 中常见的类型，我们会在后续章节详细展开：

### 原始类型
```typescript
let str: string = 'hello'
let num: number = 42
let bool: boolean = true
let sym: symbol = Symbol('id')
let big: bigint = 100n
```

### 特殊类型
```typescript
let a: any = 'anything'
let uk: unknown = 'unknown value'
let n: null = null
let u: undefined = undefined
let v: void = undefined
// never 类型表示永远不会有值
```

### 引用类型
```typescript
let obj: Object = {}
let arr: Array<number> = [1, 2, 3]
let func: Function = () => {}
// interface, class, tuple, enum, Map, Set, WeakMap, WeakSet, Promise等会在后续章节介绍
```

## 小结

下面是本节的核心概念：

1. **类型层级**：高等级类型可以包含低等级类型
2. **类型安全**：优先使用更具体的类型，避免过度依赖顶级类型
3. **any vs unknown**：`unknown` 更安全，需要类型检查后才能使用

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/03-any-type/index.ts)。
