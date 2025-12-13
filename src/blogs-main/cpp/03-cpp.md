---
title: 03 模板详解
article: true
order: 3
star: false

category:
  - 语言

tag:
  - cpp

date: 2025-11-12

description: cpp 中有关模板的详细介绍
footer: Always coding, always learning
---

# 03 模板详解

模板的重要性不必多言，业务开发确实不常用，但是任何标准库或者第三方库都会用到模板，不了解函数模板连读源码都是做不到的。

至于模板的学习，只能说实践才能检验，因而本篇主要是总体的介绍，适合已经略微写过最简单模板的人阅读，更多的还是需要多看多练。

## 函数模板

函数模板不是函数，只有实例化函数模板，编译器才能生成实际的函数定义，不过在很多时候，它看起来就像普通函数一样。

> 实例化: 指代的是编译器确定各模板实参（可以是根据传入的参数推导，又或者是自己显式指明模板的实参）后从模板生成实际的代码（如从函数模板生成函数，类模板生成类等），这是在编译期就完成的，没有运行时开销。实例化还分为隐式实例化和显式实例化，后面会详细聊。

### 定义函数模板

对于一个模板的定义，需要遵循如下语法:

```cpp
template <形参列表> 函数声明
```

这里我们看一个简单的例子，求两个对象之中较大的那个:

```cpp
template <typename T>
T max(T a, T b)
{
  return a > b ? a : b;
}
```

顾名思义，我们使用 `typename` 引入一个类型形参，它可以指代一种类型，它表示类型的类型，默认情况下我们倾向于写成 `T` 或 `Ty`，当然也可以写成一种具有实际含义的名字，都是取决于实际需求。

然后在调用时，他会推导我们传入的参数对应的类型，并把它赋值给 T 这个类型形参，随后实例化函数模板为具体函数定义，因而我们传入的参数类型必须是支持 > 运算的类型，且由于 return 的存在，它至少需要支持 复制/移动 的行为。

> 注意: 由于 RVO 在 C++17 后成为强制保证,在某些情况下即使删除了拷贝/移动构造函数也能工作。但通常仍需要类型至少是可移动构造的。

由于一些历史原因，这个 `typename` 可以写成 `class`，但我们大多数情况下不会这样写，了解一下即可。

### 使用函数模板

下面的代码演示了如何使用模板:

```cpp
struct Test
{
  int _val{};

  Test(int val) : _val(val) {}

  bool operator>(const Test& other) const
  {
    return _val > other._val;
  }
};

int main()
{
  std::cout << max(10, 20) << '\n';
  std::cout << max(Test(10), Test(15))._val << '\n';
}
```

以使用来看，只要我们传入的参数类型满足模板要求，那他使用上和普通函数看起来是没有任何区别的，但多了一层模板的中间件，自然需要有东西来转义这么一层。

因而实际的行为是这样的，编译器会实例化出来两个函数:

```cpp
int max(int a, int b)
{
  return a > b ? a : b;
}

Test max(Test a, Test b)
{
  return a > b ? a : b;
}
```

这就是静态多态，也就是函数重载，随后调用处会去匹配更为合适的函数定义并调用，本质上来说就是 **重载**。

当然，我们不仅可以依靠编译器来推断 T 的类型，也可以直接指明:

```cpp
std::cout << max<double>(1.3, 2.4) << '\n';
```

这样的话，就是明确告诉编译器，为这个模板生成 T 为 double 类型的函数定义。

### 函数模板参数推导

如上文所说，模板参数的类型完全可能由编译器推导完成，但是编译器推导所有的类型不太可能，比如一些情况下，推导出来的 T 可能只是数值类型的一部分:

```cpp
template <typename T>
T min(const T& a, const T& b)
{
  return a < b ? a : b;
}
```

此处，推导出来的 T 只能占位 `int`，而不是完整的 `const int&`。

不过很多情况下，模板是无法推导出来我们实际使用的类型的:

```cpp
max(1, 2.5); // Error: 无法确认 T 是 int 还是 double

using namespace std::string_literals;
max("aaa"s, "bbb"); // Error: 无法确认 T 是 std::string 还是 char const*
```

此时我们可以选择显示指定 T 的类型以确保隐式转换，也可以直接手动转换类型:

```cpp
max<double>(1, 2.5); // T 为 double，int 的隐式转换
max(static_cast<double>(1), 2.5); // T 为 double，int 的强制转换
```

那按理说我们只需要把 `bbb` 转换为 string 就可以解决第二个 error 了，对吧?

```cpp
using namespace std::string_literals;
max("hello"s, std::string("sss"));
```

很遗憾，它仍然会报错，原因并不在于我们的 T 不明确了，而是在于 max 不明确了，我们定义的全局 max 和标准库的 `std::max` 冲突了，从而导致这个问题，这是由于 [ADL](https://en.cppreference.com/w/cpp/language/adl.html) 的查找规则存在导致的，解决方案也很简单，我们只需要指定我们使用的是全局 max 就好了:

```cpp
::max("hello"s, std::string("sss"));
```

如果你了解 ADL，可以跳过这一部分，我们此处简单介绍一下存在 ADL 的查找策略:

- **普通的非限定查找 (Unqualified Lookup) 先执行**: 当前作用域，外层作用域，using 声明引入的名字，当前命名空间

- **ADL (参数依赖查找) 额外添加**: 参数类型所在的命名空间，参数类型的基类所在的命名空间，如果是模板类，模板参数类型所在的命名空间

- **最终结果** = 普通查找的结果 + ADL 查找的结果

> 并不是所有情况都会进行 ADL 查找的，必须满足: **非限定名称查找、函数调用且有参数(参数类型为类类型、枚举类型或其指针/引用)、不存在变量遮蔽**，才会触发此种搜索条件。

### 万能引用与引用折叠

对于一个函数的参数，引用的概念可以分为左值引用、右值引用以及常量引用，其中常量引用也被成为 "万能引用"(并非真正的万能引用)，但它的万能仅仅局限于它可以接收任意左值和右值的实参，对于函数体的使用，则多了无法剥离的 const 修饰符。

在模板函数中，存在 `T&&` 这样的写法，它被称为万能引用: **接受左值表达式那形参类型就推导为左值引用，接受右值表达式，那就推导为右值引用**。

> 注意: 只有在类型推导的场景下，`T&&` 才是万能引用，如果 T 已经确定了类型，那么它就只是普通的右值引用。

让我们看一个例子:

```cpp
template <typename T>
void foo(T&& param)
{
}
```

我们以 int 类型为例，万能引用存在如下规则: 传入左值则推导为 `int&`, 传入右值则推导为 `int`。

右值的很好理解，但是左值就会出现 `int& &&` 的类型，对于此种类型，需要引入 **引用折叠 (Reference Collapsing)** 规则进行处理:

```cpp
T& &   -> T&   // 左值引用 + 左值引用 = 左值引用
T& &&  -> T&   // 左值引用 + 右值引用 = 左值引用
T&& &  -> T&   // 右值引用 + 左值引用 = 左值引用
T&& && -> T&&  // 右值引用 + 右值引用 = 右值引用
```

简单来说，**只要有一个左值引用，结果就是左值引用**。

回到刚才的例子:

```cpp
int x = 10;
foo(x);   // T = int&, param = int& && -> int&
foo(10);  // T = int,  param = int&&
```

这就是万能引用能保持传入参数的引用类型一致的原因，那不妨再思考一下，如果我们在此函数内再调用别的函数呢，此时传入的参数都变成了左值，但我们想保持原来的引用类型，就自然想到了 11 的 `std::forward` 来进行转发。

```cpp
template <typename T>
constexpr T&& forward(typename remove_reference<T>::type& t) noexcept
{
  return static_cast<T&&>(t);
}

template <typename T>
constexpr T&& forward(typename remove_reference<T>::type&& t) noexcept
{
  return static_cast<T&&>(t);
}
```

源码放在这里了，不过这属于特性的范围，本处我们不过多介绍了，可以自己推导一下。

### 有默认实参的模板类型形参

就如同函数形参可以有默认值一样，模板形参也可以有默认值。当然了，这里是“类型形参”，即为类型形参提供一个默认值。

```cpp
template<typename T = int>
void f();

f();          // 默认为 f<int>
f<double>();  // 显式指明为 f<double>
```

这里我们来看一个小例子，同样是获取 max，不过我们此处有两个不同类型的参数，那自然需要表示返回值类型:

```cpp
template <typename T1, typename T2, typename RT = decltype(true ? T1{} : T2{})>
RT max(const T1& a, const T2& b)
{
  return a > b ? a : b;
}
```

这个部分我们使用了多个类型参数，同时对于返回值类型选择使用三元表达式来表示默认类型，为什么要用三元表达式?

这里的三元表达式不是为了选择 T1 或 T2，而是利用C++的类型推导规则来找到T1和T2的公共类型(common type)，并把此公共类型设置为默认值。

但是事实上，这个写法是很冗余且无意义的，首先为了减少两个实例化的开销，可以选择使用 `std::declval` 来替换两个实例化，只在编译器计算此类型，也可以直接选择 `std::common_type_t`，上述两种方案都可以优雅的解决掉这个获取公共类型的问题。

```cpp
// 编译期推导
template <typename T1, typename T2, typename RT = decltype(true ? std::declval<T1>() : std::declval<T2>())>
RT max2(const T1& a, const T2& b)
{
  return a > b ? a : b;
}

// common type
template <typename T1, typename T2>
std::common_type_t<T1, T2> max3(const T1& a, const T2& b)
{
  return a > b ? a : b;
}
```

当然在 cpp20 以后，你也可以使用 auto 来简化这一切:

```cpp
decltype(auto) max4(const auto& a, const auto& b)
{
  return a > b ? a : b;
}
```

模板的默认实参是无处不在的，特别是标准库中，比如 `std::vector` 和 `std::string`，不过那是类模板了，我们后续再说。

### 函数返回类型

使用 C++11 后置返回类型，我们可以这样写:

```cpp
template<typename T1, typename T2>
auto max(const T1& a, const T2& b) -> decltype(true ? a : b)
{
    return a > b ? a : b;
}
```

它和我们之前用默认模板实参 RT 的区别在于，返回类型的推导方式不同。

如果是默认类型参数，它的类型是根据三元表达式的规则推导的，也就是说推导的两个类型都是基于一个纯右值进行推导的；如果是后置返回类型，那么会根据实际参数的值类别推导。

因而，对于后置返回类型，由于进入的值可能存在不同类型，比如值与值，值与引用，int 与 double 等等情况，因此它推导出来的值会是不同的，但是经 auto 占位，再次丢弃引用和 const，因此它大多数情况下返回值类型和上文默认参数类型是一样的，但这是因为 auto 的原因，而非推导的问题。

使用 C++14 的返回类型推导，我们可以直接写:

```cpp
template<typename T1, typename T2>
auto max(const T1& a, const T2& b)
{
  return a > b ? a : b;
}
```

这里的 `auto` 不再是占位符，而是会真正推导 return 语句的类型。但需要注意的是，`auto` 的推导遵循模板实参推导规则，会丢弃引用和顶层 const。

也就是说，即使 `a` 是 `const int&` 类型，返回类型也只会推导为 `int`，而不是 `const int&`。

如果我们希望保留完整的类型信息（包括引用和 cv 限定），可以使用 C++14 引入的 `decltype(auto)`:

```cpp
template<typename T1, typename T2>
decltype(auto) max(const T1& a, const T2& b)
{
  return a > b ? a : b;
}
```

`decltype(auto)` 使用 `decltype` 的推导规则，会保留表达式的完整类型。相当于 `decltype(return表达式)` 的类型。

需要注意后置返回类型和返回类型推导的区别，它们不是一种东西，后置返回类型虽然也是写的 `auto`，但是它根本没推导，只是占位。而返回类型推导中的 `auto` 或 `decltype(auto)` 才是真正的推导。

### 非类型模板形参

既然有”类型模板形参“，自然有非类型的，顾名思义，也就是模板不接受类型，而是接受值或对象。

```cpp
template <std::size_t N>
void f() { std::cout << N << '\n'; }

f<10>(); // 10
```

当然，非类型的模板形参也可以有默认值，用法是一样的:

```cpp
template <std::size_t N = 10>
void f() { std::cout << N << '\n'; }

f(); // 10
f<100>();  // 100
```

至于有什么用，与普通函数参数相比，最大区别在于这个参数是编译期确定的，满足零运行时开销，且在一些分配内存的结构里，还可以保证内存的连续性，不止减少内存碎片，还不用动态扩容。

### 重载函数模板

函数模板与非模板函数可以形成重载，这个选择会设计到非常复杂的 [重载决议](https://en.cppreference.com/w/cpp/language/overload_resolution.html) 规则，建议详细读一下原文，我这里简单介绍一下:

**重载决议**: 当函数被调用时，如果名字对应多个函数(重载)，编译器需要确定调用哪个版本，重载决议就是这个选择过程。

简单来说: **选择参数匹配最接近的那个重载**。

详细说来分为三步:

- **构造候选函数集**: 包括所有与调用名称匹配的函数，包括模板实例化。
- **选择可行函数集**: 从候选函数中选出参数数量匹配、能够进行隐式转换的函数。
- **确定最佳匹配**: 通过比较隐式转换序列的等级来选出最佳匹配。

这里我们一个一个说来，首先是候选函数的收集，核心就是去匹配调用名称相同的所有函数，但根据不同的场景，匹配的范围也不同:

比如普通函数可能涉及 ADL 查找，而类成员函数则会涉及继承体系内的函数，运算符重载需要考虑成员候选和非成员候选等，还有更为复杂的模板实例化等。

**总之就是根据不同上下文去对应搜索范围获取名称相同的函数**，注意了，此时基本只考虑函数名称。

随后需要确认这些候选函数中，哪些是可行的， 一个候选函数要成为可行函数需满足:

- 参数数量匹配，需考虑默认参数/省略号参数
- 约束满足，cpp20 及以后
- 每个参数都有隐式转换序列
- 引用绑定合法

随后，从可行函数中选择最佳匹配，主要依据是函数参数的隐式转换序列的等级，隐式转换序列按照从优到差分为三种等级:

- **精确匹配**: 无需转换、左值到右值、限定符转换、函数指针转换
- **提升**: 整型提升、浮点提升
- **转换**: 整型转换、浮点转换、指针转换、派生类到基类转换

因而选择最佳函数的规则可以总结如下，函数 F1 优于 F2 当且仅当:

- 所有参数的转换都不差于F2，且至少有一个参数转换更好
- 非模板函数优于模板特化
- 更特化的模板优于不太特化的模板
- C++20: 更受约束的函数优于约束更少的
- C++20: 非改写候选优于改写候选

这么多复杂的规则组成了重载决议的过程，一句大白话说下来就是: **选择参数匹配最接近的那个重载**，当然，很多时候我们可以通过直觉判断哪个更接近，但有些时候确实会比较复杂，这就需要我们对规则有一定的了解了。

这里我们就看一个最简单的例子:

```cpp
template <typename T>
void func2(T)
{
  std::print("template");
}

void func2(int)
{
  std::print("int");
}

func2(2);    // int
func2(1.2);  // template
```

### 可变参数模板

可变参数模板允许函数接受任意数量、任意类型的参数，这是 C++ 模板的强大特性之一。

> 老式 C 语言的 `...` 变长参数与 `va_xxx` 配合使用有众多弊端且不类型安全，现代 C++ 应使用可变参数模板。

假设我们需要实现一个 `sum` 函数，支持任意类型、任意个数的参数调用。

```cpp
template<typename... Args>  // Args 是模板形参包
void sum(Args... args) {    // args 是函数形参包
}
```

这里我们第一次引入了 `...` 在模板中的使用，表示一个 [包](https://en.cppreference.com/w/cpp/language/parameter_pack.html)。

- args 是函数形参包，Args 是类型形参包，它们的名字我们可以自定义。

- args 里，就存储了我们传入的全部的参数，Args 中存储了我们传入的全部参数的类型。

那问题就来了，存储很简单，我们要如何把这些东西取出来使用呢？这个就必须引入 **模式** 的概念了。

**展开规则**: 省略号前的整个表达式(也可以叫做模式)会被重复应用到形参包的每个元素上，用逗号分隔。

```cpp
void f(const char*, int, double) { puts("值"); }
void f(const char**, int*, double*) { puts("&"); }

template<typename... Args>
void test(Args... args) {
  // args...    展开为: arg0, arg1, arg2
  // &args...   展开为: &arg0, &arg1, &arg2
  f(args...);   // 调用第一个 f
  f(&args...);  // 调用第二个 f
}
```

注意，形参包并不是在任何情况下都可以展开的，它只能在特定的语法位置展开，常见的展开场所:

**花括号初始化器列表**，这是 C++14 及之前常用的技巧，利用数组初始化来展开形参包:

```cpp
template<typename... Args>
void print(const Args&... args) {
  // 模式是 (std::cout << args << ' ', 0)
  // 展开为: (std::cout << arg0 << ' ', 0), ...
  int _[]{ (std::cout << args << ' ', 0)... };
}
```

在这个样例中，`std::cout` 仅仅只作为副作用，表达式返回的 0 用于初始化数组，从而达到展开的目的，但是注意，此函数显然无法承接空参数，且数组的生存期会持续到函数结束，都是可以优化的地方，下面我们来看一些优化的写法。

```cpp
template<typename... Args>
void print(const Args&... args) {
  using Arr = int[];
  (void)Arr{ 0, (std::cout << args << ' ', 0)... };
}
```

**函数调用的实参列表**，即在函数调用处展开:

```cpp
template<typename T, std::size_t N, typename... Args>
void f(const T(&array)[N], Args... index) {
  print(array[index]...);
}
```

事实上，在 cpp17 以后，我们可以使用 **折叠表达式 (Fold Expression)** 来简化可变参数模板的展开，这一部分我们后续会专门介绍。

此时，你可以尝试实现一下 `sum` 函数，我这里给出一个参考实现:

```cpp
template <typename... Args, typename RT = std::common_type_t<Args...>>
RT sum(Args... args)
{
  RT _[] = {static_cast<RT>(args)...};
  return std::accumulate(std::begin(_), std::end(_), RT{});
}
```

### 模板分文件

对于常见代码开发，我们一般会选择声明与定义相分离的方式来组织代码，那对于模板相关的呢？可以直接给出结论: **模板不支持分离编译，必须将声明与定义放在同一个文件中**。

原因也很简单，我们从头开始说，你了解 `#include` 的作用吗？可能你会提到，它的作用就是一个替换，把对应文件的文本替换到调用处，没有问题，就像如下的代码可以正确打印一样:

```cpp
void func3()
{
  int arr[] = {
#include "array.txt"
  };
  f(arr, 0, 2, 4); // 1, 3, 5
}
```

其中 `array.txt` 的内容为 `1,2,3,4,5`，也对应了前面所说，那接下来的例子为什么可以编译通过呢?

```cpp
// test.h
void ttt();

// test.cpp，注意没有包含 test.h
void ttt() {}

// main.cpp
#include "test.h"
int main()
{
  ttt();
}
```

此时我们使用 `g++ main.cpp test.cpp` 编译是可以通过的，如果你对编译链接的过程比较了解的话，你就会知道，如果编译器在编译一个翻译单元的时候，如果发现找不到函数的定义，那么就会空着一个符号地址，将它编译为目标文件。期待链接器在链接的时候去其他的翻译单元找到定义来填充符号。

因此虽然 `main.cpp` 这个单元没有编译出实际的 `ttt` 定义，但是链接器会去 `test.cpp` 这个单元去找对应的定义，从而完成链接。

那模板不能分离编译的原因应该也很清楚了，模板这玩意用了才会生成对应的函数定义，你单纯把实现放到一个 cpp 文件里，是不会生成任何实际定义的，更不用说链接器去找了。

> 约定: 模板的声明与定义一般放在同一个头文件中，且头文件名一般以 `.hpp`，以示区别于普通头文件。

至此我们就说了函数模板的相关内容，实际上它相关的内容不仅如此，但目前已足够使用，后续我们会选择性介绍其他内容。

## 类模板

这个部分与函数模板相似的地方非常多，因而我会采用增量介绍的方式来介绍此部分内容。

首先，与函数模板相同的是，类模板不是类，只有实例化类模板，编译器才能生成实际的类。

### 定义类模板

下面是一个类模板，它和普通类的区别只是多了一个 `template<typename T>`:

```cpp
template <typename T>
struct Test{};
```

可以看出，与函数模板相同的是，类模板的语法是一模一样的，都是采用 `typename` 或 `class` 来引入类型变量，可以说 **我们前面函数模板的形参列表可以写的东西在类模板里都可以写**。

```cpp
template <形参列表> 类声明
```

### 使用类模板

下面的例子则展示了如何使用类模板:

```cpp
template <typename T>
struct Test
{
};

int main()
{
  Test<int> t1;
  Test<void> t2;
  // Test t3;  Error: No viable constructor or deduction guide for deduction of template arguments of 'Test'
}
```

可以看出，与函数模板最大的不同之处在于，我们必须显式的指明类模板的类型实参，并且没有办法推导，随后我们就可以在类内使用该类型形参用于替代一个类型位置了。

上面那句话在 cpp17 以前可以认为正确，但是 17 以后增加了类模板实参推导，也就是说类模板也可以像函数模板一样被推导，而不需要显式的写明模板类型参数了，注意，此句话只有在 **传入类型实参时才有效，而不关心是列表初始化还是构造函数**，这个是很有用的特性，可以简化巨量的辅助函数 `std::make_xxx` 调用。

```cpp
template <typename T>
struct Test
{
  T t;
};

int main()
{
  Test t3{2};  // t3 被推导为 Test<int>
}
```

### 类模板参数推导

在 cpp17 以后，其实对于类模板的推导使用已经和函数很类似了，我们不需要到处写 `std::make_xxx` 系列函数，而是只需要传入参数即可由编译器推导成具体类型，这极大简化了编码:

```cpp
std::mutex mtx;
std::lock_guard lock1{mtx};  // 简约写法
std::lock_guard<std::mutex> lock2{mtx}; // 老写法
```

因而从这个角度，类模板的参数推导是和函数模板的参数推导保持高度一致的，但是类模板的参数推导其实存在一个自定义的推导指引的行为的: **当编译器推导为某个类型时，让他成为我们期望的类型**。

```cpp
template <typename T>
struct Test
{
  Test(T _t) : t(_t) {}
  T t;
};

Test(int) -> Test<std::size_t>;

Test t3{2}; // t3 为 Test<std::size_t>
```

在上述例子中，我们定义了一个自定义推导指引，即当 Test 的类型形参被推导为 int 时，我们希望此 T 被实际标注为 `std::size_t`，事实上，这个语法是非常简洁的:

```cpp
模板名称(类型a)->模板名称<想要让类型a被推导为的类型>;
```

如果涉及的是一类类型，那么可以选择给类型也加上模板:

```cpp
template <模板形参列表>
模板名称(参数列表) -> 模板名称<推导出的类型实参>;
```

> 此行为需保证类模板必须存在能接受该参数的构造函数，本质是一样的，当传入 int 时，编译器得到最终类型，随后实例化类模板，并进行实际的构造，如果自定义指引对应的类型不存在构造函数，则会报错。

这里我们来看一个更复杂的例子:

```cpp
template <typename T, std::size_t size>
struct Array
{
  T arr[size];
};

::Array arr{1, 2, 3, 4, 5}; // Error: 无法推导
```

此时只依靠默认推导是不足够的，毕竟编译器无法知道 size 应该是多少，因此我们需要自定义推导指引:

```cpp
template <typename T, typename... Args>
Array(T, Args...) -> Array<T, 1 + sizeof...(Args)>;
```

这很显然，我们把传入的第一个参数用于推导 `T`，剩余参数的则用于计算 size，随后我们就可以正确推导出类型了，也就是 `Array<int, 5>`，后者需要 +1 的原因是因为第一个参数已经被单独提取出来了，这里补上即可。

### 默认实参

对于类的默认实参，同样支持类型的默认实参和非类型的默认实参，这一点与函数模板相同，不过这里值得注意一个区分点，即在 cpp17 引入的类模板实参推导，会让我们调用的写法有极大不同:

```cpp
template <typename T = int>
struct X {};

X x1;   // 使用默认实参，x1 为 X<int>
X<> x2; // 使用默认实参，x2 为 X<int>
```

前者会被自动推导为 `X<int>`，如果你的编译器版本不支持 cpp17，那么前者会报错，必须使用后者，可以理解前者是后者的语法糖。

上述简化仍有值得注意的地方，对于全局变量或者局部变量，是没有任何问题的，但是如果是类成员变量，则必须使用后者:

```cpp
struct Test2
{
  X<> x;
  static inline X<> x3;
};
```

静态变量在特定 gcc 版本下可能会通过非 `<>` 的编译，但是这只是特殊情况，简单记忆的话: **类成员变量必须使用 `<>` 来确保使用默认实参**。

### 成员函数模板

成员函数模板基本上和普通函数模板没多大区别，唯一需要注意的是，它大致有两类：

- 类模板中的成员函数模板
- 普通类中的成员函数模板

对于前者，它就是一个普通的函数，在类模板实例化时会形成一个普通的成员函数，，单纯对于使用而言是无感的:

```cpp
template <typename T>
struct Y
{
  void f(T) {}
};
```

而后者则分为类模板的成员函数模板和普通类的成员函数模板，事实上这两个差距不大，本处只是语法展示，并没有实际应用，我相信了解函数模板即可理解这些:

```cpp
template<typename T>
struct Class_template{
  template<typename... Args>
  void f(Args&&...args) {}
};

struct Test{
  template<typename...Args>
  void f(Args&&...args) {}
};
```

而其他的比如可变参数模板以及模板分文件等内容与函数模板基本一致，此处不再赘述。

## 变量模板

cpp14 以后引入了变量模板的概念，与前面两种模板相同的是，变量模板不是变量，只有实例化后的变量模板才会生成真正的变量。

变量模板实例化后是一个 **全局变量**，因此你不需要担心它的生命周期。

### 定义变量模板

变量模板的定义语法毫无难度:

```cpp
template <typename T>
T t;
```

当然，作为一个变量，它当然可以使用很多符合进行修饰，如 cv 限定，初始化器一类的操作，比较常见的修饰符主要有 `constexpr`，`inline`，`static` 等。

### 使用变量模板

```cpp
template <typename T>
constexpr T t2{};

t2<int>;  // 相当于 constexpr int t2 = 0;
```

那众所周知，constexpr 修饰变量时隐含的有 const 属性，那么下面的式子打印 `true` 也是理所当然的:

```cpp
std::cout << std::boolalpha << std::is_same_v<decltype(t2<int>), const int> << '\n';
```

这里可以选择性复习一下四大 `const`: `const，constexpr，consteval，constinit`，不属于模板我就不说了。

同样的，变量模板的本质也是在使用的时候去实例化一个变量，也就是说不同的类型形参会初始化出来完全不同的变量，即 `t2<int>` 和 `t2<double>` 取址结果是完全不同的。

### 默认参数

同样的，变量模板也支持类型默认实参和非类型默认实参:

```cpp
template <typename T = int>
T t3{};

t3<> = 5;
```

注意，变量模板即使使用默认实参仍要求必须把 `<>` 写出来，非类型模板实参没有介绍的必要，可以参考前两种模板。

### 可变参数变量模板

模板变量同样支持形参包与包展开，此处我们给出一个例子，看一下即可跳过:

```cpp
template <std::size_t... values>
constexpr std::size_t array[]{values...};

for (const auto& i : array<1, 2, 3, 4, 5>) std::cout << i << ' ';
```

## 模板全特化

其实很多东西都能进行全特化，不过我们围绕着之前的内容：函数模板、类模板、变量模板来展开。

### 函数模板全特化

给出这样一个函数模板，你可以看到，它的逻辑是返回两个对象相加的结果，那么如果我有一个需求：“**如果我传的是一个 double 一个 int 类型，那么就让它们返回相减的结果**”。

```cpp
template <typename T1, typename T2>
auto add(const T1& a, const T2& b)
{
  return a + b;
}
```

这种需求非常常见，毕竟一个模板很多情况下不足以满足我们的所有需求，那么我们就可以使用 **函数模板全特化** 来实现:

```cpp
template <>
auto add(const double& a, const int& b)
{
  return a - b;
}
```

语法很简单，只需要在模板名前加上 `template<>`，并把所有的类型形参都替换为具体类型即可，当然很多情况下，模板实参只占据函数实参的一部分，如上面的例子，函数实参是 `const double&` 和 `const int&`，而模板实参是 `T1` 和 `T2`，因此我们也可以选择写明推导类型:

```cpp
template <>
auto add<double, int>(const double& a, const int& b)
{
  return a - b;
}
```

至于为什么就可以特化了，原理也很简单，根据我们上文讲到的重载决议的规则: **特化模板优于不太特化的模板**，因此当我们调用 `add(5.0, 2)` 时，编译器会优先选择特化版本。

### 类模板全特化

和函数模板一样，类模板一样可以进行全特化。

```cpp
template <typename T>
struct is_void
{
  static constexpr bool value = false;
};

template <>
struct is_void<void>
{
  static constexpr bool value = true;
};

std::cout << std::boolalpha << is_void<int>::value << '\n';  // false
std::cout << std::boolalpha << is_void<void>::value << '\n'; // true
```

我们使用特化来判断此模板形参是否为 void 类型，虽然很简单，但我们还是稍微强调一下：同一个类模板实例化的不同的类，彼此之间毫无关系，而静态数据成员是属于类的，而不是模板类；模板类实例化的不同的类，它们的静态数据成员不是同一个。

同样的，在 cpp17 以后，你肯定见过很多 `is_xxx_v` 这样的写法，而不是 `is_xxx::value`，我们也可以实现此功能，只需要引入一个变量模板即可:

```cpp
template <typename T>
constexpr bool is_void_v = is_void<T>::value;

std::cout << std::boolalpha << is_void_v<int> << '\n';  // false
std::cout << std::boolalpha << is_void_v<void> << '\n'; // true
```

总之，你可以这样想，除了模板参数需要明确与原模板保持一致，其余就跟写一个普通的类是一模一样的。

### 变量模板全特化

这个东西更是一模一样，直接看个例子好了:

```cpp
template <typename T>
constexpr const char* s = "??";

template <>
constexpr const char* s<void> = "void";

std::cout << s<int> << '\n';   // ??
std::cout << s<void> << '\n';  // void
```

模板特化的语法就是如此简单，示例也是偏简单的，这里我补充几个小细节，在写的时候是需要注意的。

### 补充

**特化必须在导致隐式实例化的首次使用之前**，否则特化无效且编译报错:

```cpp
template <typename T>
void f() {}   // 主模板

void f2() {f<int>();} // 隐式实例化为 f<int>

template <>
void f<int>() {}   // 错误，因为前面隐式调用已经实例化了此模板，导致此处重定义
```

函数模板和变量模板的显式特化是否为 `inline/constexpr/constinit/consteval` 只与显式特化自身有关，主模板的声明是否带有对应说明符对它没有影响。模板声明中出现的属性在它的显式特化中也没有效果：

```cpp
template<typename T>
int f(T) { return 6; }
template<>
constexpr int f<int>(int) { return 6; }   // OK，f<int> 是以 constexpr 修饰的

template<class T>
constexpr T g(T) { return 6; }            // 这里声明的 constexpr 修饰函数模板是无效的
template<>
int g<int>(int) { return 6; }             //OK，g<int> 不是以 constexpr 修饰的

int main(){
  constexpr auto n = f<int>(0);         // OK，f<int> 是以 constexpr 修饰的，可以编译期求值
  //constexpr auto n2 = f<double>(0);   // Error! f<double> 不可编译期求值

  //constexpr auto n3 = g<int>(0);      // Error! 函数模板 g<int> 不可编译期求值
  constexpr auto n4 = g<double>(0);     // OK! 函数模板 g<double> 可编译期求值
}
```

这个例子是可以通过编译的，主要是为了展示属性在特化与非特化的区别，本质上仍是最开始所说的: **模板在调用时需要先实例化，随后根据重载决议匹配**。

## 模板偏特化

首先，模板全特化是让我们去指出模板参数具体为什么时才可以使用特化版本，而偏特化与之不同的地方在于: **我们可以只指定部分模板参数的具体类型，而让其他参数保持模板参数的形式，或者让模板参数表示一类类型**。

> 只有类模板和变量模板支持偏特化，函数模板不支持偏特化。

### 变量模板偏特化

下面的例子展示了偏特化为一类类型的用法:

```cpp
template <typename T>
constexpr const char* x = "?";

template <typename T>
constexpr const char* x<T*> = "pointer";

std::cout << x<int> << "\n";   // Output: "?"
std::cout << x<int*> << "\n";  // Output: "pointer"
```

在上面的例子中，我们定义了偏特化，只要对于模板变量 `x` 传入的是一个指针类型，那么就会使用偏特化版本，即将此模板变量实例化为 `pointer`。

可以看出，从语法上来说，偏特化仍然需要 `template<typename T>`，区别在于写特化是需要写成具体类型还是一类类型。

当然我们也可以只特化部分类型:

```cpp
template <typename T, typename U>
constexpr const char* Y = "?";

template <typename T>
constexpr const char* Y<int, T> = "int-specialized";

std::cout << Y<double, float> << "\n";  // Output: "?"
std::cout << Y<int, float> << "\n";     // Output: "int-specialized"
```

这个例子我们则是在对模板变量的第一个类型参数进行特化，而第二个类型参数保持模板参数的形式。

可以看出，全特化是必须指定到具体类型，而偏特化则可以 **指定为一类类型，或者只指定部分类型**，其余情况基本就是提到的这两种情况的变种。

### 类模板偏特化

这个偏特化的语法和变量模板是一样的，我们直接看例子:

```cpp
template <typename T, std::size_t N>
struct X1
{
  template <typename T1, typename T2>
  struct X2{};
};

template <>
template <typename T2>
struct X1<int, 10>::X2<int, T2>
{
  void f()
  {
    std::cout << "X1<int, 10>::X2<int, T2>::f()\n";
  }
};

X1<int, 10>::X2<int, double>{}.f();  // 调用
```

这个例子本身语法很简单，即对外层类进行全特化，对内层类进行偏特化，但我将其作为演示，是要引一下隐式实例化，当前例子在 gcc 编译器是无法通过的，对此的解释是:

`X1<int, 10>` 是隐式实例化出来的，但在标准规定中，隐式实例化必须与主模板的行为保持一致，主模板并不存在对 X2 的偏特化，因而在调用时会去查找主模板 X1，它不存在偏特化 X2 版本，从而会报错，这是编译器的一个限制。

如果想解决也很简单，即先声明 X1 的全特化，再去偏特化 X2 即可，此时所有行为都被这个特化的 X1 所管理的，这就是显示实例化。

事实上，这个例子在 MSVC 和 Clang 下是可以通过的，我倾向于 gcc 的行为更加标准，另两家编译器则是放宽了这个限制。

最后我们再看一个例子来结束偏特化的介绍:

```cpp
template <typename, typename>
constexpr bool is_same_v = false;

template <typename T>
constexpr bool is_same_v<T, T> = true;
```

在这个例子中，我们手动实现了标准库的 `std::is_same_v`，原理也很简单，如果两个类型不一样，那么就使用主模板，返回 false；如果两个类型一样，那么就使用偏特化版本，返回 true。

## 折叠表达式

cpp17 以后引入了折叠表达式，可以让我们更轻松的进行形参包展开，主要有如下四种语法:

```cpp
( 形参包 运算符 ... )              (1)   一元右折叠
( ... 运算符 形参包 )              (2)   一元左折叠
( 形参包 运算符 ... 运算符 初值 )    (3)  二元右折叠
( 初值 运算符 ... 运算符 形参包 )    (4)  二元左折叠
```

具体来说会符合如下规则，其中 N 是包展开中的元素数量:

- 一元右折叠: `E 运算符 ...` -> `(E1 运算符 (E2 运算符 ... (En-1 运算符 En)))`
- 一元左折叠: `... 运算符 E` -> `(((E1 运算符 E2) 运算符 E3) ... 运算符 En)`
- 二元右折叠: `(E 运算符 ... 运算符 I)` -> `(E1 运算符 (... 运算符 (EN−1 运算符 (EN 运算符 I))))`
- 二元左折叠: `(I 运算符 ... 运算符 E)` -> `((((I 运算符 E1) 运算符 E2) 运算符 ...) 运算符 EN)`

简单说来，就是看 ... 在形参包的左边还是右边，在哪边就是什么折叠。

### 简单示例

还记得我们前面实现的 print 函数吗，在函数变参模板里的那个，我们是创建了一个丑陋的数组靠着初始化的副作用来实现打印的，但是有了折叠表达式后，我们就可以写出如下模板:

```cpp
template <typename... Args>
void print(const Args&... args)
{
  ((std::cout << args << ' '), ...);
  std::cout << '\n';
}

::print("lusa", 1, 2.5);  // Output: lusa 1 2.5
```

我们详细说一下这个例子，首先它很显然是一个一元右折叠，且按照语法，`E 运算符 ...`，其中 E 就是 `(std::cout << args << ' ')`，运算符是逗号运算符。

那么根据折叠规则，它会被展开为:

```cpp
void print(const char(&args0)[5], const int& args1, const double& args2)
{
  ( (std::cout << args0 << ' '), ( (std::cout << args1 << ' '), (std::cout << args2 << ' ') ) );
  std::cout << '\n';
}
```

然后根据逗号运算符的规则，该表达式从左到右执行，并返回最后一个表达式的值，因此最终会依次打印所有参数。

初次看会比较绕，不过没有必要数括号，用的多了就好，特别是逗号表达式让折叠变得非常简洁，下面我们通过一些示例，详细说明折叠表达式的语法。

### 一元折叠

```cpp
template <typename... Args>
void printl(const Args&... args)
{
  (..., (std::cout << args << ' '));
  std::cout << '\n';
}

::printl("lusa", 1, 2.5);  // Output: lusa 1 2.5
```

这个例子显然就是一元左折叠，但是你可以看出，它的输出结果和一元右折叠是完全一致的，可以看一下实例化结果:

```cpp
void printl(const char(&args0)[5], const int& args1, const double& args2)
{
  ( ( (std::cout << args0 << ' '), (std::cout << args1 << ' ') ), (std::cout << args2 << ' ') );
  std::cout << '\n';
}
```

这时就会发现，这个括号其实根本不影响执行顺序，因为 `,` 不做任何运算，因此对于折叠表达式来说，**一元左折叠和一元右折叠在使用逗号运算符时是等价的**。

但是对于其他运算符这个结论就需要注意了:

```cpp
template <int... Args>
constexpr int v_right = (Args - ...);

template <int... Args>
constexpr int v_left = (... - Args);

std::cout << v_right<1, 2, 3> << '\n';  // 2
std::cout << v_left<1, 2, 3> << '\n';   // -4
```

本质上来说，它们都是严格按照折叠规则进行展开，其中逗号运算符比较特殊的原因就在于它不做任何运算，因而展开后的括号在运算时是直接去除的，而其他运算符则会严格按照括号进行计算，因此结果就会不同。

### 二元折叠

这个不常用，只要可以判断是左折叠还是右折叠，然后对应展开就好，这里看一个例子就可以了:

```cpp
template <typename... Args>
void printwt(const Args&... args)
{
  (std::cout << ... << args);
  std::cout << '\n';
}
```

## 待决名

待决名（Dependent Name）是模板编程中一个非常重要的概念，只要你写模板，就一定会遇到并处理它。简单来说，**待决名就是在模板中依赖于模板参数写的名字**，因为模板参数在实例化之前是未知的，所以编译器在模板定义阶段无法确定这些名字到底代表什么（类型？变量？函数？模板？）。

### 核心问题：编译器的困惑

我们前面多次说到，当编译器处理模板代码时，它会进行**两阶段处理**：

1. **定义阶段**：检查模板的语法，但模板参数还不知道具体是什么
2. **实例化阶段**：用具体类型替换模板参数，生成真正的代码

问题在于：在定义阶段，编译器看到 `T::type` 时，不知道 `type` 是个类型还是静态变量(因为 T 可能为类或结构体)：

```cpp
template<typename T>
void f() {
  T::type * p;  // 是 "类型 type 的指针 p"？还是 "T::type 乘以 p"？
}
```

这种歧义就是待决名需要解决的核心问题，既然定义时无法确认，那在实例化时确认就好了，接下来几种方式都是这样。

### typename 消除歧义符

**规则**：当你在模板中使用 `T::xxx` 形式，且 `xxx` 是个类型时，必须加 `typename` 告诉编译器这是一个类型。

```cpp
template<typename T>
const T::type& f(const T&) {  // 错误！编译器不认为 T::type 是类型
  return 0;
}

template<typename T>
const typename T::type& f(const T&) {  // 正确！用 typename 明确告诉编译器
  return 0;
}
```

一个常见的使用场景是在使用标准库容器的迭代器类型时：

```cpp
template<typename T>
void foo(const std::vector<T>& v) {
  // 错误：编译器不知道 const_iterator 是类型
  std::vector<T>::const_iterator it = v.begin();

  // 正确：加上 typename
  typename std::vector<T>::const_iterator it = v.begin();
}
```

值得注意的是，如果已经通过 `typedef` 或 `using` 将待决名设立为类型名，则后续使用时不需要再加 `typename`：

```cpp
template<typename T>
void foo(const std::vector<T>& v) {
  typedef typename std::vector<T>::const_iterator iter_t;
  iter_t it = v.begin();  // OK，iter_t 已经被设立为类型名
}
```

> 注意：即使名字并非待决，也允许使用 `typename` 前缀，只是没什么实际作用。

### template 消除歧义符

**规则**：当你在模板中调用一个依赖于模板参数的成员模板时，需要加 `template` 告诉编译器这是一个模板。

```cpp
template<typename T>
struct S {
  template<typename U>
  void foo() {}
};

template<typename T>
void bar() {
  S<T> s;
  s.foo<T>();          // 错误！编译器把 < 当成小于号
  s.template foo<T>(); // 正确！告诉编译器 foo 是模板
}
```

**`template` 只能用在三个运算符后面**：

- `::` （作用域解析）
- `->` （指针成员访问）
- `.`  （成员访问）

```cpp
T::template foo<X>();      // :: 之后
s.template foo<X>();       // .  之后
this->template foo<X>();   // -> 之后
typename T::template iterator<int>::value_type v;  // 复合使用
```

> 注意：`template` 的使用比 `typename` 少见，msvc 在某些情况下即使不加 `template` 也能编译通过，但这是非标准的，不要依赖这种行为。

### 绑定规则

对待决名和非待决名的名字查找和绑定有所不同：

**非待决名在模板定义点查找并绑定，即使在模板实例化点有更好的匹配，也保持此绑定**。

```cpp
void g(double) { std::cout << "g(double)\n"; }

template<class T>
struct S {
    void f() const {
        g(1);  // g 不依赖 T，是非待决名，在这里就绑定到 g(double)
    }
};

void g(int) { std::cout << "g(int)\n"; }  // 定义太晚了！

int main() {
    g(1);      // 调用 g(int)
    S<int> s;
    s.f();     // 调用 g(double)，不是 g(int)！
}
```

这个例子中，`g(1)` 按直觉应该调用 `g(int)`，但实际调用的是 `g(double)`。原因是 `g` 不依赖模板参数 `T`，所以是**非待决名**，在模板定义时就绑定了，此时只能看到 `g(double)`。

### 继承模板基类时的查找陷阱

这是最容易出错的地方：

```cpp
template<class T>
struct X {
    void f() const { std::cout << "X\n"; }
};

void f() { std::cout << "全局\n"; }

template<class T>
struct Y : X<T> {
    void t() const {
        this->f();  // 输出 "X"
    }
    void t2() const {
        f();        // 输出 "全局" ！
    }
};

int main() {
    Y<void> y;
    y.t();   // X
    y.t2();  // 全局
}
```

为什么会这样？

- `this->f()` 是**待决名**（因为 `this` 的类型依赖于 `T`），查找会延迟到实例化时，届时能找到基类的 `f()`
- `f()` 是**非待决名**，在定义时就查找，而**无限定名字查找不会检查依赖于模板参数的基类作用域**（在定义点和实例化点都不会），所以只找到全局的 `f()`

### 总结

待决名的规则虽然繁杂，但核心就是理解编译器的两阶段处理机制：在定义阶段，编译器对于依赖模板参数的名字无法确定其含义，因此需要我们通过 `typename` 和 `template` 关键字来消除歧义，或者通过 `this->` 等方式让名字变成待决名以延迟查找。

再简单的说: **待决名在实例化阶段查找，非待决名则在定义阶段查找**。

## SFINAE

SFINAE 是 "Substitution Failure Is Not An Error" 的缩写，即"代换失败不是错误"。这是 C++ 模板元编程中非常重要的特性：**当模板形参在替换成显式指定的类型或推导出的类型失败时，从重载集中丢弃这个特化，而非导致编译失败**。

### 代换失败与硬错误

首先需要区分两个概念：

- **代换失败（SFINAE 错误）**：在函数类型或其模板形参类型的 **立即语境** 中的失败，只会导致该特化被丢弃
- **硬错误**：如果代换后的类型/表达式的求值导致**副作用**（如实例化某模板特化），这些副作用中的错误会导致编译失败

```cpp
template<typename A>
struct B { using type = typename A::type; };  // 实例化 B 会产生副作用

template<
    class T,
    class U = typename T::type,      // 如果 T 没有 type，这是 SFINAE 失败
    class V = typename B<T>::type>   // 如果 T 没有 type，这是硬错误（实例化 B 失败）
void foo(int) { std::puts("SFINAE T::type B<T>::type"); }

template<typename T>
void foo(double) { std::puts("SFINAE T"); }

int main() {
    struct C { using type = int; };
    foo<B<C>>(1);   // 输出: SFINAE T::type B<T>::type
    foo<void>(1);   // 输出: SFINAE T（U 的代换先失败，是 SFINAE 错误）
}
```

`foo<void>(1)` 为什么能编译通过？因为 `typename void::type` 这显然是非良构的，但它发生在 **立即语境** 中，所以是代换失败而非硬错误。编译器丢弃了 `foo(int)` 这个特化，转而选择 `foo(double)`。

> 注意：标准保证 `V = typename B<T>::type` 不会产生硬错误，因为 `U` 的代换会首先失败。

### 基础使用示例

利用 SFINAE，我们可以约束函数模板接受的类型：

```cpp
template<typename T>
auto add(const T& t1, const T& t2) -> decltype(t1 + t2) {
    return t1 + t2;
}
```

这里使用了后置返回类型，`decltype(t1 + t2)` 要求 `T` 类型必须支持 `operator+`。如果不支持，就是代换失败，该特化被丢弃。

**为什么要这样写？不使用 SFINAE，如果类型没有 `operator+` 不也会编译错误吗？**

区别在于：
- 不使用 SFINAE：编译器尝试实例化模板，在实例化过程中发现没有 `operator+`，报错信息可能非常难读
- 使用 SFINAE：编译器在代换阶段就发现失败，直接报"未找到匹配的重载函数"，错误信息清晰

此外，实例化模板是有编译开销的，使用 SFINAE 可以减少不必要的实例化。

### std::enable_if

标准库提供的 SFINAE 工具，定义如下：

```cpp
template<bool B, class T = void>
struct enable_if {};

template<class T>
struct enable_if<true, T> { using type = T; };  // 只有 B 为 true 才有 type

template<bool B, class T = void>
using enable_if_t = typename enable_if<B, T>::type;  // C++14
```

用法：当第一个模板参数为 `true` 时，`enable_if` 有 `type` 成员；否则没有，触发 SFINAE。

```cpp
// 写法一：作为默认模板参数
template<typename T, typename = std::enable_if_t<std::is_integral_v<T>>>
void f(T) { std::puts("integral"); }

// 写法二：作为非类型模板参数（更常用）
template<typename T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
void g(T) { std::puts("integral"); }
```

写法二的原理：如果条件为 `true`，`std::enable_if_t<true, int>` 就是 `int`，整个变成 `int = 0`，这是一个有默认值的非类型模板参数。如果条件为 `false`，`enable_if_t` 没有 `type`，代换失败。

而之所以选择第二种写法，是因为在 cpp 中，默认参数不参与函数签名的区分，因为对于不同的判断条件，是会导致重定义的，但是第二种写法直接搞成一个非类型模板参数，这样就可以避免重定义的问题。

### std::void_t

C++17 引入，定义极其简单：

```cpp
template<class...>
using void_t = void;
```

接受任意个数的类型参数，始终是 `void`。它的作用是提供一个方便的语境来检测类型特征：

```cpp
// 要求 T 支持 +，有别名 type，有成员 value 和 f
template<typename T, typename = std::void_t<
    decltype(T{} + T{}),
    typename T::type,
    decltype(&T::value),
    decltype(&T::f)>>
auto add(const T& t1, const T& t2) {
    return t1 + t2;
}

struct Test {
    int operator+(const Test& t) const { return value + t.value; }
    void f() const {}
    using type = void;
    int value;
};

Test t1{1}, t2{2};
add(t1, t2);  // OK
// add(1, 2); // 错误：未找到匹配的重载函数
```

每个检查项的含义：
- `decltype(T{} + T{})`：检查是否支持 `+` 运算符
- `typename T::type`：检查是否有类型别名 `type`
- `decltype(&T::value)`：检查是否有成员 `value`（成员指针语法）
- `decltype(&T::f)`：检查是否有成员 `f`

### std::declval

```cpp
template<class T>
typename std::add_rvalue_reference<T>::type declval() noexcept;
```

将任意类型 `T` 转换成引用类型，**使得在 decltype 等不求值语境中不必经过构造函数就能使用成员函数**。

前面 `decltype(T{} + T{})` 的写法有个问题：它要求 `T` 必须支持默认构造。使用 `std::declval` 可以解决：

```cpp
template<typename T, typename = std::void_t<
    decltype(std::declval<T>() + std::declval<T>())>>
auto add(const T& t1, const T& t2) {
    return t1 + t2;
}

struct X {
    X(int) {}  // 没有默认构造函数
    int operator+(const X&) const { return 0; }
};

X x1{1}, x2{2};
add(x1, x2);  // OK，即使 X 没有默认构造函数
```

`std::declval` 还可以用来更精确地检查成员函数的签名：

```cpp
// 要求 T 有成员函数 f(int)
template<typename T, typename = decltype(std::declval<T>().f(1))>
void test(int) { std::puts("f(int)"); }

// 要求 T 有成员函数 f()
template<typename T, typename = decltype(std::declval<T>().f())>
void test(double) { std::puts("f()"); }

struct A { void f() const {} };
struct B { void f(int) const {} };

test<A>(1);  // 输出 f()，虽然传入 int，但 A::f 不接受参数
test<B>(1);  // 输出 f(int)
```

### 偏特化中的 SFINAE

类模板和变量模板的偏特化中也可以使用 SFINAE：

```cpp
template<typename T, typename = void>
struct has_type : std::false_type {};

template<typename T>
struct has_type<T, std::void_t<typename T::type>> : std::true_type {};

struct A { using type = int; };
struct B {};

static_assert(has_type<A>::value);   // true
static_assert(!has_type<B>::value);  // true
```

当 `T` 有 `type` 成员时，偏特化版本的 `std::void_t<typename T::type>` 合法，得到 `void`，与主模板的第二个参数默认值相同，所以偏特化更特殊，被选中。

当 `T` 没有 `type` 成员时，偏特化中的代换失败，但这不是硬错误，只是忽略该偏特化，选择主模板。

### 总结

| 工具 | 作用 |
|------|------|
| `std::enable_if` | 根据条件启用/禁用模板 |
| `std::void_t` | 检测类型是否具有某些特征 |
| `std::declval` | 在不求值语境中获取类型的引用，无需构造 |

SFINAE 的核心就是一句话：**代换失败不是错误**。利用这个特性，我们可以在编译期根据类型特征选择不同的模板实现。虽然 SFINAE 的写法有时比较繁琐，但 C++20 的约束与概念提供了更优雅的替代方案。

## 约束与概念

C++20 引入了约束（constraint）与概念（concept），这是模板编程的重大改进。有了它，我们可以用更直观、更简洁的语法来约束模板参数，而不再需要依赖 SFINAE 的各种技巧。

### 定义与使用概念

概念的定义语法：

```cpp
template<模板形参列表>
concept 概念名 = 约束表达式;
```

约束表达式只需要是编译期能产生 `bool` 值的表达式即可。

```cpp
// 定义概念：要求类型支持 + 运算符
template<typename T>
concept Addable = requires(T a) {
    a + a;  // 要求表达式 a + a 是合法的
};

// 使用概念约束模板参数
template<Addable T>
auto add(const T& t1, const T& t2) {
    return t1 + t2;
}
```

使用概念非常简单，只需要把 `typename` 或 `class` 换成概念名即可。如果类型不满足概念的要求，编译器会报"未满足关联约束"的清晰错误。

概念是编译期求值的谓词，可以直接当 `bool` 值使用：

```cpp
std::cout << std::boolalpha << Addable<int> << '\n';       // true
std::cout << std::boolalpha << Addable<char[10]> << '\n';  // false
constexpr bool r = Addable<int>;                           // true
```

### 标准库概念

C++20 在 `<concepts>` 头文件中提供了大量预定义的概念：

```cpp
#include <concepts>

// 要求参数必须是整数类型
template<std::integral T>
void f(T) {}

// 简写函数模板中使用概念
decltype(auto) max(const std::integral auto& a, const std::integral auto& b) {
    return a > b ? a : b;
}

max(1, 2);    // OK
max(1.0, 2);  // 错误：未满足关联约束
```

`std::integral` 的实现非常简单：

```cpp
template<class T>
concept integral = std::is_integral_v<T>;
```

常用的标准库概念：

| 概念 | 含义 |
|------|------|
| `std::integral` | 整数类型 |
| `std::floating_point` | 浮点类型 |
| `std::same_as<T, U>` | T 和 U 是相同类型 |
| `std::convertible_to<From, To>` | From 可转换为 To |
| `std::derived_from<D, B>` | D 派生自 B |
| `std::invocable<F, Args...>` | F 可以用 Args... 调用 |

### requires 子句

`requires` 子句用于在模板声明中指定约束：

```cpp
// 写法一：template 之后（推荐）
template<typename T>
    requires std::is_same_v<T, int>
void f(T) {}

// 写法二：函数声明末尾
template<typename T>
void f2(T) requires std::integral<T> {}

// 写法三：使用概念
template<typename T>
    requires Addable<T>
void f3(T) {}
```

`requires` 子句期待一个编译期 `bool` 表达式，所以下面的写法也是合法的：

```cpp
template<typename T>
    requires true  // 总是满足
void f(T) {}
```

### 约束的合取与析取

约束可以用 `&&` 和 `||` 组合：

```cpp
template<typename T>
concept Integral = std::is_integral_v<T>;

template<typename T>
concept SignedIntegral = Integral<T> && std::is_signed_v<T>;

template<typename T>
concept UnsignedIntegral = Integral<T> && !SignedIntegral<T>;

template<typename T>
concept Number = std::integral<T> || std::floating_point<T>;
```

合取和析取都是短路求值的：

```cpp
// 如果左侧不满足，右侧不会进行模板实参替换
template<typename T>
    requires (sizeof(T) > 1 && T::value)  // 如果 sizeof(T) <= 1，不会检查 T::value
void f(T) {}
```

### requires 表达式

`requires` 表达式产生一个编译期 `bool` 值，用于检测表达式是否合法：

```cpp
requires { 要求序列 }
requires (形参列表) { 要求序列 }
```

要求序列有四种形式：

**1. 简单要求**：检查表达式是否合法

```cpp
template<typename T>
concept Addable = requires(T a, T b) {
    a + b;  // 要求 a + b 是合法表达式
};

template<typename T>
concept Swappable = requires(T&& a, T&& b) {
    swap(std::forward<T>(a), std::forward<T>(b));
};
```

**2. 类型要求**：检查类型是否存在

```cpp
template<typename T>
concept HasType = requires {
    typename T::type;       // 要求嵌套类型 type 存在
    typename T::value_type; // 要求嵌套类型 value_type 存在
};
```

**3. 复合要求**：检查表达式的属性

```cpp
template<typename T>
concept C = requires(T x) {
    // 表达式 *x 必须合法，且结果可转换为 typename T::inner
    { *x } -> std::convertible_to<typename T::inner>;

    // 表达式 x + 1 必须合法，且结果类型是 int
    { x + 1 } -> std::same_as<int>;

    // 表达式 x.~T() 必须合法且不抛异常
    { x.~T() } noexcept;
};
```

复合要求的语法：`{ 表达式 } noexcept(可选) -> 类型约束(可选);`

**4. 嵌套要求**：在 requires 表达式中嵌套约束

```cpp
template<typename T>
concept C = requires(T a) {
    requires std::is_same_v<T*, decltype(&a)>;  // 要求表达式求值为 true
    requires sizeof(a) > 4;                      // 要求 sizeof(a) > 4
    requires requires { a + a; };                // 嵌套 requires 表达式
};
```

### requires requires 的解释

有时候会看到两个 `requires` 连用：

```cpp
template<typename T>
void f(T) requires requires(T t) { t + t; } {}
```

这不是语法错误，而是两个不同的东西：
- 第一个 `requires` 是 **requires 子句**，引入约束
- 第二个 `requires` 是 **requires 表达式**，产生 `bool` 值

因为 requires 子句期待一个 `bool` 表达式，而 requires 表达式正好产生 `bool` 值，所以可以连用。

### 概念用于偏特化

概念可以用于类模板偏特化，比 SFINAE 更简洁：

```cpp
template<typename T>
concept HasType = requires { typename T::type; };

// 主模板
template<typename T>
struct X {
    static void f() { std::puts("主模板"); }
};

// 偏特化：只有满足 HasType 概念才选择此版本
template<HasType T>
struct X<T> {
    using type = typename T::type;
    static void f() { std::puts("偏特化 T::type"); }
};

struct A { using type = int; };
struct B {};

X<A>::f();  // 偏特化 T::type
X<B>::f();  // 主模板
```

### SFINAE vs 概念对比

同样的需求，用 SFINAE 和概念的写法对比：

```cpp
// SFINAE 写法
template<typename T, typename = std::void_t<decltype(std::declval<T>() + std::declval<T>())>>
auto add_sfinae(const T& a, const T& b) {
    return a + b;
}

// 概念写法
template<typename T>
concept Addable = requires(T a) { a + a; };

template<Addable T>
auto add_concept(const T& a, const T& b) {
    return a + b;
}
```

概念的优势：
- **语法更直观**：直接表达意图，不需要理解 SFINAE 的技巧
- **错误信息更清晰**：编译器会明确告诉你哪个约束不满足
- **可复用**：定义一次概念，到处使用
- **可组合**：用 `&&` 和 `||` 轻松组合约束

### 总结

| 语法 | 用途 |
|------|------|
| `concept 名字 = 约束表达式` | 定义概念 |
| `template<概念 T>` | 用概念约束模板参数 |
| `requires 约束表达式` | requires 子句，指定约束 |
| `requires { ... }` | requires 表达式，检测表达式是否合法 |

约束与概念是 C++20 最重要的特性之一，它让模板编程变得更加直观和安全。如果你的项目可以使用 C++20，强烈建议用概念替代 SFINAE。
