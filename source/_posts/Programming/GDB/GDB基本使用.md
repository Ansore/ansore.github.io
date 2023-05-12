---
title: GDB基本使用
tags:
  - gdb
categories:
  - gdb
cover: 'https://img.ansore.de/2022/05/04/627267e1dfdc4.jpg'
abbrlink: f0f6c8c9
date: 2021-02-20 09:52:44
---

# gdb

```cpp
#include <stdio.h>

int func(int n) {
  int sum = 0, i;
  for(i = 0; i < n; i++) {
    sum += i;
  }
  return sum;
}

int main(int argc, char *argv[])
{
  int i;
  long result = 0;
  for (i = 0; i <= 100; i ++) {
    result += i;
  }
  printf("result[1-100] = %ld n", result);
  printf("result[1-250] = %d n", func(250));
  return 0;
}
```

编译生成可执行文件：

```bash
cc -g tst.c -o tst
```

gdb：

```bash
$ gdb tst  
GNU gdb (GDB) 10.1
Copyright (C) 2020 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
Type "show copying" and "show warranty" for details.
This GDB was configured as "x86_64-pc-linux-gnu".
Type "show configuration" for configuration details.
For bug reporting instructions, please see:
<https://www.gnu.org/software/gdb/bugs/>.
Find the GDB manual and other documentation resources online at:
    <http://www.gnu.org/software/gdb/documentation/>.

For help, type "help".
Type "apropos word" to search for commands related to "word"...
Reading symbols from tst...
(gdb) l # l命令相当于list,从第一行开始例出原码
1       #include <stdio.h>
2
3       int func(int n) {
4         int sum = 0, i;
5         for(i = 0; i < n; i++) {
6           sum += i;
7         }
8         return sum;
9       }
10
(gdb)  # 直接回车表示,重复上一次命令
11      int main(int argc, char *argv[])
12      {
13        int i;
14        long result = 0;
15        for (i = 0; i <= 100; i ++) {
16          result += i;
17        }
18        printf("result[1-100] = %ld \n", result);
19        printf("result[1-250] = %d \n", func(250));
20        return 0;
(gdb) break 13 # 设置断点,在源程序第13行处
Breakpoint 1 at 0x1176: file tst.c, line 14.
(gdb) break func # 设置断点,在函数func()入口处
Breakpoint 2 at 0x1140: file tst.c, line 4.
(gdb) info break # 查看断点信息
Num     Type           Disp Enb Address            What
1       breakpoint     keep y   0x0000000000001176 in main at tst.c:14
2       breakpoint     keep y   0x0000000000001140 in func at tst.c:4
(gdb) r  # 运行程序,run命令简写
Starting program: /home/ansore/study/gdb/tst 

Breakpoint 1, main (argc=1, argv=0x7fffffffdcd8) at tst.c:14
14        long result = 0;        # 在断点处停住
(gdb) n  # 单条语句执行,next命令简写
15        for (i = 0; i <= 100; i ++) {
(gdb) n
16          result += i;
(gdb) n
15        for (i = 0; i <= 100; i ++) {
(gdb) n
16          result += i;
(gdb) c  # 继续运行程序,continue命令简写
Continuing.
result[1-100] = 5050  #程序输出

Breakpoint 2, func (n=250) at tst.c:4
4         int sum = 0, i;
(gdb) n
5         for(i = 0; i < n; i++) {
(gdb) p i  # 打印变量i的值,print命令简写
$1 = 32767
(gdb) n
6           sum += i;
(gdb) n
5         for(i = 0; i < n; i++) {
(gdb) p sum
$2 = 0
(gdb) n
6           sum += i;
(gdb) p i
$3 = 1
(gdb) n
5         for(i = 0; i < n; i++) {
(gdb) p sum
$4 = 1
(gdb) bt # 查看函数堆栈
#0  func (n=250) at tst.c:5
#1  0x00005555555551bc in main (argc=1, argv=0x7fffffffdcd8) at tst.c:19
(gdb) finish  # 退出函数
Run till exit from #0  func (n=250) at tst.c:5
0x00005555555551bc in main (argc=1, argv=0x7fffffffdcd8) at tst.c:19
19        printf("result[1-250] = %d \n", func(250));
Value returned is $5 = 31125
(gdb) c  # 继续运行
Continuing.
result[1-250] = 31125  # 程序输出
[Inferior 1 (process 12432) exited normally] # 程序退出,调试结束
(gdb) q # 退出gdb
```
