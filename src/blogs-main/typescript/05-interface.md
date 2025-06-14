---
title: Interface
icon: placeholder
article: true
order: 5
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-05

description: 接口的相关介绍，共6个方面的内容
footer: Always coding, always learning
---

<!-- more -->

## 接口简介

`interface` 用于定义一个对象必须有什么属性和方法，它类似于一个契约或规范，确保对象具有特定的结构。

## 基础接口定义

接口要求严格匹配，不能多属性，也不能少属性，所有声明的属性都必须存在。

```typescript
interface Person1 {
  name: string
  age: number
  live: boolean
  print: () => void
}

let person1: Person1 = {
  name: "chulan",
  age: 20,
  live: true,
  print: () => { }
}
```

## 接口合并

当存在多个同名接口时，TypeScript 会自动将它们合并，这个特性在扩展第三方库的类型定义时非常有用：

```typescript
interface Person2 {
  name: string
}

interface Person2 {
  age: number
}

// 合并后的 Person2 接口等价于：
// interface Person2 {
//   name: string
//   age: number
// }

let person2: Person2 = {
  name: 'chulan',
  age: 20
}
```

## 索引签名

当我们只关注对象的某些属性，但允许存在其他任意属性时，可以使用索引签名，这种方式在处理后台返回的数据时特别有用，我们只需要关注特定字段，其他字段可以忽略：

```typescript
interface Person3 {
  // 前面两个属性是强校验的
  name: string
  age: number
  [elseElement: string]: any  // 可以对应任意个key，但是don't care
}

let person3: Person3 = {
  name: 'chulan',
  age: 20,
  a: 1,
  b: 2,
  c: 'anything'
}
```

## 可选属性与只读属性

使用 `?` 标记属性为可选，使用 `readonly` 表示只读：

```typescript
interface Person4 {
  name: string,
  age?: number,                 // 表示可选，有没有都ok
  readonly cb: () => boolean    // 加上readonly，表示只读
}

let person4: Person4 = {
  name: 'chulan',
  cb: () => {
    return false
  }
}
```

## 接口继承

接口可以通过 `extends` 关键字继承其他接口，支持多重继承，这个就比较类似于前面的重合了：

```typescript
interface Person6 {
  age: number
}

interface Person7 {
  love: string
}

interface Person5 extends Person6, Person7 {
  name: string
}

let person5: Person5 = {
  name: 'chulan',
  age: 100,
  love: 'bbb'
}
```

## 定义函数类型

接口不仅可以定义对象结构，还可以定义函数类型：

```typescript
interface Func {
  (name: string): number[]
}

const func: Func = (name: string) => {
  return [1, 2]
}

func('chulan')
```

## 小结

interface 还是很重要的，建议多练练手，主要有如下内容：

1. **基础定义**：接口定义对象的契约，必须严格遵守
2. **接口合并**：同名接口自动合并，便于扩展
3. **索引签名**：处理动态属性，但要谨慎使用
4. **可选与只读**：提供灵活性和安全性
5. **接口继承**：代码复用的重要手段
6. **函数类型**：让函数签名更加规范

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/05-interface/index.ts)。

