---
title: 16 协程API

article: true
order: 16
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-25

description: 介绍asio中协程相关api，基于协程写一个单文件的demo版本的异步服务器
footer: Always coding, always learning
---

<!-- more -->

# 16 协程API

## 什么是协程

协程（Coroutine），也称为用户级线程或纤程（Fiber），是一种程序组件，更简单的说，协程是一种可以暂停和恢复的函数。

与由操作系统内核进行抢占式调度的线程不同，协程的调度是**协作式**的，完全由程序在用户空间中控制。

一个协程可以在执行过程中的任意位置**暂停**（yield、await），将控制权交给其他协程，并在稍后从暂停的位置**恢复**（resume）执行。它的所有状态（包括局部变量、指令指针等）都被保存在内存中（通常是堆上），直到下一次恢复。

其主要特点如下：

*   **内存占用小**：每个协程的栈空间通常比线程小得多，因此在相同内存下可以创建数量远超线程的协程。
*   **极低的上下文切换开销**：协程的切换发生在用户态，无需陷入内核，因此比线程切换快得多，因此管理大量协程成为可能。
*   **高效的 I/O 操作**：当一个协程遇到 I/O 等待时，CPU 可以去执行其他就绪的协程，从而大大提高并发能力和资源利用率。
*   **简化的异步编程模型**：使用协程可以让我们用看似同步的方式编写异步代码，避免了复杂的回调地狱，在下面的异步服务器示例中你会看到协程下的代码有多简洁。

对于cpp标准库的协程，我在[03协程](https://kbchulan.github.io/ClBlogs/blogs-main/cpp/03-cpp.html)的章节已经介绍过了，标准库提供的协程给予我们完全自由的控制权，但是也让我们不得不编写大量符合规定的类，导致使用成本偏高，因此我们习惯性的使用已经封装好的协程库，大多数公司内部应该都有，本节我们介绍Boost.Asio为我们封装的协程。

## 基础介绍

对于asio的协程使用，我们需要知道两个操作即可：

### 创建协程
`boost::asio::co_spawn` 用于启动新协程，它负责将协程函数（一个返回 `awaitable` 的函数对象）提交到指定的执行器（executor，通常是 `io_context`）上运行。它的基本形式如下：

```cpp
// co_spawn(执行器, 协程函数, 完成令牌);
boost::asio::co_spawn(my_executor, my_coroutine_function(), boost::asio::detached);
```

- **第一个参数**：协程的运行环境，告诉 asio 使用什么执行器调度这个协程。
- **第二个参数**：协程函数调用。这个函数必须返回一个 `asio::awaitable<T>` 对象，这个对象就是cpp要求我们实现的协程类对象，返回的有一个句柄，可以用于恢复或删除协程。
- **第三个参数**：一个完成令牌，用于在协程执行完毕后进行回调。最常用的 `asio::detached` 表示我们不关心协程的返回值或最终状态，执行完即可，当然也可以自定义一个lambda函数，用于处理协程的返回值，这个和普通的异步编程很像。

### 修改函数

为了让普通异步函数能被协程使用（即能够被 `co_await`），需要进行两处改造：

- **修改函数签名**：将函数的返回类型改为 `asio::awaitable<T>`。这里的 `T` 是异步操作的最终结果类型。如果操作没有结果，则使用 `asio::awaitable<void>`。这就像在 JavaScript 中将一个普通函数声明为 `async` 函数一样，标志着它是一个异步的、可等待的流程。

- **修改异步调用**：在调用 Asio 的异步函数（如 `async_read`, `async_wait` 等）时，将最后一个参数（原本的回调函数）替换为 `asio::use_awaitable`，这个类似于 JavaScript 中的 `await`，调用时会立刻交出控制权给调用处，并阻塞当前协程直到 `co_await` 后的表达式返回结果。

## 服务器示例

我们此处先给一个简单的协程服务器，后续再加入前面的所有东西：

```cpp
#include <boost/asio/co_spawn.hpp>
#include <boost/asio/detached.hpp>
#include <boost/asio/ip/address_v4.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/this_coro.hpp>
#include <boost/asio/awaitable.hpp>
#include <boost/asio/io_context.hpp>
#include <boost/asio/signal_set.hpp>
#include <boost/asio/use_awaitable.hpp>
#include <boost/asio/write.hpp>
#include <boost/system/system_error.hpp>

#include <iostream>
#include <array>

boost::asio::awaitable<void> echo(boost::asio::ip::tcp::socket soc) {
  try {
    std::array<char, 1024> data;
    while (true) {
      auto size = co_await soc.async_read_some(boost::asio::buffer(data.data(), 1024), boost::asio::use_awaitable);
      co_await boost::asio::async_write(soc, boost::asio::buffer(data.data(), size), boost::asio::use_awaitable);
    }
  } catch (boost::system::system_error &se) {
    std::cerr << std::format("error code is: {}, error msg is: {}\n", se.code().value(), se.code().message());
  }
}

boost::asio::awaitable<void> acceptor() {
  auto exector = co_await boost::asio::this_coro::executor;
  boost::asio::ip::tcp::acceptor acceptor{exector, {boost::asio::ip::address_v4::any(), 10088}};
  std::cout << "Server is running on port 10088\n";

  while (true) {
    auto socket = co_await acceptor.async_accept(boost::asio::use_awaitable);
    boost::asio::co_spawn(exector, echo(std::move(socket)), boost::asio::detached);
  }
}

int main() {
  try {
    boost::asio::io_context ioc;
    boost::asio::signal_set signals(ioc, SIGINT, SIGTERM);
    signals.async_wait([&ioc](const boost::system::error_code &ec, int signal_number) -> void {
      if (!ec) {
        std::cout << "Received signal: " << signal_number << ". Stopping io_context.\n";
        ioc.stop();
      } else {
        std::cerr << "Error waiting for signal: " << ec.message() << '\n';
      }
    });

    boost::asio::co_spawn(ioc, acceptor(), boost::asio::detached);

    ioc.run();
  } catch (boost::system::system_error &se) {
    std::cerr << std::format("error code is: {}, error msg is: {}\n", se.code().value(), se.code().message());
  }
}
```

可以看到，我们主线程启动了一个协程，他会在此协程中创建acceptor，我们此处以这个async_accept为例，说一下协程的方式会是怎么作用的：

当我们调用到 `co_await` 后，如果后面的表达式没有执行完(此处为是否接收到连接)，则会暂停此协程，由ioc调度让其他就绪的协程恢复，直到异步接收成功，则ioc调度堆区协程帧恢复，从暂停的那一行开始继续向下执行。

可以看出来，调度的思路和异步是一模一样的，但是写出来的代码很简洁，这就是协程的好处之一：**以同步的代码书写异步服务**。

> ps：虽然协程完全基于用户空间调度，但是仍有上下文调度开销，所以性能上如果不做优化铁定是不如常规的异步回调的书写方式的，因此是否选择协程应根据实际取舍。

## 总结

本节我们介绍了协程、以及如何在 boost.asio 中使用协程，它只是帮我们省略了返回类的定义，其他大部分还是应该由我们自己调度掌握。

本节的核心是：**协程认知及如何在asio中使用**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/16-coroutine-api/server.cc)。
