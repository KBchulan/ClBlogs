---
title: 01 同步API

article: true
order: 1
star: false

category:
  - 网络

tag:
  - asio

date: 2025-06-26

description: socket的回顾、asio简介以及基本API
footer: Always coding, always learning
---

<!-- more -->

# socket的监听与连接

## socket简单回顾

在学习asio之前，我们应当对socket编程具有基本的了解，这里简单介绍一下思想，实际代码的话可以随便上网找到：

**服务器端**：
  - socket(): 创建一个socket对象，用于服务一个端口
  - bind(): 绑定主机的 ip + port，准备监听此端口
  - listen(): 开始监听，等待客户端连接
  - accept(): 接受客户端连接，返回一个新socket对象，通过这个新的socket对象与客户端进行read/write

**客户端**：
  - socket(): 创建一个socket对象，用于连接服务器
  - connect(): 通过指定ip + port连接服务器
  - read/write(): 通过socket对象与服务器进行read/write

整体来说还是非常简单的，这里我们把那张经典的图再看一遍：

![](/assets/pages/asio/1-1.jpg)

## 初识asio

这种最简单的服务器一个socket只能与一个客户端进行通信，那如果我们想要让一个服务器承担多客户端的通信，最简单的方式就是多开几个线程，每个线程对应一个socket，但是假设要给10w个客户端通信呢，这种方式很显然就不现实了对吧，毕竟线程的创建和销毁，以及切换和调度都会带来很大的开销。

因此经典池化思想就用上了，我们可以开一个线程池，当来了一个事件(连接或者read/write)，就从线程池中取出一个线程来处理，处理完之后再放回线程池，以此减少开销，但是问题又又又来了，多个事件会被分到同一个socket上，那假如说我们采用的是默认socket操作，那遇到一个阻塞的read/write，那其他事件岂不是都要被阻塞了，这显然是不合理的。

最简单的解决方案是采用非阻塞的socket，采用轮询的方式来处理，但这样又会造成大量cpu开销。

真正优秀的解决方案应该是我们经典的IO多路复用模型([select/poll/epoll](https://xiaolincoding.com/os/8_network_system/selete_poll_epoll.html))，它只监听关心的线程，发生事件时切换对应的阻塞线程状态，而不是原来的所有线程都阻塞，但写过的都知道这种面向过程的写着非常难受，因此出现了基于面向对象的两种IO多路复用设计模式：[reactor/proactor](https://xiaolincoding.com/os/8_network_system/reactor.html)，感兴趣的可以看看我给的这两个链接，不过我们的核心还是asio，这里介绍与之相关的部分。

asio整体思想是基于proactor的，[官文这里](https://think-async.com/Asio/asio-1.19.1/doc/asio/overview/core/async.html)，在windows上实现了的[IOCP](https://en.wikipedia.org/wiki/Input/output_completion_port)认为是proactor的经典实现，但是proactor的实现需要基于posix的aio系列接口，并未在linux实现，因此在linux上，asio是基于epoll的reactor模型，模拟实现proactor，因此对用户暴露出来的还是proactor的模式。

## 基本API

### 端点

网络编程大同小异，对客户端来说，我们需要得知服务器的ip + port进行连接，asio将这两个属性封装成一个端点类 `endpoint`，用于表示一个网络地址，那对应的代码就很容易写出了。

```cpp
void client_endpoint() {
  std::string ip_raw = std::string("127.0.0.1");
  unsigned short port = 3333;

  // 错误处理
  boost::system::error_code erroc;
  boost::asio::ip::address ip = boost::asio::ip::make_address_v4(ip_raw, erroc);

  if (erroc.value() != 0) {
    std::cout << std::format("Failed to construct ip, error value is: {}, error msg is: {}\n",
    erroc.value(), erroc.message());
  }

  boost::asio::ip::tcp::endpoint ep{ip, port};
}
```

如你所见，asio的端点需要服务器的ip和port，但这个ip地址不是string，需要构造成一个address对象才可使用，整体思路还是很简单的，补充两个东西：

* 构造一个ip地址：原版本是 `boost::asio::ip::address::from_string`，新版本是 `boost::asio::ip::make_address_v4/v6`，后者更安全，更建议使用
* error_code: 主要封装了错误值和错误类别，这个东西是跨平台的，简单使用的情况下只需要知道0表示成功，否则便是出现了错误，更详细的可以看[这里](https://think-async.com/Asio/asio-1.19.1/doc/asio/reference/error_code.html)

而对于服务器的端点构造而言，就更加简单了，我们只需要指定端口即可，address可以设置为接收任何ipv4/ipv6地址，代码如下：

```cpp
void server_endpoint() {
  unsigned short port = 3333;
  boost::asio::ip::address add{boost::asio::ip::address_v4::any()};
  boost::asio::ip::tcp::endpoint ep{add, port};
}
```

### 套接字

上文我们创建了端点，但是端点说白了只是一个地址，我们通信的载体还是socket，而创建socket我们只需要指定协议类型即可，此处我们以tcp的v4版本为例，来介绍客户端如何创建套接字：

```cpp
void create_tcp_socket() {
  boost::asio::io_context ioc;
  boost::asio::ip::tcp protocol{boost::asio::ip::tcp::v4()};
  boost::asio::ip::tcp::socket socket{ioc, protocol};

  try {
    socket.open(protocol);
  } catch (const boost::system::error_code &ec) {
    std::cout << std::format("Failed to construct ip, error value is: {}, error msg is: {}\n",
        ec.value(), ec.message());
  }
}
```

这里我们简单补充一下与最简单的socket通信不是很一样的几个地方：

* **io_context**：这是 Boost.Asio 的核心组件，可以理解为一个"事件循环管理器"或"I/O调度中心"。它的主要作用包括：

  - **事件循环管理**：io_context 内部维护一个事件循环，负责监听和分发各种 I/O 事件
  - **异步操作调度**：发起异步操作时，io_context 会将这些操作加入队列，并在适当的时候执行回调函数
  - **线程安全的事件分发**：它确保回调函数在正确的线程中执行，避免竞态条件
  - **跨平台抽象**：在不同平台上（Windows的IOCP、Linux的epoll等），io_context 提供统一的接口

  正如我们上文提到的asio的接口暴露都是proactor模式，io_context的本质基本就是proactor的实现，理解了这个基本就知道了为什么这个socket需要绑定到对应ioc上，毕竟IO多路复用的本质就是只监听关心的socket。

* **socket.open()**：这个方法用于打开socket并绑定到指定的协议族（如IPv4 TCP），但是需要注意的是，新版本的boost.asio可以在连接或其他操作时自动打开，这里只是为了演示一下，实际开发中我们只需要写前三行就行了。

对于服务器，创建socket是一样的，但是服务器还有一个acceptor，用于监听客户端连接，我们这里写一下示例，其实都是一样的：

```cpp
void create_appertor_socket() {
  boost::asio::io_context ioc;
  boost::asio::ip::tcp protocol{boost::asio::ip::tcp::v4()};
  boost::asio::ip::tcp::acceptor acceptor(ioc, protocol);

  try {
    acceptor.open(protocol);
  }  catch (const boost::system::error_code &ec) {
    std::cout << std::format("Failed to construct ip, error value is: {}, error msg is: {}\n",
        ec.value(), ec.message());
  }
}
```

### 绑定

对于服务器，我们的acceptor可以选择在构造时直接指定端点，这样可以直接绑定，当然也可以手动绑定，这里以手动绑定为例：

```cpp
void create_bind_socket() {
  unsigned short port = 3333;
  boost::asio::io_context ioc;
  boost::asio::ip::tcp::endpoint ep{boost::asio::ip::address_v4::any(), port};

  // 这种创建出来的是没有绑定端口的acceptor，需要我们手动绑定
  boost::asio::ip::tcp::acceptor acce{ioc, ep.protocol()};

  try {
    acce.bind(ep);
  } catch (const boost::system::error_code &ec) {
    std::cout << std::format("Failed to construct ip, error value is: {}, error msg is: {}\n",
        ec.value(), ec.message());
  }
}
```

### 连接

那客户端的连接操作自然就水到渠成了，直接调用socket的connect方法即可：

```cpp
void connect_to_endpoint() {
  std::string raw_add{"127.0.0.1"};
  unsigned short port = 3333;

  try {
    boost::asio::io_context ioc;
    boost::asio::ip::tcp::endpoint ep{boost::asio::ip::make_address_v4(raw_add), port};

    boost::asio::ip::tcp::socket sock{ioc, ep.protocol()};

    sock.connect(ep);

  } catch (const boost::system::error_code &ec) {
    std::cout << std::format("Failed to construct ip, error value is: {}, error msg is: {}\n",
        ec.value(), ec.message());
  }
}
```

那么如果服务器是一个域名呢，我们就需要引入dns解析了，也是tcp命名空间下的一个东西，示例代码如下：

```cpp
void dns_connect_to_endpoint() {
  std::string host = "chulan.xin";
  std::string port = "80";

  try {
    boost::asio::io_context ioc;
    boost::asio::ip::tcp::resolver resolver{ioc};
    auto endpoints = resolver.resolve(host, port);

    // 连接解析出来的第一个东西
    boost::asio::ip::tcp::socket sock{ioc};
    sock.connect(*endpoints.begin());

  } catch (const boost::system::error_code &ec) {
    std::cout << std::format("Failed to construct ip, error value is: {}, error msg is: {}\n",
        ec.value(), ec.message());
  }
}
```

注意，我们解析出来的endpoints是一个迭代器，包含所有解析出来的端点，可以通过`endpoints.begin()->endpoint()`获取到对应的端点然后再进行连接。

### 接收连接

对应服务器接收连接的代码也很简单，只需要在前面的acceptor中调用accept方法即可，整体思路跟普通的socket编程是一致的：

```cpp
void accept_new_connection() {
  unsigned short port = 3333;
  int BLOCK_SIZE = 30;  // 指定30个最大的
  boost::asio::ip::tcp::endpoint ep{boost::asio::ip::address_v4::any(), port};
  boost::asio::io_context ioc;

  try {
    boost::asio::ip::tcp::acceptor acceptor{ioc, ep.protocol()};
    acceptor.bind(ep);
    // 可以指定最多监听多少
    acceptor.listen(BLOCK_SIZE);

    /**
      * 以上三行代码可以简化为：
      * boost::asio::ip::tcp::acceptor acceptor{ioc, ep};
      */

    // 开一个socket用于通信
    boost::asio::ip::tcp::socket sock{ioc, ep.protocol()};
    acceptor.accept(sock);
  } catch (const boost::system::error_code &ec) {
    std::cout << std::format("Failed to construct ip, error value is: {}, error msg is: {}\n",
        ec.value(), ec.message());
  }
}
```

## 总结

在本节中，我们回顾了socket的基本流程，包括服务器和客户端相关的。

接着我们介绍了asio的基本思想，即proactor模式，并介绍了asio的基本API，包括端点，套接字，绑定，连接，接收连接等。

本节的核心在于：**IO多路复用，网络基础**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/1-socket/endpoint.cc)。
