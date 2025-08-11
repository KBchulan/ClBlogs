---
title: 03 同步原语与死锁

article: true
order: 3
star: false

category:
  - 并发

tag:
  - cpp

date: 2025-08-11

description: 介绍常见的 7 种锁，以及它们的底层实现，还有死锁的产生与避免。
footer: Always coding, always learning
---

<!-- more -->

# 03 同步原语与死锁

先考虑一个问题：假如有一个全局变量 i，两个线程的回调都对这个 i 进行修改，这是否是安全的？

事实上，这个操作会导致意外的 **数据竞争**，下面我们介绍一下产生的原因：

## 从硬件角度看

### **多级缓存架构**

```text
CPU核心1 → L1缓存 → L2缓存 ↘
                              L3缓存 → 内存
CPU核心2 → L1缓存 → L2缓存 ↗
```

数据都存储在内存中，运算时需要读取到 cpu 的寄存器中进行运算，然后将结果写回内存：

- 每个CPU核心都有私有缓存（L1/L2）
- 同一时刻，不同核心的缓存中可能存在同一内存地址的不同副本
- 数据修改需要时间在各级缓存间传播

### **指令的非原子性**

对于现代 cpu，大多数看似简单的操作实际上都不是原子的(不可分割的操作整体)，例如：

- `i++` 这样简单的操作会被分解为：**读取 → 计算 → 写回** 三个独立的步骤
- 在多核CPU环境下，这三个步骤之间可能被其他核心的操作打断

因此，如果一个线程已经执行完读取和计算操作，但是该修改对其他核心还不可见的时候（缓存没有更新或没有写入内存），这个 i 又被其他核心的线程读取了呢，此时这个值是不是就不符合预期了，即我们期待的是两次自增，但是实际上最后的值只自增了一次。

### **解决方案**

为了解决这个冲突，是存在 **有锁编程** 和 **无锁编程** 两种方式的，这里简单介绍一下这两个的区别：

```text
应用层：    有锁编程（mutex、spinlock）    无锁编程（CAS、原子操作）
             ↓                              ↓
硬件层：    内存屏障 + 原子指令             原子指令（LOCK前缀等）
             ↓                              ↓
         ================缓存一致性协议（MESI等）================
```

#### 有锁编程

- 获取锁时：使用原子指令（如CAS）修改锁状态
- 释放锁时：触发内存屏障，确保之前的修改传播出去
- 依赖MESI协议使锁状态和被保护的数据在各核间同步

这是一种 **悲观策略**：假设一定会冲突，因此提前阻止，确保同一时刻只有一个线程能访问被保护的数据，这个线程就是持有锁的线程。

#### 无锁编程

- 直接使用原子指令操作数据
- 原子指令会触发缓存一致性协议
- 依赖MESI协议确保原子操作的结果立即对所有核可见

这是一种 **乐观策略**：假设不会冲突，因此不提前阻止，而是允许并发，在冲突时重试解决。

大概表现为如下这个样子：

```text
有锁：通过互斥来避免并发访问
     线程A [获取锁 → 操作 → 释放锁]
     线程B [等待..................→ 获取锁 → 操作]

无锁：允许并发访问，通过原子操作保证正确性
     线程A [CAS操作]
     线程B [CAS操作]（可能需要重试）
```

本节我们主要介绍 **有锁编程**，因此肯定会介绍各种锁，连带着标准库实现和我们自己实现的共有 **7** 种锁，下面就开始吧。

## 互斥锁-mutex

标准库提供了 [std::mutex](https://en.cppreference.com/w/cpp/thread/mutex)，主要有四个方法：

- lock: 加锁
- unlock: 解锁
- try_lock: 尝试加锁，如果成功返回 `true`，否则返回 `false`
- native_handle: 获取底层实现的句柄

```cpp
void func1() {
  std::size_t shared_data = 100;
  std::mutex mtx;

  std::jthread thr1{[&](std::stop_token stoken) -> void {
    while (!stoken.stop_requested()) {
      mtx.lock();
      ++shared_data;
      std::print("func1: shared_data = {}\n", shared_data);
      mtx.unlock();
      std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
  }};

  std::jthread thr2{[&](std::stop_token stoken) -> void {
    while (!stoken.stop_requested()) {
      mtx.lock();
      --shared_data;
      std::print("func2: shared_data = {}\n", shared_data);
      mtx.unlock();
      std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
  }};

  std::this_thread::sleep_for(std::chrono::seconds(5));
}
```

在这个示例中，我们启动了两个线程，都去尝试加锁，如果加锁成功，则分别执行加法和减法操作，可以看到从使用上来说，我们只需要在共享资源的写操作前后进行加锁和解锁即可。

那么这个 `std::mutex` 是如何确保线程安全的呢，对于现代的互斥锁，大多采用如下策略：

```text
线程尝试获取锁
    ↓ 失败
自旋等待（用户态）：短暂自旋几次
    ↓ 仍然失败
慢速路径（内核态）：调用futex系统调用，进入等待队列
```

然后占有锁的线程中，当锁解开时会调用通知，释放等待队列，随后重新回到用户态，因此，这个行为存在很大的上下文切换开销，且线程会被阻塞，无法执行任何操作，这些都是这个锁的不足之处。

## 读写锁-shared_mutex

事实上，只是读操作的话是不会导致线程安全的问题的，因此我们可以对互斥锁进一步细分，即读写锁，这个锁中应当允许多个线程同时读，但是写的时候只能一个线程写。

标准库也为我们提供了 [std::shared_mutex](https://en.cppreference.com/w/cpp/thread/shared_mutex)，内部维护了一个读锁和一个写锁，主要有七个方法：

- lock：获取写锁，如果当前有其他线程持有读锁或写锁，则阻塞当前线程，直到所有读写锁都被释放。
- try_lock：尝试获取写锁，如果当前没有其他线程持有读锁或写锁，则立即返回 true，否则返回 false。
- unlock：释放写锁。
- lock_shared：获取读锁，如果当前有其他线程持有写锁，则阻塞当前线程，直到写锁被释放。
- try_lock_shared：尝试获取读锁，如果当前没有其他线程持有写锁，则立即返回 true，否则返回 false。
- unlock_shared：释放读锁。
- native_handle：获取底层的互斥锁句柄。

```cpp
void func1() {
  std::shared_mutex shared_mutex;
  std::unordered_map<std::string, std::string> shared_entries;

  auto write = [&](const std::string& key, const std::string& value) -> void {
    shared_mutex.lock();

    shared_entries[key] = value;
    std::print("write shared_entries, [{} is {}] ", key, value);

    shared_mutex.unlock();
  };

  auto read = [&](const std::string& key) -> void {
    shared_mutex.lock_shared();
    std::print("read shared_entries, [{} is {}]", key, shared_entries[key]);
    shared_mutex.unlock_shared();
  };

  shared_entries["key1"] = "value1";
  shared_entries["key2"] = "value2";
  shared_entries["key3"] = "value3";

  std::jthread thr_1{read, "key1"};
  std::jthread thr_2{read, "key2"};
  std::jthread thr_3{write, "key4", "value4"};
}
```

该锁的底层实现比普通的互斥锁更加复杂，差不多是这样的：

```cpp
struct rwlock {
    int readers_count;    // 当前读者数量
    int writers_waiting;  // 等待的写者数量
    int writer_active;    // 是否有写者在写
    mutex_t mutex;        // 保护上述变量的互斥锁
    cond_t read_cond;     // 读者条件变量
    cond_t write_cond;    // 写者条件变量
};
```

上述所有操作都是通过修改这几个变量完成的，这里看一下获取读锁的操作，其余的可以自行查阅：

```cpp
void read_lock(rwlock_t *rw) {
    mutex_lock(&rw->mutex);

    // 如果有写者在写或有写者在等待，读者需要等待
    while (rw->writer_active || rw->writers_waiting > 0) {
        cond_wait(&rw->read_cond, &rw->mutex);
    }

    rw->readers_count++;  // 增加读者计数
    mutex_unlock(&rw->mutex);
}
```

当然，还有一个配套的 [std::shared_timed_mutex](https://en.cppreference.com/w/cpp/thread/shared_timed_mutex)，比普通的读写锁增加了超时设置，即 `try_lock_for` 和 `try_lock_until` 等操作，可以看一下如何使用。

## 递归锁-recursive_mutex

假设同一个线程多次获取一把互斥锁，会导致什么？

设这个线程为 A，第一次获取锁时会加锁，但是第二次获取锁时，该锁已经被占用，那么 A 会被投递到内核的等待队列，此时就很尴尬了，A 的唤醒依赖于该互斥锁解锁，但是想解锁，得先唤醒 A，哎，这好像永远都做不到，因此就死锁了。死锁的原因有很多，本节的后面会专门介绍。

标准库为了解决这个问题，为我们封装了 [std::recursive_mutex](https://en.cppreference.com/w/cpp/thread/recursive_mutex)，它提供的方法和普通的互斥锁一模一样，都是四个方法：`lock`, `unlock`, `try_lock`, `native_handle`，唯一的区别在于它多次加锁不会导致死锁。

```cpp
class FileSystem {
public:
  void createFile(const std::string &filename, const std::string &content) {
    _rec_mtx.lock();
    _files[filename] = content;
    std::print("File created: [{}] with content: [{}]\n", filename, content);
    _rec_mtx.unlock();
  }

  std::string readFile(const std::string &name) {
    _rec_mtx.lock();
    return _files[name];
    _rec_mtx.unlock();
  }

  // 复制文件
  void copyFile(const std::string &source, const std::string &dest) {
    _rec_mtx.lock();
    std::string content = readFile(source);
    createFile(dest, content);
    std::print("File copied from [{}] to [{}]\n", source, dest);
    _rec_mtx.unlock();
  }

private:
  std::map<std::string, std::string> _files;
  mutable std::recursive_mutex _rec_mtx;
};

int main() {
  FileSystem fs;
  fs.createFile("file1.txt", "Hello, World!");
  fs.createFile("file2.txt", "This is a test file.");
  fs.copyFile("file1.txt", "file3.txt");
  return 0;
}
```

其实递归锁的底层实现很好理解，它相比于普通互斥锁，多维护了两个变量：

- 锁的持有者(线程ID)：记录当前持有锁的线程标识符。
- 递归计数器：记录锁被同一线程获取的次数。

当获取锁时，如果锁空闲，则将持有者设置为当前线程，并将递归计数器置为1，同时加锁；如果锁已被当前线程持有，则递归计数器加1。

当释放锁时，如果递归计数器为1，则将持有者置为空，并将递归计数器置为0，释放锁；如果递归计数器大于1，则递归计数器减1。

因此，递归锁的性能是 **不如** 普通互斥锁的，因为递归锁需要维护额外的变量，增加了内存开销和性能开销。

它也有配套的[std::recursive_timed_mutex](https://en.cppreference.com/w/cpp/thread/recursive_timed_mutex)，也是多了超时操作，可以自行查阅。

## 自旋锁-spin_lock

自旋锁的设计思路和互斥锁不同，互斥锁是尝试获取锁时，如果锁已经被其他线程持有，则当前线程会阻塞等待，直到锁被释放。而自旋锁则是在尝试获取锁时，如果锁已经被其他线程持有，则当前线程会不断循环检查锁的状态，直到锁可用。

但是遗憾的是，标准库并没有提供自旋锁的实现，因此此处我们手动实现。

```cpp
class SpinLock {
public:
  void lock() {
    // test_and_set返回之前的值
    // 如果之前是false，设置为true并返回false，获取锁成功
    // 如果之前是true，保持为true并返回true，继续自旋
    while (_flag.test_and_set(std::memory_order_acquire)) {}
  }

  void unlock() { _flag.clear(std::memory_order_release); }

private:
  std::atomic_flag _flag = ATOMIC_FLAG_INIT;
};
```

可以看到，我们整个锁维护了一个`std::atomic_flag`，用于表示锁的状态，false表示锁空闲，true表示锁被持有。

加锁就是在一个死循环中不断尝试设置，只有原来是 false 时才会跳出循环，也就是加锁成功，解锁则是简单的设置为 false。

那作为一个追求性能的高级程序猿，你一定会说这种做法虽然可以减少上下文切换开销，并最及时的交换锁的所有权，但是它真的好吗，死循环不断请求，这该造成多少的 CPU 空转啊，肯定不能这么写吧？

当然是这样的，因此在使用自旋锁时，常常会引入 **退避算法** 和 **让步策略**，来减少 CPU 的空转，可以查看[这里](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/concurrent/03-mutex/spin_lock.cc)，我实现了一个自适应的自旋锁，可以根据CPU负载动态调整自旋策略，并做了 x86 和 arm 架构的适配，完全可以生产使用，主要用到了很多内存序相关的知识，在此处介绍不是很合适，可以在学习完后续章节再来看这个。

## 超时锁-timed_mutex

超时锁在普通的互斥锁之上又增加了超时功能，可以设置一个超时时间，如果在指定时间内无法获取锁，则可以直接返回用户态并继续执行，而不是一直阻塞在内核区，这个特性可以帮助我们避免死锁的发生以及设计一些实时系统。

标准库中为我们提供了 [std::timed_mutex](https://en.cppreference.com/w/cpp/thread/timed_mutex)，主要有 6 种方法：

- lock：加锁
- try_lock：尝试加锁，如果加锁成功则返回 true，否则返回 false
- try_lock_for：尝试加锁，如果在指定时间内加锁成功则返回 true，否则返回 false
- try_lock_until：尝试加锁，如果在指定时间点前加锁成功则返回 true，否则返回 false
- unlock：解锁
- native_handle：获取底层的锁句柄

```cpp
void func() {
  std::timed_mutex mtx;
  std::size_t shared_data = 100;

  std::jthread thr1{[&](std::stop_token token) -> void {
    while (!token.stop_requested()) {
      if (mtx.try_lock_for(std::chrono::milliseconds(100))) {
        ++shared_data;
        std::print("func1: shared_data = {}\n", shared_data);
        mtx.unlock();
      } else {
        std::print("func1: could not acquire lock, retrying...\n");
      }
      std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
  }};

  std::jthread thr2{[&](std::stop_token token) -> void {
    while (!token.stop_requested()) {
      if (mtx.try_lock_for(std::chrono::milliseconds(100))) {
        --shared_data;
        std::print("func2: shared_data = {}\n", shared_data);
        mtx.unlock();
      } else {
        std::print("func2: could not acquire lock, retrying...\n");
      }
      std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
  }};

  std::this_thread::sleep_for(std::chrono::seconds(5));
}
```

这个锁的底层实现非常简单，但也有多种方式，如基于 windows 或 posix 的不同系统调用，以及基于 condition_variable 的实现，我们自己手搓一个也不麻烦，可以自行查阅。

## 条件变量-condition_variable

在多线程编程中，我们常常会遇到这么一个场景：一个线程（消费者）需要等待某个条件达成（例如，任务队列中有数据），而这个条件由另一个线程（生产者）在满足时触发。

如果只能使用互斥锁的话，不可避免的要采用 **轮询** 的方式，但是这种方法效率底下，且有大量资源浪费，最理想的情况是这样的：消费线程如果发现没有东西可以消费，那么会直接进入睡眠状态，生产线程生产出来数据后，会唤醒等待的消费者线程进行消费。这样既不浪费 CPU，也能及时处理数据，是最好的方法。

这个东西就是我们熟知的[条件变量](https://en.cppreference.com/w/cpp/thread/condition_variable)，不管是在 linux 环境下的系统调用，还是在学习操作系统的课程中，都会有所涉及，主要有如下 6 种方法：

- wait：等待，阻塞当前线程，直到被唤醒。
- wait_for：等待，阻塞当前线程，直到被唤醒或超时。
- wait_until：等待，阻塞当前线程，直到被唤醒或到指定时间。
- notify_one：随机唤醒一个等待的线程。
- notify_all：唤醒所有等待的线程。
- native_handle：获取底层的条件变量句柄。

```cpp
void func() {
  std::condition_variable produce_cv;
  std::condition_variable consume_cv;
  std::mutex mtx;
  std::queue<int> data_queue;

  auto push = [&](int value) -> void {
    std::unique_lock<std::mutex> lock(mtx);

    consume_cv.wait(lock, [&]() { return data_queue.size() < 10; });

    data_queue.push(value);
    std::print("Produced: {}, queue size: {}\n", value, data_queue.size());
    produce_cv.notify_one();
  };

  auto pop = [&]() -> void {
    std::unique_lock<std::mutex> lock(mtx);

    produce_cv.wait(lock, [&]() { return !data_queue.empty(); });

    int value = data_queue.front();
    data_queue.pop();
    std::print("Consumed: {}, queue size: {}\n", value, data_queue.size());
    consume_cv.notify_one();
  };

  std::jthread thr1{[&]() -> void {
    for (int i = 0; i < 20; ++i) {
      push(i);
      std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
  }};

  std::jthread thr2{[&]() -> void {
    for (int i = 0; i < 20; ++i) {
      pop();
      std::this_thread::sleep_for(std::chrono::milliseconds(150));
    }
  }};

  std::this_thread::sleep_for(std::chrono::seconds(10));
}
```

这里我们实现了一个最简单的生产者消费者模型，这里需要注意 `condition_variable` 只能与 `std::mutex` 配合使用，而无法与前面介绍的其他互斥量配合使用，如果一定要使用其他互斥量的话，请参考 [std::condition_variable_any](https://en.cppreference.com/w/cpp/thread/condition_variable_any)。

当调用 wait 操作，且后面的条件为 false 时，线程会阻塞，这个行为的本质是：**在一个原子操作内解锁互斥锁，并把当前线程投递到内核区的等待队列中，直到被唤醒或超时**。

当调用 notify_one 操作时，会唤醒一个等待的线程，该线程会 **重新获取互斥锁并加锁，然后从原来 wait 的位置继续执行**。这样看起来就像是线程在 wait 的地方睡着了，被叫醒后继续执行。

值得注意的是：

- 由于操作系统的原因，是存在 **虚假唤醒** 的可能，因此建议采用新版本的写法，就是这个例子中的写法。
- `notify_all` 操作会导致 **惊群效应**，毕竟唤醒多个线程，但常常只有一个线程会获取需要的资源进入就绪态并被调度执行，这也是 nginx 架构设计上的一个优点。

## 信号量-semaphore

信号量是一种更为通用的同步原语，底层维护一个 **内部计数器**，表示可用资源的数量，以及一个 **等待队列**，存储因为资源不足而被阻塞的线程。它支持两种基本操作：

- P操作(也称wait或acquire)：尝试减少计数器的值，如果计数器为0，则阻塞
- V操作(也称signal或release)：增加计数器的值，可能唤醒等待的线程

在 cpp20 以前，我们是需要手动实现的，但幸运的是，20以后，我们可以使用标准库为我们提供的信号量：

- [std::binary_semaphore](https://en.cppreference.com/w/cpp/thread/binary_semaphore)：计数器只有0和1两个值，功能类似互斥锁
- [std::counting_semaphore<max_value>](https://en.cppreference.com/w/cpp/thread/counting_semaphore)：计数器可以有任意非负值，用于控制对有限资源的访问

主要提供的方法有 6 种：

- acquire：尝试减少计数器的值，如果计数器为0，则阻塞
- try_acquire：尝试减少计数器的值，如果计数器为0，则返回false
- try_acquire_for：尝试减少计数器的值，如果计数器为0，则等待一段时间，如果超时则返回false
- try_acquire_until：尝试减少计数器的值，如果计数器为0，则等待到指定时间，如果超时则返回false
- release：增加计数器的值，可能唤醒等待的线程，可以指定增加多少
- max：返回计数器的最大值

```cpp
void func() {
  std::binary_semaphore mts(0);

  std::jthread thr{[&]() -> void {
    mts.acquire(); // 等待来自主线程的信号量
    std::print("Thread has acquired the semaphore, proceeding...\n");
  }};

  std::this_thread::sleep_for(std::chrono::seconds(2));
  std::print("Main thread is releasing the semaphore...\n");
  mts.release(); // 释放信号量，允许线程继续执行
  std::this_thread::sleep_for(std::chrono::seconds(2));
}
```

可以看到，信号量的核心就在于 **计数器**，且这个计数器的操作通常是原子的，因此性能是很好的，但是它没有 **所有权** 的概念，且比较容易死锁，不好调试，因此在使用时需要格外小心。

## 锁包装器

前文我一直提醒线程要注意 join，因为可能导致线程资源泄漏，锁同样也要注意解锁的操作，否则运行时可能导致死锁。

线程都有 `std::jthread` 这种封装，那锁难道就没有吗，当然是有的，还有四种，下面我们逐一展示：

### lock_guard

这个是最简单的包装器，就是基于 RAII 设计的，它在构造时会对传入的锁调用 `lock()`，在析构时会调用 `unlock()`，因此可以确保锁的正确释放，但是该封装对象没有提供任何成员函数，因此要依靠对此对象的生命周期进行设计。

```cpp
void func1() {
  int shared_data = 100;
  std::mutex mtx;

  std::jthread thr{[&](std::stop_token stoken) -> void {
    while (!stoken.stop_requested()) {
      {
        std::lock_guard<std::mutex> lock(mtx);
        ++shared_data;
        std::print("func1: shared_data = {}\n", shared_data);
      }
      std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
  }};

  std::this_thread::sleep_for(std::chrono::seconds(5));
}
```

### unique_lock

[unique_lock](https://en.cppreference.com/w/cpp/thread/unique_lock)提供了更多的方法和可配置项，先来看一下构造函数：

可以接受一个或两个参数，第一个参数为一个 **互斥锁** 对象，第二个参数为可选的，有 5 个选择：

- 时间段：尝试加锁，如果在指定的时间段无法获取锁，则会返回
- 时间点：尝试加锁，如果在指定的时间点前无法获取锁，则会返回
- `std::defer_lock`：将锁交给 unique_lock 对象管理，但是不在构造函数里加锁，需要手动加锁
- `std::try_to_lock`：尝试加锁，如果无法获取锁，则会直接返回
- `std::adopt_lock`：领养一个已经加过锁的互斥对象，交给 unique_lock 对象管理

除此之外，此包装对象提供了 9 种方法：

- lock：手动加锁
- unlock：手动解锁
- mutex：获取管理的互斥对象
- owns_lock：判断是否持有锁，主要与 **try_to_lock** 配套使用
- try_lock：尝试加锁，如果无法获取锁，则会直接返回
- try_lock_for：尝试加锁，如果在指定的时间段无法获取锁，则会返回
- try_lock_until：尝试加锁，如果在指定的时间点前无法获取锁，则会返回
- release：释放锁，返回互斥对象
- swap：交换两个 unique_lock 对象的互斥对象

```cpp
void func2() {
  int shared_data = 100;
  std::mutex mtx1;
  std::mutex mtx2;

  std::jthread thr{[&]() -> void {
    std::unique_lock<std::mutex> lock1(mtx1, std::defer_lock);
    std::unique_lock<std::mutex> lock2(mtx2, std::defer_lock);
    std::lock(lock1, lock2); // 同时锁定多个互斥量，避免死锁
    ++shared_data;
    std::print("func2: shared_data = {}\n", shared_data);
  }};

  std::this_thread::sleep_for(std::chrono::seconds(2));
}
```

本样例中，我们有意识的使用了两个互斥锁，并都采用了延迟加锁进行锁包装器的构造，然后实际使用中是通过 `std::lock` 函数来同时锁定多个互斥量，避免死锁，哎，这个函数是怎么避免死锁的，这里补充一下，直接上源码：

```cpp
template <typename _L1, typename _L2, typename... _L3>
void lock(_L1 &__l1, _L2 &__l2, _L3 &...__l3) {
  if constexpr (is_same_v<_L1, _L2> && (is_same_v<_L1, _L3> && ...)) {
    constexpr int _Np = 2 + sizeof...(_L3);
    unique_lock<_L1> __locks[] = {
        {__l1, defer_lock}, {__l2, defer_lock}, {__l3, defer_lock}...};
    int __first = 0;
    do {
      __locks[__first].lock();
      for (int __j = 1; __j < _Np; ++__j) {
        const int __idx = (__first + __j) % _Np;
        if (!__locks[__idx].try_lock()) {
          for (int __k = __j; __k != 0; --__k)
            __locks[(__first + __k - 1) % _Np].unlock();
          __first = __idx;
          break;
        }
      }
    } while (!__locks[__first].owns_lock());

    for (auto &__l : __locks)
      __l.release();
  }
}
```

简单说来，这个函数先通过折叠表达式来校验类型，并循环尝试锁定每个互斥量，如果某个互斥量无法锁定，则释放之前锁定的互斥量并重试。

### shared_lock

这个和 `unique_lock` 是配套的东西，不管是构造操作还是成员方法都是一致的，这里就不多说了，说一下应用场景：

假设我们使用的是 `std::shared_mutex`，那么我们可以使用 `std::shared_lock` 来管理读锁，使用 `std::unique_lock` 来管理写锁。

### scoped_lock

该包装器是 c++17 引入的，与前面的保证器不同的是，它可以接受多个互斥量作为参数，其余都是正常的自动管理。

```cpp
void func3() {
  int shared_data = 100;
  std::mutex mtx1;
  std::mutex mtx2;

  std::jthread thr{[&]() -> void {
    std::scoped_lock<std::mutex, std::mutex> lock(mtx1, mtx2);
    ++shared_data;
    std::print("func3: shared_data = {}\n", shared_data);
  }};

  std::this_thread::sleep_for(std::chrono::seconds(2));
}
```

如果传入一个参数，则是一个普通的 `std::lock_guard`，如果传入多把锁，则会调用 `std::lock`，这个前面已经介绍过了。

## 死锁

死锁是指两个或多个线程相互等待对方释放资源，导致都无法继续执行的状态。

### **死锁的四个必要条件**

- **互斥条件**：资源不能被共享，只能由一个线程使用
- **持有并等待**：线程已经持有至少一个资源，但又提出新的资源请求
- **不可剥夺**：线程已获得的资源不能被强制剥夺
- **循环等待**：存在一种线程资源的循环等待关系

### **常见的死锁产生场景**

**双锁死锁**

两个线程分别占用一把锁，并请求对方占有的锁，此时会导致死锁，这个原因可以参考前文介绍递归锁的时候描述的死锁原因，来捋一下这个死锁产生的原因。

**自死锁**

递归死锁是指一个线程在持有锁的同时，又尝试获取同一把锁，导致死锁，这个在前文已经介绍过了。

### 预防死锁的方法

其实对于死锁这个问题，预防永远比检测和恢复要容易的多，基本上只要按照如下的方式进行加锁，基本不会遇见死锁：

- **单把锁**：只有自死可能导致死锁，因此只要在有 **递归** 的情况，采用 `std::recursive_mutex`
- **多把锁**：可以采用 `std::lock` 或 `std::scoped_lock` 来避免死锁

本节的内容到此为止就算结束了，还是很多的，更重要的是理解，至于具体怎么写，可以随用随查。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/concurrent/03-mutex/mutex.cc)。
