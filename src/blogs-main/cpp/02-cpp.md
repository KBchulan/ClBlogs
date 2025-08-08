---
title: 02 PIMPL 模式
article: true
order: 2
star: false

category:
  - 语言

tag:
  - cpp

date: 2025-07-18

description: 介绍 C++ 的 PIMPL（Pointer to Implementation）模式，从基本实现到现代 C++ 的最佳实践。
footer: Always coding, always learning
---

<!-- more -->

# PIMPL 模式

> PIMPL 是 "pointer to implementation" 的缩写。这是一种很常用的 C++ 设计模式，通过将类的实现细节从其接口中分离出来，可以有效地降低代码耦合度，并显著加快大型项目的编译速度。

## 核心思想

PIMPL 模式的核心在于，将类的私有成员变量和私有方法（即实现细节）移动到一个单独的、不透明的实现类（或结构体）中。而在主类的头文件中，我们只保留一个指向该实现类的指针。

这样一来，头文件只暴露了必要的公共接口，而将所有实现细节完全隐藏在了源文件中。

## 为什么使用 PIMPL？

PIMPL 模式主要带来三大好处：

### 1. 编译防火墙 (Compilation Firewall)

这是 PIMPL 最重要的优点。在常规的 C++ 开发中，如果一个类的头文件被多个源文件包含，那么只要这个头文件有任何改动（哪怕只是增加一个私有成员变量），所有包含了它的源文件都必须重新编译。在大型项目中，这会导致漫长的编译等待。

通过 PIMPL，类的实现细节被隐藏在 `.cpp` 文件中。当我们需要修改私有成员或添加新的内部工具函数时，只需要重新编译该类自身的 `.cpp` 文件，而所有客户端代码都无需改动，从而极大地缩短了编译时间。

### 2. 稳定的二进制接口 (ABI)

当我们开发一个需要以二进制形式发布的库时，保持 ABI (Application Binary Interface) 的稳定性至关重要。如果类的成员布局（如成员变量的大小、顺序）发生改变，就会破坏 ABI，导致使用旧版本库编译的程序无法与新版库链接。

PIMPL 模式通过将实现细节隐藏在指针之后，确保了主类对象的大小和内存布局保持不变（大小始终是一个指针）这样就可以自由的修改内部实现，而不会破坏 ABI 兼容性。

### 3. 真正的封装

PIMPL 模式提供了比 `private` 关键字更强的封装。客户端代码完全无法看到实现类的任何细节，包括它所依赖的头文件。这确保了用户不会依赖任何内部实现，使得代码库的维护和演进更加自由。

## 基本实现

下面是一个使用原生指针的简单 PIMPL 实现，由于析构的本质是在调用析构时生成各个成员的析构，也就是说析构的实现处一定是要知道所有成员如何析构的，也就是所谓的 **完整类型**，因此析构的实现一定在 Impl的实现之后，否则会报错。

### `widget.hpp`

```cpp
#pragma once

class Widget {
public:
  Widget();
  ~Widget();

  void doSomething();

private:
  class Impl;  // 仅前向声明实现类
  Impl* pimpl; // 指向实现的指针
};
```

### `widget.cc`

```cpp
#include "widget.hpp"
#include <iostream>
#include <string>

// 实现类的完整定义
class Widget::Impl {
public:
  void doSomething() {
    std::cout << "Doing something in Impl with data: " << data << std::endl;
  }
private:
    std::string data = "secret data";
};

// 主类方法的实现
Widget::Widget() : pimpl(new Impl) {}

Widget::~Widget() {
  delete pimpl;
}

void Widget::doSomething() {
  pimpl->doSomething();
}
```

## 更好的实践

手动管理裸指针容易出错，推荐使用 `std::unique_ptr` 来自动管理 PIMPL 的生命周期，这更安全、更简洁。

### `widget.hpp`

```cpp
#pragma once

#include <memory>

class Widget {
public:
  Widget();
  ~Widget();

  // 由于三五法则，这些需要实现
  Widget(const Widget& other);
  Widget& operator=(const Widget& other);
  Widget(Widget&& other) noexcept;
  Widget& operator=(Widget&& other) noexcept;

  void doSomething();

private:
  class Impl;
  std::unique_ptr<Impl> pimpl;
};
```

### `widget.cc`

```cpp
#include "widget.hpp"
#include <iostream>
#include <string>
#include <utility>

class Widget::Impl {
public:
  void doSomething() {
    std::cout << "Doing something in Impl with data: " << data << std::endl;
  }
  std::string data = "secret data";
};

Widget::Widget() : pimpl(std::make_unique<Impl>()) {}

Widget::~Widget() = default;

// --- 规则五的实现 ---
// 深拷贝构造函数
Widget::Widget(const Widget &other)
    : pimpl(std::make_unique<Impl>(*other.pimpl)) {}

// 拷贝赋值运算符
Widget &Widget::operator=(const Widget &other) {
  if (this != &other) {
    pimpl = std::make_unique<Impl>(*other.pimpl);
  }
  return *this;
}

// 移动构造函数
Widget::Widget(Widget &&other) noexcept = default;

// 移动赋值运算符
Widget &Widget::operator=(Widget &&other) noexcept = default;

void Widget::doSomething() { pimpl->doSomething(); }
```

## 三五法则

“三五法则”是 C++ 中关于如何管理资源和类的特殊成员函数的一组核心准则。这里的“五”指的是五个特殊成员函数：

1.  析构函数
2.  拷贝构造函数
3.  拷贝赋值运算符
4.  移动构造函数
5.  移动赋值运算符

法则的核心思想是：**如果你需要为一个类显式地定义这五个函数中的任何一个，那么你很可能需要对所有这五个函数进行审视和处理**。

C++11 及之后版本，编译器生成这些函数的规则可以总结如下：

1.  **如果你定义了析构函数**：
    *   编译器**不会**自动生成**移动构造/赋值**函数。
    *   编译器**仍然会**生成**拷贝构造/赋值**函数（但这种行为被认为是不推荐的）。

2.  **如果你定义了拷贝构造/赋值函数**：
    *   编译器**不会**自动生成**移动构造/赋值**函数。

3.  **如果你定义了移动构造/赋值函数**：
    *   编译器**不会**自动生成任何**拷贝构造/赋值**函数。
    *   编译器也**不会**自动生成另一个移动操作（例如，定义了移动构造，就不会生成移动赋值）。

> 在 PIMPL 的 `std::unique_ptr` 实现中，我们必须在 `.cpp` 文件中定义析构函数。根据上述规则，这会阻止编译器生成移动操作。同时，`std::unique_ptr` 本身是不可拷贝的，所以默认的拷贝操作也会被删除。这就迫使我们必须手动实现或 `default` 所有的特殊成员函数，以确保类的行为正确，这正是“五法则”的体现。

## 缺点与权衡

PIMPL 模式并非完美，它也有一些代价：

- **运行时开销**：
    - **内存**：对象在堆上分配，增加了动态内存分配和释放的开销。
    - **性能**：每次访问实现都需要一次额外的指针解引用，这对于性能极其敏感的代码段可能是个问题。
- **维护成本**：
    - 需要编写更多的样板代码来转发函数调用。
    - 类的设计变得稍微复杂，需要管理两个类和一个指针。

## 总结

总体来说，PIMPL 模式是一个非常实用的设计模式，尤其适用于以下场景：

- **开发二进制库**：当需要保持长期稳定的 ABI 时。
- **大型项目**：当编译时间成为开发瓶颈时。
- **复杂类**：当一个类依赖大量其他头文件，而不想将这些依赖暴露给客户端时。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/cpp/pimpl/widget.cc)。
