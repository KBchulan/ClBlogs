---
title: 05 cpp11
article: true
order: 5
star: false

category:
  - 语言

tag:
  - cpp

date: 2026-04-01

description: C++ 11相关特性介绍，方便快速复习
footer: Always coding, always learning
---

# cpp11

## C++11 语言特性

### 移动语义

移动一个对象意味着将其管理的某个资源的所有权转移到另一个对象。

移动语义的第一个好处是性能优化。当一个对象即将到达其生命周期的结束时，无论是因为它是一个临时对象还是通过显式调用 `std::move`，移动通常是传输资源的一种更便宜的方式。例如，移动一个 `std::vector` 只是将一些指针和内部状态复制到新的 vector 中，而复制会涉及复制 vector 中包含的每一个元素，这既昂贵又不必要，如果旧 vector 即将被销毁的话。

移动也使得非可复制的类型（例如 `std::unique_ptr`（[智能指针](#智能指针)））能够在语言级别保证一次只有一个资源实例被管理，同时能够在作用域之间转移一个实例。

参见以下部分：[右值引用](#右值引用)、[移动语义的特殊成员函数](#移动语义的特殊成员函数)、[万能引用](#万能引用)、[std::move](#stdmove)、[std::forward](#stdforward)。

### 右值引用

C++11 引入了一种新的引用，称为 **右值引用**。对于非模板类型参数（例如 `int` 或用户定义的类型）的类型 `T` 的右值引用是使用语法 `T&&` 创建的。右值引用只绑定到右值。

带有左值和右值的类型推导：

```c++
int x = 0; // `x` 是类型 `int` 的左值
int& xl = x; // `xl` 是类型 `int&` 的左值
int&& xr = x; // 编译器错误 -- `x` 是一个左值
int&& xr2 = 0; // `xr2` 是类型 `int&&` 的左值 -- 绑定到右值临时对象 `0`

void f(int& x) {}
void f(int&& x) {}

f(x);  // 调用 f(int&)
f(xl); // 调用 f(int&)
f(3);  // 调用 f(int&&)
f(std::move(x)); // 调用 f(int&&)

f(xr2);           // 调用 f(int&)
f(std::move(xr2)); // 调用 f(int&& x)
```

参见：[std::move](#stdmove)、[std::forward](#stdforward)、[万能引用](#万能引用)。

### 万能引用

万能引用是使用语法 `T&&` 创建的，其中 `T` 是模板类型参数，或使用 `auto&&`：在保持参数值类别的同时传递参数的能力（例如左值保持为左值，临时对象作为右值转发）。

万能引用允许引用根据类型绑定到左值或右值。转发引用遵循 _引用折叠_ 的规则：

* `T& &` 变成 `T&`
* `T& &&` 变成 `T&`
* `T&& &` 变成 `T&`
* `T&& &&` 变成 `T&&`

带有左值和右值的 `auto` 类型推导，左值 -> `int&`，右值 -> `int`，然后再折叠：

```c++
int x = 0; // `x` 是类型 `int` 的左值
auto&& al = x; // `al` 是类型 `int&` 的左值 -- 绑定到左值 `x`
auto&& ar = 0; // `ar` 是类型 `int&&` 的左值 -- 绑定到右值临时对象 `0`
```

带有左值和右值的模板类型参数推导：

```c++
// 自 C++14 或更高版本：
void f(auto&& t) {
  // ...
}

// 自 C++11 或更高版本：
template <typename T>
void f(T&& t) {
  // ...
}

int x = 0;
f(0); // T 是 int，推导为 f(int &&) => f(int&&)
f(x); // T 是 int&，推导为 f(int& &&) => f(int&)

int& y = x;
f(y); // T 是 int&，推导为 f(int& &&) => f(int&)

int&& z = 0; // 注意：`z` 是类型为 `int&&` 的左值。
f(z); // T 是 int&，推导为 f(int& &&) => f(int&)
f(std::move(z)); // T 是 int，推导为 f(int &&) => f(int&&)
```

参见：[std::move](#stdmove)、[std::forward](#stdforward)、[右值引用](#右值引用)。

### 可变参数模板

`...` 语法创建一个 _参数包_ 或展开一个 _参数包_。模板 _参数包_ 是接受零个或多个模板参数（非类型、类型或模板）的模板参数。至少包含一个参数包的模板称为 _可变参数模板_。

```c++
template <typename... T>
struct arity {
  constexpr static int value = sizeof...(T);
};
static_assert(arity<>::value == 0);
static_assert(arity<char, short, int>::value == 3);
```

这个的一个有趣用途是从 _参数包_ 创建一个 _初始化列表_，以便迭代可变参数函数参数。

```c++
template <typename First, typename... Args>
auto sum(const First first, const Args... args) -> decltype(first) {
  const auto values = {first, args...};
  return std::accumulate(values.begin(), values.end(), First{0});
}

sum(1, 2, 3, 4, 5); // 15
sum(1, 2, 3);       // 6
sum(1.5, 2.0, 3.7); // 7.2
```

### 初始化列表

使用"大括号列表"语法创建的轻量级数组状容器。例如，`{ 1, 2, 3 }` 创建整数序列，其类型为 `std::initializer_list<int>`。作为向函数传递对象向量的替代品很有用。

```c++
int sum(const std::initializer_list<int>& list) {
  int total = 0;
  for (auto& e : list) {
    total += e;
  }

  return total;
}

auto list = {1, 2, 3};
sum(list); // == 6
sum({1, 2, 3}); // == 6
sum({}); // == 0
```

### 静态断言

在编译时计算的断言。

```c++
constexpr int x = 0;
constexpr int y = 1;
static_assert(x == y, "x != y");
```

### auto

`auto` 的推导规则与模板参数推导完全一致。它根据初始化表达式的表现形式分为两种情况：

作为 **值语义**，即不带 & 或 * 时，它会抛弃最外层的 cv 属性以及引用属性，除非表达式是一个指针，指向的内容是 const，这个 const 会被保留。

```cpp
const int& x = 10;
auto a = x;         // a 是 int (剥掉 & 和 const)

const int* p = &x;
auto b = p;         // b 是 const int* (剥掉 p 本身的 cv，但保留指向内容的 const)
```

作为 **引用/指针语义**，即带 & 或 * 时，它会保留最外层的 cv 属性以及引用属性。

```cpp
const int x = 10;
auto& r = x;        // r 是 const int& (保留 const)
```

比较常见的例子:

```cpp
// --- 基础推导 (剥壳规则) ---
auto a = 3.14;                // double
const auto h = 1;             // const int (手动加 const，强行锁定)
const int& x = 10;
auto a2 = x;                  // int (剥掉 & 和 const)

// --- 引用推导 (保留规则) ---
int b = 1;
auto& c = b;                  // int&
const int x2 = 5;
auto& r = x2;                 // const int& (必须保留 const 保证安全)

// --- 边界情况 ---
auto d = { 0 };               // std::initializer_list<int> C++11 特性
auto g = new auto(123);       // int* 推导 new 后的类型

// --- 报错项 (明确限制) ---
// auto o;                    // ERROR: 必须初始化才能推导
// auto i = 1, j = 2.0;       // ERROR: 同一行声明必须推导到同一类型
```

对于可读性特别有用，特别是对于复杂的类型：

```c++
std::vector<int> v = ...;
std::vector<int>::const_iterator cit = v.cbegin();
// 对比：
auto cit = v.cbegin();
```

函数也可以使用 `auto` 推导返回类型。在 C++11 中，返回类型必须显式指定，或使用 `decltype` 如下所示：

```c++
template <typename X, typename Y>
auto add(X x, Y y) -> decltype(x + y) {
  return x + y;
}
add(1, 2); // == 3
add(1, 2.0); // == 3.0
add(1.5, 1.5); // == 3.0
```

上面示例中的尾随返回类型是表达式 `x + y` 的 _公共类型_（参见 [decltype](#decltype) 部分）。例如，如果 `x` 是整数，`y` 是 double，则 `decltype(x + y)` 是 double。因此，上面的函数将根据表达式 `x + y` 产生的类型推导类型。注意尾随返回类型有权访问其参数，以及在适当时 `this`。

### lambda 表达式

`lambda` 是一个能够捕获作用域中变量的匿名函数对象。它具有：_捕获列表_；参数的可选集合和可选的尾随返回类型；以及一个函数体。捕获列表的示例：

* `[]` - 不捕获任何东西。
* `[=]` - 按值捕获作用域中的本地对象（局部变量、参数）。
* `[&]` - 按引用捕获作用域中的本地对象（局部变量、参数）。
* `[this]` - 按引用捕获 `this`。
* `[a, &b]` - 按值捕获对象 `a`，按引用捕获 `b`。

```c++
int x = 1;

auto getX = [=] { return x; };
getX(); // == 1

auto addX = [=](int y) { return x + y; };
addX(1); // == 2

auto getXRef = [&]() -> int& { return x; };
getXRef(); // int& 到 `x`
```

默认情况下，值捕获不能在 lambda 内部修改，因为编译器生成的方法被标记为 `const`。`mutable` 关键字允许修改捕获的变量。关键字放在参数列表之后（即使参数列表为空也必须存在）。

```c++
int x = 1;

auto f1 = [&x] { x = 2; }; // 正确：x 是引用并修改原始值

auto f2 = [x] { x = 2; }; // 错误：lambda 只能对捕获的值执行 const 操作
// 对比：
auto f3 = [x]() mutable { x = 2; }; // 正确：lambda 可以对捕获的值执行任何操作
```

### decltype

`decltype` 是一个操作符，它返回传递给它的表达式的 _声明的类型_。如果 cv 限定符和引用是表达式的一部分，则保持。`decltype` 的示例：

```c++
int a = 1; // `a` 声明为类型 `int`
decltype(a) b = a; // `decltype(a)` 是 `int`
const int& c = a; // `c` 声明为类型 `const int&`
decltype(c) d = a; // `decltype(c)` 是 `const int&`
decltype(123) e = 123; // `decltype(123)` 是 `int`
int&& f = 1; // `f` 声明为类型 `int&&`
decltype(f) g = 1; // `decltype(f) 是 `int&&`
decltype((a)) h = g; // `decltype((a))` 是 int&
```

### 类型别名

语义上类似于使用 `typedef`，但是带有 `using` 的类型别名更容易阅读并且与模板兼容。

```c++
template <typename T>
using Vec = std::vector<T>;
Vec<int> v; // std::vector<int>

using String = std::string;
String s {"foo"};
```

### nullptr

C++11 引入了一个新的空指针类型，旨在替代 C 的 `NULL` 宏。`nullptr` 本身的类型为 `std::nullptr_t`，可以隐式转换为指针类型，与 `NULL` 不同，不可转换为整数类型，除了 `bool`。

```c++
void foo(int);
void foo(char*);
foo(NULL); // 错误 -- 模糊不清
foo(nullptr); // 调用 foo(char*)
```

### 强类型枚举

类型安全的枚举，解决了 C 风格枚举的各种问题，包括：隐式转换、无法指定底层类型、作用域污染。

```c++
// 指定底层类型为 `unsigned int`
enum class Color : unsigned int { Red = 0xff0000, Green = 0xff00, Blue = 0xff };
// `Alert` 中的 `Red`/`Green` 不与 `Color` 中的冲突
enum class Alert : bool { Red, Green };
Color c = Color::Red;
```

### 属性

属性在 `__attribute__(...)`、`__declspec` 等上提供通用语法。

```c++
// `noreturn` 属性表示 `f` 不返回。
[[ noreturn ]] void f() {
  throw "error";
}
```

### constexpr

常量表达式是可能由编译器在编译时计算的表达式。只有非复杂的计算才能在常量表达式中进行（这些规则在后续版本中逐步放松）。使用 `constexpr` 说明符指示变量、函数等是常量表达式。

```c++
constexpr int square(int x) {
  return x * x;
}

int square2(int x) {
  return x * x;
}

int a = square(2);  // mov DWORD PTR [rbp-4], 4

int b = square2(2); // mov edi, 2
                     // call square2(int)
                     // mov DWORD PTR [rbp-8], eax
```

在前面的代码片段中，注意当调用 `square` 时计算是在编译时进行的，然后结果被嵌入代码生成中，而 `square2` 在运行时被调用。

总结一下 `constexpr` 的一些行为：

- 修饰变量时，要求变量必须具有常量初始化器，并且在编译时必须能够计算出值。
- 修饰函数时，如果传入参数为编译期常量，则可以在编译时计算函数的返回值，否则退化为普通函数。

### 委托构造函数

构造函数现在可以使用初始化列表调用同一类中的其他构造函数。

```c++
struct Foo {
  int foo;
  Foo(int foo) : foo{foo} {}
  Foo() : Foo(0) {}
};

Foo foo;
foo.foo; // == 0
```

### 用户定义的字面量

用户定义的字面量允许你扩展语言并添加你自己的语法。要创建字面量，定义一个返回类型 `T` 的 `T operator "" X(...) { ... }` 函数，名称为 `X`。注意这个函数的名称定义字面量的名称。关于用户定义的字面量函数应该接受什么参数，有一些规则，取决于字面量被调用的类型:

- 整数字面量需要 `unsigned long long` 参数。
- 浮点字面量需要 `long double` 参数。
- 字符字面量需要 `char` 参数。
- 字符串字面量需要 `const char*` 和 `std::size_t` 参数。

> 注意：该语法已不建议使用，新版本不需要在 "" 和 X 之间添加空格。

将摄氏度转换为华氏度：

```c++
// 整数字面量需要 `unsigned long long` 参数。
long long operator "" _celsius(unsigned long long tempCelsius) {
  return std::llround(tempCelsius * 1.8 + 32);
}
24_celsius; // == 75
```

字符串到整数转换：

```c++
// `const char*` 和 `std::size_t` 作为参数是必需的。
int operator "" _int(const char* str, std::size_t) {
  return std::stoi(str);
}

"123"_int; // == 123，类型为 `int`
```

### 显式虚函数覆盖

指定虚函数覆盖另一个虚函数。如果虚函数不覆盖父类的虚函数，抛出编译器错误。

```c++
struct A {
  virtual void foo();
  void bar();
};

struct B : A {
  void foo() override; // 正确 -- B::foo 覆盖 A::foo
  void bar() override; // 错误 -- A::bar 不是虚函数
  void baz() override; // 错误 -- B::baz 不覆盖 A::baz
};
```

### final 说明符

指定虚函数不能在派生类中被覆盖，或者类不能被继承。

```c++
struct A {
  virtual void foo();
};

struct B : A {
  virtual void foo() final;
};

struct C : B {
  virtual void foo(); // 错误 -- 'foo' 的声明覆盖了 'final' 函数
};
```

类不能被继承。

```c++
struct A final {};
struct B : A {}; // 错误 -- 基类 'A' 被标记为 'final'
```

### 默认函数

提供函数（例如构造函数）默认实现的更优雅、更高效的方式。

```c++
struct A {
  A() = default;
  A(int x) : x{x} {}
  int x {1};
};
A a; // a.x == 1
A a2 {123}; // a.x == 123
```

带有继承：

```c++
struct B {
  B() : x{1} {}
  int x;
};

struct C : B {
  // 调用 B::B
  C() = default;
};

C c; // c.x == 1
```

### 删除函数

以更优雅、更高效的方式提供函数的删除实现。对于防止对象上的复制很有用。

```c++
class A {
  int x;

public:
  A(int x) : x{x} {};
  A(const A&) = delete;
  A& operator=(const A&) = delete;
};

A x {123};
A y = x; // 错误 -- 对已删除的复制构造函数的调用
y = x; // 错误 -- operator= 已删除
```

### 基于范围的 for 循环

用于迭代容器元素的语法糖。

```c++
std::array<int, 5> a {1, 2, 3, 4, 5};
for (int& x : a) x *= 2;
// a == { 2, 4, 6, 8, 10 }
```

注意使用 `int` 与 `int&` 时的区别：

```c++
std::array<int, 5> a {1, 2, 3, 4, 5};
for (int x : a) x *= 2;
// a == { 1, 2, 3, 4, 5 }
```

### 移动语义的特殊成员函数

复制构造函数和复制赋值操作符在进行复制时被调用，随着 C++11 引入移动语义，现在有移动构造函数和移动赋值操作符用于移动。

```c++
struct A {
  std::string s;
  A() : s{"test"} {}
  A(const A& o) : s{o.s} {}
  A(A&& o) : s{std::move(o.s)} {}
  A& operator=(A&& o) {
   s = std::move(o.s);
   return *this;
  }
};

A f(A a) {
  return a;
}

A a1 = f(A{}); // 从右值临时对象移动构造
A a2 = std::move(a1); // 使用 std::move 移动构造
A a3 = A{};
a2 = std::move(a3); // 使用 std::move 进行移动赋值
a1 = f(A{}); // 从右值临时对象进行移动赋值
```

### 转换构造函数

转换构造函数会将大括号列表语法的值转换为构造函数参数。

```c++
struct A {
  A(int) {}
  A(int, int) {}
  A(int, int, int) {}
};

A a {0, 0}; // 调用 A::A(int, int)
A b(0, 0); // 调用 A::A(int, int)
A c = {0, 0}; // 调用 A::A(int, int)
A d {0, 0, 0}; // 调用 A::A(int, int, int)
```

注意大括号列表语法不允许缩小转换：

```c++
struct A {
  A(int) {}
};

A a(1.1); // 正确
A b {1.1}; // 错误缩小转换从 double 到 int
```

注意如果构造函数接受 `std::initializer_list`，它将被调用：

```c++
struct A {
  A(int) {}
  A(int, int) {}
  A(int, int, int) {}
  A(std::initializer_list<int>) {}
};

A a {0, 0}; // 调用 A::A(std::initializer_list<int>)
A b(0, 0); // 调用 A::A(int, int)
A c = {0, 0}; // 调用 A::A(std::initializer_list<int>)
A d {0, 0, 0}; // 调用 A::A(std::initializer_list<int>)
```

### 显式转换函数

转换函数现在可以使用 `explicit` 说明符显式化，这意味着它们只能通过显式转换调用，而不能通过隐式转换调用，除非在一些特定上下文中（例如 `if` 语句条件）允许隐式转换。

```c++
struct A {
  operator bool() const { return true; }
};

struct B {
  explicit operator bool() const { return true; }
};

A a;
if (a); // 正确调用 A::operator bool()
bool ba = a; // 正确复制初始化选择 A::operator bool()

B b;
if (b); // 正确调用 B::operator bool()
bool bb = b; // 错误复制初始化不考虑 B::operator bool()
```

### 内联命名空间

内联命名空间的所有成员被视为其父命名空间的一部分，允许函数专门化并简化版本控制过程。这是一个传递属性，如果 A 包含 B，B 包含 C，并且 B 和 C 都是内联命名空间，则 C 的成员可以像它们在 A 上一样使用。

```c++
namespace Program {
  namespace Version1 {
    int getVersion() { return 1; }
    bool isFirstVersion() { return true; }
  }
  inline namespace Version2 {
    int getVersion() { return 2; }
  }
}

int version {Program::getVersion()};              // 使用 Version2 中的 getVersion()
int oldVersion {Program::Version1::getVersion()}; // 使用 Version1 中的 getVersion()
bool firstVersion {Program::isFirstVersion()};    // 添加 Version2 时不编译
```

### 非静态数据成员初始化器

允许非静态数据成员在声明的地方初始化，可能会清理默认初始化的构造函数。

```c++
// C++11 之前的默认初始化
class Human {
    Human() : age{0} {}
  private:
    unsigned age;
};
// C++11 的默认初始化
class Human {
  private:
    unsigned age {0};
};
```

### 右尖括号

C++11 现在能够推断出一系列右尖括号何时用作操作符或作为 typedef 的关闭语句，无需添加空格。

```c++
typedef std::map<int, std::map <int, std::map <int, int> > > cpp98LongTypedef;
typedef std::map<int, std::map <int, std::map <int, int>>>   cpp11LongTypedef;
```

### 引用限定的成员函数

成员函数现在可以根据 `*this` 是左值还是右值引用进行限定。

```c++
struct Bar {
  // ...
};

struct Foo {
  Bar& getBar() & { return bar; }
  const Bar& getBar() const& { return bar; }
  Bar&& getBar() && { return std::move(bar); }
  const Bar&& getBar() const&& { return std::move(bar); }
private:
  Bar bar;
};

Foo foo{};
Bar bar = foo.getBar(); // 调用 `Bar& getBar() &`

const Foo foo2{};
Bar bar2 = foo2.getBar(); // 调用 `const Bar& Foo::getBar() const&`

Foo{}.getBar(); // 调用 `Bar&& Foo::getBar() &&`
std::move(foo).getBar(); // 调用 `Bar&& Foo::getBar() &&`
std::move(foo2).getBar(); // 调用 `const Bar&& Foo::getBar() const&`
```

### 尾随返回类型

C++11 允许函数和 lambda 使用替代语法来指定其返回类型。

```c++
int f() {
  return 123;
}
// 对比：
auto f() -> int {
  return 123;
}
```

```c++
auto g = []() -> int {
  return 123;
};
```

这个特性在某些返回类型无法解决时特别有用：

```c++
// 注意：这不会编译！
template <typename T, typename U>
decltype(a + b) add(T a, U b) {
    return a + b;
}

// 尾随返回类型允许这样做：
template <typename T, typename U>
auto add(T a, U b) -> decltype(a + b) {
    return a + b;
}
```

### Noexcept 说明符

`noexcept` 说明符指定函数是否可能抛出异常。这是 `throw()` 的改进版本。

```c++
void func1() noexcept;        // 不抛出
void func2() noexcept(true);  // 不抛出
void func3() throw();         // 不抛出

void func4() noexcept(false); // 可能抛出
```

不抛出异常的函数允许调用可能抛出异常的函数。每当抛出异常并且异常处理程序搜索遇到不抛出异常的函数的最外层块时，函数 std::terminate 被调用。

```c++
extern void f();  // 可能抛出异常
void g() noexcept {
    f();          // 有效，即使 f 抛出
    throw 42;     // 有效，有效地调用 std::terminate
}
```

### char32_t 和 char16_t

提供标准类型用于表示 UTF-8 字符串。

```c++
char32_t utf8_str[] = U"\u0123";
char16_t utf8_str[] = u"\u0123";
```

### 原始字符串字面量

C++11 引入了一种新的方式来声明字符串字面量为"原始字符串字面量"。来自转义序列（制表符、换行符、单个反斜杠等）的字符可以原始输入，同时保留格式。这对于编写可能包含大量引号或特殊格式的文学文本很有用。这可以使你的字符串字面量更容易阅读和维护。

原始字符串字面量使用以下语法声明：

```
R"delimiter(raw_characters)delimiter"
```

其中：

* `delimiter` 是由除括号、反斜杠和空格之外的任何源字符组成的可选字符序列。
* `raw_characters` 是任何原始字符序列；不能包含关闭序列 `")delimiter"`。

示例：

```cpp
// msg1 和 msg2 是等价的。
const char* msg1 = "\nHello,\n\tworld!\n";
const char* msg2 = R"(
Hello,
	world!
)";
```

## C++11 库特性

### std::move

`std::move` 表示传递给它的对象可能会转移其资源。应该小心使用已从中移动的对象，因为它们可能会处于未指定的状态（参见：[我可以用已移动的对象做什么？](http://stackoverflow.com/questions/7027523/what-can-i-do-with-a-moved-from-object)）。

`std::move` 的定义（执行移动不过是转换为右值引用）：

```c++
template <typename T>
typename remove_reference<T>::type&& move(T&& arg) {
  return static_cast<typename remove_reference<T>::type&&>(arg);
}
```

转移 `std::unique_ptr`：

```c++
std::unique_ptr<int> p1 {new int{0}};  // 实际上，使用 std::make_unique
std::unique_ptr<int> p2 = p1; // 错误 -- 不能复制 unique pointers
std::unique_ptr<int> p3 = std::move(p1); // 将 `p1` 移动到 `p3`
                                          // 现在无法安全地取消引用由 `p1` 持有的对象
```

### std::forward

返回传递给它的参数，同时保持其值类别和 cv 限定符。对于通用代码和工厂很有用。与 [万能引用](#万能引用) 结合使用。

`std::forward` 的定义：

```c++
template <typename T>
T&& forward(typename remove_reference<T>::type& arg) {
  return static_cast<T&&>(arg);
}
```

一个函数 `wrapper` 的示例，它只是将其他 `A` 对象转发到新的 `A` 对象的复制或移动构造函数：

```c++
struct A {
  A() = default;
  A(const A& o) { std::cout << "copied" << std::endl; }
  A(A&& o) { std::cout << "moved" << std::endl; }
};

template <typename T>
A wrapper(T&& arg) {
  return A{std::forward<T>(arg)};
}

wrapper(A{}); // moved
A a;
wrapper(a); // copied
wrapper(std::move(a)); // moved
```

参见：[万能引用](#万能引用)、[右值引用](#右值引用)。

### std::thread

`std::thread` 库提供了一种标准的方式来控制线程，例如生成和杀死它们。在下面的示例中，多个线程被生成以执行不同的计算，然后程序等待所有线程完成。

```c++
void foo(bool clause) { /* 做一些事... */ }

std::vector<std::thread> threadsVector;
threadsVector.emplace_back([]() {
  // 将被调用的 Lambda 函数
});
threadsVector.emplace_back(foo, true);  // 线程将运行 foo(true)
for (auto& thread : threadsVector) {
  thread.join(); // 等待线程完成
}
```

### std::to_string

将数值参数转换为 `std::string`。

```c++
std::to_string(1.2); // == "1.2"
std::to_string(123); // == "123"
```

### 类型特征

C++11 在 `<type_traits>` 头文件中引入了**类型特征**（也称类型萃取），为模板元编程提供了一套在**编译期**查询和转换类型的标准工具。

这些类型特征本质上是一系列模板类，主要提供两种成员：
- `::value`：`bool` 类型的编译期常量，用于判断类型的某种属性。
- `::type`：转换后的新类型（仅部分特征提供）。

主要作用在于：

- 在编译期判断一个类型是否满足某种条件（整数？指针？const？）。
- 对类型进行简单转换（去掉 const、添加指针等）。
- 支持更安全的泛型代码编写，常与 `static_assert`、`std::enable_if` 等配合使用。

下面是一些常用的类型特征分类：

**1. 基础类型类别（Primary type categories）**

- `std::is_void<T>`
- `std::is_null_pointer<T>`
- `std::is_integral<T>`（整数类型）
- `std::is_floating_point<T>`（浮点类型）
- `std::is_array<T>`
- `std::is_pointer<T>`
- `std::is_reference<T>`（左值/右值引用）
- `std::is_class<T>`、`std::is_enum<T>`、`std::is_union<T>`、`std::is_function<T>`

**2. 复合类型类别（Composite type categories）**
- `std::is_arithmetic<T>`（算术类型：整数或浮点）
- `std::is_fundamental<T>`（基础类型）
- `std::is_scalar<T>`、`std::is_object<T>`、`std::is_compound<T>` 等

**3. 类型属性查询（Type properties）**
- `std::is_const<T>`、`std::is_volatile<T>`
- `std::is_trivial<T>`、`std::is_standard_layout<T>`
- `std::is_empty<T>`、`std::is_polymorphic<T>`、`std::is_abstract<T>`

**4. 类型关系（Type relationships）**
- `std::is_same<T, U>`（两个类型是否相同）
- `std::is_base_of<Base, Derived>`（是否继承关系）
- `std::is_convertible<From, To>`

**5. 类型转换（Type transformations）**
- `std::remove_const<T>::type`、`std::add_const<T>::type`
- `std::remove_reference<T>::type`、`std::add_lvalue_reference<T>::type`
- `std::remove_pointer<T>::type`、`std::add_pointer<T>::type`
- `std::conditional<B, T, F>::type`（编译期条件选择类型）
- `std::enable_if<B, T>::type`（条件启用）

**6. 其他常用**
- `std::integral_constant<T, v>`（辅助类，常作为基类）
- `std::true_type` / `std::false_type`

```cpp
static_assert(std::is_integral<int>::value);
static_assert(std::is_same<int, int>::value);
static_assert(std::is_same<std::conditional<true, int, double>::type, int>::value);
```

C++11 的类型特征为模板编程提供了标准、统一的编译期类型操作接口，是后续 C++14/17/20 中更多元编程特性的基础。
（注意：C++14 之后增加了 _v 和 _t 后缀的便捷别名，如 `std::is_integral_v<T>`，写法更简洁。）

### 智能指针

C++11 引入了新的智能指针：`std::unique_ptr`、`std::shared_ptr`、`std::weak_ptr`。`std::auto_ptr` 现在被弃用，然后最终在 C++17 中被删除。

`std::unique_ptr` 是一个不可复制、可移动的指针，管理自己的堆分配内存。**注意：更倾向于使用 `std::make_X` 辅助函数，而不是使用构造函数。参见 [std::make_unique](https://github.com/AnthonyCalandra/modern-cpp-features/blob/master/CPP14.md#stdmake_unique) 和 [std::make_shared](#stdmake_shared) 的部分。**

```c++
std::unique_ptr<Foo> p1 { new Foo{} };  // `p1` 拥有 `Foo`
if (p1) {
  p1->bar();
}

{
  std::unique_ptr<Foo> p2 {std::move(p1)};  // 现在 `p2` 拥有 `Foo`
  f(*p2);

  p1 = std::move(p2);  // 所有权返回到 `p1` -- `p2` 被销毁
}

if (p1) {
  p1->bar();
}
// 当 `p1` 超出范围时 `Foo` 实例被销毁
```

`std::shared_ptr` 是一个智能指针，管理跨多个所有者共享的资源。共享指针持有一个 _control block_，它有几个组件，例如管理的对象和引用计数器。所有 control block 访问都是线程安全的，但是，操纵管理的对象本身 *不* 是线程安全的。

```c++
void foo(std::shared_ptr<T> t) {
  // 使用 `t` 做一些事...
}

void bar(std::shared_ptr<T> t) {
  // 使用 `t` 做一些事...
}

void baz(std::shared_ptr<T> t) {
  // 使用 `t` 做一些事...
}

std::shared_ptr<T> p1 {new T{}};
// 也许这些发生在其他线程中？
foo(p1);
bar(p1);
baz(p1);
```

### std::chrono

chrono 库包含一组处理 _durations_、_clocks_ 和 _time points_ 的实用函数和类型。这个库的一个用途是对代码进行基准测试：

```c++
std::chrono::time_point<std::chrono::steady_clock> start, end;
start = std::chrono::steady_clock::now();
// 一些计算...
end = std::chrono::steady_clock::now();

std::chrono::duration<double> elapsed_seconds = end - start;
double t = elapsed_seconds.count(); // t 秒数，表示为 `double`
```

### 元组

元组是异构值的固定大小集合。通过使用 [std::tie](#stdtie) 解包或使用 `std::get` 来访问 `std::tuple` 的元素。

```c++
// `playerProfile` 的类型为 `std::tuple<int, const char*, const char*>`。
auto playerProfile = std::make_tuple(51, "Frans Nielsen", "NYI");
std::get<0>(playerProfile); // 51
std::get<1>(playerProfile); // "Frans Nielsen"
std::get<2>(playerProfile); // "NYI"
```

### std::tie

创建左值引用的元组。对于解包 `std::pair` 和 `std::tuple` 对象很有用。使用 `std::ignore` 作为忽略值的占位符。在 C++17 中，应该使用结构化绑定。

```c++
// 使用元组...
std::string playerName;
std::tie(std::ignore, playerName, std::ignore) = std::make_tuple(91, "John Tavares", "NYI");

// 使用对...
std::string yes, no;
std::tie(yes, no) = std::make_pair("yes", "no");
```

### std::array

`std::array` 是建立在 C 风格数组之上的容器。支持常见的容器操作，例如排序。

```c++
std::array<int, 3> a = {2, 1, 3};
std::sort(a.begin(), a.end()); // a == { 1, 2, 3 }
for (int& x : a) x *= 2; // a == { 2, 4, 6 }
```

### 无序容器

这些容器为搜索、插入和删除操作保持平均常数时间复杂度。为了实现常数时间复杂度，通过将元素哈希到桶中来牺牲顺序以获得速度。有四个无序容器：

* `unordered_set`
* `unordered_multiset`
* `unordered_map`
* `unordered_multimap`

### std::make_shared

`std::make_shared` 是创建 `std::shared_ptr` 实例的推荐方式，原因如下：

* 它只进行一次内存分配，而不是两次（一次用于对象，另一次用于 control block）。
* 避免必须使用 `new` 操作符。
* 在指定指针应持有的底层类型时防止代码重复。
* 它提供异常安全。假设我们调用函数 `foo` 如下所示：

```c++
foo(std::shared_ptr<T>{new T{}}, function_that_throws(), std::shared_ptr<T>{new T{}});
```

编译器自由调用 `new T{}`，然后 `function_that_throws()`，依此类推... 由于我们在 `T` 的第一个构造中在堆上分配了数据，我们在这里引入了泄漏。使用 `std::make_shared`，我们获得了异常安全：

```c++
foo(std::make_shared<T>(), function_that_throws(), std::make_shared<T>());
```

* 防止必须进行两次分配。当调用 `std::shared_ptr{ new T{} }` 时，我们必须为 `T` 分配内存，然后在共享指针中必须为 control block 内的内存分配。

参见 [智能指针](#智能指针) 部分获取关于 `std::unique_ptr` 和 `std::shared_ptr` 的更多信息。

### std::ref

`std::ref(val)` 用于创建类型 `std::reference_wrapper` 的对象，该对象持有 val 的引用。在通常使用 `&` 的引用传递无法编译或由于类型推导 `&` 被删除的情况下使用。`std::cref` 类似但创建的引用包装器持有 val 的 const 引用。

```c++
// 创建容器以存储对象的引用。
auto val = 99;
auto _ref = std::ref(val);
_ref++;
auto _cref = std::cref(val);
//_cref++; 不编译
std::vector<std::reference_wrapper<int>>vec; // vector<int&>vec 不编译
vec.push_back(_ref); // vec.push_back(&i) 不编译
cout << val << endl; // 打印 100
cout << vec[0] << endl; // 打印 100
cout << _cref; // 打印 100
```

### 内存模型

C++11 为 C++ 引入了内存模型，这意味着对线程和原子操作的库支持。其中一些操作包括（但不限于）原子加载/存储、比较交换、原子标志、promise、future、锁和条件变量。

参见部分：[std::thread](#stdthread)

### std::async

`std::async` 异步或延迟计算地运行给定的函数，然后返回一个 `std::future`，它持有该函数调用的结果。

第一个参数是策略，可以是：

1. `std::launch::async | std::launch::deferred` 由实现决定是执行异步执行还是延迟计算。
1. `std::launch::async` 在新线程上运行可调用对象。
1. `std::launch::deferred` 在当前线程上执行延迟计算。

```c++
int foo() {
  /* 做一些事，然后返回结果。 */
  return 1000;
}

auto handle = std::async(std::launch::async, foo);  // 创建异步任务
auto result = handle.get();  // 等待结果
```

### std::begin/end

`std::begin` 和 `std::end` 自由函数被添加以通用地返回容器的开始和结束迭代器。这些函数也适用于不具有 `begin` 和 `end` 成员函数的原始数组。

```c++
template <typename T>
int CountTwos(const T& container) {
  return std::count_if(std::begin(container), std::end(container), [](int item) {
    return item == 2;
  });
}

std::vector<int> vec = {2, 2, 43, 435, 4543, 534};
int arr[8] = {2, 43, 45, 435, 32, 32, 32, 32};
auto a = CountTwos(vec); // 2
auto b = CountTwos(arr);  // 1
```

## 致谢

* [cppreference](http://en.cppreference.com/w/cpp) - 特别适合查找新库特性的示例和文档。
* [C++ Rvalue References Explained](http://web.archive.org/web/20240324121501/http://thbecker.net/articles/rvalue_references/section_01.html) - 我用来理解右值引用、完美转发和移动语义的很好的介绍。
* [clang](http://clang.llvm.org/cxx_status.html) 和 [gcc](https://gcc.gnu.org/projects/cxx-status.html) 的标准支持页面。这里也包括语言/库特性的提案，我用来帮助找到描述、它的意思是修复什么，以及一些示例。
* [Compiler explorer](https://godbolt.org/)
* [Scott Meyers' Effective Modern C++](https://www.amazon.com/Effective-Modern-Specific-Ways-Improve/dp/1491903996) - 高度推荐的书！
* [Jason Turner's C++ Weekly](https://www.youtube.com/channel/UCxHAlbZQNFU2LgEtiqd2Maw) - C++ 相关视频的好集合。
* [我可以用已移动的对象做什么？](http://stackoverflow.com/questions/7027523/what-can-i-do-with-a-moved-from-object)
* [decltype(auto) 有什么用途？](http://stackoverflow.com/questions/24109737/what-are-some-uses-of-decltypeauto)
