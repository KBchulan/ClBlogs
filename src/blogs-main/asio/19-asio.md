---
title: 19 beast实现websocket服务器
article: true
order: 19
star: false
category:
  - 网络
tag:
  - asio
date: 2025-08-02
description: 基于beast网络库实现websocket服务器
footer: Always coding, always learning
---

<!-- more -->

# 19 beast实现websocket服务器

传统的HTTP协议是无状态的、单向的，常常是客户端向服务器请求，随后服务器返回数据，但是实际开发中我们经常会有一个需求：需要服务器向客户端推送数据。但是客户端怎么知道服务器什么时候要推送呢，因此最传统的做法就是 **轮询(包括长轮询和短轮询)**，即客户端不断请求，直到服务器这边准备好数据并返回，但是这种方式很显然会很影响服务器的效率，毕竟有大量无效请求。

因此为了解决这种需求，我们常用的方式有 [sse](https://kbchulan.github.io/ClBlogs/pages-other/xmzs/sse.html)，websocket，[WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport)等等方式，本节我们介绍一下其中全双工的协议：**websocket**。

## 协议介绍

WebSocket是一种在单个TCP连接上进行全双工通信的协议，它允许服务器主动向客户端推送信息，也允许客户端随时向服务器发送信息，实现了真正的实时、双向通信。

### 与HTTP/TCP的关系

- **基于TCP**: WebSocket与HTTP一样，都位于应用层，其底层基于TCP协议来保证数据传输的可靠性，一个WebSocket连接首先需要通过TCP的三次握手建立起一个标准的TCP连接。

- **通过HTTP“升级”而来**: WebSocket的连接始于一个标准的HTTP请求，这个请求并非为了获取资源，而是为了“升级”协议。客户端发送一个带有特殊头字段（`Upgrade: websocket` 和 `Connection: Upgrade`）的HTTP GET请求。

- **握手过程**:
    1.  **TCP握手**: 客户端与服务器完成TCP三次握手，建立TCP连接。
    2.  **HTTP升级请求**: 客户端向服务器发送一个HTTP GET请求，主要包含如下信息：
        ```http
        GET /chat HTTP/1.1
        Host: server.example.com
        Upgrade: websocket
        Connection: Upgrade
        Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
        Sec-WebSocket-Version: 13
        ```
        其中 `Sec-WebSocket-Key` 是一个Base64编码的随机值，用于简单的校验，防止代理服务器等误解请求。
    3.  **HTTP升级响应**: 服务器如果同意升级，会返回一个 `101 Switching Protocols` 状态码的HTTP响应：
        ```http
        HTTP/1.1 101 Switching Protocols
        Upgrade: websocket
        Connection: Upgrade
        Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
        ```
        `Sec-WebSocket-Accept` 的值是服务器根据客户端的 `Sec-WebSocket-Key` 计算得出的，客户端会验证这个值以确认服务器确实支持WebSocket。
    4.  **连接建立**: 握手成功后，这条TCP连接的“身份”就从HTTP转换为了WebSocket，后续的数据传输将遵循WebSocket的帧格式，而不再是HTTP的请求/响应模式。

### 本质与特点

- **本质**: WebSocket的本质是一个 **持久化的TCP连接** 加上一套 **消息帧的封装机制**。它解决了HTTP协议开销大（每个请求都需要完整的头信息）、无法由服务器主动发起通信的问题。

- **特点**:
    - **全双工通信**: 客户端和服务器可以同时独立地向对方发送数据。
    - **低开销**: 连接建立后，数据帧的头部信息很小（通常只有2-10字节），与HTTP请求相比开销极低。
    - **持久化连接**: 一次握手，连接保持，避免了重复建立和关闭连接的开销。
    - **更好的二进制支持**: WebSocket定义了二进制帧，可以轻松传输二进制数据，而无需像HTTP那样进行Base64编码。
    - **无跨域问题**: WebSocket协议本身允许跨域通信，服务器可以通过`Origin`头来决定是否接受来自特定域的连接。

## 使用介绍

因此理论上我们可以修改原有的tcp服务器，走一遍这个升级的流程即可，但是我们需要 tcp -> http -> websocket，这个过程需要编写大量代码，不如使用beast，它提供了一套完整且易于使用的抽象，核心是`boost::beast::websocket::stream`类。

### stream

`websocket::stream`是一个模板类，它包装了一个已有的流对象（通常是`tcp::socket`），并在此流之上实现了WebSocket协议的全部功能，包括握手、数据帧的收发、Ping/Pong心跳、以及关闭连接等。

它的声明如下：
```cpp
namespace boost {
namespace beast {
namespace websocket {

template<class NextLayer, bool deflateSupported = true>
class stream;

} // websocket
} // beast
} // boost
```
- `NextLayer`: 代表被包装的下一层流类型，在我们的场景中，它通常是`boost::asio::ip::tcp::socket`或Beast自己提供的`beast::tcp_stream`。
- `deflateSupported`: 用于控制是否启用 "permessage-deflate" 压缩扩展，默认值为`true`，表示支持压缩，可以减少带宽的占用。

### 使用流程

**1. 构造**

在TCP连接建立后，我们将`tcp::socket`的所有权转移给`websocket::stream`来构造它：

```cpp
tcp::socket socket(io_context);

// ws将使用socket的执行器(executor)
websocket::stream<tcp::socket> ws{std::move(socket)};
```

当然也可以使用 `beast::tcp_stream`来构造。

```cpp
websocket::stream<beast::tcp_stream> ws;
```

然而，**此构造并非线程安全**，所有asio的I/O对象（如`tcp::socket`）本身都不是线程安全的，如果多个线程调用 ioc.run()，那么同一个连接上的多个操作（如同时读和写）的完成回调就可能在不同线程中并发执行，这会引发数据竞争，如两个线程同时写入一个socket的写缓冲区。

为了确保在多线程环境下，对于单个连接的所有操作都是按顺序执行的，我们需要引入 **strand** 机制，本质是绑定到它上面的所有处理程序都不会并发执行，而是类似于队列一样一个一个取出并运行，因此构造时也可以这样构造，这个只要是由ioc调度的回调，都会走strand机制保证顺序执行：

```cpp
asio::io_context ioc;
stream<beast::tcp_stream> _ws{asio::make_strand(ioc)};
```

**2. 接受握手**

如上文所说，我们需要先建立连接，即使用websocket管理的流如`tcp::socket`进行accept，随后基于此连接进行一次websocket协议的握手，而 `websocket::stream` 的接收函数为我们封装了这一步骤，只需要调用一下即可完成 tcp连接 -> websocket升级的流程：

```cpp
ws.async_accept(
    [](beast::error_code ec) -> void {
        if(ec) {
            // 握手失败
            return;
        }
        // 握手成功
    });
```

**3. 读写消息**

- **读取**: 从流中异步读取一个完整的WebSocket消息，此处提供一个缓冲区来存放消息内容，基本都是`beast::flat_buffer`。
    ```cpp
    beast::flat_buffer buffer; // 用于接收数据的缓冲区

    ws.async_read(
        buffer,
        [this](beast::error_code ec, std::size_t bytes_transferred) {
            if(ec) {
                // 读取错误，通常意味着连接已关闭
                return;
            }
            // 读取成功，处理buffer中的数据
            // 可以通过beast::buffers_to_string(buffer.data())获取字符串
            // 处理完后，清空缓冲区以便下次读取
            buffer.consume(buffer.size());
        });
    ```
- **写入**: 将数据作为单个WebSocket消息异步写入流中。
    ```cpp
    std::string message = "Hello from server!";

    // 在写入前，可以设置消息是文本还是二进制
    ws.text(true); // true为文本消息, false为二进制消息
    // 或者自适应：ws.text(ws.got_text());

    ws.async_write(
        asio::buffer(message), // 数据必须是ConstBufferSequence
        [this](beast::error_code ec, std::size_t bytes_transferred) {
            if(ec) {
                // 写入失败
            }
            // 写入成功
        });
    ```

**4. 关闭连接**

使用`async_close`来执行WebSocket的关闭握手，这是一种优雅的关闭方式。

```cpp
ws.async_close(
    websocket::close_code::normal, // 提供一个关闭码
    [this](beast::error_code ec) {
        if(ec) {
            // 关闭时发生错误
        }
        // 连接已优雅地关闭
    });
```

至此，我们就介绍完了比较常用的一些API，接下来我们会基于这些API写一个简单的demo。

[官网](https://www.boost.org/doc/libs/latest/libs/beast/doc/html/beast/using_websocket.html)更加详细，提出了更多可配置项，具体的可以看一下。

## 服务器demo

首先我们捋一下思路，Server设计和先前肯定没有什么变化，最主要还是 Connection 的设计，我们使用一个 uuid 来标识所有的连接，用于管理，对于单个连接，我们会走如下逻辑：先接收升级请求 -> 读取数据 -> 回包数据，那么代码基本就是如下这样。

```cpp
class Connection;
class ConnectionMgr {
public:
  static ConnectionMgr &getInstance();
  void addConnection(std::shared_ptr<Connection> conn);
  void removeConnection(const std::string &uuid);

private:
  ConnectionMgr() = default;
  ~ConnectionMgr() = default;

  std::mutex _mtx;
  std::unordered_map<std::string, std::shared_ptr<Connection>> _connections;
};

class Connection : public std::enable_shared_from_this<Connection> {
public:
  Connection(boost::asio::io_context &ioc)
    : _ioc(ioc), _strand(boost::asio::make_strand(_ioc)), _ws_ptr(std::make_unique<boost::beast::websocket::stream<boost::beast::tcp_stream>>(_strand)) {
    boost::uuids::uuid uuid = boost::uuids::random_generator_mt19937()();
    _uuid = boost::uuids::to_string(uuid);
  }

  void asyncAccept() {
    _ws_ptr->async_accept(
      [self = shared_from_this()](boost::beast::error_code errc) -> void {
        if (!errc) {
          self->start();
          ConnectionMgr::getInstance().addConnection(self);
        } else {
          std::print("accept error, error is: {}\n", errc.message());
        }
      });
  }

  void start() {
    _ws_ptr->async_read(_recv_buffer,
      [self = shared_from_this()](boost::beast::error_code errc, std::size_t bytes_transferred) -> void {
        if (!errc) {
          self->_ws_ptr->text(self->_ws_ptr->got_text());
          std::string message(boost::beast::buffers_to_string(self->_recv_buffer.data()));
          self->_recv_buffer.consume(bytes_transferred);

          std::print("received message: {}\n", message);
          self->asyncSend("Echo: " + message);
          self->start();
        } else {
          std::print("read error, error is: {}\n", errc.message());
          ConnectionMgr::getInstance().removeConnection(self->getUuid());
        }
      }
    );
  }

  void asyncSend(std::string data) {
    int size;
    {
      std::lock_guard<std::mutex> lock(_send_mtx);
      size = _send_queue.size();
      _send_queue.push(std::move(data));
    }

    if (size >= 1) {
      return;
    }

    boost::asio::co_spawn(
      _strand,
      [self = shared_from_this()]() -> boost::asio::awaitable<void> {
        while (true) {
          std::string data;
          {
            std::lock_guard<std::mutex> lock(self->_send_mtx);
            if (self->_send_queue.empty()) {
              break;
            }
            data = std::move(self->_send_queue.front());
            self->_send_queue.pop();
          }

          try {
            co_await self->_ws_ptr->async_write(boost::asio::buffer(data), boost::asio::use_awaitable);
          } catch (boost::beast::system_error &e) {
            std::print("write error, error is: {}\n", e.what());
            ConnectionMgr::getInstance().removeConnection(self->getUuid());
            break;
          }
        }
      }, boost::asio::detached);
  }

  std::string &getUuid() {
    return this->_uuid;
  }

  boost::asio::ip::tcp::socket &getSocket() {
    return boost::beast::get_lowest_layer(*_ws_ptr).socket();
  }

private:
  std::string _uuid;
  boost::asio::io_context &_ioc;
  boost::asio::strand<boost::asio::io_context::executor_type> _strand;

  std::unique_ptr<boost::beast::websocket::stream<boost::beast::tcp_stream>> _ws_ptr;

  boost::beast::flat_buffer _recv_buffer;

  std::queue<std::string> _send_queue;
  std::mutex _send_mtx;
};

ConnectionMgr &ConnectionMgr::getInstance() {
  static ConnectionMgr instance;
  return instance;
}

void ConnectionMgr::addConnection(std::shared_ptr<Connection> conn) {
  std::lock_guard<std::mutex> lock(_mtx);
  _connections[conn->getUuid()] = conn;
}

void ConnectionMgr::removeConnection(const std::string &uuid) {
  std::lock_guard<std::mutex> lock(_mtx);
  _connections.erase(uuid);
}

class WebSocketServer {
public:
  WebSocketServer(boost::asio::io_context &ioc, const boost::asio::ip::tcp::endpoint &endpoint)
    : _ioc(ioc), _acceptor(ioc, endpoint) {
    std::print("WebSocket server started on port {}\n", endpoint.port());
    startAccept();
  }

  void startAccept() {
    auto conn = std::make_shared<Connection>(_ioc);
    _acceptor.async_accept(conn->getSocket(),
      [this, conn](boost::beast::error_code errc) {
        if (!errc) {
          conn->asyncAccept();
        } else {
          std::print("accept error, error is: {}\n", errc.message());
        }
        startAccept();
      });
  }

private:
  boost::asio::io_context &_ioc;
  boost::asio::ip::tcp::acceptor _acceptor;
};

int main() {
  try {
    boost::asio::io_context ioc;
    boost::asio::ip::tcp::endpoint endpoint(boost::asio::ip::address_v4::any(), 10088);

    boost::asio::signal_set signals(ioc, SIGINT, SIGTERM);
    signals.async_wait([&ioc](const boost::system::error_code &ec, int signal) -> void {
      if (!ec) {
        std::print("Received signal {}, stopping server...\n", signal);
        ioc.stop();
      } else {
        std::print("Error waiting for signal: {}\n", ec.message());
      }
    });

    WebSocketServer server(ioc, endpoint);

    ioc.run();
  } catch (const std::exception &e) {
    std::print("Exception: {}\n", e.what());
  }
}
```

随后我们使用[ws在线测试工具](https://wstool.js.org/)测试一下，也是非常的完美。

其实整个websocket的设计对我们的开发来说，只是多了一步http升级的操作，其余和普通的异步服务器一模一样，因此在设计上完全可以参考本系列的设计，将其升级为多线程的，可以尝试一下。
