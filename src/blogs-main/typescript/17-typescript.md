---
title: 17 泛型

article: true
order: 17
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-25

description: ts 中的泛型相关内容
footer: Always coding, always learning
---

<!-- more -->

# Template

本节我们来介绍一下 ts 中的泛型，能够帮助我们创建可重用的组件，同时保持类型安全，和 c++ 中的模板比较像的。

## 泛型函数

首先让我们看看如何在函数中使用泛型。泛型允许我们在定义函数时不指定具体的类型，而是在调用时才确定类型：

```typescript
const huaixi = <Type>(a: Type, b: Type): Array<Type> => {
  return [a, b]
}

// 调用时可以显式指定类型
let result1 = huaixi<string>('hello', 'world')  // Type 为 string
let result2 = huaixi<number>(1, 2)              // Type 为 number

// 也可以让 ts 自动推断类型
let result3 = huaixi('hello', 'world')  // 推断 Type 为 string
```

## 泛型类型别名和接口

除了函数，`type` 和 `interface` 也都可以使用泛型：

### 泛型类型别名

```typescript
type A<Type> = string | number | Type
let a: A<boolean> = true  // 此时 A 的完整类型是 string | number | boolean
```

### 泛型接口

```typescript
interface Person<Type, Upe> {
  msg: Type
  data: Upe
}

let person: Person<string, number> = {
  msg: 'aaa',
  data: 123
}
```

## 多参数泛型和默认泛型

常见的多参数泛型和默认泛型都是老生常谈了，这里简单演示一下：

```typescript
function add<T = number, U = number>(a: T, b: U) {
  return [a, b]
}

// 使用默认类型
let result1 = add(1, 2)           // T 和 U 都是 number
// 指定部分类型
let result2 = add<string>(1, 2)   // T 是 string，U 是默认的 number
// 指定所有类型
let result3 = add<string, boolean>('hello', true)  // T 是 string，U 是 boolean
```

## 实际应用示例

让我们通过一个模拟 axios 的例子来看看泛型在实际开发中的应用：

```typescript
const axios = {
  get<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      let xhr: XMLHttpRequest = new XMLHttpRequest()
      xhr.open('GET', url)
      xhr.onreadystatechange = () => {
        if (xhr.readyState == 4 && xhr.status == 200) {
          resolve(JSON.parse(xhr.responseText))
        }
      }
      xhr.send(null)
    })
  }
}

interface Data {
  msg: string
  code: number
}

// 当我们指定泛型时，axios.get<Data>会将Data作为T的类型，这样就会有代码提示了
axios.get<Data>('https://api.example.com/data').then(res => {
  console.log(res.msg)
  console.log(res.code)
})
```

在这个例子中，泛型 `T` 让我们能够：
1. 在编译时就知道返回数据的类型结构
2. 获得完整的代码提示和自动补全
3. 在开发阶段就发现类型错误，而不是等到运行时

## 小结

泛型是 ts 中的核心特性之一：

1. **函数泛型**：使函数能够处理多种类型，同时保持类型安全
2. **类型别名和接口泛型**：创建灵活的类型定义
3. **默认泛型**：为泛型参数提供默认值，简化使用
4. **实际应用**：在 API 调用、数据处理等场景中提供强类型支持

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/17-template/index.ts)。

