---
title: Object

article: true
order: 4
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-05

description: Object, object, {}的区别，以及原型链的介绍
footer: Always coding, always learning
---

<!-- more -->

## 三种对象类型的区别

TypeScript 中有三种对象类型：`Object`、`object` 和 `{}`。

## Object

`Object` 是所有类型的顶级类型，在原型链中处于最顶层。几乎所有的值都可以赋值给 `Object` 类型：

```typescript
let a1: Object = 123        // 基本类型
let a2: Object = '123'      // 字符串
let a3: Object = true       // 布尔值
let a4: Object = Symbol()   // 符号
let a5: Object = 100n       // BigInt
let a6: Object = {}         // 对象
let a7: Object = []         // 数组
let a8: Object = () => 213  // 函数
```

虽然 `Object` 可以接受几乎所有类型的值，但它不能访问对象的具体属性：

```typescript
let aaa: Object = {
  name: '张三',
  age: 20
}
// console.log(aaa.name) // error: 类型"Object"上不存在属性"name"
```

这是因为 `Object` 类型只保证值符合 `Object` 接口的基本要求，不包含具体的属性定义。

## object

`object` 类型表示所有**非原始类型**，具体有什么可以看一看上一节最后的内容，原始类型不能赋值给object：

```typescript
let b1: object = 123;     // 错误：基本类型不能赋值给 object
let b2: object = '123';   // 错误：字符串不能赋值给 object
let b3: object = true;    // 错误：布尔值不能赋值给 object
```

## 空对象{}

`{}` 表示对象字面量类型，它和 `Object` 类似，但有更多限制。它不可以访问原型链上的任何属性或方法。

```typescript
let empty: {} = 123      // 基本类型也可以
let empty2: {} = {}      // 空对象
// 但无法访问原型链上的方法
```

## 三者对比总结

- **Object**：可接受几乎所有值，但无法访问具体属性
- **object**：仅接受非原始类型，更安全
- **{}**：空对象类型，类似 `Object`，但无法访问原型链上的属性

## 原型链介绍

上文多次提到了原型链，这里我们简单了解一下这个重要的概念。

### 什么是原型？

```text
Prototype 原型 | 原型对象
1. Prototype 是【函数】的一个属性
2. Prototype 是一个对象
3. 当我们创建一个函数时，会默认加上 Prototype 这个属性

__proto__ 隐式原型
1. 【对象】的属性
2. 指向构造函数的 prototype

顶层：Object.prototype.__proto__ === null
```

### 原型链的形成

让我们通过代码来理解原型链的形成过程：

```typescript
// 函数有 prototype 属性
function fn() { }
console.dir(fn)

// 对象通过 __proto__ 连接到原型链
const obj = new fn()
console.log(obj.__proto__ === fn.prototype)               // true
console.log(obj.__proto__.__proto__ === Object.prototype) // true
console.log(obj.__proto__.__proto__.__proto__ === null)   // true
```

### 原型链的属性查找

对象在查找属性时会顺着原型链向上查找：

```typescript
obj.a = 5
fn.prototype.b = 10
console.log(obj.a) // 5  - 在对象自身找到
console.log(obj.b) // 10 - 在原型链上找到
```

我们可以这样理解这个查找过程：

```text
原型链结构示意：
obj = {
  a: 5,
  __proto__: fn.prototype = {
    b: 10,
    __proto__: Object.prototype = {
      __proto__: null
    }
  }
}
```

### 原型链的实际应用

理解原型链有助于我们更好地使用 TypeScript 的类型系统：

```typescript
// 通过原型链，我们可以给所有对象添加方法
Object.prototype.customMethod = function() {
  return 'This is a custom method'
}

// 现在所有对象都可以访问这个方法
const anyObject = {}
// console.log(anyObject.customMethod()) // 但 ts 会报错，因为类型定义中没有这个方法
```

## 小结

这一节的这几个类型认识一下即可，但是原型链得好好理解一下：

1. **Object**：最宽泛的类型，但无法访问具体属性
2. **object**：仅接受非原始类型，更加安全
3. **{}**：空对象类型，类似 Object 但限制更多，无法访问原型链上的属性
4. **原型链**：理解 JavaScript 对象的继承机制

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/04-object/index.ts)。

