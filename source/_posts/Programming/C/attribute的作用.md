---
title: C之attribute的作用
tags:
  - c
categories:
  - c
cover: 'https://img.ansore.top/2022/05/04/627266bb421cf.jpg'
abbrlink: 1d6a3c99
date: 2021-10-02 14:20:31
---

# __attribute__的作用

`attribute`：属性，主要是用来在`函数`或`数据声明`中设置其属性，与编译器相关

GNU C 的一大特色就是`__attribute__`机制。`__attribute__`可以设置`函数属性（Function Attribute）`、`变量属性（Variable Attribute）`和`类型属性（Type Attribute）`。

语法格式为：

```c
__attribute__ ((attribute-list))
```

- 数据声明：
    
    `__attribute__ ((packed))`: 的作用就是告诉编译器取消结构在编译过程中的优化对齐，按照实际占用字节数进行对齐，是 GCC 特有的语法。
    
    `__attribute__((aligned(n)))`: 内存对齐，指定内存对齐 n 字节
    
- 函数声明：
    
    `__attribute__((noreturn))`: 的作用告诉编译器这个函数不会返回给调用者，以便编译器在优化时去掉不必要的函数返回代码。
    
    `__attribute__((weak))`: 虚函数，弱符号
    

**packed**

该属性可以使得变量或者结构体成员使用最小的对齐方式，即对变量是一字节对齐，对域（field）是位对齐。

```c
struct sc1 {
    char a;
    char *b;
};
printf("sc1: sizeof-char*  = %ld\n", sizeof(struct sc1));

struct __attribute__ ((__packed__)) sc3 {
    char a;
    char *b;
};
printf("sc3: packed sizeof-char*  = %ld\n", sizeof(struct sc3));
```

```c
sc1: sizeof-char*  = 16
sc3: packed sizeof-char*  = 9
```

**aligned(n)**

```c
struct __attribute__ ((aligned(4))) sc5 {
    char a;
    char *b;
};
struct __attribute__ ((aligned(4))) sc6 {
    char a;
    char b[];
};
printf("sc5: aligned 4 sizeof-char*  = %ld\n", sizeof(struct sc5));
printf("sc6: aligned 4 sizeof-char[] = %ld\n", sizeof(struct sc6));

struct __attribute__ ((aligned(2))) sc7 {
    char a;
    char *b;
};
struct __attribute__ ((aligned(2))) sc8 {
    char a;
    char b[];
};
printf("sc7: aligned 2 sizeof-char*  = %ld\n", sizeof(struct sc7));
printf("sc8: aligned 2 sizeof-char[] = %ld\n", sizeof(struct sc8));
```

运行结果：

```c
sc5: aligned 4 sizeof-char*  = 16
sc6: aligned 4 sizeof-char[] = 4
sc7: aligned 2 sizeof-char*  = 16
sc8: aligned 2 sizeof-char[] = 2
```

**noreturn**

函数不会返回。

```c
extern void exit(int)   __attribute__((noreturn));
extern void abort(void) __attribute__((noreturn));
```

**weak**

func 转成`弱符号类型`

- 如果遇到`强符号类型`（即外部模块定义了 func, `extern int func(void);`），那么我们在本模块执行的 func 将会是外部模块定义的 func。
- 如果外部模块没有定义，那么将会调用这个弱符号，也就是在本地定义的 func，直接返回了一个 1（返回值视具体情况而定）相当于增加了一个`默认函数`。

```c
int  __attribute__((weak))  func(...)
{
    ...
    return 0;
}
```

**原理**：`链接器`发现同时存在`弱符号`和`强符号`，就先选择强符号，如果发现不存在强符号，只存在弱符号，则选择弱符号。如果都不存在：静态链接，恭喜，编译时报错，动态链接：对不起，系统无法启动。

weak 属性只会在静态库 (.o .a) 中生效，动态库 (.so) 中不会生效。

**内存地址对齐**

```c
#define _ALIGH(x, align) (((x) + (align - 1)) & (~(align - 1)))

d_p = (d_t *)_ALIGH((unsigned int)d , 64); //将地址d按64bit进行对其后赋值给d_p指针
```
