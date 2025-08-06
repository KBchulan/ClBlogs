---
title: 24 泛型工具
article: true
order: 24
star: false
category:
  - 语言
tag:
  - typescript
date: 2025-08-06
description: 介绍 ts 中常用的泛型工具类型，用于处理类型转换和操作。
footer: Always coding, always learning
---

<!-- more -->

# 24 泛型工具类型介绍

ts 提供了许多内置的泛型工具类型，它们可以帮助我们更灵活地处理类型转换和操作，本节将介绍一些最常用和最实用的工具类型。

首先，我们定义一个基础接口，后续的工具类型将围绕它进行操作。

```typescript
interface User {
  name: string
  age: number
  email: string
}
```

## `Partial<T>`

`Partial<T>` 可以将一个类型 `T` 的所有属性都变为可选的。

```typescript
// 所有成员都变为可选
type PartialUser = Partial<User>

// 相当于：
// {
//   name?: string;
//   age?: number;
//   email?: string;
// }
```

## `Required<T>`

与 `Partial<T>` 相反，`Required<T>` 会将一个类型 `T` 的所有属性都变为必选的。

```typescript
// 使用 Required 将所有成员变为必选
type RequiredUser = Required<PartialUser>

// 相当于：
// {
//   name: string
//   age: number
//   email: string
// }
```

## `Pick<T, K>`

`Pick<T, K>` 允许我们从一个现有类型 `T` 中选择一部分属性 `K`，来创建一个新的类型，即保留部分属性。

```typescript
// 只选择 'name' 和 'email' 属性
type PickUser = Pick<User, 'name' | 'email'>

// 相当于：
// {
//   name: string;
//   email: string;
// }
```

## `Omit<T, K>`

`Omit<T, K>` 与 `Pick<T, K>` 相反，它会从一个类型 `T` 中排除指定的属性 `K`，然后返回一个新类型。

```typescript
// 排除 'age' 和 'email' 属性
type OmitUser = Omit<User, 'age' | 'email'>

// 相当于：
// {
//   name: string;
// }
```

## `Exclude<T, U>`

`Exclude<T, U>` 用于从一个联合类型 `T` 中排除可以赋值给 `U` 的类型，返回一个新的联合类型。

```typescript
// 从 User 的所有键中排除 'age'
type ExcludeUserKeys = Exclude<keyof User, 'age'> // "name" | "email"
```

## `Record<K, T>`

`Record<K, T>` 用于创建一个对象类型，其属性键为 `K` 类型，属性值为 `T` 类型，其中创建的对象必须包含所有 K 键。

```typescript
type UserRecord = Record<keyof User, string>

// 相当于：
// {
//   name: string;
//   age: number;
//   email: string;
// }
```

## `ReturnType<T>`

`ReturnType<T>` 用于获取一个函数类型的返回值类型。

```typescript
const getArr = () => [1, 2, 3]

// 获取 getArr 函数的返回值类型
type ArrType = ReturnType<typeof getArr> // number[]
```

## 小结

本节主要介绍了如下的泛型工具类型，这些东西实现起来也很简单，无需特别记忆。

1.  **`Partial<T>`**: 将所有属性变为可选。
2.  **`Required<T>`**: 将所有属性变为必选。
3.  **`Pick<T, K>`**: 从类型中选择指定的属性。
4.  **`Omit<T, K>`**: 从类型中排除指定的属性。
5.  **`Exclude<T, U>`**: 从联合类型中排除某些类型。
6.  **`Record<K, T>`**: 创建具有特定键和值类型的对象类型。
7.  **`ReturnType<T>`**: 获取函数的返回值类型。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/24-generic-utility/index.ts)。
