---
title: 遍历kernel进程链表
tags:
  - Kernel
categories:
  - Kernel
abbrlink: 93e3e2a6
date: 2022-03-06 19:37:42
---

linux内核中使用`task_struct`结构来描述一个PCB（`linux/kernel/sched.c`）。多个进程则常常使用双链表等来进行组织。比如可运行状态的进程组成可运行队列，等待状态的进程组成等待队列等。

`list.h`的遍历宏：

```c
/**
 * container_of - cast a member of a structure out to the containing structure
 * @ptr:	the pointer to the member.
 * @type:	the type of the container struct this is embedded in.
 * @member:	the name of the member within the struct.
 *
 */
#define container_of(ptr, type, member) ({				\
	void *__mptr = (void *)(ptr);					\
	static_assert(__same_type(*(ptr), ((type *)0)->member) ||	\
		      __same_type(*(ptr), void),			\
		      "pointer type mismatch in container_of()");	\
	((type *)(__mptr - offsetof(type, member))); })

/**
 * list_entry - get the struct for this entry
 * @ptr:	the &struct list_head pointer.
 * @type:	the type of the struct this is embedded in.
 * @member:	the name of the list_head within the struct.
 */
#define list_entry(ptr, type, member) \
	container_of(ptr, type, member)

/**
 * list_last_entry - get the last element from a list
 * @ptr:	the list head to take the element from.
 * @type:	the type of the struct this is embedded in.
 * @member:	the name of the list_head within the struct.
 *
 * Note, that list is expected to be not empty.
 */
#define list_last_entry(ptr, type, member) \
	list_entry((ptr)->prev, type, member)

/**
 * list_for_each_entry	-	iterate over list of given type
 * @pos:	the type * to use as a loop cursor.
 * @head:	the head for your list.
 * @member:	the name of the list_head within the struct.
 */
#define list_for_each_entry(pos, head, member)				\
	for (pos = list_first_entry(head, typeof(*pos), member);	\
	     !list_entry_is_head(pos, head, member);			\
	     pos = list_next_entry(pos, member))
```

`list_head`没有数据，所以它经常被嵌套在其他的结构体中。pos指向包含`list_struct`结构的结构体，head为`list_head`类型的指针，我们可以使用链表中任意一个结点的指针；member即为list_head类型的变量名。

`pos`为指向`task_struct`类型的指针，我们通过遍历宏即得到每个进程对应的`task_struct`类型的指针。我们将`current_head`赋予遍历宏中的第二个参数，current是一个宏，即为系统内正在运行的进程；由于`list_struct`结构在`task_struct`结构中的变量明为`tasks`，因此我们将`tasks`传递给遍历宏的第三个参数。

遍历进程链表实现如下：

```c
#include "linux/printk.h"
#include <linux/init.h>
#include <linux/module.h>
#include <linux/sched.h>
#include <linux/sem.h>
#include <linux/list.h>

static int __init traverse_init(void)
{
  struct task_struct *pos;
  struct list_head *current_head;
  int count = 0;

  printk("traverse module is working...\n");
  current_head = &(current->tasks);
  list_for_each_entry(pos, current_head, tasks)
  {
    count ++;
    printk("[process %d]: %s\'s pid is %d\n", count, pos->comm, pos->pid);
  }
  return 0;
}

static void __exit traverse_exit(void)
{
  printk("traverse process exit!\n");
}

module_init(traverse_init);
module_exit(traverse_exit);
MODULE_LICENSE("GPL");
```

编写Makefile：

```makefile
ifneq ($(KERNELRELEASE),)
obj-m := traverse_process.o
else
PWD := $(shell pwd)
KERNEL_VERSION := $(shell uname -r)
KDIR := /lib/modules/`uname -r`/build
all:
	make -C $(KDIR) M=$(PWD)
clean:
	rm -rf *.o *.ko *.mod.c *.symvers *.c~ *~
endif
```

加载模块到内核：

```bash
$ sudo insmod traverse_process.ko
```

`dmesg`输出如下：

```
[38167.768467] traverse module is working...
[38167.768468] [process 1]: swapper/0's pid is 0
[38167.768469] [process 2]: systemd's pid is 1
[38167.768470] [process 3]: kthreadd's pid is 2
[38167.768470] [process 4]: rcu_gp's pid is 3
[38167.768471] [process 5]: rcu_par_gp's pid is 4
[38167.768472] [process 6]: kworker/0:0H's pid is 6
[38167.768472] [process 7]: mm_percpu_wq's pid is 8
[38167.768473] [process 8]: rcu_tasks_kthre's pid is 10
......
```

卸载内核模块：

```bash
$ sudo rmmod traverse_process
```

`dmesg`输出：

```
[38214.937567] traverse process exit!
```

