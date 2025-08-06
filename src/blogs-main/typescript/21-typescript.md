---
title: 21 Mixins

article: true
order: 21
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-08-06

description: 介绍 TypeScript 中的代码复用模式——混入（Mixins），包括对象混入和类混入的实现方式。
footer: Always coding, always learning
---

<!-- more -->

# 21 Mixins

在面向对象编程中，类通常只能继承自单一的父类，这在某些需要复用多个独立功能的场景下会带来限制。为了解决这个问题，TypeScript 借鉴了其他语言（如 Ruby）中的“混入（Mixins）”模式。混入允许我们将多个类的功能组合到一个单一的类中，实现更灵活的代码复用。

## 对象混入

在深入了解类的混入之前，我们先从一个更简单的概念——对象混入——开始。对象混入指的是将多个对象的属性和方法合并到一个新对象中。

假设我们有两个接口和对应的对象：

```typescript
interface A {
  name: string;
}

interface B {
  age: number;
}

let a: A = {
  name: "chulan"
};

let b: B = {
  age: 20
};
```

我们可以使用多种方式将 `a` 和 `b` 合并：

### 扩展运算符

扩展运算符提供了一种简洁的浅拷贝方式来合并对象，这个返回的对象类型是一个全新的类型。

```typescript
let c = { ...a, ...b };
console.log(c); // { name: 'chulan', age: 20 }
```

### Object.assign()

`Object.assign()` 方法也可以用于将所有可枚举属性的值从一个或多个源对象复制到目标对象，它同样是浅拷贝，与上一个不同的是，此方法返回的是一个交叉类型。

```typescript
let d = Object.assign({}, a, b);
console.log(d); // { name: 'chulan', age: 20 }
```

### 深拷贝

如果需要深拷贝，即完全复制对象及其嵌套的所有内容，而不是仅仅复制引用，可以使用 `structuredClone`。

```typescript
let e = structuredClone(c);
console.log(e); // { name: 'chulan', age: 20 }
```

## 类的混入

对象混入很简单，但类的混入才是 Mixins 模式的核心，TypeScript 不支持多重继承（一个类不能 `extends` 多个类），但我们可以通过函数和泛型来实现类似的效果。

我们的目标是创建一个 `App` 类，并动态地给它“混入”日志（`Logger`）和渲染（`Html`）的功能。

首先，定义我们的功能类和基础类：

```typescript
// 功能类1：提供日志功能
class Logger {
  log(message: string) {
    console.log(`Log: ${message}`);
  }
}

// 功能类2：提供HTML渲染功能
class Html {
  render(content: string) {
    console.log(`Rendering HTML: ${content}`);
  }
}

// 基础类
class App {
  run() {
    console.log("App is running");
  }
}
```

接下来，我们创建一个高阶函数 `pluginMixins`，它将作为我们的混入工厂：

```typescript
// 定义一个类型，代表一个可以被 new 的构造函数
type Constructor<T> = new (...args: any[]) => T;

// 混入函数
function pluginMixins<T extends Constructor<App>>(base: T) {
  return class extends base {
    // 在新类中，我们将拥有 Logger 和 Html 的实例
    private logger: Logger;
    private html: Html;

    constructor(...args: any[]) {
      super(...args); // 调用父类的构造函数
      // 初始化混入的功能
      this.logger = new Logger();
      this.html = new Html();
    }

    // 重写 run 方法，将新功能组合进去
    run() {
      this.logger.log("App is starting"); // 来自 Logger 的功能
      super.run(); // 调用原始 App 的 run 方法
      this.html.render("Hello, World!"); // 来自 Html 的功能
    }
  };
}
```

值得注意的是，在ts中，类就是特殊的函数（构造函数），因此此方法约束 T 必须是 `App` 或者其子类。

最后，我们使用这个工厂函数来创建我们最终的、混合了多种功能的类：

```typescript
// 使用混入函数创建增强版的 App 类
const MixedApp = pluginMixins(App);

// 实例化并运行
const appInstance = new MixedApp();
appInstance.run();
```

运行结果：
```
Log: App is starting
App is running
Rendering HTML: Hello, World!
```

## 小结

混入（Mixins）是 TypeScript 中一种非常强大的模式，用于实现代码复用和功能组合。

1.  **对象混入**：通过扩展运算符或 `Object.assign` 可以轻松合并多个对象的属性，实现简单的功能组合。
2.  **类混入**：通过创建返回类的高阶函数，我们可以将多个类的功能动态地“混入”到一个基础类中，绕过了单继承的限制。
3.  **核心思想**：混入的核心是**组合优于继承**。它让我们能够构建功能强大且灵活的类，而无需创建复杂的继承链。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/21-mixins/index.ts)。
