---
title: Iterator

article: true
order: 16
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-22

description: 生成器和迭代器的相关介绍
footer: Always coding, always learning
---

<!-- more -->

# Iterator

本节我们来看一下 **ES6** 引入的两个强大特性——迭代器（Iterator）和生成器（Generator），它们非常关键，在多种底层实现都有用到。

## 生成器

生成器函数是一种特殊的函数，可以暂停执行和恢复执行。它的语法是 **function\***，内部使用 **yield** 关键字来“产出”一个值。

```typescript
function* gen() {
  yield 'chulan'                  // 同步值
  yield Promise.resolve('huaixi') // 异步值
}

const g = gen()

// 调用 next() 方法来启动或恢复生成器的执行
console.log(g.next())  // { value: 'chulan', done: false }
console.log(g.next())  // { value: Promise { <pending> }, done: false }
console.log(g.next())  // { value: undefined, done: true }
```

每次调用 `next()`，生成器会执行到下一个 `yield` 语句，并返回一个包含 `value` 和 `done` 属性的对象。done 为 true 时，表示生成器已经执行完毕。

### 类型注解

生成器类型有详细的类型注解，格式为 `Generator<YieldType, ReturnType, NextType>`：

- **YieldType**：yield 产出的值的类型。
- **ReturnType**：生成器最终 return 的值的类型（如果没有显式 return，则为 void）。
- **NextType**：调用 next(arg) 时传入参数的类型。

```typescript
interface Generator<T = unknown, TReturn = any, TNext = unknown>
extends Iterator<T, TReturn, TNext> {
    next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
    return(value: TReturn): IteratorResult<T, TReturn>;
    throw(e: any): IteratorResult<T, TReturn>;
    [Symbol.iterator](): Generator<T, TReturn, TNext>;
}
```

## 迭代器

一个对象如果实现了 `[Symbol.iterator]` 方法，那么它就是“可迭代的”（iterable）。这个方法会返回一个**迭代器**对象，该对象拥有一个 `next()` 方法用于遍历。

像 `Array`、`String`、`Map`、`Set` 甚至 `arguments` 对象和 `NodeList` 都内置了 `Symbol.iterator`，注意，对象是不支持的。

```typescript
// Set 是一个不含重复值的集合
let set: Set<number> = new Set([1, 2, 6, 2, 1]) // 实际存储 {1, 2, 6}

// Map 的键可以是任意类型，比普通对象更灵活
let map: Map<number, string> = new Map()
map.set(1, 'aaa')
map.set(2, 'bbb')

// 我们可以手动获取并使用迭代器
let mapIterator = map[Symbol.iterator]()
console.log(mapIterator.next()) // { value: [ 1, 'aaa' ], done: false }
console.log(mapIterator.next()) // { value: [ 2, 'bbb' ], done: false }
console.log(mapIterator.next()) // { value: undefined, done: true }
```

我们可以编写一个通用函数来消费任何可迭代对象：

```typescript
const each = (value: any) => {
  let it: any = value[Symbol.iterator]()
  let next: any = { done: false }
  while (!next.done) {
    next = it.next()
    if (!next.done) {
      console.log(next.value)
    }
  }
}
```

### 迭代器的语法糖

手动调用 `next()` 显然很繁琐。ts 为我们提供了更便利的语法来消费迭代器，这些东西的底层都是基于迭代器实现的。

```typescript
// for...of 循环
for (let value of map) {
  console.log(value) // [1, 'aaa'], [2, 'bbb']
}

for (let num of set) {
  console.log(num) // 1, 2, 6
}

// 解构赋值和展开语法
let [a, b] = set
console.log(a, b) // 1 2

let arrFromSet = [...set]
console.log(arrFromSet) // [1, 2, 6]
```

> **注意**：`for...of` 不能直接用于遍历普通对象，因为普通对象默认不是可迭代的。

## 让普通对象可迭代

既然 `for...of` 这么好用，我们能否让一个普通对象也支持它呢？答案是肯定的，只需为它实现 `[Symbol.iterator]` 方法即可。

```typescript
let obj = {
  max: 5,
  current: 0,
  [Symbol.iterator]() {
    // 返回一个迭代器对象，它有 next 方法
    return {
      max: this.max,
      current: this.current,
      next() {
        if (this.current < this.max) {
          return {
            value: this.current++, // 返回当前值，然后自增
            done: false
          }
        } else {
          return {
            value: undefined,
            done: true
          }
        }
      }
    }
  }
}
```

## 小结

总结一下本节的核心内容：
1.  **迭代器协议**：一个对象只要有 `[Symbol.iterator]` 方法，就是可迭代的。该方法返回一个有 `next()` 方法的迭代器。
2.  **生成器**：一种用于快速创建迭代器的语法糖，使用 `yield` 暂停和返回值。
3.  **for...of**：消费可迭代对象的首选语法，比较常用。
4.  **自定义迭代**：可以为任何对象实现 `[Symbol.iterator]`，使其能够被 `for...of` 等语法遍历。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/16-iterator/index.ts)。