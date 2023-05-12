---
title: semaphore信号量详解
tags:
  - Kernel
categories:
  - Kernel
cover: 'https://img.ansore.de/2022/04/27/62692c1359d83.jpg'
abbrlink: 75d3819a
date: 2022-06-14 00:02:56
---

# 信号量 

信号量是一个计数器，用来保护一个或多个共享资源的访问。如果信号量计数器大于0，则允许进程访问，信号量-1，如果信号量等于0，信号量会将线程置入休眠直到信号量大于0。

信号量能够保证对临界区的访问是原子的。

信号量用于进程之间的同步，进程在信号量保护的临界区代码里是可以睡眠的，这是和自旋锁最大的区别。

# 信号量基本使用

```c
struct semaphore sema;
// 初始化
sema_init(&sema, 1);
// 进入临界区 信号量-1
down(sema);
// 退出临界区 信号量+1
up(sema);
```

# 信号量Kernel实现

## 信号量结构体定义

结构体定义在`include/linux/semaphore.h`中

信号量结构体定义了自旋锁，信号量数以及等待队列。

```c
struct list_head {
	struct list_head *next, *prev;
};

/* Please don't access any members of this structure directly */
struct semaphore {
	raw_spinlock_t		lock;
	unsigned int		count;
    // 等待队列
	struct list_head	wait_list;
};
```

## 初始化函数

初始化函数传入信号量数，直接初始化结构体

```c
// 初始化双向链表
#define LIST_HEAD_INIT(name) { &(name), &(name) }

// 宏定义初始化信号量
#define __SEMAPHORE_INITIALIZER(name, n)				\
{									\
	.lock		= __RAW_SPIN_LOCK_UNLOCKED((name).lock),	\
	.count		= n,						\
	.wait_list	= LIST_HEAD_INIT((name).wait_list),		\
}

// 初始化信号量
static inline void sema_init(struct semaphore *sem, int val)
{
	static struct lock_class_key __key;
    // 初始化信号量
	*sem = (struct semaphore) __SEMAPHORE_INITIALIZER(*sem, val);
	lockdep_init_map(&sem->lock.dep_map, "semaphore->lock", &__key, 0);
}
```

## DOWN

down获取锁，如果获取到锁，则进入临界区；如果获取不到，则等待。

定义在`kernel/locking/semaphore.c`中。

首先涉及信号量数的变化都用自旋锁保护起来，如果信号量大于0，则信号量减1。如果信号量等于0，则将进程加入等待队列，并且检查进程是否有中断、超时等。由于自旋锁开销比较大，所以在加入等待队列后，释放自旋锁，让出CPU调度，之后再加上自旋锁。

```c
struct semaphore_waiter {
    // 进程的侵入式链表
	struct list_head list;
    // 进程结构体指针
	struct task_struct *task;
	bool up;
};

/*
 * Because this function is inlined, the 'state' parameter will be
 * constant, and thus optimised away by the compiler.  Likewise the
 * 'timeout' parameter for the cases without timeouts.
 */
static inline int __sched __down_common(struct semaphore *sem, long state,
								long timeout)
{
	struct semaphore_waiter waiter;

    // 把当前进程加入到等待队列队尾
	list_add_tail(&waiter.list, &sem->wait_list);
	waiter.task = current;
	waiter.up = false;

	for (;;) {
        // 查看当前进程是否有信号中断
		if (signal_pending_state(state, current))
			goto interrupted;
        // 是否超时,timeout值较大
		if (unlikely(timeout <= 0))
			goto timed_out;
        // 设置进程的状态：TASK_UNINTERRUPTIBLE
		__set_current_state(state);
        // 释放自旋锁
		raw_spin_unlock_irq(&sem->lock);
        // 由于自旋锁开销较大，所以此部分不用自旋锁保护，调用schedule_timeout进程让出CPU调度
		timeout = schedule_timeout(timeout);
        // 加自旋锁
		raw_spin_lock_irq(&sem->lock);
		if (waiter.up)
			return 0;
	}

 timed_out:
	list_del(&waiter.list);
	return -ETIME;

 interrupted:
	list_del(&waiter.list);
	return -EINTR;
}

#define TASK_UNINTERRUPTIBLE	2
#define LONG_MAX	((long)(~0UL >> 1))
#define	MAX_SCHEDULE_TIMEOUT		LONG_MAX
static noinline void __sched __down(struct semaphore *sem)
{
    // TASK_UNINTERRUPTIBLE 表示进程进入睡眠，并且不可中断
    // MAX_SCHEDULE_TIMEOUT long类型的最大值
	__down_common(sem, TASK_UNINTERRUPTIBLE, MAX_SCHEDULE_TIMEOUT);
}

/**
 * down - acquire the semaphore
 * @sem: the semaphore to be acquired
 *
 * Acquires the semaphore.  If no more tasks are allowed to acquire the
 * semaphore, calling this function will put the task to sleep until the
 * semaphore is released.
 *
 * Use of this function is deprecated, please use down_interruptible() or
 * down_killable() instead.
 */
void down(struct semaphore *sem)
{
	unsigned long flags;

	might_sleep();
    // 自旋锁
	raw_spin_lock_irqsave(&sem->lock, flags);
	if (likely(sem->count > 0))
        // 如果count>0，则-1
		sem->count--;
	else
        // 如果count==0，则执行__down()
		__down(sem);
	raw_spin_unlock_irqrestore(&sem->lock, flags);
}
EXPORT_SYMBOL(down);
```

## UP

如果等待队列为空，则信号量+1，否则将等待队列中的进程up置为true，唤醒进程，唤醒后重新获取信号量执行。

```c
/**
 * wake_up_process - Wake up a specific process
 * @p: The process to be woken up.
 *
 * Attempt to wake up the nominated process and move it to the set of runnable
 * processes.
 *
 * Return: 1 if the process was woken up, 0 if it was already running.
 *
 * This function executes a full memory barrier before accessing the task state.
 */
int wake_up_process(struct task_struct *p)
{
	return try_to_wake_up(p, TASK_NORMAL, 0);
}
EXPORT_SYMBOL(wake_up_process);

static noinline void __sched __up(struct semaphore *sem)
{
    // 拿到等待队列的进程
	struct semaphore_waiter *waiter = list_first_entry(&sem->wait_list,
						struct semaphore_waiter, list);
    // 从等待队列中删除该进程
	list_del(&waiter->list);
    // 修改进程状态
	waiter->up = true;
    // 唤醒进程
	wake_up_process(waiter->task);
}

/**
 * up - release the semaphore
 * @sem: the semaphore to release
 *
 * Release the semaphore.  Unlike mutexes, up() may be called from any
 * context and even by tasks which have never called down().
 */
void up(struct semaphore *sem)
{
	unsigned long flags;

	raw_spin_lock_irqsave(&sem->lock, flags);
    // 查看等待队列是否为空
	if (likely(list_empty(&sem->wait_list)))
        // 如果等待队列中无待执行进程，信号量释放+1
		sem->count++;
	else
        // 执行
		__up(sem);
	raw_spin_unlock_irqrestore(&sem->lock, flags);
}
EXPORT_SYMBOL(up);
```

