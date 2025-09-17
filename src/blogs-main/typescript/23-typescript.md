---
title: 23 Proxy、Reflect

article: true
order: 23
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-08-06

description: 介绍 ES6 元编程的工具——Proxy 和 Reflect，了解它们的 13 种内置拦截方法。
footer: Always coding, always learning
---

<!-- more -->

# 23 Proxy、Reflect

在 js 的世界里，Proxy 和 Reflect 是 ES6 引入的两个强大特性，它们为 js 带来了真正的元编程能力。通过这对组合，我们可以拦截并自定义对象的基本操作，实现诸如数据绑定、属性验证、访问控制等高级功能。

## Proxy

Proxy 可以理解为在目标对象之前架设的一层"拦截器"，外界对该对象的访问，都必须先通过这层拦截。这种机制让我们能够对外界的访问进行过滤和改写。

```typescript
const proxy = new Proxy(target, handler);
```

其中 `target` 是要代理的目标对象，`handler` 是一个对象，定义了各种拦截行为。

## Reflect

Reflect 对象与 Proxy 对象一样，也是 ES6 为了操作对象而提供的新 API。它的设计目的主要有以下几个：

1. 统一操作方式，使得对于对于对象的操作都变为对函数的调用，不是杂七杂八各种写法。
2. 许多 Object 的方法在失败时会抛出错误，而 Reflect 的方法会返回布尔值。
3. 与 Proxy 完美配合，所有的方法都是一一对应。
4. receiver 参数确保了 this 的正确绑定，即不会错误的指向 target 参数上。

## 内置拦截方法

Proxy 支持的拦截操作一共有 13 种，每种操作都对应着 Reflect 的同名方法：

### get

拦截对象属性的读取操作。

```typescript
const obj = { name: 'Alice' };
const proxy = new Proxy(obj, {
  get(target, prop, receiver) {
    console.log(`Getting ${prop}`);
    return Reflect.get(target, prop, receiver);
  }
});
proxy.name; // Getting name
```

### set

拦截对象属性的设置操作。

```typescript
const proxy = new Proxy({}, {
  set(target, prop, value, receiver) {
    console.log(`Setting ${prop} to ${value}`);
    return Reflect.set(target, prop, value, receiver);
  }
});
proxy.count = 1; // Setting count to 1
```

### has

拦截 `propKey in proxy` 的操作，返回一个布尔值。

```typescript
const proxy = new Proxy({ foo: 1 }, {
  has(target, prop) {
    console.log(`Checking if ${prop} exists`);
    return Reflect.has(target, prop);
  }
});
'foo' in proxy; // Checking if foo exists
```

### deleteProperty

拦截 `delete proxy[propKey]` 的操作，返回一个布尔值。

```typescript
const proxy = new Proxy({ foo: 1 }, {
  deleteProperty(target, prop) {
    console.log(`Deleting ${prop}`);
    return Reflect.deleteProperty(target, prop);
  }
});
delete proxy.foo; // Deleting foo
```

### ownKeys

拦截类似获取 Key 的操作，如：
- `Object.getOwnPropertyNames(proxy)`
- `Object.getOwnPropertySymbols(proxy)`
- `Object.keys(proxy)`
- `for...in`

```typescript
const proxy = new Proxy({ a: 1, b: 2 }, {
  ownKeys(target) {
    console.log('Getting own keys');
    return Reflect.ownKeys(target);
  }
});
Object.keys(proxy); // Getting own keys
```

### getOwnPropertyDescriptor

拦截获取装饰器的操作 `Object.getOwnPropertyDescriptor(proxy, propKey)`，返回属性的描述对象。

```typescript
const proxy = new Proxy({ foo: 1 }, {
  getOwnPropertyDescriptor(target, prop) {
    console.log(`Getting descriptor for ${prop}`);
    return Reflect.getOwnPropertyDescriptor(target, prop);
  }
});
Object.getOwnPropertyDescriptor(proxy, 'foo');
```

### defineProperty

拦截定义属性的操作，如：
- `Object.defineProperty(proxy, propKey, propDesc)`
- `Object.defineProperties(proxy, propDescs)`

```typescript
const proxy = new Proxy({}, {
  defineProperty(target, prop, descriptor) {
    console.log(`Defining ${prop}`);
    return Reflect.defineProperty(target, prop, descriptor);
  }
});
Object.defineProperty(proxy, 'foo', { value: 1 });
```

### preventExtensions

拦截 `Object.preventExtensions(proxy)`，阻止对象进行扩展。

```typescript
const proxy = new Proxy({}, {
  preventExtensions(target) {
    console.log('Preventing extensions');
    return Reflect.preventExtensions(target);
  }
});
Object.preventExtensions(proxy);
```

### getPrototypeOf

拦截 `Object.getPrototypeOf(proxy)`，返回对象的原型。

```typescript
const proxy = new Proxy({}, {
  getPrototypeOf(target) {
    console.log('Getting prototype');
    return Reflect.getPrototypeOf(target);
  }
});
Object.getPrototypeOf(proxy);
```

### isExtensible

拦截 `Object.isExtensible(proxy)`，返回对象是否可扩展。

```typescript
const proxy = new Proxy({}, {
  isExtensible(target) {
    console.log('Checking if extensible');
    return Reflect.isExtensible(target);
  }
});
Object.isExtensible(proxy);
```

### setPrototypeOf

拦截 `Object.setPrototypeOf(proxy, proto)`，设置原型，并返回是否成功。

```typescript
const proxy = new Proxy({}, {
  setPrototypeOf(target, proto) {
    console.log('Setting prototype');
    return Reflect.setPrototypeOf(target, proto);
  }
});
Object.setPrototypeOf(proxy, Array.prototype);
```

### apply

拦截 Proxy 实例作为函数调用的操作。

```typescript
const fn = function(a, b) { return a + b; };
const proxy = new Proxy(fn, {
  apply(target, thisArg, args) {
    console.log(`Calling with args: ${args}`);
    return Reflect.apply(target, thisArg, args);
  }
});
proxy(1, 2); // Calling with args: 1,2
```

### construct

拦截 Proxy 实例作为构造函数调用的操作。

```typescript
class Person {
  constructor(name) {
    this.name = name;
  }
}
const ProxyPerson = new Proxy(Person, {
  construct(target, args, newTarget) {
    console.log(`Constructing with args: ${args}`);
    return Reflect.construct(target, args, newTarget);
  }
});
new ProxyPerson('Alice'); // Constructing with args: Alice
```

## 实战案例

下面我们来实现一个简单的响应式数据系统，类似于 Vue 3 的响应式原理，这个系统能够自动追踪数据的变化，并在数据改变时触发相应的副作用函数。

```typescript
// 副作用函数，它是一个无参函数，并带有一个 deps 属性用于存储其所有依赖
type EffectFn = {
  (): void;
  deps: Set<EffectFn>[];
};

// 依赖映射表：Map<属性名, Set<依赖此属性的副作用函数>>
type DepsMap = Map<string | symbol, Set<EffectFn>>;

// 存储副作用函数的桶: WeakMap<目标对象 -> DepsMap>
const bucket = new WeakMap<object, DepsMap>();

// 当前正在执行的副作用函数
let activeEffect: EffectFn | null = null;

/**
 * 副作用函数注册器
 * @param fn 用户定义的副作用函数
 */
function effect(fn: () => void): void {
  const effectFn: EffectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    fn();
    activeEffect = null;
  };

  effectFn.deps = [];

  effectFn();
}

/**
 * 从所有依赖集合中移除指定的副作用函数
 * @param effectFn 需要被清理的副作用函数
 */
function cleanup(effectFn: EffectFn): void {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps!.delete(effectFn);
  }
  effectFn.deps.length = 0;
}

/**
 * 追踪依赖：在 getter 中调用
 * @param target 目标对象
 * @param key 属性名
 */
function track(target: object, key: string | symbol): void {
  if (!activeEffect) return;

  let depsMap = bucket.get(target);
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()));
  }

  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }

  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}

/**
 * 触发更新：在 setter 中调用
 * @param target 目标对象
 * @param key 属性名
 */
function trigger(target: object, key: string | symbol): void {
  const depsMap = bucket.get(target);
  if (!depsMap) return;

  const effects = depsMap.get(key);
  if (!effects) return;

  const effectsToRun = new Set(effects);
  effectsToRun.forEach(effectFn => effectFn());
}

/**
 * 创建响应式对象
 * @param obj 普通对象
 * @returns 对象的响应式代理
 */
function reactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(target: T, key: string | symbol, receiver: any): any {
      track(target, key);
      return Reflect.get(target, key, receiver);
    },

    set(target: T, key: string | symbol, newVal: any, receiver: any): boolean {
      const result = Reflect.set(target, key, newVal, receiver);
      trigger(target, key);
      return result;
    },

    has(target: T, key: string | symbol): boolean {
      track(target, key);
      return Reflect.has(target, key);
    },

    ownKeys(target: T): ArrayLike<string | symbol> {
      track(target, Symbol.for('iterate'));
      return Reflect.ownKeys(target);
    },

    deleteProperty(target: T, key: string | symbol): boolean {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const result = Reflect.deleteProperty(target, key);
      if (result && hadKey) {
        trigger(target, key);
      }
      return result;
    }
  });
}


// --- 使用示例 ---

const data = reactive({
  name: 'John',
  age: 30,
  hobbies: ['reading', 'coding']
});

// 注册副作用函数
effect(() => {
  console.log(`Name: ${data.name}, Age: ${data.age}`);
});

effect(() => {
  console.log(`Hobbies count: ${data.hobbies.length}`);
});

// 修改数据，自动触发副作用函数
console.log('\n--- Modifying data ---');
data.name = 'Jane';  // 输出: Name: Jane, Age: 30
data.age = 25;       // 输出: Name: Jane, Age: 25

// 注意：直接调用 push 会触发两次更新（一次是 'push' 属性的访问，一次是 'length' 属性的修改）
data.hobbies.push('swimming'); // 输出: Hobbies count: 4

// 添加新属性
console.log('\n--- Adding/Deleting properties ---');
(data as any).city = 'New York';

// 删除属性
delete (data as any).age;     // 输出: Name: Jane, Age: undefined
```

这个例子展示了如何使用 Proxy 和 Reflect 实现一个基础的响应式系统，通过拦截对象的读取和设置操作，我们能够自动收集依赖并在数据变化时触发相应的更新，这种模式被广泛应用于现代前端框架中，如 Vue 3、MobX 等。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/23-proxy-reflect/index.ts)。
