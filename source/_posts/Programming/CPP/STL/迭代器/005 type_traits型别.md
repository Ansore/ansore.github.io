---
title: C++之type_traits型别
tags:
  - template
  - stl
  - cpp
categories:
  - cpp
cover: 'https://img.ansore.top/2022/05/04/62726e24621a5.jpg'
abbrlink: 68abfc82
date: 2021-04-05 22:16:31
---

# __type_traits型别

`traits`是为了将迭代器没能完善的原生指针, `traits`用特化和偏特化编程来完善. 这一篇准备探讨`__type_traits`, 为了将我们在空间配置器里面的提过的`__true_type`和`false_type`进行解答. 而`type_traits`型别对我们STL的效率又有什么影响, 有什么好处?

# __type_traits介绍

前面介绍的Traits技术在STL中弥补了C++模板的不足，但是Traits技术只是用来规范迭代器，对于迭代器之外的东西没有加以规范。因此，SGI将该技术扩展到迭代器之外，称为`__type_traits`。iterator_traits是萃取迭代器的特性，而__type_traits是萃取型别的特性。萃取的型别如下：

- 是否具备non-trivial default ctor?
- 是否具备non-trivial copy ctor?
- 是否具备non-trivial assignment operator?
- 是否具备non-trivial dtor?
- 是否为POD（plain old data）型别？

其中non-trivial意指非默认的相应函数，编译器会为每个类构造以上四种默认的函数，如果没有定义自己的，就会用编译器默认函数，如果使用默认的函数，我们可以使用memcpy(),memmove(),malloc()等函数来加快速度，提高效率.

且`__iterator_traits`允许针对不同的型别属性在编译期间决定执行哪个重载函数而不是在运行时才处理, 这大大提升了运行效率. 这就需要STL提前做好选择的准备. 是否为**POD, non-trivial型别**用`__true_type`和`__false_type` 来区分.
