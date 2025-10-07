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

在前后端通信以及分布式服务器通信中，我们通常使用 json、xml、二进制数据等方式进行数据传输，相应的，我们会使用一些常见的 API 架构，便于交互双方容易从这些数据中解析出需要的数据。

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
