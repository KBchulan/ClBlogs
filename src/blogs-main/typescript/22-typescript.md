---
title: 22 Map, Set

article: true
order: 22
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-08-06

description: 介绍 ES6 引入的四种数据结构：Map, Set, WeakMap, 和 WeakSet，以及它们在ts中的应用场景。
footer: Always coding, always learning
---

<!-- more -->

# 22 Map, Set

ES6 引入了四种新的数据结构，在其他语言中我们也是经常使用，分别是 `Map`、`Set`、`WeakMap` 和 `WeakSet`，这些结构为特定的编程问题提供了更高效、更清晰的解决方案。

## Map

`Map` 是一种键值对的集合，与普通对象 (`{}`) 最大的不同在于，`Map` 的键可以是**任意类型**的值（包括对象、函数等），而不仅仅是原始类型。

### 基本使用

`Map` 提供了一系列简洁的 API 来操作数据。

```typescript
// 创建一个 Map
const map = new Map<string | object, any>();

// 1. set(key, value): 添加或更新键值对
const user = { id: 1, name: "chulan" };
map.set('name', 'cl');
map.set('age', 20);
map.set(user, { role: 'admin' });

console.log(map); // Map(3) { 'name' => 'cl', 'age' => 20, { id: 1, name: 'chulan' } => { role: 'admin' } }

// 2. get(key): 获取值
console.log(map.get('name')); // cl
console.log(map.get(user)); // { role: 'admin' }

// 3. has(key): 判断键是否存在
console.log(map.has('age')); // true
console.log(map.has('gender')); // false

// 4. delete(key): 删除键值对
map.delete('age');
console.log(map.has('age')); // false

// 5. size: 获取 Map 的大小
console.log(map.size); // 2

// 6. clear(): 清空 Map
map.clear();
console.log(map.size); // 0
```

### 遍历

`Map` 是可迭代的，可以使用 `for...of` 循环或 `forEach` 方法进行遍历。

```typescript
const map = new Map<string, number>();
map.set('one', 1);
map.set('two', 2);

// 遍历键值对
for (let [key, value] of map) {
  console.log(`${key}: ${value}`);
}
// one: 1
// two: 2

// 遍历值
for (let value of map.values()) {
  console.log(value);
}
// 1
// 2

// 遍历键
for (let key of map.keys()) {
  console.log(key);
}
// one
// two
```

## Set

`Set` 是一种值的集合，其中的每个值都必须是**唯一的**，它类似于数组，但其成员不允许重复。

### 基本使用

`Set` 最常见的用途是数组去重，注意，引用类型是不受控制的。

```typescript
// 1. 创建 Set，重复的值会被自动忽略
const set = new Set([1, 2, 3, 3, 4, 5, 5]);
console.log(set); // Set(5) { 1, 2, 3, 4, 5 }

// 2. add(value): 添加新值
set.add(6);
set.add(1); // 重复添加无效
console.log(set); // Set(6) { 1, 2, 3, 4, 5, 6 }

// 3. has(value): 判断值是否存在
console.log(set.has(3)); // true

// 4. delete(value): 删除值
set.delete(3);
console.log(set.has(3)); // false

// 5. size: 获取 Set 的大小
console.log(set.size); // 5

// 6. clear(): 清空 Set
set.clear();
```

### 数组去重

利用 `Set` 的唯一性，可以非常方便地为数组去重。

```typescript
const numbers = [1, 2, 3, 4, 4, 5, 5, 6];
const uniqueNumbers = [...new Set(numbers)];
console.log(uniqueNumbers); // [1, 2, 3, 4, 5, 6]
```

## WeakMap

`WeakMap` 与 `Map` 类似，也是键值对的集合。但它有几个关键区别：
1.  **键必须是引用类型**，不能是原始类型值。
2.  **键是弱引用**。这意味着如果一个对象作为 `WeakMap` 的键，并且没有其他地方引用这个对象，那么垃圾回收机制会自动回收该对象，`WeakMap` 中对应的键值对也会被自动移除。

这个特性使得 `WeakMap` 非常适合用来存储与对象相关的临时数据，而不用担心内存泄漏。

```typescript
let weakMap = new WeakMap();
let user = { name: 'chulan' };

// 将 user 对象作为键
weakMap.set(user, { loginCount: 1 });

console.log(weakMap.get(user)); // { loginCount: 1 }

// 当 user 对象的引用消失时，垃圾回收器会清理它
user = null;
```

在某个时间点后，weakMap 中的条目会自动消失（具体时间由垃圾回收决定），因此 WeakMap 无法被遍历，也没有 size 属性。

## WeakSet

`WeakSet` 与 `Set` 类似，但同样具有弱引用的特性：
1.  **成员必须是对象**。
2.  **成员是弱引用**。如果一个对象只在 `WeakSet` 中被引用，它同样会被垃圾回收。

`WeakSet` 通常用于跟踪一组对象，而不会阻止它们被垃圾回收。

```typescript
let weakSet = new WeakSet();
let user1 = { id: 1 };
let user2 = { id: 2 };

weakSet.add(user1);
weakSet.add(user2);

console.log(weakSet.has(user1)); // true

// 同样，当 user1 的引用消失时，它会从 WeakSet 中被自动移除
user1 = null;

// WeakSet 同样不可遍历，也没有 size 属性
```

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/22-map-set/index.ts)。
