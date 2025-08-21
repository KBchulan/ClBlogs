---
title: 07 内存序实现同步关系

article: true
order: 7
star: false

category:
  - 并发

tag:
  - cpp

date: 2025-08-20

description: 使用常见的 5 种内存序来实现同步关系，初步理解内存序的使用
footer: Always coding, always learning
---

<!-- more -->

本节的内容比较简单，我们基于上一节介绍的内存序来实现内存模型中的 Synchronized-with 的先行关系，主要是通过代码来进行初步使用。

## relaxed

首先先来看一下最弱的内存序，也就是 `std::memory_order_relaxed`，正如我们先前所说，它只能保证操作的原子性，但是会授予编译器权限，编译器可以自由地重排指令，可以将指令移动到内存访问之前或之后，这也就是产生问题的原因，比如下面的代码：

```cpp
void func1() {
  std::atomic_bool flag1{false};
  std::atomic_bool flag2{false};
  std::atomic_int32_t counter{0};

  std::jthread thr1{[&] -> void {
    flag1.store(true, std::memory_order_relaxed);
    flag2.store(true, std::memory_order_relaxed);
  }};

  std::jthread thr2{[&] -> void {
    while (!flag2.load(std::memory_order_relaxed)) {
      std::this_thread::yield();
    }

    if (flag1.load(std::memory_order_relaxed)) {
      counter.fetch_add(1, std::memory_order_relaxed);
    }
  }};

  thr1.join();
  thr2.join();
  assert(counter.load(std::memory_order_relaxed) == 1);
}
```

在这个例子中，我们使用了 `std::memory_order_relaxed` 的内存序，且对于线程1来说，这两个存储指令的先后与否不会影响线程1的结果，因此对于线程1来说，实际的执行顺序可能是 flag1 -> flag2，也完全可能是 flag2 -> flag1，这取决于编译器的优化策略，如果是后者的话，那在线程2中这个 counter 的值完全有可能不会增加，随后在退出时触发断言。当然，这只是有可能的情况，毕竟就算重排，线程1也没有什么效率上的提升。

这里补充一个知识点：在 x86 架构下，硬件方面会进行的指令重排只有 **写-读** 操作，即将写入的内容先放入 Store Buffer 中，随后再提交到 L1 Cache 中，在表现上看来就像是读操作在写操作之前，也正是因为 Store Buffer 的存在，x86 内存模型被称为 **TSO（Total Store Order）** 而不是 **SC（Sequentially Consistent）**。

从这个角度看来，按理说硬件上是不会重排线程1的 **写-写** 操作的，也自然不会有问题，但是别忘了，会进行重排的还有编译器，因此，`std::memory_order_relaxed` 更多的是我们与编译器的交流，不管是对于 x86 还是 ARM 架构，我们都需要注意遵守标准内存序的规定。

## acquire-release

那为了解决上述的问题，我们需要使用 `std::memory_order_acquire` 和 `std::memory_order_release` 的内存序，来实现上节所介绍的先行关系 —— **同步于**。

首先，`std::memory_order_release` 的内存序可以保证它之前的操作不会被重排到它之后，而 `std::memory_order_acquire` 可以保证它之后的操作不会被重排到它之前，且 release 操作是 happen-before acquire 操作的，因此对于一个原子变量，可以保证的是，如果它的 release 操作对 acquire 操作可见，那么这个 release 操作之前的所有内存读写都会对 acquire 之后的操作可见，因此我们修改一下上述例子：

```cpp
void func2() {
  std::atomic_bool flag1{false};
  std::atomic_bool flag2{false};
  std::atomic_int32_t counter{0};

  std::jthread thr1{[&] -> void {
    flag1.store(true, std::memory_order_relaxed);
    flag2.store(true, std::memory_order_release);
  }};

  std::jthread thr2{[&] -> void {
    while (!flag2.load(std::memory_order_acquire)) {
      std::this_thread::yield();
    }

    if (flag1.load(std::memory_order_relaxed)) {
      counter.fetch_add(1, std::memory_order_relaxed);
    }
  }};

  thr1.join();
  thr2.join();
  assert(counter.load(std::memory_order_relaxed) == 1);
}
```

可以看到，我们对 flag2 进行了内存序的修改，此时对于线程1，flag1 的操作不可能被重排到 flag2 之后，且对于线程2来说，load之后都可以看到这个 flag1 的修改，因此这种情况下这个断言一定不会触发。

现在可以回顾一下上一节介绍的内存序，这个向上/下的内存屏障是不是很形象呢，另外，以 release 操作来说，它只能保证其他操作不会被重排到它之后，但它之前的指令还是可以根据编译器的优化规则进行重排的。

## acq_rel

该内存序可以构建一个 Full Fence，即读操作具有 acquire 操作的内存序，而写操作具有 release 操作的内存序，具体表现为其之前的指令不会重排到后面，后面的指令也不会重排到前面，即该操作前面的所有内存操作都对后面可见，与上面的 acquire/release 操作相比，这个内存序更多的用在 **读-改-写** 操作中。

上面我们可以看到，acquire/release 分别用于独立的读和写操作，那理论上来说完全可以用于实现读改写操作，那为啥还要使用 acq_rel 操作呢，先看如下例子：

```cpp
std::atomic<int> counter = {0};

void incorrect_increment() {
    int current_val = counter.load(std::memory_order_acquire); // 步骤1: 读
    // 位置1
    counter.store(current_val + 1, std::memory_order_release); // 步骤2: 写
}
```

上述例子完全可能出现这种情况：两个线程同时进入到位置1，都执行增加操作，但是由于它们拿到的都是老数据，最后表现为数据只增加了1，这与预期不符。

原因也很简单，读和写操作都是原子的，但是合起来就不是原子的，它们中间会存在窗口期，这就是导致问题的原因，因此对于 RMW 操作，需要使用 acq_rel 操作来保证原子性，**绝对不要用独立的读写模拟 RMW 操作**。

```cpp
std::atomic<int> counter = {0};

void incorrect_increment() {
  counter.fetch_add(1, std::memory_order_acq_rel);
}
```

## seq_cst

acq_rel 的内存序主要是建立在两个线程之间，即调用 release 的线程和调用 acquire 的线程，但并不关心任何第三方线程是如何看待的，这也是 seq_cst 内存序的主要特点，它不止具有 acq_rel 所提供的 Full Fence，还具有一个 **全局一致性**，即 **所有 seq_cst 操作都存在一个所有线程都认可的序列**。

这里举一个例子来介绍这个全局一致性是个什么东西：

```cpp
void func4() {
  std::atomic_bool flag1{false};
  std::atomic_bool flag2{false};

  int32_t z = 0;

  std::jthread thr1{[&] -> void {
    flag1.store(true, std::memory_order_release);
  }};

  std::jthread thr2{[&] -> void {
    flag2.store(true, std::memory_order_release);
  }};

  std::jthread thr3{[&] -> void {
    while (!flag1.load(std::memory_order_acquire)) {}
    if (flag2.load(std::memory_order_acquire)) {
      z = 1;
    }
  }};

  std::jthread thr4{[&] -> void {
    while (!flag2.load(std::memory_order_acquire)) {}
    if (flag1.load(std::memory_order_acquire)) {
      z = 2;
    }
  }};

  thr1.join();
  thr2.join();
  thr3.join();
  thr4.join();
  std::print("z = {}\n", z);
}
```

先考虑一下这个例子会输出什么，很显然 z 的值可以是 1 或者 2，同时也可能是0，哎，为啥可能是0？

原因就在于这个内存序，虽然我们构造了先行关系，保证 store 对 load 可见，但是因为不具有全局一致性，在线程3看来，看到的操作顺序可以是 flag1 -> flag2，同样可能是 flag2 -> flag1，线程4也是一样的，且 **两个线程看到的顺序互不干扰**，因此最大的问题出来了，如果线程三先看到 flag1，此时还没有看到 flag2，那么 z 不改变，且线程4先看到 flag2，此时还没有看到 flag1，那么 z 仍不改变，这样就解释了为啥可能是0。

但是当我们把内存序修改为 seq_cst，那么 z 的值就只能是 1 或者 2，不可能是 0，因为线程3和4看到的顺序一致，因此至少有一个 if 的逻辑可以进入。

> `std::memory_order_consume` 在 cpp26 后被废弃了，因此不作介绍。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/concurrent/06-atomic/main.cc)。
