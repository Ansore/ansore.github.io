---
title: bochs调试汇编程序
tags:
  - 操作系统
categories:
  - 操作系统
cover: 'https://img.ansore.top/2022/04/27/62692c1359d83.jpg'
abbrlink: de410ea2
date: 2022-01-04 20:23:19
---


# bochs调试汇编程序

Bochs是做系统开发常用的虚拟机，调试系统内核很方便。

Linux下调试，安装`bochs-sdl`

```bash
$ nasm -f bin -o main.img main.asm
```

It is possible to avoid the creation of the .bochsrc file by using the following command line:

```bash
$ bochs \
    -qf /dev/null \
    'ata0-master: type=disk, path="main.img", mode=flat, cylinders=1, heads=1, spt=1' \
    'boot: disk' \
    'display_library: sdl' \
    'megs: 128'
```

The `qf /dev/null` part is ugly, but it is the only way I've managed to automatically skip the menu screen:

- `q` or `n` always ask for it, and I have to hit `6` for it to run afterwards
- `qn <(echo ...)` also worked, but uses a Bash extension which would fail on my Makefile

**查看寄存器**

汇编代码中，调试最常用的功能就是查看寄存器的内容。

- `r` 查看通用寄存器
- `sreg` 查看段寄存器
- `creg` 查看控制寄存器
- `dreg` 查看调试寄存器
- `info cpu` 查看所有寄存器

**查找和定位代码**

次常用的肯定是控制代码执行流程，代码执行到想要仔细跟踪的那个部分。

- `b 内存地址` 设置断点。如`b 0x7c00`，在线性地址0x7c00处设置断点。
- `info break` 查看设置过的断点
- `c` 继续执行代码。一般设置断点后，想让代码恢复执行，就使用这个命令。
- `s` 单步执行。单步执行一行代码，和高级语言调试器的step into按钮类似，遇到函数调用会跳转到函数内部执行。单步执行命令也可以带参数，指定执行的次数，如 `s 100` 就是单步执行100次。
- `n` 执行下一行。它和单步执行类似，单步执行遇到循环和函数时会跳转到内部，而n命令会执行完循环和函数，类似于step over，这样在遇到大量的循环或者较长的函数时，可以用n命令来执行到下一行。n命令能跳转到下一行是因为loop或者call执行有明显的结束标记（前者通过cx寄存器，后者通ret指令），如果遇到用jmp语句写的循环这种情况，没有明显结束标记的，可以用下面的u命令反汇编代码的地址，找到循环的下一行指令的地址，然后给该地址加一个断点就能达到同样的效果。
- `u` 反汇编代码。直接使用u命令会反汇编当前执行的指令，它可以加参数， `u /反汇编数量 起始地址` ，如 `u /20 0x7c00` 就是从0x7c00处开始，反汇编20条指令，如果没有起始地址就是从当前地址开始。它还可以反汇编一个范围的代码，`u 起始地址 结束地址` ，如`u 0x7c00 0x7cff` 就是反汇编0x7c00到0x7cff的代码。

**查看内存**

- `x /nuf 地址` 查看线性地址处的内存内容。
- `xp /nuf 地址` 查看物理地址处的内存内容。

```
n 指定要显示的内存单元的数量
u 显示的内存单元的大小，如下参数之一
	b 单个字节
	h 半个字(2 字节)
	w 一个字(4 字节)
f 打印的格式。如下类型之一：
	x 按照十六进制形式打印
	d 按照十进制形式打印
	u 以无符号的10进制打印
	o 按照八进制形式打印
	t 按照二进制行是打印
```

Bochs还有一个比较有用的设计就是，当你输入指令后，直接按回车键（Enter Key）会重复上一次的命令。比如上一个命令是单步执行`s`，此时直接按回车键就相当于`s`的功能。

# **调试指令手册**

**执行控制**

[Untitled](bochs%E8%B0%83%E8%AF%95%E6%B1%87%E7%BC%96%E7%A8%8B%E5%BA%8F%208a0a25b93d564398801c033054c0e17a/Untitled%20Database%20ccd7cc0e0289407489c18511dad37932.csv)

**断点操作**

[Untitled](bochs%E8%B0%83%E8%AF%95%E6%B1%87%E7%BC%96%E7%A8%8B%E5%BA%8F%208a0a25b93d564398801c033054c0e17a/Untitled%20Database%202f1f9f2617ea4eeea781225b55b3320c.csv)

① ② ③ ④ 的命令都可以设置条件，即都可以变成条件断点。具体做法是在命令之后添加`if condition` ，如`vbreak 0x008:0x001 if "条件表达式"`

**内存观察点**

内存观察点类似于内存的监听器，当指定地址的内存产生读取或者写入事件时，会产生中断。

[Untitled](bochs%E8%B0%83%E8%AF%95%E6%B1%87%E7%BC%96%E7%A8%8B%E5%BA%8F%208a0a25b93d564398801c033054c0e17a/Untitled%20Database%20bf5ddaae7e7a46e2ae6f9d3a12e00998.csv)

**内存操作**

[Untitled](bochs%E8%B0%83%E8%AF%95%E6%B1%87%E7%BC%96%E7%A8%8B%E5%BA%8F%208a0a25b93d564398801c033054c0e17a/Untitled%20Database%20bac0185a6944474bbe5a8469f31c4572.csv)

**查看信息**

[Untitled](bochs%E8%B0%83%E8%AF%95%E6%B1%87%E7%BC%96%E7%A8%8B%E5%BA%8F%208a0a25b93d564398801c033054c0e17a/Untitled%20Database%2040a1c01876d645e9b4844bee67d63adc.csv)

**寄存器操作**

[Untitled](bochs%E8%B0%83%E8%AF%95%E6%B1%87%E7%BC%96%E7%A8%8B%E5%BA%8F%208a0a25b93d564398801c033054c0e17a/Untitled%20Database%20d66f99bdd64c4365b377d1323400817e.csv)

只能修改通用寄存器和指令寄存器。不能够修改标志寄存器，段寄存器，浮点寄存器和SIMD寄存器。

**反汇编**

[Untitled](bochs%E8%B0%83%E8%AF%95%E6%B1%87%E7%BC%96%E7%A8%8B%E5%BA%8F%208a0a25b93d564398801c033054c0e17a/Untitled%20Database%20505a33364f3e4011bc0ff1cb14fe6191.csv)

**指令跟踪**

[Untitled](bochs%E8%B0%83%E8%AF%95%E6%B1%87%E7%BC%96%E7%A8%8B%E5%BA%8F%208a0a25b93d564398801c033054c0e17a/Untitled%20Database%2070c530162d1b42bbadd3f65cd44e3790.csv)

**指令编程环境**

Bochs的instrument功能，提供了运行时的各种钩子函数。它也是可选功能，在编译安装时需要开启`-enable-instrumentation`选项指定。

./configure [...] --enable-instrumentation

./configure [...] --enable-instrumentation="instrument/stubs"

自定义的代码要创建一个独立的目录，例如”instrument/myinstrument”，将”instrument/stubs”目录拷贝进去，然后使用如下的指令设定：

`1./configure [...] --enable-instrumentation="instrument/myinstrument"`

指令命令：

instrument [command] 用[command]调用BX_INSTR_DEBUG_CMD指令回调

**show指令**

[Untitled](bochs%E8%B0%83%E8%AF%95%E6%B1%87%E7%BC%96%E7%A8%8B%E5%BA%8F%208a0a25b93d564398801c033054c0e17a/Untitled%20Database%209ccc85fc7953463da1c628a0dae9e0f8.csv)

**其他命令**

[Untitled](bochs%E8%B0%83%E8%AF%95%E6%B1%87%E7%BC%96%E7%A8%8B%E5%BA%8F%208a0a25b93d564398801c033054c0e17a/Untitled%20Database%2065aa0975ebd247439aceaac62cf0dadb.csv)
