---
title: MIT6.S081 XV6 lab3 page tables
tags:
  - XV6
  - 操作系统
categories:
  - 操作系统
cover: https://img.ansore.top/2022/04/26/6268057a7560c.jpg
abbrlink: 800f9d20
date: 2022-04-11 22:34:32
---

# Speed up system calls

> When each process is created, map one read-only page at USYSCALL (a VA defined in `memlayout.h`). At the start of this page, store a `struct usyscall` (also defined in `memlayout.h`), and initialize it to store the PID of the current process. For this lab, `ugetpid()` has been provided on the userspace side and will automatically use the USYSCALL mapping. You will receive full credit for this part of the lab if the `ugetpid` test case passes when running `pgtbltest`.

> Some hints:
>
> - You can perform the mapping in `proc_pagetable()` in `kernel/proc.c`.
> - Choose permission bits that allow userspace to only read the page.
> - You may find that `mappages()` is a useful utility.
> - Don't forget to allocate and initialize the page in `allocproc()`.
> - Make sure to free the page in `freeproc()`.

加速系统调用，在内核和用户之间建立一个共享的只读页，这样内核往这个页写入数据的时候，用户程序就可以不经过复杂的系统调用，直接读取。

实验要求我们映射一个只读页`USYSCALL`，用户程序可以直接调用它。用户态调用`ugetpid()`如下：

```c
#ifdef LAB_PGTBL
int
ugetpid(void)
{
  struct usyscall *u = (struct usyscall *)USYSCALL;
  return u->pid;
}
#endif
```

读取时直接从`USYSCALL`这个地址里读取数据。`TRAMPOLINE`意为蹦床，用来进行trap to the kernel操作的。下面的`TRAPFRAME`保存了一些进程的参数。`USYSCALL`是紧挨着`trapframe`下端的一页。

```c
// map the trampoline page to the highest address,
// in both user and kernel space.
#define TRAMPOLINE (MAXVA - PGSIZE)

// map kernel stacks beneath the trampoline,
// each surrounded by invalid guard pages.
#define KSTACK(p) (TRAMPOLINE - (p)*2*PGSIZE - 3*PGSIZE)

// User memory layout.
// Address zero first:
//   text
//   original data and bss
//   fixed-size stack
//   expandable heap
//   ...
//   USYSCALL (shared with kernel)
//   TRAPFRAME (p->trapframe, used by the trampoline)
//   TRAMPOLINE (the same page as in the kernel)
#define TRAPFRAME (TRAMPOLINE - PGSIZE)
#ifdef LAB_PGTBL
#define USYSCALL (TRAPFRAME - PGSIZE)

struct usyscall {
  int pid;  // Process ID
};
#endif
```

内存分布如下所示：

![Screenshot_20220411_224716](https://img.ansore.top/2022/05/01/626e29afe20ba.png)

`proc_pagetable`里面设置映射：

```c
  // map the trampoline code (for system call return)
  // at the highest user virtual address.
  // only the supervisor uses it, on the way
  // to/from user space, so not PTE_U.
  if(mappages(pagetable, TRAMPOLINE, PGSIZE,
              (uint64)trampoline, PTE_R | PTE_X) < 0){
    uvmfree(pagetable, 0);
    return 0;
  }

  // map the trapframe just below TRAMPOLINE, for trampoline.S.
  if(mappages(pagetable, TRAPFRAME, PGSIZE,
              (uint64)(p->trapframe), PTE_R | PTE_W) < 0){
    uvmunmap(pagetable, TRAMPOLINE, 1, 0);
    uvmfree(pagetable, 0);
    return 0;
  }
```

xv6先给`TRAPFRAME`分配一块内存，再白`TRAPFRAME`映射到这块内存上。`allocproc()`中，首先会搜索进程表，搜索到UNUSED进程就为其分配内存，然后给进程表p赋值：

```c
  p->pid = allocpid();
  p->state = USED;

  // Allocate a trapframe page.
  if((p->trapframe = (struct trapframe *)kalloc()) == 0){
    freeproc(p);
    release(&p->lock);
    return 0;
  }
```

具体思路如下：

1. 进程表中添加usyscall的成员变量

```c
// Per-process state
struct proc {
  ...
  struct trapframe *trapframe; // data page for trampoline.S
  struct usyscall *usyscall;   // usyscall
  ...
};
```

2. 为usyscall分配一页内存，并把进程的pid保存到页表中。

```c
  // allocate a usyscall page
  if((p->usyscall = (struct usyscall *)kalloc()) == 0){
    freeproc(p);
    release(&p->lock);
    return 0;
  }
  p->usyscall->pid = p->pid;
```

3. 添加映射。如果映射失败，需要释放`TRAMPOLINE`和`TRAPFRAME`的映射

```c
  // map the usyscall just below TRAMPOLINE, for trampoline.S.
  if(mappages(pagetable, USYSCALL, PGSIZE,
              (uint64)(p->usyscall), PTE_R | PTE_U) < 0){
    uvmunmap(pagetable, TRAMPOLINE, 1, 0);
    uvmunmap(pagetable, TRAPFRAME, 1, 0);
    uvmfree(pagetable, 0);
    return 0;
  }
```

4. `freeproc`的时候需释放`usyscall`页

```c
  if(p->usyscall)
    kfree((void*)p->usyscall);
```

5. `proc_freepagetable`取消映射页表的时候，添加USYSCALL的映射关系

```c
// Free a process's page table, and free the
// physical memory it refers to.
void
proc_freepagetable(pagetable_t pagetable, uint64 sz)
{
  uvmunmap(pagetable, TRAMPOLINE, 1, 0);
  uvmunmap(pagetable, TRAPFRAME, 1, 0);
  uvmunmap(pagetable, USYSCALL, 1, 0);
  uvmfree(pagetable, sz);
}
```

# Print a page table

> Define a function called `vmprint()`. It should take a `pagetable_t` argument, and print that pagetable in the format described below. Insert `if(p->pid==1) vmprint(p->pagetable)` in exec.c just before the `return argc`, to print the first process's page table. You receive full credit for this part of the lab if you pass the `pte printout` test of `make grade`.

> Now when you start xv6 it should print output like this, describing the page table of the first process at the point when it has just finished `exec()`ing `init`:
>
> ```
> page table 0x0000000087f6e000
>  ..0: pte 0x0000000021fda801 pa 0x0000000087f6a000
>  .. ..0: pte 0x0000000021fda401 pa 0x0000000087f69000
>  .. .. ..0: pte 0x0000000021fdac1f pa 0x0000000087f6b000
>  .. .. ..1: pte 0x0000000021fda00f pa 0x0000000087f68000
>  .. .. ..2: pte 0x0000000021fd9c1f pa 0x0000000087f67000
>  ..255: pte 0x0000000021fdb401 pa 0x0000000087f6d000
>  .. ..511: pte 0x0000000021fdb001 pa 0x0000000087f6c000
>  .. .. ..509: pte 0x0000000021fdd813 pa 0x0000000087f76000
>  .. .. ..510: pte 0x0000000021fddc07 pa 0x0000000087f77000
>  .. .. ..511: pte 0x0000000020001c0b pa 0x0000000080007000
>   
> ```
>
> The first line displays the argument to `vmprint`. After that there is a line for each PTE, including PTEs that refer to page-table pages deeper in the tree. Each PTE line is indented by a number of `" .."` that indicates its depth in the tree. Each PTE line shows the PTE index in its page-table page, the pte bits, and the physical address extracted from the PTE. Don't print PTEs that are not valid. In the above example, the top-level page-table page has mappings for entries 0 and 255. The next level down for entry 0 has only index 0 mapped, and the bottom-level for that index 0 has entries 0, 1, and 2 mapped.
>
> Your code might emit different physical addresses than those shown above. The number of entries and the virtual addresses should be the same.

> - You can put `vmprint()` in `kernel/vm.c`.
> - Use the macros at the end of the file kernel/riscv.h.
> - The function `freewalk` may be inspirational.
> - Define the prototype for `vmprint` in kernel/defs.h so that you can call it from exec.c.
> - Use `%p` in your printf calls to print out full 64-bit hex PTEs and addresses as shown in the example.

xv6使用的是三级页表，如果页表项的PTE_V这一位是1，则该页表项是有效的，可以根据次页表项内的地址访问下一集页表。采用DFS遍历即可。

实现如下：

```c
void vmprint(pagetable_t pagetable, int depth)
{
  if (depth > 2) return;
  if (depth == 0) {
    printf("page table %p\n", pagetable);
  }
  // there are 2^9 = 512 PTEs in a page table.
  for(int i = 0; i < 512; i++){
    pte_t pte = pagetable[i];
    if(pte & PTE_V){
      // this PTE points to a lower-level page table.
      if (depth == 0) {
        printf("..");
      } else if (depth == 1) {
        printf(".. ..");
      } else if (depth == 2) {
        printf(".. .. ..");
      }
      uint64 child = PTE2PA(pte);
      printf("%d: pte %p pa %p\n", i, pte, child);
      vmprint((pagetable_t)child, depth + 1);
    }
  }
}
```

# Detecting which pages have been accessed

> Your job is to implement `pgaccess()`, a system call that reports which pages have been accessed. The system call takes three arguments. First, it takes the starting virtual address of the first user page to check. Second, it takes the number of pages to check. Finally, it takes a user address to a buffer to store the results into a bitmask (a datastructure that uses one bit per page and where the first page corresponds to the least significant bit). You will receive full credit for this part of the lab if the `pgaccess` test case passes when running `pgtbltest`.

> Some hints:
>
> - Start by implementing `sys_pgaccess()` in `kernel/sysproc.c`.
> - You'll need to parse arguments using `argaddr()` and `argint()`.
> - For the output bitmask, it's easier to store a temporary buffer in the kernel and copy it to the user (via `copyout()`) after filling it with the right bits.
> - It's okay to set an upper limit on the number of pages that can be scanned.
> - `walk()` in `kernel/vm.c` is very useful for finding the right PTEs.
> - You'll need to define `PTE_A`, the access bit, in `kernel/riscv.h`. Consult the RISC-V manual to determine its value.
> - Be sure to clear `PTE_A` after checking if it is set. Otherwise, it won't be possible to determine if the page was accessed since the last time `pgaccess()` was called (i.e., the bit will be set forever).
> - `vmprint()` may come in handy to debug page tables.

实验要求：从一个用户页表地址开始，搜索所有被访问过的页并返回一个bitmap来显示这些页是否被访问过。第一个参数传入页表的地址，第二个参数传入需要查询的页表数，第三个是返回的结果变量的用户空间地址。

参考：`walk(pagetable_t pagetable, uint64 va, int alloc)`函数传入页表和虚拟地址，返回PTE在页表中的地址，如果alloc不等于 0，则创建任何需要的页。

在`sysproc.c`中完善`sys_pgaccess()`：

```c
#ifdef LAB_PGTBL
int
sys_pgaccess(void)
{
  // lab pgtbl: your code here.
  struct proc *p = myproc();
  uint64 va; // check page begin addr
  int num; // check page num
  uint64 ua; // return user addr

  if (argaddr(0, &va) < 0) {
    return -1;
  }
  if (argint(1, &num) < 0) {
    return -1;
  }
  if (argaddr(2, &ua) < 0) {
    return -1;
  }
  if (num > 64 || num < 0) {
    return -1;
  }
  uint64 bitmask = 0x0;
  for (int i = 0; i < num; i ++) {
    bitmask = bitmask | (vm_pgaccess(p->pagetable, va + i*PGSIZE) << i);
  }

  if (copyout(p->pagetable, ua, (char*) &bitmask, sizeof(bitmask)) < 0) {
    return -1;
  }
  return 0;
}
#endif
```

在`vm.c`中添加函数：

```c
uint
vm_pgaccess(pagetable_t pagetable, uint64 va)
{
  pte_t *pte = walk(pagetable, va, 0);
  if (pte == 0) return 0;
  if ((*pte) & PTE_A) {
    *pte ^= PTE_A;
    return 1;
  }
  return 0;
}
```

