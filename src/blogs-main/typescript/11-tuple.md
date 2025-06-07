---
title: Tuple
icon: placeholder
article: true
order: 11
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-06

description: 元组相关介绍
footer: Always coding, always learning
---

<!-- more -->

## 基础元组定义

元组要求每个位置的类型都是固定的，并且长度也是固定的，不能越界访问：

```typescript
// 固定长度元组，每个位置类型固定，是不能越界的
let arr1: [number, string] = [123, 'aaa']

// 类型检查
arr1[0] = 'wrong' // 错误：不能将string赋值给number
arr1[1] = 789     // 错误：不能将number赋值给string
```

## 元组的不可变性

通过不同的声明方式，可以控制元组的可变性：

```typescript
// 如果我们不想让元组被修改呢
const arr2: [number, string] = [123, 'aaa']
// arr2 = []    // 错误：不能重新赋值
arr2[0] = 23    // 但是具体元素可以修改

// 完全只读的元组
const arr3: readonly [x: number, y?: string] = [123]
// arr3[0] = 456 // 错误：无法分配到 "0" ，因为它是只读属性
// arr3.push()   // 错误：类型"readonly [x: number, y?: string]"上不存在属性"push"
```

## 可选元素和命名元组

元组支持可选元素和为元素命名，这样比较容易阅读：

```typescript
// 可选元素
type Point2D = [x: number, y: number]
type Point3D = [x: number, y: number, z?: number]

const point2d: Point2D = [10, 20]
const point3d1: Point3D = [10, 20, 30]
const point3d2: Point3D = [10, 20]     // z是可选的

// 命名元组提高可读性
type UserInfo = [name: string, age: number, email?: string]
const user1: UserInfo = ['Alice', 25, 'alice@example.com']
const user2: UserInfo = ['Bob', 30]
```

## 实际应用场景

元组在实际开发中有很多应用场景，比如表格数据、坐标系统等：

```typescript
// 实例，如excel的二维表格
const excel: [string, string, number][] = [
  ['huaixi', 'man', 19],
  ['alice', 'woman', 25],
  ['bob', 'man', 30],
  ['charlie', 'man', 22]
]

excel.forEach(([name, gender, age]) => {
  console.log(`姓名: ${name}, 性别: ${gender}, 年龄: ${age}`)
})

// 函数返回多个值
function getNameAndAge(): [string, number] {
  return ['chulan', 20]
}
const [userName, userAge] = getNameAndAge()

// 状态管理（类似React的useState）
type State<T> = [T, (newValue: T) => void]

function useState<T>(initialValue: T): State<T> {
  let value = initialValue
  const setValue = (newValue: T) => {
    value = newValue
    console.log('State updated:', value)
  }
  return [value, setValue]
}
const [count, setCount] = useState(0)
setCount(1) // State updated: 1
```

## 类型推导和操作

TypeScript 提供了强大的元组类型推导和操作能力：

```typescript
// 类型推导
type first = typeof arr1[0]      // number
type length = typeof arr1['length'] // 2

// 元组类型操作
type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never
type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer T] ? T : []

type ExampleTuple = [string, number, boolean]
type FirstType = Head<ExampleTuple>  // string
type RestTypes = Tail<ExampleTuple>  // [number, boolean]

// 元组长度
type Length<T extends readonly unknown[]> = T['length']
type TupleLength = Length<ExampleTuple> // 3

// 实际应用：函数参数类型推导
function processData<T extends readonly unknown[]>(...args: T): T {
  console.log('Processing:', args)
  return args
}

const result = processData('hello', 42, true)
// result 的类型是 [string, number, boolean]
```

## 高级元组操作

元组还支持一些高级操作，如展开、合并等，直接上例子：

```typescript
// 元组展开
type Spread<T extends readonly unknown[]> = [...T]
type SpreadExample = Spread<[1, 2, 3]> // [1, 2, 3]

// 元组合并
type Concat<T extends readonly unknown[], U extends readonly unknown[]> = [...T, ...U]
type ConcatExample = Concat<[1, 2], [3, 4]> // [1, 2, 3, 4]

// 实际应用：参数合并
function combineArgs<T extends readonly unknown[], U extends readonly unknown[]>(
  first: T,
  second: U
): [...T, ...U] {
  return [...first, ...second]
}

const combined = combineArgs([1, 'hello'], [true, 42])
// combined 的类型是 [number, string, boolean, number]
```

## 小结

读完上文，应该可以看出元组还是很有用的吧，这里我们回顾一下：

1. **固定长度**：元组的长度在定义时就确定，不能动态改变
2. **类型固定**：每个位置的元素类型都是固定的，提供强类型约束
3. **可选元素**：支持可选元素，增加使用灵活性
4. **命名元组**：可以为元素命名，提高代码可读性
5. **只读支持**：通过 `readonly` 创建不可变元组
6. **类型推导**：强大的类型推导和操作能力
7. **实际应用**：适用于表格数据、多返回值、状态管理等场景

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/11-tuple/index.ts)。


