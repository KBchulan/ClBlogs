---
title: Symbol
icon: placeholder
article: true
order: 15
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-08

description: symbol类型的相关介绍和应用场景
footer: Always coding, always learning
---

<!-- more -->

## Symbol

`Symbol` 是 ES6 引入的一种新的原始数据类型，用于创建唯一的标识符。每个 Symbol 值都是独一无二的，即使传入相同的参数，创建的 Symbol 也不相等。

```typescript
let a1: symbol = Symbol(1)
let a2: symbol = Symbol(1)

console.log(a1 === a2)  // false
```

### 全局注册

`Symbol.for()` 方法会在全局 Symbol 注册表中查找是否已经存在指定 key 的 Symbol，如果存在则返回该 Symbol，否则创建一个新的：

```typescript
console.log(Symbol.for('huaixi') === Symbol.for('huaixi'))  // true
```

### 作为对象属性

Symbol 可以作为对象的属性名，这样的属性被称为 Symbol 属性，值得注意的是，使用 Symbol 作为属性名时，需要使用计算属性名语法 `[symbol]`，访问时也需要使用方括号语法：

```typescript
let obj = {
  [a1]: 111,
  [a2]: 222,   // 此处[]表示计算属性名
  example: 'test'
}
console.log(obj)
console.log(obj[a1])  // []来访问
```

### 隐私性

Symbol 属性具有很好的隐私性，常规的对象遍历方法无法访问到 Symbol 属性，这种特性使得 Symbol 非常适合用作类的私有成员或者需要隐藏的属性。

```typescript
for (let key in obj) {
  console.log(key)  // 只会输出 'example'
}

// 这些都是读不到这个symbol属性的
console.log(Object.keys(obj))                   // 非symbol
console.log(Object.getOwnPropertyNames(obj))    // 非symbol
```

### 获取 Symbol 属性

虽然常规方法无法访问 Symbol 属性，但 TypeScript/JavaScript 提供了专门的方法来获取它们：

```typescript
console.log(Object.getOwnPropertySymbols(obj))  // 获取所有Symbol属性
console.log(Reflect.ownKeys(obj))               // 获取所有属性（包括Symbol）
```

- `Object.getOwnPropertySymbols()` 只返回 Symbol 属性
- `Reflect.ownKeys()` 返回所有属性，包括字符串属性和 Symbol 属性

## 小结

Symbol 是 TypeScript 中一个独特而强大的类型：

1. **唯一性**：每个 Symbol 都是独一无二的
2. **全局注册**：`Symbol.for()` 提供全局 Symbol 管理
3. **计算属性**：可以作为对象的动态属性名
4. **隐私性**：常规遍历方法无法访问，适合私有成员
5. **专用方法**：需要特殊方法才能获取 Symbol 属性

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/15-symbol/index.ts)。

