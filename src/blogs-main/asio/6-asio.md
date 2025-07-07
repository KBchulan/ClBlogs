---
title: 06 异步echo服务器

article: true
order: 6
star: false

category:
  - 网络

tag:
  - asio

date: 2025-07-05

description: 使用shared_ptr + lambda实现闭包，解决上节遗留的隐患
footer: Always coding, always learning
---

<!-- more -->

# 06 异步echo服务器

在上一节中，我们提到了一个隐患，即当一个会话挂起多个事件时，如果对端关闭，会导致 Session 对象的多次析构，引发 segfault，同时我们也给出了方案，既然我们想只要有事件就让这个对象存活，那么自然就想到了 `shared_ptr`，来一个事件，计数就 +1，这样就可以解决上节的隐患。

## Server改进

增加一个map来管理所有的会话对象，方便服务器后续实现踢人、重连等逻辑。

```cpp
class Session;
class CORE_EXPORT Server {
public:
  Server(boost::asio::io_context& ioc, unsigned short port);

private:
  void start_accept();
  void handle_accept(const std::shared_ptr<Session> &new_sess, const boost::system::error_code& err);

  boost::asio::io_context &_ioc;
  boost::asio::ip::tcp::acceptor _accep;

  std::map<std::string, std::shared_ptr<Session>> _sessions;  // 新增map管理会话
};
```

那么对应的私有函数也应该修改为智能指针版本：

```cpp
void Server::start_accept() {
  auto new_sess = std::make_shared<Session>(_ioc, this);
  _accep.async_accept(new_sess->getSocket(), [this, new_sess](boost::system::error_code err) -> void {
    handle_accept(new_sess, err);
  });
}

void Server::handle_accept(const std::shared_ptr<Session> &new_sess, const boost::system::error_code& err) {
  if (!err) {
    new_sess->Start();
    _sessions[new_sess->getUUid()] = new_sess;
  } else {
    logger.error("error code is: {}, error msg is: {}\n", err.value(), err.message());
  }

  start_accept();
}
```

我们选择了 `uuid` 作为key，可以了解一下类似的算法，如雪花算法、校验相关的 md5，sha256 等。

同时，因为两个类都依赖于对方，所以必须采用头文件声明，源文件包含对方，否则就会导致编译错误。

## Session改进

对于Session，首先增加一个 `uuid` 成员，并实现一个 `getUUID` 函数，此处的 uuid 我们采用梅森算法生成，也是boost内置函数。

```cpp
class Server;
class CORE_EXPORT Session : public std::enable_shared_from_this<Session> {
public:
  Session(boost::asio::io_context& ioc, Server* server) : _sock(ioc), _server(server) {
    boost::uuids::uuid uuid = boost::uuids::random_generator_mt19937()();
    _uuid = boost::uuids::to_string(uuid);
  }

  void Start();

  boost::asio::ip::tcp::socket& getSocket() { return _sock; }
  std::string getUUid() { return _uuid; }

private:
  void handle_read(const boost::system::error_code& err, std::size_t bytes_transferred);
  void handle_write(const boost::system::error_code& err);

  boost::asio::ip::tcp::socket _sock;
  std::array<char, MAX_LENGTH> _data;

  Server *_server;
  std::string _uuid;
};
```

然后我们需要考虑一个事情，如何传递这个 shared_ptr，是在回调函数中增加一个参数，然后从 Start 中使用 `std::make_shared<Session>(this)` 创建吗？可以想一下这样可行不。

答案很显然是否定的，智能指针的原则有一条就是不能用一个对象构造多个智能指针，否则会导致各个智能指针的计数不一致，导致对象被多次析构，毕竟每个指针都以为自己独占这个对象。

如上，可以看到我们使用了 [CRTP](https://en.cppreference.com/w/cpp/language/crtp.html) 的方式继承了 `std::enable_shared_from_this`，这样我们就可以直接调用 `shared_from_this` 来获取当前对象的智能指针，此时都管理的是同一个对象，只会影响控制块的计数。

那么我们只需要给每一个回调时让该对象的计数 +1 即可，使用 lambda 的初始化可以轻松做到：

```cpp
void Session::Start() {
  _data.fill('\0');
  _sock.async_read_some(boost::asio::buffer(_data.data(), MAX_LENGTH),
    // 使用lambda初始化，让self的计数 +1
    [self = shared_from_this()](const boost::system::error_code &err, std::size_t bytes_transferred) -> void {
      self->handle_read(err, bytes_transferred);
    }
  );
}
```

其余两个回调进行相同处理即可。

此时我们再考虑一下这个共享指针都会在什么时刻变化：

- 当一个 Session 被创建时，计数为1
- 触发读写回调时，计数 +1
- 读写回调完成，不管是否发生异常，计数 -1

那么现在就符合我们预期了，只要存在事件，我们的 Session 就是存活的，可以正常处理事件，甚至假设我们服务器踢人(map.erase)，也只会减少计数，直到所有读写操作都执行完才会真正释放 Session。

## 总结

本节我们使用 **shared_ptr** 改进了上节的服务器，确保对象在有任何事件没有处理完时都不会被析构。

本节的核心是：**优先使用智能指针来管理对象**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/6-async-server-closure/src/main.cc)。