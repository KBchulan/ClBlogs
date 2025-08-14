---
title: 05 并发设计模式

article: true
order: 5
star: false

category:
  - 并发

tag:
  - cpp

date: 2025-08-13

description: 介绍一下常见的并发设计模式：Actor 和 Csp 模式
footer: Always coding, always learning
---

<!-- more -->

# 05 并发设计模式

传统的并发设计都是基于 **互斥锁 + 共享状态** 一类的方案，但是这种方案存在无法解决的痛点：

- 可能出现的死锁风险
- 在一些高并发场景，频繁的加锁解锁影响性能
- 程序耦合度高，难以维护，写代码非常的耗费心智，必须小心翼翼的考虑所有的竞态条件
- 还有最最让人痛苦的调试，线程的执行顺序不同，难以重现和复现问题

问题的根源就在于存在 **可被多个线程访问的共享状态** ，那如果说我们能从根本上消除这个共享状态，是不是就解决这个问题了，也正是我们本节要介绍的两种主要的并发设计模式：**Actor 和 Csp 模式**。

## Actor 模式

Actor 模式提供了一种全新的思考方式，既然大家同时访问同一个资源会导致冲突，那只要 **一个功能的资源只能被一个线程访问不就行了**，管理这个资源的线程就是一个 Actor。例如：需要报账就找财务，开发就找程序猿，各个工作岗位不能访问对方的私有资源，只能通过邮箱通信。

此时用通俗的语言来详细说一下 Actor 的设计核心：

- **与世隔绝**：一个 Actor 管理自己的内部状态，不能直接访问另一个 Actor 的内部状态。
- **排队办事**：每个 Actor 都有一个消息队列，它每次取出一个消息进行处理，这就避免了竞态条件。
- **邮件沟通**：Actor 之间通过发送 **异步消息** 进行通信，把消息发出去就行，不用等待对方处理完。

对于 Actor 的使用，目前已经有一些比较成熟的库如 [CAF](https://github.com/actor-framework/actor-framework) 可以在生产环境中使用，此处我们手动实现一个比较简单的 Actor 模式：

```cpp
class Actor {
  using Message = std::function<void()>;

private:
  void run() {
    while (true) {
      Message msg;
      {
        std::unique_lock<std::mutex> lock{_mtx};
        _cv.wait(lock, [this]() -> bool {
          return _stop || !_msgBox.empty();
        });

        if (_stop && _msgBox.empty()) {
          break;
        }
        msg = std::move(_msgBox.front());
        _msgBox.pop();
      }
      msg();
    }
  }

public:
  Actor() : _actorThread(&Actor::run, this) {}

  virtual ~Actor() {
    {
      std::lock_guard<std::mutex> lock{_mtx};
      _stop = true;
    }
    _cv.notify_one();
  }

  void send(Message msg) {
    {
      std::lock_guard<std::mutex> lock{_mtx};
      if (_stop) {
        throw std::runtime_error("Actor has been stopped, cannot send message.");
      }
      _msgBox.push(std::move(msg));
    }
    _cv.notify_one();
  }

private:
  std::mutex _mtx;
  std::jthread _actorThread;
  std::condition_variable _cv;

  bool _stop{false};
  std::queue<Message> _msgBox;
};
```

看完实现你可能会发现，这个写法怎么这么熟悉，这不是和 [网络逻辑层](https://kbchulan.github.io/ClBlogs/blogs-main/asio/12-asio.html#%E9%80%BB%E8%BE%91%E5%B1%82%E8%AE%BE%E8%AE%A1) 以及刚刚学过的 [线程池](https://kbchulan.github.io/ClBlogs/blogs-main/concurrent/04-con.html#%E7%BA%BF%E7%A8%8B%E6%B1%A0) 一模一样嘛，确实是这样的，这些都是 Actor 的实际使用场景。

然后用如下的方式进行使用：

```cpp
class CounterActor final : public Actor {
public:
  void increment() {
    this->send([this] -> void {
      ++_count;
      std::print("count: {}\n", _count);
    });
  }

private:
  int _count{0};
};

int main() {
  CounterActor counter_actor;

  // 主线程进行投递
  for (int i = 0; i < 10; ++i) {
    counter_actor.increment();
  }

  std::this_thread::sleep_for(std::chrono::seconds(3));

  // 其他线程进行投递
  std::jthread thr{[&counter_actor]() {
    for (int i = 0; i < 10; ++i) {
      counter_actor.increment();
    }
  }};

  std::this_thread::sleep_for(std::chrono::seconds(3));
}
```

例子还是很简单的，且核心总结下来就一句话：**各个 Actor 自己维护一个线程来串行处理队列中的消息，彼此通过消息传递进行通信**。

你会发现这个 Actor 这个名字起的就很好，它在中文上是 **演员**，很贴合这种设计，因为在这个设计中，各个对象各司其职，扮演着自己的角色。

很多优秀的设计都能体现这个模式，比如虚幻的 AActor，以及天然支持此模式的 Erlang，我们这里总体介绍一下优势：

- **从根源上消除竞态条件和死锁**：串行操作保证了消息处理的顺序，且由于整体是靠事件流动的，不会出现依赖导致的死锁。

- **更方便的开发**：不需要关心锁了，只需要 **设计一下消息以及怎么传递** 即可，更贴近业务。

- **容错性高**：这个是很重要的，我们多说一下，假设这么一个场景：我们有很多线程，每个线程维护一个地图及相关的交互，还有一个商店类，对外暴露了一个购买接口。

  - **传统并发下**，商店就是共享资源，那么就应该加锁，先不考虑频繁加锁的性能消耗，假设这个接口写的有毛病会有什么问题？没错，会导致调用它的线程崩溃，在用户看来，我们进入这个地图后，刚开始游玩、交互什么都是正常的，但是一旦买东西，就整个地图任何功能都用不了了，**这是很糟糕的情况**。
  - **Actor 模式下**，即使商店类整个坏掉了，也只会导致投递到此 Actor 的消息无法正常处理，但是对于其他 Actor 来说，其他功能完全可以正常运行。

- **更容易扩展**：比如想获取到消息的结果，那可以把 send 接口修改为 `std::future`，和上节的线程池一样，当然由于此模式下完全基于信息交互，因此完全可以封装为网络接口，实现集群，彼此投递消息。

## Csp 模式

在了解了 Actor 模式之后，我们来看另一种主流的并发设计模式：**CSP**，即通信顺序进程。简单说来 Actor 模式的核心是 **Actor 本身**，CSP 模式的核心则是 **Channel**。

我们来介绍一下 CSP 模式的设计核心：

- **通信通道**：各个进程之间不直接通信，而是通过一个叫做 Channel 的管道进行，生产者把生产的数据放入 Channel 中，消费者可以从中取出，生产者并不关心谁来消费。
- **同步通信**：默认情况下都是采用无缓冲模式，即向 Channel 发送数据会阻塞，直到有另一个进程准备好从这个 Channel 接收数据，反之亦然。

事实上，CSP 根据 Channel 的类型分为 **有缓冲** 和 **无缓冲** 两种，后者只能存放一个数据即阻塞，前者则可以是多个数据，此处我们写一下无缓冲Channel：

```cpp
template <typename T> class Channel {
public:
  void send(T data) {
    {
      std::unique_lock<std::mutex> lock{_mtx};
      if (_stop) {
        throw std::runtime_error("Channel has been stopped, cannot send data.");
      }

      _send_cv.wait(lock, [this]() { return !_data.has_value(); });
      _data = std::move(data);
    }
    _recv_cv.notify_one();
  }

  std::optional<T> recv() {
    std::optional<T> data;
    {
      std::unique_lock<std::mutex> lock{_mtx};

      _recv_cv.wait(lock, [this]() { return _stop || _data.has_value(); });

      if (_stop && !_data.has_value()) {
        return std::nullopt;
      }

      data = std::move(_data);
      _data.reset();
    }
    _send_cv.notify_one();
    return data;
  }

  void stop() {
    {
      std::lock_guard<std::mutex> lock{_mtx};
      _stop = true;
    }
    _send_cv.notify_all();
    _recv_cv.notify_all();
  }

private:
  bool _stop{false};
  std::optional<T> _data;

  std::mutex _mtx;
  std::condition_variable _send_cv;
  std::condition_variable _recv_cv;
};
```

上述无缓冲 Channel 的实现非常简单，就是条件变量的基本使用，这里不再逐行解释，除此之外还有一个 [有缓冲版本](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/concurrent/05-actor-csp/buffercsp.cc)，可以查看一下。

同样分析一下这个模式的优势：

- **隐式同步**：同步是通信的一部分，而不是一个需要手动管理的独立操作，不必担心死锁。
- **高度解耦**：进程之间是匿名的，它们只关心 Channel，不关心 Channel 的另一端是谁。
- **可扩展性**：简单的进程和 Channel 可以像乐高积木一样组合成复杂的并发模式，如流水线、扇入、扇出等，甚至说我们设计一下这个 Channel，还可以实现一个简化版的 MQ，如 RabbitMQ。

在后现代语言中，如 Go，Rust，其实都是天然支持 Csp 这种模式的，这使得这些语言构建并发程序很容易，但是招无定式，只要理解这个思想，不管是程序设计还是学习这些语言，都会很有帮助。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/concurrent/05-actor-csp/actor.cc)。
