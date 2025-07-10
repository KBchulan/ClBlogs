---
title: 08 处理粘包

article: true
order: 8
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-07

description: 使用 TLV 模式处理数据接收时的粘包情况
footer: Always coding, always learning
---

<!-- more -->

# 处理粘包

## 粘包问题

先介绍一下什么是粘包，对于客户端来说，假设我们发送了两个 `hello, world`，肯定是希望服务器收到两个包，但是实际上由于TCP面向字节流的特性，服务器无法得知这两个包如何切包，极有可能产生粘连情况，即收到了 `hello, worldhello` 和 `, world`，这就是粘包问题。

## 粘包原因

因为TCP底层通信是面向字节流的，只保证发送数据的准确性和顺序性。

比如客户端的发送缓冲区总大小为10个字节，当前有5个字节数据(上次要发送的数据比如’abcde’)未发送完，那么此时只有5个字节空闲空间，我们调用发送接口发送hello world！其实就是只能发送Hello给服务器，那么服务器一次性读取到的数据就很可能是abcdehello。而剩余的world！只能留给下一次发送，下一次服务器接收到的就是world！

这是一个比较好理解的原因，还有一些其他的原因：

1. 客户端的发送频率远高于服务器的接收频率，就会导致数据在服务器的tcp接收缓冲区滞留形成粘连，比如客户端1s内连续发送了两个**hello world！**,服务器过了2s才接收数据，那一次性读出两个 **hello world！**。

2. tcp底层的安全和效率机制不允许字节数特别少的小包发送频率过高，tcp会在底层累计数据长度到一定大小才一起发送，比如连续发送1字节的数据要累计到多个字节才发送，如tcp底层的[Nagle算法](https://en.wikipedia.org/wiki/Nagle%27s_algorithm)。

3. 还有我们提到的最简单的情况，发送端缓冲区有上次未发送完的数据或者接收端的缓冲区里有未取出的数据导致数据粘连。

## 解决方案

在学习计网的过程中，都知道数据链路层引入了不少机制来区分帧的边界，那同样的，我们也可以在应用层引入一些机制来区分消息的边界，比较常用的就是TLV协议。

即将一个消息包分为 T(Type)、L(Length)、V(Value) 三个部分，依据 L 的长度来确定 V 的长度，从而实现粘包的拆分。

本节我们为了简单起见，先不考虑T，先引入 L 和 V 两个部分。

## MsgNode修改

我们使用两个字节做长度，剩下的部分与前面保持一致，那么消息节点可以修改为：

```cpp
class CORE_EXPORT MsgNode {
  friend class Session;
public:
  // 发送节点的构造
  MsgNode(char *data, short max_len) : _max_len(max_len + HEAD_LENGTH) {
    _data = new char[static_cast<size_t>(_max_len + 1)]();
    memcpy(_data, &max_len, HEAD_LENGTH);
    memcpy(_data + HEAD_LENGTH, data,  static_cast<size_t>(max_len));
    _data[_max_len] = '\0';
  }

  // 接收节点的构造
  MsgNode(short max_len) : _max_len(max_len) {
    _data = new char[static_cast<size_t>(_max_len + 1)]();
  }

  ~MsgNode() {
    delete []_data;
  }

private:
  short _cur_len{};
  short _max_len;
  char* _data;
};
```

## 修改接收逻辑

首先我们通过网络线程读取数据到 `_data` 中，此处我们把它解离出来，包含接收头节点和消息体节点，方便后续逻辑线程的引入，因此先增加几个变量：

```cpp
class CORE_EXPORT Session : public std::enable_shared_from_this<Session> {
  ···
private:
  // 接收节点的处理
  std::shared_ptr<MsgNode> _recv_head_node;
  std::shared_ptr<MsgNode> _recv_msg_node;
  std::atomic_bool _head_parse;
};
```

然后在启动时进行初始化：

```cpp
void Session::Start() {
  _head_parse.store(false, std::memory_order_release);
  _recv_head_node = std::make_shared<MsgNode>(HEAD_LENGTH);
}
```

此时我们就可以在 `handle_read` 中进行处理了，这里我们要考虑接收到的数据长度，先构造头节点，再构造消息节点，比较麻烦，注释标注在代码中了，可以直接结合注释理解：

```cpp
void Session::handle_read(const boost::system::error_code &err, std::size_t bytes_transferred) {
  if (!err) {
    size_t copy_len = 0;
    while (bytes_transferred > 0) {
      // 处理头部
      if (!_head_parse) {
        // 收到的数据还没有头部长度
        if (bytes_transferred + static_cast<size_t>(_recv_head_node->_cur_len) < HEAD_LENGTH) {
          memcpy(_recv_head_node->_data + _recv_head_node->_cur_len, _data.data() + copy_len, bytes_transferred);
          _recv_head_node->_cur_len += bytes_transferred;
          memset(_data.data(), 0, MAX_LENGTH);

          _sock.async_read_some(boost::asio::buffer(_data.data(), MAX_LENGTH),
          [self = shared_from_this()](const boost::system::error_code &errc, size_t bytes) -> void {
            self->handle_read(errc, bytes);
          });
          return;
        }

        // 再次处理剩余的头部信息
        auto head_remain = static_cast<size_t>(HEAD_LENGTH - _recv_head_node->_cur_len);
        memcpy(_recv_head_node->_data + _recv_head_node->_cur_len, _data.data() + copy_len, head_remain);
        _recv_head_node->_data[_recv_head_node->_max_len] = '\0';

        // 更新处理完头部剩余的内容
        copy_len += head_remain;
        bytes_transferred -= head_remain;

        // 处理数据部分，先获取数据部分的长度
        short data_len = 0;
        memcpy(&data_len, _recv_head_node->_data, HEAD_LENGTH);
        logger.info("receive data len is: {}\n", data_len);

        if (data_len > MAX_LENGTH) {
          logger.error("too long msg received, len is: {}\n", data_len);
          return;
        }

        // 创建消息节点
        _recv_msg_node = std::make_shared<MsgNode>(data_len);

        // 如果消息没有接收全部
        if (bytes_transferred < static_cast<size_t>(data_len)) {
          memcpy(_recv_msg_node->_data + _recv_msg_node->_cur_len, _data.data() + copy_len, bytes_transferred);
          _recv_msg_node->_cur_len += bytes_transferred;
          memset(_data.data(), 0, MAX_LENGTH);

          _sock.async_read_some(boost::asio::buffer(_data.data(), MAX_LENGTH),
          [self = shared_from_this()](const boost::system::error_code &errc, size_t bytes) -> void {
            self->handle_read(errc, bytes);
          });
          _head_parse.store(true, std::memory_order_release);
          return;
        }

        // 如果接收到的数据更长的话，则先接收当前节点的数据
        memcpy(_recv_msg_node->_data + _recv_msg_node->_cur_len, _data.data() + copy_len, static_cast<size_t>(data_len));
        _recv_msg_node->_cur_len += data_len;
        copy_len += static_cast<size_t>(data_len);
        bytes_transferred -= static_cast<size_t>(data_len);
        _recv_msg_node->_data[_recv_msg_node->_max_len] = '\0';
        logger.info("receive data is: {}\n", _recv_msg_node->_data);
        // 至此，分支1的接收逻辑走完了，调用Send测试一下
        Send(_recv_msg_node->_data, static_cast<size_t>(_recv_msg_node->_max_len));

        // 处理剩余的数据
        _head_parse.store(false, std::memory_order_release);
        memset(_recv_head_node->_data, 0, static_cast<size_t>(_recv_head_node->_max_len));

        if (bytes_transferred <= 0) {
          memset(_data.data(), 0, MAX_LENGTH);
          _sock.async_read_some(boost::asio::buffer(_data.data(), MAX_LENGTH),
            [self = shared_from_this()](const boost::system::error_code& eee, size_t bbb) -> void {
              self->handle_read(eee, bbb);
            }
          );
          return;
        }

        continue;
      }

      // 处理完头部且剩余部分不足总长度return分支之后
      auto msg_remain = static_cast<size_t>(_recv_msg_node->_max_len - _recv_msg_node->_cur_len);
      // 数据不够长的情况下
      if (bytes_transferred < msg_remain) {
        memcpy(_recv_msg_node->_data + _recv_msg_node->_cur_len, _data.data() + copy_len, bytes_transferred);
        _recv_msg_node->_cur_len += bytes_transferred;
        memset(_data.data(), 0, MAX_LENGTH);

        _sock.async_read_some(boost::asio::buffer(_data.data(), MAX_LENGTH),
        [self = shared_from_this()](const boost::system::error_code &errc, size_t bytes) -> void {
          self->handle_read(errc, bytes);
        });
        return;
      }

      memcpy(_recv_msg_node->_data + _recv_msg_node->_cur_len, _data.data() + copy_len, msg_remain);
      _recv_msg_node->_cur_len += msg_remain;
      bytes_transferred -= msg_remain;
      copy_len += msg_remain;
      _recv_msg_node->_data[_recv_msg_node->_max_len] = '\0';
      logger.info("receive data is: {}\n", _recv_msg_node->_data);
      // 至此，分支2的接收逻辑走完了，调用Send测试一下
      Send(_recv_msg_node->_data, static_cast<size_t>(_recv_msg_node->_max_len));

      // 处理剩余的数据
      _head_parse.store(false, std::memory_order_release);
      memset(_recv_head_node->_data, 0, static_cast<size_t>(_recv_head_node->_max_len));

      if (bytes_transferred <= 0) {
        memset(_data.data(), 0, MAX_LENGTH);
        _sock.async_read_some(boost::asio::buffer(_data.data(), MAX_LENGTH),
          [self = shared_from_this()](const boost::system::error_code& eee, size_t bbb) -> void {
            self->handle_read(eee, bbb);
          }
        );
        return;
      }
    }
  } else {
    logger.error("read error, err msg is: {}\n", err.message());
  }
}
```

## 修改客户端

那对应我们的客户端也应该保证这种 LV 的发包和收包逻辑，由于仅作测试，比较简单的示例：

```cpp
#include <array>
#include <boost/asio.hpp>
#include <cstddef>
#include <cstring>
#include <format>
#include <iostream>

#define MAX_LENGTH 1024 * 2
#define HEAD_LENGTH 2

int main() {
  try {
    boost::asio::io_context ioc;
    boost::asio::ip::tcp::endpoint enp{boost::asio::ip::make_address_v4("127.0.0.1"), 10088};
    boost::asio::ip::tcp::socket sock{ioc, enp.protocol()};
    sock.connect(enp);

    std::cout << "Please enter msg: ";
    std::array<char, MAX_LENGTH> send_message;
    std::cin.getline(send_message.data(), MAX_LENGTH);
    short len = (short)strlen(send_message.data());
    std::array<char, MAX_LENGTH> trueSend;
    memcpy(trueSend.data(), &len, 2);
    memcpy(trueSend.data() + 2, send_message.data(), (size_t)len);
    boost::asio::write(sock, boost::asio::buffer(trueSend.data(), (size_t)(len + 2)));

    std::array<char, HEAD_LENGTH> reply_head;
    boost::asio::read(sock, boost::asio::buffer(reply_head.data(), HEAD_LENGTH));
    short msgLen = 0;
    memcpy(&msgLen, reply_head.data(), HEAD_LENGTH);
    std::array<char, MAX_LENGTH> msg;
    long long rec_len = (long long)boost::asio::read(sock, boost::asio::buffer(msg.data(), static_cast<size_t>(msgLen)));

    std::cout << "Reply is: ";
    std::cout.write(msg.data(), rec_len) << '\n';
    std::cout << "Reply len is: " << rec_len << '\n';
  } catch (const boost::system::error_code& erro) {
    std::cout << std::format("error code is: {}\n", erro.value());
  }
}
```

至此，我们成功使用 TLV 模式处理了粘包问题，可以测试一下，让客户端实现一个收发分离，保证客户端发包的频率远高于服务器接收频率，观察是否会出现粘包问题，笔者测试了下，非常完美。

## 总结

本节我们认识了粘包问题和它产生的原因，并基于 TLV 协议解决了此问题，同时方便扩展，便于后续逻辑线程的引入。

本节的核心是： **TLV 协议解决粘包问题**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/8-sticky-bag/src/main.cc)。