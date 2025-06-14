---
title: Array

article: true
order: 6
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-05

description: 数组的相关介绍，以及一些琐碎的知识点，不包括数组方法
footer: Always coding, always learning
---

<!-- more -->

数组是什么东西，应该无需多言了，这里介绍一下怎么定义，内置方法给出[MDN链接](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at)，方便查阅。

## 常见方式

使用 `type[]` 定义数组，`type` 可以是任意类型，包括原始类型、联合类型、接口等。

```typescript
let arr1: number[] = [1, 2, 3]
let arr2: string[] = ['a', 'b', 'c']
let arr3: boolean[] = [true, false]
let arr4: symbol[] = [Symbol(), Symbol()]
let arr5: bigint[] = [2n ** 1024n, 900n ** 1024n]
```

## 泛型方式

使用 `Array<T>` 泛型语法，功能与上面等价：

```typescript
let a1: Array<number> = [1, 2, 3]
let a2: Array<string> = ['a', 'b', 'c']
```

## 联合数组

当数组需要包含多种类型时，可以使用联合类型：

```typescript
let arr6: (number | string)[] = [1, 'a', 2, 'b']
let arr7: Array<number | string> = [1, 'a', 2, 'b']
```

## 对象数组

结合接口定义对象数组，确保数组中每个对象都符合指定结构：

```typescript
interface IUser {
  name: string
  age: number
}

let arr8: IUser[] = [
  { name: '张三', age: 18 },
  { name: '李四', age: 20 }
]
```

## 多维数组

TypeScript 当然支持多维数组的类型定义：

```typescript
let arr9: number[][] = [[1, 2, 3], [4, 5, 6]]
let arr10: Array<Array<number>> = [[1, 2, 3], [4, 5, 6]]
```

## 参数数组

使用剩余参数语法处理不定数量的参数，这个比较常用于我们的模板工具：

```typescript
let a5 = (...args: number[]) => {
  console.log(args)
}
a5(1, 2, 3) // [1, 2, 3]
```

## 补充知识点

### 展开/收集运算符 (...)

`...` 运算符在不同场景下有不同作用：

```typescript
// 作为参数时表示收集
function collect(...args: number[]) {
  // args 是所有传入参数组成的数组
}

// 调用时表示展开
let tmp1: number[] = [1, 2, 3]
let tmp2: number[] = [...tmp1, 4, 5]
console.log(tmp2)  // [1, 2, 3, 4, 5]
```

### arguments 对象

`arguments` 是包含所有函数参数的伪数组对象，只在function中有，箭头函数是没有的：

```typescript
function a6(...args: any[]) {
  console.log(arguments)         // [Arguments] { '0': 1, '1': true }
  // let a: any[] = arguments    // 错误：arguments不是真正的数组
  let a: IArguments = arguments  // 正确：使用IArguments内置接口
}
```

### 数组遍历方法

下面给出几种常用的遍历方法，不只是针对数组的：

```typescript
const arr11: number[] = [1, 2, 3]

// 1. 传统 for 循环
for (let i = 0; i < arr11.length; i++) {
  console.log(arr11[i])
}

// 2. for...in 遍历索引
for (const key in arr11) {
  console.log(arr11[key])
}

// 3. for...of 遍历值
for (const item of arr11) {
  console.log(item)
}

// 4. forEach 方法
arr11.forEach((value, index, arr) => {
  console.log(value, index, arr)
})

// 5. entries 迭代器(还有keys和values)
for (const [index, value] of arr11.entries()) {
  console.log(`index: ${index}, value: ${value}`)
}
```

## 小结

数组在任何一门语言里都是很重要的结构，值得好好看看：

1. **基本定义**：支持原始类型、泛型、联合类型等多种定义方式
2. **对象数组**：结合接口确保类型安全
3. **多维数组**：支持任意维度的数组嵌套
4. **函数参数**：使用剩余参数处理不定数量参数

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/06-array/index.ts)。

