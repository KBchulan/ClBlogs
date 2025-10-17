---
title: 03 Gin
article: true
order: 3
star: true

category:
  - 杂货铺

tag:
  - mystore

date: 2025-10-14

description: 介绍 Go 语言的高性能 Web 框架 Gin 的使用
footer: Always coding, always learning
---

# 03 Gin

[Gin](https://gin-gonic.com/en/docs/introduction/) 是一个用 Go 语言编写的高性能 Web 框架，整体评价就是快速易用、轻量简洁，且由于它的高效路由算法，其性能也是十分优越，完全可以处理高并发情况下的海量请求。

它提供了路由分组、中间件支持、参数绑定与验证、错误处理等 Web 开发所需的全部基础能力，在开发 RESTFul API 的架构下十分适用，如果你已经明确要使用这个 API 架构，完全可以试试这个框架，它完全可以胜任中小型项目以及大项目的 API 层。

## 环境搭建

gin的安装可以直接使用 go 管理器进行配置:

```bash
# 初始化项目
go mod init ginLearn

# 安装 gin
go get github.com/gin-gonic/gin
```

此时就可以在当前项目进行使用了，可以直接写代码，插件会帮你导入这个包的，这里我们先来看一个在 gin 中的最简单的例子:

```go
package main

import "github.com/gin-gonic/gin"

func main() {
	r := gin.Default()// 创建一个路由引擎

	r.GET("/test", func(ctx *gin.Context) { // 新增 get 请求
	 	ctx.String(200, "Hello, World")
	})

  r.Run() // 默认在 0.0.0.0:8080 端口运行
}
```

此时就可以直接运行并在浏览器查看请求的结果了，可以看到，一个 Get 请求如此简单的就创建了出来，gin 框架就是如此简单，下面我们略微调整一下这个 main，就开始介绍 gin 的各个模块了。

> 这两个部分为可选，后续我们会省略这两部分，直接写主体的代码

首先是模式，默认情况是 Debug 模式，它会打印很多东西，如路由对应什么回调，我们可以选择设置为 Release 模式，保证日志的干净:

```go
func main() {
  gin.SetMode(gin.ReleaseMode)
  r := gin.Default()
  ...
}
```

接着是启动监听的部分，我们可以手动设置监听的端口路由，由于启动监听可能会出现一些错误情况，如端口已被占用等，我们需要进行错误处理:

```go
func main() {
  ...
  fmt.Println("Server starting at http://localhost:5000")
	err := r.Run("localhost:5000")
	if err != nil {
		fmt.Printf("Error start server, msg is: %s\n", err)
	}
}
```

## 路由基础

路由由 URI 和一个特定的方法组成，其中方法基本是按照 RESTFul 标准来的，从而构造出一个具有特定功能可用于客户端访问的端点。

**如何构造端点**? 需要手动向路由引擎注册一个路径以及其对应的方法即可，该方法需要传递一个 gin 的上下文:

```go
// 返回一个 string 字符串，第一个是状态码，接着则是支持 printf 风格的一个字符串
func GetPing(c *gin.Context) {
	c.String(200, "Hello, world")
}

// 设置路由以及对应回调
r.GET("/get-ping", GetPing)

// 访问 http://localhost:5000/get-ping
```

**如何获取 query 参数**？我们在创建一个 Get 请求时经常会使用 Query 方式进行传参，因此获取 query 参数是非常常用的。

```go
func GetQuery(c *gin.Context) {
	id := c.Query("id")  // 查询不到设置为空字符串
	ageStr := c.DefaultQuery("age", "18") // 查询不到可以指定默认值
	age, _ := strconv.Atoi(ageStr)
	c.String(200, "Receive id is: %s, age is: %d", id, age)
}

r.GET("/get-query", GetQuery)

// 访问 http://localhost:5000/get-query?id=3
```

**如何获取路径参数**? 除了 Query 参数，在路由上还有一个动态路由的概念，gin 也为我们提供了获取路径参数的方法。

```go
func GetDynamicUrl(c *gin.Context) {
	uid := c.Param("uid")
	c.String(200, "Receive uid is: %s", uid)
}

r.GET("/get-dynamic-url/:uid", GetDynamicUrl)
// 访问 http://localhost:5000/get-dynamic-url/2
```

路由的基本使用先了解这些即可，后续会进行详解。

## 返回数据

本模块我们来介绍一下一个接口接收到请求后如何去给前端返回值，回包本质上就是给前端返回三部分: 状态行，响应头和响应体，以下各方法均是对此有不同程度的封装。

### 手动设置

对于 http 版本是无法手动设置的，默认是 http1.1，可以开启 http2.0，可以自行查看，其余内容的设置底层都是通过 `c.Writer` 进行控制的。

```go
func ReturnBasic(c *gin.Context) {
	c.Writer.WriteHeader(200)

	c.Writer.Header().Set("X-Custom-Header", "my-value")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Server", "MyServer/1.0")

	c.Writer.WriteString("Hello")
}

r.GET("/return-basic", ReturnBasic)
// 访问 http://localhost:5000/return-basic
```

我们可以通过这种方式直接操作底层进行设置，在函数结束后，gin 框架会帮我们把这些设置的东西自动发送回去。

### 语法糖

在前面的例子中我们有使用过 String，它可以直接发送回去一个字符串，现在你应该知道了，它其实就是调用 writer 把我们传递的参数进行一个设置，可以说是一个语法糖，其余的几种结构也都是这样的，这里我们快速看个例子。

**普通字符串**，需要传递状态码和一个字符串:

```go
func ReturnString(c *gin.Context) {
	aid := c.Query("aid")
	c.String(200, "aid=%s", aid)
}

r.GET("/return-string", ReturnString)
// 请求 http://localhost:5000/return-string?aid=10
```

**Json**，需要传递状态码和一个 map[string]any 的对象，这个有个自定义类型为 gin.H，本质上就是这种哈希表，他会把这个对象序列化为 json 并设置对应响应头:

```go
// 手动设置
func ReturnJsonSimple(c *gin.Context) {
	name := c.Query("name")
	age := c.Query("age")
	c.JSON(http.StatusOK, gin.H{
		"name":    name,
		"age":     age,
		"message": "Received",
	})
}

// 通过结构体完成
type Person struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}

func ReturnJsonByStruct(c *gin.Context) {
	name := c.Query("name")
	age, _ := strconv.Atoi(c.Query("age"))

	var person = Person{
		Name: name,
		Age:  age,
	}
	c.JSON(http.StatusOK, person)
}

r.GET("/return-json-simple", ReturnJsonSimple)
r.GET("/return-json-by-struct", ReturnJsonByStruct)
// 请求 http://localhost:5000/return-json-simple?name=chulan&age=15
// 请求 http://localhost:5000/return-json-by-struct?name=chulan&age=15
```

**XML**，这个和 Json 使用上是完全一样的，只是底层序列化调用的方法不同:

```go
func ReturnXMLSimple(c *gin.Context) {
	c.XML(http.StatusOK, gin.H{
		"message": "hello, world",
	})
}

func ReturnXMLByStruct(c *gin.Context) {
	var person = Person{
		Name: "chu",
		Age:  20,
	}
	c.XML(http.StatusOK, person)
}

r.GET("/return-xml-simple", ReturnXMLSimple)
r.GET("/return-xml-by-struct", ReturnXMLByStruct)
// 请求 http://localhost:5000/return-xml-simple
// 请求 http://localhost:5000/return-xml-by-struct
```

其实还有一个模板渲染，也就是返回一个 html 文件格式的内容，但是现在更多是做成后端服务器，而不是前后端融合在一起，因此这个部分学习的意义很小，我们不再介绍。

## 静态文件服务

如果后端需要提供一些文件服务，然后你的架构中并没有资源服务器的概念，此时就可以选择使用 gin 自带的静态目录托管，使用起来也是很简单。

```go
func main() {
	...
	r.Static("/static", "./static")
	...
}
// 请求 http://localhost:5000/static/1.jpg
```

前面是路由，后面则是相对于写这个代码的文件的路径，当我们请求一个路径时他会被转发到后面的本地目录，从而获取静态资源。

## 路由进阶

这一部分我们来看一些进阶的路由技巧，都是非常常用的。

### 解析请求体

对于请求体的数据，大体可以有表单数据、Json、xml以及 multipart/form-data 等等，理论上来说，这些都是 body 的字符串，我们完全可以直接读出字符串然后对应处理，但是这样就太麻烦了，gin 为我们做了许多封装，此处我们介绍两种。

对于表单数据，有专门的方法可以用于解析:

```go
func PostForm(c *gin.Context) {
	username := c.PostForm("username")		// 解析表单数据，没有为零值
	password := c.PostForm("password")
	age := c.DefaultPostForm("age", "20") // 指定默认值

	c.JSON(200, gin.H{
		"username": username,
		"password": password,
		"age":      age,
	})
}

r.POST("post-form", PostForm)
/*
POST http://localhost:5000/post-form HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=chulan&password=123456&age=20
*/
```

当然，实际开发中，这些大部分会搞成一个结构体，gin 其实有一种非常优雅机制，也就是通过 should 系列的方法，我们可以给结构体指定一系列标签，这个方法会自动检查请求头，如果是 json 他就会按照 json 去解析，其他的按照其他的去解析，是一个自动化的方法。

```go
func PostShould(c *gin.Context) {
	type UserInfo struct {
		Name  string `json:"name" xml:"name"`
		Age   int    `json:"age" xml:"age"`
		Email string `json:"email" xml:"email"`
	}

	var user UserInfo
	err := c.ShouldBind(&user)
	if err == nil {
		c.JSON(http.StatusOK, gin.H{
			"name":  user.Name,
			"age":   user.Age,
			"email": user.Email,
		})
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
	}
}

r.POST("post-should", PostShould)
```

此时我们可以尝试在请求体里发送这两种类型的数据，你会发现都解析成功了，你也可以写上 form 的标签，让他支持更多功能:

```text
POST http://localhost:5000/post-should HTTP/1.1
Content-Type: application/json

{
  "name": "chulan",
  "age": 20,
  "email": "test@example.com"
}

POST http://localhost:5000/post-should HTTP/1.1
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<article>
  <name >chulan</name>
  <age>18</age>
  <email>test@example.com</email>
</article>
```

### 路由分组

实际开发过程中，考虑一个问题，我的 api 接口想要大版本更新，以及一个项目里有很多模块，我们如何给它清晰的表示出来，针对这个问题，gin为我们提供了路由分组的做法:

```go
v1 := r.Group("/v1") // 该路由组的所有公共前缀
{
	v1.GET("/login", func(ctx *gin.Context) {
		ctx.String(200, "Hello, World")
	})
}
// 请求: http://localhost:5000/v1/login
```

有了这个功能，我们就可以把一个大版本的所有接口放在一块，然后更新时增加一个分组就好了，模块划分也是这样，直接为每一个模块分一个组就好了。

当然，也可以多文件组合，这里举一个例子:

*`routes/adminRoutes.go`*:

```go
package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func AdminRoutesInit(r *gin.Engine) {
	adminRouter := r.Group("/admin")
	{
		adminRouter.GET("/user", func(ctx *gin.Context) {
			ctx.String(http.StatusOK, "hello, user")
		})
	}
}
```

随后可以在 main 中引入:

```go
routes.AdminRoutesInit(r)
// 请求 http://localhost:5000/admin/user
```

这样就可以实现分文件开发了，可以让结构更加的清晰。

## MVC接口实例

这里我们利用上面所学，来写一个标准的 MVC 架构的接口，帮助你对这个框架的认知有个更深的印象。

*`models/user.go`*

```go
package models

type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}
```

*`service/user_service.go`*

```go
package service

import "ginLearn/models"

type UserService struct {
}

func NewUserService() *UserService {
	return &UserService{}
}

func (us *UserService) GetUserByName(name string) (*models.User, error) {
	return &models.User{
		ID:    1,
		Name:  "chulan",
		Email: "test@163.com",
	}, nil
}
```

*`controller/user_controller.go`*

```go
package controller

import (
	"ginLearn/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	userService *service.UserService
}

func NewUserController(service *service.UserService) *UserController {
	return &UserController{userService: service}
}

func (uc *UserController) GetUserByName(c *gin.Context) {
	name := c.Query("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "name can't empty",
		})
		return
	}

	user, err := uc.userService.GetUserByName(name)

	if err == nil {
		c.JSON(http.StatusOK, *user)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
	}
}
```

*`routes/user_routes.go`*

```go
package routes

import (
	"ginLearn/controller"
	"ginLearn/service"

	"github.com/gin-gonic/gin"
)

func UserRoutesInit(r *gin.Engine) {
	userService := service.NewUserService()
	userController := controller.NewUserController(userService)

	user := r.Group("/user")
	{
		user.GET("/get-user", userController.GetUserByName)
	}
}
```

最后在 main 中注册这个路由组就好了，整体流程就是这样，写过类似的很容易就能理解。

## 中间件

gin 也提供了一套中间件的机制，类似于设置 hook，本质上就是函数，比如我们有一个路由的回调要打印 `hello, world`，可以通过注册中间件来在打印这个字符串前后执行一些其他的操作，看一个简单的例子:

```go
func InitMiddleware(c *gin.Context) {
	c.String(200, "我是一个中间件")
}

r.GET("/middleware_init", InitMiddleware, func(ctx *gin.Context) {
	ctx.String(200, "首页")
})
// 请求 http://localhost:5000/middleware_init
```

可以看到我们在首页之前注册了一个其他函数，形式和普通的回调是完全一样的，实际返回值也是先执行这个函数随后再执行后面注册的函数。

其实中间件函数注册你可以这么理解，按照写代码的顺序，先注册的先调用，后注册的后调用。

注册时主要有三种方法:

```go
// 全局注册，全局所有的路由之前都会先执行这个函数
r.Use(middleware)

// 路由组注册，当前组的路由都会先注册这个中间件
group := r.Group("")
group.Use(middleware)

// 单个路由注册，只会影响当前路由
```

也有控制路由执行的方法，这个行为就像一个执行链的控制:

```go
func (c *gin.Context) {
	我在操作
	c.Next()
	我又回来了
	c.Abort()
	我执行不到
}
```

我们可以通过调用 Next 让出执行权，让后面的函数执行，它们执行完再回来执行我，也可以通过 Abort 直接中断整个流程，这里看一个例子，我们以伪代码的方式介绍这个中间件的机制:

```go
router.Use(Middleware1()) // 1. 前置
router.Use(Middleware2()) // 2. 前置

router.GET("/test", Middleware3(), func(c *gin.Context) {
    // 4. 实际处理
    c.JSON(200, gin.H{"msg": "ok"})
})
// 执行顺序: Middleware1前 -> Middleware2前 -> Middleware3前 ->
//          Handler -> Middleware3后 -> Middleware2后 -> Middleware1后
```

> 注意，中间件函数与业务函数形式上没有区别，一般是按照约定划分，最后一个为真正的业务函数。

这是你就能直接看出，这个东西好像非常适合做校验、认证、CORS等东西吧，的确如此，另外补一句，也可以使用 `c.Get` 和 `c.Set` 方法在同一条执行链上通信。

值得注意的是，采用 `gin.Default` 初始化的路由引擎默认就会加入 logger 和 recovery 两个中间件，前者会将所有日志写入 DefaultWriter，后者则会在捕获所有panic，一旦找到，就会把状态码设置为 500，可以通过 `gin.New` 创建一个干净的路由引擎，没有任何中间件。

## 文件操作

对于一个单体的服务器，静态资源也是非常常见的，如头像等资源，虽然更多的架构下会单独引入一个资源服务器，但这些资源在上传到资源服务器前经常需要先与我们的后端服务器交流，因此本部分我们介绍一下 gin 框架与文件操作相关的内容。

### 单文件上传

对于文件上传，我们在请求上是需要设置 Content-Type 为 multipart/form-data，并在表单之间设置 boundary，因此请求上就很简单了:

```http
POST http://localhost:5000/upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebAppBoundary

------WebAppBoundary
Content-Disposition: form-data; name="username"

chulan
------WebAppBoundary
Content-Disposition: form-data; name="file"; filename="1.jpg"
Content-Type: image/jpeg

< ./static/1.jpg
------WebAppBoundary--
```

然后看一下我们的服务器，因为这个也是属于表单的，所以对于字段的解析，我们可以直接参考上文提到的 `PostForm` 即可，资源则可以使用 `FormFile` 直接解析出来即可，操作很简单，但要注意错误处理:

```go
func UploadFile(c *gin.Context) {
	file, err := c.FormFile("file")
	username := c.PostForm("username")

	if err != nil {
		c.String(http.StatusBadRequest, "upload file error: %s", err.Error())
		return
	}

	uploadPath := "./upload"
	dst := filepath.Join(uploadPath, file.Filename)

	err2 := c.SaveUploadedFile(file, dst)
	if err2 != nil {
		c.String(http.StatusBadRequest, "save file error: %s", err2.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":  fmt.Sprintf("%s file upload success", file.Filename),
		"username": username,
	})
}

r.POST("/upload", UploadFile)
```

### 多文件上传

那如果让你来设计多文件上传，你会怎么做?

最简单的方式是不是直接给每个文件搞个不同的 name，这样服务器可以分别进行 `FormFile` 即可，这种方式当然可以，而且很灵活，但是对于前端以及沟通上有更高的成本，此处我们再介绍一个别的方案，也就是使用 `MultipartForm` 来解析，此时所有文件可以设置为相同的 name:

此时前端请求略微修改一下:

```http
POST http://localhost:5000/upload-more HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebAppBoundary

------WebAppBoundary
Content-Disposition: form-data; name="username"

chulan
------WebAppBoundary
Content-Disposition: form-data; name="files"; filename="2.jpg"
Content-Type: image/jpeg

< ./static/2.jpg
------WebAppBoundary
Content-Disposition: form-data; name="files"; filename="3.jpg"
Content-Type: image/jpeg

< ./static/3.jpg
------WebAppBoundary--
```

然后后端的思路也很简单，先解析表单，然后取出相关字段即可，这里介绍一下解析表单出来的 form，它会有两个成员:

- Value: 存储所有的普通字段，类型为 `map[string][]string`，因为同一个字段名可能对应多个数据，如果只对应一个取出 0 索引处即可。

- Form: 所有文件组成的切片，可以遍历使用。

```go
func UploadManyFile(c *gin.Context) {
	// 解析表单
	form, err := c.MultipartForm()

	if err != nil {
		c.String(http.StatusBadRequest, "解析表单失败: %s", err.Error())
		return
	}

	// 普通字段
	userNames := form.Value["username"]

	// 文件
	files := form.File["files"]
	for _, v := range files {
		dst := filepath.Join("./upload", v.Filename)
		if err := c.SaveUploadedFile(v, dst); err != nil {
			c.String(http.StatusInternalServerError, "保存文件 '%s' 失败: %v", v.Filename, err)
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"username": userNames[0],
		"message":  "file upload success",
	})
}

r.POST("/upload-more", UploadManyFile)
```

然后文件上传时比较常用的是检查文件完整性，可以用 md5 或 sha256 等方案解决，可以自行探索，以及大文件上传的分块操作等等，都是很有意思的。

## Cookie

先来介绍一下什么是 Cookie。

首先 Http 是无状态协议，那么用户从一个页面跳转到另一个页面，以及多个商家的购物车，那浏览器和服务器都不能判断这是一个用户，如果我们想维持一个用户的信息，就需要在任何一次请求中都带上身份标识以及需要缓存的信息，是很麻烦的，且高度消耗带宽。

为此，浏览器产生了一种策略来帮助网站记住用户的状态信息，实现跨请求的状态保持，这个方案就是 cookie。

我们此处来模拟一个 cookie 的全流程帮助理解它是如何发挥作用的:

- 客户端发起请求，传递一些登录信息

- 服务器接收请求校验完成后，生成一个 session_id 并在响应头的 `Set-Cookie` 中设置 session_id=xxx，随后把上次信息持久化，如搞一个map，存 redis，存数据库等操作，形成 session_id -> 用户信息的映射

- 浏览器看到回包里有这个响应头，就会解析出来，并存储到用户主机的磁盘中，如 chrome 就会存储到浏览器管理的 SqlLite 数据库

- 随后浏览器发出的所有请求都会被拦截，并检查路由，把所有合适的 cookie 都加入 `Cookie` 请求头中

这样，就实现了所谓的自动化，也是 Cookie 的本质，你也可以看出来，Cookie 就是一系列 key-value，和一个字段是一致的，我们可以把每次都需要传输的字段值直接设置为 cookie，可以简化编码。

> 注意: 由于上述特性，cookie 尽量加密，同时一定不要存储隐私数据。

下面我们看一下 gin 框架中如何使用 cookie 操作，主要分为设置、获取、删除 Cookie三个操作:

```go
func SetCookie(c *gin.Context) {
	c.SetCookie("my-cookie", "hello cookie", 3600, "/", "localhost", false, true)
	c.String(200, "Cookie set successful")
}

func GetCookie(c *gin.Context) {
	cookie, err := c.Cookie("my-cookie")
	if err != nil {
		c.String(http.StatusBadRequest, "This cookie deleted")
	}
	c.String(http.StatusOK, cookie)
}

func DeleteCookie(c *gin.Context) {
	c.SetCookie("my-cookie", "", -1, "/", "localhost", false, true)
	c.String(200, "Cookie delete success")
}

r.GET("/set-cookie", SetCookie)
r.GET("/get-cookie", GetCookie)
r.GET("/delete-cookie", DeleteCookie)

GET http://localhost:5000/set-cookie HTTP/1.1
GET http://localhost:5000/get-cookie HTTP/1.1
GET http://localhost:5000/delete-cookie HTTP/1.1
```

这里需要详细介绍一下 `SetCookie方法`，它具有如下参数:

- `name`: Cookie 的名称。

- `value`: Cookie 的值。

- `maxAge`: Cookie 的最长生命周期（以秒为单位）。如果设置为 0，Cookie 会立即被删除。如果设置为负值，则为会话 Cookie，浏览器关闭时删除。

- `path`: Cookie 有效的 URL 路径，默认为 "/"，表示对整个网站有效。

- `domain`: Cookie 有效的域名，生产环境下设置为上线域名，本地就用 localhost。

- `secure`: 如果为 true，则 Cookie 只在 HTTPS 连接中发送。

- `httpOnly`: 如果为 true，则 Cookie 不能通过客户端的 JavaScript 进行访问，有助于防止跨站脚本（XSS）攻击，建议什么情况下都为 true。

到这里，Cookie 就介绍完了，更多的都是实际场景了，比如会话管理、个性化等操作了。

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/pages-other/mystore/03-gin/main.go)。