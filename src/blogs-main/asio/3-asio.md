---
title: 03 同步服务器的简单实现

article: true
order: 3
star: false

category:
  - 网络

tag:
  - asio

date: 2025-06-30

description: 实现一个echo的同步服务器
footer: Always coding, always learning
---

<!-- more -->

# 同步服务器的简单实现

上面两节我们介绍了同步相关的API，本节我们给这些东西串联起来，实现一个简单的同步应答服务器，也就是我们的echo服务器。

## 客户端

对于客户端来说，我们可以思考一下，每一个客户端都是独立的，因此可以直接粗暴的选择`boost::asio::read/write`来实现读写，剩下的操作都在上文介绍了，经典 socket -> connect -> read/write。

```cpp
#include <boost/asio.hpp>
#include <cstddef>
#include <cstring>
#include <iostream>

#define MAX_LENGTH 1024

int main() {
  try {
    boost::asio::io_context ioc;
    boost::asio::ip::tcp::endpoint ep{boost::asio::ip::make_address_v4("127.0.0.1"), 10088};

    boost::asio::ip::tcp::socket sock{ioc, ep.protocol()};

    sock.connect(ep);

    std::cout << "Enter message: ";
    char send[MAX_LENGTH];
    std::cin.getline(send, MAX_LENGTH);
    std::size_t length = strlen(send);
    boost::asio::write(sock, boost::asio::buffer(send, length));

    char receive[MAX_LENGTH];
    std::size_t recive_len = boost::asio::read(sock, boost::asio::buffer(receive, length));
    std::cout << "Received message is: ";
    std::cout.write(receive, recive_len);
    std::cout << '\n';

  } catch (const boost::system::system_error& ex) {
    std::cout << std::format("error code is: {}, msg is: {}\n", ex.code().value(), ex.code().message());
  }
}
```

这里面需要注意的是，connect以及read/write都会出现异常，此处我们选择全部都丢给catch处理，可以选择更为精细的异常控制，即像api介绍章节的处理方式。

## 服务器

对于服务器我们需要考虑的比较多，此处我们选择主线程acceptor，子线程处理读写，具体实现可以先看一下代码，然后再介绍：

```cpp
#include <boost/asio.hpp>
#include <cstring>
#include <iostream>
#include <memory>
#include <thread>
#include <vector>

#define MAX_LENGTH 1024

using PtrSocket = std::shared_ptr<boost::asio::ip::tcp::socket>;
std::vector<std::shared_ptr<std::jthread>> threads;

void session(PtrSocket sock) {
  try {
    for (;;) {
      char receive[MAX_LENGTH];
      memset(receive, '\0', MAX_LENGTH);
      boost::system::error_code ec;

      // 此处我们假设不存在粘包情况，即采用read_some也能读完
      sock->read_some(boost::asio::buffer(receive, MAX_LENGTH), ec);

      if (ec == boost::asio::error::eof) {
        std::cout << std::format("connection error: {}\n", ec.message());
        break;
      } else if (ec) {
        throw boost::system::system_error{ec};
      }

      std::cout << std::format("Receive from client: {}, message is: {}\n", sock->remote_endpoint().address().to_string(), receive);

      // 发送回去
      boost::asio::write(*sock, boost::asio::buffer(receive, MAX_LENGTH), ec);
    }
  } catch (const boost::system::system_error &se) {
    std::cout << std::format("error code is: {}, error msg is: {}\n", se.code().value(), se.code().message());
  }
}

void server(boost::asio::io_context &ioc, unsigned short port) {
  boost::asio::ip::tcp::endpoint ep{boost::asio::ip::address_v4::any(), port};
  boost::asio::ip::tcp::acceptor acceptor{ioc, ep};

  std::cout << "Server is running on port " << port << '\n';

  for (;;) {
    PtrSocket sock{new boost::asio::ip::tcp::socket{ioc}};
    acceptor.accept(*sock);

    // 进入通信
    auto thr = std::make_shared<std::jthread>(session, sock);
    threads.emplace_back(thr);
  }
}

int main() {
  try {
    boost::asio::io_context ioc;
    server(ioc, 10088);

  } catch (const boost::system::system_error &se) {
    std::cout << std::format("error code is: {}, error msg is: {}\n", se.code().value(), se.code().message());
  }
}
```

可以看到我们主要有两个函数，先来看一下 server()，此处需要注意的有：
* `io_context` 只能引用传递，不能拷贝

* 子线程处理：我们选择为每一个新连接创建一个 `std::jthread`，然后把他加入到一个统一的vector进行读写处理，这里面有两个问题，一个是为什么要开辟新线程，另外一个是新线程为什么要放到vector里。

  - 问题1：如果我们选择在主线程直接开一个session的话，那么在session处理read/write时是不是会阻塞 acceptor，也就是说新连接无法接收，这很显然是我们不能接受的，同时使用 `std::jthread` 可以很方便的实现线程的自动回收，确保即使 acceptor 退出，子线程也会处理完才会退出。

  - 问题2：因为主线程会一直循环，那么当前线程变量的生命周期是不是会立马结束，就可能导致读写操作还没有完成，线程就退出了，用了shared_ptr可以延长他的周期直到vector销毁，这样就确保了读写操作完整执行。

* 读写操作：我们假设 `read_some` 可以直接读完，但是实际中可能存在粘包的情况，这里只是为了演示。

## 总结

本节我们实现了同步的echo服务器，优点就是好写，至于缺点：

- 读写是阻塞的，如果客户端对端不发送数据服务器的read操作是阻塞的，这将导致服务器处于阻塞等待状态。

- 我们选择为每一个连接创建一个线程，但是一个进程可以创建的线程数是有限的，windows上是2048，linux倒是可以通过ulimit -u 来修改，但是治标不治本，而且过多的线程调度也很耗费资源。

- 该服务器和客户端为应答式，实际场景为全双工通信模式，发送和接收要独立分开。

- 该服务器和客户端未考虑粘包处理。

因此，距离真正可以使用的服务器还有很远的路要走，不过至此也是算半只脚踏入asio的大门了，可喜可贺可喜可贺。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/3-sync-cs/server.cc)。