---
title: 17 协程服务器

article: true
order: 17
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-28

description: 基于协程实现异步服务器，非玩具类型
footer: Always coding, always learning
---

<!-- more -->

# 17 协程服务器

在上一节中我们学习了协程相关的API，本节我们来基于协程封装一个异步服务器，虽说协程的效率理论上来说不如异步回调，但是笔者测试的时候居然协程更快一点，虽然只是一点。

本节我们重新回顾一下整个服务器的设计，从零开始写，虽说与前面的设计差距主要是在 Session 层，因此本节更像是一个回顾篇章，由于所有的设计和思想在先前的章节都介绍过了，本节只会指出其中的重点。

## MsgNode

首先来看消息节点，我们封装了MsgNode，存储消息长度和信息，并基于这个类衍生了两个子类，用于实现发送节点和接收节点的解耦：

```cpp
/******************************************************************************
 *
 * @file       MsgNode.hpp
 * @brief      消息节点的统一定义
 *
 * @author     KBchulan
 * @date       2025/07/28
 * @history
 ******************************************************************************/

#ifndef MSGNODE_HPP
#define MSGNODE_HPP

#include <core/CoreExport.hpp>

namespace core {

class CORE_EXPORT MsgNode {
public:
  MsgNode(short msg_len);

  virtual ~MsgNode();

  void Clear();

  [[nodiscard]] virtual short getMsgId() const;

  MsgNode(const MsgNode &) = delete;
  MsgNode(MsgNode &&) = delete;
  MsgNode &operator=(const MsgNode &) = delete;
  MsgNode &operator=(MsgNode &&) = delete;

  short _cur_len{};
  short _msg_len;
  char *_data;
};

class CORE_EXPORT RecvNode final : public MsgNode {
public:
  RecvNode(short msg_id, short msg_len);

  [[nodiscard]] short getMsgId() const override;

private:
  short _msg_id;
};

class CORE_EXPORT SendNode final : public MsgNode {
public:
  SendNode(short msg_id, short msg_len, const char *data);

  [[nodiscard]] short getMsgId() const override;

private:
  short _msg_id;
};

} // namespace core

#endif // MSGNODE_HPP
```

对应的实现代码如下，基类和接收节点比较简单，主要需要注意发送节点进行字节序处理，从本机字节序转换为网络字节序(大端)：

```cpp
#include "MsgNode.hpp"

#include <cstddef>
#include <cstring>
#include <winsock2.h>

#include <global/Global.hpp>
#include <boost/asio/detail/socket_holder.hpp>

namespace core {

MsgNode::MsgNode(short msg_len) : _msg_len(msg_len) {
  _data = new char[static_cast<std::size_t>(_msg_len + 1)]();
  _data[_msg_len] = '\0';
}

MsgNode::~MsgNode() {
  delete[] _data;
}

void MsgNode::Clear() {
  memset(_data, 0, static_cast<size_t>(_msg_len));
  _cur_len = 0;
}

short MsgNode::getMsgId() const {
  return -1;
}


RecvNode::RecvNode(short msg_id, short msg_len)
  : MsgNode(msg_len), _msg_id(msg_id) {}

short RecvNode::getMsgId() const {
  return this->_msg_id;
}


SendNode::SendNode(short msg_id, short msg_len, const char *data)
  : MsgNode(msg_len + MSG_HEAD_TOTAL_LEN), _msg_id(msg_id) {
  auto net_msg_id = (short)boost::asio::detail::socket_ops::host_to_network_short(static_cast<u_short>(msg_id));
  memcpy(_data, &net_msg_id, MSG_TYPE_LENGTH);
  auto net_msg_len = (short)boost::asio::detail::socket_ops::host_to_network_short(static_cast<u_short>(msg_len));
  memcpy(_data + MSG_TYPE_LENGTH, &net_msg_len, MSG_LEN_LENGTH);
  memcpy(_data + MSG_HEAD_TOTAL_LEN, data, static_cast<size_t>(msg_len));
}

short SendNode::getMsgId() const {
  return this->_msg_id;
}

} // namespace core
```

## IoPool

然后我们考虑选择多线程模型，此处我们采用两种多线程模型中的 IoContextPool 的设计，即启动多个线程，每个线程都跑一个ioc，用于调度各个连接的读写回调一类的操作，类似于 **多reactor多线程模型**。

```cpp
/******************************************************************************
 *
 * @file       IoPool.hpp
 * @brief      io_context的池子，实现各个线程各跑一个的效果
 *
 * @author     KBchulan
 * @date       2025/07/28
 * @history
 ******************************************************************************/

#ifndef IOPOOL_HPP
#define IOPOOL_HPP

#include <memory>
#include <thread>

#include <core/CoreExport.hpp>
#include <global/Singleton.hpp>

#include <boost/asio/io_context.hpp>

namespace core {

class CORE_EXPORT IoPool final : public global::Singleton<IoPool> {
  friend class global::Singleton<IoPool>;

private:
  IoPool(unsigned int size = std::thread::hardware_concurrency());

public:
  ~IoPool();

  boost::asio::io_context &getIoContext();

private:
  struct _impl;
  std::unique_ptr<_impl> _pimpl;
};

} // namespace core

#define ioPool core::IoPool::getInstance()

#endif // IOPOOL_HPP
```

对应的实现代码如下：

```cpp
#include "IoPool.hpp"

#include <atomic>
#include <vector>
#include <cstddef>

#include <middleware/Logger.hpp>

#include <boost/asio/executor_work_guard.hpp>

namespace core {

struct IoPool::_impl {
  std::vector<std::jthread> _threads;
  std::vector<boost::asio::io_context> _ioContexts;
  std::vector<boost::asio::executor_work_guard<boost::asio::io_context::executor_type>> _workGuards;
  std::atomic<size_t> _index{0};

  _impl(unsigned int size) : _ioContexts(size) {
    // 启动work_guard
    _workGuards.reserve(size);
    for (auto &io_context : _ioContexts) {
      _workGuards.emplace_back(boost::asio::make_work_guard(io_context));
    }

    // 启动线程
    _threads.reserve(size);
    for (auto &io_context : _ioContexts) {
      _threads.emplace_back([&io_context]() -> void {
        io_context.run();
      });
    }
  }

  ~_impl() = default;
};

IoPool::IoPool(unsigned int size) : _pimpl(std::make_unique<_impl>(size)) {}

IoPool::~IoPool() {
  logger.debug("The io_pool has been released!");
}

boost::asio::io_context &IoPool::getIoContext() {
  const std::size_t poolSize = _pimpl->_ioContexts.size();
  const std::size_t index = _pimpl->_index.fetch_add(1, std::memory_order_relaxed) % poolSize;
  return _pimpl->_ioContexts[index];
}

} // namespace core
```

## Server

Server的设计与先前保持一致，即启动一个 acceptor，负责接收连接，并构造成不同的会话，投递到不同的线程进行处理，核心在于 session 的计数管理，我们使用哈希表来管理所有的连接，考虑到会话异常时会减少一个计数，即访问这个哈希表，故相关操作需要加锁。

```cpp
/******************************************************************************
 *
 * @file       Server.hpp
 * @brief      服务器的核心实现
 *
 * @author     KBchulan
 * @date       2025/07/28
 * @history
 ******************************************************************************/

#ifndef SERVER_HPP
#define SERVER_HPP

#include <memory>

#include <core/CoreExport.hpp>

#include <boost/asio/io_context.hpp>

namespace core {

class Session;
class CORE_EXPORT Server {
public:
  Server(boost::asio::io_context &ioc, unsigned short port);

  ~Server();

  void removeSession(const std::string &key);

private:
  struct _impl;
  std::unique_ptr<_impl> _pimpl;
};

} // namespace core

#endif // SERVER_HPP
```

对应的实现代码：

```cpp
#include "Server.hpp"

#include <mutex>
#include <memory>
#include <unordered_map>

#include <middleware/Logger.hpp>
#include <core/io-pool/IoPool.hpp>
#include <core/session/Session.hpp>

#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/ip/address_v4.hpp>
#include <boost/system/detail/error_code.hpp>

namespace core {

struct Server::_impl {
  boost::asio::io_context &_ioc;
  unsigned short _port;
  Server * _server;

  boost::asio::ip::tcp::acceptor _acceptor;

  std::mutex _mutex;
  std::unordered_map<std::string, std::shared_ptr<Session>> _sessions;

  void start_accept() {
    auto &ioc = ioPool.getIoContext();
    auto new_session = std::make_shared<Session>(ioc, _server);
    _acceptor.async_accept(new_session->getSocket(), [new_session, this](boost::system::error_code errc) -> void {
      handle_accept(new_session, errc);
    });
  }

  void handle_accept(const std::shared_ptr<Session> &new_session, const boost::system::error_code &errc) {
    if (errc) {
      logger.error("Accept error: {}", errc.message());
    } else {
      new_session->Read();
      std::lock_guard<std::mutex> lock(_mutex);
      _sessions[new_session->getUuid()] = new_session;
    }

    start_accept();
  }

  _impl(boost::asio::io_context &ioc, unsigned short port, Server *server)
    : _ioc(ioc), _port(port), _server(server), _acceptor(_ioc, boost::asio::ip::tcp::endpoint(boost::asio::ip::address_v4::any(), port)) {
    logger.info("Server is starting on port {}", port);
    start_accept();
  }
};

Server::Server(boost::asio::io_context &ioc, unsigned short port)
  : _pimpl(std::make_unique<_impl>(ioc, port, this)) {}

Server::~Server() {
  logger.debug("The server has been released!");
}

void Server::removeSession(const std::string &key) {
  std::lock_guard<std::mutex> lock(_pimpl->_mutex);
  if (auto iter = _pimpl->_sessions.find(key); iter != _pimpl->_sessions.end()) {
    _pimpl->_sessions.erase(iter);
    logger.info("Session with key {} has been removed", key);
  } else {
    logger.warning("Session with key {} not found", key);
  }
}

} // namespace core
```

## Session

接着是我们的重中之重，也就是会话层的设计，期望的效果是启动一个会话后，会不断挂起读操作，并把接收到的数据封装为一个逻辑节点投递给逻辑队列进行处理，同时封装一个Send方法用于在任意时刻调用发送。

先前在读操作时，需要编写大量的代码用于处理粘包，但是在引入协程后，可以直接指定读取的位数，使我们处理粘包的代码更容易书写，可以看一下本次我们封装的 Send 和 Read，感受一下协程的优越性。

```cpp
/******************************************************************************
 *
 * @file       Session.hpp
 * @brief      每个连接的会话类
 *
 * @author     KBchulan
 * @date       2025/07/28
 * @history
 ******************************************************************************/

#ifndef SESSION_HPP
#define SESSION_HPP

#include <memory>

#include <core/CoreExport.hpp>

#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/io_context.hpp>

namespace core {

class Server;
class CORE_EXPORT Session : public std::enable_shared_from_this<Session>  {
public:
  Session(boost::asio::io_context &ioc, Server *server);

  ~Session();

  void Read();
  void Send(short msgType, short msgLen, const char *msgBody);

  std::string &getUuid() const;
  boost::asio::ip::tcp::socket &getSocket();

private:
  struct _impl;
  std::unique_ptr<_impl> _pimpl;
};

} // namespace core

#endif // SESSION_HPP
```

对应的实现代码：

```cpp
#include "Session.hpp"

#include <mutex>
#include <queue>
#include <atomic>
#include <memory>
#include <cstddef>

#include <global/Global.hpp>
#include <middleware/Logger.hpp>
#include <core/server/Server.hpp>
#include <core/logic/LogicNode.hpp>
#include <core/msg-node/MsgNode.hpp>
#include <core/logic/LogicSystem.hpp>

#include <boost/uuid/uuid_io.hpp>
#include <boost/uuid/random_generator.hpp>

#include <boost/asio/read.hpp>
#include <boost/asio/write.hpp>
#include <boost/asio/co_spawn.hpp>
#include <boost/asio/detached.hpp>
#include <boost/asio/awaitable.hpp>
#include <boost/asio/use_awaitable.hpp>
#include <boost/system/system_error.hpp>
#include <boost/system/detail/error_code.hpp>
#include <boost/asio/detail/socket_holder.hpp>

namespace core {

struct Session::_impl {
  boost::asio::io_context &_ioc;
  Server *_server;

  boost::asio::ip::tcp::socket _socket;
  std::string _uuid;

  std::atomic_bool _isClosed{false};

  std::shared_ptr<MsgNode> _recv_head_node;
  std::shared_ptr<RecvNode> _recv_body_node;

  std::mutex _send_mtx;
  std::queue<std::shared_ptr<SendNode>> _send_queue;

  _impl(boost::asio::io_context &ioc, Server *server)
      : _ioc(ioc), _server(server), _socket(ioc) {
    boost::uuids::uuid uuid = boost::uuids::random_generator_mt19937()();
    _uuid = boost::uuids::to_string(uuid);

    _recv_head_node = std::make_shared<MsgNode>(MSG_HEAD_TOTAL_LEN);
  }

  void close() {
    bool expected = false;

    if (_isClosed.compare_exchange_strong(expected, true, std::memory_order_acquire)) {
      if (_socket.is_open()) {
        _socket.close();
      }

      if (_server != nullptr) {
        _server->removeSession(_uuid);
      }
    }
  }
};

Session::Session(boost::asio::io_context &ioc, Server *server)
  : _pimpl(std::make_unique<_impl>(ioc, server)) {}

Session::~Session() = default;

void Session::Read() {
  boost::asio::co_spawn(_pimpl->_ioc, [self = shared_from_this()]() -> boost::asio::awaitable<void> {
    try {
      while (!self->_pimpl->_isClosed) {
        self->_pimpl->_recv_head_node->Clear();
        co_await boost::asio::async_read(self->_pimpl->_socket,
          boost::asio::buffer(self->_pimpl->_recv_head_node->_data, MSG_HEAD_TOTAL_LEN),
          boost::asio::use_awaitable);

        // 解析接收到的数据
        short msgType = 0;
        memcpy(&msgType, self->_pimpl->_recv_head_node->_data, MSG_TYPE_LENGTH);
        msgType = (short)boost::asio::detail::socket_ops::network_to_host_short(static_cast<u_short>(msgType));
        short msgLen = 0;
        memcpy(&msgLen, self->_pimpl->_recv_head_node->_data + MSG_TYPE_LENGTH, MSG_LEN_LENGTH);
        msgLen = (short)boost::asio::detail::socket_ops::network_to_host_short(static_cast<u_short>(msgLen));

        if (msgLen > MSG_BODY_LENGTH) {
          logger.error("Received message length exceeds maximum allowed length");
          self->_pimpl->close();
          co_return;
        }

        logger.info("Received message type: {}, length: {}", msgType, msgLen);

        // 读取消息内容
        self->_pimpl->_recv_body_node = std::make_shared<RecvNode>(msgType, msgLen);
        self->_pimpl->_recv_body_node->Clear();
        co_await boost::asio::async_read(self->_pimpl->_socket,
            boost::asio::buffer(self->_pimpl->_recv_body_node->_data, static_cast<size_t>(msgLen)),
            boost::asio::use_awaitable);

        // 投递到逻辑线程处理
        logicSystem.PostMsgToLogicQueue(std::make_shared<LogicNode>(self, self->_pimpl->_recv_body_node));
      }
    } catch (const boost::system::system_error &err) {
      logger.error("Session receive error: {}", err.code().message());
      self->_pimpl->close();
    }
  }, boost::asio::detached);
}

void Session::Send(short msgType, short msgLen, const char *msgBody) {
  auto send_node = std::make_shared<SendNode>(msgType, msgLen, msgBody);
  bool should_start_coroutine = false;

  {
    std::lock_guard<std::mutex> lock(_pimpl->_send_mtx);
    should_start_coroutine = _pimpl->_send_queue.empty();
    if (_pimpl->_send_queue.size() >= SEND_QUEUE_MAX_LEN) {
      logger.error("Send queue is full, dropping message");
      return;
    }
    _pimpl->_send_queue.emplace(send_node);
  }

  if (should_start_coroutine) {
    boost::asio::co_spawn(_pimpl->_ioc, [self = shared_from_this()]() -> boost::asio::awaitable<void> {
      try {
        while (true) {
          std::shared_ptr<SendNode> node;
          {
            std::lock_guard<std::mutex> lock{self->_pimpl->_send_mtx};
            if (self->_pimpl->_send_queue.empty()) {
              co_return;
            }
            node = std::move(self->_pimpl->_send_queue.front());
            self->_pimpl->_send_queue.pop();
          }
          co_await boost::asio::async_write(self->_pimpl->_socket,
            boost::asio::buffer(node->_data, static_cast<size_t>(node->_msg_len)),
            boost::asio::use_awaitable);
          }
      } catch (const boost::system::system_error &err) {
        logger.error("Session send error: {}", err.code().message());
        self->_pimpl->close();
      }
    }, boost::asio::detached);
  }

}

std::string &Session::getUuid() const {
  return _pimpl->_uuid;
}

boost::asio::ip::tcp::socket &Session::getSocket() {
  return _pimpl->_socket;
}

} // namespace core
```

## Logic

逻辑层的核心在于启动时会挂起一个工作线程，不断从逻辑队列中取出数据，并根据节点的 id 调用不同的回调，随后将处理结果发送会客户端。

```cpp
/******************************************************************************
 *
 * @file       LogicSystem.hpp
 * @brief      逻辑系统的实现
 *
 * @author     KBchulan
 * @date       2025/07/29
 * @history
 ******************************************************************************/

#ifndef LOGICSYSTEM_HPP
#define LOGICSYSTEM_HPP

#include <memory>
#include <functional>

#include <core/CoreExport.hpp>
#include <global/Singleton.hpp>

namespace core {

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

} // namespace core

#define logicSystem core::LogicSystem::getInstance()

#endif // LOGICSYSTEM_HPP
```

对应的实现代码如下：

```cpp
#include "LogicSystem.hpp"

#include <map>
#include <mutex>
#include <queue>
#include <memory>
#include <atomic>
#include <thread>
#include <sstream>
#include <iostream>
#include <condition_variable>

#include <json/json.h>
#include <json/value.h>
#include <json/writer.h>
#include <json/reader.h>

#include <global/Global.hpp>
#include <middleware/Logger.hpp>
#include <core/session/Session.hpp>
#include <core/logic/LogicNode.hpp>
#include <core/msg-node/MsgNode.hpp>

namespace core {

struct LogicSystem::_impl {
  std::mutex _queue_mutex;
  std::condition_variable _queue_cv;
  std::queue<std::shared_ptr<LogicNode>> _msg_queue;

  std::jthread _worker_thread;

  std::atomic_bool _b_stop{false};
  std::map<short, FunCallBack> _msg_handlers;

  // 注册所有的回调函数
  void RegisterCallback();

  // 处理消息
  void ProcessMessage(const std::shared_ptr<LogicNode>& logic_node);

  _impl() {
    // 注册回调函数
    RegisterCallback();

    // 启动工作线程
    _worker_thread = std::jthread([this](const std::stop_token &stop_token) -> void {
      while (!stop_token.stop_requested()) {
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
          std::lock_guard<std::mutex> lock{_queue_mutex};
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

void LogicSystem::_impl::RegisterCallback() {
  _msg_handlers[static_cast<short>(MSG_TYPE::MSG_HELLO_WORLD)] =
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

  if (auto iter = _msg_handlers.find(msg_id); iter != _msg_handlers.end()) {
    iter->second(logic_node->_session, msg_id, logic_node->_recvNode->_data);
  } else {
    logger.error("no handler for msg id: {}", msg_id);
  }
}

LogicSystem::LogicSystem() : _pimpl(std::make_unique<_impl>()) {}

LogicSystem::~LogicSystem() {
  _pimpl->_b_stop.store(true, std::memory_order_release);
  _pimpl->_queue_cv.notify_one();
}

void LogicSystem::PostMsgToLogicQueue(const std::shared_ptr<LogicNode> &logic_node) {
  std::lock_guard<std::mutex> lock{_pimpl->_queue_mutex};
  _pimpl->_msg_queue.push(logic_node);

  if (_pimpl->_msg_queue.size() == 1) {
    _pimpl->_queue_cv.notify_one();
  }
}

} // namespace core
```

## 主函数

至此，我们封装好了所有的组件，到了汇总的时候了，考虑设计优雅退出，主函数最终是这样的：

```cpp
#include <middleware/Logger.hpp>
#include <core/server/Server.hpp>
#include <boost/asio/signal_set.hpp>

int main() {
  try {
    boost::asio::io_context ioc;

    boost::asio::signal_set signals(ioc, SIGINT, SIGTERM);
    signals.async_wait([&ioc](const boost::system::error_code &err, int signal) -> void {
      if (!err) {
        logger.info("Received signal {}, stopping io_context", signal);
        ioc.stop();
      } else {
        logger.error("Error receiving signal: {}", err.message());
      }
    });

    core::Server server(ioc, 10088);
    ioc.run();
  } catch (const boost::system::error_code& err) {
    logger.error("error code is: {}", err.value());
  }
}
```

## 总结

基于协程设计的异步服务器就算介绍完了，可以看出来与先前设计的服务器只在 Session 层有区别，还是很容易理解的，可以说是对开发和性能都很优秀的选择了，如果可以使用c++20以上的版本，那么协程一定是你的不二之选。

至此，面向TCP的服务器设计我们就到此为止了，在本专题的学习中，我们从最开始的同步API，设计了简单的同步服务器；随后又基于异步API，设计了一个简陋的异步服务器；再往后，我们为这个简陋的异步服务器加上了写(发送队列、字节序处理)和读(粘包处理)的优化，并引入了两种序列化方式(protobuf、jsoncpp)；再往后，我们又基于协程完成了这些设计，回想起来，东西不算多，但在不断剖析这个框架的底层实现与设计的过程中，相信都会有自己的收获。

后续会补充一下 http 的设计和 gRPC 的使用，对于微服务的使用都很有用。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/17-coroutine-server/src/main.cc)。
