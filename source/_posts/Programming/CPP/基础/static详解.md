---
title: C++之static详解
tags:
  - cpp
categories:
  - cpp
cover: 'https://img.ansore.top/2022/05/04/62726e24621a5.jpg'
abbrlink: 34ffe6e9
date: 2021-03-31 15:50:31
---

# static详解

使用static关键字：

**静态变量：** 函数中的变量，类中的变量

**静态类的成员：** 类对象和类中的函数

# 静态变量

- 函数中的静态变量

当变量声明为static时，空间将在程序的生命周期内分配。即使多次调用该函数，静态变量的空间也只分配一次，前一次调用中的变量值通过下一次函数调用传递。

```cpp
#include <iostream>
#include <string>

using namespace std;

void demp() {
  // static variable
  static int count = 0;

  cout << count << " ";

  // value is update and will be carried to next function calls
  count++;
}

int main() {
  for (int i = 0; i < 5; i++) {
    demp();
  }
  return 0;
}
```

输出：

```
0 1 2 3 4
```

值通过函数调用来传递。每次调用函数时，都不会对变量计数进行初始化

- 类中的静态变量

类中的静态变量由对象共享。对于不同对对象，不能由相同静态变量的多个副本。也是这个原因，静态变量不能使用构造函数初始化。

```cpp
#include <iostream>

using namespace std;

class Apple {
public:
  static int i;

  Apple(){};
};

int main() {
  Apple obj1;
  Apple obj2;

  obj1.i = 2;
  obj2.i = 3;

  // print value of i
  cout << obj1.i << " " << obj2.i << endl;
}
```

编译报错。因此，类中的静态变量应由用户使用嘞外的类名和范围解析运算符显式初始化：

```cpp
#include <iostream>

using namespace std;

class Apple {
public:
  static int i;

  Apple() {}
};

int Apple::i = 1;

int main() {
  Apple obj;

  cout << obj.i << endl;
```

输出：

```
1
```

# 静态成员

- 类对象为静态

就像变量一样，对象也在声明为static时具有范围，直到程序的生命周期。

考虑以下程序，其中对象时非静态的。

```cpp
#include <iostream>

using namespace std;

class Apple {
  int i;

public:
  Apple() {
    i = 0;
    cout << "Inside Constructor\n";
  }
  ~Apple() { cout << "Inside Destructor\n"; }
};

int main() {
  int x = 0;
  if (x == 0) {
    Apple obj;
  }
  cout << "End of main\n";
}
```

输出：

```
Inside Constructor
Inside Destructor
End of main
```

以上程序中，对象在if块内声明为非静态。所以，变量范围仅在if块内。因此，当创建对象时，将调用构造函数，并且在if块的控制权越过析构函数的同时调用，因为对象的范围仅在声明它的if块内。

如果我们将对象声明为静态，现在让我们看看输出的变化。

```cpp
#include <iostream>

using namespace std;

class Apple {
  int i;

public:
  Apple() {
    i = 0;
    cout << "Inside Constructor\n";
  }
  ~Apple() { cout << "Inside Destructor\n"; }
};

int main() {
  int x = 0;
  if (x == 0) {
    static Apple obj;
  }
  cout << "End of main\n";
}
```

输出：

```
Inside Constructor
End of main
Inside Destructor
```

现在，在main结束后调用析构函数。这是因为静态对象的范围是贯穿程序的生命周期。

- 类中的静态函数

就像类中的静态数据成员或静态变量一样，静态成员函数也不依赖于类的对象。我们被允许使用对象和'.'来调用静态成员函数。但建议使用类名和范围解析运算符调用静态成员。

允许静态成员函数仅访问静态数据成员或其他静态成员函数，它们无法访问类的非静态数据成员或成员函数。

```cpp
#include <iostream>

using namespace std;

class Apple {
public:
  // static member function
  static void printMsg() { cout << "Welcome to Apple!"; }
};

int main() { Apple::printMsg(); }
```

输出：

```cpp
Welcome to Apple!
```
