---
title: 02 buffer结构与同步读写

article: true
order: 2
star: false

category:
  - 网络

tag:
  - asio

date: 2025-06-29

description: buffer底层实现，同步读写
footer: Always coding, always learning
---

# buffer结构与同步读写

## buffer实现

boost.asio底层是为我们提供了`asio::const_buffer`和`asio::mutable_buffer`两种buffer，分别对应写和读两种操作，这两种buffer的第一个位置存储后续数据的长度，后面则是具体的数据，这是对于一个buffer而言。

但是事实上我们的api中要求的是一个`ConstBufferSequence`和`MutableBufferSequence`，这是两个模板类，分别对应`const_buffer`和`mutable_buffer`的序列，我们可以这样理解，有一个queue/vector，每个元素指向一个个buffer的首地址，这样可以通过访问序列找到buffer，然后再进行数据的读写，这样就很高效，减少内存碎片的产生。

总而言之，所以我们可以通过手动模拟这个序列或者直接使用`boost::asio::buffer`，后者会根据我们传入的参数直接生成`const_buffer_1`，`mutable_buffer_1`，这两种类型就是我们期待的序列，来生成我们在读写时需要的Buffer。

### 模拟实现

如上述所言，我们只需要构造每一个位置都是`const_buffer`或者`mutable_buffer`的序列，这个序列即可使用，也是非常的简单啊。

```cpp
void send_mock_buffer() {
  std::string str{"hello, buffer"};
  boost::asio::const_buffer cb{str.c_str(), str.length()};

  std::vector<boost::asio::const_buffer> const_buffer_sq;
  const_buffer_sq.emplace_back(cb);

  boost::asio::io_context ioc;
  boost::asio::ip::tcp::socket sock{ioc};

  sock.send(const_buffer_sq);
}
```

后记，2025-6-29，我看文档中已经移除了`const_buffer_1`和`mutable_buffer_1`，以`const_buffer`和`mutable_buffer`代替，所以其实在构造出来cb时就可以发送了。

### 使用buffer

直接调用`boost::asio::buffer`，传入字符串可以返回对应的`const_buffer`或`mutable_buffer`，根据最新的标准来看，直接就可以用于读写。

```cpp
void use_buffer_1() {
  // res: const_buffer
  boost::asio::const_buffer res = boost::asio::buffer("hello, buffer");
}

void use_buffer_2() {
  constexpr std::uint16_t BLOCK_SIZE = 20;
  std::unique_ptr<char> buf{new char[BLOCK_SIZE]};
  // res: mutable_buffer
  auto res = boost::asio::buffer(reinterpret_cast<void*>(buf.get()), BLOCK_SIZE);
}
```

## 同步读写

由于读写基本一致，我们这里以写为示例，介绍关于同步写的相关API，主要有 `boost::asio::write`, `boost::asio::write_at`, `socket.send()` 和 `socket.write_some()`。

### `socket.write_some`

这个函数会尝试非阻塞发送一次数据，返回发送了多少字节，因此我们需要通过循环等手段来自己处理网络拥塞等场景导致的数据一次没有发送完成的情况，其实socket.send()也是这个逻辑，两个写法也是一样的。

```cpp
void write_to_socket(boost::asio::ip::tcp::socket& sock) {
  std::string str{"hello, write some"};
  std::size_t total_length = 0;

  while (total_length != str.length()) {
    total_length += sock.write_some(boost::asio::buffer(str.c_str() + total_length, str.length() - total_length));
  }
}
```

### `boost::asio::write`

这个函数会阻塞等待所有数据发送完成，返回发送了多少字节，这个函数会自动处理重试直到所有数据发送完成。

```cpp
void write_to_socket_2(boost::asio::ip::tcp::socket& sock) {
  std::string str{"hello, write all"};
  boost::asio::write(sock, boost::asio::buffer(str));
}
```

### `boost::asio::write_at`

这个函数则是针对随机访问设备的定位写入，比如文件，也是确保所有数据都写入完成，与tcp通信关系不大，这里了解一下即可。

```cpp
void demonstrate_write_at() {
  boost::asio::io_context ioc;

  try {
    boost::asio::random_access_file file(
        ioc, "test.txt",
        boost::asio::random_access_file::write_only |
            boost::asio::random_access_file::create);

    std::string data1 = "Hello ";
    std::string data2 = "World!";

    boost::asio::write_at(file, 0, boost::asio::buffer(data1));

    boost::asio::write_at(file, 6, boost::asio::buffer(data2));
  } catch (const std::exception &e) {
    std::cerr << "Error: " << e.what() << std::endl;
  }
}
```

对应的读的api分别是 `boost::asio::read`, `boost::asio::read_at`, `socket.receive()` 和 `socket.read_some()`，用法是一毛一样，无需多言。

## 总结

本节我们了解了一下buffer的结构，以及同步读写的api，各个api的应用场景不同，需要根据实际需求选择合适的api。

本节的核心在于：**buffer结构，同步读写**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/asio/2-buffer/buffer.cc)。
