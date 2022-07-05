---
title: MIT6.S081 XV6 lab1 util
tags:
  - XV6
  - 操作系统
categories:
  - 操作系统
cover: https://img.ansore.top/2022/04/26/6268057a7560c.jpg
abbrlink: d01b0b88
date: 2022-04-05 14:42:04
---

# pingpong

> Write a program that uses UNIX system calls to ''ping-pong'' a byte between two processes over a pair of pipes, one for each direction. The parent should send a byte to the child; the child should print "<pid>: received ping", where <pid> is its process ID, write the byte on the pipe to the parent, and exit; the parent should read the byte from the child, print "<pid>: received pong", and exit. Your solution should be in the file `user/pingpong.c`.

> - Use `pipe` to create a pipe.
> - Use `fork` to create a child.
> - Use `read` to read from the pipe, and `write` to write to the pipe.
> - Use `getpid` to find the process ID of the calling process.
> - Add the program to `UPROGS` in Makefile.
> - User programs on xv6 have a limited set of library functions available to them. You can see the list in `user/user.h`; the source (other than for system calls) is in `user/ulib.c`, `user/printf.c`, and `user/umalloc.c`.

pipe(管道)用于两个进程间的通信，一个进程写，另一个进程读。`pip()`用于创建管道，传入一个数组。然后就两个进程可以通过fd进行通信。`fork()`函数用于创建子进程，从这个函数以下所有的程序都由父进程和fork出来的子进程共同执行。可根据 返回的pid区分父子进程，如果返回的pid>0，则该进程是父进程，如果pid=0，则为fork出来的子进程。

代码如下：

```c
#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"

#define BUFFER_SIZE 16

int main(int argc, char *argv[])
{
    int fd[2];
    char buf[BUFFER_SIZE];

    if (pipe(fd) < 0) {
        exit(1);
    }
    int pid = fork();
    if (pid > 0) {
        write(fd[1], "ping", BUFFER_SIZE);
        wait(0);
        read(fd[0], buf, BUFFER_SIZE);
        printf("%d: received %s\n", pid, buf);
        exit(0);
    } else if (pid == 0) {
        read(fd[0], buf, BUFFER_SIZE);
        printf("%d: received %s\n", pid, buf);
        write(fd[1], "pong", BUFFER_SIZE);
        exit(0);
    } else {
        printf("error\n");
    }
    exit(0);
    return 0;
}
```

# primes

> Write a concurrent version of prime sieve using pipes. This idea is due to Doug McIlroy, inventor of Unix pipes. The picture halfway down [this page](http://swtch.com/~rsc/thread/) and the surrounding text explain how to do it. Your solution should be in the file `user/primes.c`.
>
> Your goal is to use `pipe` and `fork` to set up the pipeline. The first process feeds the numbers 2 through 35 into the pipeline. For each prime number, you will arrange to create one process that reads from its left neighbor over a pipe and writes to its right neighbor over another pipe. Since xv6 has limited number of file descriptors and processes, the first process can stop at 35.

> - Be careful to close file descriptors that a process doesn't need, because otherwise your program will run xv6 out of resources before the first process reaches 35.
> - Once the first process reaches 35, it should wait until the entire pipeline terminates, including all children, grandchildren, &c. Thus the main primes process should only exit after all the output has been printed, and after all the other primes processes have exited.
> - Hint: `read` returns zero when the write-side of a pipe is closed.
> - It's simplest to directly write 32-bit (4-byte) `int`s to the pipes, rather than using formatted ASCII I/O.
> - You should create the processes in the pipeline only as they are needed.
> - Add the program to `UPROGS` in Makefile.

题目大致意思是用pipe和fork函数求2-35之间所有的素数。

求素数方法，第一个进程打印第一个素数，然后删除这个素数以及这个素数的倍数，然后将剩下的数交给下一个进程处理，以此类推。

![img](https://img.ansore.top/2022/05/01/626e29962235d.gif)

代码如下：

```c
#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"

void primes(int read_pipe, int wirte_pipe) {
    int *nums;
    int length = 0;
    int index = 0;
    read(read_pipe, &length, sizeof(int));
    nums = (int*) malloc(sizeof(int) * length);
    read(read_pipe, nums, length * sizeof(int));

    int prime = nums[0];
    printf("prime %d\n", prime);
    for (int i = 1; i < length; i ++) {
        if (nums[i] % prime != 0) {
            nums[index++] = nums[i];
        }
    }

    // if have no nums, exit
    if (index == 0) {
        return;
    }

    int pid = fork();
    if (pid > 0) {
        write(wirte_pipe, &index, sizeof(int));
        write(wirte_pipe, nums, index * sizeof(int));
        free(nums);
        wait(0);
    } else if (pid == 0) {
        primes(read_pipe, wirte_pipe);
    } else {
        printf("error\n");
    }
    exit(0);
}

int main(int argc, char *argv[])
{
    // init data
    int data_length = 34;
    int nums[34] = {0};
    for (int i = 0; i < 34; i ++) {
        nums[i] = i + 2;
    }

    int fd[2];
    if (pipe(fd) < 0) {
        exit(1);
    }

    // create process
    int pid =fork();
    if (pid > 0) {
        // write nums size
        write(fd[1], &data_length, sizeof(int));
        // write num
        write(fd[1], nums, data_length * sizeof(int));
        wait(0);
    } else if (pid == 0) {
        primes(fd[0], fd[1]);
    } else {
        printf("error\n");
    }
    exit(0);
    return 0;
}
```

# find

> Write a simple version of the UNIX find program: find all the files in a directory tree with a specific name. Your solution should be in the file `user/find.c`.

> - Look at user/ls.c to see how to read directories.
> - Use recursion to allow find to descend into sub-directories.
> - Don't recurse into "." and "..".
> - Changes to the file system persist across runs of qemu; to get a clean file system run make clean and then make qemu.
> - You'll need to use C strings. Have a look at K&R (the C book), for example Section 5.5.
> - Note that == does not compare strings like in Python. Use strcmp() instead.
> - Add the program to `UPROGS` in Makefile.

实现一个unix的find程序，查找匹配的文件。

`fmtname`函数区最后一级文件名。如`a/b/c.txt`，则返回值就为`cc.txt`

大体思路为：读取当前路径下的所有文件，如果为文件，则比对文件名；如果为文件夹，则拼接目录，然后继续遍历文件夹。

```c
#include "kernel/types.h"
#include "kernel/stat.h"
#include "kernel/fs.h"
#include "user/user.h"

char* fmtname(char *path)
{
  static char buf[DIRSIZ+1];
  char *p;

  // Find first character after last slash.
  for(p=path+strlen(path); p >= path && *p != '/'; p--)
    ;
  p++;

  // Return blank-padded name.
  if(strlen(p) >= DIRSIZ)
    return p;
  memmove(buf, p, strlen(p));
  memset(buf+strlen(p), '\0', DIRSIZ-strlen(p));
  return buf;
}

// only find file
void find(char *path, char *find_name)
{
    int fd;
    char buf[512] = {'\0'}, *p;
    struct stat st;
    struct dirent de;

    if ((fd = open(path, 0)) < 0){
        fprintf(2, "ls: cannot open %s\n", path);
        exit(1);
    }
    if (fstat(fd, &st) < 0) {
        fprintf(2, "ls: cannot stat %s\n", path);
        close(fd);
        exit(1);
    }

    switch (st.type) {
        case T_FILE:
            if (strcmp(find_name, fmtname(path)) == 0) {
                printf("%s\n", path);
            }
            break;
        case T_DIR:
            if (strlen(path) + DIRSIZ + 2 > sizeof(buf)) {
                printf("path too long!\n");
                break;
            }
            strcpy(buf, path);
            p = buf + strlen(buf);
            if (*p != '/') {
                *p++ = '/';
            }
            while (read(fd, &de, sizeof(de)) == sizeof(de)) {
                if (de.inum == 0 || de.name[0] == '.') {
                    continue;
                }
                memmove(p, de.name, DIRSIZ);
                p[DIRSIZ] = '\0';
                find(buf, find_name);
            }
            break;
    }
    close(fd);
}

int main(int argc, char *argv[])
{

    if (argc < 3) {
        fprintf(2, "command error\n");
        exit(1);
    }
    find(argv[1], argv[2]);
    exit(0);
    return 0;
}
```

# xargs

> Write a simple version of the UNIX xargs program: read lines from the standard input and run a command for each line, supplying the line as arguments to the command. Your solution should be in the file `user/xargs.c`.

> - Use `fork` and `exec` to invoke the command on each line of input. Use `wait` in the parent to wait for the child to complete the command.
> - To read individual lines of input, read a character at a time until a newline ('\n') appears.
> - kernel/param.h declares MAXARG, which may be useful if you need to declare an argv array.
> - Add the program to `UPROGS` in Makefile.
> - Changes to the file system persist across runs of qemu; to get a clean file system run make clean and then make qemu.

通过标准输入流读取管道输入，然后将读取的输入作为xargs后面命令的参数。

如：

```bash
$ echo hello too | xargs echo bye
bye hello too
$
```

**如何读取管道符的输入（标准输入流）**

根据实验指导书**1.2 I/O and File descriptors**：

> Internally, the xv6 kernel uses the file descriptor as an index into a per-process table, so that every process has a private space of file descriptors starting at zero. By convention, a process reads from file descriptor 0 (standard input), writes output to file descriptor 1 (standard output), and writes error messages to file descriptor 2 (standard error). As we will see, the shell exploits the convention to implement I/O redirection and pipelines. The shell ensures that it always has three file descriptors open (user/sh.c:151), which are by default file descriptors for the console.

可知，读取标准输入流，只需读取fd=0的描述符即可；如果我们要标准化输出，则向fd=1的描述符写入即可。

**exec函数**
exec函数共有两个参数，第一个传入执行的命令，第二个传入参数。

大体思路：将xargs的所有参数保存，读取标准输入流，将读取的输入加入到保存的参数中，最后调用exec执行第一个参数，传入所有参数即可。

代码如下：

```c
#include "kernel/types.h"
#include "kernel/stat.h"
#include "kernel/fs.h"
#include "user/user.h"

char* fmtname(char *path)
{
  static char buf[DIRSIZ+1];
  char *p;

  // Find first character after last slash.
  for(p=path+strlen(path); p >= path && *p != '/'; p--)
    ;
  p++;

  // Return blank-padded name.
  if(strlen(p) >= DIRSIZ)
    return p;
  memmove(buf, p, strlen(p));
  memset(buf+strlen(p), '\0', DIRSIZ-strlen(p));
  return buf;
}

// only find file
void find(char *path, char *find_name)
{
    int fd;
    char buf[512] = {'\0'}, *p;
    struct stat st;
    struct dirent de;

    if ((fd = open(path, 0)) < 0){
        fprintf(2, "ls: cannot open %s\n", path);
        exit(1);
    }
    if (fstat(fd, &st) < 0) {
        fprintf(2, "ls: cannot stat %s\n", path);
        close(fd);
        exit(1);
    }

    switch (st.type) {
        case T_FILE:
            if (strcmp(find_name, fmtname(path)) == 0) {
                printf("%s\n", path);
            }
            break;
        case T_DIR:
            if (strlen(path) + DIRSIZ + 2 > sizeof(buf)) {
                printf("path too long!\n");
                break;
            }
            strcpy(buf, path);
            p = buf + strlen(buf);
            if (*p != '/') {
                *p++ = '/';
            }
            while (read(fd, &de, sizeof(de)) == sizeof(de)) {
                if (de.inum == 0 || de.name[0] == '.') {
                    continue;
                }
                memmove(p, de.name, DIRSIZ);
                p[DIRSIZ] = '\0';
                find(buf, find_name);
            }
            break;
    }
    close(fd);
}

int main(int argc, char *argv[])
{

    if (argc < 3) {
        fprintf(2, "command error\n");
        exit(1);
    }
    find(argv[1], argv[2]);
    exit(0);
    return 0;
}
```
