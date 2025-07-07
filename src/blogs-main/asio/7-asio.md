---
title: 07 引入发送队列

article: true
order: 7
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-07

description: 修改服务器为全双工模式，引入发送队列，解耦发送和接收
footer: Always coding, always learning
---

<!-- more -->

# 07 引入发送队列

在前面的几节中我们实现的echo服务器只是一个玩具级别的服务器，正常生产中使用的服务器应该是一个全双工通信的服务器：服务器从挂起开始可以自动接收数据，然后提供一个发送接口，可以在调用时发送数据。

本节我们先着重放在这个发送的方向上，在[异步API](https://kbchulan.github.io/ClBlogs/blogs-main/asio/4-asio.html)中我们提到了一个问题，多个线程如果不加控制的发送数据，就会导致从用户态写入内核态的数据错乱，那asio帮我们调度TCP数据传输也将会是错乱的。

我们的方案就是引入发送队列，一个服务器从挂起时会维护一个发送队列，不管是逻辑线程调用发送，还是网络线程的回调，都是同样的队列，这样就可以确保有序。

## 消息节点

具体设计与[异步API](https://kbchulan.github.io/ClBlogs/blogs-main/asio/4-asio.html)中一致，此处直接给出：

```cpp
class CORE_EXPORT MsgNode {
  friend class Session;
public:
  MsgNode(char *data, std::size_t max_len) : _max_len(max_len) {
    _data = new char[max_len];
    memcpy(_data, data, max_len);
  }

  ~MsgNode() {
    delete []_data;
  }

private:
  std::size_t _cur_len{};
  std::size_t _max_len;
  char* _data;
};
```

## Send接口

在 `Session` 中我们需要增加一个发送队列，然后因为此队列会被多个线程访问，所以需要加锁，然后对于方法上，我们可以提供一个 `Send` 方法：

```cpp
public:
void Send(char *data, size_t leng);

private:
std::queue<std::shared_ptr<MsgNode>> _send_queue;
std::mutex _send_mtx;
```

具体的实现：

```cpp
void Session::Send(char *data, size_t leng) {
  bool pending = false;
  std::shared_ptr<MsgNode> node = std::make_shared<MsgNode>(data, leng);

  {
    std::scoped_lock<std::mutex> lock{_send_mtx};
    pending = _send_queue.empty();
    _send_queue.emplace(node);
  }

  if (!pending) {
    return;
  }

  boost::asio::async_write(_sock, boost::asio::buffer(data, leng),
    [self = shared_from_this()](const boost::system::error_code& errc, size_t) -> void {
      self->handle_write(errc);
    }
  );
}
```

我们把传入的数据封装为一个 **MsgNode** 对象，然后判断队列是否存在数据，如果存在数据，则直接返回，否则调用 `async_write` 发送数据，注意，对 **_send_queue** 的访问需要加锁。

## 修改回调

那我们要想实现全双工，对应的读写回调也是需要修改的，对于读方面，我们希望可以一直接收数据，即读事件触发读回调，然后读回调再次触发读事件，这样就可以一直接收数据了，此处我们还是把接收到的数据直接发出去，不过是通过 `Send` 方法，而不是原来的 echo 式的方式。

```cpp
void Session::handle_read(const boost::system::error_code& err, std::size_t bytes_transferred) {
  if (!err) {
    logger.info("receive data: {}\n", std::string(_data.data(), bytes_transferred));
    Send(_data.data(), bytes_transferred);

    _data.fill('\0');
    _sock.async_read_some(boost::asio::buffer(_data.data(), MAX_LENGTH),
      [self = shared_from_this()](const boost::system::error_code& erro, size_t bytes) -> void {
        self->handle_read(erro, bytes);
      }
    );
  } else {
    logger.error("read error, err msg is: {}\n", err.message());
  }
}
```

对于写回调，我们需要不断从发送队列中取出数据，然后发送，直到队列为空，确保只有网络线程在发送数据。

```cpp
void Session::handle_write(const boost::system::error_code& err) {
  if (!err) {
    std::scoped_lock<std::mutex> lock{_send_mtx};
    _send_queue.pop();    // 上一次发送完成的数据出队
    if (!_send_queue.empty()) {
      auto& node =_send_queue.front();
      boost::asio::async_write(_sock, boost::asio::buffer(node->_data, node->_max_len),
        [self = shared_from_this()](const boost::system::error_code& errc, size_t) -> void {
          self->handle_write(errc);
        }
      );
    }
  } else {
    logger.error("write error, err msg is: {}\n", err.message());
  }
}
```


至此，我们在实现全双工服务器更近一步，此时我们的服务器可以做到：从建立连接后自动接收数据，然后提供一个发送接口，可以在调用时发送数据。

但是它还缺少不少东西，如服务器 TCP 写缓冲区的不足导致粘包、大小端的处理、发送数据的优化等等问题，接下来我们会逐渐补充上去，到本话题最后，你将会获得一个非常完善的服务器。

## 总结

本节我们将 echo 服务器往全双工的方向上修改，引入发送队列来确保发送数据的有序性，毕竟在实际生产中，基本都是逻辑线程发送数据的，而网络线程只负责接收数据，同时修改了读写回调。

本节的核心是： **引入发送队列**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/7-message-queue/src/main.cc)。