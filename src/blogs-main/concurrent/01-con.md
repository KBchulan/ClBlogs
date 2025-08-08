---
title: 01 线程基础

article: true
order: 1
star: false

category:
  - 并发

tag:
  - cpp

date: 2025-08-07

description: 介绍线程的基础知识，如各种方式创建、线程管控以及底层实现细节。
footer: Always coding, always learning
---

<!-- more -->

本模块我们会开一个新专题，即介绍c++中的并发编程，着重介绍线程的相关操作，从有锁并发到无锁并发，以及线程池等高级并发技术，尽可能不那么肤浅的介绍代码书写，更多的去分析一下底层的实现细节，以及如何优化并发性能，那么准备开始吧。

## 线程发起

首先我们看一下如何创建一个线程：

```cpp
void func1() {
  std::string str = "Hello, World!";

  std::thread thr([&str]() -> void {
    std::print("str is: {}", str);
  });

  thr.join();
}
```

可以看出来，线程的创建需要传递一个可执行的函数地址，如果有参数可以传递参数，经典的构造参数：

> 由于编译器的优化，对于具名函数，函数名即可代表函数地址，匿名函数本身也可以代表地址

```cpp
 thread(_Callable&& __f, _Args&&... __args){}
```

整体流程是这样的：当我们创建一个线程对象后，系统就会调度此线程在后台执行我们传入的函数，然后主程序继续执行，此处我们使用了 `thr.join()` 来等待子线程执行完成再退出。

假设我们不加上这个 `thr.join()`，程序会如何执行呢？

首先，程序会继续执行，此时主线程退出，会回收我们创建的字符串对象和线程对象，线程对象的析构函数会被触发：

```cpp
~thread() {
  if (joinable())
	std::__terminate();
}
```

也就是会触发这个 `std::__terminate()`，这个函数会终止程序的执行，是一个非常生硬的操作，会调用 `std::abort` 来强制、非正常地终止程序，它不会调用任何析构函数，从而完全破坏了 RAII 机制，这会导致各种资源（锁、文件、连接等）的泄露和数据状态的损坏。

为了让线程对象的这个 joinable() 返回 false，我们有两个选择：

- `thr.join()`：阻塞调用线程，等待子线程执行完成再继续执行。
- `thr.detach()`：将子线程分离，让子线程独立运行。

需要回收的资源有两个，线程对象本身和线程内的回调函数创建的资源，此时我们再来看一下，这两种选择会有何后果：

- 对于 **join** 操作，主线程会阻塞等待子线程完成后才会继续执行，子线程对象由主线程退出后回收，毕竟是栈上对象，此时如果回调设计得当，子线程会回收自己线程的所有资源，在这种情况下，所有资源都是符合 **RAII** 机制，不存在资源泄露和数据状态损坏的问题。

- 对于 **detach** 操作，子线程会独立运行，主线程退出后，从语言层面来说此线程是会继续运行，但是由于操作系统对于程序的生命周期管理，子线程实际上 **会被强行终止**，而不会触发任何析构函数。从内存角度来说，子线程拥有的资源不走语言性质的回收，但是会被操作系统回收该进程的内存页等资源；但是从其他资源角度来说，子线程对象的析构函数不会被调用，假设我们需要解锁、关闭文件等等操作，这种行为就很不安全了。

因此，通常建议使用 `join` 操作，除非确认子线程是“发后即忘”的，不持有任何需要清理的资源，并且它的突然死亡不会造成任何影响，否则不建议使用 `detach` 操作。

## 函数的其他选择

除了直接使用lambda方式，我们还可以通过如下几种方式传递函数参数来构造线程对象：

### 仿函数

我们先来看一个例子：

```cpp
class background_task {
public:
  void operator()() {
    std::print("Background task is running\n");
  }
};
void func2() {
  std::thread thr(background_task());
  thr.join();
}
```

你觉得有问题吗？编译一下就会发现产生了如下的报错：

```text
.\main.cc:23:7: error: request for member 'join' in 'thr', which is of non-class type 'std::thread(background_task (*)())'
```

按照我们的理解，我们构造一个变量，并把这么一个仿函数对象作为参数进行传递，很显然是没有问题的，但是此处报错是因为编译器把定义 thr 的这一句给解析为一个函数声明了，即返回值为 `std::thread` 的名为 `thr` 的函数，这就是经典的 “Most Vexing Parse”。

原因在于 C++ 标准规定：**当一段代码既可以被解析成一个函数声明，也可以被解析成一个对象定义时，编译器必须优先将其解析为函数声明**。

修改方法也很简单：

```cpp
// 再加一层 ()，可以打破函数声明的语法，就不会有歧义了
std::thread thr1((background_task()));
thr1.join();

// 使用 {} 进行初始化
std::thread thr2{background_task()};
thr2.join();
```

可以说只要定义变量传参使用 {} 都是非常优先的选择，可以告诉编译器我这是在定义一个对象，能避免歧义。

### 普通函数

也可以传入一个普通函数，这种情况使用于线程需要执行的函数非常复杂的情况，此处只是演示：

```cpp
void bac() {
  std::print("Background task is running\n");
}
void func3() {
  std::thread thr3(bac);
  thr3.join();
}
```

### bind

使用 `std::bind` 可以将函数和参数绑定在一起，形成一个可调用对象，然后就可以作为参数进行构造了。

```cpp
void func4() {
  std::thread thr4(std::bind(bac));
  thr4.join();
}
```

### 成员函数

如果线程的回调函数是一个类的成员函数，那么需要传递 **类的成员函数地址** 以及 **对象地址**，前者是告诉线程做什么，后者则是告诉线程对谁做。

```cpp
class Test {
public:
  void task() {
    std::print("Task is running\n");
  }
};
void func5() {
  Test test;
  std::thread thr5(&Test::task, &test);
  thr5.join();
}
```

## 错误处理设计

对于一个常见的多线程程序，我们考虑一下异常都有什么位置会抛出，要么在主线程，要么在子线程，子线程崩溃了也只会影响自己，做好处理即可，但是主线程会影响所有线程，一旦处理不当是很严重的。

根据 [terminate](https://en.cppreference.com/w/cpp/error/terminate.html)的发生情况，如果有任何异常没有捕获，都会触发 `std::terminate`，这样就可能导致一些问题。

从业务场景上举例，我们假设主线程抛出一个异常，但是没有被捕获，此时程序强制终止，不会等待子线程退出，那么假如在主模块我们启动了一个子线程用于处理充值模块，那么是不是就会丢失充值数据，这很显然是绝对不能发生的对吧，因此一个健壮的 `main()` 的设计通常是这样的：

```cpp
int main() {
  try {
    // 主线程执行逻辑
  } catch (const std::exception& e) {
    // 处理各个子线程正常退出
    std::print("Exception: {}\n", e.what());
  } catch (...) {
    // 处理各个子线程正常退出
    std::print("Unknown exception occurred\n");
  }
}
```

## 自动守卫

综上，我们全部靠自己手动去在各种意外分支进行 join 难保不发生错误，有没有一种办法可以在线程对象被析构时自动进行 join，以确保线程资源的正确释放呢，我们可以基于 RAII 的思想进行封装：

```cpp
class thread_guard {
private:
  std::thread& _t;

public:
  explicit thread_guard(std::thread& t) : _t(t) {}

  ~thread_guard() {
    if (_t.joinable()) {
      _t.join();
    }
  }

  thread_guard(const thread_guard&) = delete;
  thread_guard& operator=(const thread_guard&) = delete;
};
void func6() {
  std::thread thr{bac};
  thread_guard guard{thr};
}
```

当然，在 c++20 以后，我们还可以使用 `std::jthread` 来完成上述需求，这个类除了自动 join 以外，还提供了**内置的协作式取消机制**，不止解决了所有由于忘记手动 join 导致的问题，还能非常自由的调度是否取消。

```cpp
void func7() {
  std::jthread thr{[](std::stop_token token) -> void {
    while (!token.stop_requested()) {
      std::print("Background task is running\n");
    }
    std::print("Background task is stopping\n");
  }};

  std::this_thread::sleep_for(std::chrono::seconds(1));
  thr.request_stop();
}
```

总体来说，如果可以使用 c++20 及以上，那么 `std::jthread` 绝对是首选，除非确实需要 detach 机制。

## 引用绑定

如果线程的回调函数具有引用类型的参数，那么需要使用 `std::ref` 或 `std::cref` 进行包装，否则会产生编译错误，我们先来看一个错误示例：

```cpp
void func8_err() {
  std::string str = "Hello, World!";
  std::jthread thr{[](std::string &str) -> void {
    std::print("str is: {}\n", str);
  }, str};
}
```

此时编译会报错，显示此回调期望传入一个左值引用类型参数，但实际传入的为一个右值，并不匹配。

如果是普通的函数的话，这个写法是完全可以的，而且我们明明是左值传递，怎么报错我们传入了一个右值，接下来我们分析一下：

在编译期，会进行一段检查，这里需要看一下源码，从进入构造函数开始，会执行如下操作：

```cpp
template<typename _Callable, typename... _Args, typename = _Require<__not_same<_Callable>>>
explicit
thread(_Callable&& __f, _Args&&... __args) {
static_assert( __is_invocable<typename decay<_Callable>::type, typename decay<_Args>::type...>::value,
  "std::thread arguments must be invocable after conversion to rvalues"
);
```

首先，会对所有的参数执行 `decay` 操作，这是一个类型转换操作，会执行如下的行为：

- 移除引用
- 移除 cv 修饰符
- 将数组和函数类型转换为指针类型

此时就把所有的参数都转换为 **纯值类型**，然后接着会进入 __is_invocable 进行判断：转换为纯值后该可调用对象是否可以调用。如果不可以就触发断言，那么核心就在于这个 __is_invocable 的内部实现，也就是 SFINAE 的舞台。

```cpp
template<typename _Fn, typename... _ArgTypes>
struct __is_invocable
: __is_invocable_impl<__invoke_result<_Fn, _ArgTypes...>, void>::type
{ };
```

可以看到，这个 __is_invocable 只是简单继承了一下 __is_invocable_impl，真正的核心在于 __invoke_result 的实现，它会**尝试调用转换后的可调用对象，并获取返回类型**。

此处值得注意的是：**这个模拟调用会把参数作为右值进行传递调用，因为底层会调用 std::move**。

如果调用是合法的，就会产生一个包含返回类型的 type 成员，如果是非法的，那么就会发生替换失败的错误，即编译报错，随后 __is_invocable_impl 就会根据这个返回类型去找模板特化，比如失败的类型：

```cpp
template<typename _Result, typename _Ret, bool = is_void<_Ret>::value, typename = void>
struct __is_invocable_impl
: false_type {
  using __nothrow_conv = false_type; // For is_nothrow_invocable_r
};
```

当然，如果找到了特化版本，那么就会返回成功类型，构造函数的 `static_assert` 就会通过。

至此，我们就走完了这个编译期的检查，简单来说：**对传入的参数进行decay操作，并尝试按照右值参数的方式调用转换后的可调用对象，如果调用失败则触发断言，否则构造成功**。

此处再看一下线程的本质，是不是就清晰多了：**按值存储可调用对象和所有参数的副本或移动后的版本，然后在新的线程中用这些存储的副本进行调用。**

此时我们再来分析一下这个例子为啥会报错，首先走 decay 变为纯值类型，接着使用 `std::invoke` 进行调用，此时 invoke 会模拟使用这个临时对象进行调用，即给这个 lambda 传入一个纯右值，那自然不匹配要求的左值引用，因此会触发断言。

解决方案也很简单，只需要使用 `std::ref` 或 `std::cref` 包装传入的参数即可：

```cpp
void func8() {
  std::string str = "Hello, World!";
  std::jthread thr{[](std::string &str) -> void {
    std::print("str is: {}\n", str);
  }, std::ref(str)};
}
```

哎，那为啥加上 ref 就可以了，因为 `std::ref` 底层会包装后返回一个 `std::reference_wrapper` 类型的数据，这个数据里面包含一份对原始对象的引用，那么在创建线程时，thread 很高兴，因为 `std::reference_wrapper` 是一个纯值类型，所有直接复制并存储一份副本，然后在实际调用时，invoke 认识 `std::reference_wrapper`，它不会把 wrapper 对象本身传给目标函数，而是会自动解包，取出里面的原始引用进行传递，这样就解决了引用类型参数的传递问题，`std::cref` 也是这样，只是多了 const 修饰。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/concurrent/01-thread-basic/main.cc)。
