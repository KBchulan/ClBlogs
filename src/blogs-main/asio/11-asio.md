---
title: 11 引入jsoncpp序列化

article: true
order: 11
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-13

description: 基于 jsoncpp 修改字节序的服务器，实现对包体的序列化
footer: Always coding, always learning
---

<!-- more -->

# 11 引入jsoncpp序列化

JsonCpp 是一个轻量级的 C++ JSON 解析库，用于读写 JSON 数据，可以把我们的对象转换为 JSON 字符串，也可以把 JSON 字符串转换为对象。相比于 protobuf 的二进制格式，JSON 是一种文本格式，具有良好的可读性和广泛的支持。在 Web 开发和 API 通信中，JSON 是最常用的数据交换格式。

整体来说，JsonCpp 的优点有：

1. **易于阅读和调试**：JSON 是文本格式，人类可读，便于调试和日志记录。
2. **跨语言支持**：几乎所有编程语言都支持 JSON，是 Web API 的标准格式。
3. **轻量级**：JsonCpp 库体积小，依赖少，易于集成。
4. **灵活性强**：支持动态类型，可以处理结构不固定的数据。
5. **Web 友好**：与 JavaScript 原生兼容，是 Web 开发的首选格式。

## 安装JsonCpp

操作和上一节配置protobuf一样，打开msys2终端，输入以下命令安装JsonCpp：

```bash
pacman -Syu

pacman -S mingw-w64-ucrt-x86_64-jsoncpp
```

这样就配置完成了，可以随便创一个cpp文件，看一下 clangd 是不是可以智能感知补全 `<json/json.h>`。

## JSON介绍

JSON（JavaScript Object Notation）是一种轻量级的数据交换格式，语法简洁明了。我们主要以 C++ 的视角，结合 JsonCpp 来介绍 JSON 的使用。

### 基本数据类型

json 的 key 固定为字符串，value 支持以下几种基本数据类型，注意，json是不支持注释的，下面的注释只是为了方便理解：

```json
{
  "name": "chulan",           // 字符串
  "age": 20,                  // 整数
  "height": 135.5,            // 浮点数
  "is_student": true,         // 布尔值
  "spouse": null,             // 空值
  "hobbies": ["coding", "reading"], // 数组
  "address": {                // 对象
    "city": "PingDingShan",
    "country": "China"
  }
}
```

### 嵌套结构

JSON 支持任意层级的嵌套，这使得它能够表示复杂的数据结构：

```json
{
  "company": {
    "name": "Tech Corp",
    "departments": [
      {
        "name": "Engineering",
        "employees": [
          {
            "id": 1,
            "name": "Alice",
            "skills": ["C++", "Python", "JavaScript"]
          }
        ]
      }
    ]
  }
}
```

## JsonCpp 基本使用

JsonCpp 提供了简单易用的 API 来处理 JSON 数据。可以看一下[官方文档](https://open-source-parsers.github.io/jsoncpp-docs/doxygen/index.html)了解这个库的设计，此处直接介绍基本的读写操作：

### 创建和写入 JSON

```cpp
#include <iostream>
#include <json/json.h>
#include <string>

int main() {
  // 创建 JSON 对象
  Json::Value root;
  root["name"] = "chulan";
  root["age"] = 20;
  root["is_student"] = true;

  // 创建数组
  Json::Value hobbies(Json::arrayValue);
  hobbies.append("coding");
  hobbies.append("reading");
  root["hobbies"] = hobbies;

  // 创建嵌套对象
  Json::Value address;
  address["city"] = "Beijing";
  address["country"] = "China";
  root["address"] = address;

  // 序列化操作
  // 可以简单使用
  std::string json_str2 = root.toStyledString();
  std::cout << json_str2 << '\n';

  std::cout << "--------------------------------\n";

  // Writer性能更高且可以支持自定义
  Json::StreamWriterBuilder builder;
  builder["indentation"] = "  ";          // 设置缩进为2个空格
  builder["precision"] = 6;               // 设置浮点数精度
  builder["dropNullPlaceholders"] = true; // 丢弃null值
  std::string json_str = Json::writeString(builder, root);
  std::cout << json_str << '\n';

  return 0;
}
```

### 解析和读取 JSON

```cpp
#include <ios>
#include <iostream>
#include <json/json.h>
#include <string>
#include <fstream>

int main() {
  // 从文件读取 JSON 数据
  std::ifstream file("../data.json", std::ios_base::in);
  if (!file.is_open()) {
    std::cout << "Error: Cannot open data.json file" << '\n';
    return 1;
  }

  // 解析 JSON 文件
  Json::Value root;
  Json::CharReaderBuilder builder;
  std::string errors;

  if (Json::parseFromStream(builder, file, &root, &errors)) {
    // 读取基本类型
    std::cout << "Name: " << root["name"].asString() << '\n';
    std::cout << "Age: " << root["age"].asInt() << '\n';
    std::cout << "Is student: " << root["is_student"].asBool() << '\n';

    // 读取数组
    const Json::Value &hobbies = root["hobbies"];
    std::cout << "Hobbies: ";
    for (const auto &hobby : hobbies) {
      std::cout << hobby.asString() << " ";
    }
    std::cout << '\n';

    // 读取嵌套对象
    const Json::Value &address = root["address"];
    std::cout << "Address: " << address["city"].asString() << ", "
              << address["country"].asString() << '\n';
  } else {
    std::cout << "Parse error: " << errors << '\n';
  }

  return 0;
}
```

## 服务器修改

首先定义我们的消息格式，我们将使用如下的 JSON 结构：

```json
{
  "id": 1001,
  "data": "Hello, Server!"
}
```

服务器的修改与上一节相同，只需要修改一下粘包处理的逻辑即可：

```cpp
// Session::handle_read
void Session::handle_read() {
  // 省略原来的代码，然后修改两处调用Send的地方，下面只展示第一处

  // 至此，分支1的接收逻辑走完了，调用Send测试一下
  Json::CharReaderBuilder read_builder;
  std::stringstream strste{_recv_msg_node->_data};
  Json::Value recv_data;
  std::string errors;
  if (Json::parseFromStream(read_builder, strste, &recv_data, &errors)) {
    std::cout << std::format("recv id is: {}, recv data is: {}", recv_data["id"].asString(), recv_data["data"].asString());
  }

  recv_data["data"] = "server has received msg, " + recv_data["data"].asString();
  Json::StreamWriterBuilder write_builder;
  std::string send_str = Json::writeString(write_builder, recv_data);

  Send(send_str.data(), send_str.length());
}
```

[客户端](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/11-jsoncpp/client/client.cc)的代码也进行了修改，重点看一下发送前和接收后的处理即可。

## JSON vs Protobuf

在选择序列化格式时，可以根据具体需求来决定：

| 特性 | JSON | Protobuf |
|------|------|----------|
| 可读性 | 高（文本格式） | 低（二进制格式） |
| 性能 | 中等 | 高 |
| 体积 | 较大 | 小 |
| 跨语言支持 | 极佳 | 良好 |
| 调试便利性 | 高 | 低 |
| Web 友好性 | 极佳 | 需要转换 |

对于 Web API、配置文件、日志记录等场景，JSON 是更好的选择；对于高性能的内部服务通信，Protobuf 更有优势。

## 总结

本节我们主要介绍了 JsonCpp 的安装、JSON 语法基础和基本使用方法，并对服务器进行了修改以支持 JSON 序列化。

本节的核心是：**认识jsoncpp，并使用jsoncpp序列化包体**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/11-jsoncpp/src/main.cc)。
