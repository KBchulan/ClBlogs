---
title: 01 环境配置
article: true
order: 1
star: false

category:
  - 语言

tag:
  - cpp

date: 2025-06-04

description: c++ 篇章的总览介绍
footer: Always coding, always learning
---

<!-- more -->

# 01 环境配置

> 本专题记录作者学习现代 C++ 的笔记， 应该只会记录一些不太熟悉的特性。

## 编译器选择

要想学习现代 C++，一个支持最新标准（如 C++20/23）的编译器是必不可少的，主流编译器主要有如下三种：

- **GCC**：开源界的老大，跨平台，新标准支持好，标准库为 **libstdc++**。

- **Clang**：由 [LLVM项目](https://github.com/llvm/llvm-project) 提供的 C/C++/Objective-C 编译器，比较知名的是它清晰的错误提示与clangd的良好集成，对于开发是很友好的，标准库为 **libc++**。

- **MSVC**：Windows 平台的官方编译器，集成在 Visual Studio 中，标准库为 **MSVC STL**。

本节我们都会给出怎么安装，可以按需下载：如果基于 linux 环境，直接使用自带的包管理器即可，如果基于 windows 环境，我强烈建议使用 **msys2** 来搭建环境。

## MSYS2

[MSYS2](https://www.msys2.org/) 是一个 Windows 上的软件分发和构建平台，它提供了一个类 Unix 的 shell 环境和强大的包管理器 pacman，安装环境非常方便，后续很多专题中我们配置环境都是基于这个平台。

### 介绍

直接在官网下载并按照默认配置安装即可，随后你会看到多个启动项，我们主要关心两种：

- **UCRT64**：它使用 Windows 最新的通用 C 运行时，与 MSVC 和现代 Windows API 的兼容性最好。
- **MINGW64**：它使用旧版的 MSVCRT.dll 作为 C 运行时，在老项目中比较常见。

如果你是一个全新的环境或者说要做一个新项目了，首选一定是 **UCRT64**，接下来我们所有的操作都是基于这个环境进行。

### 工具链

首先需要说明的是，UCRT64 环境的包管理器是 **pacman**，如果有用过 archlinux 的话，应该会比较熟悉，当然你也可以看一下 [这篇文章](https://www.atlantic.net/dedicated-server-hosting/how-to-use-pacman-in-arch-linux/) 来快速上手使用。

首先打开 msys2 终端：

```bash
# 更新包数据库和基础包
pacman -Syu

# 安装 GCC, Clang, GDB, CMake 和 Ninja 等所有必需工具
# 此处使用 toolchain 直接安装，如果缺少什么可以自行补充
pacman -S mingw-w64-ucrt-x86_64-toolchain
```

这里举一个例子，如果你需要安装 `yaml-cpp`，可以按照如下操作，其他各种第三方库大都可以按照如上方式进行安装：

```bash
# 查询包名
pacman -Ss yaml-cpp

# 然后找到对应 ucrt64 的包，选择合适的版本后，复制名字进行安装
pacman -S mingw-w64-ucrt-x86_64-yaml-cpp
```

随后把 ucrt64 的 `bin` 目录添加到环境变量，然后打开一下 powershell 验证一下即可：

```bash
# 2025-8-13
gcc --version # 15.2.0
```

## Ubuntu 22.04

[Ubuntu](https://ubuntu.com/desktop)是一个基于deban的开源操作系统，使用**apt**作为包管理工具。其最新的版本是Ubuntu 24.04 LTS，而 22.04 LTS是比较稳定的长期支持版本。

笔者使用Ubuntu 22.04作为另一个系统，其缺憾是apt最高只支持gcc12，而gcc12只能初步支持C++ 14。[gcc](https://gcc.gnu.org/projects/cxx-status.html)或者 [clang](https://clang.llvm.org/cxx_status.html)版本对于C++版本的支持情况可以在这里找。

如何在Ubuntu 22.04上使用gcc 15.2.0并使用C++ 23特性？ 直接从gnu官网下载源码编译即可。

1. 下载 [gcc 15.2.0](https://ftp.gnu.org/gnu/gcc/gcc-15.2.0/)压缩包，解压并进入`/.../gcc-15.2.0/`
2. 下载依赖项：
```bash
./contrib/download_prerequisites
```
3. 创建构建目录并配置：
```bash
mkdir build
cd build
../configure --build=x86_64-linux-gnu --host=x86_64-linux-gnu --target=x86_64-linux-gnu --prefix=/usr/local/gcc-15.2.0 --enable-checking=release --enable-languages=c,c++ --disable-multilib --program-suffix=-15.2.0
```
4. 编译和安装 （笔者编译了4个小时以上）
```bash
make -j$(nproc)  # 使用所有可用的CPU核心
sudo make install
```
5. 设置优先级和配置环境变量
```bash
sudo update-alternatives --install /usr/bin/g++ g++ /usr/local/gcc-15.2.0/bin/g++-15.2.0 150
sudo update-alternatives --install /usr/bin/gcc gcc /usr/local/gcc-15.2.0/bin/gcc-15.2.0 150

export LD_LIBRARY_PATH=/usr/local/gcc-15.2.0/lib64:$LD_LIBRARY_PATH
export CPLUS_INCLUDE_PATH=/usr/local/gcc-15.2.0/include/c++/15.2.0:$CPLUS_INCLUDE_PATH
```

6. 最后测试一下gcc版本即可：
```bash
gcc -v
Using built-in specs.
COLLECT_GCC=gcc
COLLECT_LTO_WRAPPER=/usr/local/gcc-15.2.0/libexec/gcc/x86_64-linux-gnu/15.2.0/lto-wrapper
Target: x86_64-linux-gnu
Configured with: ./configure -v --build=x86_64-linux-gnu --host=x86_64-linux-gnu --target=x86_64-linux-gnu --prefix=/usr/local/gcc-15.2.0 --enable-checking=release --enable-languages=c,c++ --disable-multilib --program-suffix=-15.2.0
Thread model: posix
Supported LTO compression algorithms: zlib zstd
gcc version 15.2.0 (GCC)
```

## 开发工具

笔者比较喜欢使用 [vscode](https://code.visualstudio.com/)，如果你更倾向于使用 vs 或者 clion，可以直接跳过这一部分。

主要安装两个插件即可：

- clangd：强烈推荐，不止是 IntelliSense，还支持 CMake 路径，以及类似于 clion 的数据类型显示、修改建议等，体验上非常丝滑。
- CMake Tools：这个插件提供了对 CMake 的支持，可以方便地进行构建和调试。

对于 clangd 配置，笔者的配置如下，可以参考一下，这个属于全局的配置：

```json
"clangd.arguments": [
  "--query-driver=C:/msys64/ucrt64/bin/*",
  "--header-insertion=iwyu",
  "--compile-commands-dir=${workspaceFolder}/build",
  "--background-index",
  "--all-scopes-completion",
  "--completion-style=detailed",
  "--pch-storage=memory",
  "--clang-tidy",
],
"clangd.fallbackFlags": [
  "-IC:/msys64/ucrt64/include",
  "--target=x86_64-w64-mingw32",
  "-std=c++23",
  "-Wno-pragma-pack",
],
```

当然，也可以在项目根目录创建 `.clangd` 文件，对当前项目进行配置，这个会覆盖掉全局配置。

## 构建系统

上文中我们提到了 CMake，这个是一个构建系统生成器，可以根据配置生成不同平台的构建描述文件，用于构建项目，此处我们介绍一下构建系统常用的都有什么，详情可以自行查阅：

- **构建系统生成器**：cmake、meson、qmake、xmake
- **构建描述文件**：makefile、.ninja、.vcxproj
- **构建引擎**：make、ninja、msbuild、nmake、gmake

笔者的配置是 `cmake + ninja`，不管是构建还是编译都是非常的快速，不过在 Windows 系统下，默认情况 cmake 会生成 MSVC 解决方案，可以在环境变量里创建一个 `CMAKE_GENERATOR` 变量，值为 `Ninja`，这样就好了。

我原来写过一个 cmake 的 [项目模板](https://github.com/KBchulan/CMakeTemplate)，可以拿来直接使用。
