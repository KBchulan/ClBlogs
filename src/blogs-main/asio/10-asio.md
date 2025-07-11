---
title: 10 引入protobuf序列化

article: true
order: 10
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-11

description: 介绍protobuf，并使用protobuf序列化包体
footer: Always coding, always learning
---

<!-- more -->

# 10 引入protobuf序列化

Protocol Buffers是一种轻量高效的序列化数据协议，TCP通信是面向字节流的，因此如果我们想传入一个结构化数据(如一个对象等)，需要将对象转换为字节流，而protobuf就是一种将结构化数据转换为二进制字节流的工具。

整体来说，protobuf的优点有：

1. **高效的序列化性能**：protobuf采用二进制格式，序列化和反序列化速度非常快，比JSON、XML等文本格式快很多倍。
2. **占用空间小**：由于采用二进制编码，protobuf生成的数据体积比JSON、XML等格式小很多，节省网络传输和存储空间。
3. **跨平台和语言支持**：protobuf支持多种编程语言（C++、Java、Python、Go、C#等），可以在不同平台间无缝通信。
4. **强类型系统**：protobuf提供了严格的类型检查，在编译时就能发现类型错误，提高了代码的可靠性。
5. **自动代码生成**：通过.proto文件定义数据结构，可以自动生成各种语言的代码，减少手工编写的工作量。

## 安装protobuf

在[c++环境配置](https://kbchulan.github.io/ClBlogs/blogs-main/cpp/01-intro.html)中，我们使用msys2的ucrt64环境，此处我们也基于此环境进行配置即可。

打开msys2终端，输入以下命令安装protobuf：

```bash
pacman -Syu

pacman -S mingw-w64-ucrt-x86_64-protobuf
```

这样就配置完成了，可以使用 `protoc --version` 命令查看protobuf的版本，笔者的版本为31.1，对应 vsc 插件建议使用 `vscode-proto3`。

## proto语法介绍

我们主要以c++的视角，与proto文件进行对比，此处只是简单介绍使用，更详细的还是要看一下[文档](https://protobuf.dev/)。

你可以把 **`.proto` 看作是一种语言无关的、用于定义数据结构的 "头文件"**，在这里只定义**数据结构**（`message`）和**服务接口**（`service`），而不涉及任何逻辑。

### message

`message` 是 Protobuf 中最基本的数据单元，可以类比为 C++ 中的 `struct` 或 `class`，它用来组织一组相关的字段，先看一个简单的例子：

```proto
// 语法声明：必须放在文件第一行，推荐使用 proto3，可以告诉编译器使用proto3语法
syntax = "proto3";

// 包名：类似于namespace，防止命名冲突，比较建议的命名规范有 公司.项目.模块
package person.data;

// 消息定义（Message）：类似于struct Person { ... };
message Person {
  // 字段定义格式：[修饰符] 类型 名称 = 字段编号;
  string name = 1;
  int32 id = 2;
  string email = 3;
};
```

我们主要介绍一下字段相关的部分：

* 类型：常用的有 `string`、`int32`、`int64`、`bool`、`float`、`double`、`bytes`(任意二进制数据，如图片)等。
* 字段编号：这是**最核心** 的概念，每个 message 中的字段编号必须是**唯一**的，且 **一旦确定并开始使用，就绝对不能更改！** 哪怕你删除了一个字段，也不能重用它的编号，且编号 1 到 15 使用 1 个字节编码，效率最高，应留给最常用的字段。

### 其他数据类型

除了上述我们介绍到的基本的数据类型，protobuf还支持一系列的高级数据类型。

#### 枚举 (Enum)

类似于 `enum class`，属于强类型枚举。

```proto
enum PhoneType {
  // proto3 的枚举第一个值必须是 0
  PHONE_TYPE_UNSPECIFIED = 0;
  MOBILE = 1;
  HOME = 2;
  WORK = 3;
}

message PhoneNumber {
  string number = 1;
  PhoneType type = 2;
}
```

#### 嵌套消息 (Nested Message)

也可以在一个消息内部再嵌套另外一个消息，就像c++中的结构体嵌套一样。

```proto
message Person {
  message Address { // 嵌套消息
    string street = 1;
    string city = 2;
    string country = 3;
  }

  string name = 1;
  int32 id = 2;
  Address address = 3; // 使用嵌套消息类型
}
```

#### 列表/数组 (Repeated Fields)

对于列表/数组，protobuf提供了 `repeated` 修饰符，可以定义一个列表/数组，操作和vector是很像的。

```proto
message Person {
  string name = 1;
  int32 id = 2;
  repeated string aliases = 3;
}
```

#### 映射 (Map)

经典键值对，写法和c++基本没有区别。

```proto
message Person {
  map<string, string> projects = 1;
}
```

### Service

protobuf 不仅可以定义数据，还可以定义 RPC (远程过程调用) 服务接口，类似于c++中的纯虚函数，可以通过声明的方式调用，这里我们简单介绍一下proto中的写法，具体如何通过RPC调用，在后续会有专门的一节介绍。

```proto
// 定义请求和响应消息
message SearchRequest {
  string query = 1;
  int32 page_number = 2;
}

message SearchResponse {
  repeated string results = 1;
}

// 定义服务
service SearchService {
  // rpc 方法名(请求消息) returns (响应消息);
  rpc Search(SearchRequest) returns (SearchResponse);
}
```

## 生成代码

我们以本节[最开始](https://kbchulan.github.io/ClBlogs/blogs-main/asio/10-asio.html#message)的message为例，来介绍一下生成和使用。

protobuf 的编译器 protoc 可以生成多种语言的代码，此处我们以c++为例，使用 `--cpp_out` 参数生成c++代码。

```bash
protoc --cpp_out=. ./person.proto
```

这样会生成一个 `person.pb.h` 和 `person.pb.cc` 文件，分别对应头文件和源文件，此时就可以像普通头文件一样使用了。

```cpp
#include "person.pb.h"

int main() {
  person::data::Person person;
  person.set_name("chulan");
  person.set_id(55);
  person.set_email("chulan@gmail.com");
}
```

这里演示了基本的 set 用法，除此以外还有 get 方法，以及序列化、反序列化以及一些其他的方法，看函数名就可以知道大概怎么用这个了。

