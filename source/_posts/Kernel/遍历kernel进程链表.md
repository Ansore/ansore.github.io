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
 * list_first_entry - get the first element from a list
 * @ptr:	the list head to take the element from.
 * @type:	the type of the struct this is embedded in.
 * @member:	the name of the list_head within the struct.
 *
 * Note, that list is expected to be not empty.
 */
#define list_first_entry(ptr, type, member) \
	list_entry((ptr)->next, type, member)

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

获取列表里的内容：

```c
#define list_entry(ptr, type, member) \
    container_of(ptr, type, member)
```

使用了三个参数：

- ptr - 指向链表头的指针；
- type - 结构体类型;
- member - 在结构体内类型为 `list_head` 的变量的名字；

```c
#define list_entry(ptr, type, member) \
    container_of(ptr, type, member)
```

调用了宏`container_of`：

```c
#define container_of(ptr, type, member) ({                      \
    const typeof( ((type *)0)->member ) *__mptr = (ptr);    \
    (type *)( (char *)__mptr - offsetof(type,member) );})
```

编译器会执行花括号内的全部语句，然后返回最后的表达式的值。

`typeof`返回给定变量的类型。`container_of` 中的 0巧妙的计算了从结构体特定变量的偏移，这里的0刚好就是位宽里的零偏移。

下一个宏 `offsetof` 会计算从结构体的某个变量的相对于结构体起始地址的偏移。它的实现和上面类似：

```c
#define offsetof(TYPE, MEMBER) ((size_t) &((TYPE *)0)->MEMBER)
```

只需要知道结构体里面类型为 `list_head` 的变量的名字和结构体容器的类型，它可以通过结构体的变量 `list_head` 获得结构体的起始地址。在宏定义的第一行，声明了一个指向结构体成员变量 `ptr` 的指针 `__mptr` ，并且把 `ptr` 的地址赋给它。现在 `ptr` 和 `__mptr` 指向了同一个地址。从技术上讲我们并不需要这一行，但是它可以方便的进行类型检查。第一行保证了特定的结构体（参数 `type`）包含成员变量 `member`。第二行代码会用宏 `offsetof` 计算成员变量相对于结构体起始地址的偏移，然后从结构体的地址减去这个偏移，最后就得到了结构体的起始地址。

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

