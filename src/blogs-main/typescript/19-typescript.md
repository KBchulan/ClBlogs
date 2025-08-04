---
title: 19 命名空间介绍

article: true
order: 19
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-08-04

description: 介绍 TypeScript 中的命名空间（namespace），包括其基本使用、嵌套、合并、抽离和实际应用案例。
footer: Always coding, always learning
---

<!-- more -->

# 19 命名空间介绍

本节到了 **namespace**，也就是命名空间，学过 C++ 的你一定会说这我熟啊，没错，TypeScript 中的命名空间与 C++ 的概念类似，主要用于组织代码，避免全局作用域的污染，它通过将相关的代码包裹在一个命名空间内，形成一个独立的“域”。

## 基本使用

命名空间可以将一组相关的变量、函数、类等封装在一起，如果希望外部能够访问命名空间内的成员，需要使用 `export` 关键字将其导出。

```typescript
namespace Name1 {
  export let num: number = 15
  export const add = (a: number, b: number) => a + b
}

console.log(Name1.num)  // 15
console.log(Name1.add(2, 5)) // 7
```

## 嵌套

命名空间支持嵌套，即可以在一个命名空间内部定义另一个命名空间，这对于构建层次化的代码结构非常有用，可以更好地组织和管理代码。

```typescript
namespace Name2 {
  export namespace Son {
    export let num: number = 55
  }
}

console.log(Name2.Son.num) // 55
```

## 合并

与接口（interface）类似，同名的命名空间会自动合并。这个特性允许你将一个命名空间分散到多个文件中，或者在不修改原有代码的情况下进行扩展。

```typescript
namespace Name1 {
  export let num2InOther: number = 65
}

// 此时 Name1 命名空间同时拥有 num 和 num2InOther 两个成员
console.log(Name1.num)
console.log(Name1.num2InOther)
```

## 抽离

为了保持代码的模块化和可维护性，我们可以将命名空间定义在单独的文件中，然后在需要的地方通过 `import` 语句引入。这需要将命名空间从其文件中导出。

```typescript
// test.ts
export namespace Test {
  export let a: number = 15
}
```

```typescript
// index.ts
import { Test } from "./test"
console.log(Test.a)
```

## 实际案例

在实际开发中，命名空间一个常见的用途是避免命名冲突。例如，当我们需要为不同平台（如 iOS 和 Android）提供功能相同但实现不同的 API 时，可以使用命名空间来区分它们。

```typescript
namespace ios {
  export const pushMessage = (msg: string, type: string) => {
    // iOS 推送消息的实现
  }
}

namespace android {
  export const pushMessage = (msg: string, type: string) => {
    // Android 推送消息的实现
  }
}

// 调用时可以明确指定使用哪个平台的实现
ios.pushMessage('Hello', 'news');
android.pushMessage('World', 'update');
```

## 小结

命名空间是 TypeScript 中一个强大的组织代码的工具，尤其是在 ES6 模块系统普及之前。

毕竟现在更推荐使用 ES6 模块，因此命名空间看一下就好。

1.  **基本使用**：使用 **namespace** 关键字定义，**export** 导出成员。
2.  **嵌套**：支持命名空间内部再定义命名空间，形成层级。
3.  **合并**：同名命名空间会自动合并，便于扩展。
4.  **抽离**：可将命名空间拆分到不同文件，通过 **import** 和 **export** 实现模块化。
5.  **实际应用**：有效避免全局命名冲突，适用于多平台或多模块开发。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/19-namespace/index.ts)。
