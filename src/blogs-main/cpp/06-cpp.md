---
title: 06 cpp14
article: true
order: 6
star: false

category:
  - 语言

tag:
  - cpp

date: 2026-04-01

description: C++ 14相关特性介绍，方便快速复习
footer: Always coding, always learning
---

# cpp14

### 二进制字面量

二进制字面量提供了一种方便的方式来表示二进制数。可以用 `'` 分隔数字。

```c++
0b110 // == 6
0b1111'1111 // == 255
```

### 泛型lambda表达式

C++14 现在允许在参数列表中使用 `auto` 类型说明符，启用了多态lambda。

```c++
auto identity = [](auto x) { return x; };
int three = identity(3); // == 3
std::string foo = identity("foo"); // == "foo"
```

### Lambda捕获初始化器

这允许创建用任意表达式初始化的lambda捕获。给捕获值提供的名称不需要与任何包含作用域中的变量相关，并在lambda体内引入一个新名称。初始化表达式在创建lambda时（不是在调用时）计算。

```c++
int factory(int i) { return i * 10; }
auto f = [x = factory(2)] { return x; }; // 返回 20

auto generator = [x = 0] () mutable {
  // 如果没有 'mutable' 就无法编译，因为我们在每次调用时修改 x
  return x++;
};
auto a = generator(); // == 0
auto b = generator(); // == 1
auto c = generator(); // == 2
```

因为现在可以将值移动（或完美转发）到lambda中，而以前只能按值或引用捕获，我们现在可以通过值在lambda中捕获移动语义类型。注意在下面的例子中，`task2` 捕获列表中 `=` 左边的 `p` 是一个lambda体内私有的新变量，不是指原始的 `p`。

```c++
auto p = std::make_unique<int>(1);

auto task1 = [=] { *p = 5; }; // 错误：std::unique_ptr 无法被复制
// vs.
auto task2 = [p = std::move(p)] { *p = 5; }; // OK: p 被移动构造到闭包对象中
// 创建 task2 后，原始的 p 为空
```

使用这个方式，引用捕获可以有不同于被引用变量的名称。

```c++
auto x = 1;
auto f = [&r = x, x = x * 10] {
  ++r;
  return r + x;
};
f(); // 将 x 设为 2 并返回 12
```

### 返回类型推导

在C++14中使用 `auto` 返回类型时，编译器将尝试为你推导类型。对于lambda，现在可以使用 `auto` 推导其返回类型，这使得返回推导的引用或右值引用成为可能。

```c++
// 推导返回类型为 `int`。
auto f(int i) {
 return i;
}
```

```c++
template <typename T>
auto& f(T& t) {
  return t;
}

// 返回推导类型的引用。
auto g = [](auto& x) -> auto& { return f(x); };
int y = 123;
int& z = g(y); // 对 `y` 的引用
```

### decltype(auto)

`decltype(auto)` 类型说明符就像 `auto` 一样推导类型。然而，它在推导返回类型时保留其引用和cv限定符，而 `auto` 则不会。

```c++
const int x = 0;
auto x1 = x; // int
decltype(auto) x2 = x; // const int
int y = 0;
int& y1 = y;
auto y2 = y1; // int
decltype(auto) y3 = y1; // int&
int&& z = 0;
auto z1 = std::move(z); // int
decltype(auto) z2 = std::move(z); // int&&
```

```c++
// 注意：对泛型代码特别有用！

// 返回类型是 `int`。
auto f(const int& i) {
 return i;
}

// 返回类型是 `const int&`。
decltype(auto) g(const int& i) {
 return i;
}

int x = 123;
static_assert(std::is_same<const int&, decltype(f(x))>::value == 0);
static_assert(std::is_same<int, decltype(f(x))>::value == 1);
static_assert(std::is_same<const int&, decltype(g(x))>::value == 1);
```

参见：[`decltype (C++11)`](README.md#decltype)。

### 放松constexpr函数的约束

在C++11中，`constexpr` 函数体只能包含非常有限的语法集，包括（但不限于）：`typedef`、`using` 和单个 `return` 语句。在C++14中，允许的语法集大幅扩展，包括最常见的语法，如 `if` 语句、多个 `return`、循环等。

```c++
constexpr int factorial(int n) {
  if (n <= 1) {
    return 1;
  } else {
    return n * factorial(n - 1);
  }
}
factorial(5); // == 120
```

### 变量模板

C++14 允许变量被模板化：

```c++
template<class T>
constexpr T pi = T(3.1415926535897932385);
template<class T>
constexpr T e  = T(2.7182818284590452353);
```

### [[deprecated]] 属性

C++14 引入 `[[deprecated]]` 属性来表示某个单元（函数、类等）已弃用，可能会产生编译警告。如果提供了原因，它将包含在警告中。

```c++
[[deprecated]]
void old_method();
[[deprecated("Use new_method instead")]]
void legacy_method();
```

## C++14 库特性

### 标准库类型的用户自定义字面量

标准库类型的新的用户自定义字面量，包括 `chrono` 和 `basic_string` 的新内置字面量。这些可以是 `constexpr` 意味着它们可以在编译期使用。这些字面量的一些用途包括编译期整数解析、二进制字面量和虚数字面量。

```c++
using namespace std::chrono_literals;
auto day = 24h;
day.count(); // == 24
std::chrono::duration_cast<std::chrono::minutes>(day).count(); // == 1440
```

### 编译期整数序列

类模板 `std::integer_sequence` 表示整数的编译期序列。有一些基于其构建的辅助函数：

* `std::make_integer_sequence<T, N>` - 创建一个类型为 `T` 的序列 `0, ..., N - 1`。
* `std::index_sequence_for<T...>` - 将模板参数包转换为整数序列。

将数组转换为元组：

```c++
template<typename Array, std::size_t... I>
decltype(auto) a2t_impl(const Array& a, std::integer_sequence<std::size_t, I...>) {
  return std::make_tuple(a[I]...);
}

template<typename T, std::size_t N, typename Indices = std::make_index_sequence<N>>
decltype(auto) a2t(const std::array<T, N>& a) {
  return a2t_impl(a, Indices());
}
```

### std::make_unique

`std::make_unique` 是创建 `std::unique_ptr` 实例的推荐方式，原因如下：

* 避免必须使用 `new` 操作符。
* 在指定指针应保存的基础类型时防止代码重复。
* 最重要的是，它提供异常安全性。假设我们调用函数 `foo`，如下所示：

```c++
foo(std::unique_ptr<T>{new T{}}, function_that_throws(), std::unique_ptr<T>{new T{}});
```

编译器可以自由地调用 `new T{}`，然后 `function_that_throws()`，等等。由于我们在第一个 `T` 的构造中在堆上分配了数据，我们在这里引入了泄漏。使用 `std::make_unique`，我们获得异常安全性：

```c++
foo(std::make_unique<T>(), function_that_throws(), std::make_unique<T>());
```

查看 [智能指针 (C++11)](README.md#智能指针) 部分了解关于 `std::unique_ptr` 和 `std::shared_ptr` 的更多信息。

## 致谢

* [cppreference](http://en.cppreference.com/w/cpp) - 特别有用于查找新库特性的示例和文档。
* [C++ Rvalue References Explained](http://web.archive.org/web/20240324121501/http://thbecker.net/articles/rvalue_references/section_01.html) - 一个很好的介绍，我用它来理解右值引用、完美转发和移动语义。
* [clang](http://clang.llvm.org/cxx_status.html) 和 [gcc](https://gcc.gnu.org/projects/cxx-status.html) 的标准支持页面。这里还包括我用来查找语言/库特性描述、其目的修复内容和一些示例的提案。
* [Compiler explorer](https://godbolt.org/)
* [Scott Meyers' Effective Modern C++](https://www.amazon.com/Effective-Modern-Specific-Ways-Improve/dp/1491903996) - 强烈推荐的书！
* [Jason Turner's C++ Weekly](https://www.youtube.com/channel/UCxHAlbZQNFU2LgEtiqd2Maw) - C++ 相关视频的不错合集。
* [What can I do with a moved-from object?](http://stackoverflow.com/questions/7027523/what-can-i-do-with-a-moved-from-object)
* [What are some uses of decltype(auto)?](http://stackoverflow.com/questions/24109737/what-are-some-uses-of-decltypeauto)
