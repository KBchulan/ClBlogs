---
title: 01 protobuf 环境冲突
article: true
order: 1
star: true

category:
  - bug

tag:
  - bug

date: 2025-07-12

description: windows 下基于 msys2 使用 protobuf导致的运行时环境冲突问题。
footer: Always coding, always learning
---

<!-- more -->

# protobuf 环境冲突

在学习asio的[protobuf](https://kbchulan.github.io/ClBlogs/blogs-main/asio/10-asio.html) 的过程中，遇到了一个很有意思的问题，这里记录一下。

## 问题描述

笔者的环境是 windows 下基于 msys2 的 ucrt64 环境，当时安装了 protobuf，然后写了一个[测试程序](https://github.com/KBchulan/ClBlogs-Src/blob/main/pages-other/bug-fix/bug1/main.cc)，构建生成和构建都是正常的，但是运行时出现了 **silent exit** 的问题。

```bash
PS E:\code\ClBlogs-Src\pages-other\bug-fix\bug1\build> cmake ..
-- Building for: MinGW Makefiles
-- The C compiler identification is GNU 15.1.0
-- The CXX compiler identification is GNU 15.1.0
-- Detecting C compiler ABI info
-- Detecting C compiler ABI info - done
-- Check for working C compiler: C:/msys64/ucrt64/bin/cc.exe - skipped
-- Detecting C compile features
-- Detecting C compile features - done
-- Detecting CXX compiler ABI info
-- Detecting CXX compiler ABI info - done
-- Check for working CXX compiler: C:/msys64/ucrt64/bin/c++.exe - skipped
-- Detecting CXX compile features
-- Detecting CXX compile features - done
-- Found PkgConfig: C:/msys64/ucrt64/bin/pkg-config.exe (found version "2.5.1")
-- Checking for module 'protobuf'
--   Found protobuf, version 31.1.0
-- Checking for module 'absl_any'
--   Found absl_any, version 20250512
-- Checking for modules 'gtest;gtest_main'
--   Found gtest, version 1.17.0
--   Found gtest_main, version 1.17.0
-- Configuring done (2.7s)
-- Generating done (0.0s)
-- Build files have been written to: E:/code/ClBlogs-Src/pages-other/bug-fix/bug1/build
PS E:\code\ClBlogs-Src\pages-other\bug-fix\bug1\build> make
[ 33%] Building CXX object CMakeFiles/client.dir/main.cc.obj
[ 66%] Building CXX object CMakeFiles/client.dir/person.pb.cc.obj
[100%] Linking CXX executable client.exe
[100%] Built target client
PS E:\code\ClBlogs-Src\pages-other\bug-fix\bug1\build> .\client.exe
PS E:\code\ClBlogs-Src\pages-other\bug-fix\bug1\build>
```

可以看到，构建系统的生成和构建都很正常，但是当运行时，没有任何输出，直接退出。

## 问题分析

笔者当时以为是程序问题，导致代码走到 `GOOGLE_PROTOBUF_VERIFY_VERSION` 时检测到了版本不一致，触发 `abort` 导致程序退出，这样也会导致静默退出。

但事实上，我们即使把主程序更改为 `std::cout << "hello world" << std::endl;` 也会出现静默退出的问题。

那基本就可以肯定不是程序问题了，那自然要看一下堆栈调用，因此我们使用 gdb 来查看堆栈调用。

```bash
(gdb) run
Starting program: E:\code\ClBlogs-Src\blogs-main\asio\10-protobuf\test\build\client.exe
[New Thread 79136.0x134e4]
[New Thread 79136.0x13510]
[New Thread 79136.0x13518]
[Thread 79136.0x134e4 exited with code 3221225785]
[Thread 79136.0x13544 exited with code 3221225785]
[Thread 79136.0x13518 exited with code 3221225785]
During startup program exited with code 0xc0000139.
```

可以看到退出的错误代码是 `0xc0000139`，这个错误代码在 windows 下表示 **STATUS_ENTRYPOINT_NOT_FOUND**，即在调用DLL 里的某个具体函数时，却发现那个 DLL 里**根本没有这个函数**，或者函数的签名对不上，这很显然是库的版本冲突问题或者重名依赖问题，但是由于我们使用 pacman 安装，基本可以确定是其他软件或者其他环境导致的重名冲突。

在 windows 上搜索 DLL 有一套顺序(简化一点)：

1.  **程序所在的目录** (`E:\...\bug1\build`)
2.  **系统目录** (`C:\WINDOWS\System32`)
3.  16位系统目录 (`C:\WINDOWS\System`)
4.  Windows 目录 (`C:\WINDOWS`)
5.  当前工作目录 (Current Working Directory)
6.  **最后，才会去查找 `PATH` 环境变量中列出的目录**

因此当运行时他会去按顺序找这个 DLL，而本次bug的关键就在于它在寻找到ucrt64的libprotobuf.dll前，就已经找到了其他环境的同名DLL，自然会导致签名不同，出现此问题。

我尝试把 ucrt64/bin 放在 system path 的最前面，依旧不行，那么基本可以肯定是系统目录的同名DLL导致的，但是直接修改又很危险，有没有什么办法拿到一个 ucrt64 最优先的环境呢？

## 解决方案

当然是有的，直接使用 msys2 ucrt64 终端即可，当启动这个终端时，他会加载一个 `msys-2.0.dll` 的核心运行时库，所有用 MSYS2 工具链（如 UCRT64 GCC）编译的程序，都会隐式地依赖这个 `msys-2.0.dll`。这个核心库就像一个“翻译官”和“环境管理者”，它会在程序启动时，**在内存中动态地、强制性地改变自己程序的 DLL 搜索路径**，确保优先从 MSYS2 自己的目录 (`/ucrt64/bin`) 中加载，从而确保环境中 ucrt64 的优先级，此时我们再运行程序，就可以正常打印了。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/pages-other/bug-fix/bug1/main.cc)。
