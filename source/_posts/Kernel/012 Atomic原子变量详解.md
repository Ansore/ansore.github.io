---
title: Atomic原子变量详解
tags:
  - Kernel
categories:
  - Kernel
cover: 'https://img.ansore.top/2022/04/27/62692c1359d83.jpg'
abbrlink: c6fa5c21
date: 2022-06-13 00:02:56
---

# 原子变量

适用于针对int变量进行同步的场景 

# Atomic使用

```c
atomic_t ac = ATOMIC_INIT(1);

// 将原子变量-1，如果结果为0，返回true，否则返回false
// 原子操作
atomic_dec_and_test(&ac);
// 原子变量+1
// 原子操作
atomic_inc(&ac)
```

# Atomic实现

## atomic_t定义

定义在`include/linux/types.h`中

```c
typedef struct {
	int counter;
} atomic_t;
```

## 初始化

不同体系下实现不同，x86实现如下：

```c

/*
 * Atomic operations that C can't guarantee us.  Useful for
 * resource counting etc..
 */

#define ATOMIC_INIT(i)	{ (i) }
```

## 嵌入式汇编代码语法

```c
asm("汇编语言"
   :输出寄存器
   :输入寄存器
   :会被修改的寄存器)
```

汇编代码：x86或者arm的汇编代码指令

输出寄存器：表示汇编代码执行完成后，哪些寄存器用于存放输出数据。这些寄存器会分别对应一个C语言表达式或者一个内存地址

输入寄存器：表示开始执行汇编代码时，这里指定的一些寄存器用于存放输入值，也分别对应一个C变量或常数值

会被修改的寄存器：也叫clober list，描述了汇编代码对寄存器的修改情况

1. asm是关键字，必选项
2. volatile 是可选的，加了，GCC 就不会优化这句。
3. 汇编指令间必须被双引号括起来;
4. 汇编指令间必须使用";"、"/n"或"/n/t"分开分开;
5. ()内的是可选的，如asm volatile("")是可以的，只是无意义
6. 仅省动其中一项，分号需要加上: 如这个省了输入和输出的，asm volatile ("sync" : : :"memory")
7. Clobber/Modify表示特定的关键字，让汇编做相应的动作

输入和输出及最后的前缀说明:

- “=”: 表示只写,常用于输出参数。
- “+": 表示可读可写
- "m"、"v"和"o":内存操作单元，V:寻址方式不是偏移量类型;  o:寻址方式是偏移量类型
- "r": 寄存器单元
- "i"和"h" ：常数
- "E"和"F"：浮点数
-  "a": 输入变量放入eax
- "p": 合法的内存指针
- "memory": 表示通知有内存变动
- "&": 该输出操作数不能使用和输入操作数相同的寄存器
- "X": 表示任何类型
- "*: 表示如果选用寄存器，则其后的字母被忽略

- #部分行注释，从该字符到其后的逗号之间所有字母被忽略

占位符引用C语言变量，操作数占位符最多10 个，名称如下：%0，%1，...，%9。指令中使用占位符表示的操作数，总被视为long型（4个字节）,在%和序号之间插入一个字母，"b"代表低字节，"h"代表高字节。0% 表示第一个参数, 1%这种数字表示第二个参数，依次类推

## atomic_inc实现

`include/linux/atomic/atomic-instrumented.h`:

```c
static __always_inline void
atomic_inc(atomic_t *v)
{
	instrument_atomic_read_write(v, sizeof(*v));
    // 不同体系下实现不同
	arch_atomic_inc(v);
}
```

采用汇编实现，x86实现如下：

```c
/**
 * arch_atomic_inc - increment atomic variable
 * @v: pointer of type atomic_t
 *
 * Atomically increments @v by 1.
 */
static __always_inline void arch_atomic_inc(atomic_t *v)
{
	asm volatile(LOCK_PREFIX "incl %0"
		     : "+m" (v->counter) :: "memory");
}
#define arch_atomic_inc arch_atomic_inc
```

## atomic_dec实现

```c
static __always_inline void
atomic_dec(atomic_t *v)
{
	instrument_atomic_read_write(v, sizeof(*v));
	arch_atomic_dec(v);
}
```

x86实现如下：

```c
/**
 * arch_atomic_dec - decrement atomic variable
 * @v: pointer of type atomic_t
 *
 * Atomically decrements @v by 1.
 */
static __always_inline void arch_atomic_dec(atomic_t *v)
{
	asm volatile(LOCK_PREFIX "decl %0"
		     : "+m" (v->counter) :: "memory");
}
#define arch_atomic_dec arch_atomic_dec
```

