---
title: 02 性能分析工具
article: true
order: 2
star: false

category:
  - 语言

tag:
  - cpp

date: 2025-09-02

description: cpp 中常见的性能分析工具
footer: Always coding, always learning
---
<!-- more -->

在 C++ 开发中，性能优化是一个绕不开的关键环节，但受限于硬件、复杂的代码逻辑等多方面的影响，很多情况下我们无法仅靠感觉进行猜测和优化。

虽然说 **过早的优化是万恶之源**，但当性能问题真正出现时，我们必须有能力精准地定位它，本节我们以一个开源项目 [tinyraytracer](https://github.com/ssloy/tinyraytracer) 为例进行分析，介绍几款比较常用的性能分析工具。

## Gprof

`gprof` 是 GNU Binutils 工具集自带的一款经典的性能分析（Profiling）工具，它通过在程序中 **插桩** 来收集运行时的信息，能够生成函数级别的性能报告，包括每个函数的调用次数、执行耗时以及函数间的调用关系图。

### 报告生成

以下是使用 `gprof` 进行性能分析的标准流程，使用此工具时都可以仿照此流程。

首先，为了使 `gprof` 能够收集数据，必须在编译和链接阶段都添加 `-pg` 标志。

```bash
cmake .. -DCMAKE_CXX_FLAGS="-pg"
```

添加标志后，正常编译项目并运行生成的可执行文件。

```bash
# 构建
ninja

# 运行
./tinyraytracer
```

程序正常执行完毕后，将在当前工作目录下生成一个名为 `gmon.out` 的文件，其中包含了原始的性能分析数据，我们可以使用 `gprof` 命令解析 `gmon.out` 文件，并将结果重定向到文本文件以便查阅。

```bash
gprof ./tinyraytracer gmon.out > gprof.txt
```

至此，一份完整的性能分析报告 `gprof.txt` 就已生成。

### 报告分析

`gprof` 的报告主要包含两部分核心内容：**扁平性能分析（Flat Profile）** 和 **调用图（Call Graph）**。

#### 扁平性能分析

这部分按函数自身消耗的 CPU 时间降序排列，是定位性能热点的首要依据。

```text
Flat profile:

Each sample counts as 0.01 seconds.
  %   cumulative   self              self     total
 time   seconds   seconds    calls  ns/call  ns/call  name
 57.20      0.24     0.24   831826   288.80   288.80  scene_intersect(vec3 const&, vec3 const&)
 35.75      0.39     0.15                             cast_ray(vec3 const&, vec3 const&, int)
  4.77      0.41     0.02   151140   132.46   132.46  refract(vec3 const&, vec3 const&, float, float)
  2.38      0.42     0.01                             main
```

各个名词的含义其实在这个文件中都有介绍，此处我们简单介绍一下：

- `% time`: 函数自身消耗的 CPU 时间占总时间的百分比，不包含其调用的子函数的耗时。
- `cumulative seconds`: 从程序开始累计执行了多长时间。
- `self seconds`: 函数自身的执行耗时多少秒，不含子函数。
- `calls`: 函数被调用的总次数。
- `self ns/call`: 平均每次调用的自身耗时。
- `total ns/call`: 平均每次调用的总耗时，包含子函数。
- `name`: 函数符号。

根据报告，`scene_intersect` 函数自身消耗了 **57.20%** 的执行时间，总共执行了 **831826** 次，因此此函数只要有一点优化，对整个程序的优化都是巨大的。

#### 调用图

这部分展示了函数之间详细的调用关系链，能帮助我们理解一个函数的耗时是由自身产生，还是由它调用的其他函数产生。

```txt
index % time    self  children    called     name
                              285752             cast_ray(vec3 const&, vec3 const&, int) [1]
[1]     97.6    0.15    0.26       0+285752  cast_ray(vec3 const&, vec3 const&, int) [1]
                0.24    0.00  831826/831826      scene_intersect(vec3 const&, vec3 const&) [2]
                0.02    0.00  151140/151140      refract(vec3 const&, vec3 const&, float, float) [3]
                              285752             cast_ray(vec3 const&, vec3 const&, int) [1]
-----------------------------------------------
                0.24    0.00  831826/831826      cast_ray(vec3 const&, vec3 const&, int) [1]
[2]     57.1    0.24    0.00  831826         scene_intersect(vec3 const&, vec3 const&) [2]
-----------------------------------------------
                               71709             refract(vec3 const&, vec3 const&, float, float) [3]
                0.02    0.00  151140/151140      cast_ray(vec3 const&, vec3 const&, int) [1]
[3]      4.8    0.02    0.00  151140+71709   refract(vec3 const&, vec3 const&, float, float) [3]
                               71709             refract(vec3 const&, vec3 const&, float, float) [3]
-----------------------------------------------
                                                 <spontaneous>
[4]      2.4    0.01    0.00                 main [4]
-----------------------------------------------
```

我们先来理解它的结构：

- `[index]` 是每个核心函数的唯一编号，带 index 的那一行是核心函数。
- 核心函数 **上方** 的函数，是调用它的父函数。
- 核心函数 **下方** 的函数，是它调用的子函数。

因此这个部分我们既可以看到调用耗时，还可以看到调用路径，以此判断是否存在递归等现象。

在本调用图中，我们可以清晰地看到性能热点路径：`main` -> `cast_ray` -> `scene_intersect`。虽然 `cast_ray` 耗时最长，但它的时间主要花在了调用 `scene_intersect` 上，因此，`scene_intersect` 函数是整个程序最核心的性能瓶颈，是优化的首要目标。

### 总结

这个方案使用上非常简单，仅需在编译时添加 `-pg` 标志，并通过简单命令即可生成报告，提供的信息还是很多的，进行初步分析完全足够。

但是由于它的插桩采样原理，对于 **执行时间极短的函数、动态库的函数、子线程的函数** 都可能无法追踪分析，局限性也是很大。

因此 gprof 更多的是对 **单线程、计算密集型** 的应用程序进行初步的性能分析，要想有更多的功能还是得采用其他策略。

## Perf & FlameGraph

gprof 只能算是玩具，更多情况下我们会使用 `perf` 进行分析，它直接构建于 Linux 内核的性能计数器（PMU）之上，因此开销极低，它不止能提供用户态的调用，还可以分析内核、硬件级别的使用情况。

而 **火焰图（Flame Graph）** 则是一种性能可视化工具，它能将 `perf` 采集到的海量调用栈数据，转换为 svg 这样的可视化图，方便进行分析。

### 火焰图生成

生成火焰图需要两步：首先使用 `perf` 采集数据，然后使用 [FlameGraph](https://github.com/brendangregg/FlameGraph) 项目提供的脚本将数据转换成火焰图。

首先先装一下这两个东西：

```bash
# 安装 perf
sudo pacman -S perf

# 下载火焰图工具集
git clone https://github.com/brendangregg/FlameGraph.git
```

在编译时不需要 `-pg` 标志，但为了能清晰地看到函数名而不是一堆地址，我们需要加入调试信息 `-g`。

```bash
# 假设已回到 build 目录
cmake .. -DCMAKE_CXX_FLAGS="-g"
ninja
```

然后，使用 `perf record` 命令来运行程序并采集性能数据。

```bash
# -F 99: 指定采样频率为 99Hz
# -g: 表示记录调用图
perf record -F 99 -g -- ./tinyraytracer
```

运行结束后，当前目录会生成一个 `perf.data` 文件，这就是 `perf` 采集到的原始性能数据。我们可以通过 `perf report` 命令在终端中交互式地查看一个简化版的分析结果，它和 `gprof` 的扁平分析有些类似，可以自己看一下。

接下来就是火焰图的生成流程，这需要借助 FlameGraph 项目中的两个核心脚本：`stackcollapse-perf.pl` 和 `flamegraph.pl`。

```bash
# 分析并折叠调用栈
sudo perf script | ../FlameGraph/stackcollapse-perf.pl > out.perf-folded

# 生成 SVG 火焰图
../FlameGraph/flamegraph.pl out.perf-folded > perf.svg
```

现在，我们得到了一张名为 `perf.svg` 的图片，也是我们期望看到的火焰图。

### 火焰图分析

火焰图看起来像一座由许多矩形“火焰”组成的山脉，非常直观：

![](/assets/pages/cpp/02-tinyraytracer.svg)

- **Y 轴**：代表了 **调用栈的深度**。顶部的函数是正在执行的函数，它下方的函数是调用它的父函数。
- **X 轴**：代表了 **样本数量**。一个矩形的宽度越宽，就表示它（以及它调用的所有子函数）在采样中出现的次数越多，也就是执行耗时越长。**因此，寻找性能瓶颈，就是寻找那些最宽的火焰山顶**。

通过分析火焰图，我们可以轻易地发现，`scene_intersect` 函数对应的矩形最宽，所以它最耗时。这与我们之前用 `gprof` 得到的结论完全一致，火焰图的优势在于，它能更清晰地展示出从 `main` 函数到性能热点函数的完整调用路径和耗时分布，如果调用链非常复杂，火焰图的优势会更加明显。

### 服务器分析

对于像 Web 服务器、数据库或后台服务这样长期运行（long-running）的程序，我们不可能等到它退出再分析，`perf` 对此提供了完美的支持，我们可以随时附加到指定的进程上进行采样。

首先需要获取正在运行的服务器程序的进程 ID（PID），可以使用 `pgrep` 或 `ps` 命令：

```bash
pgrep server
# 或者
ps aux | grep server
```

获取到 PID 后，使用 `perf record` 的 `-p` 选项来指定要分析的进程，我们此处采用定时采样的方案：

```bash
# 假设 PID 是 12345，我们采样 30 秒
sudo perf record -F 99 -g -p 12345 -- sleep 30
```

这个时候可以用一些压测工具进行测试，结束后会生成 `perf.data` 文件，后续生成火焰图的步骤与之前保持一致即可。

### 总结

perf + 火焰图的方式更适合绝大多数场景，源于它对内核 + 用户的追踪能力，且由于它的非侵入式采样，非常适合用于生产环境或对性能敏感的应用，最主要的是最后的火焰图，让我们可以一眼看出瓶颈所在，也可以在不同时间段截取火焰图，以对比分析。

## Valgrind & KCachegrind

`Valgrind` 主要用于进行微观分析，它是一个非常强大的动态分析框架，包含多种工具，其中用于性能分析的是 `callgrind`。

与 `perf` 基于采样的原理不同，`callgrind` 通过 **动态二进制插桩** 技术，在程序运行时监控并记录每一条指令的执行信息，因此它能提供极其详尽的数据，比如每个函数确切的调用次数、执行的指令数等，而不仅仅是基于概率的估算。

当然，这种精确性是有代价的，`Valgrind` 会让你的程序运行得非常非常慢（通常会慢 10-100 倍），因此它不适合分析整个大型项目或对实时性要求高的服务，而更适合对已经定位到的核心模块或函数进行深入、细致的分析。

`KCachegrind` (在某些系统上叫 `QCachegrind`) 则是 `callgrind` 输出文件的可视化前端，它能以非常友好的界面展示所有收集到的数据。

### 数据生成

如果没有安装的话，可以搜一下自己的平台如何安装，在 arch 上直接安装即可：

```bash
sudo pacman -S valgrind kcachegrind
```

运行 `callgrind` 无需特殊编译参数，但为了看到清晰的函数名，保留 `-g` 调试信息依然是比较推荐的。

```bash
# 生成构建文件
cmake .. -DCMAKE_CXX_FLAGS="-g"

# 然后正常编译和运行即可

# --tool=callgrind: 指定使用 callgrind 工具
# --dump-instr=yes: 收集指令级别的数据
# --collect-jumps=yes: 收集跳转指令数据，用于构建更精确的控制流图
valgrind --tool=callgrind --dump-instr=yes --collect-jumps=yes ./tinyraytracer
```

程序会以极慢的速度运行，结束后会在当前目录生成一个名为 `callgrind.out.PID` 的文件（PID 是进程号）。

### 数据分析

直接使用 `kcachegrind` 命令打开上一步生成的文件：

```bash
kcachegrind callgrind.out.PID
```

KCachegrind 的界面非常强大，主要关注如下几个数据：

- **Flat Profile**: 左侧面板默认显示所有函数的列表，可以按多种指标排序。

  - **Incl. (Inclusive)**: 包含所有成本，即该函数以及它调用的所有子函数的总成本，类似于火焰图的宽度。
  - **Self (Self)**: 自身成本，即仅该函数自身执行的成本，不包含子函数。
- **右侧面板**: 选中一个函数后，右侧会出来该函数的很多选项：

  - **Source Code**: KCachegrind 可以将性能数据标注到每一行源代码或汇编指令上，让你精确地看到哪一行代码消耗了最多的资源。
  - **callers**：该函数各个调用子函数的占比情况。

通过 KCachegrind，我们可以再次确认 `scene_intersect` 是性能瓶颈，并且能得到它被精确调用了多少次，执行了多少条指令，这些都是 `perf` 无法提供的精确数据。

### 总结

`Valgrind` 提供的是极致精确的性能数据，我们可以用 `perf` 定位到某个可疑的复杂函数，然后使用 `callgrind` 对其进行精细解剖，找出其中最耗资源的代码行，但由于其巨大的性能开销，切记 **不要用它来分析整个系统或大型应用的启动过程**。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/cpp/02-performance-analysis/main.cc)。
