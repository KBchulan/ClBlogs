---
title: 04 异步读写API

article: true
order: 4
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-01

description: 异步读写API的介绍
footer: Always coding, always learning
---

<!-- more -->

# 异步读写API

与同步读写api相比，异步读写api稍显麻烦，这主要是由于异步IO导致的，因为异步IO会在我们用户态发出一次请求后由内核态完成IO操作，然后通知我们使用回调处理，那异步API重点也就是在这个回调上，但整体与回调需要关心的API基本一致。

## 基础准备

### 消息节点

我们设计一个消息节点，储存我们的读写节点，主要需要关注 **数据首地址，总长度，已经处理的长度** 三个字段。

```cpp
class MsgNode {
public:
  // 发送节点时
  MsgNode(const char *msg, std::size_t total) : _totalLen(total), _curLen(0) {
    _msg = new char[total];
    memcpy(_msg, msg, total);
  }

  // 做读的节点时
  MsgNode(std::size_t total) : _totalLen(total), _curLen(0) {
    _msg = new char[total];
  }

  ~MsgNode() { delete[] _msg; }

  std::size_t _totalLen;
  std::size_t _curLen;
  char *_msg;
};
```

### Session

服务器为每一个连接都创建一个Session，核心在于私有变量的一个 `_sock` 变量，用于与客户端进行通信，在目前的情况下，它是这样的：

```cpp
class Session {
public:
  Session(std::shared_ptr<boost::asio::ip::tcp::socket> sock);

private:
  std::shared_ptr<boost::asio::ip::tcp::socket> _sock;
};
```

## 异步写

### API基础介绍

与同步相同，我们此处只介绍 `socket.async_write_some` 和 `boost::asio::async_write` 这两个api，因为 `socket.async_send` 和 `socket.async_write_some` 只存在一个标志位的差距，不额外介绍了。

对于这两个API，我们与同步API进行对比，会发现前面的参数都是一致的，都是 sock 和 buffer，不同的地方在于多了一个回调函数：

```cpp
  template <typename ConstBufferSequence,
      BOOST_ASIO_COMPLETION_TOKEN_FOR(void (boost::system::error_code,
        std::size_t)) WriteToken = default_completion_token_t<executor_type>>
  auto async_write_some(const ConstBufferSequence& buffers,
      WriteToken&& token = default_completion_token_t<executor_type>())
    -> decltype(
      async_initiate<WriteToken,
        void (boost::system::error_code, std::size_t)>(
          declval<initiate_async_send>(), token,
          buffers, socket_base::message_flags(0)))
  {
    return async_initiate<WriteToken,
      void (boost::system::error_code, std::size_t)>(
        initiate_async_send(this), token,
        buffers, socket_base::message_flags(0));
  }
```

我们可以观察到他的第二个参数是一个**WriteToken** 类型的函数，具体类型为 `void (boost::system::error_code, std::size_t)`，第一个参数为错误码，第二个参数为此次操作完成的字节数(如读了几个字节)，因此我们只需要多传入一个这样的函数即可，而函数作参数自然就想到了我们的回调函数，主要写法很多，lambda、bind、future等，本节我会以lambda为主。

### async_write_some

我们假设现在只有一个线程，发起了一次写操作，那我们只需要关心如何发完数据即可：

```cpp
void WriteToSocketErr(const std::string &str) {
  _send_node = std::make_shared<MsgNode>(str.c_str(), str.length());
  _sock->async_write_some(boost::asio::buffer(_send_node->_msg, _send_node->_totalLen),
    [this](const boost::system::error_code& errc, std::size_t bytes_transferred) -> void {
      WriteToSocketCbErr(errc, bytes_transferred);
    }
  );
}
```

我们对传来的数据构造为一个MsgNode，然后调用 `async_write_some` 进行发送，但是对于此函数，异步成功的标志是完成一次写，而是否写完是我们没法确定的，因此我们需要一个回调函数来处理没有写完的情况。

```cpp
void Session::WriteToSocketCbErr(const boost::system::error_code& errc, std::size_t bytes_transferred){
  if (bytes_transferred + _send_node->_curLen < _send_node->_totalLen && !errc) {
    _send_node->_curLen += bytes_transferred;
    _sock->async_write_some(
        boost::asio::buffer(_send_node->_msg + _send_node->_curLen, _send_node->_totalLen - _send_node->_curLen),
        [this](const boost::system::error_code &errc, std::size_t bytes_transferred) -> void {
          WriteToSocketCbErr(errc, bytes_transferred);
        });
  }
}
```

回调函数中我们不断统计 `_send_node->_curLen` 和上次异步写入的字节数 `bytes_transferred` 加和，如果加和小于总长度，则继续回调，直到写完数据，这样就保证了数据被完整发送。

### 消息队列

假设线程1写入 "hello, world"，第一次写入了 "hello"，第二次准备写入 "world"，在二次回调没开始时，线程2也想写入 "hello, world"，那很有可能用户收到的数据就变成了" hellohello, worldworld"，也就是会失序，解决的方案也很简单，我们只需要将数据封装为消息节点，然后加入到消息队列中，然后每次写入时，先从消息队列中取出队首数据，然后进行写入，这样就保证了顺序。

先修改我们的 `Session` 类，添加一个消息队列：

```cpp
class CORE_EXPORT Session {
private:
  std::queue<std::shared_ptr<MsgNode>> _queue;
  std::atomic_bool sending{false};
};
```

随后将消息队列加入我们的异步写中：

```cpp
void Session::WriteToSocket(const std::string &str) {
  _queue.emplace(new MsgNode(str.c_str(), str.length()));
  if (sending) {
    return;
  }

  sending.store(true, std::memory_order_acquire);

  _sock->async_write_some(boost::asio::buffer(str),
    [this](const boost::system::error_code& erro, std::size_t bytes_transferred) -> void {
      WriteToSocketCb(erro, bytes_transferred);
    }
  );
}

void Session::WriteToSocketCb(const boost::system::error_code &errc, std::size_t bytes_transferred) {
  if (errc) {
    std::cout << std::format("error msg is: {}\n", errc.message());
  }

  auto &send_data = _queue.front();
  send_data->_curLen += bytes_transferred;

  if (send_data->_curLen < send_data->_totalLen) {
    _sock->async_write_some(
        boost::asio::buffer(send_data->_msg + send_data->_curLen, send_data->_totalLen - send_data->_curLen),
        [this](const boost::system::error_code &errc, std::size_t bytes_transferred) -> void {
          WriteToSocketCb(errc, bytes_transferred);
        });
    return;
  }

  // 当前节点已经发送完了
  _queue.pop();

  if(_queue.empty()) {
    sending.store(false, std::memory_order_acquire);
    return;
  }

  // 发送剩余的节点
  auto &send_util = _queue.front();
  _sock->async_write_some(
      boost::asio::buffer(send_util->_msg, send_util->_totalLen),
      [this](const boost::system::error_code &errc, std::size_t bytes_transferred) -> void {
        WriteToSocketCb(errc, bytes_transferred);
      });
}
```

我们的设计思路是，每当有新的消息需要发送时，都将其封装成MsgNode后放入队列末尾，然后通过一个原子布尔变量 `sending` 来控制发送状态：

1. **入队操作**：新消息到达时，直接加入队列尾部，如果当前已经在发送状态（`sending` 为true），则直接返回，让正在进行的发送流程处理新消息。

2. **发送启动**：只有在当前没有发送任务时（`sending` 为false），才会启动新的发送流程，将 `sending` 设置为true，并开始发送队列头部的消息。

3. **发送回调处理**：
   - 如果当前消息没有发送完整，继续发送剩余部分
   - 如果当前消息发送完成，将其从队列中移除
   - 检查队列是否为空：
     - 如果队列为空，将 `sending` 设置为false，表示发送流程结束
     - 如果队列不为空，继续发送下一个消息节点

这样确保了始终只有一个线程在发送数据，其他线程只需要投递需要发送的数据即可，由此有序性问题解决。

### async_write

但是一次次写再处理要写的代码实在是太多了，我们可以直接使用 `boost::asio::async_write` 来处理，他的异步成功标志是全部写完，所以，所有数据全部由系统调度发送完后才会通知我们的用户态处理回调，代码的书写上也是很简单的：

```cpp
void Session::WriteAllToSocket(const std::string &str) {
  _queue.emplace(new MsgNode(str.c_str(), str.length()));
  if(sending) {
    return;
  }

  sending.store(true, std::memory_order_acquire);

  boost::asio::async_write(*_sock, boost::asio::buffer(str),
    [this](const boost::system::error_code& erro, std::size_t bytes_transferred) -> void {
      WriteAllToSocketCb(erro, bytes_transferred);
    }
  );

}


void Session::WriteAllToSocketCb(const boost::system::error_code& errc, std::size_t bytes_transferred) {
  if (errc) {
    std::cout << std::format("error msg is: {}, all bytes is: {}\n", errc.message(), bytes_transferred);
  }

  _queue.pop();

  if(_queue.empty()) {
    sending.store(false, std::memory_order_acquire);
  }

  auto new_send = _queue.front();
  boost::asio::async_write(*_sock, boost::asio::buffer(new_send->_msg, new_send->_totalLen),
    [this](const boost::system::error_code& erro, std::size_t bytes_transferred) -> void {
      WriteAllToSocketCb(erro, bytes_transferred);
    }
  );
}
```

## 异步读

### async_read_some

对于读来说，我们是无法得知每次应该读多少数据的，后文我们会使用 `TLV` 协议处理，包括切包等操作，此处我们写死，假设每次读 1024 字节，写法上和写是一样的：

```cpp
void Session::ReadFromSocket(){
  _recv_node = std::make_shared<MsgNode>(1024); // 假设每次读取1024字节
  if (receiving) {
    return;
  }

  receiving.store(true, std::memory_order_acquire);

  _sock->async_read_some(boost::asio::buffer(_recv_node->_msg, _recv_node->_totalLen),
    [this](const boost::system::error_code& errc, std::size_t bytes_transferred) -> void {
      ReadFromSocketCb(errc, bytes_transferred);
    }
  );
}

void Session::ReadFromSocketCb(const boost::system::error_code& errc, std::size_t bytes_transferred) {
  if (errc) {
    std::cout << std::format("error msg is: {}\n", errc.message());
  }

  _recv_node->_curLen += bytes_transferred;

  if (_recv_node->_curLen < _recv_node->_totalLen) {
    _sock->async_read_some(
        boost::asio::buffer(_recv_node->_msg + _recv_node->_curLen, _recv_node->_totalLen - _recv_node->_curLen),
        [this](const boost::system::error_code& errc, std::size_t bytes_transferred) -> void {
          ReadFromSocketCb(errc, bytes_transferred);
        });
    return;
  }

  receiving.store(false, std::memory_order_release);
}
```

### async_read

这个api的异步成功标志是读完指定长度的数据，无需我们一直回调，书写就很简单：

```cpp
void Session::ReadAllFromSocket(){
  _recv_node = std::make_shared<MsgNode>(1024); // 假设每次读取1024字节
  if (receiving) {
    return;
  }

  receiving.store(true, std::memory_order_acquire);

  boost::asio::async_read(*_sock, boost::asio::buffer(_recv_node->_msg, _recv_node->_totalLen),
    [this](const boost::system::error_code& errc, std::size_t bytes_transferred) -> void {
      ReadAllFromSocketCb(errc, bytes_transferred);
    }
  );
}

void Session::ReadAllFromSocketCb(const boost::system::error_code& errc, std::size_t bytes_transferred) {
  receiving.store(false, std::memory_order_release);
  _recv_node = nullptr; // 清理接收节点
}
```

## 总结时刻

我们首先设计了 `MsgNode` 类来管理读写数据，然后分别介绍了：

**异步写**：
- `async_write_some`：需要手动处理未写完的数据，通过回调函数循环发送
- `async_write`：自动处理所有数据发送，更加简洁
- 消息队列机制：通过队列+原子变量确保数据发送的顺序性和线程安全

**异步读**：
- `async_read_some`：需要手动处理未读完的数据
- `async_read`：自动读取指定长度的数据

本节的核心在于：**异步IO、回调机制、消息队列设计**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/4-async-api/src/core/session/Session.hpp)。

