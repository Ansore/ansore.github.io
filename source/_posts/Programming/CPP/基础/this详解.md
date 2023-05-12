---
title: C++之this详解
tags:
  - cpp
categories:
  - cpp
cover: 'https://img.ansore.de/2022/05/04/62726e24621a5.jpg'
abbrlink: 8ff26f14
date: 2021-03-31 16:20:31
---

# this详解

this的用处：

1. 一个对象的this指针并不是对象本身的一部分，不会影响sizeof(对象)的结果。
2. this作用域时在类内部，当在类的非静态成员函数中访问类的非静态成员的时候，编译器会自动将对象本身的地址作为一个隐含传递给函数。也就是说，即使你没有写上this指针，编译器在编译的时候也是加上this的，它作为非静态成员函数的隐含行参，对各成员的访问均可通过this访问。

其次，this指针的使用：

1. 在类的非静态成员函数中返回类对象本身的时候，直接使用return *this。
2. 当参数与成员变量名相同时，如this->n = n （不能写成n = n)。

```cpp
#include <cstring>
#include <iostream>

using namespace std;

class Person {

public:
  typedef enum { BOY = 0, GIRL } SexType;
  Person(char *n, int a, SexType s) {
    name = new char[strlen(n) + 1];
    strcpy(name, n);
    age = a;
    sex = s;
  }

  int get_age() const { return this->age; }

  Person &add_age(int a) {
    age += a;
    return *this;
  }

  ~Person() { delete[] name; }

private:
  char *name;
  int age;
  SexType sex;
};

int main() {
  Person p("zhangsan", 20, Person::BOY);
  cout << p.get_age() << endl;
  cout << p.add_age(10).get_age() << endl;
  return 0;
}
```

this在成员函数的开始执行前构造，在成员的执行结束后清除。

上述的get_age函数会被解析成get_age(const A * const this)，add_age函数会被解析成add_age(A* const this,int a)。在C++中类和结构是只有一个区别的：类的成员默认是private，而结构是public。this是类的指针，如果换成结构，那this就是结构的指针了。
