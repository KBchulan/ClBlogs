---
title: 13 服务器优雅退出

article: true
order: 13
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-18

description: 修改主函数，通过捕捉信号的方式实现优雅退出
footer: Always coding, always learning
---

<!-- more -->

# 13 服务器优雅退出

上一节我们引入了逻辑层，所有网络层的数据都会被投递到逻辑队列，由逻辑层逐一处理，但是请考虑这么一个情况，我们关闭服务器(比如按下 ctrl + c)，那么该进程是不是会被强行杀死，而不会调用任何析构函数，且不提各个对象无法被析构导致的内存泄露，就假设逻辑队列存在十分重要的充值等信息，是不是没有被处理就丢失了，那很显然是无法接受的，本节我们就是解决此隐患。

## 修改服务器

在main()函数中我们只需要增加对信号的处理即可，完整的main函数如下：

```cpp
int main() {
  try {
    boost::asio::io_context ioc;

    boost::asio::signal_set signals(ioc, SIGINT, SIGTERM);
    signals.async_wait([&ioc](const boost::system::error_code& err, int signal_number) -> void {
      if (!err) {
        logger.info("Received signal: {}, the server stoped.", signal_number);
        ioc.stop();
      } else {
        logger.error("Error receiving signal: {}", err.message());
      }
    });

    core::Server server{ioc, 10088};
    ioc.run();

  } catch (const boost::system::error_code& err) {
    logger.error("error code is: {}", err.value());
  }
}
```

我们向`asio::signal_set`注册了 **SIGINT** 和 **SIGTERM** 这两个进程信号。**SIGINT** 通常在用户按下`Ctrl+C`时触发，而 **SIGTERM** 是标准的程序终止信号，允许程序进行清理工作。

通过`signals.async_wait`注册的回调函数会在捕捉到上述信号时被执行。在回调中，我们调用了`ioc.stop()`，这个操作会使主线程中的`ioc.run()`调用立即返回，让 main 函数得以继续执行并准备退出。

这正是实现优雅退出的关键所在：
1. **程序退出流程启动**：`main`函数继续执行并走向终点。
2. **触发析构**：由于我们遵循RAII设计，`main`函数作用域内的所有栈上对象（例如`Server`实例）会在此刻被自动析构。
3. **安全关闭**：逻辑层单例的析构会设置_stop标志，停止接收新的数据请求，并跳出工作线程的循环，将消息队列中所有待处理的任务全部完成后退出。

通过这套机制，我们确保了服务器在关闭前能够处理完所有挂起的重要业务，同时所有资源都能被正确释放，从而有效避免了数据丢失和内存泄漏的风险。

## 总结

本节我们通过捕捉 `SIGINT` 和 `SIGTERM` 信号，并结合asio提供的 `asio::signal_set` 中存在的异步等待，实现了一个优雅的服务器退出方案。

本节的核心是：**通过信号处理触发`ioc.stop()`，确保主进程正常退出，从而实现服务器的优雅、安全关闭**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/13-exit/src/main.cc)。
