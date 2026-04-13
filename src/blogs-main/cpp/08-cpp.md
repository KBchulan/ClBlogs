---
title: 08 cpp20
article: true
order: 8
star: false

category:
  - 语言

tag:
  - cpp

date: 2026-04-01

description: C++ 20相关特性介绍，方便快速复习
footer: Always coding, always learning
---

# cpp20

## C++20 语言特性

### 协程

> **注意：** 虽然这些示例说明了如何在基本级别使用协程，但编译代码时还有很多其他情况。这些示例不是C++20协程的完整覆盖。由于标准库还没有提供 `generator` 和 `task` 类，我使用cppcoro库来编译这些示例。

*协程*是可以暂停和恢复执行的特殊函数。要定义协程，`co_return`、`co_await` 或 `co_yield` 关键字必须存在于函数体中。C++20的协程是无栈的；除非被编译器优化，其状态在堆上分配。

协程的一个例子是*生成器*函数，它在每次调用时产生（即生成）一个值：

```c++
generator<int> range(int start, int end) {
  while (start < end) {
    co_yield start;
    start++;
  }

  // 此函数末尾的隐式 co_return：
  // co_return;
}

for (int n : range(0, 10)) {
  std::cout << n << std::endl;
}
```

上面的 `range` 生成器函数产生从 `start` 到 `end`（不包括）的值，每个迭代步骤产生存储在 `start` 中的当前值。生成器在 `range` 的每次调用中维护其状态（在这种情况下，调用是for循环中的每次迭代）。`co_yield` 获取给定的表达式，产生（即返回）其值，并在该点暂停协程。恢复时，执行在 `co_yield` 之后继续。

协程的另一个例子是*任务*，这是一个异步计算，在等待任务时执行：

```c++
task<void> echo(socket s) {
  for (;;) {
    auto data = co_await s.async_read();
    co_await async_write(s, data);
  }

  // 此函数末尾的隐式 co_return：
  // co_return;
}
```

在这个例子中，引入了 `co_await` 关键字。这个关键字获取一个表达式并在执行不准备（在这种情况下，读取或写入不准备）时暂停执行，否则继续执行。（注意，在幕后，`co_yield` 使用 `co_await`。）

使用任务来懒惰评估值：

```c++
task<int> calculate_meaning_of_life() {
  co_return 42;
}

auto meaning_of_life = calculate_meaning_of_life();
// ...
co_await meaning_of_life; // == 42
```

### 概念

*概念*是约束类型的命名编译期谓词。它们采用以下形式：

```cpp
template < template-parameter-list >
concept concept-name = constraint-expression;
```

其中 `constraint-expression` 计算为constexpr布尔。*约束*应该模型化语义要求，例如类型是否是数值的或可哈希的。如果给定类型不满足它绑定的概念（即 `constraint-expression` 返回 `false`），则编译器错误。因为约束在编译期评估，它们可以提供更有意义的错误消息和运行时安全。

```c++
// `T` 不受任何约束限制。
template <typename T>
concept always_satisfied = true;
// 将 `T` 限制为整数。
template <typename T>
concept integral = std::is_integral_v<T>;
// 将 `T` 限制为 `integral` 约束和符号性。
template <typename T>
concept signed_integral = integral<T> && std::is_signed_v<T>;
// 将 `T` 限制为 `integral` 约束和 `signed_integral` 约束的否定。
template <typename T>
concept unsigned_integral = integral<T> && !signed_integral<T>;
```

有各种语法形式来强制执行概念：

```c++
// 函数参数的形式：
// `T` 是受约束的类型模板参数。
template <my_concept T>
void f(T v);

// `T` 是受约束的类型模板参数。
template <typename T>
  requires my_concept<T>
void f(T v);

// `T` 是受约束的类型模板参数。
template <typename T>
void f(T v) requires my_concept<T>;

// `v` 是受约束的推导参数。
void f(my_concept auto v);

// `v` 是受约束的非类型模板参数。
template <my_concept auto v>
void g();

// 自动推导变量的形式：
// `foo` 是受约束的自动推导值。
my_concept auto foo = ...;

// Lambda的形式：
// `T` 是受约束的类型模板参数。
auto f = []<my_concept T> (T v) {
  // ...
};
// `T` 是受约束的类型模板参数。
auto f = []<typename T> requires my_concept<T> (T v) {
  // ...
};
// `T` 是受约束的类型模板参数。
auto f = []<typename T> (T v) requires my_concept<T> {
  // ...
};
// `v` 是受约束的推导参数。
auto f = [](my_concept auto v) {
  // ...
};
// `v` 是受约束的非类型模板参数。
auto g = []<my_concept auto v> () {
  // ...
};
```

`requires` 关键字用于启动 `requires` 子句或 `requires` 表达式：

```c++
template <typename T>
  requires my_concept<T> // `requires` 子句。
void f(T);

template <typename T>
concept callable = requires (T f) { f(); }; // `requires` 表达式。

template <typename T>
  requires requires (T x) { x + x; } // 同一行上的 `requires` 子句和表达式。
T add(T a, T b) {
  return a + b;
}
```

注意 `requires` 表达式中的参数列表是可选的。`requires` 表达式中的每个要求是以下之一：

* **简单要求** - 断言给定表达式是有效的。

```c++
template <typename T>
concept callable = requires (T f) { f(); };
```

* **类型要求** - 由 `typename` 关键字后跟类型名表示，断言给定的类型名是有效的。

```c++
struct foo {
  int foo;
};

struct bar {
  using value = int;
  value data;
};

struct baz {
  using value = int;
  value data;
};

// 使用SFINAE，如果 `T` 是 `baz` 则启用。
template <typename T, typename = std::enable_if_t<std::is_same_v<T, baz>>>
struct S {};

template <typename T>
using Ref = T&;

template <typename T>
concept C = requires {
                     // 对类型 `T` 的要求：
  typename T::value; // A) 有一个内部成员名称为 `value`
  typename S<T>;     // B) 必须有一个有效的类模板特化 `S`
  typename Ref<T>;   // C) 必须是一个有效的别名模板替换
};

template <C T>
void g(T a);

g(foo{}); // 错误：失败要求 A。
g(bar{}); // 错误：失败要求 B。
g(baz{}); // 通过。
```

* **复合要求** - 大括号中的表达式后跟尾随返回类型或类型约束。

```c++
template <typename T>
concept C = requires(T x) {
  {*x} -> std::convertible_to<typename T::inner>; // 表达式 `*x` 的类型可转换为 `T::inner`
  {x + 1} -> std::same_as<int>; // 表达式 `x + 1` 满足 `std::same_as<decltype((x + 1)))`
  {x * 1} -> std::convertible_to<T>; // 表达式 `x * 1` 的类型可转换为 `T`
};
```

* **嵌套要求** - 由 `requires` 关键字表示，指定其他约束（例如本地参数参数上的约束）。

```c++
template <typename T>
concept C = requires(T x) {
  requires std::same_as<sizeof(x), size_t>;
};
```

参见：[概念库](#概念库)。

### 三路比较

C++20 引入了宇宙飞船操作符 (`<=>`)，作为一种新的方式来编写比较函数，减少样板代码并帮助开发人员定义更清晰的比较语义。定义三路比较操作符将自动生成其他比较操作符函数（即 `==`、`!=`、`<` 等）。

引入三种排序：

* `std::strong_ordering`：强排序区分项目是否相等（相同且可互换）。提供 `less`、`greater`、`equivalent` 和 `equal` 排序。比较示例：在列表中搜索特定值、整数值、区分大小写的字符串。
* `std::weak_ordering`：弱排序区分项目是否等价（不相同，但出于比较目的可互换）。提供 `less`、`greater` 和 `equivalent` 排序。比较示例：不区分大小写的字符串、排序、比较类的某些但不是全部可见成员。
* `std::partial_ordering`：部分排序遵循与弱排序相同的原则，但包括排序不可能的情况。提供 `less`、`greater`、`equivalent` 和 `unordered` 排序。比较示例：浮点值（例如 `NaN`）。

默认三路比较操作符执行成员对成员的比较：

```c++
struct foo {
  int a;
  bool b;
  char c;

  // 比较 `a` 首先，然后 `b`，然后 `c` ...
  auto operator<=>(const foo&) const = default;
};

foo f1{0, false, 'a'}, f2{0, true, 'b'};
f1 < f2; // == true
f1 == f2; // == false
f1 >= f2; // == false
```

你也可以定义你自己的比较：

```c++
struct foo {
  int x;
  bool b;
  char c;

  std::strong_ordering operator<=>(const foo& other) const {
      return x <=> other.x;
  }
};

foo f1{0, false, 'a'}, f2{0, true, 'b'};
f1 < f2; // == false
f1 == f2; // == true
f1 >= f2; // == true
```

### 指定初始化器

C风格指定的初始化器语法。任何在指定的初始化器列表中没有明确列出的成员字段都是默认初始化的。

```c++
struct A {
  int x;
  int y;
  int z = 123;
};

A a {.x = 1, .z = 2}; // a.x == 1, a.y == 0, a.z == 2
```

### Lambda的模板语法

在lambda表达式中使用熟悉的模板语法。

```c++
auto f = []<typename T>(std::vector<T> v) {
  // ...
};
```

### 带初始化器的基于范围的for循环

此功能简化常见代码模式，帮助保持作用域紧凑，并为常见的生命周期问题提供优雅的解决方案。

```c++
for (auto v = std::vector{1, 2, 3}; auto& e : v) {
  std::cout << e;
}
// 打印 "123"
```

### \[\[likely\]\] 和 \[\[unlikely\]\] 属性

向优化器提示标记语句有被执行的高概率的提示。

```c++
switch (n) {
case 1:
  // ...
  break;

[[likely]] case 2:  // n == 2 被认为比 n 的任何其他值
  // ...            // 要任意更可能
  break;
}
```

如果可能性/不可能属性之一出现在if语句的右括号之后，它表示该分支可能/不太可能执行其子语句（体）。

```c++
int random = get_random_number_between_x_and_y(0, 3);
if (random > 0) [[likely]] {
  // if 语句的体
  // ...
}
```

它也可以应用于迭代语句的子语句（体）。

```c++
while (unlikely_truthy_condition) [[unlikely]] {
  // while 语句的体
  // ...
}
```

### 弃用this的隐式捕获

使用 `[=]` 隐式捕获lambda捕获中的 `this` 现已弃用；建议显式使用 `[=, this]` 或 `[=, *this]` 捕获。

```c++
struct int_value {
  int n = 0;
  auto getter_fn() {
    // 不好：
    // return [=]() { return n; };

    // 好：
    return [=, *this]() { return n; };
  }
};
```

### 非类型模板参数中的类类型

类现在可以用于非类型模板参数。作为模板参数传递的对象的类型为 `const T`，其中 `T` 是对象的类型，具有静态存储期限。

```c++
struct foo {
  foo() = default;
  constexpr foo(int) {}
};

template <foo f = {}>
auto get_foo() {
  return f;
}

get_foo(); // 使用隐式构造函数
get_foo<foo{123}>();
```

### constexpr虚函数

虚函数现在可以是 `constexpr` 并在编译期评估。`constexpr` 虚函数可以重写非 `constexpr` 虚函数，反之亦然，这与传统行为下虚函数运行时评估导致 `constexpr` 无法修饰虚函数的情况不同。

```c++
struct X1 {
  virtual int f() const = 0;
};

struct X2: public X1 {
  constexpr virtual int f() const { return 2; }
};

struct X3: public X2 {
  virtual int f() const { return 3; }
};

struct X4: public X3 {
  constexpr virtual int f() const { return 4; }
};

constexpr X4 x4;
x4.f(); // == 4
```

### explicit(bool)

在编译期有条件地选择构造函数是否是显式的。`explicit(true)` 与指定 `explicit` 相同。

```c++
struct foo {
  // 指定非整数类型（字符串、浮点数等）需要显式构造。
  template <typename T>
  explicit(!std::is_integral_v<T>) foo(T) {}
};

foo a = 123; // OK
foo b = "123"; // 错误：显式构造函数不是候选者（explicit说明符计算为true）
foo c {"123"}; // OK
```

### 立即函数

类似于 `constexpr` 函数，但具有 `consteval` 说明符的函数必须产生常数。这些被称为*立即函数*，即 `consteval` 函数，并且必须在编译期调用，否则就会导致编译错误。

```c++
consteval int sqr(int n) {
  return n * n;
}

constexpr int r = sqr(100); // OK
int x = 100;
int r2 = sqr(x); // 错误：'x' 的值在常数表达式中不可用
                 // 如果 `sqr` 是一个 `constexpr` 函数就OK
```

### using enum

将枚举的成员引入作用域以改进可读性。之前：

```c++
enum class rgba_color_channel { red, green, blue, alpha };

std::string_view to_string(rgba_color_channel channel) {
  switch (channel) {
    case rgba_color_channel::red:   return "red";
    case rgba_color_channel::green: return "green";
    case rgba_color_channel::blue:  return "blue";
    case rgba_color_channel::alpha: return "alpha";
  }
}
```

之后：

```c++
enum class rgba_color_channel { red, green, blue, alpha };

std::string_view to_string(rgba_color_channel my_channel) {
  switch (my_channel) {
    using enum rgba_color_channel;
    case red:   return "red";
    case green: return "green";
    case blue:  return "blue";
    case alpha: return "alpha";
  }
}
```

### Lambda参数包的捕获

按值捕获参数包：

```c++
template <typename... Args>
auto f(Args&&... args){
    // 按值：
    return [...args = std::forward<Args>(args)] {
        // ...
    };
}
```

按引用捕获参数包：

```c++
template <typename... Args>
auto f(Args&&... args){
    // 按引用：
    return [&...args = std::forward<Args>(args)] {
        // ...
    };
}
```

### char8_t

为表示UTF-8字符串提供标准类型。

```c++
char8_t utf8_str[] = u8"\u0123";
```

### constinit

`constinit` 说明符要求变量必须在编译期初始化，但它并不具有 `const` 语义，仅要求变量具有静态存储期限并且在编译期初始化。这对于需要在编译期初始化但在运行时修改的变量很有用。

```c++
const char* g() { return "dynamic initialization"; }
constexpr const char* f() { return "constant initializer"; }

constinit const char* c = f();  // OK
constinit const char* d = g();  // 错误：`g` 不是constexpr，所以 `d` 无法在编译期评估。
```

### \_\_VA\_OPT\_\_

通过在可变参数宏非空时对给定参数求值来支持可变参数宏。

```c++
#define F(...) f(0 __VA_OPT__(,) __VA_ARGS__)
F(a, b, c) // 被替换为 f(0, a, b, c)
F()        // 被替换为 f(0)
```

## C++20 库特性

### 文本格式化

使用 `std::format` 向标准库提供编译期检查的字符串格式化库。文本格式化也可以使用 `std::vformat` 和其他辅助实用程序在运行时完成动态格式化字符串。文本格式化遵循给定的[规范](https://en.cppreference.com/w/cpp/utility/format/spec.html)。

`std::format` 接收格式字符串作为第一个参数，以及随之的可变数量参数。如果格式化失败，编译将失败：

```cpp
std::format("{}", 123); // OK -- 返回 "123"
std::format("{} {}", 123); // 错误 -- 参数不足
std::format("{} {}", "Here's a number:", 123); // OK
```

基于在运行时创建的格式化器格式化字符串，`std::make_format_args` 要求接收的是左值引用的参数包：

```cpp
std::string fmt = "{} {}";
fmt += "{}{}";
std::string s = "Here's a number:";
int a = 1, b = 2, c = 3;
auto res = std::vformat(fmt, std::make_format_args(s, a, b, c));
std::cout << res << '\n'; // 输出 "Here's a number: 1 2 3"
```

格式化失败时（例如无效的格式字符串），`std::vformat` 会抛出 `std::format_error`。

格式化自定义类型：

```c++
struct fraction {
  int numerator;
  int denominator;
};

template <>
struct std::formatter<fraction> {
  constexpr auto parse(std::format_parse_context& ctx) {
    return ctx.begin();
  }

  auto format(const fraction& f, std::format_context& ctx) const {
    return std::format_to(ctx.out(), "{0:d}/{1:d}", f.numerator, f.denominator);
  }
};

fraction f{1, 2};
std::format("{}", f); // == "1/2"
```

### 概念库

概念也由标准库提供，用于构建更复杂的概念。其中一些包括：

**核心语言概念：**

- `same_as` - 指定两个类型是相同的。
- `derived_from` - 指定一个类型是从另一个类型派生的。
- `convertible_to` - 指定一个类型可隐式转换为另一个类型。
- `common_with` - 指定两个类型共享一个公共类型。
- `integral` - 指定一个类型是整数类型。
- `default_constructible` - 指定类型的对象可以默认构造。

**比较概念：**

- `equality_comparable` - 指定 `operator==` 是等价关系。

**对象概念：**

- `movable` - 指定类型的对象可以被移动和交换。
- `copyable` - 指定类型的对象可以被复制、移动和交换。
- `semiregular` - 指定类型的对象可以被复制、移动、交换和默认构造。
- `regular` - 指定一个类型是*常规的*，即它既是 `semiregular` 又是 `equality_comparable`。

**可调用概念：**

- `invocable` - 指定可调用类型可以用给定的参数类型集调用。
- `predicate` - 指定可调用类型是布尔谓词。

参见：[概念](#概念)。

### 同步缓冲输出流

缓冲包装输出流的输出操作，确保同步（即没有输出的交错）。

```c++
std::osyncstream{std::cout} << "The value of x is:" << x << std::endl;
```

### std::span

跨度是一个容器的视图（即非所有权），提供对连续元素组的边界检查访问。由于视图不拥有其元素，它们的构造和复制成本低 -- 简化的思考视图方式是它们对其数据的引用。与维护指针/迭代器和长度字段相反，跨度在单个对象中包装两者。

跨度可以是动态大小或固定大小（称为其*范围*）。固定大小的跨度受益于边界检查。

Span不传播const，所以构造只读跨度使用 `std::span<const T>`。

示例：使用动态大小的跨度从各种容器打印整数。

```c++
void print_ints(std::span<const int> ints) {
    for (const auto n : ints) {
        std::cout << n << std::endl;
    }
}

print_ints(std::vector{ 1, 2, 3 });
print_ints(std::array<int, 5>{ 1, 2, 3, 4, 5 });

int a[10] = { 0 };
print_ints(a);
// 等等
```

示例：静态大小的跨度将无法编译不匹配跨度范围的容器。

```c++
void print_three_ints(std::span<const int, 3> ints) {
    for (const auto n : ints) {
        std::cout << n << std::endl;
    }
}

print_three_ints(std::vector{ 1, 2, 3 }); // 错误
print_three_ints(std::array<int, 5>{ 1, 2, 3, 4, 5 }); // 错误
int a[10] = { 0 };
print_three_ints(a); // 错误

std::array<int, 3> b = { 1, 2, 3 };
print_three_ints(b); // OK

// 如果需要，你可以手动构造一个跨度：
std::vector c{ 1, 2, 3 };
print_three_ints(std::span<const int, 3>{ c.data(), 3 }); // OK：设置指针和长度字段。
print_three_ints(std::span<const int, 3>{ c.cbegin(), c.cend() }); // OK：使用迭代器对。
```

### 位运算

C++20 提供了一个新的 `<bit>` 头文件，提供一些位运算，包括popcount。

```c++
std::popcount(0u); // 0
std::popcount(1u); // 1
std::popcount(0b1111'0000u); // 4
```

### 数学常数

数学常数，包括 PI、欧拉数等，定义在 `<numbers>` 头文件中。

```c++
std::numbers::pi; // 3.14159...
std::numbers::e; // 2.71828...
```

### std::is_constant_evaluated

谓词函数，在编译期上下文中调用时为真，可以用于编写在编译期和运行时具有不同行为的函数。

```c++
constexpr bool is_compile_time() {
    return std::is_constant_evaluated();
}

constexpr bool a = is_compile_time(); // true
bool b = is_compile_time(); // false
```

### std::make_shared支持数组

```c++
auto p = std::make_shared<int[]>(5); // 指向 `int[5]` 的指针
// 或
auto p = std::make_shared<int[5]>(); // 指向 `int[5]` 的指针
```

### 字符串的 starts_with 和 ends_with

字符串（和字符串视图）现在有 `starts_with` 和 `ends_with` 成员函数来检查字符串是否以给定字符串开始或结束。

```c++
std::string str = "foobar";
str.starts_with("foo"); // true
str.ends_with("baz"); // false
```

### 检查关联容器是否包含元素

集合和映射等关联容器有一个 `contains` 成员函数，可以用来代替"查找并检查迭代器末尾"的习语。

```c++
std::map<int, char> map {{1, 'a'}, {2, 'b'}};
map.contains(2); // true
map.contains(123); // false

std::set<int> set {1, 2, 3};
set.contains(2); // true
```

### std::bit_cast

重新解释一个对象从一种类型到另一种更安全的方式，而不需要使用 `reinterpret_cast`。要求源类型和目标类型的 `sizeof` 必须相等，且两者都是 trivially copyable，否则编译失败。

```c++
float f = 123.0;
int i = std::bit_cast<int>(f);
```

### std::midpoint

安全地计算两个整数的中点（无溢出）。

```c++
std::midpoint(1, 3); // == 2
```

### std::to_array

将给定的数组/"类数组"对象转换为 `std::array`。

```c++
std::to_array("foo"); // 返回 `std::array<char, 4>`
std::to_array<int>({1, 2, 3}); // 返回 `std::array<int, 3>`

int a[] = {1, 2, 3};
std::to_array(a); // 返回 `std::array<int, 3>`
```

### std::bind_front

将前N个参数（其中N是传递给 `std::bind_front` 的给定函数之后的参数数量）绑定到给定的自由函数、lambda或成员函数。

```c++
const auto f = [](int a, int b, int c) { return a + b + c; };
const auto g = std::bind_front(f, 1, 1);
g(1); // == 3
```

### 统一容器擦除

为各种STL容器提供 `std::erase` 和/或 `std::erase_if`，例如string、list、vector、map等。

对于按值擦除使用 `std::erase`，或指定何时使用 `std::erase_if` 擦除元素的谓词。两个函数都返回擦除元素的数量。

```c++
std::vector v{0, 1, 0, 2, 0, 3};
std::erase(v, 0); // v == {1, 2, 3}
std::erase_if(v, [](int n) { return n == 0; }); // v == {1, 2, 3}
```

### 三路比较辅助函数

用于为比较结果命名的辅助函数：

```c++
std::is_eq(0 <=> 0); // == true
std::is_lteq(0 <=> 1); // == true
std::is_gt(0 <=> 1); // == false
```

参见：[三路比较](#三路比较)。

### std::lexicographical_compare_three_way

字典式比较两个范围使用三路比较，并产生最强适用比较类别类型的结果。

```c++
std::vector a{0, 0, 0}, b{0, 0, 0}, c{1, 1, 1};

auto cmp_ab = std::lexicographical_compare_three_way(
    a.begin(), a.end(), b.begin(), b.end());
std::is_eq(cmp_ab); // == true

auto cmp_ac = std::lexicographical_compare_three_way(
    a.begin(), a.end(), c.begin(), c.end());
std::is_lt(cmp_ac); // == true
```

参见：[三路比较](#三路比较)、[三路比较辅助函数](#三路比较辅助函数)。

### std::jthread

执行线程（如 `std::thread`），在销毁时连接并可被发信号停止。

与需要检查线程是否可加入然后连接的 `std::thread` 不同，`std::jthread` 将通过其析构函数自动尝试 `join`。

与 `std::thread` 不同，你可以通过调用 `std::jthread::request_stop` 或通过线程的 `stop_source` 要求它停止：

```cpp
std::jthread t{
    [](std::stop_token stoken) {
        while (!stoken.stop_requested()) {
            std::this_thread::sleep_for(1s);
        }
    }
};

// 从线程对象请求停止：
t.request_stop();
// 或，通过停止源：
std::stop_source stopSource = t.get_stop_source();
stopSource.request_stop();
```

`std::stop_token` 可以用于查询线程的停止状态。

### 安全的整数比较

比较整数，包括不同类型的，无需整数转换的危险。

```cpp
-1 > 0U; // == true
std::cmp_greater(-1, 0U); // == false

std::cmp_equal(0U, 0); // == true
std::cmp_less_equal(-1, 1U); // == true

std::in_range<unsigned>(-1); // == false
std::in_range<char>(999999); // == false
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
