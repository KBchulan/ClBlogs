---
title: 34 如何做好验收测试？
article: true

order: 34
star: false

category:
  - 摘录

tag:
  - 程序员工作法

date: 2025-06-26

footer: Always coding, always learning
---

<!-- more -->

# 34 如何做好验收测试？

经过前面三讲的讲解，相信你对一个项目自动化应该是什么样子有了一个相对完整的认识：程序员写好程序，用构建脚本执行检查，提交代码，在服务器上打出一个发布镜像，部署到各个环境进行检查，检查好了，随时可以发布上线。

我们在前面的内容中只说了该检查，但怎么检查呢？这就轮到测试发挥作用了。

在"任务分解"的模块，我给你完整地介绍了一下开发者测试的概念，但在那个部分讲解的测试基本上还停留在单元测试和集成测试的范畴。对于整个应用该怎么测，我们并没有仔细讨论。

今天我们就来说说应用测试的话题：验收测试。

## 验收测试

验收测试（Acceptance Testing），是确认应用是否满足设计规范的测试。这种测试往往是站在用户的角度，看整个应用能否满足业务需求。

从名字上来看，验收应该是业务人员的事，但业务人员能做的最多只是验收，测试是他们无论如何也不太可能做仔细的。

所以，验收测试这件事，往往还是由技术团队自己完成，而且在很多公司，这就是测试人员的事。

时至今日，很多测试团队都拥有自动化的能力。所以，自动化验收测试自然是重点考虑对象。今天，我们的重点就是怎么做好自动化的验收测试。

其实，验收测试应该是人们最早想到的自动化测试，早在单元测试还不流行的年代，人们就开始了对自动化验收测试的探索。有不少团队甚至还构建了自己的框架，只不过，这种框架不是我们今天理解的测试框架，而是针对着一个应用的测试框架。

比如，我曾经见过有人为通信软件构建的一套完整的测试框架，甚至构建了属于自己的语言，测试人员的工作就是用这种特定的语言，对系统进行设置、运行，看它是否满足自己的预期。

相对来说，他们的这种做法已经非常成熟了。但更多团队的现实情况是，自己把对应用的访问做一个简单的封装，然后，写测试就是编写代码调用这个封装。

让验收测试从各自为战的混乱中逐渐有了体系的是行为驱动开发（Behavior Driven Development）这个概念的诞生，也就是很多人知道的 BDD。

## 行为驱动开发

行为驱动开发中的行为，指的是业务行为。BDD 希望促进业务人员与开发团队之间的协作，换句话说，**如果你想做 BDD，就应该用业务语言进行描述。**

这与我们传统上理解的系统测试有着很大的差别，传统意义上的系统测试是站在开发团队的角度，所以，更多的是在描述系统与外部系统之间的交互，用的都是计算机的术语。

而 BDD 则让我们换了一个视角，用业务语言做系统测试，所以，它是一个更高级别的抽象。

BDD 是2003年由 Dan North 提出了来的。Dan North 不仅仅提出了概念，为了践行他的想法，他还创造了第一个 BDD 的框架：[JBehave](http://jbehave.org)。后来又改写出基于 [Ruby](http://www.ruby-lang.org/en/) 的版本 [RBehave](http://dannorth.net/2007/06/17/introducing-rbehave/)，这个项目后来被并到 [RSpec](http://rspec.info) 中。

今天最流行的 BDD 框架应该是 [Cucumber](http://cucumber.io)，它的作者就是 RSpec 的作者之一 Aslak Hellesøy。

Cucumber 从最开始的 Ruby BDD 框架发展成今天支持很多不同程序设计语言的 BDD 测试框架，比如，常见的 Java、JavaScript、PHP 等等。

BDD 框架给我们最直观的感受就是它给我们提供的一套语言体系，供我们描述应用的行为，下面是一个例子，它描述了一个交易场景，应用需要根据交易结果判定是否要发出警告。你可以感受一下：

```gherkin
Scenario:  trader is not alerted below threshold

Given a stock of symbol STK1 and a threshold of 10.0
When the stock is traded at 5.0
Then the alert status should be OFF

Scenario:  trader is alerted above threshold

Given a stock of symbol STK1 and a threshold of 10.0
When the stock is traded at 11.0
Then the alert status should be ON
```

我们在这里的关注点是这个例子的样子，首先是描述格式："Given…When…Then"，这个结构对应着这个测试用例中的执行步骤。Given 表示的一个假设前提，When 表示具体的操作，Then 则对应着这个用例要验证的结果。

还记得我们讲过的测试结构吗？前置准备、执行、断言和清理，这刚好与"Given…When…Then"做一个对应，Given 对应前置条件，When 对应执行，Then 则对应着断言。至于清理，它会做一些资源释放，属于实现层面的内容，在业务层面上意义不大。

了解了格式，我们还要关心一下内容。你会看到这里描述的行为都是站在业务的角度进行叙述的，而且 Given、When、Then 都是独立的，可以自由组合。也就是说，一旦基础框架搭好了，我们就可以用这些组成块来编写新的测试用例，甚至可以不需要技术人员参与。

不过，这些内容都是站在业务角度的描述，没有任何实现的内容，那实现的内容放在哪呢？

我们还需要定义一个胶水层，把测试用例与实现联系起来的胶水层，在 Cucumber 的术语里，称之为步骤定义（Step Definition）。这里我也给出了一个例子，你可以参考一下：

```java
public class TraderSteps implements En {
    private Stock stock;

    public TraderSteps() {
        Given("^a stock of symbol {string} and a threshold of {double}", (String symbol, double threshold) -> {
            stock = new Stock(symbol, threshold);
        });

        When("^the stock is traded at {double}$", (double price) -> {
            stock.tradeAt(price);
        });

        Then("the alert status should be {string}", (String status) -> {
            assertThat(stock.getStatus().name()).isEqualTo(status);
        })
    }
}
```

## 写好验收测试用例

有了对 BDD 框架的基本了解，接下来的问题就是，怎么用好 BDD 框架。我们举个简单的例子，如果我们要写一个登录的测试用例，你会怎么写呢？

有一种写法是这样的，为了方便叙述，我把它转成了中文描述的格式，Cucumber 本身是支持本地化的，你可以使用自己熟悉的语言编写用例：

```gherkin
假定 张三是一个注册用户，其用户名密码分别是 zhangsan 和 zspassword
当 在用户名输入框里输入 zhangsan，在密码输入框里输入 zspassword
并且 点击登录
那么 张三将登录成功
```

这个用例怎么样呢？或许你会说，这个用例挺好的。如果你这么想，说明你是站在程序员的视角。我在前面已经说过了，BDD 需要站在业务的角度，而这个例子完全是站在实现的角度。

如果登录方式有所调整，用户输完用户名密码自动登录，不需要点击，那这个用例是不是需要改呢？下面我换了一种方式描述，你再感受一下：

```gherkin
假定 张三是一个注册用户，其用户名密码是分别是 zhangsan 和 zspassword
当 用户以用户名 zhangsan 和密码 zspassword 登录
那么 张三将登录成功
```

这是一个站在业务视角的描述，除非做业务的调整，不用用户名密码登录了，否则，这个用例不需要改变，即便实现的具体方式调整了，需要改变的也是具体的步骤定义。

所以，**想写好 BDD 的测试用例，关键点在用业务视角描述。**

编写验收测试用例的步骤定义时，还有一个人们经常忽略的点：业务测试的模型。很多人的第一直觉是，一个测试要啥模型？还记得我们讲好测试应该具备的属性吗？其中一点就是 Professional，专业性。想要写好测试，同写好代码是一样的，一个好的模型是不可或缺的。

这方面一个可以参考的例子是，做 Web 测试常用的一个模型：[Page Object](http://martinfowler.com/bliki/PageObject.html)。它把对页面的访问封装了起来，即便你在写的是步骤定义，你也不应该在代码中直接操作 HTML 元素，而是应该访问不同的页面对象。

以前面的登录为例，我们可能会定义这样的页面对象：

```java
public class LoginPage {
    public boolean login(String name, String password) {
      ...
    }
}
```

如此一来，在步骤定义中，你就不必关心具体怎么定位到输入框，会让代码的抽象程度得到提升。

当然，这只是一个参考，面对你自己的应用时，你要考虑构建自己的业务测试模型。

## 总结时刻

今天我和你分享了自动化验收测试的话题。验收测试（Acceptance Testing），是确认应用是否满足设计规范的测试。验收测试是技术交付必经的环节，只不过，各个团队实践水平有所差异，有的靠人工，有的用简单自动化，一些做得比较好的团队才有完善的自动化。

自动化验收测试也是一个逐步发展的过程，从最开始的各自为战，到后来逐渐形成了一个完整的自动化验收测试的体系。

今天，我以行为驱动开发（Behavior Driven Development，BDD）为核心，给你介绍了一种自动化验收测试的方式。这个在2003年由 Dan North 提出的概念已经成为了一套比较完善的体系，尤其是一些 BDD 框架的发展，让人们可以自己的项目中实践 BDD。

我以 Cucumber 为样例，给你介绍了 BDD 验收用例的编写方式，你知道"Given…When…Then"的基本格式，也知道了要编写步骤定义（Step Definition）将测试用例与实现连接起来。

我还给你介绍了编写 BDD 测试用例的最佳实践：用业务的视角描述测试用例。在编写步骤定义时，还要考虑设计自己的业务测试模型。

其实，验收测试的方法不止 BDD 一种，像[实例化需求](https://en.wikipedia.org/wiki/Specification_by_example)（Specification by Example，SbE）也是一种常见的方法。验收测试框架也不止 BDD 框架一类，像 Concordion 这样的工具甚至可以让你把一个验收用例写成一个完整的参考文档。

如果你有兴趣，可以深入地去了解。无论哪种做法，都是为了缩短业务人员与开发团队之间的距离，让开发变得更加高效。

如果今天的内容你只能记住一件事，那请记住：**将验收测试自动化。**
