---
title: 09 字节序处理和发送队列控制

article: true
order: 9
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-10

description: 将包头统一化为网络字节序，同时对发送队列进行上限设定
footer: Always coding, always learning
---

<!-- more -->

# 字节序处理和发送队列控制

## 字节序介绍

由于不同的CPU架构，计算机内部存储数据的方式有两种：大端序（Big-Endian）和小端序（Little-Endian）。在大端序中，高位字节存储在低地址处，而低位字节存储在高地址处；在小端序中，高位字节存储在高地址处，而低位字节存储在低地址处。

可以这样记(0x12345678)：大端序比较符合我们的正常阅读习惯，在计算机中存储为0x12 0x34 0x56 0x78，小端序则存储为0x78 0x56 0x34 0x12。

在网络通信过程中，通常使用的是大端序。这是因为早期的网络硬件大多采用了 Motorola 处理器，而 Motorola 处理器使用的是大端序，此外，大多数网络协议规定了网络字节序必须为大端序。

因此，在进行网络编程时，需要将主机字节序转换为网络字节序，也就是将数据从本地字节序转换为大端序。可以使用诸如 htonl、htons、ntohl 和 ntohs 等函数来实现字节序转换操作。

## 判断字节序

假如让你判断一下自己的机器的字节序是什么，你会怎么做？笔者这里给出几个方法：

使用bash内置指令：

```bash
lscpu | grep -i endian
```

使用c++进行字面翻译：

```cpp
bool is_little_endian() {
  int num = 1;
  return *(reinterpret_cast<char*>(&num)) == 1;
}
```

使用内置函数：

```cpp
void test1() {
  auto res = static_cast<int>(std::endian());
  if (res == 1) {
    std::cout << "Little-endian\n";
  } else {
    std::cout << "Big-endian\n";
  }
}
```

在asio中，主要使用 `boost::asio::detail::socket_ops::` 下的几个函数，如 `host_to_network_short` 和 `network_to_host_short` 等，还有对应的long的版本。

## 字节序修改

我们需要修改一下消息节点相关的部分，上节中我们给消息节点区分为 LV，对于这个长度信息，我们需要进行字节序转换，而实际的包体我们后续会使用 protobuf 或者 jsoncpp 等进行序列化，此处只需要关心长度信息的转换即可。

在接收消息时，我们在 `Session::handle_read` 中，读取到包头的长度信息后应该将其转换为主机字节序：

```cpp
short data_len = 0;
memcpy(&data_len, _recv_head_node->_data, HEAD_LENGTH);
// 读取到长度后，增加如下这一行的转换
data_len = (short)boost::asio::detail::socket_ops::network_to_host_short(static_cast<u_short>(data_len));
logger.info("receive data len is: {}\n", data_len);
```

同时，构造发送节点时也应该把本机的长度信息转换为网络字节序：

```cpp
MsgNode(char *data, short max_len) : _max_len(max_len + HEAD_LENGTH) {
  _data = new char[static_cast<size_t>(_max_len + 1)]();
  // 增加如下这一行的转换
  auto head_len = boost::asio::detail::socket_ops::host_to_network_short(static_cast<u_short>(max_len));
  memcpy(_data, &head_len, HEAD_LENGTH);
  memcpy(_data + HEAD_LENGTH, data, static_cast<size_t>(max_len));
  _data[_max_len] = '\0';
}
```

至此，我们完成了字节序的转换，确保本机的读写是主机字节序，而网络传输时是网络字节序。

## 发送队列控制

前面的发送是统一调用了我们封装的 `Sesson::Send()` 接口，为了防止网络线程和逻辑线程对发送队列的竞争，引入了保护机制，但是，如果没有任何限制的话，同一个 Session 的消息队列可能会堆积大量的消息，导致内存占用过高，所以，每个连接的消息队列需要设置一个上限，超过上限后，需要丢弃消息，修改方面就很简单：

```cpp
void Session::Send(char *data, size_t leng) {
  // 保持不变
  {
    std::scoped_lock<std::mutex> lock{_send_mtx};
    pending = _send_queue.empty();
    if (_send_queue.size() >= SEND_QUEUE_MAX_LEN){
      logger.error("the send queue is too long, don't push new bag\n");
      return;
    }
    _send_queue.emplace(node);
  }
  // 保持不变
}
```

# 总结

本节我们介绍了字节序的相关知识，同时修改了原服务器代码，添加了字节序转换和发送队列控制。

本节的核心是： **字节序转换和发送队列控制**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/9-bytes-order/src/main.cc)。