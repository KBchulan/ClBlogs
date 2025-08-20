---
title: 04 并发三剑客

article: true
order: 4
star: false

category:
  - 并发

tag:
  - cpp

date: 2025-08-12

description: 介绍一下 cpp 中的并发三剑客：async、future、promise，并设计一个线程池
footer: Always coding, always learning
---

<!-- more -->

本节我们会着手介绍一下 cpp 封装的高级异步编程工具，并基于这些工具实现一个线程池。

## future

你可能发现了，在前面的三节内容中，我们启动的所有线程的返回值都是 `void`，也就是我们不需要关心它们的执行结果，那假如说返回结果是有用的，又该怎么获取到这个返回结果呢？

很显然如果我们强行使用 `std::thread` 相关的调用是无法直接获取到返回值的，唯一的方案就是传递引用，并在线程回调内部进行修改，一看就知道咋写，但是总感觉别别扭扭的，就没有更优雅的方案来获取线程回调的返回值吗？

`std::future` 就是为了解决这个问题而设计的：**它可以表示一个在未来的值，也就是线程的返回值**，接下来我们先剖析一下它的底层实现.

### 共享状态

首先需要认知的是：`std::future` 自身并不存储数据，它只是一个句柄，真正的核心是与它相关联的一个 **共享状态** 对象，这个共享状态是 `std::future` 和它的数据生产者之间的通信桥梁，为了方便理解，此处给出一个概念性的数据结构：

```cpp
class SharedState {
private:
    // 用于保护所有成员的互斥锁
    std::mutex mtx;

    // 用于等待结果的条件变量
    std::condition_variable cv;

    // 标记结果是否已就绪
    bool ready = false;

    // 存储任务的返回值
    std::optional<ValueType> value;

    // 存储任务抛出的异常
    std::exception_ptr exception;

    // 对于 std::shared_future 会多一个引用计数器
    // std::atomic<int> ref_count;
};
```

大多数成员变量看一下注释就了解是什么作用了，此处额外补充一下：

- **value/exception**：在执行异步任务时，如果成功则会存储值，失败的话会存储异常信息，当调用 `get()` 方法时，会根据哪个里面存的有东西进行返回，比如存在异常就重新抛出异常。

- **cv**：这是实现阻塞和唤醒的关键，当调用 `get()` 时发现 ready 为 false，就会使用条件变量在这个共享状态上等待，并释放锁，让出 CPU；当生产者准备好数据后，它会设置 ready 为 true 并通过条件变量通知等待的线程。

### 方法调用

[std::future](https://en.cppreference.com/w/cpp/thread/future.html) 对外总共暴露了 6 个方法：

- get：**获取异步任务的结果**。如果任务尚未完成，则会阻塞当前线程直到任务完成，否则就会把结果从共享状态中移动出来，因此 **只能被调用一次**。

- valid：判断是否与一个共享状态关联，如果调用过 get()/share() 就变成无效的。

- wait：等待异步任务完成，不返回任何值。

- wait_for：等待异步任务完成，返回 **future_status**，根据是否在指定时间段内完成有 **ready/timeout/deferred** 三种状态，第三种状态是和 `std::async` 配套使用的。

- wait_until：与上面这个相同，只是超时条件是通过时间点来指定的。

- share：**将 future 转换为 [shared_future]((https://en.cppreference.com/w/cpp/thread/shared_future))**，原来的 future 会变成无效的，新生成的 shared_future 会共享同一个共享状态，允许多个线程等待同一个结果。

### 实现原理

`std::future` 主要来源于三种方式：`std::async`、`std::promise` 和 `std::packaged_task`，这里我们不说实际的函数，而是以一种行为的方式进行表达。

当我们调用 `get` 时，它就会去查询与之关联的共享状态，如果已经有结果，则直接返回结果，注意此处的结果也可能是**异常**，否则就通过条件变量的方式阻塞当前线程。

我们通过其中一个方式创建了一个线程来异步执行任务，当线程执行完毕后，会将结果存储到共享状态中，然后唤醒所有等待的线程。

整体来说就是一个生产者消费者模型：**三种方式作为生产者，future作为消费者，共同访问的变量就是这个共享状态**。

好了，这个最重要的核心我们已经介绍完了，接下来就比较简单了。

## async

这是 [标准库](https://en.cppreference.com/w/cpp/thread/async.html)引入的一个异步编程工具，主要作用是创建一个异步任务，在后台执行函数并返回一个 `std::future` 对象，用于在需要时获取任务的执行结果。

首先先来看一下如何创建一个异步任务：

```cpp
_GLIBCXX_NODISCARD future<__async_result_of<_Fn, _Args...>>
    async(launch __policy, _Fn&& __fn, _Args&&... __args)
```

可以看到，它需要传入的主要是两部分：**执行策略** 和 **函数及其参数**，先看一下执行策略：

- `launch::async`：表示异步任务应该立即在新线程中启动。
- `launch::deferred`：表示异步任务应该在返回对象的 `get()` 或 `wait()` 方法被调用时才启动。

当然，该参数也可以不传递，因为它具有一个默认值，即让系统决定选择什么样的启动策略，但是，建议的做法是 **指定启动策略**，以避免系统调度不符合预期。

这个函数及其参数的设计思路和 `std::thread` 是完全一致的，如果忘记了可以[回顾一下](https://kbchulan.github.io/ClBlogs/blogs-main/concurrent/01-con.html#%E5%BC%95%E7%94%A8%E7%BB%91%E5%AE%9A)。

看一个示例，使用上还是很简单的：

```cpp
void func1() {
  using namespace std::chrono_literals;

  auto fetchFromDB = [](const std::string& str) -> std::string {
    std::this_thread::sleep_for(2s);
    return "data from DB: " + str;
  };

  std::future<std::string> res = std::async(std::launch::async, fetchFromDB, "Hello");

  std::print("Current {} is running\n", __FUNCTION__);
  std::print("The task result is: {}\n", res.get());
}
```

特别需要注意的是：**async 构造产生的 future 对象，其析构时会阻塞等待任务完成**。这个问题一定要注意，请看如下代码：

```cpp
void deadLock() {
  std::print("Begin\n");
  std::mutex mtx;
  std::lock_guard<std::mutex> lock(mtx);

  {
    std::future<void> res = std::async(std::launch::async, [&] -> void {
      std::print("Async\n");
      std::lock_guard<std::mutex> lock(mtx);
      std::print("Async done\n");
    });
  }

  std::print("End\n");
}
```

按照常理理解，我们启动一个异步任务，他会在后台执行，并在尝试加锁后阻塞，等待主线程输出 `End` 后，继续输出 `Async done`，但是事实上这个函数会导致死锁。

为什么，首先在最开始进行加锁，随后顺序执行进入子作用域，这个异步任务尝试加锁被阻塞，但是 **由于返回的 future 的析构会等待任务完成，因此不会继续向下执行，也就是卡在此函数 12 行处**，因此在使用 async 中一定要注意它的析构可能导致的死锁风险。

## package_task

与 `std::async` 这种全自动化的工具不同，[packaged_task](https://en.cppreference.com/w/cpp/thread/packaged_task.html) 提供了更灵活的控制，允许用户手动控制任务的启动和执行，它的本质是：**一个特定函数签名的可调用对象的封装器，此封装器与一个 future 对象相关联**。

先看一下如何构造，可以看出，它的模板参数不是一个简单的类型，而是一个 **函数签名**，需要指定 **返回值和参数类型**：

```cpp
template<typename _Res, typename... _ArgTypes>
    class packaged_task<_Res(_ArgTypes...)>
```

package_task 的核心在于 **解耦**：

- **构造阶段**：封装一个可调用对象，同时与一个 future 对象相关联，可以通过 `get_future()` 获取关联的 future 对象。

- **执行阶段**：由于此对象重载了 `operator()`，因此可以像调用普通函数一样调用这个，此时执行内部函数，返回的结果会储存到 future 关联的共享状态中。

因此，它和 `std::async` 的设计是有本质区别的，对于 async，任务的定义和执行是绑定的，但是对于 packaged_task，任务的定义和执行是分离的，构造时只是定义了一个任务包，至于什么时候调用，完全取决于我们自己。

```cpp
void func2() {
  using namespace std::chrono_literals;

  std::packaged_task<int(int, int)> task{[](int a, int b) -> int {
    std::this_thread::sleep_for(2s);
    return a + b;
  }};

  std::future<int> res = task.get_future();

  std::thread{std::move(task), 1, 2}.detach();

  std::print("Current {} is running\n", __FUNCTION__);
  std::print("The task result is: {}\n", res.get());
}
```

除此之外，package_task 还有 3 个常用内置方法：

- valid：检测是否与一个 **共享状态** 相关联。
- swap：交换两个 package_task 对象。
- reset：将 packaged_task 恢复到它刚被构造但还未被调用时的状态，并准备好一个新的 std::future，可以达到重用任务的目的。

## promise

[promise](https://en.cppreference.com/w/cpp/thread/promise.html)是本节中最底层最灵活的板块，它提供了一种在线程间传递值的机制，核心作用是 **提供一个可以被手动兑现的承诺**，当创建了一个 promise，就类似于向整个程序宣告：未来我会提供一个值，来订阅我吧。

先来看一下 promise 的构造函数：

```cpp
template< class R >
class promise;
```

这个构造函数很简单，只有一个模板参数，用于指定 promise 承诺的值的类型，此外还有一些特化版本，比如为 void 的特化。

它完全分离了所有步骤，不再封装函数包装器，也不会自动执行，而是分为了如下三步：

- 创建承诺
- 获取凭证，即消费者线程通过 `get_future` 获取与其关联的 future 对象，用于以后获取值
- 承诺兑现，即生产者线程通过 `set_value` 或 `set_exception` 来兑现承诺

很明显，这种方式更加底层和灵活，我们对程序的控制就更加自由了：

```cpp
void func3() {
  using namespace std::chrono_literals;

  std::promise<std::string> prom;

  auto future = prom.get_future();

  std::thread{[&prom]() -> void {
    std::this_thread::sleep_for(2s);
    prom.set_value("Hello from promise");
  }}.detach();

  std::print("Current {} is running\n", __FUNCTION__);
  std::print("The promise result is: {}\n", future.get());
}
```

## 线程池

这个概念在刚开始介绍 [asio](https://kbchulan.github.io/ClBlogs/blogs-main/asio/1-asio.html#%E5%88%9D%E8%AF%86asio) 的时候我们就简单提及过，此处我们着手实现一下。

首先，先想一下为什么需要线程池？

想象一下一个繁忙的服务器，每当有新的客户端请求到达时，服务器都需要处理它，**一种天真的做法是：为每个请求创建一个新线程**。

这种模式在请求量很小的时候尚可工作，但当并发请求量增大时，会迅速暴露出一系列严重问题：

- **高昂的创建/销毁开销**：线程是操作系统级别的资源。创建和销毁线程涉及到系统调用、内存分配、上下文切换等，这些都是非常耗时的操作。
- **资源耗尽**：操作系统能创建的线程数量是有限的。如果请求瞬间并发量非常大，可能会耗尽系统资源，导致无法创建新线程，甚至使整个系统崩溃。
- **无节制的并发**：如果同时有 1000 个请求到达，就会创建 1000 个线程。这会导致 CPU 在这 1000 个线程之间频繁进行上下文切换，而真正用于执行任务代码的时间比例会急剧下降，造成“忙而无效”的局面。

线程池就是为了解决这个问题出现的策略，核心思想非常简单：**预先创建一组固定数量的工作者线程，让它们待命，当有新任务到来时，不再创建新线程，而是将任务交给一个空闲的工作者线程去执行。如果所有线程都在忙，新任务就排队等待。**

这样就可以最大限度的重用线程，从而减少线程创建和销毁的开销，同时不用等待线程的创建，响应速度也会有提升等等，优势是很多的。

线程池的实现方案有很多，但是核心都离不开四个组成：**任务队列、工作线程集合、同步机制、提交及关闭接口**。接下来我们使用本节学到的 promise + packaged_task 来实现。

```cpp
class ThreadPool {
  // 任务类型，把外界投递的任务都包装成此类型
  using Task = std::packaged_task<void()>;

private:
  explicit ThreadPool(unsigned int size = std::thread::hardware_concurrency()) {
    if (size < 1) {
      _poolSize = 2;
    }else{
      _poolSize = size;
    }

    start();
  }

  ~ThreadPool() {
    _stop.store(true, std::memory_order_release);
    _cv.notify_all();
  }

  void start() {
    _threads.reserve(_poolSize);

    for (unsigned int i = 0; i < _poolSize; i++) {
      _threads.emplace_back([this]() -> void {
        // 每个线程循环处理任务
        while (true) {
          Task task;
          {
            std::unique_lock<std::mutex> lock{_mtx};
            _cv.wait(lock, [this]() -> bool {
              return _stop.load(std::memory_order_acquire) || !_tasks.empty();
            });// 等待条件变量被唤醒，若任务为空且线程池未被关闭则继续等待

            if (_stop.load(std::memory_order_acquire) && _tasks.empty()) {
              break;
            }// 唤醒后，若线程池被关闭且任务为空则退出

            task = std::move(_tasks.front());
            _tasks.pop();
          }// lock的作用域结束并释放
          task();
        }
      });
    }
  }

public:
  ThreadPool(const ThreadPool&) = delete;
  ThreadPool& operator=(const ThreadPool&) = delete;

  static ThreadPool& getInstance() {
    static ThreadPool instance;
    return instance;
  }

  template <typename Func, typename... Args>
  auto commit(Func&& func, Args&&... args) -> std::future<std::invoke_result_t<Func, Args...>> {
    using ReturnType = std::invoke_result_t<Func, Args...>;

    if (_stop.load(std::memory_order_relaxed)) {
      throw std::runtime_error("ThreadPool is stopped");
    }

    auto task = std::packaged_task<ReturnType()>(
      [func = std::forward<Func>(func), args...]() mutable -> ReturnType {
        return func(args...);
      });

    auto ret = task.get_future(); //先把返回的future拿出去
    {
      std::lock_guard<std::mutex> lock{_mtx};
      _tasks.emplace([task = std::move(task)]() mutable -> void {
        task();
      }); // 再包装成返回void的callable放进线程池执行
    }
    _cv.notify_one();
    return ret;
  }

private:
  std::mutex _mtx;
  std::condition_variable _cv;

  std::queue<Task> _tasks;
  std::vector<std::jthread> _threads;

  std::atomic_bool _stop{false};
  size_t _poolSize{0};
};
```

可以看一下这个实现，首先根据逻辑核心数目构造了一个池子，池子中每个线程都会不断尝试从任务队列中取出任务并处理，如果没有任务则会被挂起，且考虑了析构后取出剩余的任务进行处理和落盘，防止一些事务的丢失。

同时对外暴露了一个 `commit` 方法，外界可以传入函数及其参数，我们内部会将其封装为一个 Task 类型并投递到队列中进行处理，同时返回一个 future 对象，供外部获取异步函数的结果。

整体来说，该池子的设计基于 **单例 + RAII + 内存序管理 + 模板元编程**，还有很多小细节上的优化，性能相当 ok，可以对标 **Google Abseil**，完全可以投入生产使用。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/concurrent/04-con-func/main.cc)。
