---
title: 20 gRPC框架介绍
article: true
order: 20
star: true
category:
  - 网络
tag:
  - asio
date: 2025-08-03
description: 介绍常用的API框架，并给出gRPC的基本使用
footer: Always coding, always learning
---

<!-- more -->

# 20 gRPC框架介绍

在前后端通信以及分布式服务器通信中，我们通常使用 json、xml、二进制数据等方式进行数据传输，相应的，我们会使用一些常见的 API 架构，便于交互双方容易从这些数据中解析出需要的数据，此处我们先介绍一下常见的API架构。

## API架构介绍

本处我们介绍的只是各个 API 架构的场景和应用方式，本节我们只会展开对gRPC的使用介绍。

### 基于HTTP的标准化API架构

* **RESTful API (Representational State Transfer)**

  * **描述**：一种基于HTTP协议的架构风格，将网络中的每个资源都看作是一个可以通过统一接口访问的对象，REST强调无状态、可缓存、统一接口等约束条件。
  * **特点**：
    * 数据格式：主要使用JSON，也支持XML。
    * 通信方式：请求-响应模式，无状态。
    * HTTP方法：GET（获取）、POST（创建）、PUT（更新）、DELETE（删除）、PATCH（部分更新）。
    * 优点：简单易懂、标准化程度高、缓存友好、可扩展性好。
    * 缺点：可能存在over-fetching（获取多余数据）或under-fetching（数据不足需要多次请求）问题。
  * **使用场景**：Web应用、移动应用、公开API服务，是目前最主流的API架构风格。

* **GraphQL**

  * **描述**：由Facebook开发的查询语言和运行时，允许客户端精确指定需要的数据结构。与REST不同，GraphQL只有一个端点，客户端通过查询语句描述所需数据。
  * **特点**：
    * 数据格式：JSON。
    * 通信方式：客户端驱动的查询，通常使用POST请求。
    * 优点：避免over-fetching和under-fetching、强类型系统、实时订阅。
    * 缺点：学习曲线较陡、缓存复杂、查询复杂度控制困难。
  * **使用场景**：复杂的前端应用、移动应用、需要灵活数据获取的场景。

### 基于远程过程调用的风格

gRPC 是 RPC 的现代实现，但这个概念本身很早就有了。

* **JSON-RPC**

  * **描述**：一个非常轻量级的远程过程调用协议，它规定了调用的数据结构（使用 JSON），但对应用层没有限制（通常使用 HTTP）。
  * **特点**：
    * 数据格式：JSON。
    * 通信方式：请求-响应。
    * 优点：极其简单，规范清晰，跨语言支持好。
    * 缺点：功能集非常有限，没有内置的服务发现、类型安全等高级功能。
  * **使用场景**：简单的内部服务通信、需要快速实现且功能要求不高的场景。

* **XML-RPC**

  * **描述**：JSON-RPC 的前身，使用 XML 作为编码格式，它是 SOAP 协议的早期简化版本。
  * **特点**：
    * 数据格式：XML。
    * 优点：比 SOAP 简单。
    * 缺点：相比 JSON-RPC，XML 更冗长，解析更慢。
  * **使用场景**：维护一些非常古老的遗留系统，新的项目就不要用了吧，还是用 grpc 比较好。

### 面向传统企业和遗留系统

* **SOAP (Simple Object Access Protocol)**
  * **描述**：一个非常严格、基于 XML 的协议，曾经是 Web 服务的主流标准，它拥有许多扩展如 WS-Security（安全）、WS-Transaction（事务）等。
  * **特点**：
    * 数据格式：XML。
    * 通信方式：请求-响应，但协议本身非常复杂。
    * 优点：标准化程度高，有严格的契约（通过 WSDL 文件定义），内置了安全、事务、寻址等企业级功能。
    * 缺点：极其冗长，性能差，配置和使用复杂。
  * **使用场景**：银行、金融、保险等需要高安全性和事务一致性的传统企业级应用，以及与旧系统集成。

### 事件驱动和实时通信架构

这类架构与请求-响应模型有根本不同，它们更关注“事件”和“消息”。

* **WebSockets**

  * **描述**：一种在单个 TCP 连接上进行全双工（full-duplex）通信的协议，连接一旦建立，客户端和服务器可以随时互相发送数据，无需每次都发起新的 HTTP 请求。
  * **特点**：
    * 通信方式：持久化、双向实时通信。
    * 优点：低延迟，开销小，非常适合实时应用。
    * 缺点：管理连接状态比无状态的 REST 更复杂。
  * **使用场景**：在线聊天室、实时数据看板、在线协作工具（如 Google Docs）、多人在线游戏。

* **Webhooks (也称为“反向 API”)**

  * **描述**：一种事件驱动的模式，当某个事件在服务器端发生时，由服务器主动向客户端预先配置的 URL 发送一个 HTTP POST 请求来通知它。
  * **特点**：
    * 通信方式：事件驱动的单向推送（Server -> Client）。
    * 优点：实时性好，避免了客户端不断轮询来检查状态，节省资源。
    * 缺点：需要客户端暴露一个公网可访问的端点，且需要处理失败重试、安全验证等问题。
  * **使用场景**：CI/CD 流程（如 GitHub 在代码 push 后通知 Jenkins 构建）、支付网关（如 Stripe 在支付成功后通知商城）、第三方应用集成。

* **消息队列 (Message Queues)**

  * **描述**：这不是一个单一的协议，而是一类架构模式，服务之间不直接通信，而是通过一个中间件（消息代理，如 RabbitMQ, Kafka, ActiveMQ）来传递消息：生产者将消息放入队列，消费者从队列中取出并处理。
  * **常见协议**：
    * **AMQP (Advanced Message Queuing Protocol)**：一个功能丰富的协议，支持多种消息模式（如点对点、发布/订阅），提供可靠的消息传递。
    * **MQTT (Message Queuing Telemetry Transport)**：一个极其轻量级的发布/订阅协议，专为低带宽、不稳定的网络环境设计。
  * **特点**：
    * 通信方式：异步、解耦。
    * 优点：系统解耦、削峰填谷、异步处理、提高系统弹性和可伸缩性。
    * 缺点：增加了系统复杂度和运维成本（需要维护消息中间件）。
  * **使用场景**：
    * **AMQP**: 复杂的企业级后台任务处理、金融系统。
    * **MQTT**: 物联网（IoT）设备通信、移动消息推送。

## gRPC简介

gRPC是google开发的一个RPC框架，它可以让我们像调用本服务的一个函数一样调用远程的服务端点，采用 protobuf 作为消息格式，这样就可以生成不同语言的一个文件，我们把这些文件放在对于项目里，采用proto中定义的rpc格式进行传递即可调用到其他的服务。

因此核心在于proto的设计，这个在[protobuf序列化](https://kbchulan.github.io/ClBlogs/blogs-main/asio/10-asio.html#proto%E8%AF%AD%E6%B3%95%E4%BB%8B%E7%BB%8D)中已经介绍过了，可以去再回顾一下。

### 安装

依旧是打开msys2终端，输入如下命令即可安装：

```bash
pacman -S mingw-w64-ucrt-x86_64-grpc
```

### 基本使用

下面我们从一个简单的 proto 文件开始，逐步展示如何生成代码、构建并运行一个 gRPC 的服务端和客户端。

#### 定义服务

首先，我们需要创建一个 `.proto` 文件来定义我们的服务，具体写法依旧可以参考[先前介绍](https://kbchulan.github.io/ClBlogs/blogs-main/asio/10-asio.html#service)。

**demo.proto**
```proto
syntax = "proto3";

package hello;

message HelloRequest {
  string req = 1;
}

message HelloResponse {
  string rsp = 1;
}

service HelloEndpoint {
  rpc SayHello(HelloRequest) returns (HelloResponse);
}
```

#### 生成代码

打开msys2终端，如果配置了path，打开ps也可以，执行如下命令

```bash
# --cpp_out=. 指定生成 protobuf C++ 代码的目录
# --grpc_out=. 指定生成 gRPC C++ 代码的目录
# --plugin=protoc-gen-grpc=... 指定 gRPC C++ 插件的位置
protoc ./demo.proto --cpp_out=. --grpc_out=. --plugin=protoc-gen-grpc="C:\msys64\ucrt64\bin\grpc_cpp_plugin.exe"
```

执行成功后，你会得到四个文件：
* **demo.pb.h** 、**demo.pb.cpp** ：包含了 protobuf 消息的 C++ 类，负责消息的序列化和反序列化。
* **demo.grpc.pb.h** 、**demo.grpc.pb.cpp**：包含了 gRPC 的客户端和服务端代码。
    * **服务端**：一个抽象基类 `HelloEndpoint::Service`，里面将proto的rpc方法表达为虚函数，我们需要继承它并实现此函数。
    * **客户端**：一个名为 `HelloEndpoint::Stub` 的类（通常称为存根），客户端通过它来调用服务端的rpc方法。

#### grpc服务端

现在我们来编写服务端代码。服务端的职责是：
1. 实现 `HelloEndpoint::Service` 接口中定义的业务逻辑。
2. 启动一个 gRPC 服务器，监听来自客户端的请求。

**server.cpp**

```cpp
#include "demo.grpc.pb.h"

#include <grpcpp/grpcpp.h>
#include <grpcpp/support/status.h>
#include <grpcpp/security/server_credentials.h>

#include <print>
#include <memory>

class DemoServiceImpl final : public hello::HelloEndpoint::Service {
public:
  // 实现此虚函数
  grpc::Status SayHello(grpc::ServerContext* context, const hello::HelloRequest* request, hello::HelloResponse* response) {
    response->set_rsp("Server1 response: " + request->req());
    return grpc::Status::OK;
  }
};

void startServer() {
  std::string server_address("0.0.0.0:50051");

  // 创建builder，配置选项
  grpc::ServerBuilder builder;
  builder.AddListeningPort(server_address, grpc::InsecureServerCredentials()); // 不需要校验

  // 注册服务
  DemoServiceImpl service;
  builder.RegisterService(&service);

  // 创建一个服务
  std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
  std::print("Server listening on {}\n", server_address);
  server->Wait();
}

int main() {
  startServer();
}
```

#### grpc客户端

客户端的职责是连接到 gRPC 服务器，并像调用本地函数一样调用远程方法。

**client.cpp**
```cpp
#include "demo.grpc.pb.h"
#include "demo.pb.h"

#include <grpcpp/channel.h>
#include <grpcpp/create_channel.h>
#include <grpcpp/grpcpp.h>
#include <grpcpp/support/status.h>
#include <memory>

class DemoClient {
public:
  DemoClient(std::shared_ptr<grpc::Channel> channel)
    : _stub(hello::HelloEndpoint::NewStub(channel)) {}

  std::string SayHello(const std::string& name) {
    hello::HelloRequest request;
    request.set_req(name);

    // 响应对象
    hello::HelloResponse response;

    // 创建上下文
    grpc::ClientContext context;

    // 调用远程方法
    grpc::Status status = _stub->SayHello(&context, request, &response);

    if (status.ok()) {
      return response.rsp();
    } else {
      std::cerr << "RPC failed: " << status.error_message() << std::endl;
      return "";
    }
  }

private:
  std::unique_ptr<hello::HelloEndpoint::Stub> _stub;
};

void RunClient() {
  // 创建 rpc 通道
  auto channel = grpc::CreateChannel("localhost:50051", grpc::InsecureChannelCredentials());

  // 创建客户端
  DemoClient client(channel);

  std::string reply = client.SayHello("chulan");
  if (!reply.empty()) {
    std::cout << "Server replied: " << reply << std::endl;
  } else {
    std::cout << "Failed to get a valid response from server." << std::endl;
  }
}

int main() {
  RunClient();
}
```

补充一下这个stub的认知，当我们通过 stub 调用远程方法时，gRPC 库在底层将你的请求序列化成 protobuf 格式，通过 HTTP/2 发送给服务器，然后接收响应并反序列化，最后将结果返回给客户端，但是对我们使用上来说，基本是无感知的调用本地函数的感觉。

## 总结

由于grpc库采用的是二进制数据传输，因此它的性能是极快的，但是如果是多个连接，我们需要在服务器这边处理并发，有的时候又不如传统的restful，整体来说，这是一个非常优秀的API架构，如果需要高性能、分布式服务时可以优先考虑使用这个。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/20-grpc/server1/server1.cc)。
