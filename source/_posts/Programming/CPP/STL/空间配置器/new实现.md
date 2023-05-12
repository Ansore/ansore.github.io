---
title: C++之new实现
tags:
  - template
  - stl
  - cpp
categories:
  - cpp
cover: 'https://img.ansore.de/2022/05/04/62726e24621a5.jpg'
abbrlink: 98a6c896
date: 2021-04-04 08:16:31
---

# new实现

# new operator用法

其实new operator我们经常在使用, 就是我们直接向堆申请一块内存大小, 然后对该内存进行构造和析构.

```cpp
template <class T> class point {
  T x;
  T y;
};
point<int> *p = new point<int>[3];
```

这就是new operator的用法. 其实在使用它的时候, 它会做两步事情.

1. 向堆申请一块大小的内存.
2. 对其有构造函数的执行构造函数

其实剩下的两种用法就是将 new operator 的两个功能分开做.

# operator new用法

`operator new`申请一块空间, 但是申请完了就什么都不做. 这感觉就很像`malloc`函数啊. 对, 没错. 其实`operator new`就是间接性的调用了 `malloc`函数. 我们直接来看源码部分

```cpp
void *__CRTDECL operator new(size_t const size) {
  for (;;) {
    if (void *const block = malloc(size)) {
      return block;
    }

    if (_callnewh(size) == 0) {
      if (size == SIZE_MAX) {
        __scrt_throw_std_bad_array_new_length();
      } else {
        __scrt_throw_std_bad_alloc();
      }
    }
  }
}
```

很清楚的可以看出来5行的确是直接的调用了malloc函数, 然后除了申请的大小判断就没有了, 那为什么我们不直接用malloc函数而要用operator new??? 主要是new的封装, 可重载吧, 毕竟我们常说**new不是函数, 而是操作符也是有原因的**. 接下来就是最后一个了.

# placement new用法

`placement new`是在已经申请的内存上构建对象. 这就是我们调用new的时候会调用对象的构造函数的原因. 有一点, 刚说了可以在已经申请的内存上构建对象, 难不成不只是堆, 连栈上也能构建对象.

这也是我们内存池经常用的方法, 使用`placement new`在已经申请的内存上构建对象

它的用法就很灵活了

```cpp
int buff[10];
int *p = new(buff) int(0);
```

这样我们就在已分配空间的buff中重新构建对象了, 传入的buff代表的是地址, 后面括号代表的初始化的值. 这个例子也证实了我们可以在栈中分配对象, 因为buff就在栈中. 而buff[0]与p都指向的同一块地址.

**我们用buff地址开始申请的对象, 就尽量不要用buff了, 因为buff的数据被重新的修改了, 使用buff可能就会出现奇怪的数据**

![new](https://img.ansore.de/2022/05/04/6272719d4fce7.png)

![new](new%E5%AE%9E%E7%8E%B0%202f66fa759e2840af87a98909d7813fa5/Untitled%201.png)

同时, buff的长度要足够装下对象的大小, 否则就会出现数据覆盖的危险.

**new操作符的实现是两步就可概括为先申请了空间, 再调用构造函数.**

# new的重载实现

```cpp
#include <iostream>
template <class T> class point {
public:
  point(T i) : i(i) { std::cout << "point constructor" << std::endl; }
  void *operator new(std::size_t size, void *p, const std::string &str) {
    std::cout << "operator new" << std::endl;
    if (!p) {
      std::cout << "new" << std::endl;
      return ::operator new(size);
    }
    return p;
  }

private:
  T i;
};

int main() {
  char buf[sizeof(point<int>)];
  point<int> *pc = new (buf, "first new") point<int>(1);
  return 0;
}
```

同样的, `delete`的实现也是跟`new`有很多相似的, `delete`事先调用析构函数, 然后再调用`free`函数释放内存, 同样是可以将析构和释放内存分开调用, 也可以进行重载, 这里就不细讲了. 至于为什么`new`的对象一定要用`delete`来释放也容易想明白, 因为`delete`会默认调用其析构函数, 而`free`仅仅只是释放空间而没有调用析构. 如果是普通变量用`new`或`malloc`申请内存都是可以用`delete`释放, 毕竟没有析构的就默认什么也不做然后释放内存.
