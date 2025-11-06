---
title: 05 RabbitMQ
article: true
order: 5
star: true

category:
  - 杂货铺

tag:
  - mystore

date: 2025-11-05

description: RabbitMQ 在 Golang 中的使用
footer: Always coding, always learning
---

# 05 RabbitMQ

本节主要目标在于介绍单机下的 RabbitMQ 的使用方法，虽说会尽可能补充概念认知，但仍建议在开篇前先看一下 [这个介绍](https://www.bilibili.com/video/BV1oCwEeVEe4)，这会让你有一个整体认知，随后我们就正式开始本节的学习吧。

## 环境准备篇

### RabbitMQ 是什么

RabbitMQ 是一个 **消息中间件**，本质上就是在内存或磁盘中的队列，不过为这个队列实现了不同的功能，如发布订阅、路由、消息持久化等行为，常常用于实现如下目标:

- **解耦**：生产者和消费者不需要直接通信，而是通过中间件间接通信
- **异步**：生产者发完消息立刻返回，不等待处理结果，并不关心消息何时被处理
- **削峰填谷**：高峰期消息先存到队列，消费者按自己的速度处理

整体来说会走如下的流程进行通信，这里有个概念即可，我们后续会详细介绍:

```
┌──────────┐      ┌─────────────┐      ┌──────────┐      ┌──────────┐
│  生产者   │ ───> │   Exchange  │ ───> │  Queue   │ ───> │  消费者   │
└──────────┘      └─────────────┘      └──────────┘      └──────────┘
   发送消息            路由分发          存储消息          接收处理
```

### 安装与启动

该软件在 pacman 中可以直接安装，如果是其他系统，可以参考 [官方文档](https://www.rabbitmq.com/docs/download) 进行操作:

```bash
# 安装 RabbitMQ
sudo pacman -S rabbitmq

# 启动 RabbitMQ 服务
sudo systemctl start rabbitmq
sudo systemctl enable rabbitmq

# 启用管理界面插件，方便在浏览器可视化访问
sudo rabbitmq-plugins enable rabbitmq_management
```

此时就可以在浏览器访问 `http://127.0.0.1:15672` 进行管理了，默认账号密码均为 `guest`。

### Go 项目初始化

对于初次使用是需要拉下来这个包的，操作也很简单:

```bash
# 初始化
go mod init rabbitmq-demo

# 拉取依赖
go get github.com/rabbitmq/amqp091-go
```

我们随后的目录结构会是这样的，建议保持一致:

```txt
|- go.mod
|- go.sum
└── 具体目录
```

## 基础消息模型

### 最简单的生产者和消费者

任何一个技术点都跑不过的起步，我们首先来做一个 `Hello, World`，然后后续的内容说白了就是在这之上做一些简单的修改，因此此部分内容一定要牢记，我会详细介绍，先来看一下代码:

*01-hello-world/producer/producer.go*

```go
package main

import (
	"context"
	"log"
	"time"

	"github.com/rabbitmq/amqp091-go"
)

func main() {
	// 1. 连接到 RabbitMQ
	conn, err := amqp091.Dial("amqp://guest:guest@localhost:5672/")
	if err != nil {
		log.Fatalf("Cann't connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	// 2. 创建一个通道
	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Cann't open a channel: %v", err)
	}
	defer ch.Close()

	// 3. 声明队列
	q, err := ch.QueueDeclare(
		"hello", // 队列名称
		false,   // durable: 队列持久化
		         //   - true: 队列元信息写入磁盘，RabbitMQ重启后队列仍存在
		         //   - false: 队列仅存在于内存，重启后丢失
		         //   - 注意：只是队列定义持久化，消息是否持久化需单独设置
		false,   // autoDelete: 自动删除
		         //   - true: 最后一个消费者断开后自动删除队列，注意这个必须是有消费者连接过才会删除的
		         //   - false: 队列会一直保留，即使没有消费者
		false,   // exclusive: 独占队列
		         //   - true: 只允许当前连接访问，连接断开自动删除
		         //   - false: 允许多个连接访问
		false,   // noWait: 是否等待服务器响应
		         //   - true: 不等待RabbitMQ确认，异步，快速但不保证成功
		         //   - false: 等待RabbitMQ确认队列创建成功，同步可靠，建议使用
		nil,     // arguments: 额外参数
		         //   - x-message-ttl: 队列中消息的过期时间（毫秒）
		         //   - x-max-length: 队列最大消息数量
		         //   - x-dead-letter-exchange: 死信交换机
		         //   - 暂时先保持 nil
	)
	if err != nil {
		log.Fatalf("Cann't declare a queue: %v", err)
	}

	// 4. 准备要发布的消息
	body := "Hello RabbitMQ"
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	// 5. 发布消息到队列
	err = ch.PublishWithContext(
		ctx,
		"",     // exchange: 交换机名称
		        //   - 空字符串"": 使用默认交换机（direct类型），直接路由到队列
		        //   - 指定名称: 使用自定义交换机（fanout/direct/topic等）
		q.Name, // routingKey: 路由键
		        //   - 使用默认交换机时: routingKey就是队列名称
		        //   - 使用fanout交换机时: routingKey会被忽略，建议写 ""
		        //   - 使用direct交换机时: 必须匹配绑定时的key
		        //   - 使用topic交换机时: 支持通配符匹配（*和#）
		false,  // mandatory: 消息路由失败时的处理
		        //   - true: 消息无法路由到队列时，通过 NotifyReturn 返回给生产者
		        //   - false: 消息无法路由时直接丢弃，一般情况下用这个
		        //   - 重要消息建议设为true并监听NotifyReturn
		false,  // immediate: 是否要求立即投递
		        //   - true: 队列没有消费者时退回消息
		        //   - false: 正常投递，必须用这个
		amqp091.Publishing{
			ContentType: "text/plain",
			Body:        []byte(body),
		},
	)
	if err != nil {
		log.Fatalf("Cann't publish a message: %v", err)
	}
	log.Printf(" [x] Sent %s", body)
}
```

对于生产者来说，我们需要先声明一个队列，随后调用连接的管道把消息发布到指定的队列中，随后就跟它没有任何关系了，对应参数的注释我都标记到注释里了，姑且保持这样，后面不同的特性就是修改这些参数。

> 注意: PublishWithContext 的 immediate 参数必须设置为 false，RabbitMQ 3.0+ 以上的版本如果设置为 true 会直接报错，也就是没有消费者会强制丢弃此消息。

而对于消费者方面，我们需要从对应队列中取出数据，随后进行消费:

*01-hello-world/consumer/consumer.go*

```go
package main

import (
	"log"

	"github.com/rabbitmq/amqp091-go"
)

func main() {
	// 1. 连接到 RabbitMQ
	conn, err := amqp091.Dial("amqp://guest:guest@localhost:5672/")
	if err != nil {
		log.Fatalf("Cann't connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	// 2. 创建一个通道
	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Cann't open a channel: %v", err)
	}
	defer ch.Close()

	// 3. 声明队列，队列名要和生产者保持一致，具体含义见生产者注释
	q, err := ch.QueueDeclare("hello", false, false, false, false, nil)
	if err != nil {
		log.Fatalf("Cann't declare a queue: %v", err)
	}

	// 4. 接收消息
	msgs, err := ch.Consume(
		q.Name, // 队列名称
		"",     // consumer: 消费者标签
		        //   - 给这个消费者起的唯一标识符，类似昵称那种
		        //   - 可用于取消订阅（ch.Cancel(tag)）或监控
		        //   - 99%的情况填空字符串""，让RabbitMQ自动生成
		true,   // autoAck: 自动确认机制
		        //   - true: 消息一发送到消费者就删除，快速但不安全
		        //   - false: 需要消费者手动确认后才删除，比较可靠
		        //   - 关键业务建议用false，防止消费者崩溃时消息丢失
		false,  // exclusive: 队列独占模式
		        //   - true: 只允许当前连接的这个消费者访问队列，连接断开队列自动删除
		        //   - false: 允许多个消费者同时消费，更为常用
		false,  // noLocal: 是否接收本连接发布的消息，RabbitMQ不支持此参数，必须为false
		        //   - true: 不接收同一个connection发布的消息
		        //   - false: 正常接收
		false,  // noWait: 是否等待服务器响应
		        //   - true: 不等待RabbitMQ确认，立即返回，异步，快速但不保证成功
		        //   - false: 等待RabbitMQ确认消费者注册成功，同步，可靠，用这个
		nil,    // args: 额外参数
		        //   - x-priority: 设置消费者优先级
		        //   - x-cancel-on-ha-failover: 高可用故障转移时是否取消
		        //   - 暂时先保持 nil
	)
	if err != nil {
		log.Fatalf("Cann't register a consumer: %v", err)
	}

  // 5. 处理消息
	forever := make(chan struct{})
	go func() {
		for d := range msgs {
			log.Printf("[x] Received a message: %s", d.Body)
		}
	}()

	log.Printf(" [*] Waiting for messages. To exit press CTRL+C")
	<-forever
}
```

整体来说流程还是很清晰的，生产者和消费者都需要先与 RabbitMQ 建立连接，随后通过管道进行通信，两者通信的中间件就是队列，不管是生产者还是消费者都应该先在 RabbitMQ 中声明一个队列，随后生产者调用 Publish 发送到队列中，由消费者调用 Consume 进行消费。

你可能也注意到了，核心的这几个函数的参数大多有多种选择，这些选择对应了不同的特性，我将其写在第一部分是方便查阅，可以暂时不关注所有句子的含义，只需理解当前例子设置这个值的含义即可。

这里补充一个，我们在发布消息时有一个 mandatory 参数，如果设置为 true，则会把路由失败的消息回送给生产者，我们可以通过如下行为来处理回送的消息:

```go
returns := ch.NotifyReturn(make(chan amqp091.Return))
go func() {
    for ret := range returns {
        log.Printf("消息被退回: %s, 原因: %s", ret.Body, ret.ReplyText)
    }
}()
```

此时就可以开始运行了，我们先注册一个消费者，随后再启动生产者:

```zsh
> go run 01-hello-world/consumer/consumer.go
2025/11/05 19:05:07  [*] Waiting for messages. To exit press CTRL+C
2025/11/05 19:05:14 [x] Received a message: Hello RabbitMQ

> go run 01-hello-world/producer/producer.go
2025/11/05 19:05:14  [x] Sent Hello RabbitMQ
```

可以看到消费者终端立刻打印了这句话，至此我们就完成了 RabbitMQ 的简单使用，有了这个基础，剩下的就简单很多了。

### 轮询分发工作队列

一个队列可以被多个消费者同时订阅，也就是说多个消费者可以并行处理同一个队列中的消息，那一定需要一种手段来维持消息的分发规则，否则就会污染共享区的资源，默认情况下，RabbitMQ 采用 **Round-Robin（轮询）** 分发策略，它具有如下分发规则：

- 严格按照消费者注册的顺序，依次分配消息
- 消息是提前分配的，不考虑消费者的实际处理速度

我举个例子方便你理解:

1. 消费者 A 向队列注册
2. 消费者 B 向队列注册
3. 生产者发送 10 条消息

RabbitMQ 立即分配：
  - A 得到：消息1、3、5、7、9
  - B 得到：消息2、4、6、8、10

这里我们来模拟一下耗时任务来看一下这种行为，由于连接和 channel 创建都一样，且为了提升观感，后面我们只会给出核心代码:

*02-work-queues/producer/producer.go*

```go
func main() {
	... 建立连接和 channel ...

	q, err := ch.QueueDeclare("task_queue", false, true, false, false, nil)
	if err != nil {
		log.Fatalf("Cann't declare a queue: %v", err)
	}

	// 准备消息内容，此处从命令行参数中获取
	body := bodyFrom(os.Args)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	err = ch.PublishWithContext(ctx, "", q.Name, false, false, amqp.Publishing{
		ContentType: "text/plain",
		Body:        []byte(body),
	})
	if err != nil {
		log.Fatalf("Cann't publish a message: %v", err)
	}
	log.Printf(" [x] Sent %s", body)
}

func bodyFrom(args []string) string {
	var s string
	if (len(args) < 2) || os.Args[1] == "" {
		s = "hello"
	} else {
		s = strings.Join(args[1:], " ")
	}
	return s
}
```

*02-work-queues/consumer/consumer.go*

```go
func main() {
  ... 建立连接和 channel ...

  q, err := ch.QueueDeclare("task_queue", false, true, false, false, nil)
	if err != nil {
		log.Fatalf("Cann't declare a queue: %v", err)
	}

	msgs, err := ch.Consume(q.Name, "", true, false, false, false, nil)
	if err != nil {
		log.Fatalf("Cann't register a consumer: %v", err)
	}

	log.Printf(" [*] 等待任务中。按 CTRL+C 退出")

	for d := range msgs {
		log.Printf(" [x] 收到 %s", d.Body)

		dotCount := bytes.Count(d.Body, []byte("."))
		t := time.Duration(dotCount)
		time.Sleep(t * time.Second)

		log.Printf("Task complete")
	}
}
```

此时我们可以测试一下，先启动两个消费者，然后来个生产者快速发送多个消息，看一下处理情况:

```zsh
# 终端1：启动消费者A
❯ go run 02-work-queues/consumer/consumer.go
2025/11/05 19:34:10  [*] 等待任务中。按 CTRL+C 退出
2025/11/05 19:34:16  [x] 收到 Task 1
2025/11/05 19:34:16 Task complete
2025/11/05 19:34:16  [x] 收到 Task 3.....
2025/11/05 19:34:21 Task complete
2025/11/05 19:34:21  [x] 收到 Task 5.....
2025/11/05 19:34:26 Task complete

# 终端2：启动消费者B
❯ go run 02-work-queues/consumer/consumer.go
2025/11/05 19:34:13  [*] 等待任务中。按 CTRL+C 退出
2025/11/05 19:34:16  [x] 收到 Task 2.
2025/11/05 19:34:17 Task complete
2025/11/05 19:34:17  [x] 收到 Task 4.
2025/11/05 19:34:18 Task complete
2025/11/05 19:34:18  [x] 收到 Task 6.
2025/11/05 19:34:19 Task complete

# 终端3: 启动生产者
cd 02-work-queues/producer
❯ go run producer.go "Task 1"
❯ go run producer.go "Task 2."
❯ go run producer.go "Task 3....."
❯ go run producer.go "Task 4."
❯ go run producer.go "Task 5....."
❯ go run producer.go "Task 6."
2025/11/05 19:34:16  [x] Sent Task 1
2025/11/05 19:34:16  [x] Sent Task 2.
2025/11/05 19:34:16  [x] Sent Task 3.....
2025/11/05 19:34:16  [x] Sent Task 4.
2025/11/05 19:34:17  [x] Sent Task 5.....
2025/11/05 19:34:17  [x] Sent Task 6.
```

如我们前面所说，这些任务被均匀的分发给了两个消费者，体现了它这个轮询的思想，但是，也暴露出来一个很严重的问题，即这个分发策略的不足:

消费者B在3秒就处理完了，但消费者A要10秒，即使B空闲了，Task 5也不会转移给B，这就导致了消息的 **负载不均**，这里埋个伏笔，我们在后续高级特性中再介绍。

### 发布订阅

假设这么一个场景：一条日志消息需要被多个系统同时接收处理，比如：写文件、发邮件、记录数据库。

按照原来的方式的话，生产者需要知道所有队列的名称，且需要为每个队列调用一次 `Publish`，新增消费者还需要修改生产者代码，这些显然都是无法接受的。

因此我们引入了 **Exchange（交换机）** 的概念，它有多种类型（fanout、direct、topic、headers），此处我们先来看最简单的一种—— **Fanout，也称发布订阅/广播模式**。

**架构对比**：

```
Work Queues 模式：
生产者 → 队列 → 消费者

发布订阅模式：
                      ┌→ 队列1 → 消费者1
生产者 → [Exchange]  ──┼→ 队列2 → 消费者2
                      └→ 队列3 → 消费者3
```

*03-publish-subscribe/publisher/publisher.go*

```go
func main() {
  ... 建立连接和 channel ...

	// 声明一个 fanout 类型的 exchange
	err = ch.ExchangeDeclare(
		"logs",   // name: Exchange 名称
		"fanout", // type: Exchange 类型
		          //   - fanout: 广播模式，忽略 routing key，复制消息到所有绑定的队列
		          //   - direct: 精确匹配，routing key 必须完全相等
		          //   - topic: 模式匹配，支持通配符 * 和 #
		false,    // durable: Exchange 持久化
		          //   - true: Exchange 定义写入磁盘，RabbitMQ 重启后仍存在
		          //   - false: 仅存在于内存，重启后丢失
		true,     // autoDelete: 自动删除
		          //   - true: 最后一个绑定的队列解绑后，自动删除 Exchange，同样是必须有绑定过才会触发
		          //   - false: Exchange 一直保留
		false,    // internal: 是否为内部使用
		          //   - true: 只能被其他 Exchange 使用，客户端无法直接发布消息
		          //   - false: 客户端可以直接发布消息到 Exchange 上
		false,    // noWait: 是否等待服务器响应
		          //   - true: 不等待 RabbitMQ 确认，异步快速
		          //   - false: 等待 RabbitMQ 确认 Exchange 创建成功，同步可靠
		nil,      // arguments: 额外参数
		          //   - alternate-exchange: 备用 Exchange，消息无法路由时转发到这里
		          //   - 一般保持 nil
	)
	if err != nil {
		log.Fatalf("无法声明 exchange: %v", err)
	}

	// 准备消息
	body := bodyFrom(os.Args)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 发布消息到 exchange
	err = ch.PublishWithContext(ctx, "logs", "", false, false, amqp.Publishing{
		ContentType: "text/plain",
		Body:        []byte(body),
	})
	if err != nil {
		log.Fatalf("发布消息失败: %v", err)
	}

	log.Printf(" [x] 发送日志: %s", body)
}
```

*03-publish-subscribe/subscribe/subscriber.go*

```go
func main() {
	// 3. 声明 exchange，与生产者保持一致
	err = ch.ExchangeDeclare("logs", "fanout", false, true, false, false, nil)
	if err != nil {
		log.Fatalf("无法声明 exchange: %v", err)
	}

	// 4. 声明一个临时队列，需要设置为独占队列
	q, err := ch.QueueDeclare("", false, true, true, false, nil)
	if err != nil {
		log.Fatalf("无法声明队列: %v", err)
	}

	// 5. 将队列绑定到 exchange
	err = ch.QueueBind(
		q.Name, // queue: 要绑定的队列名称
		"",     // key: Binding Key
		        //   - fanout 类型的 Exchange 会忽略此参数，可以填空字符串
		        //   - direct 类型必须指定，用于精确匹配
		        //   - topic 类型必须指定，支持通配符 * 和 #
		"logs", // exchange: Exchange 名称，即要绑定到哪个 Exchange
		false,  // noWait: 是否等待服务器响应
		        //   - true: 不等待确认，异步快速
		        //   - false: 等待确认绑定成功，同步可靠
		nil,    // arguments: 额外参数
		        //   - x-match: headers 类型 Exchange 的匹配模式（all/any）
		        //   - 一般保持 nil
	)
	if err != nil {
		log.Fatalf("无法绑定队列: %v", err)
	}

	// 6. 消费消息
	msgs, err := ch.Consume(q.Name, "", true, false, false, false, nil)
	if err != nil {
		log.Fatalf("无法注册消费者: %v", err)
	}

	log.Printf(" [*] 等待日志消息。按 CTRL+C 退出")
	log.Printf(" [*] 队列名称: %s", q.Name)

	// 7. 处理消息
	for d := range msgs {
		log.Printf(" [x] 收到日志: %s", d.Body)
	}
}
```

对于生产者来说，不再是 `生产者 -> 消息队列`，而是把消息投递到了 Exchange，消费者自己声明一个临时队列绑定到 Exchange 上，随后如果生产者投递了消息，那么 Exchange 就会按照规则把消息转发到绑定上来的队列上，此处这个规则是 fanout，也就是无差别转发给所有订阅队列，类似于一个广播的行为。

测试方案也很简单:

```zsh
# 终端1：启动消费者A
❯ go run 03-publish-subscribe/subscribe/subscriber.go
2025/11/05 20:16:04  [*] 等待日志消息。按 CTRL+C 退出
2025/11/05 20:16:04  [*] 队列名称: amq.gen-uu-h8uSqEACxiL36XcG7PA
2025/11/05 20:16:15  [x] 收到日志: info: Hello World!

# 终端2：启动消费者B
❯ go run 03-publish-subscribe/subscribe/subscriber.go
2025/11/05 20:16:07  [*] 等待日志消息。按 CTRL+C 退出
2025/11/05 20:16:07  [*] 队列名称: amq.gen-Bx9_jKpLmNz4OqR5StU8WV
2025/11/05 20:16:15  [x] 收到日志: info: Hello World!

# 终端3：发送消息
❯ go run 03-publish-subscribe/publisher/publisher.go "info: Hello World!"
2025/11/05 20:16:15  [x] 发送日志: info: Hello World!
```

可以看到: 两个消费者都收到了同一条消息，也就是上面我们说到的广播，再次看一下这个流程:

- **生产者**：只需要知道 Exchange 名称，发送消息到 Exchange
- **消费者**：声明临时队列 → 绑定到 Exchange → 消费消息
- **Exchange**：负责消息复制和分发，生产者和消费者完全解耦

值得注意的是，我们给消费者采用的是 **临时队列**，RabbitMQ 自动生成随机名称，且我们设置的是连接断开后自动删除。

### 路由模式

除了上面的 fanout 以外，本处我们介绍一下 direct 模式，它的本质就是多出一个路由键，这样 Exchange 在做消息复制和分发时只会把消息按照我们设定的路由键分发给对应的队列，这样就可以实现精确匹配的消息分发了，代码上区分也不大:

*04-routing/emit_log_direct/main.go*

```go
func main() {
	// 3. 声明一个 direct 类型的 exchange
	err = ch.ExchangeDeclare("logs_direct", "direct", false, true, false, false, nil)
	if err != nil {
		log.Fatalf("无法声明 exchange: %v", err)
	}

	// 4. 从命令行获取日志级别和消息
	// 用法: go run main.go error "数据库连接失败"
	severity := severityFrom(os.Args)
	body := bodyFrom(os.Args)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 5. 发布消息
	err = ch.PublishWithContext(ctx, "logs_direct", severity, false, false, amqp.Publishing{
		ContentType: "text/plain",
		Body:        []byte(body),
	})
	if err != nil {
		log.Fatalf("发布消息失败: %v", err)
	}

	log.Printf(" [x] 发送 [%s] 日志: %s", severity, body)
}
```

*04-routing/receive_logs_direct/main.go*

```go
func main() {
	// 3. 声明 exchange，与发布者保持一致
	err = ch.ExchangeDeclare("logs_direct", "direct", false, true, false, false, nil)
	if err != nil {
		log.Fatalf("无法声明 exchange: %v", err)
	}

	// 4. 声明临时队列
	q, err := ch.QueueDeclare("", false, true, true, false, nil)
	if err != nil {
		log.Fatalf("无法声明队列: %v", err)
	}

	// 5. 从命令行获取要订阅的日志级别
	// 用法: go run main.go error warning
	//      go run main.go info
	if len(os.Args) < 2 {
		log.Printf("用法: %s [info] [warning] [error]", os.Args[0])
		os.Exit(0)
	}

	// 6. 为每个日志级别绑定队列
	for _, severity := range os.Args[1:] {
		log.Printf(" [*] 绑定队列到 routing key: %s", severity)
		err = ch.QueueBind(q.Name, severity, "logs_direct", false, nil)
		if err != nil {
			log.Fatalf("无法绑定队列: %v", err)
		}
	}

	// 7. 消费消息
	msgs, err := ch.Consume(q.Name, "", true, false, false, false, nil)
	if err != nil {
		log.Fatalf("无法注册消费者: %v", err)
	}

	log.Printf(" [*] 等待日志消息。按 CTRL+C 退出")

	// 8. 处理消息
	for d := range msgs {
		log.Printf(" [x] 收到 [%s] 日志: %s", d.RoutingKey, d.Body)
	}
}
```

与广播的区别就在于这个 Exchange 做消息复制和分发时会多一层过滤条件，它只会把消息分发给路由键完全匹配的队列，测试起来也很简单:

```zsh
# 终端1
❯ go run 04-routing/receive_logs_direct/main.go warning error
2025/11/05 20:58:15  [*] 绑定队列到 routing key: warning
2025/11/05 20:58:15  [*] 绑定队列到 routing key: error
2025/11/05 20:58:15  [*] 等待日志消息。按 CTRL+C 退出
2025/11/05 20:58:51  [x] 收到 [error] 日志: test1

# 终端2
❯ go run 04-routing/receive_logs_direct/main.go info
2025/11/05 20:58:23  [*] 绑定队列到 routing key: info
2025/11/05 20:58:23  [*] 等待日志消息。按 CTRL+C 退出
2025/11/05 20:58:45  [x] 收到 [info] 日志: test1

# 终端3
❯ go run 04-routing/emit_log_direct/main.go info test1
2025/11/05 20:58:45  [x] 发送 [info] 日志: test1
❯ go run 04-routing/emit_log_direct/main.go error test1
2025/11/05 20:58:51  [x] 发送 [error] 日志: test1
```

### 主题模式

这个更是类似，只是在路由键有一些不同:

路由模式下这个路由键必须和 binding key 一模一样才会分发，但是很多时候我们想要一类的消息，如接收 app 开头的所有消息，即对这个路由键多搞一个 **通配符匹配**，类似于正则那种，不过这个通配符非常简单，只有几个规则:

- 必须是用 '.' 分隔的单词，如 `device.bedroom.room`
- `*` 匹配一个单词，如 `device.*` 表示首个单词为 `device`，第二个单词为任意
- `#` 匹配多个单词，如 `device.#` 表示首个单词为 `device`，后面所有单词为任意的

因此可以很容易看出，如果我们不使用通配符，那么 **主题模式会退化为路由模式**，因而代码改变很小:

*05-topics/emit_log_topic/main.go*

```go
// 只需要修改声明 Exchange 的类型即可
err = ch.ExchangeDeclare("logs_topic", "topic", false, true, false, false, nil)
```

消费者部分不做任何修改，只是改动一下处理命令行参数的逻辑即可，此时我们测试一下:

```zsh
# 终端1
❯ go run 05-topics/receive_logs_topic/main.go "kern.*"
2025/11/05 21:13:12  [*] 绑定队列到 pattern: kern.*
2025/11/05 21:13:12  [*] 等待日志消息。按 CTRL+C 退出
2025/11/05 21:14:00  [x] 收到 [kern.world]: Hello World!

# 终端2
❯ go run 05-topics/receive_logs_topic/main.go "#.error"
2025/11/05 21:13:25  [*] 绑定队列到 pattern: #.error
2025/11/05 21:13:25  [*] 等待日志消息。按 CTRL+C 退出
2025/11/05 21:13:42  [x] 收到 [s.error]: Hello World!

# 终端3
❯ go run 05-topics/emit_log_topic/main.go "s.error"
2025/11/05 21:13:42  [x] 发送 [s.error] 日志: Hello World!
❯ go run 05-topics/emit_log_topic/main.go "kern.world"
2025/11/05 21:14:00  [x] 发送 [kern.world] 日志: Hello World!
```

也就是说，主题模式最大的特点就在于这个路由键可以写成 **通配符的样式**，其余思想均与路由模式保持一致。

至此，我们就看完了基础消息模型，接下来我们看一些高级特性，我会尽可能只展示与先前不同的地方，而保持最大限度的增量学习。

## 高级特性

### 消息确认机制

此时让我们把目光放到 消息队列 -> 消费者 这一步上，前面我们统称 RabbitMQ 在消息队列中有数据时把消息发送给消费者，消费者通过 **管道** 的方式接收到发来的消息，那此时请思考一个问题: 这个发送的过程本质上是 TCP 连接，如果发送的过程失败或者消费者崩溃，那这条消息是不是就彻底丢失了，如何避免这种情况？

在聊这个问题前，我们先来了解下 RabbitMQ 中消息的三种状态:

1. Ready（就绪）
   - 消息在队列中等待被消费，还没有分配给任何消费者
   - 在管理界面显示为 "Ready"

2. Unacked（未确认）
   - 消息已经发送给消费者，但消费者还没有确认（ACK）
   - 消息已经离开队列，但还在 RabbitMQ 的内存中
   - 如果消费者崩溃，消息会重新变成 Ready 状态
   - 在管理界面显示为 "Unacked"

3. Acked（已确认/删除）
   - 消费者调用了确认等方法
   - 消息从 RabbitMQ 的内存中彻底删除
   - 不会再在管理界面显示

现在请你回看我们前面调用 Consume 的时候，对 autoAck 设置为 true 的含义就很清除了吧，即 **消息发送给消费者后立刻标记为 acked**，而不管消息是否有没有被正常消费，直接就从 RabbitMQ 的内存中删除，但这种行为在诸如订单一类的场景下是不是完全无法接受的，因而我们需要一种更为完善的机制来解决这个问题，也就是此处的 **消息确认机制**。

对于生产者，基本没有变化，简单看一下即可:

*06-message-ack/producer/producer.go*

```go
func main() {
	q, err := ch.QueueDeclare("task_queue_ack", false, true, false, false, nil)
	if err != nil {
		log.Fatalf("Cann't declare a queue: %v", err)
	}

	body := bodyFrom(os.Args)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	err = ch.PublishWithContext(ctx, "", q.Name, false, false, amqp091.Publishing{
		ContentType: "text/plain",
		Body:        []byte(body),
	})
	if err != nil {
		log.Fatalf("Cann't publish a message: %v", err)
	}
	log.Printf(" [x] Sent %s", body)
}
```

但是对于消费者，我们需要把 Consume 的 autoAck 设置为 false，随后在处理消息的时候手动确认消息:

*06-message-ack/consumer/consumer.go*

```go
func main() {
	q, err := ch.QueueDeclare("task_queue_ack", false, true, false, false, nil)
	if err != nil {
		log.Fatalf("Cann't declare a queue: %v", err)
	}

	// autoAck 设置为 false
	msgs, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		log.Fatalf("Cann't register a consumer: %v", err)
	}

	for d := range msgs {
		log.Printf("Received a message: %s", d.Body)

		dotCount := bytes.Count(d.Body, []byte("."))
		t := time.Duration(dotCount)
		time.Sleep(t * time.Second)

		log.Printf(" [✓] 任务完成")

		// 手动确认消息
		// false 表示只确认当前消息
		// true 表示确认当前及之前所有未确认的消息
		d.Ack(false)
	}
}
```

这里我们的业务处理逻辑仅仅是睡眠，但是实际的业务中你就可以拒绝这条消息并调用 Nack/Reject，这样它就会重新入队并被分配消费了，我们先测试一下:

```zsh
# 启动两个消费者
❯ go run 06-message-ack/consumer/consumer.go

# 启动一个生产者
❯ go run 06-message-ack/producer/producer.go "task....."
2025/11/06 12:28:02  [x] Sent task.....

# 此时有一个消费者需要处理这个消息，但是需要5秒，立刻 Ctrl+C 退出，你就会发现原本没有被分配这个的消费者拿到了这条消息并处理了
```

对于这种确认的方式，大体可以有如下几种:

```go
d.Ack(false) // multiple: 传入 false 表示只确认当前消息，传入 true 表示确认当前及之前所有未确认的消息(指的是 unacked 这个表)

d.Nack(
	false, // multiple: false 只拒绝当前，true 拒绝当前及之前所有
  true,  // requeue: true 重新入队，false 丢弃
)

d.Reject(true) // requeue: true=重新入队, false=丢弃
```

值得注意的是:

- Ack 操作的本质就是为消息增加一个标记，RabbitMQ 只会移除被标记的消息。
- 只有消费者崩溃，消息才会重新变成 Ready 状态，其余情况想让它重新入队需要手动 Nack/Reject 操作。

### 消息持久化

看到名字又是一种莫名的熟悉感，前面我们所有的操作都是基于内存的队列和交换机，那内存你知道的，RabbitMQ 本质就是一个内存中的队列进程，一旦进程崩溃或者重启了，操作系统会自动回收内存页等资源，那先前设置的各种队列和未消费的消息就会被回收了，如果有一些充值的日志什么的还没有落盘，后果就比较严重了对吧，因此持久化机制也是必须引入的。

我们前面一共有三个实体: 交换机、消息队列、消息，因而持久化的时候需要考虑这三个的持久化，先说使用上，只需要修改几个参数即可:

- 消息队列、交换机: 只需要在声明时把 durable 设置为 true
- 消息: 在发布时设置一个 DeliveryMode: `amqp091.Publishing{ DeliveryMode: amqp091.Persistent }`

这里我们看一个小例子:

*07-duration/producer/producer.go*

```go
func main() {
	// 持久化声明为 true
	q, err := ch.QueueDeclare("task_queue_durable", true, false, false, false, nil)
	if err != nil {
		log.Fatalf("Cann't declare a queue: %v", err)
	}

	body := bodyFrom(os.Args)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	err = ch.PublishWithContext(ctx, "", q.Name, false, false, amqp091.Publishing{
		DeliveryMode: amqp091.Persistent, // 声明为持久化
		ContentType:  "text/plain",
		Body:         []byte(body),
	})
	if err != nil {
		log.Fatalf("Cann't publish a message: %v", err)
	}
	log.Printf(" [x] Sent %s", body)
}
```

消费者不需要修改，正常消费即可，只需要声明队列是也把 durable 设置为 true 即可，这里就不再贴代码了，然后我们可以来测试一下:

```zsh
# 先生产几个消息
❯ go run 07-duration/producer/producer.go "持久化消息1....."
❯ go run 07-duration/producer/producer.go "持久化消息2....."
2025/11/06 14:21:44  [x] Sent 持久化消息1.....
2025/11/06 14:21:44  [x] Sent 持久化消息2.....

# 此时我们打开控制面板，就可以看到有两条ready消息了，我们尝试重启服务
sudo systemctl restart rabbitmq

# 此时再次打开控制面板，你会发现，这两条消息依旧是存在的，我们可以消费这两条消息
❯ go run 07-duration/consumer/consumer.go
2025/11/06 14:36:53  [*] 等待持久化消息。按 CTRL+C 退出
2025/11/06 14:36:53  [x] 收到: 持久化消息1.....
2025/11/06 14:36:58  [✓] 完成
2025/11/06 14:36:58  [x] 收到: 持久化消息2.....
2025/11/06 14:37:03  [✓] 完成
```

这样我们就实现了消息队列以及消息的持久化，它们会存在磁盘中，我们必须手动删除，交换机的持久化和消息队列是一样的，我就不演示了，使用上还是非常简单的，我这里简单提一下原理，可以选择观看:

RabbitMQ 的持久化涉及三个层面，它们相互独立但需要配合使用:

1. **队列持久化** (`durable: true`)
   - 队列的 **元数据** (如名称、配置参数等)会写入 RabbitMQ 的元数据存储
   - 默认存储在 `/var/lib/rabbitmq/mnesia` 目录下(Mnesia 数据库)
   - 重启后 RabbitMQ 会从元数据恢复队列结构，但队列中的消息需要单独持久化

2. **消息持久化** (`DeliveryMode: Persistent`)
   - 消息体写入磁盘上的消息存储文件
   - RabbitMQ 使用了 **写入缓冲区** 机制，即消息先写入内存缓冲区，定期批量刷盘
   - 默认每隔一段时间或缓冲区满时才真正落盘，因此极端情况下可能丢失少量消息
   - 存储路径同样在 `/var/lib/rabbitmq/mnesia` 下

3. **交换机持久化** (`durable: true`): 与队列持久化类似

整体大概会是这么一个流程:

```
生产者发送消息
    ↓
RabbitMQ 接收消息
    ↓
写入内存缓冲区 ← (此时返回确认给生产者)
    ↓
定期批量刷盘 ← (异步写入磁盘)
    ↓
持久化完成
```

整体看来，就是比基本流程多了一个步骤，即写入缓冲区并定时刷盘，从而把相关内容存入磁盘，此时在重启时就会恢复，那显而易见的，会有一些坏处:

- 吞吐量一定会下降，因为多了磁盘 I/O 操作
- 且极端情况下会丢失消息，因为它每 25ms 或 4096 条消息才会写入，那么这就是个窗口，如果在这个窗口期间崩溃，这个窗口的数据就会丢失

因而是否要选择持久化，需要在性能和可靠性之间进行权衡，根据业务来选择。

### 公平分发

还记得我们前面说到的消息分发机制吗，默认是轮询的行为，也就是按照注册的顺序依次分发消息，而在前文我们也说了这种方式可能带来的不足之处，即负载不均衡，我们更期待的是这种行为: **RabbitMQ 优先把消息分发给空闲的消费者**，这样才能最大限度的高效处理数据。

只需要多设置一个参数即可:

```go
ch.Qos(
    1,     // prefetchCount: 每次只预取1条消息
    0,     // prefetchSize: 0 表示不限制大小
    false, // global: false 只应用于当前 channel
)
```

Qos 的意思就是设置一个参数，表示消费者最多可以占有多少个未 ack 的消息，比如这个设置里，我们设置最多可以预取 1 个未 ack 数据，RabbitMQ 就会给每个消费者分配一个 Ready 消息，而不会按顺序轮询分配，因而就能达到公平分发的效果。

默认行为是 RabbitMQ 按顺序依次分发，只要消息没分配完就一直分配，现在则变成了 RabbitMQ 按需分发，消费者设置了你最多给我分配多少消息，当消费者空闲时才会发送下一个消息，代码上也很简单:

*08-prefetch/consumer/consumer.go*

```go
func main() {
	q, err := ch.QueueDeclare("task_queue_fair", false, true, false, false, nil)
	if err != nil {
		log.Fatalf("Cann't declare a queue: %v", err)
	}

	// 设置 Qos
	err = ch.Qos(
		1,     // prefetchCount: 每次只预取1条消息
		0,     // prefetchSize: 0 表示不限制大小
		false, // global: false 表示只应用于当前 channel
	)
	if err != nil {
		log.Fatalf("Cann't set Qos: %v", err)
	}

	// 注意，此时必须为手动 ack
	msgs, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		log.Fatalf("Cann't register a consumer: %v", err)
	}

	log.Printf(" [*] 等待任务(Qos=1, 公平分发)。按 CTRL+C 退出")

	// 6. 处理消息
	for d := range msgs {
		log.Printf(" [x] 收到: %s", d.Body)

		// 模拟耗时任务
		dotCount := bytes.Count(d.Body, []byte("."))
		time.Sleep(time.Duration(dotCount) * time.Second)

		log.Printf(" [✓] 完成")
		d.Ack(false)
	}
}
```

然后简单测试一下，操作和前面轮询分发的保持一致:

```zsh
# 终端1
❯ go run 08-prefetch/consumer/consumer.go
2025/11/06 15:21:27  [*] 等待任务(Qos=1, 公平分发)。按 CTRL+C 退出
2025/11/06 15:21:47  [x] 收到: Task 1
2025/11/06 15:21:47  [✓] 完成
2025/11/06 15:21:47  [x] 收到: Task 3.....
2025/11/06 15:21:52  [✓] 完成
2025/11/06 15:21:52  [x] 收到: Task 6.
2025/11/06 15:21:53  [✓] 完成

# 终端2
❯ go run 08-prefetch/consumer/consumer.go
2025/11/06 15:21:31  [*] 等待任务(Qos=1, 公平分发)。按 CTRL+C 退出
2025/11/06 15:21:47  [x] 收到: Task 2.
2025/11/06 15:21:48  [✓] 完成
2025/11/06 15:21:48  [x] 收到: Task 4.
2025/11/06 15:21:49  [✓] 完成
2025/11/06 15:21:49  [x] 收到: Task 5.....
2025/11/06 15:21:54  [✓] 完成

# 终端3
❯ cd 08-prefetch/producer && go run producer.go "Task 1"
go run producer.go "Task 2."
go run producer.go "Task 3....."
go run producer.go "Task 4."
go run producer.go "Task 5....."
go run producer.go "Task 6."
2025/11/06 15:21:47  [x] Sent Task 1
2025/11/06 15:21:47  [x] Sent Task 2.
2025/11/06 15:21:47  [x] Sent Task 3.....
2025/11/06 15:21:47  [x] Sent Task 4.
2025/11/06 15:21:47  [x] Sent Task 5.....
2025/11/06 15:21:47  [x] Sent Task 6.
```

可以看到不再是和原来一样，消费者 1 被分配 1、3、5 了，而是根据消费者的消费情况来具体分配了。

我在代码里也写了注释，采用 Qos 的情况下，是必须手动 Ack 的，你可以想象一下，如果自动 Ack，那么发送一个消息后，立刻确认，RabbitMQ 就会认为你已经空闲了，就会再次发送，又回退到原来的轮询分发了。

这里给一个小建议，如果任务耗时差距较大，那 prefetchCount 建议为 1，这是最公平的; 但是如果任务耗时接近，则建议设置为 10~50。

### RPC

说实话，用 RabbitMQ 来实现 RPC 纯纯闲的，不管是性能还是任何一方面都被 gRPC 爆了，因此不做讲解，有兴趣可以读一下 [RPC例子](https://github.com/KBchulan/ClBlogs-Src/tree/main/pages-other/mystore/04-rabbitmq/09-rpc/server/server.go)。

### TTL

这个在 Redis 里是老熟人了，我们这里简单提一下就好，一个消息如果发送到队列里，但是一直没有消费者来消费，那它是不是就会一直存在内存中，导致内存的溢出一类的问题呢，为此 RabbitMQ 提供了一种方式，让我们可以设置消息的 TTL，当消息到达 TTL 时，就会自动删除。

TTL 的单位为 **毫秒**，设置包含两种情况:

- **队列TTL**: 这里有两个可以设置的，一个是对队列的 TTL 设置，超时后会直接删除队列; 另一个是对队列中某个消息的 TTL 设置，超时后立即移除这条消息。

```go
args := amqp.Table{
	"x-expires": int32(10000),     // 队列30秒不用就删除
  "x-message-ttl": int32(10000), // 10秒过期
}
ch.QueueDeclare("queue_ttl", false, false, false, false, args)
```

> 注意，对队列消息的 TTL 行为是超时后被 RabbitMQ 保护不消费，但是并不是立即删除，而是由 RabbitMQ 主动扫描删除，因此看上去就像立即删除了一样。

- **消息TTL**: 对队列中某个消息的 TTL 设置，空闲时间到达后标记为不可用，随后消费到队头时发现不可用则立即删除，并不是立即删除，而是存在队头阻塞问题。

```go
ch.PublishWithContext(ctx, "", q.Name, false, false,
  amqp.Publishing{
      Expiration: "5000", // 5秒过期
      Body:       []byte("message"),
  },
)
```

整体流程就是这样，我们分别演示这两个并测试:

*10-ttl/producer_queue_ttl/producer.go*

```go
func main() {
	args := amqp091.Table{
		"x-expires":     int64(30000), // 30 seconds
		"x-message-ttl": int64(10000), // 10 seconds
	}

	q, err := ch.QueueDeclare("queue_ttl_demo", false, true, false, false, args)
	if err != nil {
		log.Fatalf("Cann't declare a queue: %v", err)
	}

	body := bodyFrom(os.Args)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	err = ch.PublishWithContext(ctx, "", q.Name, false, false, amqp091.Publishing{
		ContentType: "text/plain",
		Body:        []byte(body),
	})
	if err != nil {
		log.Fatalf("Cann't publish a message: %v", err)
	}
	log.Printf(" [x] Sent %s", body)
}
```

然后我们发送两条消息，并观察管理页面:

```zsh
❯ go run 10-ttl/producer_queue_ttl/producer.go "task1...."
2025/11/06 17:30:09  [x] Sent task1....
❯ go run 10-ttl/producer_queue_ttl/producer.go "task2...."
2025/11/06 17:30:12  [x] Sent task2....
```

可以看到管理页面的这个 Queue，你会发现存在 2 个 Ready，10秒后刷新就没有了，30秒后这个队列也没有了，然后我们看一下消息的 TTL:

*10-ttl/producer_message_ttl/producer.go*

```go
func main() {
	// 3. 声明普通队列
	q, err := ch.QueueDeclare("message_ttl_demo", false, true, true, false, nil)
	if err != nil {
		log.Fatalf("无法声明队列: %v", err)
	}

	// 4. 获取 TTL 时间
	ttl := "10000"
	if len(os.Args) >= 2 {
		ttl = os.Args[1]
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 5. 发布消息（设置消息级别 TTL）
	err = ch.PublishWithContext(ctx, "", q.Name, false, false, amqp.Publishing{
		Expiration:  ttl, // 消息过期时间（字符串）
		ContentType: "text/plain",
		Body:        []byte("Message with TTL " + ttl + "ms"),
	})
	if err != nil {
		log.Fatalf("发布失败: %v", err)
	}

	log.Printf(" [x] 发送消息(TTL=%sms)", ttl)
}
```

这个测试着也很简单，我就不演示了，可以自己尝试操作一下。

### 死信队列

死信是无法被正常消费的消息，这些会被发送到特殊的死信交换机进行处理，死信的来源主要有三个:

- 消息被拒绝 (reject/nack) 且不重新入队
- 消息过期 (TTL 到期)
- 队列达到最大长度，这个前面没说过，看下面的例子即可

```go
args := amqp091.Table{
    "x-max-length": 10,  // 队列最多10条消息
}
// 第11条消息进来 → 最老的消息被挤出 → 变成死信
```

整体流程是这样的，在传统模式下，如果出现了上面的三种情况，这些消息是会被直接丢弃的，但是如果我们配置了死信参数(DLX)这种，则会把消息按照我们设置的参数投递到死信交换机上，并分发到死信队列中，我们可以起一个消费者来消费这些死信，这些死信一般会带上一些信息，如死信原因等，可以落盘日志并排查。

这里我们看一个超时导致的死信的例子:

*11-dlx/producer/producer.go*

```go
func main() {
	// 3. 声明死信交换机
	err = ch.ExchangeDeclare("dlx_exchange", "direct", false, true, false, false, nil)
	if err != nil {
		log.Fatalf("无法声明死信交换机: %v", err)
	}

	// 4. 声明死信队列
	dlq, err := ch.QueueDeclare("dead_letter_queue", false, true, false, false, nil)
	if err != nil {
		log.Fatalf("无法声明死信队列: %v", err)
	}

	// 5. 绑定死信队列到死信交换机
	err = ch.QueueBind(dlq.Name, "dead", "dlx_exchange", false, nil)
	if err != nil {
		log.Fatalf("无法绑定死信队列: %v", err)
	}

	// 6. 声明业务队列（配置 DLX）
	args := amqp.Table{
		"x-message-ttl":             int32(10000),   // 10秒过期
		"x-dead-letter-exchange":    "dlx_exchange", // 死信交换机
		"x-dead-letter-routing-key": "dead",         // 死信路由键
	}

	q, err := ch.QueueDeclare("business_queue", false, true, false, false, args)
	if err != nil {
		log.Fatalf("无法声明业务队列: %v", err)
	}

	// 7. 获取消息内容
	body := bodyFrom(os.Args)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 8. 发布消息到业务队列
	err = ch.PublishWithContext(ctx, "", q.Name, false, false, amqp.Publishing{
		ContentType: "text/plain",
		Body:        []byte(body),
	})
	if err != nil {
		log.Fatalf("发布失败: %v", err)
	}

	log.Printf(" [x] 发送消息(10秒后过期 → 死信队列): %s", body)
}
```

这些就是我们基础部分的详细展开了，如果哪里不清楚，可以往上翻一下看看，对应的起一个消费者来消费死信队列，只需要把基础消费模板的 Consume 的队列名称改为 dead_letter_queue 即可。

这里测试一下，先发送两条消息，随后启动消费者，消费死信数据:

```zsh
❯ go run 11-dlx/producer/producer.go "task1"
2025/11/06 18:27:00  [x] 发送消息(10秒后过期 → 死信队列): task1
❯ go run 11-dlx/producer/producer.go "task1"
2025/11/06 18:27:02  [x] 发送消息(10秒后过期 → 死信队列): task2

❯ go run 11-dlx/consumer/consumer.go
2025/11/06 18:27:08  [*] 死信消费者启动，等待死信消息...
2025/11/06 18:27:10 死信消息: task1
2025/11/06 18:27:10 原因: [map[count:%!s(int64=1) exchange: queue:business_queue reason:expired routing-keys:[business_queue] time:2025-11-06 18:27:10 +0800 CST]]
2025/11/06 18:27:12 死信消息: task2
2025/11/06 18:27:12 原因: [map[count:%!s(int64=1) exchange: queue:business_queue reason:expired routing-keys:[business_queue] time:2025-11-06 18:27:12 +0800 CST]]
```

可以看到，过期消息被正确投递进入死信队列，并被消费者消费。

到此，我们就说完了基础相关的内容，随后来一些比较好的实践，我们本节就算结束啦。

### 连接和通道管理

在前，的所有示例中，我们的代码都有一个共同的问题：**没有处理网络异常和连接断开的情况**，如果 RabbitMQ 重启了咋整，或者网络波动导致 TCP 连接中断咋办，这些都是实际存在的问题。

我们期望的是 **全局公用一个连接，同时为每个业务创建通道进行处理**。

但是连接如我们先前所说，可能由于意外而中断，因而我们需要一个能自动重连的连接; 而对于管道，多个管道之间并非并发安全，出于异步的考虑，我们还是应该为每个业务创建独立的管道。

下面是一个带自动重连功能的 RabbitMQ 客户端实现，并对外提供获取通道和新建通道的方法：

*12-connection-management/rabbitmq_client.go*

```go
package connection_management

import (
	"log"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// RabbitMQClient 是一个带自动重连的 RabbitMQ 客户端
type RabbitMQClient struct {
	url             string           // RabbitMQ 连接地址
	conn            *amqp.Connection // 连接对象
	channel         *amqp.Channel    // 通道对象
	isConnected     bool             // 连接状态
	mu              sync.RWMutex     // 读写锁，保护连接和通道
	notifyClose     chan *amqp.Error // 监听连接关闭事件
	notifyChanClose chan *amqp.Error // 监听通道关闭事件
	done            chan bool        // 关闭信号
}

// NewRabbitMQClient 创建一个新的 RabbitMQ 客户端
func NewRabbitMQClient(url string) *RabbitMQClient {
	client := &RabbitMQClient{
		url:  url,
		done: make(chan bool),
	}

	go client.handleReconnect()

	return client
}

// handleReconnect 处理连接和自动重连
func (c *RabbitMQClient) handleReconnect() {
	for {
		c.isConnected = false
		log.Println("Connecting to RabbitMQ")

		// 尝试建立连接
		if err := c.connect(); err != nil {
			log.Printf("Connect to RabbitMQ failed: %v, Wait 5 seconds to retry", err)

			select {
			case <-c.done:
				return
			case <-time.After(5 * time.Second):
			}
			continue
		}

		c.isConnected = true
		log.Println("RabbitMQ connecte successfully")

		// 等待连接或通道关闭事件
		select {
		case <-c.done:
			return
		case err := <-c.notifyClose:
			log.Printf("Connect to RabbitMQ closed: %v", err)
		case err := <-c.notifyChanClose:
			log.Printf("Channel to RabbitMQ closed: %v", err)
		}
	}
}

// connect 建立连接和通道
func (c *RabbitMQClient) connect() error {
	// 1. 建立连接
	conn, err := amqp.Dial(c.url)
	if err != nil {
		return err
	}

	// 2. 创建通道
	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return err
	}

	// 3. 加锁更新连接和通道
	c.mu.Lock()
	c.conn = conn
	c.channel = ch
	c.mu.Unlock()

	// 4. 监听连接关闭事件
	c.notifyClose = make(chan *amqp.Error)
	c.conn.NotifyClose(c.notifyClose)

	// 5. 监听通道关闭事件
	c.notifyChanClose = make(chan *amqp.Error)
	c.channel.NotifyClose(c.notifyChanClose)

	return nil
}

// GetChannel 获取通道
func (c *RabbitMQClient) GetChannel() (*amqp.Channel, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if !c.isConnected {
		return nil, amqp.ErrClosed
	}

	return c.channel, nil
}

// NewChannel 创建一个新的独立通道
func (c *RabbitMQClient) NewChannel() (*amqp.Channel, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if !c.isConnected || c.conn == nil {
		return nil, amqp.ErrClosed
	}

	return c.conn.Channel()
}

// IsConnected 检查连接状态
func (c *RabbitMQClient) IsConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.isConnected
}

// Close 关闭客户端
func (c *RabbitMQClient) Close() error {
	// 1. 发送关闭信号，停止重连循环
	close(c.done)

	// 2. 加锁关闭通道和连接
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.channel != nil {
		c.channel.Close()
	}

	if c.conn != nil {
		return c.conn.Close()
	}

	c.isConnected = false
	log.Println("RabbitMQ has been closed")
	return nil
}
```

设计上还是非常简单的，可以自行阅读一下，包括对应的生产者和消费者，都可以自己手写测试一下。

这里留一个小问题，如何确保关闭时能消费完剩余的消息呢?

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/tree/main/pages-other/mystore/05-rabbitmq)。