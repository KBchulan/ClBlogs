---
title: 09 有锁散列表、链表

article: true
order: 9
star: false

category:
  - 并发

tag:
  - cpp

date: 2025-09-16

description: 基于读写锁的并发散列表实现，使用分桶策略优化并发性能，以及基本的并发链表
footer: Always coding, always learning
---
<!-- more -->

# 09有锁散列表、链表

本节要实现的目标是: **基于读写锁的并发散列表实现，使用分桶策略优化并发性能，以及基本的并发链表**。

## 散列表

散列表（Hash Table）是一种通过哈希函数将键映射到桶中的数据结构，从而实现高效的查找、插入和删除操作，核心在于：

- **哈希函数**：将任意键转换为数组索引的函数，最理想的哈希函数是能做到 **键均匀分布，且没有冲突**。
- **哈希冲突**：当两个不同的键映射到同一个索引时，即发生冲突，这就是哈希冲突，常见的解决方法是 **链表法、开放寻址法**。

在并发场景下，为了保证散列表的线程安全，必须对访问进行同步，一种简单的方法是使用单个全局锁来保护整个数据结构，但这会使所有操作串行化，严重限制并发性能。

更优的策略是采用 **分桶锁（Lock Striping）**，即为每个桶或一组桶分配独立的锁，这样，不同线程访问不同桶时可以并行执行，显著提高吞吐量。

```cpp
template <typename Key, typename Value, typename Hash = std::hash<Key>>
class LockLookupTable
{
private:
  class alignas(std::hardware_destructive_interference_size) bucket_type
  {
  private:
    using bucket_value = std::pair<Key, Value>;
    using bucket_data = std::vector<bucket_value>;
    using bucket_iterator = typename bucket_data::iterator;

    bucket_iterator find_entry_for(const Key& key)
    {
      return std::find_if(_data.begin(), _data.end(),
                          [&](const bucket_value& item) -> bool { return item.first == key; });
    }

  public:
    void add_or_update_node(const Key& key, const Value& value)
    {
      std::unique_lock<std::shared_mutex> lock{_sh_mtx};
      if (auto found = find_entry_for(key); found != _data.end())
        found->second = value;
      else
        _data.emplace_back(key, value);
    }

    void delete_node(const Key& key)
    {
      std::unique_lock<std::shared_mutex> lock{_sh_mtx};
      if (auto found = find_entry_for(key); found != _data.end())
      {
        *found = std::move(_data.back());
        _data.pop_back();
      }
    }

    Value value_for(const Key& key, const Value& default_value)
    {
      std::shared_lock<std::shared_mutex> lock{_sh_mtx};
      auto found = find_entry_for(key);
      return (found == _data.end()) ? default_value : found->second;
    }

  private:
    bucket_data _data;
    mutable std::shared_mutex _sh_mtx;
  };

public:
  LockLookupTable(unsigned size = 19, const Hash& hasher = Hash()) : _buckets(size), _hasher(hasher)
  {
    for (auto& bucket : _buckets)
    {
      bucket = std::make_unique<bucket_type>();
    }
  }

  LockLookupTable(const LockLookupTable&) = delete;
  LockLookupTable& operator=(const LockLookupTable&) = delete;

  void add_or_update_table(const Key& key, const Value& value = Value())
  {
    get_bucket(key).add_or_update_node(key, value);
  }

  void delete_table(const Key& key)
  {
    get_bucket(key).delete_node(key);
  }

  Value value_for(const Key& key, const Value& default_value = Value())
  {
    return get_bucket(key).value_for(key, default_value);
  }

private:
  std::vector<std::unique_ptr<bucket_type>> _buckets;
  Hash _hasher;

  bucket_type& get_bucket(const Key& key) const
  {
    const size_t index = _hasher(key) % _buckets.size();
    return *_buckets[index];
  }
};
```

这里简单说一下此结构的设计思想：

- **分桶策略与细粒度锁**： 散列表内部维护一个 `std::vector<std::unique_ptr<bucket_type>>`，即桶数组，然后外界传入 key 后通过 `std::hash` 算到对应索引，然后拿到对应的桶，这一步是无锁的，对桶的操作由其内部的共享锁进行控制，通过这种设计，不同线程可以并发地访问不同的桶。
- **读写锁的应用**： 读操作使用读锁，写操作则用独占锁，这种方案在保证安全的基础上进一步提高性能。
- **缓存行对齐**： 我们对每一个桶进行了内存对齐，从而避免伪共享导致的性能下降。

笔者测试环境为 arch 系统，逻辑核心有16，然后在混合读写场景下最高可到 40M 的操作速度，还是非常可观的。

## 链表

与前面我们已经实现过的几个结构不同，链表的节点在内存中不连续分布，这使得传统的锁策略在性能上更加不理想，特别是单个全局锁。

> 虽然可以使用内存池等策略来解决这个问题，但是为了更为广泛的使用，此处我们暂且不引入内存池。

为了在保证线程安全的前提下提高并发性能，我们需要采用更细粒度的锁策略，一种经典的方法是 **Hand-Over-Hand Locking**，即在遍历链表时，总是持有两个相邻节点的锁，确保在释放前一个节点的锁之前，下一个节点的锁已经被获取。

```cpp
template <typename T>
class LockList
{
private:
  struct alignas(std::hardware_destructive_interference_size) Node
  {
    std::shared_mutex _mtx;
    std::optional<T> _data;
    std::unique_ptr<Node> _next;

    Node() = default;

    Node(const T& data) : _data(std::make_optional<T>(data))
    {
    }
  };

public:
  LockList() = default;
  ~LockList()
  {
    remove_if([](auto&) -> bool { return true; });
  }

  LockList(const LockList&) = delete;
  LockList& operator=(const LockList&) = delete;

  void push_front(const T& value)
  {
    std::unique_ptr<Node> new_node = std::make_unique<Node>(value);
    std::unique_lock<std::shared_mutex> lock{_head._mtx};
    new_node->_next = std::move(_head._next);
    _head._next = std::move(new_node);
  }

  template <typename Predicate>
  void remove_if(Predicate p)
  {
    Node* current = &_head;
    std::unique_lock<std::shared_mutex> lock_cur{current->_mtx};

    while (Node* next = current->_next.get())
    {
      std::unique_lock<std::shared_mutex> lock_next{next->_mtx};
      if (p(next->_data.value()))
      {
        auto old_next = std::move(current->_next);
        current->_next = std::move(old_next->_next);
        lock_next.unlock();
      }
      else
      {
        lock_cur.unlock();
        current = next;
        lock_cur = std::move(lock_next);
      }
    }
  }

  template <typename Predicate>
  std::optional<T> find_first_of(Predicate p)
  {
    Node* current = &_head;
    std::shared_lock<std::shared_mutex> cur_lock{current->_mtx};
    while (Node* next = current->_next.get())
    {
      std::shared_lock<std::shared_mutex> next_lock{next->_mtx};
      cur_lock.unlock();
      if (p(next->_data.value()))
      {
        T result = next->_data.value();
        next_lock.unlock();
        return result;
      }
      current = next;
      cur_lock = std::move(next_lock);
    }
    return std::nullopt;
  }

  template <typename Function>
  void for_each(Function func)
  {
    Node* current = &_head;
    std::shared_lock<std::shared_mutex> cur_lock{current->_mtx};
    while (Node* next = current->_next.get())
    {
      std::shared_lock<std::shared_mutex> next_lock{next->_mtx};
      cur_lock.unlock();
      func(next->_data.value());
      current = next;
      cur_lock = std::move(next_lock);
    }
  }

private:
  Node _head;  // 虚节点
};
```

同样分析一下这个链表的设计思路：

- **锁耦合**：在遍历链表时，线程会先锁定当前节点，然后尝试锁定下一个节点，只有成功锁定之下一个节点后才会释放当前节点的锁，然后前进一步，这个过程就像手递手交接一样，也是这个 Hand-Over-Hand Locking 名称的由来。
- **细粒度锁**: 不同于用一个全局锁锁住整个链表，我们给每个节点都加了锁，确保不同部分可以并发处理。
- **虚头节点**: 经典处理了，可以简化 nullptr 等边界条件。

缓存行对齐和读写锁的优化和前面是一样的，这里不再重复介绍。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/concurrent/09-table-list/table.cc)。
