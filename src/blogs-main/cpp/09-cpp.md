---
title: 08 cpp23
article: true
order: 8
star: false

category:
  - 语言

tag:
  - cpp

date: 2026-04-01

description: C++ 23相关特性介绍，方便快速复习
footer: Always coding, always learning
---

# cpp23

### consteval if

编写在常数评估期间实例化的代码。

```c++
consteval int f(int i) { return i; }

constexpr int g(int i) {
  if consteval {
      return f(i);
  } else {
      return 42;
  }
}
```

### 推导 `this`

使用C++23中引入的显式对象成员函数，通过在成员函数的第一个参数前缀为 `this` 关键字来推导对象的类型和值类别：

```c++
// 新方式使用推导this：
struct T {
  decltype(auto) operator[](this auto& self, std::size_t idx) {
    return self.mVector[idx];
  }
};

// 旧方式：
struct T {
  value_t& operator[](std::size_t idx) {
    return mVector[idx];
  }
  const value_t& operator[](std::size_t idx) const {
    return mVector[idx];
  }
};
```

### 多维下标操作符

为 `operator[]` 操作符指定零个或更多参数：

```c++
template <typename T, std::size_t Z, std::size_t Y, std::size_t X>
struct Array3d {
  std::array<T, X * Y * Z> m{};

  T& operator[](std::size_t z, std::size_t y, std::size_t x) {
      return m[z * Y * X + y * X + x];
  }
};

Array3d<int, 4, 3, 2> v;
v[3, 2, 1] = 42;
```

### 提高基于范围的 `for` 安全性

修复C++最重要的控制结构之一的一些臭名昭著的生命周期问题。

一些在C++23前被破坏但现在固定的代码片段示例：

* `for (auto e : getTmp().getRef())`
* `for (auto e : getVector()[0])`
* `for (auto valueElem : getMap()["key"])`
* `for (auto e : get<0>(getTuple()))`
* `for (auto e : getOptionalCollection().value())`
* `for (char c : get<std::string>(getVariant()))`

## C++23 库特性

### 栈跟踪库

栈跟踪是调用序列的近似表示，由栈跟踪条目组成。栈跟踪条目（由 `std::stacktrace_entry` 表示）由包括源文件和行号以及描述字段的信息组成。

Linux系统上的示例输出：

```c++
#include <print>
#include <stacktrace>

int main() {
    std::println("{}", std::stacktrace::current());
}
```

```
  0#  main at /app/example.cpp:5 [0x5ee42e3db747]
  1#  <unknown> [0x76e76dc29d8f]
  2#  __libc_start_main [0x76e76dc29e3f]
  3#  _start [0x5ee42e3db644]
```

### 字符串和字符串视图的contains

一个更简单的函数来查询一个子字符串是否包含在字符串或字符串视图中：

```c++
std::string{"foobarbaz"}.contains("bar"); // == true
std::string{"foobarbaz"}.contains("bat"); // == false
```

### std::to_underlying

支持将枚举转换为其基础类型的常见实用程序：

```c++
enum class MyEnum : int { A = 1, B, C };
std::to_underlying(MyEnum::A); // == 1
std::to_underlying(MyEnum::C); // == 3
```

### `spanstream`

一个 `strstream` 替代品，使用字符跨度作为外部提供的缓冲区。对缓冲区没有所有权或重新分配。

```c++
char input[] = "10 20 30";
std::ispanstream is{std::span<char>{input}};
int i;
is >> i; // i == 10
is >> i; // i == 20
is >> i; // i == 30
```

```c++
char output[30]{}; // 零初始化数组
std::ospanstream os{std::span<char>{output}};
os << 10 << 20 << 30;
std::span<char> sp = os.span();
```

### 输入/输出指针

`std::out_ptr` 和 `std::inout_ptr` 是支持C API和智能指针的抽象，通过创建一个临时指针对指针来更新销毁时的智能指针。简而言之：它是一个可转换为 `T**` 的东西，在超出作用域时用对它创建的智能指针的一个 `reset` 调用或语义等效行为更新它。

此抽象还在抛出异常时安全地管理关联内存的生命周期。

```c++
// p_handle 被写入（输出）。
int c_api_create_handle(MyHandle** p_handle);
// p_handle 既被读入（输入）又被写入（输出）。
int c_api_recreate_handle(MyHandle** p_handle);
void c_api_delete_handle(MyHandle* handle);

struct resource_deleter {
	void operator()(MyHandle* handle) {
		c_api_delete_handle(handle);
	}
};
```

```c++
std::unique_ptr<MyHandle, resource_deleter> resource(nullptr);
int err = c_api_create_handle(std::out_ptr(resource));
// `resource` 现在拥有在 `c_api_create_handle` 中分配的内存。
```

```c++
std::shared_ptr<MyHandle> resource(nullptr);
int err = c_api_recreate_handle(std::inout_ptr(resource), resource_deleter{});
// `resource` 现在共享在 `c_api_recreate_handle` 中分配的内存。
```

Inout/out指针都支持到 `void**` 的转换（隐式），以及显式到用户指定类型的转换。

### std::optional的幺半群操作

支持 `std::optional` 的各种 `and_then`、`transform` 和 `or_else` 操作。

```c++
std::optional<int> parse_int(const std::string&);
std::optional<int> ensure_non_negative(int);
std::optional<double> default_value_or_empty(double);

std::optional<double> stringToSqrtDouble(const std::string& input) {
  return parse_int(input)
    .and_then(ensure_non_negative)
    .transform([](int x) {
      return std::sqrt(x);
    })
    .or_else(default_value_or_empty);
}
```

### `std::expected`

`std::expected` 提供了一种方式来表示一个值和一个潜在的错误值，两者都包含在一种类型中。还支持对预期值和意外（即错误）值的各种幺半群操作。

使用 `std::unexpected` 来存储一个意外的（即错误）值。

```c++
enum class StringToSqrtDoubleError {
    ParseError, NegativeNumber
};

std::expected<int, StringToSqrtDoubleError> parse_int(const std::string&);

std::expected<double, StringToSqrtDoubleError> stringToSqrtDouble(const std::string& input) {
    auto parsed = parse_int(input);
    if (!parsed) return parsed;

    auto parsedInt = *parsed;
    if (parsedInt < 0) return std::unexpected(StringToSqrtDoubleError::NegativeNumber);

    return std::sqrt(parsedInt);
}
```

### `std::unreachable`

提供了一种方式来显式标记代码路径为不可达。如果达到代码路径可能表现未定义行为。

```c++
enum class MyEnum { A, B, C };

int convertMyEnumToInt(MyEnum e) {
    switch (e) {
        case MyEnum::A: return 0;
        case MyEnum::B: return 1;
        case MyEnum::C: return 2;
        default: std::unreachable();
    }
}
```

## 致谢

* [cppreference](http://en.cppreference.com/w/cpp) - 特别有用于查找新库特性的示例和文档。
* [C++ Rvalue References Explained](http://web.archive.org/web/20240324121501/http://thbecker.net/articles/rvalue_references/section_01.html) - 一个很好的介绍，我用它来理解右值引用、完美转发和移动语义。
* [clang](http://clang.llvm.org/cxx_status.html) 和 [gcc](https://gcc.gnu.org/projects/cxx-status.html) 的标准支持页面。这里还包括我用来查找语言/库特性描述、其目的修复内容和一些示例的提案。
* [Compiler explorer](https://godbolt.org/)
* [Scott Meyers' Effective Modern C++](https://www.amazon.com/Effective-Modern-Specific-Ways-Improve/dp/1491903996) - 强烈推荐的书！
* [Jason Turner's C++ Weekly](https://www.youtube.com/channel/UCxHAlbZQNFU2LgEtiqd2Maw) - C++ 相关视频的不错合集。
* [What can I do with a moved-from object?](http://stackoverflow.com/questions/7027523/what-can-i-do-with-a-moved-from-object)
* [What are some uses of decltype(auto)?](http://stackoverflow.com/questions/24109737/what-are-some-uses-of-decltypeauto)

