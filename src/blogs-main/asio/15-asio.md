---
title: 15 多线程模型IOThreadPool

article: true
order: 15
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-23

description: asio的第二种多线程网络模型，类似于单reactor多线程模型
footer: Always coding, always learning
---

<!-- more -->

# 15 多线程模型IOThreadPool

上节我们介绍了第一种多线程模型IOContextPool，主要思想是启动n个线程，每个线程独立运行一个ioc，新的连接到来后分发给不同的ioc，始终由此ioc进行调度回调。

IOThreadPool的思想也很简单，就是类似于单reactor多线程模型，我们同样写一个池子，启动n个线程，不同的是所有的线程共同运行一个专用于网络IO的ioc，当有事件完成通知用户态处理回调，就会有一个线程拿走此回调进行处理，由于asio的aio为我们保证了只会有一个线程拿走回调进行处理，所以也是线程安全的。

## 代码实现

代码的书写上也是很相似的，先看头文件：

```cpp
class CORE_EXPORT IOPool final : public global::Singleton<IOPool> {
  friend class global::Singleton<IOPool>;

private:
  IOPool(std::size_t threadCount = std::thread::hardware_concurrency());

public:
  ~IOPool();

  boost::asio::io_context &getIOContext();

private:
  struct _impl;
  std::unique_ptr<_impl> _pimpl;
};
```

对应的实现只有 **_impl** 构造的时候有些差距：

```cpp
struct IOPool::_impl {
  boost::asio::io_context _ioc;
  boost::asio::executor_work_guard<boost::asio::io_context::executor_type> _work_guard;
  std::vector<std::jthread> _threads;

  _impl(std::size_t threadCount) : _work_guard(boost::asio::make_work_guard(_ioc)) {
    // 创建所有的线程
    _threads.reserve(threadCount);
    for (std::size_t i = 0; i < threadCount; ++i) {
      _threads.emplace_back([this]() -> void {
          _ioc.run();
      });
    }
  }
};

IOPool::IOPool(std::size_t threadCount) : _pimpl(std::make_unique<_impl>(threadCount)) { }

IOPool::~IOPool() { }

boost::asio::io_context &IOPool::getIOContext() {
  return _pimpl->_ioc;
}
```

那么在使用上，只需要在接受到连接时使用此池子暴露的 ioc 即可，我们修改一下`Server.cc`：

```cpp
void Server::start_accept() {
  auto &ioc = ioPool.getIOContext();
  auto new_sess = std::make_shared<Session>(ioc, this);
  ··· 其他代码
}
```

可以看出，我们在初始化时初始了匹配核数的线程，所有的线程都跑一个ioc，当有新的连接过来时都根据此ioc进行创建，那么对应的读写回调都会被投递到此ioc的调度队列中，有线程池中的其中一个线程进行调度，分析一下并发安全性：

* 对于同一个连接，同一个时刻只有一个读回调和可能存在的写回调，结合ioc调度机制，只会有一个线程拿到回调处理，因此是线程安全的。
* 对于多个连接，各自有自己的TCP缓冲区，更不存在干扰的情况。

因此这样的多线程模型也是线程安全的，完全可以投入使用。

## 性能测试

选择相同的客户端进行测试，多次测试取平均值，最终的成绩是1463ms，嗯，是不如上一节的服务器的，但是作为多线程模型，还是很有必要介绍一下的，毕竟思想才是重心，写法只是呈现。

## 总结

本节我们介绍了另一种多线程模型 `IOThreadPool`，它通过创建多个线程共同运行一个专用的 `io_context` 实例来处理网络事件。

本节的核心是：**所有线程共享同一个 `io_context`**，当事件就绪时，线程池中的一个线程会获取并处理回调，这种方式类似于单 Reactor 多线程的网络并发模型。

虽然在我们的测试中其性能不如 `IOContextPool`，但它展示了另一种重要的多线程设计思想。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/15-iothread_pool/src/main.cc)。
