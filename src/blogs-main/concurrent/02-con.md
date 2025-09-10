---
title: 02 线程管控

article: true
order: 2
star: false

category:
  - 并发

tag:
  - cpp

date: 2025-08-08

description: 介绍线程归属权的管控、线程并发数量控制以及获取线程 id 等基本操作
footer: Always coding, always learning
---

<!-- more -->

# 02 线程管控

本节的内容比较简单，会介绍一下 C++ 线程管控，包括移交线程的归属权，线程并发数量控制以及获取线程id等基本操作。

## 线程所属权

简单说来：**线程必须被一个东西管控，可以是语言内置的变量、容器等，也可以是系统。**

先来看一个小案例：

```cpp
void func1_err() {
  // 1. 创建线程1
  std::thread thr1([]() -> void {});

  // 2. 将该线程移交给线程2进行管理，此时 thr1 就空闲了
  std::thread thr2 = std::move(thr1);

  // 3. 重新给 thr1 分配一个新线程
  thr1 = std::thread([]() -> void {});

  // 4. 把线程2给thr1
  thr1 = std::move(thr2);
  thr1.join();
}
```

编译并运行就可以看到，在第4步触发了 `std::terminate()`，原因也很简单，第四步时会走线程的移动赋值操作，而看一下源码：

```cpp
thread& operator=(thread&& __t) noexcept {
  if (joinable())
      std::__terminate();
  swap(__t);
  return *this;
}
```

这下就很清晰了，thr1 还没有被 join 或者 detach，所以肯定会进入 `std::terminate()`，从而引发崩溃。

因此修改方案也很简单，只需要在第4步之前调用 `thr1.detach()` 或 `thr1.join()` 即可，前者可以把线程交给系统，后者等待该线程结束，都可以确保线程在工作完成前被管控。

```cpp
void func1() {
  std::thread thr1([]() -> void {});
  std::thread thr2 = std::move(thr1);
  thr1 = std::thread([]() -> void {});

  thr1.detach();
  thr1 = std::move(thr2);
  thr1.join();
}
```

总结一下，我们的线程构造时会交由一个变量进行管控，此时这个变量会接管线程的生命周期，也是系统中与该线程交互的唯一途径。

而标准规定中，**不允许存在无管控的线程**，管控权的修改只有两条途径：

- 当拥有所有权的变量被销毁，如离开作用域
- 当拥有所有权的变量被赋予一个新的线程，如通过移动赋值

在这两种情况下，如果线程的管控权**没有被移交给其他变量或交给系统**，就会收到严厉的惩罚：**触发 `std::terminate()`，强制终止程序。**

因此在书写时，如果遇到如上两种情况，要特别注意线程的管控权是否被正确转移，所以选择 `std::jthread` 是非常好的，可以避免很多 bug。

## RVO/NRVO

这里补充一个小知识点，也就是 RVO/NRVO 优化，首先来看一段代码：

```cpp
std::thread rvo_use() {
  return std::thread([]() -> void {
    std::print("RVO thread is running\n");
  });
}
void func2() {
  auto thr1 = rvo_use();
  thr1.join();
}
```

我们先看一下这个 `rvo_use()` 相关的，首先请考虑一下，此处都会发生什么构造？

按照常规语法理解，rvo_use 调用 **有参构造** 返回一个纯右值的 thread 对象，然后通过 **移动构造** 构造 thr1。

但是实际上编译器会存在一种优化，即 **返回值优化（Return Value Optimization, RVO）**：**它允许编译器在某些情况下直接将函数返回值的构造过程直接在调用者处完成，而不需要进行一次额外的拷贝或移动操作**。

在这个例子中，会在 `func2` 的栈空间分配内存，随后直接在该内存处进行构造，因此只会走一次 **有参构造**。

与之类似的还有一个 **具名返回值优化（Named Return Value Optimization, NRVO）**，和 RVO 一样，下面的代码始终只会走一个 **有参构造**。

```cpp
std::thread nrvo_use() {
  std::thread thr([]() -> void {
    std::print("NRVO thread is running\n");
  });
  return thr;
}
void func2() {
  auto thr2 = nrvo_use();
  thr2.join();
}
```

值得注意的是：**在c++17及以后，该行为不再是一个优化选项，而是一个语言规则。** 也就是说，这个行为一定会发生。

## 线程数量选择

一个并发程序应该设置几个线程，这个问题没有所谓的最佳答案，但是有一些经验准则值得参考。

首先，cpp有一个基准类的函数 `std::thread::hardware_concurrency()` 可以返回 **逻辑核心的数量**：

- 在没有超线程的CPU上，逻辑核心数 = 物理核心数。
- 在有超线程的CPU上，逻辑核心数 = 物理核心数 * 2。

接着，需要考虑具体的应用场景，我们从如下两种情况讨论一下：

- **CPU密集型任务**：这种任务的特点是需要大量的计算，线程几乎总是在满负荷工作，很少等待，因此应该尽可能减少线程上下文切换开销，这种情况下最好的选择是 **等于逻辑核心数量**。

- **I/O密集型任务**：这种任务的特点是线程大部分时间都在等待外部设备或服务的响应，而不是在进行计算，这种情况下瓶颈在于 I/O 设备，因此线程数可以设置的更多，存在一个被广泛引用的公式：**最佳线程数 = CPU核心数 * (1 + 线程等待时间 / 线程计算时间)**。

## 识别线程

我们在开发过程中，会有一个需求，即判断是哪个线程在执行某个任务，因此需要获取当前线程的标识符。

cpp 为我们内置了一个方法：

```cpp
std::thread::id id = std::this_thread::get_id();
std::print("Current thread ID: {}\n", id);
```

当然，也可以有一些基于平台的方法来获取这个标识符：

- Linux：线程的标识符类型是 `pthread_t`，可以使用 `pthread_self()`来获取。

- 在Windows平台上，线程的标识符类型是 `HANDLE`，可以使用 `GetCurrentThread()` 来获取。

## thread_local

这里补充一个关键字，`thread_local`：它用于声明线程局部变量，每个线程都有自己的副本，互不干扰。

对于 thread_local 修饰的变量，他会在线程首次访问时进行初始化，当线程退出时，该变量会被销毁，在实现一些缓存或者错误码管理时是比较有用的，如下是基本使用：

```cpp
void func3() {
  thread_local int thread_local_var = 0;

  std::jthread thr1{[&]() -> void {
    thread_local_var++;
    std::print("Thread 1, thread_local_var: {}\n", thread_local_var);  // 1
  }};

  std::print("Main Thread, thread_local_var: {}\n", thread_local_var); // 0
}
```

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/concurrent/02-thread-control/main.cc)。
