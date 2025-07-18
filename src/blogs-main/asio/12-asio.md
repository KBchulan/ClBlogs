---
title: 12 逻辑层架构描述及实现

article: true
order: 12
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-16

description: 对上文的服务器设计的总结，以及对逻辑层的引入
footer: Always coding, always learning
---

<!-- more -->

## 回顾前文设计

这里我们先来整体回顾一下先前的代码逻辑和设计：

* **main**：我们注册了一个 io_context，并调用了 ioc.run()，让asio底层开始工作，等待用户注册相关事件和调度回调的处理，同时我们创建了Server对象，并调用其start()方法，开始监听客户端连接。

* **Server**：创建此对象时我们会注册一个acceptor，并不断的发起一个异步的async_accept，等待客户端的连接，当有客户端连接时，会调用我们传入的回调函数，我们在此处创建一个session对象，并调用session的start()方法，开始与客户端进行通信。

* **Session**：核心就在于此，当我们创建此对象时就会挂起一个异步读事件，当内核区的TCP读缓冲区有数据时会立刻将其读入我们用户区的buffer，此时是不计长度的，只要读到数据就会走回调，然后我们做了粘包/切包处理，当拿到完整的数据时就会调用Send()方法，将数据发送给客户端，总体来说就是收发分离，一个连接建立时一直挂起读事件，并把一个个读到的数据封装为msgnode，通过我们的自定义接口进行发送，这里面有发送队列控制、字节序处理、包的序列化等操作。

## 事件注册与回调调度

我们此处以`socket.async_read_some`为例说明，当我们调用此方法时，他会把对应的读事件和读回调注册到 io_context 中，ioc帮我们把这些东西注册给系统，具体来说是读回调在用户态，proactor和读事件在内核态。这里我们在[同步API](https://kbchulan.github.io/ClBlogs/blogs-main/asio/1-asio.html#%E5%88%9D%E8%AF%86asio)中介绍过，Windows是基于IOCP模型实现proactor，Linux是基于epoll实现的reactor模仿实现的proactor，整体暴露给用户的都是proactor，所以为了方便起见，接下来我们直接就说是proactor。

异步操作和同步操作的本质区别在于异步操作会当系统完成读写操作(内核->用户)后，才会通知对应回调处理，回到我们这个API上，当系统完成一次读操作(完成的标志是内核区的TCP缓冲区有任何数据，并把这些数据拷贝到用户的buffer后)，会通知proactor，proactor会通知我们的用户态该执行对应的回调了，然后此回调会投递到asio的回调队列中，由ioc来调度执行。

以上就是我们对于事件注册和回调调度的补充，接下来我们开始引入逻辑层。

## 逻辑层设计

在原来的服务器中，我们接收完一个完整的包体，是直接采用echo式的发送回去，但在实际生产中，我们往往需要对包体进行处理，比如解析、验证、转发等，所以我们的初步设计就是把接收到的包投递到一个队列，逻辑线程获取队列的包体来处理，从而实现网路层和逻辑层的分离，类似于生产者和消费者模型。

这里会产生几个问题，我们来一一解释：

* **为什么需要逻辑层**：假设网络层与逻辑层不分离的情况下，会引发两个问题：一是我们需要处理完包体再挂起读事件，那如果处理的过程很耗时呢，总不能一直不接收数据吧。二是如上文所说，回调会被asio使用队列来调度，那假设一个会话的回调一直处理，是不是其他会话的回调一直被阻塞，处理效率也会降低。而上述所说的两种情况，asio的多线程模型(单ioc多线程，多ioc多线程)都不能完美解决，而引入了逻辑层后，网络层和逻辑层分离，网络层只负责接收数据，逻辑层负责处理数据，会大大提高网络吞吐。

* **为什么逻辑层不设计为多线程**：其实这个在一些优秀的项目中都有体现，比如Redis，即使高版本的redis 网络层采用了多线程，它的逻辑线程依旧是单线程，可以考虑这么一个场景，假设你有1w+的用户，他们同时请求增加工会的总积分，那此时这个工会是不是就是共享资源了，那就得加锁了吧，此时频繁加锁带来的开销还不如直接让逻辑线程单线程处理，毕竟单线程天然就具有原子性，不会出现线程安全问题。

## 引入T字段

对应逻辑层肯定是需要消息id来确认调用什么回调，而前面我们对消息节点的TLV只使用了 LV，此处我们补充上去这个T字段：

首先先设计一下这个MsgNode的结构，引入T字段也就是id类型，我们对接收和发送进行解耦，MsgNode主要存储头节点，RecvNode和SendNode分别用于接收和发送：

```cpp
// 头部节点
class CORE_EXPORT MsgNode {
public:
  MsgNode(short msg_len) : _msg_len(msg_len) {
    _data = new char[static_cast<size_t>(_msg_len + 1)]();
    _data[_msg_len] = '\0';
  }

  virtual ~MsgNode() {
    delete[] _data;
  }

  [[nodiscard]] virtual short getMsgId() const {
    return -1;
  };

  MsgNode(const MsgNode &) = delete;
  MsgNode(MsgNode &&) = delete;
  MsgNode &operator=(const MsgNode &) = delete;
  MsgNode &operator=(MsgNode &&) = delete;

  void Clear() {
    memset(_data, 0, static_cast<size_t>(_msg_len));
    _cur_len = 0;
  }

  short _cur_len{};
  short _msg_len;
  char *_data;
};

class CORE_EXPORT RecvNode final : public MsgNode {
public:
  RecvNode(short msg_id, short msg_len) : MsgNode(msg_len), _msg_id(msg_id) { }

  [[nodiscard]] short getMsgId() const override { return this->_msg_id; }

private:
  short _msg_id;
};

class CORE_EXPORT SendNode final : public MsgNode {
public:
  SendNode(short msg_id, short msg_len, const char *data) : MsgNode(msg_len + MSG_HEAD_TOTAL_LEN), _msg_id(msg_id) {
    auto msg_id_net = (short)boost::asio::detail::socket_ops::host_to_network_short(static_cast<u_short>(msg_id));
    memcpy(_data, &msg_id_net, MSG_TYPE_LENGTH);
    auto msg_len_net = (short)boost::asio::detail::socket_ops::host_to_network_short(static_cast<u_short>(msg_len));
    memcpy(_data + MSG_TYPE_LENGTH, &msg_len_net, MSG_LEN_LENGTH);
    memcpy(_data + MSG_HEAD_TOTAL_LEN, data, static_cast<size_t>(msg_len));
  }

  [[nodiscard]] short getMsgId() const override { return this->_msg_id; }

private:
  short _msg_id;
};
```

接着修改会话的接收逻辑，很简单的思路，只需要把原来的_recv_head_node的长度修改为4，同时接收 TL 两个数据，剩余的处理逻辑不变，由于粘包的代码比较长，此处不占用正文空间，可以看一下[git记录](https://github.com/KBchulan/ClBlogs-Src/commit/7189d83d5cc3a83d7f2277bdeae729e85bcb7fc7#diff-115685cabb6579a11b404559bf443274b4a1d6c33db3b6d78e2c5e61f8450fa4)。

这次提交中我们优化了一些宏定义，并修改 MsgNode 和 Session 的实现以适配T字段，Session主要需要关注 Send() 接口和粘包处理的逻辑，其余逻辑和[jsoncpp序列化](https://kbchulan.github.io/ClBlogs/blogs-main/asio/11-asio.html)的章节逻辑完全一致。

## 逻辑层实现

让我们延续先前的思路，服务器在粘包处理时拿到了完整的 _recv_msg_node，我们希望把这个数据封装为逻辑节点投递到逻辑层进行处理，那么我们先看一下逻辑节点：

```cpp
class Session;
class RecvNode;
class CORE_EXPORT LogicNode {
  friend class LogicSystem;

public:
  LogicNode(std::shared_ptr<Session> session, std::shared_ptr<RecvNode> recvNode)
      : _session(std::move(session)), _recvNode(std::move(recvNode)) {}

private:
  std::shared_ptr<Session> _session;
  std::shared_ptr<RecvNode> _recvNode;
};
```

此逻辑节点的构造会使 session和 recvnode的引用计数都 +1，确保这些对象的生命周期长到足够处理完，接着我们就可以着手逻辑层的实现了，逻辑层一般比较隐秘且唯一，我们采用 pimpl + 单例 模式实现，先看一下头文件：

```cpp
class Session;
class LogicNode;
class CORE_EXPORT LogicSystem final : public global::Singleton<LogicSystem> {
  friend class global::Singleton<LogicSystem>;

  /**
    * @brief 回调函数类型，用于处理接收到的消息
    * @param session 共享指针，指向当前会话
    * @param msg_id 消息ID
    * @param data 消息数据
    **/
  using FunCallBack = std::function<void(const std::shared_ptr<Session>&, short, const char*)>;

private:
  LogicSystem();

public:
  ~LogicSystem();

  void PostMsgToLogicQueue(const std::shared_ptr<LogicNode> &logic_node);

private:
  struct _impl;
  std::unique_ptr<_impl> _pimpl;
};
```

接着我们以程序的视角来看一下此逻辑层会是什么作用，调用到此单例时会走 LogicSystem 的构造函数，在 pimpl 模式中就是创建一个智能指针的 _impl 对象：

```cpp
LogicSystem::LogicSystem() : _pimpl(std::make_unique<_impl>()) {}

struct LogicSystem::_impl {
  std::queue<std::shared_ptr<LogicNode>> _msg_queue; // 所有逻辑节点
  std::mutex _queue_mutex;  // 队列互斥锁
  std::condition_variable _queue_cv;  // 队列条件变量

  std::jthread _worker_thread;  // 工作线程

  std::atomic_bool _b_stop{false}; // 表示逻辑层是否停止工作
  std::map<short, FunCallBack> _msg_handlers; // 消息id对应的回调

  // 注册所有的回调函数
  void RegisterCallback();

  // 处理消息
  void ProcessMessage(const std::shared_ptr<LogicNode>& logic_node);

  _impl() {
    // 注册回调函数
    RegisterCallback();

    // 启动工作线程
    _worker_thread = std::jthread([this]() -> void {
      while (true) {
        std::shared_ptr<LogicNode> logic_node;

        {
          std::unique_lock<std::mutex> lock{_queue_mutex};

          _queue_cv.wait(lock, [this]() -> bool {
            return !_msg_queue.empty() || _b_stop.load(std::memory_order_acquire);
          });

          if (_b_stop.load(std::memory_order_acquire)) {
            break;
          }

          if (!_msg_queue.empty()) {
            logic_node = std::move(_msg_queue.front());
            _msg_queue.pop();
          }
        }

        ProcessMessage(logic_node);
      }

      // 如果停止了，处理剩余的消息
      while (true) {
        std::shared_ptr<LogicNode> logic_node;
        {
          std::scoped_lock<std::mutex> lock{_queue_mutex};
          if (_msg_queue.empty()){
            break;
          }
          logic_node = std::move(_msg_queue.front());
          _msg_queue.pop();
        }
        ProcessMessage(logic_node);
      }

    });
  }

};
```

可以看到，当构造此对象时我们会先注册所有的消息id对应的回调到 `_msg_handlers` 中，然后启动一个工作线程，此工作线程的逻辑是创建一个逻辑节点，然后被条件变量阻塞，当 **有数据或者停止工作时**，会唤醒此线程：

* 停止工作：则退出循环并取出剩余的所有逻辑节点进行处理
* 有数据：则取出队列的第一个逻辑节点，并调用 `ProcessMessage` 进行处理

这里面我们看到了注册回调和处理消息两个函数，看一下实现：

```cpp
void LogicSystem::_impl::RegisterCallback() {
  _msg_handlers[static_cast<short>(MsgType::MSG_HELLO_WORLD)] =
    [](const std::shared_ptr<Session> &session, short msg_id, const char* data) -> void {
      // 读数据
      Json::CharReaderBuilder read_builder;
      std::stringstream strs{data};
      Json::Value recv_data;
      std::string errors;

      if (Json::parseFromStream(read_builder, strs, &recv_data, &errors)) {
        std::cout << std::format("recv test is: {}, recv data is: {}\n", recv_data["test"].asString(), recv_data["data"].asString());
      } else {
        logger.error("Failed to parse JSON data: {}", errors);
        return;
      }

      recv_data["data"] = "server has received msg, " + recv_data["data"].asString();
      Json::StreamWriterBuilder write_builder;
      std::string send_str = Json::writeString(write_builder, recv_data);
      session->Send(msg_id, static_cast<short>(send_str.size()), send_str.c_str());
    };
}

void LogicSystem::_impl::ProcessMessage(const std::shared_ptr<LogicNode>& logic_node) {
  auto msg_id = logic_node->_recvNode->getMsgId();
  auto iter = _msg_handlers.find(msg_id);

  if (iter != _msg_handlers.end()) {
    iter->second(logic_node->_session, msg_id, logic_node->_recvNode->_data);
  } else {
    logger.error("no handler for msg id: {}", msg_id);
  }
}
```

那对外应该如何使用呢，可以看到公有函数有一个 `PostMsgToLogicQueue` 函数，当调用此函数时我们会把一个消息节点投递到队列中，如果队列原来是空的，就唤醒工作线程：

```cpp
void LogicSystem::PostMsgToLogicQueue(const std::shared_ptr<LogicNode> &logic_node) {
  std::unique_lock<std::mutex> lock{_pimpl->_queue_mutex};
  _pimpl->_msg_queue.push(logic_node);

  if (_pimpl->_msg_queue.size() == 1) {
    _pimpl->_queue_cv.notify_one();
  }
}
```

此时我们就可以在粘包处理时，把一个逻辑节点投递到逻辑层进行处理了，对应的修改也很简单，只需要在拿到整个包体后，创建一个逻辑节点，并调用 `PostMsgToLogicQueue` 进行投递：

```cpp
logicSystem.PostMsgToLogicQueue(std::make_shared<LogicNode>(shared_from_this(), std::dynamic_pointer_cast<RecvNode>(_recv_msg_node)));
```

至此，我们再从正向总结一下引入逻辑层之后的设计行为：

*   **Session**: 当我们创建此对象时就会挂起一个异步读事件。当内核区的TCP读缓冲区有数据时，会将其读入用户区的buffer。我们对数据进行粘包/切包处理，以解析出包含消息ID和消息长度的完整消息头。一旦解析出一个完整的消息体（封装在`RecvNode`中），我们不再直接处理它，而是将它与当前会话（`Session`）一同封装成一个`LogicNode`。

*   **投递到逻辑层**: 这个`LogicNode`随后被投递到`LogicSystem`的全局消息队列中。`Session`完成投递后，会立刻挂起下一个异步读事件，继续接收数据，实现了网络接收与业务处理的解耦。

*   **LogicSystem**: 这是一个单例，内部维护一个工作线程和消息队列。该工作线程独立于asio的IO线程，它不断地从消息队列中取出`LogicNode`。

*   **逻辑处理与回调**: 取出`LogicNode`后，`LogicSystem`会根据消息节点中的消息ID，在预先注册的处理器（`_msg_handlers`）中查找并调用对应的回调函数。

*   **响应**: 回调函数执行具体的业务逻辑（如解析JSON，修改数据等），然后利用`LogicNode`中保存的`Session`指针，调用`Send()`方法，将处理结果异步地发送回客户端。

这种设计将网络IO与业务逻辑彻底分离，网络层（`Session`）专注于高效地收发数据，而逻辑层（`LogicSystem`）则在独立的线程中同步处理业务，避免了复杂的业务逻辑阻塞网络吞吐，同时也通过单线程处理逻辑简化了状态管理和并发控制。

## 总结

本节我们主要设计并实现了一个独立的逻辑层（`LogicSystem`），将业务逻辑处理与网络I/O（`Session`）完全分离。

本节的核心是：**设计并实现了一个独立的逻辑层，将业务逻辑处理与网络I/O完全分离**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/12-logic-system/src/main.cc)。