---
title: C++之sizeof详解
tags:
  - cpp
categories:
  - cpp
cover: 'https://images.ansore.top/i/2022/05/04/62726e24621a5.jpg'
abbrlink: a13f6528
date: 2021-03-31 14:50:31
---

# sizeof 详解

# 类大小计算

- 空类的大小为1字节
- 一个类中，虚函数本身、成员函数（包括静态与非静态）和静态数据成员都是不占用类对象的存储空间。
- 对于包含虚函数的类，不管有多少个虚函数，只有一个虚指针,vptr的大小。
- 普通继承，派生类继承了所有基类的函数与成员，要按照字节对齐来计算大小
- 虚函数继承，不管是单继承还是多继承，都是继承了基类的vptr。(32位操作系统4字节，64位操作系统 8字节)！
- 虚继承,继承基类的vptr。

## 原则1

空类的大小为1字节

```cpp
// 空类的大小为1字节
#include <iostream>

using namespace std;

class A {};

int main() {
  cout << sizeof(A) << endl;
  return 0;
}
```

## 原则2

静态数据成员被编译器放在程序的一个global data members中，它是类的一个数据成员，但不影响类的大小。不管这个类产生了多少个实例，还是派生了多少新的类，静态数据成员只有一个实例。静态数据成员，一旦被声明，就已经存在。

```cpp
#include <iostream>

using namespace std;

class A {
public:
  char b;
  virtual void fun(){};
  static int c;
  static int d;
  static int f;
};

int main() {
	// 16  字节对齐、静态变量不影响类的大小、vptr指针=8
  // |b| ... | virtual void fun |  
  cout << sizeof(A) << endl;
  return 0;
}
```

## 原则3

对于包含虚函数的类，不管有多少个虚函数，只有一个虚指针,vptr的大小。

```cpp
#include <iostream>
using namespace std;
class A {
  virtual void fun();
  virtual void fun1();
  virtual void fun2();
  virtual void fun3();
};
int main() {
  cout << sizeof(A) << endl; // 8
  return 0;
}
```

# 原则4与5

1. 普通单继承,继承就是基类+派生类自身的大小(注意字节对齐)。注意：类的数据成员按其声明顺序加入内存，无访问权限无关，只看声明顺序。
2. 虚单继承，派生类继承基类vptr

```cpp
#include <iostream>

using namespace std;

class A {
public:
  char a;
  int b;
}; // 8

/**
 * @brief 此时B按照顺序：
 * char a
 * int b
 * short a
 * long b
 * 根据字节对齐4+4=8+8+8=24
 */
class B : A {
public:
  short a;
  long b;
};
class C {
  A a;
  char c;
};
class A1 {
  virtual void fun() {}
};
class B1 : public A1 {};
class A2 {
  virtual void funA() {}
};
class B2 {
  virtual void funB() {}
};
class C2 : public A2, public B2 {};

int main() {
  cout << sizeof(A) << endl; // 8
  cout << sizeof(B) << endl; // 24
  cout << sizeof(C) << endl; // 12
  /**
   * @brief 对于虚单函数继承，派生类也继承了基类的vptr，所以是8字节
   */
  cout << sizeof(B1) << endl; // 8
  cout << sizeof(C2) << endl; // 16
  return 0;
}
```

## 原则6

虚继承

```cpp
#include <iostream>

using namespace std;

class A {
  virtual void fun() {}
};

class B {
  virtual void fun2() {}
};

class C : virtual public A, virtual public B {
public:
  virtual void fun3() {}
};

int main() {
  /**
   * @brief 8 8 16  派生类虚继承多个虚函数，会继承所有虚函数的vptr
   */
  cout << sizeof(A) << " " << sizeof(B) << " " << sizeof(C);

  return 0;
}
```
