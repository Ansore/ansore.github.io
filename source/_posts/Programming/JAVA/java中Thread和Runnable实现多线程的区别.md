---
title: java中Thread和Runnable实现多线程的区别
tags:
  - java
  - 多线程
categories:
  - java
cover: https://images.ansore.top/i/2022/04/27/6269303eae58b.jpg
abbrlink: b5ea2dc8
date: 2017-07-28 15:18:29
---

java中实现多线程有两种方法：继承Thread类和实现Runnable接口。

一个类如果继承Thread，则不适合资源共享，但是如果实现Runnable接口，则很容易实现资源共享。在程序开发中永远以实现Runnable接口为主。

实现Runnable接口和继承Thread相比，有如下优势：

1. 避免java单继承带来的局限性。
2. 增加程序健壮性，代码能被多个线程共享，代码和数据独立
3. 适合多个相同的程序代码去处理同一个资源
4. 线程池中只能放入实现Runnable和Callable类的线程，不能直接放入继承Thread的类

---

首先通过继承Thread类的实现：

```java
package com.thread;

public class ThreadImplByThread {
	public static void main(String[] args) {
		new MyThread().start();
		new MyThread().start();
		new MyThread().start();
	}
}

class MyThread extends Thread {
	
	private int x = 6;
	
	@Override
	public void run() {
		while(x > 0) {
			System.out.println("x = "+x);
			x --;
		}
	}
}
```

运行结果：

```
x = 6
x = 5
x = 4
x = 3
x = 2
x = 1
x = 6
x = 6
x = 5
x = 5
x = 4
x = 3
x = 2
x = 1
x = 4
x = 3
x = 2
x = 1
```

三个线程分别执行三个对象中的代码，每个线程都完成各自的任务，相互之间独立。

通过实现Runnable接口实现：

```java
package com.thread;

public class ThreadImplByRunnable {
	public static void main(String[] args) {
		MyThread mt = new MyThread();
		new Thread(mt).start();
		new Thread(mt).start();
		new Thread(mt).start();
	}
}

class MyThread implements Runnable {

	private int x = 6;
	
	@Override
	public void run() {
		while(x > 0) {
			System.out.println("x = " + x);
			x --;
		}
	}
}
```

运行结果：

```
x = 6
x = 5
x = 4
x = 3
x = 2
x = 1
```

这种方法会出现线程不安全的问题，三个Thread对象共同执行一个Runnable对象中的代码，如结果有时也是这样的：

```
x = 6
x = 6
x = 5
x = 4
x = 3
x = 2
x = 1
```

可以加入synchronized同步锁解决这个问题。
