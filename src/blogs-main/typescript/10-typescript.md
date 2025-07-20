---
title: 10 Class

article: true
order: 10
star: false

category:
  - 语言

tag:
  - typescript

date: 2025-06-06

description: 类的定义、继承、约束等部分，抽象类相关介绍
footer: Always coding, always learning
---

<!-- more -->

## 基本类

### 基本用法、继承和类型约束

类可以通过 `extends` 关键字实现继承，通过 `implements` 关键字实现接口约束，注意extends需要写在implements前面：

```typescript
// 基础类定义
class Animal {
  name: string

  constructor(name: string) {
    this.name = name
  }

  speak(): void {
    console.log(`${this.name} makes a sound`)
  }
}

// 接口约束
interface Flyable {
  fly(): void
}

class Bird extends Animal implements Flyable {
  constructor(name: string) {
    super(name)
  }

  speak(): void {
    console.log(`${this.name} chirps`)
  }

  fly(): void {
    console.log(`${this.name} is flying`)
  }
}

const bird = new Bird('Sparrow')
bird.speak() // Sparrow chirps
bird.fly()   // Sparrow is flying
```

### 访问修饰符

TypeScript 提供了四种访问修饰符：`public`（默认）、`private`、`protected` 和 `readonly`：

```typescript
class Person {
  public name: string        // 公共属性，可以在任何地方访问
  private age: number        // 私有属性，只能在类内部访问
  protected email: string    // 受保护属性，只能在类及其子类中访问
  readonly id: number        // 只读属性，初始化后不能修改

  constructor(name: string, age: number, email: string, id: number) {
    this.name = name
    this.age = age
    this.email = email
    this.id = id
  }

  getAge(): number {
    return this.age // 在类内部可以访问私有属性
  }

  protected getEmail(): string {
    return this.email
  }
}

class Student extends Person {
  grade: string

  constructor(name: string, age: number, email: string, id: number, grade: string) {
    super(name, age, email, id)
    this.grade = grade
  }

  getInfo(): string {
    // return this.age // 错误：无法访问私有属性
    return `${this.name}, ${this.getEmail()}, ${this.grade}` // 可以访问受保护的方法
  }
}

const student = new Student('Alice', 20, 'alice@example.com', 1001, 'A')
console.log(student.name)     // 正确：公共属性
// console.log(student.age)   // 错误：私有属性
// student.id = 1002          // 错误：只读属性
```

### super

`super` 用于调用父类的构造函数和方法，原理是 `父类的prototype.constructor.call`：

```typescript
class Vehicle {
  brand: string

  constructor(brand: string) {
    this.brand = brand
    console.log('Vehicle constructor called')
  }

  start(): void {
    console.log(`${this.brand} vehicle is starting`)
  }
}

class Car extends Vehicle {
  model: string

  constructor(brand: string, model: string) {
    super(brand) // 调用父类构造函数
    this.model = model
    console.log('Car constructor called')
  }

  start(): void {
    super.start() // 调用父类方法
    console.log(`${this.brand} ${this.model} car is ready to drive`)
  }
}

const car = new Car('Toyota', 'Camry')
// 输出：
// Vehicle constructor called
// Car constructor called

car.start()
// 输出：
// Toyota vehicle is starting
// Toyota Camry car is ready to drive
```

### 静态修饰

静态修饰的属性属于类本身，而不是类的实例，使用 `static` 关键字定义：

```typescript
class MathUtils {
  static PI: number = 3.14159

  static add(a: number, b: number): number {
    return a + b
  }

  static multiply(a: number, b: number): number {
    return a * b
  }

  // 静态方法中不能访问非静态属性
  static getCircleArea(radius: number): number {
    return MathUtils.PI * radius * radius
  }
}

// 直接通过类名访问静态成员
console.log(MathUtils.PI)                    // 3.14159
console.log(MathUtils.add(5, 3))             // 8
console.log(MathUtils.getCircleArea(5))      // 78.53975

// 不需要实例化就可以使用
// const math = new MathUtils() // 通常不需要实例化工具类
```

### get，set

使用 `get` 和 `set` 关键字定义属性的访问器，提供对属性访问的控制，这个和c++不太一样，此处类似于一个拦截器的操作：

```typescript
class Temperature {
  private _celsius: number = 0

  // getter
  get celsius(): number {
    return this._celsius
  }

  // setter
  set celsius(value: number) {
    if (value < -273.15) {
      throw new Error('Temperature cannot be below absolute zero')
    }
    this._celsius = value
  }

  // 计算属性
  get fahrenheit(): number {
    return (this._celsius * 9/5) + 32
  }

  set fahrenheit(value: number) {
    this._celsius = (value - 32) * 5/9
  }
}

const temp = new Temperature()
temp.celsius = 25
console.log(temp.celsius)    // 25
console.log(temp.fahrenheit) // 77

temp.fahrenheit = 86
console.log(temp.celsius)    // 30

// temp.celsius = -300 // 抛出错误
```

### 实际应用示例

好了，你已经学完了类，该手搓vue了(笑)，这里我们写一个简单的东西：

```typescript
interface Options {
  el: string | HTMLElement
}

interface VueClass {
  options: Options
  init(): void
}

interface VNode {
  tag: string
  text?: string
  children?: VNode[]
}

class Dom {
  createElement(el: string) {
    return document.createElement(el)
  }

  setText(el: HTMLElement, text: string) {
    el.textContent = text
  }

  render(data: VNode) {
    let root: HTMLElement = this.createElement(data.tag)
    if (data.children && Array.isArray(data.children)) {
      data.children.forEach(item => {
        root.appendChild(this.render(item))
      })
    }
    else {
      this.setText(root, data.text!)
    }
    return root
  }
}

class Vue extends Dom implements VueClass {
  options: Options

  constructor(options: Options) {
    super()
    this.options = options
    this.init()
  }

  init(): void {
    let data: VNode = {
      tag: 'div',
      children: [
        {
          tag: 'h1',
          text: 'Hello, World!'
        },
        {
          tag: 'p',
          text: 'This is a paragraph.'
        }
      ]
    }

    let app: HTMLElement = typeof this.options.el === 'string'
      ? document.querySelector(this.options.el) as HTMLElement
      : this.options.el
    app.appendChild(this.render(data))
  }
}

new Vue({
  el: '#app'
})
```

## 抽象类

抽象类使用 `abstract` 关键字定义，不能被实例化，通常用作基类。抽象方法必须在子类中实现：

```typescript
// 与c++中带有纯虚函数的类一个道理，不过ts有显式的语法
// abstract 修饰类则为抽象类，无法实例化
// abstract 修饰方法则是抽象方法，不能实现，且子类必须实现

abstract class Shape {
  protected name: string

  constructor(name: string) {
    this.name = name
  }

  // 抽象方法，子类必须实现
  abstract getArea(): number
  abstract getPerimeter(): number

  // 具体方法，子类可以使用
  display(): void {
    console.log(`Shape: ${this.name}`)
    console.log(`Area: ${this.getArea()}`)
    console.log(`Perimeter: ${this.getPerimeter()}`)
  }
}

class Rectangle extends Shape {
  private width: number
  private height: number

  constructor(width: number, height: number) {
    super('Rectangle')
    this.width = width
    this.height = height
  }

  getArea(): number {
    return this.width * this.height
  }

  getPerimeter(): number {
    return 2 * (this.width + this.height)
  }
}

class Circle extends Shape {
  private radius: number

  constructor(radius: number) {
    super('Circle')
    this.radius = radius
  }

  getArea(): number {
    return Math.PI * this.radius * this.radius
  }

  getPerimeter(): number {
    return 2 * Math.PI * this.radius
  }
}

// const shape = new Shape('test') // 错误：抽象类不能实例化

const rectangle = new Rectangle(5, 3)
const circle = new Circle(4)

rectangle.display()
// 输出：
// Shape: Rectangle
// Area: 15
// Perimeter: 16

circle.display()
// 输出：
// Shape: Circle
// Area: 50.26548245743669
// Perimeter: 25.132741228718345
```

## 小结

类的重要性不必多言，但是各个语言特色不一样，尽量不要把其他语言所谓的最佳实践非得套在ts里，因需制宜才是最好的，这里简单总结一下：

1. **基本用法**：使用 `extends` 继承，`implements` 实现接口约束
2. **访问修饰符**：`public`、`private`、`protected`、`readonly` 控制访问权限
3. **super 关键字**：调用父类构造函数和方法，实现代码复用
4. **静态成员**：属于类本身的属性和方法，无需实例化即可使用
5. **getter/setter**：提供属性访问控制，实现计算属性和数据验证
6. **抽象类**：使用 `abstract` 定义基类和抽象方法，强制子类实现

本节代码详见[此处](https://github.com/KBchulan/ClBlogs-Src/blob/main/blogs-main/typescript/10-class/index.ts)。
