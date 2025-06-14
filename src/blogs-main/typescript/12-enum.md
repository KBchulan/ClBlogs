---
title: Enum
icon: placeholder
article: true
order: 12
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-07

description: 枚举，常量枚举相关介绍
footer: Always coding, always learning
---

<!-- more -->

## 基础枚举定义

ts 的枚举对应的是 C++11 后的强类型枚举，语法基本一致，编译成 js 会生成具体对象，包括数字枚举，字符串枚举，异构枚举：

### 数字枚举

数字枚举是最常见的枚举类型，如果不指定初始值，会从 0 开始自动递增：

```typescript
// 默认从0开始
enum Direction {
  Up,    // 0
  Down,  // 1
  Left,  // 2
  Right  // 3
}

// 指定起始值
enum Status {
  Pending = 1,  // 1
  Success,      // 2
  Failed        // 3
}

// 使用枚举
function move(direction: Direction): void {
  switch (direction) {
    case Direction.Up:
      console.log('向上移动')
      break
    case Direction.Down:
      console.log('向下移动')
      break
    case Direction.Left:
      console.log('向左移动')
      break
    case Direction.Right:
      console.log('向右移动')
      break
  }
}

move(Direction.Up) // 向上移动
```

### 字符串枚举

字符串枚举的每个成员都必须用字符串字面量初始化：

```typescript
enum Theme {
  Light = 'light',
  Dark = 'dark',
  Auto = 'auto'
}

enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE'
}

// 使用字符串枚举
function makeRequest(method: HttpMethod, url: string): void {
  console.log(`${method} ${url}`)
}

makeRequest(HttpMethod.GET, '/api/users') // GET /api/users
```

### 异构枚举

异构枚举混合了字符串和数字成员，但通常不推荐使用，杂糅起来总归是不太好的：

```typescript
enum Mixed {
  No = 0,
  Yes = 'YES',
  Maybe = 1
}
```

## 反向映射

数字枚举支持反向映射，可以通过值获取键名，这和 C++ 十分不同：

```typescript
// 反向映射
console.log(Color[4])       // 'Green' - 通过value访问key，这和c++十分不同
console.log(Color.Green)    // 4 - 通过key访问value

// 查看编译后的对象结构
enum Sample {
  A,
  B,
  C
}

// 编译后大致等价于，这就是反向映射的原理：
// var Sample = {
//   0: "A",
//   1: "B",
//   2: "C",
//   A: 0,
//   B: 1,
//   C: 2
// }

// 注意：字符串枚举不支持反向映射
enum StringEnum {
  A = 'a',
  B = 'b'
}
// console.log(StringEnum['a']) // undefined，不支持反向映射
```

## 常量枚举

使用 `const` 关键字定义的枚举，在编译时会被内联，不会生成实际的对象：

```typescript
// const枚举与普通枚举的区别
const enum Types {
  success,  // 0
  fail      // 1
}

let code: number = 0
if (code === Types.success) {
  console.log('操作成功')
}

// 编译后的代码大致为：
// if (code === 0 /* success */) {
//   console.log('操作成功')
// }
```

- 普通枚举：生成实际的枚举对象，支持反向映射
- const枚举：直接内联值，不生成对象，节省运行时开销

## 实际应用场景

枚举在实际开发中的常见应用：

```typescript
// HTTP 状态码
enum HttpStatus {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500
}

// API 响应处理
function handleResponse(status: HttpStatus): string {
  switch (status) {
    case HttpStatus.OK:
      return '请求成功'
    case HttpStatus.BadRequest:
      return '请求参数错误'
    case HttpStatus.Unauthorized:
      return '未授权访问'
    case HttpStatus.NotFound:
      return '资源未找到'
    case HttpStatus.InternalServerError:
      return '服务器内部错误'
    default:
      return '未知错误'
  }
}

// 游戏状态管理
const enum GameState {
  Menu,
  Playing,
  Paused,
  GameOver
}

class Game {
  private state: GameState = GameState.Menu

  start(): void {
    this.state = GameState.Playing
    console.log('游戏开始')
  }

  pause(): void {
    if (this.state === GameState.Playing) {
      this.state = GameState.Paused
      console.log('游戏暂停')
    }
  }

  resume(): void {
    if (this.state === GameState.Paused) {
      this.state = GameState.Playing
      console.log('游戏继续')
    }
  }

  gameOver(): void {
    this.state = GameState.GameOver
    console.log('游戏结束')
  }
}
```

## 小结

本节内容主要总结如下：

1. **数字枚举**：默认从 0 开始自动递增，支持反向映射
2. **字符串枚举**：每个成员必须显式初始化，不支持反向映射
3. **异构枚举**：混合数字和字符串，但不推荐使用
4. **反向映射**：数字枚举独有的特性，可以通过值获取键名
5. **常量枚举**：使用 `const` 修饰，编译时内联，节省运行时开销
6. **类型安全**：可以作为类型使用，提供编译时检查
7. **实际应用**：适用于状态管理、配置项、错误码等场景

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/12-enum/index.ts)。

