---
title: C++之template之非类型模板参数
tags:
  - template
  - stl
  - cpp
categories:
  - cpp
cover: 'https://images.ansore.top/i/2022/05/04/62726e24621a5.jpg'
abbrlink: f9d830d4
date: 2021-04-02 13:06:31
---

# template之非类型模板参数

**非类型参数, 可用在模板中自定义为整型类型, 指针或引用, 不能定义为浮点数等其他类型.**

非类型模板参数在编译期间就已经实例化, 所以其模板实参必须是常量表达式

```cpp
template<int N>; 	// N是编译时就确定的常量表达式
template<size_t N, size_t M>;	// N,M是编译时就确定的常量表达式
```

可能就是会觉得没有用, 毕竟使用模板就是要用他的模板参数类型啊, 没有这个那还怎么用. 这里就来先看一个例子.

> 要求: 实现一个函数返回一个数组的真实大小, 如 : int a[100]; ArrSize(a);返回100
> 

讲道理传入函数中a就转换为指针了, 怎么用指针能获取其表示范围? 这里就要用到template的非类型参数

```cpp
#include <iostream>
// 这里的N是编译时期就知道了, 所以可以加上constexpr关键字
template <class T, std::size_t N>
constexpr std::size_t ArrSize(T (&a)[N]) noexcept {
  return N;
}

int main() {
  int a[100];
  std::cout << ArrSize(a) << std::endl;
}
```

函数模板通过传入a后会自动推导出 T 的类型为 int, N 的大小为 100, 函数通过引用, 所以传入的是一个a而不是一个指针

重点在于模板参数N能自动推导传入数组的大小.

同样我们可以将**strcmp**做一个封装, 实现一个字符串比较的模板函数.

```cpp
template<unsigned N, unsigned M>
bool compare(const char (&a)[N], const char (&b)[M])
{
    return strcmp(a, b);
}
```

使用template的非类型参数可以自动帮我们获取参数的大小, 省去手动传入参数大小的麻烦等问题. 记住 : **非类型模板参数在编译期间就已经实例化, 所以其模板实参必须是常量表达式.**
