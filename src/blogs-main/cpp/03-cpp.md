---
title: 03 协程
article: true
order: 3
star: false

category:
  - 语言

tag:
  - cpp

date: 2025-07-23

description: 介绍 C++20 协程的核心概念、内部工作机制以及如何构建和使用一个协程。
footer: Always coding, always learning
---

<!-- more -->

# C++20 协程

> 协程（Coroutine）是 C++20 引入的一项重量级语言特性。它本质上是一种可以暂停执行并在稍后恢复的函数。这使得以更简洁、更同步的方式编写复杂的异步代码（如网络IO、事件循环）和数据生成器成为可能。

## 核心思想

传统函数要么运行到结束返回，要么抛出异常。而协程增加了两种新的可能性：**暂停（suspend）**和**恢复（resume）**。

当一个协程被调用时，它的状态（包括局部变量、当前执行点等）被保存在一个被称为“协程帧”（coroutine frame）的内存区域中，通常在堆上分配。协程可以通过 `co_await` 或 `co_yield` 关键字暂停自己的执行，并将控制权交还给调用者。调用者持有一个句柄（`coroutine_handle`），可以在未来的某个时间点通过这个句柄恢复协程的执行。

## 为什么使用协程？

协程主要解决以下两类问题：

1.  **异步编程**：告别“回调地狱”。通过 `co_await`，我们可以用看似阻塞的同步代码风格，来编写非阻塞的异步逻辑，特别是在实现异步服务器的时候，笔者的asio章节中就有例子。

2.  **惰性求值与生成器**：通过 `co_yield`，可以轻松实现一个生成器。每次需要新值时，协程恢复执行并“生产”一个值，然后再次暂停，等待下一次请求。这对于处理大型数据集或无限序列非常高效。

## 协程的三个新关键字

C++20 引入了三个新的关键字来支持协程：

- `co_await <expr>`: 暂停协程，等待 `<expr>` 的结果。`<expr>` 必须是一个“可等待”（Awaitable）对象。
- `co_yield <expr>`: 暂停协程，并向调用者产生一个值 `<expr>`。这是生成器的关键。
- `co_return <expr>`: 从协程中返回值并结束协程。

任何使用了这三个关键字中任意一个的函数，都会被编译器视为一个协程。

## 协程的内部机制

要真正理解协程，我们需要了解其背后的三个关键组件：**Promise**、**Coroutine Handle** 和 **Return Object**。

### 1. Promise

每个协程都必须关联一个 **Promise** 对象。需要在返回类型中定义一个名为 `promise_type` 的内部类。这个类是协程的“大脑”，它控制着协程的行为。

`promise_type` 的一些关键方法：

- **get_return_object()**: 创建并返回将要给调用者的那个对象。

- **initial_suspend()**: 返回一个 Awaitable，决定协程在刚开始执行时是否要暂停。返回 `std::suspend_always` 表示立即暂停，`std::suspend_never` 表示不暂停。

- **final_suspend()**: 返回一个 Awaitable，决定协程在执行完毕后是否要暂停。通常返回 `std::suspend_always`，以防止协程状态在被访问前被销毁。

- **unhandled_exception()**: 如果协程内部有未捕获的异常，此方法被调用。

- **return_value(value)** 或 **return_void()**: 当协程执行 `co_return` 时被调用。

- **yield_value(value)**: 当协程执行 `co_yield` 时被调用。

### 2. Coroutine Handle

这是一个轻量级的、不拥有协程状态所有权的句柄。它是与协程外部世界交互的“遥控器”。

- **resume()**: 恢复协程的执行。
- **destroy()**: 销毁协程帧，释放内存。
- **done()**: 检查协程是否已经执行完毕。

### 3. Return Object

这是协程被调用时立即返回给调用者的对象。它通常持有一个 `coroutine_handle`，以便调用者可以通过它来控制协程。

## 一个生成器的完整实现

下面我们通过一个生成器 `Generator<T>` 来展示这些组件如何协同工作。

### `generator.hpp`

```cpp
#pragma once

#include <coroutine>
#include <optional>

template <typename T> class Generator {
public:
  // promise_type 是协程机制的钩子
  struct promise_type {
    std::optional<T> current_value;

    Generator<T> get_return_object() {
      return Generator{std::coroutine_handle<promise_type>::from_promise(*this)};
    }
    std::suspend_always initial_suspend() { return {}; }
    std::suspend_always final_suspend() noexcept { return {}; }
    void unhandled_exception() { std::terminate(); }
    void return_void() {}
    std::suspend_always yield_value(T value) {
      current_value = value;
      return {};
    }
  };

  // 让 Generator 可移动，但不可拷贝
  Generator(Generator &&other) noexcept : coro_handle_(std::__exchange(other.coro_handle_, {})) {}
  Generator &operator=(Generator &&other) noexcept {
    if (this != &other) {
      if (coro_handle_) {
        coro_handle_.destroy();
      }
      coro_handle_ = std::__exchange(other.coro_handle_, {});
    }
    return *this;
  }

  ~Generator() {
    if (coro_handle_) {
      coro_handle_.destroy();
    }
  }

  // 外部接口
  bool next() {
    if (coro_handle_ && !coro_handle_.done()) {
      coro_handle_.resume();
      return !coro_handle_.done();
    }
    return false;
  }

  T value() const { return *coro_handle_.promise().current_value; }

private:
  explicit Generator(std::coroutine_handle<promise_type> h) : coro_handle_(h) {}
  std::coroutine_handle<promise_type> coro_handle_;
};
```

### `main.cc`

```cpp
#include "generator.hpp"
#include <iostream>

Generator<int> range(int start, int end) {
  for (int i = start; i < end; ++i) {
    co_yield i;
  }
}

int main() {
  auto gen = range(1, 10);
  while (gen.next()) {
    std::cout << gen.value() << " ";
  }
}
```

## 总结

看到这里我们就发现了，c++中使用协程怎么这么麻烦，为了写一个简单的异步函数，居然需要先写个几十上百行的符合要求的返回类，也太不好使了，明明我在python中写一个yield就可以开箱即用了。

但是其他语言的协程通常会绑定一个默认的运行时，比如一个全局的线程池。这很方便，但也意味着可能在不知情的情况下支付了线程切换、锁竞争等“隐藏成本”。

c++的协程让我们有了极致的控制能力，我们可以完全掌握内存如何分配，比如是分配在堆上还是内存池中，同时与线程不同的是，协程完全基于用户空间，可以避免许多cpu调度开销，完全考虑了**性能、控制力和零成本抽象**。

但是，它依旧很难用，谁没事记这么多的函数名啊，还没有任何补全，所有我们使用协程还是比较倾向于使用一些已经封装好的工具，可以自行选择：

- **Boost.Asio**：C++网络编程的事实标准。它的 **asio::awaitable** 和 **co_spawn** 等工具，让我们能像在其他语言中一样自然地编写异步网络代码。
- **cppcoro**：一个非常著名的协程库，作者是Lewis Baker（协程提案的贡献者之一）。它提供了task<>, generator<>, async_mutex等一系列我们期望在标准库中看到的协程工具。
- **folly**：提供了高性能的folly::coro，用于大规模的服务器开发。
