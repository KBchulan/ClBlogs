---
title: 18 beast实现http服务器

article: true
order: 18
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-30

description: 基于beast网络库实现http服务器
footer: Always coding, always learning
---

<!-- more -->

# 18 beast实现http服务器

在开始本节的介绍之前，我们先来简单回顾一下一个标准的Http请求和响应的内容。

## Http请求

Http请求由三部分组成：请求行、请求头和请求体。

### 请求行

请求行是Http请求的第一行，它定义了客户端想要做什么。它由三个部分组成，并以空格分隔：

- **请求方法**: 表明对资源要执行的操作，常见的有 `GET`, `POST`, `PUT`, `DELETE` 等。
- **请求URI**: 指定要操作的资源路径。
- **HTTP协议版本**: 指明客户端使用的HTTP协议版本，如 `HTTP/1.1`。

### 请求头

请求头跟在请求行之后，由一系列的键值对组成，每行一个，负责向服务器传递额外的信息，例如客户端的环境、认证信息、期望的响应格式等。

**通用标头**：

- **Host**: 指定服务器的域名和端口号，是 **唯一一个必须包含的头字段**。例如：www.example.com。
- **Connection**: 表示客户端与服务器之间的连接类型。如 keep-alive (保持连接，以便复用)，close（关闭连接）。
- **Cache-Control**：用于控制缓存行为。例如 no-cache (可以缓存，但使用前必须与服务器验证)、max-age=0 (缓存已过期)。

**请求标头**：

- **User-Agent**: 包含发起请求的客户端的信息，服务器可以判断是来自什么设备，并提供不同的页面。
- **Accept**: 告诉服务器客户端能够理解的内容类型（MIME类型）。例如 text/html, application/json, image/webp, `*/*` (任意类型)。
- **Accept-Language**: 告诉服务器，客户端偏好的自然语言。例如 zh-CN,zh;q=0.9,en;q=0.8 (q是权重因子，表示偏好程度)。
- **Accept-Encoding**: 告诉服务器，客户端支持的内容编码格式。例如 gzip, deflate, br，服务器会选择一种格式来压缩响应体，以减少传输大小。
- **Referer**: 表示这个请求是从哪个URL跳转过来的。常用于数据分析、日志记录以及防盗链。
- **Authorization**: 用于身份验证。包含了客户端的认证信息，例如 `Basic dXNlcjpwYXNzd29yZA==` 或 `Bearer eyJhbGciOiJIUzI1Ni...` (JWT)。
- **Cookie**: 包含了之前由服务器通过 Set-Cookie 头发送到客户端并存储的Cookie信息。用于维持用户会话和状态。

**实体标头**：

如果存在请求体则必须设置这两个内容。

- **Content-Type**: 指定了请求体的媒体类型（MIME类型）。例如 application/json、application/x-www-form-urlencoded、multipart/form-data。
- **Content-Length**: 指定了请求体的长度（以字节为单位）。

### 请求体

请求体是**可选部分**，它包含了要发送给服务器的数据。`GET` 请求通常没有请求体，因为数据通过URI的查询字符串传递。而 `POST` 或 `PUT` 请求通常使用请求体来传输数据，例如HTML表单数据、JSON或XML，当然查询字符串也是ok的。

请求体与请求头之间由一个**空行**隔开，这个空行是必需的，它标志着请求头的结束和请求体的开始。

### 示例

```http
# --- 请求行 (Request Line) ---
POST /api/login HTTP/1.1

# --- 请求头 (Request Headers) ---
Host: api.example.com
Connection: keep-alive
Content-Type: application/json
Content-Length: 53
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36
Accept: application/json, text/plain, */*
Origin: https://www.example.com
Referer: https://www.example.com/login

# --- 请求体 (Request Body) ---
{"username": "chulan", "password": "123456"}
```

## Http响应

与请求类似，Http响应也由三部分组成：状态行、响应头和响应体。

### 状态行

状态行是Http响应的第一行，用于告知客户端请求的处理结果。它也由三个部分组成，并以空格分隔：

- **HTTP协议版本**: 服务器使用的HTTP协议版本，如 `HTTP/1.1`。
- **状态码**: 一个三位数的数字，表示请求处理的结果。
- **原因短语**: 对状态码的简短文本描述，例如 `OK`, `Not Found`。

常见的状态码分类：
- **2xx (成功)**: 请求已成功被服务器接收、理解、并接受。例如 `200 OK`。
- **3xx (重定向)**: 需要后续操作才能完成这一请求。例如 `301 Moved Permanently`。
- **4xx (客户端错误)**: 请求含有词法错误或者无法被执行。例如 `404 Not Found`。
- **5xx (服务器错误)**: 服务器在处理一个有效请求时发生错误。例如 `500 Internal Server Error`。

### 响应头

响应头紧跟在状态行之后，同样由键值对组成，用于提供关于响应的更多信息。

**通用标头**：

- **Connection**: 与请求头中的意义相同，决定连接的去留。
- **Date**: 响应消息生成的日期和时间。
- **Via**: 告知中间代理（代理服务器）的信息。
- **Cache-Control**：用于控制缓存行为。例如 no-cache (可以缓存)、max-age=0 (缓存已过期)。

**响应标头**：

- **Server**: 包含了服务器用于处理请求的软件信息。例如 `nginx/1.18.0`。
- **Set-Cookie**: 向客户端发送Cookie。客户端会在后续请求中通过 `Cookie` 头将此信息带回。
- **Location**: 在重定向（3xx状态码）时使用，指定了客户端应该跳转到的新URL。
- **Access-Control-Allow-Origin**: 用于CORS，指定了哪些源可以访问该资源。例如 `*` (允许任何源)。

**实体标头**：

- **Content-Type**: 指定了响应体的媒体类型（MIME类型）。例如 `text/html; charset=utf-8`。
- **Content-Length**: 指定了响应体的长度（以字节为单位）。
- **Content-Encoding**: 指定了响应体的压缩编码格式，例如 `gzip`。
- **Last-Modified**: 资源最后一次被修改的日期。
- **Expires**: 响应过期的日期和时间，用于客户端缓存控制。

### 响应体

响应体是**可选部分**，包含了服务器返回给客户端的实际数据，例如HTML页面、JSON数据、图片等。像 `204 No Content` 或 `304 Not Modified` 这样的响应通常没有响应体。

与请求一样，响应体与响应头之间也由一个**空行**隔开。

### 示例

```http
# --- 状态行 (Status Line) ---
HTTP/1.1 200 OK

# --- 响应头 (Response Headers) ---
Content-Type: application/json; charset=utf-8
Content-Length: 38
Connection: keep-alive
Server: nginx/1.18.0
Date: Wed, 30 Jul 2025 12:00:00 GMT
Access-Control-Allow-Origin: *

# --- 响应体 (Response Body) ---
{"status": "success", "user": "chulan"}
```

## 使用介绍

Beast库的核心是`request`和`response`这两个类，它们分别代表了HTTP的请求和响应消息，这两个类都是模板类，其声明如下：

```cpp
namespace boost {
namespace beast {
namespace http {

template<class Body, class Fields = fields>
class request;

template<class Body, class Fields = fields>
class response;

} // http
} // beast
} // boost
```

- `Body`: 这是一个模板参数，用于指定消息体的类型。
- `Fields`: 这个参数代表了HTTP头字段的容器，通常使用默认的`boost::beast::http::fields`即可。

### Body类型

**http::string_body**

- **用途**: 当消息体是纯文本时使用，这是最简单、最常用的Body类型之一。
- **场景**:
    - 发送JSON或XML字符串。
    - 发送简单的HTML页面。
    - 接收表单数据或API的文本响应。
- **示例**:
    ```cpp
    // 创建一个POST请求，请求体是JSON字符串
    http::request<http::string_body> req{http::verb::post, "/api/users", 11};
    req.set(http::field::host, "localhost");
    req.set(http::field::content_type, "application/json");
    req.body() = R"({"name": "chulan", "age": 25})";
    req.prepare_payload(); // 自动设置Content-Length
    ```

**http::vector_body**

- **用途**: 当消息体是二进制数据，并且需要存储在内存中的`std::vector<char>`时使用。
- **场景**:
    - 上传或下载小型二进制文件，如图片、音频片段。
    - 处理自定义的二进制协议。
- **示例**:
    ```cpp
    // 创建一个响应，响应体是一段二进制数据
    http::response<http::vector_body<std::uint8_t>> res{http::status::ok, 11};
    res.set(http::field::content_type, "application/octet-stream");
    std::vector<std::uint8_t> data = {0xDE, 0xAD, 0xBE, 0xEF};
    res.body() = data;
    res.prepare_payload();
    ```

**http::file_body**

- **用途**: 用于直接从磁盘文件发送响应或将请求体直接写入磁盘文件，避免将整个文件读入内存。
- **场景**:
    - 实现文件下载服务器。
    - 接收用户上传的大文件。
- **示例**:
    ```cpp
    // 创建一个响应，其主体是磁盘上的一个文件
    http::response<http::file_body> res{http::status::ok, 11};
    res.set(http::field::content_type, "text/plain");
    res.body().open("path/to/large_file.txt", beast::file_mode::scan);
    res.prepare_payload(); // 自动根据文件大小设置Content-Length
    ```

**http::buffer_body**

- **用途**: 假设已经有了一块内存缓冲区，并希望将其作为消息体时使用，可以避免数据的额外拷贝。
- **场景**:
    - 与其他库集成，这些库提供了自己的内存管理。
    - 从一个固定的内存池中分配消息体。
- **示例**:
    ```cpp
    // 使用一个已存在的缓冲区作为请求体
    char buffer[] = "This is some data from a buffer.";
    http::request<http::buffer_body> req;
    req.body().data = buffer;
    req.body().size = sizeof(buffer) - 1; // 不包括null终止符
    req.body().more = false; // 表示这是所有数据
    req.prepare_payload();
    ```

**http::empty_body**

- **用途**: 用于表示没有消息体的HTTP消息。
- **场景**:
    - `GET`, `HEAD`, `DELETE` 等通常没有请求体的请求。
    - `204 No Content` 或 `304 Not Modified` 等没有响应体的响应。
- **示例**:
    ```cpp
    // 创建一个GET请求，没有请求体
    http::request<http::empty_body> req{http::verb::get, "/index", 11};
    req.set(http::field::host, "localhost");

    // 创建一个无内容的响应
    http::response<http::empty_body> res{http::status::no_content, 11};
    ```

**http::dynamic_body**

- **用途**: 当消息体的大小事先未知，需要动态增长缓冲区来存储时使用。
- **场景**:
    - 接收一个大小不确定的HTTP响应。
    - 逐步构建一个响应体。
- **示例**:
    ```cpp
    // 接收一个未知大小的请求
    http::request<http::dynamic_body> req;
    beast::flat_buffer buffer; // 需要一个外部buffer来读取数据
    // http::async_read(socket, buffer, req, ...); // 读取后，数据在req.body()中
    // 可以通过 boost::beast::buffers_to_string(req.body().data()) 来访问数据
    ```

### request 常见API

假设我们收到了一个`http::request<http::string_body> req`对象。

- **获取请求方法**:
    ```cpp
    http::verb method = req.method(); // 返回枚举类型 http::verb
    if (method == http::verb::get) { /* ... */ }

    beast::string_view method_str = req.method_string(); // 返回字符串 "GET", "POST" 等
    ```

- **获取请求目标 (URI)**:
    ```cpp
    beast::string_view target = req.target(); // 例如 "/users/123?format=json"
    // target() 返回的是原始的、未解码的字符串视图
    ```

- **获取HTTP版本**:
    ```cpp
    unsigned version = req.version(); // 11 代表 HTTP/1.1, 10 代表 HTTP/1.0
    ```

- **访问请求头**:
    请求头是一个大小写不敏感的键值对容器。
    ```cpp
    // 查找特定的头字段
    beast::string_view host = req[http::field::host]; // 使用预定义枚举
    beast::string_view user_agent = req["User-Agent"]; // 使用字符串

    // 检查头字段是否存在
    if (req.count("Authorization")) {
        beast::string_view auth = req["Authorization"];
        // ...
    }

    // 遍历所有头字段
    for(auto const& field : req) {
        std::cout << field.name_string() << ": " << field.value() << std::endl;
    }
    ```

- **访问/解析请求体**:
    ```cpp
    // 对于 string_body
    const std::string& body_str = req.body();
    std::cout << "Request body: " << body_str << std::endl;

    // 对于 dynamic_body, body()返回一个multi_buffer
    auto body_data = req.body().data(); // 返回一个 ConstBufferSequence
    std::string body_str = beast::buffers_to_string(body_data);
    ```

- **准备载荷**:
    这是一个非常重要的函数，它会根据`body`的内容和类型自动设置`Content-Length`或`Transfer-Encoding`头，对于`file_body`，它会获取文件大小。

### response 常见API

构建一个`http::response<http::string_body> res`对象。

- **设置状态码**:
    ```cpp
    res.result(http::status::ok); // 200 OK
    res.result(404); // 404 Not Found
    ```

- **设置HTTP版本**:
    ```cpp
    res.version(11); // HTTP/1.1
    ```

- **设置响应头**:
    ```cpp
    res.set(http::field::server, "My-Awesome-Server");
    res.set(http::field::content_type, "application/json");
    ```

- **设置响应体**:
    ```cpp
    res.body() = R"({"message": "Hello, world!"})";
    ```

- **管理连接**:
    Beast提供了`keep_alive()`来帮助管理`Connection`头，它会检查请求的`Connection`头和HTTP版本来决定是否应该保持连接。
    ```cpp
    // 假设req是收到的请求
    res.keep_alive(req.keep_alive()); // 根据请求来决定响应是否keep-alive
    ```

- **准备载荷**:
    与`request`一样，在发送前必须调用`prepare_payload()`来设置`Content-Length`等头信息。
    ```cpp
    res.prepare_payload();
    ```

### Beast读写API

Beast通过`read`和`write`系列函数来处理HTTP消息的I/O操作，这些函数都有同步和异步版本，我们此处只介绍异步的相关API。

**http::async_read**

此函数用于从流中异步读取一个完整的HTTP消息。

```cpp
void do_read(tcp::socket& stream_) {
    // 创建一个用于接收请求的对象，body类型可以根据需要选择
    http::request<http::dynamic_body> req_;
    // 创建一个缓冲区，read函数会使用它
    beast::flat_buffer buffer_;

    // 从流中异步读取一个请求
    http::async_read(stream_, buffer_, req_,
        [&](beast::error_code ec, std::size_t bytes_transferred) {
            if (!ec) {
                // 读取成功，处理请求
                // req_ 对象现在包含了完整的HTTP请求
            } else {
                // 错误处理
            }
        });
}
```
- `stream_`: TCP流对象，用于接收流数据，基本用 tcp::socket。
- `buffer_`: 一个 **DynamicBuffer**，Beast用它作为内部的临时存储空间来读取数据，**flat_buffer** 是常用的选择。
- `req_`: 一个空的request对象，函数会将读取和解析后的数据填充到这个对象里。

**http::async_write**

此函数用于将一个完整的HTTP消息异步写入到流中。

```cpp
void do_write(tcp::socket& stream_, http::response<http::string_body>&& res) {
    // 将响应对象的所有权转移给lambda，确保其生命周期
    auto sp = std::make_shared<http::response<http::string_body>>(std::move(res));

    http::async_write(stream_, *sp,
        [sp](beast::error_code ec, std::size_t bytes_transferred) {
            if (!ec) {
                // 写入成功
                // 如果是keep-alive，可以开始下一次读取
            } else {
                // 错误处理
            }
        });
}
```
- `stream_`: TCP流对象，用于发送流数据，基本用 tcp::socket。
- `res`或`*sp`: 已经构建好的、准备发送的`response`或`request`对象。`async_write`会自动序列化这个消息（包括状态行/请求行、头、和主体）并发送。

## 服务器demo

那么有了上面的基础认知后，我们此处可以实现一个简单的服务器demo了，先让我们捋一下思路：

由于http服务器多为短连接，我们更期待的行为是服务器启动一个acceptor，不断接收连接，并把接收到的连接封装为一个 HttpConnection，每一个 HttpConnection 应当有如下的行为：异步接收数据流并构造为一个 request 对象，解析此对象的方法、目标以及版本，投入到不同的逻辑中进行处理，请求头也会影响逻辑的选择，随后我们构造 response，将处理后的数据发送给客户端。

思路是比较简单的，我们本次以一个get请求为例，写一个单文件的http服务器：

```cpp
class HttpConnection : public std::enable_shared_from_this<HttpConnection> {
public:
  HttpConnection(boost::asio::ip::tcp::socket& sock) : _sock(std::move(sock)) { }

  void start() {
    read_request();
    check_deadline();
  }

private:
  void read_request() {
    boost::beast::http::async_read(_sock, _buffer, _request,
      [self = shared_from_this()](boost::beast::error_code errc, std::size_t) -> void {
        if (!errc) {
          self->process_request();
        }
      }
    );
  }

  void check_deadline() {
    _deadline.async_wait([self = shared_from_this()](boost::system::error_code errc) -> void {
      if (!errc) {
        if (self->_sock.is_open()) {
          self->_sock.close();
        }
      }
    });
  }

  void process_request() {
    _responce.version(_request.version());
    _responce.keep_alive(_request.keep_alive());

    switch (_request.method()) {
      case boost::beast::http::verb::get:
        _responce.result(boost::beast::http::status::ok);
        _responce.set(boost::beast::http::field::server, "Beast demo");
        create_response();
        break;
      default:
        _responce.result(boost::beast::http::status::bad_request);
        _responce.set(boost::beast::http::field::content_type, "text/plain");
        _responce.body() = "invalid request-method";
        break;
    }

    write_response();
  }

  void create_response() {
    if (_request.target() == "/index") {
      _responce.set(boost::beast::http::field::content_type, "text/html");
      std::ifstream file("./index.html");
      if (file.is_open()) {
        std::stringstream buffer;
        buffer << file.rdbuf();
        _responce.body() = buffer.str();
        file.close();
      }
    }
    _responce.prepare_payload();
  }

  void write_response() {
    boost::beast::http::async_write(_sock, _responce,
      [self = shared_from_this()](boost::beast::error_code, std::size_t) -> void {
        self->_sock.shutdown(boost::asio::ip::tcp::socket::shutdown_send);
        self->_deadline.cancel();
      });
    }

  boost::asio::ip::tcp::socket _sock;
  boost::beast::flat_buffer _buffer{ 8192 };
  boost::beast::http::request<boost::beast::http::string_body> _request;
  boost::beast::http::response<boost::beast::http::string_body> _responce;
  boost::asio::steady_timer _deadline{_sock.get_executor(), std::chrono::seconds(10)};
};

void http_server(boost::asio::ip::tcp::acceptor& acceptor, boost::asio::ip::tcp::socket& sock) {
  acceptor.async_accept(sock,
    [&](boost::beast::error_code errc) -> void {
      if (!errc) {
        std::make_shared<HttpConnection>(sock)->start();
      }

      http_server(acceptor, sock);
    });

}

int main() {
  try {
    boost::asio::io_context io_context;
    boost::asio::ip::tcp::acceptor acceptor(io_context, boost::asio::ip::tcp::endpoint(boost::asio::ip::tcp::v4(), 10088));
    boost::asio::ip::tcp::socket sock(io_context);

    http_server(acceptor, sock);

    io_context.run();
  } catch (const boost::system::system_error& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    return EXIT_FAILURE;
  }
}
```

可以看到，我们在启动一个连接时同步启动了一个定时器，如果客户端长时间不发消息，我们就直接给它断开，其余思路都是比较简单的，但是实际的开发中，我们肯定不能这样单文件的服务器，最好是做一层解耦，可以看一下原来写过的一个[网关服务器](https://github.com/KBchulan/HungerYet/blob/main/server/GateServer/src/GateServer.cc)。
