---
title: 09 有锁栈、队列

article: true
order: 9
star: false

category:
  - 并发

tag:
  - cpp

date: 2025-08-30

description: 基于锁操作实现线程安全的栈和队列
footer: Always coding, always learning
---

<!-- more -->

# 09 有锁栈、队列

本节要实现的目标是: **基于锁操作的栈和队列**，有了前面的基础，本节的内容可以说是非常简单了。

## 有锁栈

基于锁的栈实现是最简单直接的并发数据结构之一，我们只需要在标准库的 `std::stack` 基础上添加一个互斥锁即可实现线程安全。

```cpp
template <typename T>
class LockStack
{
public:
  LockStack() = default;
  ~LockStack() = default;

  LockStack(const LockStack& other)
  {
    std::lock_guard<std::mutex> lock{other._mtx};
    _stack = other._stack;
  }

  LockStack& operator=(const LockStack& other)
  {
    if (this == &other) return *this;
    std::scoped_lock<std::mutex, std::mutex> lock{this->_mtx, other._mtx};
    this->_stack = other._stack;
    return *this;
  }

  LockStack(LockStack&& other) noexcept(std::is_nothrow_move_constructible_v<std::stack<T>>)
  {
    std::lock_guard<std::mutex> lock{other._mtx};
    _stack = std::move(other._stack);
  }

  LockStack& operator=(LockStack&& other) noexcept(std::is_nothrow_move_assignable_v<std::stack<T>>)
  {
    if (this == &other) return *this;
    std::scoped_lock<std::mutex, std::mutex> lock{this->_mtx, other._mtx};
    this->_stack = std::move(other._stack);
    return *this;
  }

  void push(const T& value)
  {
    std::lock_guard<std::mutex> lock{_mtx};
    _stack.push(value);
  }

  void push(T&& value)
  {
    std::lock_guard<std::mutex> lock{_mtx};
    _stack.push(std::move(value));
  }

  template <typename... Args>
  void emplace(Args&&... args)
  {
    std::lock_guard<std::mutex> lock{_mtx};
    _stack.emplace(std::forward<Args>(args)...);
  }

  bool try_pop(T& value)
  {
    std::lock_guard<std::mutex> lock{_mtx};
    if (_stack.empty()) return false;
    value = std::move_if_noexcept(_stack.top());
    _stack.pop();
    return true;
  }

  std::optional<T> pop() noexcept
  {
    static_assert(std::is_nothrow_move_constructible_v<T>, "this operation need T contains no throw in move cons");
    std::lock_guard<std::mutex> lock{_mtx};
    if (_stack.empty()) return std::nullopt;
    std::optional<T> result{std::move(_stack.top())};
    _stack.pop();
    return result;
  }

  std::optional<T> top() const
  {
    std::lock_guard<std::mutex> lock{_mtx};
    if (_stack.empty()) return std::nullopt;
    return std::optional<T>{_stack.top()};
  }

  bool empty() const noexcept
  {
    std::lock_guard<std::mutex> lock{_mtx};
    return _stack.empty();
  }

  size_t size() const noexcept
  {
    std::lock_guard<std::mutex> lock{_mtx};
    return _stack.size();
  }

  void clear() noexcept
  {
    std::lock_guard<std::mutex> lock{_mtx};
    while (!_stack.empty())
    {
      _stack.pop();
    }
  }

private:
  std::stack<T> _stack;
  mutable std::mutex _mtx;
};
```

值得注意的只有 2 点：

- mutex 应该使用 mutable 修饰，因为我们在一些 const 函数中使用到了。
- 使用 optional 处理空栈异常，而不是传统的 try、catch，当然也可以使用 `std::expected` 来代替这个。

整体的实现是非常简单的，我们给所有操作都上了锁，足以保证操作原子性和异常安全性，但是也正因为如此，性能开销是十分巨大的，会有大量的锁竞争，因此这个有锁栈只能用于并发程度不高的情况，大多就是原型的开发，对于更为高性能的无锁栈，我们在后续章节介绍。

## 有锁队列

那对应有锁队列的实现其实也大同小异，为了有一些区分，我们此处使用条件变量的方式来实现：

```cpp
template <typename T>
class LockQueue
{
public:
  LockQueue() = default;
  ~LockQueue() = default;

  LockQueue(const LockQueue& other)
  {
    std::lock_guard<std::mutex> lock{other._mtx};
    _queue = other._queue;
  }

  LockQueue& operator=(const LockQueue& other)
  {
    if (this == &other) return *this;
    std::scoped_lock<std::mutex, std::mutex> lock{this->_mtx, other._mtx};
    this->_queue = other._queue;
    if (!this->_queue.empty())
    {
      _cv.notify_all();
    }
    return *this;
  }

  LockQueue(LockQueue&& other) noexcept(std::is_move_constructible_v<std::queue<T>>)
  {
    std::lock_guard<std::mutex> lock{other._mtx};
    _queue = std::move(other._queue);
  }

  LockQueue& operator=(LockQueue&& other) noexcept(std::is_move_assignable_v<std::queue<T>>)
  {
    if (this == &other) return *this;
    std::scoped_lock<std::mutex, std::mutex> lock{this->_mtx, other._mtx};
    this->_queue = std::move(other._queue);
    if (!this->_queue.empty())
    {
      _cv.notify_all();
    }
    return *this;
  }

  void push(const T& value)
  {
    {
      std::lock_guard<std::mutex> lock{_mtx};
      _queue.push(value);
    }
    _cv.notify_one();
  }

  void push(T&& value)
  {
    {
      std::lock_guard<std::mutex> lock{_mtx};
      _queue.push(std::move(value));
    }
    _cv.notify_one();
  }

  template <typename... Args>
  void emplace(Args&&... args)
  {
    {
      std::lock_guard<std::mutex> lock{_mtx};
      _queue.emplace(std::forward<Args>(args)...);
    }
    _cv.notify_one();
  }

  bool try_pop(T& value)
  {
    std::lock_guard<std::mutex> lock{_mtx};
    if (_queue.empty()) return false;
    value = std::move_if_noexcept(_queue.front());
    _queue.pop();
    return true;
  }

  std::optional<T> pop() noexcept
  {
    static_assert(std::is_nothrow_move_constructible_v<T>, "this operation need T contains no throw in move cons");
    std::unique_lock<std::mutex> lock{_mtx};
    _cv.wait(lock, [this]() -> bool { return !_queue.empty(); });
    std::optional<T> result{std::move(_queue.front())};
    _queue.pop();
    return result;
  }

  bool empty() const noexcept
  {
    std::lock_guard<std::mutex> lock{_mtx};
    return _queue.empty();
  }

  size_t size() const noexcept
  {
    std::lock_guard<std::mutex> lock{_mtx};
    return _queue.size();
  }

  void clear() noexcept
  {
    std::lock_guard<std::mutex> lock{_mtx};
    while (!_queue.empty())
    {
      _queue.pop();
    }
  }

private:
  std::queue<T> _queue;
  mutable std::mutex _mtx;
  std::condition_variable _cv;
};
```

此时，再来看一下这两个实现，我们会发现，所有的操作都加了锁，好像除了保证操作的原子性没有任何好处，它只能确保所有读写操作串行化执行，但是由于锁的存在，它的效率本质上是比单线程更低的。

## 双锁队列优化

为了提高有锁队列的并发性能，我们可以通过分离头尾操作来实现更细粒度的锁控制。基本思想是：**队列的插入操作只需要对尾部加锁，删除操作只需要对头部加锁，这样就可以实现插入和删除操作的并行执行**。

下面是基于链表的双锁队列实现：

```cpp
template <typename T>
class LockQueueInList
{
public:
  LockQueueInList() : _head(new Node), _tail(_head), _size(0)
  {
  }

  ~LockQueueInList()
  {
    while (Node* const old_head = _head)
    {
      _head = _head->_next;
      delete old_head;
    }
  }

  LockQueueInList(const LockQueueInList&) = delete;
  LockQueueInList& operator=(const LockQueueInList&) = delete;

  void push(T item)
  {
    Node* const new_node = new Node();

    {
      std::lock_guard<std::mutex> lock{_tail_mtx};
      _tail->_data = std::move(item);
      _tail->_next = new_node;
      _tail = _tail->_next;
      _size.fetch_add(1, std::memory_order_acq_rel);
    }

    _size.notify_one();
  }

  std::optional<T> try_pop()
  {
    std::lock_guard<std::mutex> lock{_head_mtx};
    if (empty())
    {
      return std::nullopt;
    }
    return pop_head();
  }

  std::optional<T> pop()
  {
    std::unique_lock<std::mutex> lock{_head_mtx};
    while (true)
    {
      if (_size.load(std::memory_order_acquire) > 0)
      {
        return pop_head();
      }
      lock.unlock();
      _size.wait(0, std::memory_order_acquire);
      lock.lock();
    }
  }

  bool empty() const
  {
    return _size.load(std::memory_order_acquire) == 0;
  }

private:
  struct Node
  {
    std::optional<T> _data;
    Node* _next;

    Node() : _next(nullptr)
    {
    }
  };

  std::optional<T> pop_head()
  {
    Node* const old_head = _head;
    _head = old_head->_next;
    std::optional<T> result = std::move(old_head->_data);

    delete old_head;
    _size.fetch_sub(1, std::memory_order_acq_rel);

    return result;
  }

  Node* _head;
  Node* _tail;
  std::atomic<size_t> _size;
  mutable std::mutex _head_mtx;
  mutable std::mutex _tail_mtx;
};
```

这里说一下这个双端队列的设计优势：

- **分离头尾锁**：使用 `_head_mtx` 保护头部操作，`_tail_mtx` 保护尾部操作，实现读写操作的并行化。
- **原子计数器**：使用原子操作的 notify 系列操作实现高效的阻塞等待，避免使用传统的条件变量。

相比于单锁队列，本队列在高并发场景下效果更好，但是内存的分配确实是一个问题，可以留作自己动手: **如何为这个双锁队列设计一个节点内存池**？

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/concurrent/09-stack-queue/queue.cc)。
