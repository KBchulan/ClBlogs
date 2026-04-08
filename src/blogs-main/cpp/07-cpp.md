---
title: 07 cpp17
article: true
order: 7
star: false

category:
  - 语言

tag:
  - cpp

date: 2026-04-01

description: C++ 17相关特性介绍，方便快速复习
footer: Always coding, always learning
---

# cpp17

### 类模板的模板参数推导

自动模板参数推导就像为函数完成的一样，现在包括类构造函数。

```c++
template <typename T = float>
struct MyContainer {
  T val;
  MyContainer() : val{} {}
  MyContainer(T val) : val{val} {}
  // ...
};
MyContainer c1 {1}; // OK MyContainer<int>
MyContainer c2; // OK MyContainer<float>
```

### 用auto声明非类型模板参数

遵循 `auto` 的推导规则，同时尊重非类型模板参数列表的允许类型[\*]，模板参数可以从其参数的类型推导：

```c++
template <auto... seq>
struct my_integer_sequence {
  // 这里是实现 ...
};

// 显式传递类型 `int` 作为模板参数。
auto seq = std::integer_sequence<int, 0, 1, 2>();
// 类型推导为 `int`。
auto seq2 = my_integer_sequence<0, 1, 2>();
```

\* - 例如，你不能使用 `double` 作为模板参数类型，这也使用 `auto` 推导也无效。

### 折叠表达式

折叠表达式对二进制操作符上的模板参数包执行折叠。

* `(... op e)` 或 `(e op ...)` 形式的表达式，其中 `op` 是折叠操作符，`e` 是未展开的参数包，称为*一元折叠*。
* `(e1 op ... op e2)` 形式的表达式，其中 `op` 是折叠操作符，称为*二元折叠*。`e1` 或 `e2` 是未展开的参数包，但不是两者都是。

```c++
template <typename... Args>
bool logicalAnd(Args... args) {
    // 二元折叠。
    return (true && ... && args);
}
bool b = true;
bool& b2 = b;
logicalAnd(b, b2, true); // == true
```

```c++
template <typename... Args>
auto sum(Args... args) {
    // 一元折叠。
    return (... + args);
}
sum(1.0, 2.0f, 3); // == 6.0
```

### auto从大括号初始化列表推导的新规则

使用统一初始化语法时，`auto` 推导的变化。之前，`auto x {3};` 推导为 `std::initializer_list<int>`，现在推导为 `int`。

```c++
auto x1 {1, 2, 3}; // 错误：不是单个元素
auto x2 = {1, 2, 3}; // x2 是 std::initializer_list<int>
auto x3 {3}; // x3 是 int
auto x4 {3.0}; // x4 是 double
```

### constexpr lambda

使用 `constexpr` 的编译期lambda。

```c++
auto identity = [](int n) constexpr { return n; };
static_assert(identity(123) == 123);
```

```c++
constexpr auto add = [](int x, int y) {
  auto L = [=] { return x; };
  auto R = [=] { return y; };
  return [=] { return L() + R(); };
};

static_assert(add(1, 2)() == 3);
```

```c++
constexpr int addOne(int n) {
  return [n] { return n + 1; }();
}

static_assert(addOne(1) == 2);
```

### Lambda按值捕获this

在lambda的环境中捕获 `this` 之前只能按引用。一个有问题的例子是使用需要对象可用的回调的异步代码，可能超过其生命周期。`*this` (C++17) 现在会制作当前对象的副本，而 `this` (C++11) 继续按引用捕获。

```c++
struct MyObj {
  int value {123};
  auto getValueCopy() {
    return [*this] { return value; };
  }
  auto getValueRef() {
    return [this] { return value; };
  }
};
MyObj mo;
auto valueCopy = mo.getValueCopy();
auto valueRef = mo.getValueRef();
mo.value = 321;
valueCopy(); // 123
valueRef(); // 321
```

### 内联变量

内联说明符可以应用于变量以及函数。声明为内联的变量具有与声明为内联的函数相同的语义。

```c++
// 使用编译器浏览器的反汇编示例。
struct S { int x; };
inline S x1 = S{321}; // mov esi, dword ptr [x1]
                      // x1: .long 321

S x2 = S{123};        // mov eax, dword ptr [.L_ZZ4mainE2x2]
                      // mov dword ptr [rbp - 8], eax
                      // .L_ZZ4mainE2x2: .long 123
```

它也可以用于声明和定义静态成员变量，这样就不需要在源文件中初始化。

```c++
struct S {
  S() : id{count++} {}
  ~S() { count--; }
  int id;
  static inline int count{0}; // 在类内声明并初始化 count 为 0
};
```

### 嵌套命名空间

使用命名空间解析操作符来创建嵌套命名空间定义。

```c++
namespace A {
  namespace B {
    namespace C {
      int i;
    }
  }
}
```

上面的代码可以这样写：

```c++
namespace A::B::C {
  int i;
}
```

### 结构化绑定

一个去结构化初始化的提案，允许编写 `auto [ x, y, z ] = expr;`，其中 `expr` 的类型是一个元组样对象，其元素将绑定到变量 `x`、`y` 和 `z`（这个构造声明）。*元组样对象*包括 [`std::tuple`](README.md#元组)、`std::pair`、[`std::array`](README.md#stdarray) 和聚合结构。

```c++
using Coordinate = std::pair<int, int>;
Coordinate origin() {
  return Coordinate{0, 0};
}

const auto [ x, y ] = origin();
x; // == 0
y; // == 0
```

```c++
std::unordered_map<std::string, int> mapping {
  {"a", 1},
  {"b", 2},
  {"c", 3}
};

// 按引用去结构化。
for (const auto& [key, value] : mapping) {
  // 对 key 和 value 执行某些操作
}
```

### 带初始化器的选择语句

`if` 和 `switch` 语句的新版本，简化常见代码模式并帮助用户保持作用域紧凑。

```c++
{
  std::lock_guard<std::mutex> lk(mx);
  if (v.empty()) v.push_back(val);
}
// vs.
if (std::lock_guard<std::mutex> lk(mx); v.empty()) {
  v.push_back(val);
}
```

```c++
Foo gadget(args);
switch (auto s = gadget.status()) {
  case OK: gadget.zip(); break;
  case Bad: throw BadFoo(s.message());
}
// vs.
switch (Foo gadget(args); auto s = gadget.status()) {
  case OK: gadget.zip(); break;
  case Bad: throw BadFoo(s.message());
}
```

### constexpr if

根据编译期条件编写实例化的代码。

```c++
template <typename T>
constexpr bool isIntegral() {
  if constexpr (std::is_integral<T>::value) {
    return true;
  } else {
    return false;
  }
}
static_assert(isIntegral<int>() == true);
static_assert(isIntegral<char>() == true);
static_assert(isIntegral<double>() == false);
struct S {};
static_assert(isIntegral<S>() == false);
```

### UTF-8 字符字面量

以 `u8` 开头的字符字面量是类型为 `char` 的字符字面量。UTF-8 字符字面量的值等于其 ISO 10646 代码点值。

```c++
char x = u8'x';
```

### 枚举的直接列表初始化

枚举现在可以使用大括号语法初始化。

```c++
enum byte : unsigned char {};
byte b {0}; // OK
byte c {-1}; // 错误
byte d = byte{1}; // OK
byte e = byte{256}; // 错误
```

### \[\[fallthrough\]\], \[\[nodiscard\]\], \[\[maybe_unused\]\] 属性

C++17 引入三个新属性：`[[fallthrough]]`、`[[nodiscard]]` 和 `[[maybe_unused]]`。

* `[[fallthrough]]` 向编译器表示switch语句中的贯穿是预期行为。这个属性只能在switch语句中使用，并且必须在下一个case/default标签之前放置。

```c++
switch (n) {
  case 1:
    // ...
    [[fallthrough]];
  case 2:
    // ...
    break;
  case 3:
    // ...
    [[fallthrough]];
  default:
    // ...
}
```

* `[[nodiscard]]` 当函数或类有此属性且其返回值被丢弃时发出警告。

```c++
[[nodiscard]] bool do_something() {
  return is_success; // 成功返回 true，失败返回 false
}

do_something(); // 警告：忽略 'bool do_something()' 的返回值，
                // 声明了属性 'nodiscard'
```

```c++
// 仅当 `error_info` 按值返回时才发出警告。
struct [[nodiscard]] error_info {
  // ...
};

error_info do_something() {
  error_info ei;
  // ...
  return ei;
}

do_something(); // 警告：忽略返回值，类型为 'error_info'，
                // 声明了属性 'nodiscard'
```

* `[[maybe_unused]]` 向编译器表示变量或参数可能未使用且是预期的。

```c++
void my_callback(std::string msg, [[maybe_unused]] bool error) {
  // 不在乎 `msg` 是否是错误消息，只是记录它。
  log(msg);
}
```

### \_\_has\_include

`__has_include (operand)` 操作符可以在 `#if` 和 `#elif` 表达式中使用，以检查头文件或源文件（`operand`）是否可用于包含。

这个的一个用例是使用两个以相同方式工作的库，如果系统上未找到首选的库，则使用备用/实验的。

```c++
#ifdef __has_include
#  if __has_include(<optional>)
#    include <optional>
#    define have_optional 1
#  elif __has_include(<experimental/optional>)
#    include <experimental/optional>
#    define have_optional 1
#    define experimental_optional
#  else
#    define have_optional 0
#  endif
#endif
```

它也可以用于包含在不同名称或位置的各种平台上存在的头文件，而不知道程序运行在哪个平台上。OpenGL头文件是一个很好的例子，它们在macOS上位于 `OpenGL\` 目录，在其他平台上位于 `GL\` 目录。

```c++
#ifdef __has_include
#  if __has_include(<OpenGL/gl.h>)
#    include <OpenGL/gl.h>
#    include <OpenGL/glu.h>
#  elif __has_include(<GL/gl.h>)
#    include <GL/gl.h>
#    include <GL/glu.h>
#  else
#    error No suitable OpenGL headers found.
# endif
#endif
```

### 类模板参数推导

*类模板参数推导* (CTAD) 允许编译器从构造函数参数推导模板参数。

```c++
std::vector v{ 1, 2, 3 }; // 推导为 std::vector<int>

std::mutex mtx;
auto lck = std::lock_guard{ mtx }; // 推导为 std::lock_guard<std::mutex>

auto p = new std::pair{ 1.0, 2.0 }; // 推导为 std::pair<double, double>*
```

对于用户定义的类型，*推导指南*可以用来指导编译器如何推导模板参数（如果适用）：

```c++
template <typename T>
struct container {
  container(T t) {}

  template <typename Iter>
  container(Iter beg, Iter end);
};

// 推导指南
template <typename Iter>
container(Iter b, Iter e) -> container<typename std::iterator_traits<Iter>::value_type>;

container a{ 7 }; // OK：推导为 container<int>

std::vector<double> v{ 1.0, 2.0, 3.0 };
auto b = container{ v.begin(), v.end() }; // OK：推导为 container<double>

container c{ 5, 6 }; // 错误：std::iterator_traits<int>::value_type 不是类型
```

## C++17 库特性

### std::variant

类模板 `std::variant` 表示一个类型安全的 `union`。`std::variant` 的实例在任何给定时间都保持其替代类型之一的值（它也可能无值）。

```c++
std::variant<int, double> v{ 12 };
std::get<int>(v); // == 12
std::get<0>(v); // == 12
v = 12.0;
std::get<double>(v); // == 12.0
std::get<1>(v); // == 12.0
```

### std::optional

类模板 `std::optional` 管理可选包含的值，即可能存在或不存在的值。optional的一个常见用例是可能失败的函数的返回值。

```c++
std::optional<std::string> create(bool b) {
  if (b) {
    return "Godzilla";
  } else {
    return {};
  }
}

create(false).value_or("empty"); // == "empty"
create(true).value(); // == "Godzilla"
// optional返回工厂函数可用作while和if的条件
if (auto str = create(true)) {
  // ...
}
```

### std::any

任何类型的单个值的类型安全容器。

```c++
std::any x {5};
x.has_value() // == true
std::any_cast<int>(x) // == 5
std::any_cast<int&>(x) = 10;
std::any_cast<int>(x) // == 10
```

### std::string_view

字符串的非所有权引用。用于在字符串之上提供抽象的有用的（例如用于解析）。

```c++
// 常规字符串。
std::string_view cppstr {"foo"};
// 宽字符串。
std::wstring_view wcstr_v {L"baz"};
// 字符数组。
char array[3] = {'b', 'a', 'r'};
std::string_view array_v(array, std::size(array));
```

```c++
std::string str {"   trim me"};
std::string_view v {str};
v.remove_prefix(std::min(v.find_first_not_of(" "), v.size()));
str; //  == "   trim me"
v; // == "trim me"
```

### std::invoke

使用参数调用 `Callable` 对象。*可调用*对象的示例是 `std::function` 或lambda；可以像调用常规函数一样调用的对象。

```c++
template <typename Callable>
class Proxy {
  Callable c_;

public:
  Proxy(Callable c) : c_{ std::move(c) } {}

  template <typename... Args>
  decltype(auto) operator()(Args&&... args) {
    // ...
    return std::invoke(c_, std::forward<Args>(args)...);
  }
};

const auto add = [](int x, int y) { return x + y; };
Proxy p{ add };
p(1, 2); // == 3
```

### std::apply

使用参数元组调用 `Callable` 对象。

```c++
auto add = [](int x, int y) {
  return x + y;
};
std::apply(add, std::make_tuple(1, 2)); // == 3
```

### std::filesystem

新的 `std::filesystem` 库提供了一个标准方式来在文件系统中操纵文件、目录和路径。

这里，一个大文件如果有可用空间就复制到临时路径：

```c++
const auto bigFilePath {"bigFileToCopy"};
if (std::filesystem::exists(bigFilePath)) {
  const auto bigFileSize {std::filesystem::file_size(bigFilePath)};
  std::filesystem::path tmpPath {"/tmp"};
  if (std::filesystem::space(tmpPath).available > bigFileSize) {
    std::filesystem::create_directory(tmpPath.append("example"));
    std::filesystem::copy_file(bigFilePath, tmpPath.append("newFile"));
  }
}
```

### std::byte

新的 `std::byte` 类型提供了一个表示数据为字节的标准方式。与 `char` 或 `unsigned char` 相比使用 `std::byte` 的好处是它不是字符类型，也不是算术类型；虽然唯一可用的操作符重载是按位操作。

```c++
std::byte a {0};
std::byte b {0xFF};
int i = std::to_integer<int>(b); // 0xFF
std::byte c = a & b;
int j = std::to_integer<int>(c); // 0
```

请注意，`std::byte` 只是一个枚举，枚举的大括号初始化成为可能要感谢[枚举的直接列表初始化](#枚举的直接列表初始化)。

### 映射和集合的拼接

无需昂贵的副本、移动或堆分配/释放开销，移动节点和合并容器。

从一个映射移动元素到另一个：

```c++
std::map<int, string> src {{1, "one"}, {2, "two"}, {3, "buckle my shoe"}};
std::map<int, string> dst {{3, "three"}};
dst.insert(src.extract(src.find(1))); // 便宜的从 `src` 移除和插入 { 1, "one" } 到 `dst`。
dst.insert(src.extract(2)); // 便宜的从 `src` 移除和插入 { 2, "two" } 到 `dst`。
// dst == { { 1, "one" }, { 2, "two" }, { 3, "three" } };
```

插入一个整个集合：

```c++
std::set<int> src {1, 3, 5};
std::set<int> dst {2, 4, 5};
dst.merge(src);
// src == { 5 }
// dst == { 1, 2, 3, 4, 5 }
```

插入超过容器生命周期的元素：

```c++
auto elementFactory() {
  std::set<...> s;
  s.emplace(...);
  return s.extract(s.begin());
}
s2.insert(elementFactory());
```

改变映射元素的键：

```c++
std::map<int, string> m {{1, "one"}, {2, "two"}, {3, "three"}};
auto e = m.extract(2);
e.key() = 4;
m.insert(std::move(e));
// m == { { 1, "one" }, { 3, "three" }, { 4, "two" } }
```

### 并行算法

许多STL算法，如 `copy`、`find` 和 `sort` 方法，开始支持*并行执行策略*：`seq`、`par` 和 `par_unseq`，分别转换为"顺序"、"并行"和"并行未序列化"。

```c++
std::vector<int> longVector;
// 使用并行执行策略查找元素
auto result1 = std::find(std::execution::par, std::begin(longVector), std::end(longVector), 2);
// 使用顺序执行策略排序元素
auto result2 = std::sort(std::execution::seq, std::begin(longVector), std::end(longVector));
```

### std::sample

从给定序列中采样n个元素（无替换），其中每个元素有相等的被选中机会。

```c++
const std::string ALLOWED_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
std::string guid;
// 从 ALLOWED_CHARS 采样 5 个字符。
std::sample(ALLOWED_CHARS.begin(), ALLOWED_CHARS.end(), std::back_inserter(guid),
  5, std::mt19937{ std::random_device{}() });

std::cout << guid; // 例如 G1fW2
```

### std::clamp

在下界和上界之间钳制给定值。

```c++
std::clamp(42, -1, 1); // == 1
std::clamp(-42, -1, 1); // == -1
std::clamp(0, -1, 1); // == 0

// `std::clamp` 也接受自定义比较器：
std::clamp(0, -1, 1, std::less<>{}); // == 0
```

### std::reduce

对给定范围的元素进行折叠。概念上类似于 `std::accumulate`，但 `std::reduce` 将并行执行折叠。由于折叠并行进行，如果指定二进制操作，它必须是关联的和可交换的。给定的二进制操作也不应该改变任何元素或使范围内的任何迭代器无效。

默认二进制操作是std::plus，初始值为0。

```c++
const std::array<int, 3> a{ 1, 2, 3 };
std::reduce(std::cbegin(a), std::cend(a)); // == 6
// 使用自定义二进制操作：
std::reduce(std::cbegin(a), std::cend(a), 1, std::multiplies<>{}); // == 6
```

另外，你可以为reducer指定转换：

```c++
std::transform_reduce(std::cbegin(a), std::cend(a), 0, std::plus<>{}, times_ten); // == 60

const std::array<int, 3> b{ 1, 2, 3 };
const auto product_times_ten = [](const auto a, const auto b) { return a * b * 10; };

std::transform_reduce(std::cbegin(a), std::cend(a), std::cbegin(b), 0, std::plus<>{}, product_times_ten); // == 140
```

### 前缀和算法

支持前缀和（包括包容和排斥扫描）以及转换。

```c++
const std::array<int, 3> a{ 1, 2, 3 };

std::inclusive_scan(std::cbegin(a), std::cend(a),
    std::ostream_iterator<int>{ std::cout, " " }, std::plus<>{}); // 1 3 6

std::exclusive_scan(std::cbegin(a), std::cend(a),
    std::ostream_iterator<int>{ std::cout, " " }, 0, std::plus<>{}); // 0 1 3

const auto times_ten = [](const auto n) { return n * 10; };

std::transform_inclusive_scan(std::cbegin(a), std::cend(a),
    std::ostream_iterator<int>{ std::cout, " " }, std::plus<>{}, times_ten); // 10 30 60

std::transform_exclusive_scan(std::cbegin(a), std::cend(a),
    std::ostream_iterator<int>{ std::cout, " " }, 0, std::plus<>{}, times_ten); // 0 10 30
```

### GCD 和 LCM

最大公约数 (GCD) 和最小公倍数 (LCM)。

```c++
const int p = 9;
const int q = 3;
std::gcd(p, q); // == 3
std::lcm(p, q); // == 9
```

### std::not_fn

返回给定函数结果否定的实用函数。

```c++
const std::ostream_iterator<int> ostream_it{ std::cout, " " };
const auto is_even = [](const auto n) { return n % 2 == 0; };
std::vector<int> v{ 0, 1, 2, 3, 4 };

// 打印所有偶数。
std::copy_if(std::cbegin(v), std::cend(v), ostream_it, is_even); // 0 2 4
// 打印所有奇数（不是偶数）。
std::copy_if(std::cbegin(v), std::cend(v), ostream_it, std::not_fn(is_even)); // 1 3
```

### 字符串与数字的相互转换

将整数和浮点数转换为字符串，反之亦然。转换是不抛异常的，不分配，并且比C标准库的等效物更安全。

用户负责为 `std::to_chars` 分配足够的存储，否则函数将失败，通过在其返回值中设置错误代码对象。

这些函数允许你可选地传递基数（默认为基数10）或浮点类型输入的格式说明符。

* `std::to_chars` 返回一个（非const）char指针，它位于函数写入给定缓冲区内的字符串之后，以及一个错误代码对象。
* `std::from_chars` 返回一个const char指针，成功时等于传递给函数的结束指针，以及一个错误代码对象。

从这两个函数返回的错误代码对象在成功时等于默认初始化的错误代码对象。

将数字 `123` 转换为 `std::string`：

```c++
const int n = 123;

// 可以使用任何容器、字符串、数组等。
std::string str;
str.resize(3); // 为 `n` 的每个数字保持足够的存储空间

const auto [ ptr, ec ] = std::to_chars(str.data(), str.data() + str.size(), n);

if (ec == std::errc{}) { std::cout << str << std::endl; } // 123
else { /* 处理失败 */ }
```

从值为 `"123"` 的 `std::string` 转换为整数：

```c++
const std::string str{ "123" };
int n;

const auto [ ptr, ec ] = std::from_chars(str.data(), str.data() + str.size(), n);

if (ec == std::errc{}) { std::cout << n << std::endl; } // 123
else { /* 处理失败 */ }
```

### Chrono时间段和时间点的舍入函数

为 `std::chrono::duration` 和 `std::chrono::time_point` 提供abs、round、ceil和floor辅助函数。

```c++
std::chrono::milliseconds a{ -5500 };
std::chrono::milliseconds d = std::chrono::abs(a); // == 5500ms
std::chrono::round<seconds>(d); // == 6s
std::chrono::ceil<seconds>(d); // == 6s
std::chrono::floor<seconds>(d); // == 5s
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
