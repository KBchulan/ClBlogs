---
title: 20 模块

article: true
order: 20
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-08-06

description: 介绍 ts 中常见的模块化规范以及 import 和 export 的具体用法
footer: Always coding, always learning
---

<!-- more -->

# 20 模块

在开发的过程中，模块化是必不可少的，总不能全部都只写到一个文件里吧，这里先快速回顾一下 JavaScript 社区中出现过的主要模块化规范。

## 模块化规范简介

1.  **CommonJS (CJS)**: 最初为服务器端（Node.js）设计。它使用 `require()` 同步加载模块，通过 `module.exports` 或 `exports` 导出成员，其同步特性使其在浏览器端水土不服，因为网络请求是异步的。

2.  **Asynchronous Module Definition (AMD)**: 专为浏览器设计，以 `require.js` 为代表，它支持异步加载模块，通过 `define()` 函数定义模块和依赖。

3.  **Universal Module Definition (UMD)**: 一个兼容 CommonJS 和 AMD 的模式，同时也能在没有模块系统的环境中作为全局变量使用，它的目标是让一个模块能“随处运行”。

4.  **ES Modules (ESM)**: 从 ES6 (ECMAScript 2015) 开始，JavaScript 拥有了官方的、语言层面的模块化标准，使用 `import` 和 `export` 关键字，支持静态分析（在编译时确定依赖关系）和摇树优化（Tree Shaking），ESM 是现代 Web 开发的推荐标准，也是 TypeScript 编译和开发时主要遵循的规范。

接下来，我们将重点介绍 ESM 在 TypeScript 中的具体用法。

为了演示，我们创建两个文件：`test.ts` 用于导出各种成员，`index.ts` 用于演示如何导入它们。

## 导出

在 `test.ts` 文件中，我们可以通过多种方式导出功能。

### 默认导出

每个模块只能有一个默认导出。它非常适合导出一个模块的主要功能，会把需要导出的东西封装为一个对象。

```typescript
export default (a: number, b: number): number => a + b;
```

### 命名导出

我们可以使用 `export` 关键字导出任意数量的变量、函数或类，这些导出成员在导入时需要使用其确切的名称。

```typescript
// 可以有多个命名导出
export let x = 2;
export const add = (a: number, b: number): number => a + b;
```

### 解构导出

这是一种批量进行命名导出的便捷语法，将多个变量包裹在 `{}` 中一次性导出，这样导入时可以直接引入一个对象，这也是最建议的写法：即一个文件为一个模块，只把需要暴露的封装为对象导出

```typescript
let a: number = 5;
let arr: number[] = [1, 2, 3];

// 将已定义的变量批量导出
export {
  a,
  arr
};
```

## 导入

在 `index.ts` 文件中，我们根据 `test.ts` 的导出方式，使用不同的语法来导入。

### 导入默认导出

导入默认导出的成员时，我们可以为其指定任意名称，无需使用花括号。

```typescript
// 导入默认导出，'xxx' 是我们自定义的名称
import xxx from './test';
console.log(xxx(1, 2)); // 输出: 3
```

### 导入命名导出

导入命名导出的成员时，必须使用花括号 `{}`，并且名称需要与导出的名称一致，可以使用 `as` 关键字为其创建别名。

```typescript
// 导入命名导出的 x 和 add，并为 add 创建别名 add2
import { x, add as add2 } from './test';
console.log(x); // 输出: 2
console.log(add2(1, 2)); // 输出: 3
```

对于通过解构导出的成员，导入方式与普通命名导出完全相同。

```typescript
// 导入解构导出的 a 和 arr，并为 arr 创建别名 arr2
import { a, arr as arr2 } from './test';
console.log(a, arr2); // 输出: 5 [1, 2, 3]
```

### 命名空间导入

如果想将一个模块中所有命名导出的成员都导入到一个对象中，可以使用 `import * as` 语法。

```typescript
// 将 test.ts 中所有导出成员都放到 api 对象中
import * as api from './test';

console.log(api.x); // 2
console.log(api.add(5, 5)); // 10
// 默认导出的成员会成为 api 对象的 default 属性
console.log(api.default(5, 5)); // 10
```

### 动态导入

在某些情况下，我们希望按需加载模块，而不是在应用启动时就全部加载，动态 `import()` 可以实现这一点，它返回一个 Promise。

```typescript
// 当条件满足时，异步加载模块
if (true) {
  import('./test').then(res => {
    console.log('动态导入的模块:', res);
    console.log(res.default(10, 20)); // 30
  });
}
```

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/20-import/index.ts)。
