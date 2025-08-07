---
title: 01 SSE
article: true
order: 1
star: true

category:
  - 杂货铺

tag:
  - mystore

date: 2025-06-16

description: 关于 sse 的初步使用，支持 get 和 自定义 post 请求
footer: Always coding, always learning
---

<!-- more -->

# 初识 SSE

`Server Sent Events`，简称 SSE，是一种 HTML5 标准技术，允许服务器单向、持续地向客户端推送数据。核心特点是 **服务器到客户端的单向通信：** 一旦连接建立，只有服务器能向客户端发送数据，客户端不能通过这个连接向服务器发送数据。

## 与 WebSocket 的区别

简单来说，SSE 就像是一个 **收音机**，当连接到广播的时候，就可以一直收听，而 WebSocket 则像是一个 **电话**，连接后可以双向通话，我们从以下方面来对比这两者：

| 特性       | SSE                                  | WebSocket                                                       |
| ---------- | ------------------------------------ | --------------------------------------------------------------- |
| 通信方向   | 单向(服务器 -> 客户端)               | 双向(客户端 <-> 服务器)                                         |
| 底层协议   | 基于标准的**HTTP/HTTPS**       | 上层是**ws://** 或 **wss://**，核心是 **TCP** |
| 断线重连   | 自动重连，浏览器原生支持             | 需要手动实现重连逻辑(心跳检测，异常重连)                        |
| 数据格式   | 文本格式(通常是**UTF-8** 编码) | 二进制或文本格式(如**JSON**、**Protobuf** 等)       |
| 兼容性     | 广泛支持，因为本质就是**HTTP** | 现代浏览器支持较好，旧浏览器看运气支持                          |
| 错误处理   | 简单，通过 `onerror` 等事件处理    | 复杂，需要监听 `onclose`、`onerror` 等事件                  |
| 连接数限制 | 占用一个 HTTP 连接名额(通常是 6 个)  | 基本没有限制                                                    |

到此，应该对 SSE 有了初步的了解，接下来我们来看看如何使用它。

## Get 请求示例

### 基本使用

首先先看一下服务端的代码，有一些固定格式，我都标注在注释中了，要注意 **响应头** 和 **数据格式**。

```javascript
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())

app.get('/sse', (req, res) => {
  // SSE 必须用这个响应头
  res.setHeader('Content-Type', 'text/event-stream')
  // 基于 HTTP 1.1 实现，必须设置为长连接
  res.setHeader('Connection', 'keep-alive')

  setInterval(() => {
    // 同时必须是 write 发送，send和json都不可以
    res.write(`data: ${Math.random()}\n\n`)  // data: 数据\n\n
  }, 1000)
})

app.listen(3000, () => {
  console.log('server is running on http://localhost:3000')
})
```

然后是前端的代码，使用 `EventSource` 来接收数据，写起来也是非常的简单。

```typescript
const sse: EventSource = new EventSource("http://localhost:3000/sse")

sse.addEventListener("message", (event) => {
  console.log("Received message:", event.data);
})
```

### 自定义ID

此时我们打开控制台看一下网络会发现 **sse** 的类型是 message, ID是空的，我们如果想修改这两个参数该怎么做呢？事实上也很简单：

```javascript
// 服务端
setInterval(() => {
    res.write('event: random\n')            // event: 事件名称\n
    res.write(`id: ${Math.random()}\n`)     // id: 事件 ID\n
    res.write(`data: ${Math.random()}\n\n`) // data: 数据\n\n
  }, 1000)

// 客户端
sse.addEventListener("random", (event) => {
  console.log("Received message:", event.data);
})
```

### 流式渲染

此时前端收到的数据是一个一个数据进行渲染的，我们可以使用栈搞成流式渲染到前端网页上。

```typescript
const sse: EventSource = new EventSource("http://localhost:3000/sse")
const content: HTMLDivElement = document.getElementById("content") as HTMLDivElement

const arr: string[] = []
sse.addEventListener("random", (event) => {
  console.log("Received message:", event.data)
  arr.push(...(event.data as string).split(''))
  content.innerHTML += arr.shift()
})
```

## Post 请求示例

事实上，我们会选择 `@microsoft/fetch-event-source` 这个库来完成post或者更多的需求，这里算是写的一个玩具，服务器部分直接修改为 post，其他保持不变，前端部分用 fetch 模拟一下：

```typescript
async function startSSE() {
  const response = await fetch('http://localhost:3000/sse', {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: "Hello, server!"
    })
  })

  // 我们的数据都会在 response.body的reader 中
  const reader = response.body?.getReader()

  const decoder = new TextDecoder("utf-8")
  while (true) {
    const { done, value } = await reader!.read()

    if (done) {
      break
    }

    const data = decoder.decode(value, { stream: true })
    const arr = data.split('\n')
    arr.pop()
    arr.pop()
    for (let value of arr) {
      if (value.startsWith('data: ')) {
        content.innerHTML += value.split(': ')[1]
      }
    }
  }
}
```

## 题外话

前后端实时通信的方法主要有4种：`短轮询`、`长轮询`、`SSE` 和 `WebSocket`。本来Http2的push也是这么一种方式，但是Google 103放弃了这个API，除此以外，其实还有 [WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport) 这个实验性API可以做到，一个基于 UDP(HTTP/3) 的新玩意，现在的话了解一下就好了。

本节代码详见 [此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/pages-other/mystore/sse/index.ts)
