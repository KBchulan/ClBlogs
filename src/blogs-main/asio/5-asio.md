---
title: 05 异步echo服务器 - 存在隐患

article: true
order: 5
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-03

description: 基于官方样例实现的异步服务器，存在非闭包导致的隐患
footer: Always coding, always learning
---

<!-- more -->

# 异步echo服务器

基于上一节的异步API，我们本节来模仿官方样例实现一个异步echo服务器，采用原来写过的[客户端](https://kbchulan.github.io/ClBlogs/blogs-main/asio/3-asio.html)，并介绍一下该样例存在的隐患。

## Session设计

先前我们已经介绍过了 Session 是什么作用，即服务器的会话层，它负责管理一个客户端的连接，包括接收和发送数据，所以核心就是这个 socket。

```cpp
class CORE_EXPORT Session {
public:
  Session(boost::asio::io_context& ioc) : _sock(ioc) {}

  void Start();

  boost::asio::ip::tcp::socket& getSocket() { return _sock; }

private:
  void handle_read(const boost::system::error_code& err, std::size_t bytes_transferred);
  void handle_write(const boost::system::error_code& err);

  boost::asio::ip::tcp::socket _sock;
  std::array<char, MAX_LENGTH> _data;
};
```


我们的 Session 通过 socket 来进行通信，用 _data 来缓存数据，两个私有函数分别是异步读写的回调函数，对于服务器来说我们倾向于使用 `socket.async_read_some` 进行读操作，因此需要传入 size_t 的参数来表示读了多少，对于异步写，直接使用 `boost::asio::async_write` 即可，具体实现代码如下：


```cpp
void Session::Start() {
  _data.fill('\0');
  _sock.async_read_some(boost::asio::buffer(_data.data(), MAX_LENGTH),
    [this](const boost::system::error_code &err, std::size_t bytes_transferred) -> void {
      handle_read(err, bytes_transferred);
    }
  );
}

void Session::handle_read(const boost::system::error_code& err, std::size_t bytes_transferred) {
  if (!err) {
    logger.info("receive data: {}\n", std::string(_data.data(), bytes_transferred));

    boost::asio::async_write(_sock, boost::asio::buffer(_data.data(), bytes_transferred),
      [this](const boost::system::error_code &write_err, size_t) -> void {
        handle_write(write_err);
      }
    );
  } else {
    logger.error("read error, err msg is: {}\n", err.message());
    delete this;
  }
}

void Session::handle_write(const boost::system::error_code& err) {
  if (!err) {
    _data.fill('\0');
    _sock.async_read_some(boost::asio::buffer(_data.data(), MAX_LENGTH),
      [this](const boost::system::error_code& read_err, size_t bytes_transferred) -> void {
        handle_read(read_err, bytes_transferred);
      }
    );
  } else {
    logger.error("write error, err msg is: {}\n", err.message());
    delete this;
  }
}
```

当我们启动一个会话时，会调用 `Session::Start` 方法，进行一次异步的读操作，当内核的网卡部分的TCP读缓冲区有数据时，proactor 会调度读操作，把数据读到我们用户区的 `_data` 中，然后通知用户态调用对应读回调，读回调又会发起一次异步写操作，当客户端的 `_data` 有数据时，proactor 会调度写操作，把数据写到内核的网卡部分的TCP写缓冲区中，然后通知用户态调用对应写回调，写回调又会发起一次异步读操作，如此往复。

**这里需要注意：**

- 读写回调的触发是在系统调度完成读写后的
- 读操作只会尽力去读一次，不保证读到数据的长度，写操作才会保证写完

## Server设计

Server 就类似于我们的大堂经理，通过 `acceptor` 来接受客户端的连接，当有客户端连接上来时会创建一个 Session 对象并调用 `Session::Start` 方法，开始会话。

```cpp
class CORE_EXPORT Server {
public:
  Server(boost::asio::io_context& ioc, unsigned short port);

private:
  void start_accept();
  void handle_accept(Session* new_sess, const boost::system::error_code& err);

  boost::asio::io_context &_ioc;
  boost::asio::ip::tcp::acceptor _accep;
};
```

对应实现代码：

```cpp
Server::Server(boost::asio::io_context &ioc, unsigned short port)
    : _ioc(ioc), _accep(_ioc, boost::asio::ip::tcp::endpoint(
                                  boost::asio::ip::address_v4::any(), port)) {
  logger.info("Server started, listening on port {}", port);
  start_accept();
}

void Server::start_accept() {
  auto* new_sess = new Session(_ioc);
  _accep.async_accept(new_sess->getSocket(), [this, new_sess](boost::system::error_code err) -> void {
    handle_accept(new_sess, err);
  });
}

void Server::handle_accept(Session* new_sess, const boost::system::error_code& err) {
  if (!err) {
    new_sess->Start();
  } else {
    logger.error("error code is: {}, error msg is: {}\n", err.value(), err.message());
    delete new_sess;
    new_sess = nullptr;
  }

  start_accept();
}
```

Server 启动后会准备接收连接，有连接后会调用对应回调启动会话，然后继续接收连接。

这里要注意的是，由于我们的 new_sess 是一个局部的，因此必须采用值传递，否则在回调里面的就是一个悬空指针了，当然直接上共享指针也很好。

## 主函数逻辑

那对于主函数来说，我们最核心的逻辑就是启动一个 Server 对象，然后启动一个 IO 上下文，并运行它，具体如下：

```cpp
int main() {
  try {
    boost::asio::io_context ioc;
    core::Server server{ioc, 10088};
    ioc.run();
  } catch (const boost::system::error_code& err) {
    logger.error("error code is: {}\n", err.value());
  }
}
```

这里需要补充的是 `ioc.run()`，[前文](https://kbchulan.github.io/ClBlogs/blogs-main/asio/1-asio.html#%E5%A5%97%E6%8E%A5%E5%AD%97)我们提到了 ioc 就是类似于 proactor 的调度器，它负责调度我们注册的回调，而 `ioc.run()` 就是启动这个调度器，它会一直运行，直到调用 `ioc.stop()`。

## 隐患

我们假设这么一个场景，当客户端发送数据后，服务器是不是会读取并尝试异步写，此时我们假设客户端关闭，那么异步写出错，对应回调会走 error 分支，会话对象被删除，那么所有操作都是非法的，而断开时 TCP 的挥手会触发一次读回调，是不是又会造成一次delete，那么就是两次delete，引发段错误。

本质上是什么原因，就是一个 Session 同时挂起了读和写操作，我们只要保证只要存在任何一个操作的情况下，Session都是存活的就可以避免这个错误，那自然想到了我们的 `shared_ptr`，下一节我们会修改这个demo。

**ps：** 其实这个样例并不会出现这个问题，因为它是单线程的，ioc 同时只会处理一个回调，所以不存在同时调度两个回调的情况，但实际工作中，怎么都不会用这种 echo 式的，但凡是全双工的，读操作就会引起两个回调，就会暴露上面的问题。

## 总结

在本节中，我们基于异步API实现了一个echo服务器，包括 Session 会话层设计、Server 服务器设计、主函数逻辑、隐患分析，并介绍了 `ioc.run()` 的用法，后续我们会基于这个 demo 加入各种新东西，如粘包处理、序列化、心跳、断线重连等。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/5-async-echo-server/src/main.cc)。
