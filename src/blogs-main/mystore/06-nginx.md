---
title: 06 Nginx
article: true
order: 6
star: true

category:
  - 杂货铺

tag:
  - mystore

date: 2025-12-20

description: Nginx 相关配置与使用
footer: Always coding, always learning
---

# Nginx

与上一篇一样，建议开始之前先看一下 [这个介绍](https://www.bilibili.com/video/BV1gMX1YSEtm)，这会让你对 nginx 有一个初步的了解，随后我们再来看看如何使用它。

## Nginx 是什么

一句话评价: **现代网络服务器的瑞士军刀**，因此非常值得学习。

想象一下你在家里举办一个大型派对，你的客人一个接一个地到来，你要努力迎接他们，给他们递酒，带他们去吃食物，并保持对话。现在，如果只有少数几个人来，这还算可以应付。但如果数百人同时敲你的门呢？你可能需要一些帮助，对吧？有人负责管理人群，指挥大家去哪里，确保大家玩得开心又不会让你感到压力。

在网站世界里，NGINX 就像那个乐于助人的派对主持人，但它不仅仅是普通的主持人——它是能够轻松应对成千上万人群的主机。NGINX 诞生于 2004 年，由 **伊戈尔·西索耶夫（Igor Sysoev）** 创建，目标简单却强大：超越当时存在的网络服务器，尤其是在处理大量同时连接时。

![NGINX 角色：网页服务器、负载均衡器和缓存](/assets/pages/mystore/nginx-1.webp)

## Nginx: 全能者

回到 2000 年代初，网络迅速发展，流量也随之增长。网站不再是简单的页面;它们正变得复杂，拥有数百万用户。像 Apache 这样的传统 Web 服务器开始承受不起负载。这时，NGINX（发音为“Engine-X”）出现了。其设计注重同时处理多个连接，使其极为快速高效。

那么，NGINX 有什么特别之处？可以把它看作是网页服务器界的瑞士军刀。它不仅仅是一个网页服务器;它还是一个反向代理、负载均衡器，甚至缓存系统——三者合而为一。以下是这些职位的简要概述：

- **Web 服务器** ：和其他 Web 服务器一样，NGINX 处理来自浏览器的请求，并为他们提供所需的网页。但它的速度非常快，尤其是在处理静态内容如图片、视频和纯 HTML 文件时。

- **反向代理** ：NGINX 可以位于你的网络服务器前，作为外部世界与服务器之间的中间人。它就像一个守门人，决定哪个服务器应处理每个请求，帮助平衡负载，保护服务器免受直接互联网暴露。

- **负载均衡器** ：如果你的网站流量很大，你不希望一台服务器承担所有工作。NGINX 可以将输入流量分散到多个服务器，确保没有单一服务器被淹没。

- **缓存系统** ：NGINX 无需为每个用户反复生成同一个网页，而是可以存储页面副本并快速提供给任何请求的人，节省时间和服务器资源。

NGINX 的灵活性、速度和效率是它成为当今最受欢迎的网络服务器之一的原因，被 Netflix、Airbnb 和 Dropbox 等大牌使用。

## 将 Nginx 设置为 Web 服务器

既然你已经了解了 Nginx 是什么以及它能发挥的各种作用，是时候动手把它搭建成一个网络服务器了。别担心——这个过程很简单，完成本节后，你就能搭建一个基础的 Nginx 服务器。

### Step1: 安装 Nginx

首先，我们需要在您的服务器或本地机器上安装 NGINX。安装步骤会根据你的操作系统略有不同，所以我们来了解一下 Linux 和 Windows 的说明。

#### For Linux

这个在绝大多数 Linux 发行版上都很简单。以 Ubuntu 为例，打开终端并运行以下命令：

```bash
sudo apt update
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

这样就可以简单开启 nginx 服务，并设置为开机自启，对于其他 Linux 发行版，基本上就是安装的包管理器换换名字就好了，例如对于 Arch:

```bash
sudo pacman -S nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### For Windows

个人比较建议使用 wsl 来安装 nginx，不过如果你想直接在 Windows 上运行 nginx，可以按照以下步骤操作：

- 请访问官方 NGINX 网站，下载适用于 Windows 的相应版本：https://nginx.org/en/。

- 将下载的 ZIP 文件解压到你选择的目录中。

- 在当前目录打开一个终端，并输入 `start nginx` 来启动 NGINX 服务器。

#### 检查 nginx 状态

打开浏览器，导航到 http://localhost，你应该看看 NGINX 的欢迎页面，是一段简单的欢迎文本，这就证明 NGINX 已成功安装并正在运行。

### Step2: 基本配置

现在 NGINX 已经安装好，让我们配置它提供一个简单的 HTML 页面。默认情况下，NGINX 会从 Linux 上的 `/var/www/html` 目录或 Windows 上解压的目录中提供文件。

- **创建一个新的 HTML 文件**：

```bash
echo "<h1>Welcome to NGINX!</h1>" | sudo tee /var/www/html/index.html
```

- **编辑 NGINX 配置文件**： 主配置文件在 Linux 上位于 `/etc/nginx/nginx.conf`，在 Windows 上则在 NGINX 目录中。你可以自定义它来改变服务器的行为，这是一个简单的例子:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /var/www/html;
        index index.html;
    }
}
```

你把配置文件的 server 块替换成上面的内容，然后保存文件即可。

其中 listen 和 server_name 含义分别是监听端口和服务器名称，而 location 块定义了请求的处理方式，即把根目录指向 `/var/www/html` 并使用此目录下的 `index.html` 作为默认页面。

- **重启 NGINX 以应用更改**：

```bash
sudo systemctl restart nginx
```

此时再打开浏览器，访问 http://localhost（或服务器的 IP 地址）。你应该能看到你的自定义 HTML 页面。

### Step3: 排查技巧

如果在安装或配置过程中遇到任何问题，以下是一些常见的排查步骤：

- **检查防火墙设置**： 确保 80 端口（HTTP）和 443 端口（HTTPS）在你的服务器上是开放且可访问的。

- **检查 NGINX 状态**：

```bash
sudo systemctl status nginx
```

该命令显示 NGINX 是否正在运行，并在出现错误时提供详细信息。

- **查看 NGINX 错误日志**：

```bash
sudo tail -f /var/log/nginx/error.log
```

该日志文件包含了 NGINX 可能面临的任何问题的详细信息，可以帮助你诊断问题。

## 使用 NGINX 作为反向代理

既然你已经成功将 NGINX 搭建为网络服务器，让我们来探讨它最强大的功能之一：作为反向代理。反向代理位于客户端设备和网页服务器之间，将客户端请求转发到相应服务器，并将服务器的响应返回给客户端。这种配置可以提升你的网络应用的安全性、负载均衡和性能。

### Step1: 理解反向代理

既然有反向代理，那自然的就会有正向代理，我倾向于从用户身份分析，正向与反向的区别在于客户端的主动性:

- **正向代理**: 是用户主动使用的代理服务器，用户通过它来访问外部资源，隐藏自己的真实身份，比如翻墙软件。

- **反向代理**: 是服务器端使用的代理服务器，用户并不知道它的存在，用户请求先到达反向代理服务器，再由它转发到真实服务器，隐藏了真实服务器的身份。

因此反向代理就像服务器的守门人。客户端不是直接访问你的服务器，而是先通过 NGINX。这种配置带来了几个好处：

- **安全性** ：通过将后端服务器隐藏在 NGINX 之后，可以减少攻击面。只有 NGINX 对公众开放，这使得管理和保护基础设施变得更为便捷。

- **负载均衡** ：NGINX 可以将收到的请求分散到多个服务器，确保没有单一服务器被压垮。这提升了应用的可靠性和可用性。

- **缓存** ：NGINX 可以缓存后端服务器的响应，直接提供给客户端，减轻服务器负载并加快响应速度。

### Step2: 将 NGINX 配置为反向代理

在这个例子中，我们将客户端的请求转发到上游服务器，比如运行在不同端口甚至不同机器上的应用服务器。

![NGINX 作为带负载均衡的反向代理](/assets/pages/mystore/nginx-2.webp)

- **编辑 NGINX 配置文件** ：使用文本编辑器打开 NGINX 配置文件：

```bash
sudo nano /etc/nginx/sites-available/default
```

- **添加反向代理配置** ：替换默认服务器块或添加新块以定义反向代理设置：

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

在这个例子中，NGINX 在 80 端口监听 `example.com` 请求，并将其转发到运行在 `http://127.0.0.1:8080` 上的应用服务器。

- **测试配置** ：保存文件后，测试配置以确保没有语法错误：

```bash
sudo nginx -t
```

- **重新加载 NGINX**：如果测试成功，重新加载 NGINX 以应用以下更改：

```bash
sudo systemctl reload nginx
```

- **验证设置**：打开浏览器，进入 `http://example.com`。你应该能看到应用服务器在 8080 端口上提供的内容。

### Step3: 额外配置选项

NGINX 为反向代理配置提供了许多高级选项。以下是一些你可能觉得有用的建议：

- **负载均衡** ：将请求分散到多个后端服务器。

```nginx
upstream backend {
    server backend1.example.com;
    server backend2.example.com;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://backend;
    }
}
```

- **SSL 终止** ：在 NGINX 处终止 SSL 连接，即卸载 SSL，使后端服务器能够通过纯 HTTP 通信。

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

- **缓存** ：缓存后端服务器的响应以提升性能。

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_cache my_cache;
    proxy_cache_valid 200 1h;
    proxy_cache_use_stale error timeout invalid_header updating;
}
```

这些配置让你能够根据具体需求定制 NGINX，无论你管理的是简单的网站还是复杂的多服务器应用。

## 利用 NGINX 实现负载均衡

既然你已经看到了 NGINX 如何作为反向代理，是时候探索它最强大的功能之一：负载均衡了。负载均衡将入站流量分散到多个服务器，确保没有单一服务器被压垮，从而提升了网络应用的性能、可靠性和可扩展性。

### Step1: 理解负载均衡

负载均衡对于需要处理大量流量的应用至关重要。通过将请求均匀分布到多台服务器，负载均衡有助于：

- **防止服务器过载** ：通过分散负载，没有单一服务器承受全部流量，降低停机风险。

- **提升响应时间** ：多个服务器可以同时处理请求，减少等待时间。

- **提高容错能力**：如果一台服务器宕机，负载均衡器可以将流量重定向到剩余服务器，保持应用程序的可用性。

NGINX 支持多种负载均衡方法，包括：

- **轮询(Round Robin)**： 这是默认方法，每个请求都会传递给下一台服务器。

- **最少连接(Least Connections)**： 请求被发送到当前活动连接数最少的服务器。

- **IP 哈希** ：来自特定客户端的请求总是传递到同一服务器，这对会话持久性非常有用。

![NGINX：负载均衡](/assets/pages/mystore/nginx-3.webp)

### Step2: 配置 NGINX 负载均衡

我们用轮询方法来设置负载均衡。我们假设你有两台或更多后端服务器准备处理请求。

- **编辑 NGINX 配置文件** ：使用文本编辑器打开 NGINX 配置文件：

```bash
sudo nano /etc/nginx/sites-available/default
```

- **定义后端服务器** ：在配置文件中，定义 `upstream` 区块中的服务器：

```nginx
upstream myapp {
    server backend1.example.com;
    server backend2.example.com;
}
```

- **配置服务器块以使用上游**：在你的服务器块中使用上游组：

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://myapp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- **测试配置** ：确保配置中没有语法错误：

```bash
sudo nginx -t
```

- **重新加载 NGINX**：如果测试成功，重新加载 NGINX 以应用更改：

```bash
sudo systemctl reload nginx
```

- **验证负载均衡** ：你可以通过向服务器发送多个请求，并观察它们如何分布在后端服务器上来验证负载均衡。可以使用 `curl` 或网页浏览器等工具来发送请求。

### Step3: 高级负载均衡技术

根据你的需求，你可能想探索更高级的负载均衡配置：

- **最小连接负载均衡** ：

```nginx
upstream myapp {
    least_conn;
    server backend1.example.com;
    server backend2.example.com;
}
```

- **使用 IP 哈希的会话持久性** ：

```nginx
upstream myapp {
    ip_hash;
    server backend1.example.com;
    server backend2.example.com;
}
```

- **健康检查**：确保 NGINX 只将流量发送到健康服务器，配置健康检查：

```nginx
upstream myapp {
    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com backup;

    # Health check
    server backend1.example.com max_fails=3 fail_timeout=30s;
}
```

## 利用 NGINX 增强安全性

除了负载均衡和作为反向代理外，NGINX 还被广泛用于提升 Web 应用的安全性。通过正确配置 NGINX，你可以保护后端服务器，加密客户端与服务器之间的通信，并减轻常见的网络漏洞。

### Step1: 使用 SSL/TLS 保护通信

最重要的安全措施之一是使用 SSL/TLS 加密客户端与服务器之间的通信。这确保了通过网络传输的数据安全，无法被攻击者轻易拦截。

- **获取 SSL 证书**： 你可以从 [Let's Encrypt](https://letsencrypt.org/) 免费获得 SSL 证书，或从可信证书颁发机构（CA）购买一份。

- **配置 NGINX 以使用 SSL/TLS**： 打开你的 NGINX 配置文件：

```bash
sudo nano /etc/nginx/sites-available/default
```

- **添加以下配置以启用 SSL/TLS**：

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- **将 HTTP 重定向到 HTTPS**： 为了确保所有流量都加密，你可以将 HTTP 流量重定向到 HTTPS：

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

- **测试配置并重新加载 NGINX**：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step2: 实施速率限制

速率限制是一种有效的方式，可以保护你的网页应用免受暴力破解攻击、拒绝服务（DoS）攻击及其他形式的滥用。通过限制客户端在指定时间内可发出的请求次数，你可以防止恶意用户淹没你的服务器。

- **配置速率限制**： 在你的 NGINX 配置中添加以下指令以实现速率限制

```nginx
http {
    limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;

    server {
        location /login {
            limit_req zone=one burst=5 nodelay;
            proxy_pass http://127.0.0.1:8080;
        }
    }
}
```

在这个例子中，NGINX 限制每秒 10 个请求，最多允许 5 个请求突发并推迟处理，超出此数目的请求会被直接拒绝。

- **测试配置并重新加载 NGINX**：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step3: 防止使用 HTTP 头的点击劫持

点击劫持是一种恶意技术，攻击者诱使用户点击与用户感知不同的内容。通过在 NGINX 中设置 `X-Frame-Options` 头部可以缓解这个问题。

- **添加安全头**： 在你的 NGINX 配置文件中，添加以下指令以设置 `X-Frame-Options` 头：

```nginx
server {
    add_header X-Frame-Options "SAMEORIGIN" always;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

该头部确保你的内容不会被嵌入到其他网站的 iframe 中，从而降低点击劫持的风险。

- **测试配置并重新加载 NGINX**：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

通过实施这些安全措施，您可以显著提升网页应用的安全态势，使其对常见攻击更具韧性。

## 使用 NGINX 缓存以提升性能

NGINX 最强大的功能之一是其缓存内容的能力，这能显著提升您的网页应用的性能和响应速度。通过存储频繁请求内容的副本，NGINX 可以直接从缓存中提供这些请求，减轻后端服务器的负载，加快用户响应速度。

![NGINX 缓存机制](/assets/pages/mystore/nginx-4.webp)

### Step1: 理解 NGINX 缓存

缓存是一种用于存储用户频繁请求的文件或数据副本的技术。NGINX 无需多次生成相同的响应，而是可以提供缓存内容，具体内容：

- **降低服务器负载** ：后端服务器无需处理重复请求，能够处理更多独特的任务。

- **提升响应时间** ：缓存内容更快被提供，提升用户体验。

- **节省带宽** ：通过提供缓存内容，服务器和客户端之间传输的数据需求减少。

### Step2: 配置 NGINX 缓存

让我们为你的 NGINX 服务器设置基础缓存。

- **定义缓存区**： 缓存区是缓存数据存储的地方。你需要在 NGINX 配置文件的 http 区块里定义它：

```nginx
http {
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m use_temp_path=off;
}
```

该配置创建名为 my_cache 的缓存区，最大容量为 1 GB，存储路径位于 `/var/cache/nginx`。

- **在服务器模块中设置缓存**： 现在，你需要配置你的服务器块来使用缓存：

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_cache my_cache;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

该配置缓存成功响应（HTTP 状态码 200 和 302）10 分钟，缓存 404 个响应 1 分钟。

- **绕过或刷新缓存**： 有时，你可能想绕过缓存或强制刷新。你可以添加以下指令，针对特定请求绕过缓存：

```nginx
server {
    location / {
        proxy_cache_bypass $http_cache_control;
        proxy_no_cache $http_cache_control;
    }
}
```

这种配置允许客户端通过在请求中包含特定头来绕过缓存。

- **测试配置并重新加载 NGINX**：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step3: 监控和管理缓存

缓存是一个动态过程，可能需要随着时间进行监控和调整。

- **清除缓存内容**：如果你需要从缓存中移除特定物品，可以使用第三方模块，比如 `ngx_cache_purge`。或者，你也可以手动从缓存目录中移除文件，虽然效率较低。

- **监控缓存性能**：定期使用日志或 NGINX 状态模块监控缓存性能。寻找像缓存命中率（hit/miss ratio）这样的指标，这些指标能反映缓存的使用效率。

- **调整缓存设置**：根据你的监控情况，你可能需要调整缓存大小、有效期，或者缓存内容。目标是平衡缓存效率与内容的新鲜度。

通过在 NGINX 中配置缓存，您可以显著降低服务器负载，提高内容传递给用户的速度。这对静态内容如图片、样式表和脚本尤其有价值，但根据应用需求，动态内容也能受益。

## 日志记录和监控 NGINX，以获得更好的洞察

了解服务器上发生的情况对于维护网页应用的健康和性能至关重要。NGINX 提供强大的日志和监控功能，帮助您跟踪流量模式、识别问题并优化性能。

### Step1: 配置访问日志和错误日志

NGINX 会记录它处理的每一个请求，以及发生的任何错误。这些日志对于诊断问题和了解服务器的使用情况非常宝贵。

- **配置正常日志**：访问日志记录 NGINX 处理的每一个请求。它们通常包括客户端的 IP 地址、请求方法、状态码以及处理请求所需的时间等信息，。你可以在 NGINX 配置文件中指定访问日志的位置和格式：

```nginx
http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Other settings...
}
```

该配置设置自定义日志格式，并指定日志应写入 `/var/log/nginx/access.log` 文件。

- **配置错误日志**：错误日志记录 NGINX 在处理请求时遇到的任何问题，如连接失败或指令配置错误。

```nginx
error_log /var/log/nginx/error.log warn;
```

这会引导 NGINX 将错误日志记录为 `/var/log/nginx/error.log`，且严重程度为警告或更高。

随后重启 NGINX 以应用更改：

```bash
sudo systemctl restart nginx
```

### Step2: 使用工具监控 NGINX

监控您的 NGINX 服务器可以让您实时洞察其性能，并在问题升级前及时发现。

- **使用 ngxtop 进行实时监控**： 这是一款命令行工具，解析 NGINX 访问日志，并实时提供服务器性能指标。

```bash
# 使用 pip 安装 ngxtop
pip install ngxtop

# 运行 ngxtop 监控 NGINX 访问日志
ngxtop
```

这将显示实时统计数据，如请求计数、响应时间和状态代码。

- **与监控服务集成**：如需更全面的监控，可以考虑将 NGINX 与 Prometheus、Grafana 或 Datadog 等监控服务集成。这些工具可以从 NGINX 收集指标，在仪表盘中可视化，并提醒你任何问题。

- **带尾部和 grep 的日志监控**：为了快速进行日志分析，您可以使用 tail 查看日志中的最新条目，或使用 grep 搜索特定模式：

```bash
tail -f /var/log/nginx/access.log
grep "404" /var/log/nginx/error.log
```

### Step3: 设置关键事件警报

设置警报可以确保当服务器出现故障时，你能及时收到通知。通过配置关键事件的警报，您可以快速响应并减少停机时间。

- **使用 logwatch 配置日志提醒** ： 这是一款日志监控工具，可以每天发送你的 NGINX 日志摘要，可以自行配置 logwatch 来监控 nginx 日志，并发送邮件提醒。

```bash
sudo apt install logwatch
```

- **使用监控服务进行警报**：如果你使用像 Datadog 这样的监控服务，可以根据响应时间、错误率或流量量等指标设置自定义警报，这些服务可以通过电子邮件、短信或与 Slack 等通信工具集成发送提醒。

通过设置全面的日志和监控，您可以密切监控 NGINX 服务器的性能，快速识别和排查问题，确保您的网络应用运行顺畅。

## 优化 NGINX 以适应高流量

当你的网页应用开始接收大量流量时，优化 NGINX 变得至关重要，以确保服务器能够高效地处理负载。NGINX 以其高性能著称，但通过额外调校，你可以进一步提升其性能。

![NGINX 优化](/assets/pages/mystore/nginx-5.webp)

### Step1: 优化 Worker Processes 和 Connections

NGINX 使用工作进程处理来的请求。工作进程和连接的数量会显著影响服务器的性能。

- **配置工作进程**：默认情况下，NGINX 会在每个 CPU 核心启动一个工作进程。为了优化这一点，你可以在配置文件中明确设置工作进程数量：

```nginx
worker_processes auto;
```

该配置根据可用 CPU 核心数自动设置工作进程数量。

- **调整连接数量**：`worker_connections` 指令决定每个工作进程能处理多少连接。提高该值使每个工作者能够处理更多同时连接：

```nginx
events {
    worker_connections 1024;
}
```

在高流量情况下，你可能还想根据服务器容量进一步增加这个数字。

### Step2: 启用静态内容缓存

缓存静态内容如图片、CSS 和 JavaScript 文件可以减轻后端服务器的负载，加快响应速度。

- **设置静态内容缓存**：在你的服务器块中添加常见静态内容类型的缓存指令：

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, no-transform";
}
```

该配置指示 NGINX 缓存静态内容 30 天，减少了反复从后端取用内容的需求。

- **使用 gzip 压缩**：在发送给客户端前压缩响应可以显著降低带宽使用并改善加载时间：

```nginx
http {
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
}
```

这使得 gzip 压缩适用于各种内容类型，提高了效率。

### Step3: 微调缓冲区和超时设置

缓冲区和超时在 NGINX 处理客户端请求时起着关键作用，尤其是在高负载下。

- **调整缓冲区大小**：NGINX 使用缓冲区来处理客户端的请求和响应。增加缓冲区大小有助于避免错误并提升性能：

```nginx
http {
    client_body_buffer_size 16K;
    client_max_body_size 10M;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;
}
```

这些设置帮助 NGINX 更高效地处理较大的请求和响应。

- **配置超时时间**：超时控制 NGINX 等待客户端或后端服务器发送或接收数据的时间。调整这些设置可以防止挂断连接消耗资源：

```nginx
http {
    client_body_timeout 12s;
    client_header_timeout 12s;
    keepalive_timeout 15s;
    send_timeout 10s;
}
```

这些超时帮助 NGINX 在负载下更好地管理资源，防止连接不必要地拖延。

### Step4: 运用负载均衡策略

在高流量环境中，有效的负载均衡确保没有单一服务器被压垮。

- **选择负载均衡算法**：NGINX 支持多种负载均衡算法，如轮询、最小连接和 IP 哈希。选择最适合您需求的方案，例如：

```nginx
upstream backend {
    least_conn;
    server backend1.example.com;
    server backend2.example.com;
}
```

least_conn 算法将流量发送到连接最少的服务器，这在高流量情况下非常有效。

- **启用健康检查**：定期检查后端服务器的健康状况，确保流量只发送到能够处理该流量的服务器：

```nginx
upstream backend {
    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com backup;
}
```

你可以配置额外的指令来设置最大失败次数和失败超时。

通过实施这些优化技术，您可以确保 NGINX 高效处理高流量，为用户提供快速且可靠的体验。

## 在 NGINX 中实现安全头部

安全头是保护您的网络应用免受各种漏洞的关键组成部分，如跨站脚本（XSS）、点击劫持等。通过在 NGINX 中配置这些头部，你可以显著提升网页应用的安全性。

### Step1: 理解常见的安全头部

在深入配置之前，了解每个安全头的用途非常重要：

- **Strict-Transport-Security （HSTS）**： 强制对服务器进行安全（HTTPS）连接。

- **X-Frame-Options**：通过控制浏览器是否允许在帧内渲染页面，防止点击劫持。

- **X-Content-Type-Options**： 阻止浏览器通过 MIME 嗅探响应，避免对已声明的内容类型进行检测。

- **Content-Security-Policy (CSP)**:  通过指定允许加载的内容来源，帮助防止 XSS 攻击。

- **Referrer-Policy**： 控制请求中包含的引荐信息量。

### Step2: 在 NGINX 中配置安全头部

让我们在你的 NGINX 配置文件中配置这些安全头，该配置实现了 HSTS、X-帧-选项、X-内容类型-选项、CSP 和 Referrer-Policy 头部。

```nginx
server {
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self';" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

随后重启即可应用更改，通过实现和维护这些安全头，您可以保护您的网页应用免受各种安全威胁，使网站对用户更加安全。

## 限速以防止滥用

速率限制是 NGINX 中的一项关键功能，帮助保护您的网页应用免受滥用，如拒绝服务（DoS）攻击、暴力破解登录尝试或爬取。通过限制客户端在一定时间内可发出的请求次数，你可以防止恶意用户淹没服务器，确保所有用户都能公平使用。

### Step1: 理解速率限制

NGINX 中的速率限制通过定义跟踪客户端请求的区域，并根据 IP 地址或其他条件施加限制来实现。当客户端在规定时间内超过允许的请求数时，NGINX 可以延迟或拒绝更多请求。

- **Burst**：突发参数允许客户端超过一定数量的速率限制而不被延迟或拒绝。

- **Nodelay**：该选项禁用延迟机制，一旦超过突发限制，额外请求立即被拒绝。

### Step2：配置速率限制

让我们为特定位置（如登录页面）配置速率限制，以防止暴力破解攻击。

- **定义速率限制区域**：在你的 NGINX 配置文件的 http 区块中，定义一个区域来跟踪客户端请求：

```nginx
http {
    limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;
}
```

这种配置创建了一个名为 mylimit 的区域，每个客户端 IP 每秒允许 10 次请求。该区域最多可存储 10MB 的数据，足以追踪约 160,000 个 IP 地址。

- **对地点应用速率限制**：在相关的 server 或 location 块中，应用速率限制配置：

```nginx
server {
    location /login {
        limit_req zone=mylimit burst=20 nodelay;
        proxy_pass http://127.0.0.1:8080;
    }
}
```

该配置允许无延迟地突发20个请求，但一旦超过该限制，其他请求将被拒绝。

- **针对超出限制请求定制响应**：您可以自定义客户端超过速率限制时返回的响应代码或消息：

```nginx
error_page 503 @limit;

location @limit {
    return 429 "Too Many Requests";
}
```

随后重启 NGINX 测试一下即可。

### Step3: 监控和调整速率限制

速率限制应根据服务器容量和用户的典型使用模式进行调整。

- **监控超出限制请求**：查看访问日志，监控请求被限速的频率。查找 429 状态码（如果已配置），以查看有多少请求被阻断。

```bash
grep "429" /var/log/nginx/access.log
```

- **根据需要调整速率限制**：如果合法用户经常被速率限制，可能需要提高允许的速率或突发大小。相反，如果允许的请求过多，可以考虑收紧限制。

- **考虑为不同地点设定独立限制**：针对应用的不同部分，你可能需要应用不同的速率限制。例如，登录页面可能比通用 API 端点有更严格的限制。

### Step4：结合速率限制与其他安全措施

速率限制只是你安全工具箱中的一个。为了全面保护您的网页应用，建议将速率限制与其他安全措施结合使用，例如：

- **IP 白名单/黑名单** ：允许或屏蔽特定 IP 地址访问你的网站。

- **验证码**：在登录或账户创建等敏感作中添加验证码挑战。

- **WAF（网络应用防火墙）**： 使用 WAF 检测并阻断恶意流量。

通过实施速率限制，您可以有效保护您的网络应用免受滥用，确保服务器资源得到公平使用，防止攻击者压垮基础设施。

你已经读完了这份关于掌握 NGINX 的全面指南。在整个过程中，我们探索了 NGINX 的各个方面，从基础设置和安全加固，到高级优化技术和自动化。无论你管理的是单台服务器还是复杂的网络基础设施，NGINX 都是一项强大的工具，只要配置得当，都能显著提升网络应用的性能、安全性和可扩展性。

请记住，NGINX 成功的关键不仅在于初始设置，更在于持续监控、优化和适应以满足不断变化的需求。凭借你所获得的技能和知识，你完全有能力在任何环境中充分发挥 NGINX 的优势。