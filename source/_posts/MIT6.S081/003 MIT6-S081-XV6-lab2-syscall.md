---
title: MIT6.S081 XV6 lab2 syscall
tags:
  - XV6
  - 操作系统
categories:
  - 操作系统
cover: https://img.ansore.top/2022/04/26/6268057a7560c.jpg
abbrlink: 295fae46
date: 2022-04-05 22:42:04
---

# System call tracing

> In this assignment you will add a system call tracing feature that may help you when debugging later labs. You'll create a new `trace` system call that will control tracing. It should take one argument, an integer "mask", whose bits specify which system calls to trace. For example, to trace the fork system call, a program calls `trace(1 << SYS_fork)`, where `SYS_fork` is a syscall number from `kernel/syscall.h`. You have to modify the xv6 kernel to print out a line when each system call is about to return, if the system call's number is set in the mask. The line should contain the process id, the name of the system call and the return value; you don't need to print the system call arguments. The `trace` system call should enable tracing for the process that calls it and any children that it subsequently forks, but should not affect other processes.

> - Add `$U/_trace` to UPROGS in Makefile
> - Run make qemu and you will see that the compiler cannot compile `user/trace.c`, because the user-space stubs for the system call don't exist yet: add a prototype for the system call to `user/user.h`, a stub to `user/usys.pl`, and a syscall number to `kernel/syscall.h`. The Makefile invokes the perl script `user/usys.pl`, which produces `user/usys.S`, the actual system call stubs, which use the RISC-V `ecall` instruction to transition to the kernel. Once you fix the compilation issues, run trace 32 grep hello README; it will fail because you haven't implemented the system call in the kernel yet.
> - Add a `sys_trace()` function in `kernel/sysproc.c` that implements the new system call by remembering its argument in a new variable in the `proc` structure (see `kernel/proc.h`). The functions to retrieve system call arguments from user space are in `kernel/syscall.c`, and you can see examples of their use in `kernel/sysproc.c`.
> - Modify `fork()` (see `kernel/proc.c`) to copy the trace mask from the parent to the child process.
> - Modify the `syscall()` function in `kernel/syscall.c` to print the trace output. You will need to add an array of syscall names to index into.

我们需要实现一个trace的调用，当用户态调用trace()函数时，传入mask，确定需要trace的系统调用（如fork，read等）。

大体思路时在进程描述中添加mask字段，用于判断该进程是否需要进程trace，然后在执行系统调用时，根据该mask打印调用信息。

**实现**

1. 在用户态的头文件声明调用（`user/user.h`），这样编译 `user/trace.c`才不会报错。

```c
// sys strace
int trace(int);
```

2. 在`user/usys.pl`添加调用入口

```c
entry("trace");
```

3. 在`kernel/syscall.h`中添加`SYS_trace`调用号

```c
#define SYS_trace  22
```

4. 在进程描述的结构体中添加`trace_mask`字段代表该进程的trace状态，该文件位于`kernel/proc.h`。

```c
// Per-process state
struct proc {
    ....
  // for trace
  int trace_mask;
};
```

5. 在`kernel/sysproc.c`中添加`sys_trace`函数。（该文件主要用于实现系统调用）

```c
uint64 sys_trace(void)
{
    int mask;
    // 读取传入的mask
    if(argint(0, &mask) < 0)
        return -1;
    // 获取当前进程，将mask赋值
    struct proc *p = myproc();
    p->trace_mask = mask;

    return 0;
}
```

6. 在`kernel/syscall.c`中注册trace系统调用函数。并且在系统调用中根据mask判断打印的信息。

```c
...
extern uint64 sys_trace(void);

static uint64 (*syscalls[])(void) = {
  ....
[SYS_trace]   sys_trace,
};

char *syscall_names[] = {"fork", "exit", "wait", "pipe", "read", "kill", "exec", "fstat", "chdir", "dup", "getpid", "sbrk", "sleep", "uptime", "open", "write", "mknod", "unlink", "link", "mkdir", "close", "trace"};

void
syscall(void)
{
  int num;
  struct proc *p = myproc();

  num = p->trapframe->a7;
  if(num > 0 && num < NELEM(syscalls) && syscalls[num]) {
    p->trapframe->a0 = syscalls[num]();
    // 根据mask判断是否需要打印
    if ((p->trace_mask >> num) & 1) {
        printf("%d: syscall %s -> %d\n", p->pid, syscall_names[num-1], p->trapframe->a0);
    }
  } else {
    printf("%d %s: unknown sys call %d\n",
            p->pid, p->name, num);
    p->trapframe->a0 = -1;
  }
}
```



# Sysinfo

> In this assignment you will add a system call, `sysinfo`, that collects information about the running system. The system call takes one argument: a pointer to a `struct sysinfo` (see `kernel/sysinfo.h`). The kernel should fill out the fields of this struct: the `freemem` field should be set to the number of bytes of free memory, and the `nproc` field should be set to the number of processes whose `state` is not `UNUSED`. We provide a test program `sysinfotest`; you pass this assignment if it prints "sysinfotest: OK".

> - Add `$U/_sysinfotest` to UPROGS in Makefile
>
> - Run make qemu; `user/sysinfotest.c` will fail to compile. Add the system call sysinfo, following the same steps as in the previous assignment. To declare the prototype for sysinfo() `in user/user.h` you need predeclare the existence of `struct sysinfo`:
>
>   ```
>   struct sysinfo; 
>   int sysinfo(struct sysinfo *);
>   ```
>
>   Once you fix the compilation issues, run **sysinfotest**; it will fail because you haven't implemented the system call in the kernel yet.
>
> - sysinfo needs to copy a `struct sysinfo` back to user space; see `sys_fstat()` (`kernel/sysfile.c`) and `filestat()` (`kernel/file.c`) for examples of how to do that using `copyout()`.
>
> - To collect the amount of free memory, add a function to `kernel/kalloc.c`
>
> - To collect the number of processes, add a function to `kernel/proc.c`

获取系统信息，将查询的信息从内核态拷贝到用户态。

添加系统调用与上面类似，获取系统信息实现：

1. `sys_sysinfo`函数实现（`kernel/sysproc.c`），`copyout`函数实现了从内核态拷贝到用户态，`p->pagetable`为该进程用户态的页表，`addr`为写入的地址：

```c
uint64 sys_sysinfo(void)
{
    struct sysinfo info;
    uint64 addr;
    struct proc *p = myproc();
    if (argaddr(0, &addr) < 0) {
        return -1;
    }
    // 获取进程不为 UNUSED 状态的数量
    info.nproc = get_nproc();
    // 获取空闲的内存数
    info.freemem = get_freemem();

    // 从内核态拷贝到用户态
    if(copyout(p->pagetable, addr, (char*)&info, sizeof(info)) < 0){
        return -1;
    }
    return 0;
}
```

2. 遍历所有进程，统计状态不为UNUSED的进程数量。注意操作进程时，获取和释放锁。

```c
uint64 get_nproc(void)
{
    struct proc *p;
    uint64 cnt = 0;

    for(p = proc; p < &proc[NPROC]; p++) {
        acquire(&p->lock);
        if(p->state != UNUSED) {
            cnt ++;
        }
        release(&p->lock);
    }
    return cnt;
}
```

3. 遍历空闲页表，统计空闲页表数量，然后乘页大小即可

```c
uint64 get_freemem(void)
{
  struct run *r;
  uint64 cnt = 0;

  acquire(&kmem.lock);
  r = kmem.freelist;
  while (r) {
      r = r->next;
      cnt ++;
  }
  release(&kmem.lock);

  return cnt * PGSIZE;
}
```
