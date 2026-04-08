---
title: 02 Docker
article: true
order: 2
star: true

category:
  - 杂货铺

tag:
  - mystore

date: 2025-09-18

description: 介绍 docker 相关的内容
footer: Always coding, always learning
---

<!-- more -->

# Docker

Docker是一种成熟高效的软件部署技术，利用容器化技术为应用程序封装独立的运行环境，每个运行环境即为一个 **容器**，承载容器运行的计算机称为 **宿主机**。

简单说来：假设我们已经有一个应用程序了，然后把这个应用程序、它依赖的一些库和文件系统打包成一个盒子，该盒子在任何电脑上都可以运行，**这个盒子就是容器**。

## 基本认知

下面先来了解一些有关 docker 的基本概念：

- **镜像 (Image)**: 镜像是 **容器的模板**，可类比为软件安装包。

- **容器 (Container)**: 容器是 **基于镜像运行的应用程序实例**，可类比为安装好的软件。

- **数据卷 (Volume)**: 用于容器数据的持久化与共享，可类比为容器的硬盘，删除容器后，数据卷依然存在。

- **Docker仓库 (Registry)**: 用于存放和分享Docker镜像的场所，和 GitHub一样，docker也有自己的仓库 —— [Docker Hub](https://hub.docker.com/)。

- **容器与虚拟机**: 多个容器共享同一个系统内核，而每个虚拟机包含一个操作系统的完整内核，因此容器比虚拟机更轻量、占用空间更小、启动速度更快。

## 安装

Docker 通常是基于Linux的容器化技术，因此核心必须依托 Linux kernel。

### Linux

安装 Docker 非常简单，我使用的是 Arch Linux(btw)，直接使用官方源即可：

```bash
sudo pacman -S docker
```

当然，如果你使用的是其他发行版，可以根据 [这个脚本](https://get.docker.com/) 进行安装。

### Windows

此处给出的方案是 Docker Desktop + WSL2，这个也是比较主流的选择：

首先先安装 [WSL2](https://learn.microsoft.com/zh-cn/windows/wsl/install)，选择一个自己喜欢的发行版并安装。

随后安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)，安装完成后打开 Docker Desktop，进入设置，选择 `Resources` -> `WSL Integration`，开启你安装的发行版即可。

进入WSL2的终端，输入 `docker --version`，如果能看到版本号就说明安装成功了。

> **注意**：采用这种方式安装的话，必须要先启动 Docker Desktop 才能使用 Docker。

## 常用命令

这部分主要介绍一些常用的命令，足够日常使用即可，更多命令可以参考 [官方文档](https://docs.docker.com/engine/reference/commandline/docker/)。

### 镜像

首先就是拉取镜像，先来看一个示例：

```bash
docker pull docker.io/library/hello-world:latest
```

该命令主要遵循 registry_address/username/image_name:tag 的格式：

- registry_address：表示仓库地址，docker.io 是 DockerHub 的地址，可以省略。

- username：表示用户名，其中 library 是官方用户名，可以省略。

- image_name：表示镜像名称，然后它后面的 tag 则表示标签，通常用来区分不同版本的镜像，如果不写则默认使用 latest 标签。

因此上面这个命令也可以简写为：

```bash
docker pull hello-world
```

该命令表示从 DockerHub 拉取官方的 hello-world 镜像的最新版本，如果需要查找某个镜像，可以直接使用 DockerHub 进行搜索。

此时我们按下回车，就会很顺理成章的报错，网络的大手发力了。

可以选择配置代理或者镜像源，这里我们选择更改镜像源，如果是 Linux 系统：

```bash
# 下面的文件没有就创建一个
sudo vim /etc/docker/daemon.json

# 然后写入如下内容
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1panel.live",
    "https://hub.rat.dev"
  ]
}

# 然后重启 docker 服务
sudo systemctl restart docker
```

如果是 Windows，则需要打开 Docker Desktop 设置，选择 `Docker Engine`，然后将上面的内容写入到 JSON 配置中即可，然后重启 Docker Desktop。

此时再次执行 `docker pull hello-world`，就能成功拉取镜像了。

此外，镜像相关的常用命令还有：

```bash
# 查看本地镜像
docker image ls

# 删除本地镜像
docker image rm <image_id/image_name>

# 删除无用镜像，即 tag 为 none 的镜像
docker image prune

# 构建镜像，基于自己写的 Dockerfile
docker build -t <image_name> <docker_file_path>

# 给已有镜像打标签，可以给别人的镜像打标签然后上传到自己的仓库
docker tag <source_image_name> <dockerhub_name/new_image_name>

# 推送镜像到远程仓库
docker push <dockerhub_name/image_name>

# 查看镜像构建历史
docker history <image_name>
```

### 容器

如我们上文所说，镜像就像是软件安装包，而容器则是运行的软件实例，前面我们下载了安装包，这里就该安装对应的软件了，下面来看一些常见的容器命令：

最重要的命令莫过于 `docker run`，它可以基于某个镜像创建并启动一个容器，语法如下：

> 此处的镜像来源优先用本地镜像，如果没有就会去拉取镜像

```bash
docker run [options] <image_name/image_id>
```

其中 `[options]` 是可选参数，常用的有：

- `--rm`：容器停止后自动删除容器。

- `-d`：后台运行容器，并返回容器ID。

- `-e`: 设置环境变量，例如 `-e OPENAI_KEY=value`。

- `-it`：以交互模式运行容器，通常用于需要终端交互的场景。

- `--name <container_name>`：为容器指定一个名称，方便后续管理。

- `-p <host_port>:<container_port>`：将宿主机的端口映射到容器的端口。

- `-v <host_path>:<container_path>`：将宿主机的目录挂载到容器内，方便数据持久化。

- `--restart <ploy>`: 容器退出后的重启策略，例如 `--restart always` 表示容器退出后总是重启。

> p,v 两个参数是因为每个容器都有一个内部的虚拟环境，它有端口、文件系统等概念。

例如，我们可以运行一个 nginx 容器：

```bash
docker run -d --name mynginx -p 8080:80 nginx
```

该命令会从 Docker Hub 拉取最新的 nginx 镜像，创建并启动一个名为 `mynginx` 的容器，并将宿主机的 8080 端口映射到容器的 80 端口，此时我们可以通过访问 `http://localhost:8080` 来查看 nginx 的欢迎页面。

此外，对容器的常见管理操作还有：

```bash
# 查看当前运行的容器
docker ps

# 查看所有容器，包含已停止的
docker ps -a

# 启动已存在但停止的容器
docker start <container_id>

# 重启容器
docker restart <container_id>

# 停止容器
docker stop <container_id>

# 删除容器，该操作要求必须先停止容器
docker rm <container_id>

# 删除所有已退出的容器
docker container prune

# 查看容器的日志
docker logs <container_id>

# 查看容器的详细信息，包括创建时的参数一类的东西
docker inspect <container_id>
```

### 数据卷

容器中的数据默认是临时的，一旦容器删除数据也会随之消失。为了实现数据的持久化与共享，Docker 提供了 **数据卷 (Volume)** 机制，可以把它理解为容器的硬盘，卷可以独立于容器存在，即使容器被删除，卷中的数据依然保留。

数据卷的使用方式主要有三种，先来看一下 **匿名卷**：

```bash
docker run -d -v /data nginx
```

这种方式的数据卷由 Docker 自动创建和管理，一般来说会在宿主机的 `/var/lib/docker/volumes/` 下生成一个随机名字的目录，然后映射到容器内的 `/data` 目录，这之后假如我们在容器内的 `/data` 目录下创建文件，会同步在宿主机的对应目录下创建相同文件，反之亦然。

但是这样不好管理，因为名字是随机的，所以我们可以使用 **具名卷**，这样在宿主机创建的目录名字就是可控的了：

```bash
docker run -d -v mydata:/data nginx
```

我们还可以指定这个目录在宿主机的具体位置，这样就可以直接访问宿主机上的文件了：
```bash
docker run -d -v /home/user/html:/usr/share/nginx/html nginx
```

此外，对数据卷的常见管理操作还有：

```bash
# 查看已有卷
docker volume ls

# 查看卷的详细信息
docker volume inspect <volume_name>

# 删除指定卷
docker volume rm <volume_name>

# 删除无用卷，未被容器使用的
docker volume prune
```

## 高级使用

Docker 依赖于 Linux 内核的命名空间 (Namespace) 和控制组 (Cgroup) 技术来实现资源隔离和管理。

- **命名空间 (Namespace)**: 通过为每个容器创建独立的命名空间，实现进程、网络、文件系统等资源的隔离，使得容器内的进程只能看到和访问自己的资源。

- **控制组 (Cgroup)**: 通过控制组技术，可以限制和分配容器使用的 CPU、内存、磁盘 I/O 等资源，确保容器之间不会相互干扰。

所以，Docker 容器就是一个特殊的进程，当我们进入这个进程时，就会发现它好像是一个完整的 Linux 系统，我们完全可以像使用 Linux 系统一样使用它，正常的语法：

```bash
docker exec <container_id> <command>
```

那结合我们前面说的一些参数，我们可以进入一个交互式的终端：

```bash
docker exec -it <container_id> /bin/bash
```

此时，他就类似于一个完整的 Linux 系统了，我们查看一下系统信息：

```bash
cat /etc/os-release
```

之后就可以根据对应发行版的包管理器来使用它了。

## 构建镜像

接下来我们以一个简单的例子来说一下如何构建自己的镜像，首先源程序就选择简单的 hello world 程序：

```cpp
#include <print>

int main()
{
  std::print("Hello, {}\n", "World");
}
```

然后我们在当前目录下创建一个 `Dockerfile` 文件，内容如下：

```Dockerfile
# 编译
FROM gcc:15.2.0 AS build

WORKDIR /app
COPY . .
RUN g++ main.cc -std=c++23 -o test

# 运行
FROM debian:stable-slim

WORKDIR /app
COPY --from=build /app/test .
CMD ["./test"]
```

可以看到，我们采用了分阶段构建的方式，这里解释一下第一部分的四行：

- **FROM**：指定基础镜像为官方的 gcc 15.2.0，这样我们的容器就可以直接使用 g++ 了。
- **WORKDIR**：设置工作目录为 /app，后续的命令都会在该目录下执行。
- **COPY**：将宿主机当前目录下的所有文件复制到容器的 /app 目录下。
- **RUN**：在容器内执行的命令。

第二部分和第一部分是一致的，值得注意的是每个 Dockerfile 只能有一个 CMD 指令，它指定了容器启动时默认执行的命令，接着我们就可以构建、运行以及推送了，这些命令在前面都有提到：

```bash
# 构建镜像
docker build -t my-hello-world:1.0 .

# 运行容器
docker run --rm my-hello-world:1.0

# 推送到远程仓库，注意此处需要先登录 Docker Hub，且标签必须带上用户名
docker tag my-hello-world:1.0 <dockerhub_username>/my-hello-world:1.0
docker push <dockerhub_username>/my-hello-world:1.0
```

## 网络

Docker 主要有三种内置的网络驱动模式：**Bridge、Host 和 None**。

Bridge 是 Docker 最常用且默认的网络模式，安装 Docker 后，它会自动创建一个名为 bridge 的虚拟网络。

核心原理也很简单，Docker 在宿主机上创建一个虚拟网桥，所有默认启动的容器都会连接到这个网桥上，Docker 会为每个容器分配一个独立的网络命名空间和一个内部 IP 地址，通常是 172.17.x.x 网段。

看一下通信的情况:

- **容器间通信**: 同一个 bridge 网络内的容器，可以通过彼此的内部 IP 地址直接通信。

- **容器访问外部**: 容器可以通过宿主机的网络出口访问外部世界。

- **外部访问容器**: 默认情况下，容器网络与宿主机网络是隔离的。外部无法直接访问容器，必须通过端口映射才能实现访问。

虽然默认的 Bridge 网络很方便，但在生产环境中，我们更推荐创建自定义的 Bridge 网络:

```bash
# 创建一个自定义的 bridge 网络
docker network create my-app-net

# 创建两个容器加入这个子网
docker run -d --name database --network my-app-net my-database-image
docker run -d --name webapp --network my-app-net -p 8080:80 my-webapp-image
```

此时，我们就可以在宿主机通过 8080 端口访问 webapp 容器，而 webapp 容器可以直接通过数据库容器名称来访问数据库容器。

> 注意：在同一个自定义网络中，容器之间可以直接使用 **容器名称** 作为主机名进行通信。

----

Host 模式下，容器将不再拥有自己独立的网络命名空间，而是直接共享宿主机的网络。

顾名思义，假设容器内使用了 80 端口，那么它实际上就是在使用宿主机的 80 端口，这种情况下，由于绕过了 Docker 的网络虚拟化层和端口映射，网络性能几乎与宿主机原生应用无异，但是也容易引发端口冲突问题。

```bash
docker run --network host ...
```

----

None 模式会将容器放置在一个完全隔离的网络环境中，只有本地回环接口，适用于一些完全不需要网络连接的场景。

```bash
docker run --network none ...
```

除此以外，管理网络的命令主要有：

```bash
# 列出所有 Docker 网络
docker network ls

# 查看某个网络的详细信息
docker network inspect <network_name>

# 删除一个自定义网络
docker network rm <network_name>

# 将一个正在运行的容器连接到一个网络
docker network connect <network_name> <container_name_or_id>

# 将一个容器从网络中断开
docker network disconnect <network_name> <container_name_or_id>
```

## 容器编排

实际的应用往往由多个相互依赖的容器组成，例如一个典型的 Web 应用可能包含网页、后端和数据库等多个组件，每个组件都运行在独立的容器中。

这种情况下如何去部署呢，一个简单的思路是把所有模块打包成一个巨大的容器，但是这样做有很多缺点，比如后端崩了，前端也得跟着崩溃，或者数据库需要扩容，但是前端和后端并不需要扩容，这样就很不灵活；如果分别部署多个容器，容器之间的顺序、网络等等问题又冒出来了。

容器编排正是为了解决这些问题而生，我们只需要把原来分散的多个容器命令写到一个 `docker-compose.yml` 文件中，然后通过一个命令就可以启动整个应用。

我们来模拟一个场景：一个 Web 应用需要连接到一个 Redis 数据库来存取数据，如果是原有的方案，我们需要执行的是：

```bash
# 创建网络
docker network create my-app-net

# 启动 Redis
docker run -d --name cache --network my-app-net redis

# 启动 Web 应用
docker run -d --name app --network my-app-net -p 8080:80 -e REDIS_HOST=cache my-app-image
```

这种情况下其实已经略见雏形了，这里就有一个网络问题，还有一个容器启动顺序需要解决了，更复杂的场景下维护起来更是痛苦，此时我们再看一下使用编排的策略。

```yaml
# 指定 Compose 文件的版本
version: '3.8'

services:
  app:
    image: my-app-image
    ports:
      - "8080:80"
    environment:
      - REDIS_HOST=cache
    depends_on:
      - cache   # 声明 app 依赖于 cache，Compose 会保证启动顺序

  cache:
    image: redis
```

这个写法就很简洁了，最主要是学习成本很低，因为你会发现所有 key 和前面介绍的 docker run 的参数是一一对应的。

除此以外，Compose 还会自动创建一个默认的网络，并将所有服务连接到该网络上，因此我们不需要手动创建网络，此时管理整个应用栈只需要几个简单的命令：

```bash
# 在后台启动并创建所有服务
docker-compose up -d

# 查看当前应用所有服务的状态
docker-compose ps

# 查看指定服务的日志
docker-compose logs -f <service_name>

# 停止并删除所有服务
docker-compose down

# 进入某个服务的容器内部执行命令
docker-compose exec <service_name> /bin/bash
```

这种方案在单机的场景下是很常用的，但是当容器多到一定程度时，很多中大型公司会选择 Kubernetes 等来进行容器编排，这个知识点就在后面介绍吧。
