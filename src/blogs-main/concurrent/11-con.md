---
title: 11 无锁栈的多种实现

article: true
order: 11
star: false

category:
  - 并发

tag:
  - cpp

date: 2025-09-19

description: 无锁栈的实现和优化，包含多种实现
footer: Always coding, always learning
---

<!-- more -->

# 11 无锁栈的多种实现

在前文，我们介绍了无锁队列，此处我们是否可以直接替换结构实现呢，很遗憾，这是不行的，因为无锁队列在双端均有操作，且多个插槽是不断使用的，但是无锁栈主要对 _top 进行操作，更多的问题是对这个变量的激烈竞争，我们要考虑的是如何来解决这个竞争，以及可能带来的其他问题。

对于无锁栈的经典实现是: **侵入式链表 + 原子头指针**，接下来我们先来分析一下。

## 基本实现

首先整体思路非常简单，我们只需要维护一个链表，当 pop 时取出头，push 时往头部放入，之所以不选择在尾部进行，对链表有点基础的应该都了解，然后同步更新一个原子的头指针即可。

看起来不难，我们直接实现一下并测试，就会发现两个问题：

- **慢**: 吞吐只有 6~9 M，甚至比我们前面实现的有锁栈还慢。
- **卡死**: 在高争用条件下甚至无法正常退出程序。

原因也很简单，在高争用条件下，对头指针疯狂的CAS操作会导致大量的 CPU 空转，浪费性能，且完全有可能出现 ABA 问题，在此处这个问题是十分严重的，因为一个线程看不到其他的改动，比如说指针的前进和回退完全可能导致一个恶劣的结果 —— **指针成环**，这就导致了程序无法退出，还有链表节点不断的内存分配和回收带来的性能损耗。

这些都是原来这个简单的思路的不足之处，我们一个一个解决，先看一下实现，后面有解析:

```cpp
#if defined(__cpp_lib_hardware_interference_size)
constexpr size_t CACHE_LINE_SIZE = std::hardware_destructive_interference_size;
#else
constexpr size_t CACHE_LINE_SIZE = 64;
#endif

class BackOff
{
public:
  void pause()
  {
    for (unsigned i = 0; i < _count; i++) cpu_pause();
    if (_count < 1024) _count *= 2;
  }

  void reset()
  {
    _count = 1;
  }

private:
  void cpu_pause()
  {
// x86 架构
#if defined(__x86_64__) || defined(__i386__)
    __builtin_ia32_pause();
// ARM 架构
#elif defined(__arm__) || defined(__aarch64__)
    __asm__ __volatile__("yield");
// 其他架构
#else
    std::this_thread::yield();
#endif
  }

  int _count = 1;
};

template <typename T>
struct Node
{
  Node<T>* _next;
  alignas(T) std::array<std::byte, sizeof(T)> _storage;

  T* data() noexcept
  {
    return std::launder(reinterpret_cast<T*>(_storage.data()));
  }
};

template <typename T>
struct TaggedNode
{
  Node<T>* _ptr = nullptr;
  uintptr_t _tag = 0;

  bool operator==(const TaggedNode& other) const
  {
    return this->_ptr == other._ptr && this->_tag == other._tag;
  }
};

template <typename T, size_t Capacity>
class NodePool
{
public:
  NodePool()
  {
    _nodes_storage.reserve(Capacity);
    for (unsigned i = 0; i < Capacity; i++) _nodes_storage.emplace_back();
    for (unsigned i = 0; i < Capacity - 1; i++) _nodes_storage[i]._next = &_nodes_storage[i + 1];
    _nodes_storage[Capacity - 1]._next = nullptr;
    _head.store({&_nodes_storage[0], 0}, std::memory_order_relaxed);
  }

  Node<T>* acquire()
  {
    BackOff backoff;
    TaggedNode<T> old_head = _head.load(std::memory_order_relaxed);
    while (old_head._ptr)
    {
      TaggedNode<T> new_head;
      new_head._ptr = old_head._ptr->_next;
      new_head._tag = old_head._tag + 1;

      if (_head.compare_exchange_weak(old_head, new_head, std::memory_order_acquire, std::memory_order_relaxed))
      {
        return old_head._ptr;
      }
      backoff.pause();
    }
    return nullptr;
  }

  void release(Node<T>* node)
  {
    BackOff backoff;
    TaggedNode<T> old_head = _head.load(std::memory_order_relaxed);
    TaggedNode<T> new_head;
    do
    {
      node->_next = old_head._ptr;
      new_head._ptr = node;
      new_head._tag = old_head._tag + 1;

      if (_head.compare_exchange_weak(old_head, new_head, std::memory_order_release, std::memory_order_relaxed))
      {
        break;
      }
      backoff.pause();
    } while (true);
  }

private:
  alignas(CACHE_LINE_SIZE) std::atomic<TaggedNode<T>> _head{};
  std::vector<Node<T>> _nodes_storage;
};

template <typename T, size_t Capacity>
class TreiberStack
{
  static_assert(std::is_nothrow_constructible_v<T>, "T must be nothrow constructible for lock-free safety");
  static_assert(std::is_nothrow_move_constructible_v<T>, "T must be nothrow move constructible for lock-free safety");

public:
  TreiberStack() = default;
  ~TreiberStack()
  {
    while (pop().has_value())
    {
    }
  }

  TreiberStack(const TreiberStack&) = delete;
  TreiberStack& operator=(const TreiberStack&) = delete;

  template <typename... Args>
  bool emplace(Args&&... args)
  {
    Node<T>* node = _pool.acquire();
    if (!node)
    {
      return false;
    }

    std::construct_at(node->data(), std::forward<Args>(args)...);

    BackOff backoff;
    TaggedNode<T> old_head = _head.load(std::memory_order_relaxed);
    TaggedNode<T> new_head;
    do
    {
      node->_next = old_head._ptr;
      new_head._ptr = node;
      new_head._tag = old_head._tag + 1;
      if (_head.compare_exchange_weak(old_head, new_head, std::memory_order_release, std::memory_order_relaxed))
      {
        return true;
      }
      backoff.pause();
    } while (true);
  }

  bool push(const T& value)
  {
    return emplace(value);
  }

  bool push(T&& value)
  {
    return emplace(std::move(value));
  }

  std::optional<T> pop()
  {
    BackOff backoff;
    TaggedNode<T> old_head = _head.load(std::memory_order_relaxed);
    TaggedNode<T> new_head;
    while (old_head._ptr)
    {
      Node<T>* next = old_head._ptr->_next;
      new_head._ptr = next;
      new_head._tag = old_head._tag + 1;

      if (_head.compare_exchange_weak(old_head, new_head, std::memory_order_acquire, std::memory_order_relaxed))
      {
        T value = std::move(*old_head._ptr->data());
        std::destroy_at(old_head._ptr->data());
        _pool.release(old_head._ptr);
        return value;
      }
      backoff.pause();
    }
    return std::nullopt;
  }

private:
  alignas(CACHE_LINE_SIZE) std::atomic<TaggedNode<T>> _head{};
  alignas(CACHE_LINE_SIZE) NodePool<T, Capacity> _pool;
};
```

### ABA

首先需要解决的是最为严重的 ABA 问题：

```cpp
template <typename T>
struct TaggedNode
{
  Node<T>* _ptr = nullptr;
  uintptr_t _tag = 0;

  bool operator==(const TaggedNode& other) const
  {
    return this->_ptr == other._ptr && this->_tag == other._tag;
  }
};
```

我们并不是直接以 `Node<T>*` 作为头指针，而是给它配备了一个 _tag，这个 _tag 会在 pop、push 时都增加，这样即使指针值相同，但如果发生过修改，_tag 也会不同，这个就是解决 ABA 问题的经典思路: **Tagged ptr**。

### 指数退避

同时我们也提到了多个线程不断的 CAS 导致的空转问题，还记得我们在介绍 **自旋锁** 的时候是如何解决的吗，没错，我们采用了指数退避的方式：

```cpp
class BackOff
{
public:
  void pause()
  {
    for (unsigned i = 0; i < _count; i++) cpu_pause();
    if (_count < 1024) _count *= 2;
  }

  void reset() { _count = 1; }
private:
  int _count = 1;
};
```

这样我们让线程 CAS 失败时让出一下 CPU，或者说简单休眠一下，就可以减少 CPU 的高争用了。

### 内存优化

然后对于链表的节点内存不断分配的问题，经典思想就是池化，即预先分配指定的节点数，然后后续直接取出节点或者归还，这样不止能避免频繁的 malloc/free 开销，也能减少内存碎片。

```cpp
template <typename T, size_t Capacity>
class NodePool
{
private:
  alignas(CACHE_LINE_SIZE) std::atomic<TaggedNode<T>> _head{};
  std::vector<Node<T>> _nodes_storage;
};
```

### 其他

除此以外我们还做了多种其他优化，因为前面几节多次说了，此处不再赘述：

内存对齐、内存序优化、类型安全等等。

### 测试

在这么多优化之后，性能会怎么样呢，可以看下测试函数，此处给出测试结果：

```txt
➜  11-unlock-stack git:(main) ✗ ./a.out
Starting throughput test with 8 threads, 5000000 operations per thread.
Test finished.
Total time: 390.359 ms
Total operations: 40000000.000000
Throughput: 102.469669 M ops/sec
```

没错，足足破亿的吞吐了，且单侧和基准测试都通过，完全可用于生产。

不过值得注意的是，我们的原子头指针是一个 16 字节的变量，因此受困于平台限制，在链接时需要加入 `-latomic` 才可以通过编译。

## 消除回退优化

接下来介绍一种优化策略 —— **消除回退**。

首先，我们回顾一下精心优化后的 TreiberStack，它通过标记指针解决了ABA问题，通过指数退避缓解了高争用。但它有一个无法避免的问题：

**无论如何优化，所有线程、所有操作都必须经过 _head 这个唯一的原子变量。**

那这里就发问了: 是不是所有的操作都必须走这个变量来操作主栈呢？

很显然不是，这样一个场景: 线程 A 要pop了，然后线程 B 同时要push，那常规思路是线程 B 先放入主栈，然后由 A 拿走，这时，可恶的中间商也就是主栈没有发生任何变化，但是资源确实是占用了，如果说 **线程 B 直接把数据给线程 A**，这样是不是效果完全一样，而且没有走主栈呢？

此时 push 和 pop 操作就像正负电子一样融合了，这个操作就叫 **消除**。

### 设计思路

那实现上也很简单，我们只需要开一个消除数组：

```cpp
std::array<std::atomic<TaggedNode<T>>, EliminationArraySize> _elimination_array;
```

这个类似于一个副栈，当主栈竞争过于激烈时，线程就会来这个副栈碰碰运气，如果能实现消除，就可以直接返回而不竞争主栈了对吧。

此时，我们的操作思路变成了：

- **emplace**: 先走主栈，失败就去副栈随便找个位置，如果发现这个位置有人需要我的数据，那就把数据给它，完成操作，否则就重新去竞争主栈。

- **pop**: 同样先走主栈，失败就去副栈找个位置摆摊一段时间，如果这段时间内有人来，也就是emplace，那我们就成功交换消除，否则也回到主栈操作。

这样我们就实现了一个混合策略: **低争用保持先前策略，高争用可以走副栈**。

### 代码实现

基础组件如节点池一类的保持不变，只需要实现栈主体即可：

```cpp
template <typename T, size_t Capacity, size_t EliminationArraySize = 8>
class EliminationBackoffStack
{
private:
  Node<T>* const POPPER_MARKER = reinterpret_cast<Node<T>*>(this);
  static constexpr int ELIMINATION_ATTEMPTS = 5;

public:
  EliminationBackoffStack()
  {
    for (auto& slot : _elimination_array)
    {
      slot.store({nullptr, 0}, std::memory_order_relaxed);
    }
  }
  ~EliminationBackoffStack()
  {
    while (pop().has_value())
    {
    }
  }

  EliminationBackoffStack(const EliminationBackoffStack&) = delete;
  EliminationBackoffStack& operator=(const EliminationBackoffStack&) = delete;

  template <typename... Args>
  bool emplace(Args&&... args)
  {
    Node<T>* node = _pool.acquire();
    if (!node) return false;

    std::construct_at(node->data(), std::forward<Args>(args)...);

    BackOff backoff;
    TaggedNode<T> old_head = _head.load(std::memory_order_relaxed);

    // 1. 直接操作主栈
    for (unsigned i = 0; i < ELIMINATION_ATTEMPTS; ++i)
    {
      TaggedNode<T> new_head;
      node->_next = old_head._ptr;
      new_head._ptr = node;
      new_head._tag = old_head._tag + 1;

      if (_head.compare_exchange_weak(old_head, new_head, std::memory_order_release, std::memory_order_relaxed))
      {
        return true;
      }
      backoff.pause();
    }

    // 2. 进入退避栈尝试
    if (try_eliminate_push(node))
    {
      return true;
    }

    // 3. 退避栈不行，直接在主栈一直轮询
    backoff.reset();
    old_head = _head.load(std::memory_order_relaxed);
    do
    {
      TaggedNode<T> new_head;
      node->_next = old_head._ptr;
      new_head._ptr = node;
      new_head._tag = old_head._tag + 1;

      if (_head.compare_exchange_weak(old_head, new_head, std::memory_order_release, std::memory_order_relaxed))
      {
        return true;
      }
      backoff.pause();
    } while (true);
  }

  bool push(const T& value)
  {
    return emplace(value);
  }
  bool push(T&& value)
  {
    return emplace(std::move(value));
  }

  std::optional<T> pop()
  {
    BackOff backoff;
    TaggedNode<T> old_head = _head.load(std::memory_order_relaxed);

    // 1. 主栈pop
    for (unsigned i = 0; i < ELIMINATION_ATTEMPTS; ++i)
    {
      if (!old_head._ptr) break;

      TaggedNode<T> new_head;
      new_head._ptr = old_head._ptr->_next;
      new_head._tag = old_head._tag + 1;

      if (_head.compare_exchange_weak(old_head, new_head, std::memory_order_acquire, std::memory_order_relaxed))
      {
        T value = std::move(*old_head._ptr->data());
        std::destroy_at(old_head._ptr->data());
        _pool.release(old_head._ptr);
        return value;
      }
      backoff.pause();
    }

    // 2. 进入退避栈处理
    Node<T>* eliminated_node = try_eliminate_pop();
    if (eliminated_node)
    {
      T value = std::move(*eliminated_node->data());
      std::destroy_at(eliminated_node->data());
      _pool.release(eliminated_node);
      return value;
    }

    // 3. 最后在主栈尝试一下，毕竟有可能是空的
    old_head = _head.load(std::memory_order_relaxed);
    while (old_head._ptr)
    {
      TaggedNode<T> new_head;
      new_head._ptr = old_head._ptr->_next;
      new_head._tag = old_head._tag + 1;

      if (_head.compare_exchange_weak(old_head, new_head, std::memory_order_acquire, std::memory_order_relaxed))
      {
        T value = std::move(*old_head._ptr->data());
        std::destroy_at(old_head._ptr->data());
        _pool.release(old_head._ptr);
        return value;
      }
      backoff.pause();
    }

    return std::nullopt;
  }

private:
  bool try_eliminate_push(Node<T>* node)
  {
    int idx = random_index();
    auto& slot = _elimination_array[idx];

    TaggedNode<T> old_slot = slot.load(std::memory_order_relaxed);
    if (old_slot._ptr == POPPER_MARKER)
    {
      TaggedNode<T> new_slot = {node, old_slot._tag + 1};
      if (slot.compare_exchange_strong(old_slot, new_slot, std::memory_order_acq_rel))
      {
        return true;
      }
    }
    return false;
  }

  Node<T>* try_eliminate_pop()
  {
    int idx = random_index();
    auto& slot = _elimination_array[idx];

    // 如果此时已经有一个 pusher
    TaggedNode<T> old_slot = slot.load(std::memory_order_relaxed);
    if (old_slot._ptr != nullptr && old_slot._ptr != POPPER_MARKER)
    {
      TaggedNode<T> new_slot = {nullptr, old_slot._tag + 1};
      if (slot.compare_exchange_strong(old_slot, new_slot, std::memory_order_acq_rel))
      {
        return old_slot._ptr;
      }
    }

    // 修改标记，并等待一会
    TaggedNode<T> expected_empty = {nullptr, slot.load(std::memory_order_relaxed)._tag};
    TaggedNode<T> new_marker = {POPPER_MARKER, expected_empty._tag + 1};
    if (slot.compare_exchange_strong(expected_empty, new_marker, std::memory_order_acq_rel))
    {
      BackOff backoff;
      for (unsigned i = 0; i < ELIMINATION_ATTEMPTS; ++i)
      {
        TaggedNode<T> current_slot = slot.load(std::memory_order_relaxed);
        if (current_slot._ptr != POPPER_MARKER)
        {
          TaggedNode<T> final_slot = {nullptr, current_slot._tag + 1};
          if (slot.compare_exchange_strong(current_slot, final_slot, std::memory_order_acquire))
          {
            return current_slot._ptr;
          }
        }
        backoff.pause();
      }

      TaggedNode<T> final_empty = {nullptr, slot.load(std::memory_order_relaxed)._tag + 1};
      slot.compare_exchange_strong(new_marker, final_empty, std::memory_order_release);
    }
    return nullptr;
  }

  int random_index()
  {
    thread_local static std::mt19937 generator(std::hash<std::thread::id>{}(std::this_thread::get_id()));
    std::uniform_int_distribution<int> distribution(0, EliminationArraySize - 1);
    return distribution(generator);
  }

  alignas(CACHE_LINE_SIZE) std::atomic<TaggedNode<T>> _head{};
  alignas(CACHE_LINE_SIZE) NodePool<T, Capacity> _pool;
  alignas(CACHE_LINE_SIZE) std::array<std::atomic<TaggedNode<T>>, EliminationArraySize> _elimination_array;
};
```

ok，这里的实现就是复刻了思路部分，不过多讲解了，因为思路和第一种无锁栈是完全一样的，经测试，该栈在 1024 个槽位时就可以实现亿级吞吐了，极大降低了内存消耗。

另外，这两种栈都是固定容量的，如果你需要变长的栈，可以去看一下 boost.lockfree.stack，这个实现也是非常巧妙的，唯一不足之处是需要引入一个第三方库。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/concurrent/11-unlock-stack/treiber_stack.cc)。

