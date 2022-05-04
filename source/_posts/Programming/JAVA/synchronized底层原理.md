---
title: synchronized底层原理
tags:
  - jvm
  - java
categories:
  - java
cover: https://images.ansore.top/i/2022/04/27/6269303eae58b.jpg
abbrlink: c55fd50b
date: 2020-05-31 01:36:09
---

# 并发编程中的三个问题

## 可见性(Visibility)

一个线程对共享变量进行修改，另一个线程立即得到修改后的最新值

演示：一个线程根据boolean类型的标记flag,while循环，另一个线程改变这个flag变量的值，另一个线程并不会停止循环。

```java
/**
 * 演示可见性问题
 * 1.创建一个共享变量
 * 2.创建一条线程不断读取共享变量
 * 3.创建一条线程修改共享变量
 *
 * */

class VisibilityTest {
	// 1.创建一个共享变量
	private static boolean flag = true;
	
	public static void main(String[] args) throws InterruptedException {
		// 2.创建一条线程不断读取共享变量
		new Thread(()->{
			while(flag) {
				
			}
		}).start();

		Thread.sleep(2000);

		// 3.创建一条线程修改共享变量
		new Thread(()->{
			flag = false;
			System.out.println("修改了变量的值为false");
		}).start();
	}
}
```

## 原子性问题(Atomicity)

在一次或多次操作中，要么所有操作都执行并且不会受到其他因素的干扰而终端，要么所有的操作都不执行。

演示：5个线程各执行1000次i++

```java
import java.util.ArrayList;
import java.util.List;

/**
 * 演示原子性问题
 * 1.定义一个共享变量number
 * 2.对number进行1000次++操作
 * 3.使用5个线程来进行
 *
 * */
class AtomicityTest {
	// 1.定义一个共享变量number
	private static int number = 0;
	public static void main(String[] args) throws InterruptedException {
		// 2.对number进行1000次
		Runnable increment = () -> {
			for(int i = 0; i < 1000; i ++) {
				number ++;
			}
		};
		List<Thread> list = new ArrayList<>();
		// 3.使用5个线程来进行
		for(int i = 0; i < 5; i ++) {
			Thread t = new Thread(increment);
			t.start();
			list.add(t);
		}
		for(Thread t : list) {
			// 等待线程执行完毕
			t.join();
		}

		System.out.println("number=" + number);
	}
}
```

## 有序性(Ordering)

程序中代码的执行顺序，java编译时和运行时会对代码进行优化，从而导致程序最终的执行顺序不一定就是编写代码时的顺序

演示：jcstress是java并发压测工具

修改pom文件，添加啊依赖

```xml
<properties>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>

    <!--
            jcstress version to use with this project.
          -->
    <jcstress.version>0.5</jcstress.version>

    <!--
            Java source/target to use for compilation.
          -->
    <javac.target>8</javac.target>

    <!--
            Name of the test Uber-JAR to generate.
          -->
    <uberjar.name>jcstress-learning</uberjar.name>
</properties>

<dependency>
    <groupId>org.openjdk.jcstress</groupId>
    <artifactId>jcstress-core</artifactId>
    <version>0.5</version>
</dependency>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.2</version>
            <configuration>
                <source>1.8</source>
                <target>1.8</target>
            </configuration>
        </plugin>

        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-clean-plugin</artifactId>
            <version>3.1.0</version>
            <configuration>
                <filesets>
                    <fileset>
                        <directory>${basedir}/results</directory>
                        <followSymlinks>false</followSymlinks>
                    </fileset>
                    <fileset>
                        <directory>${basedir}</directory>
                        <includes>
                            <include>jcstress-results*</include>
                        </includes>
                        <followSymlinks>false</followSymlinks>
                    </fileset>
                </filesets>
            </configuration>
        </plugin>

        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-shade-plugin</artifactId>
            <version>2.2</version>
            <executions>
                <execution>
                    <id>main</id>
                    <phase>package</phase>
                    <goals>
                        <goal>shade</goal>
                    </goals>
                    <configuration>
                        <finalName>${uberjar.name}</finalName>
                        <transformers>
                            <transformer
                                         implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                                <mainClass>org.openjdk.jcstress.Main</mainClass>
                            </transformer>
                            <transformer
                                         implementation="org.apache.maven.plugins.shade.resource.AppendingTransformer">
                                <resource>META-INF/TestList</resource>
                            </transformer>
                        </transformers>
                    </configuration>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

```java
@JCStressTest
@Outcome(id = {"1", "4"}, expect = Expect.ACCEPTABLE, desc = "ok")
@Outcome(id = "0", expect = Expect.ACCEPTABLE_INTERESTING, desc = "danger")
@State
public class OrderingTest {
    int num = 0;
    boolean ready = false;

    // 线程1执行代码
    @Actor
    public void actor1(I_Result r) {
        if(ready) {
            r.r1 = num + num;
        } else {
            r.r1 = 1;
        }
    }

    // 线程2执行代码
    @Actor
    public void actor2(I_Result r) {
        // 这两步进行了重排序，导致产生0
        num = 2;
        ready = true;
    }
}
```

结果：

```
Observed state   Occurrences              Expectation  Interpretation                                              
0         5,335   ACCEPTABLE_INTERESTING  danger                                                      
1    39,878,419               ACCEPTABLE  ok                                                          
4    39,868,777               ACCEPTABLE  ok                         
```



# java内存模型(JMM)

- 主内存，所有线程共享，都能访问。所有共享变量都存储在主内存中嗯
- 工作内存，每个线程都有自己的工作内存，工作内存只存储该线程对共享变量的副本，线程多变量的所有操作都必须在工作内存中完成，而不能直接读写主内存中的变量，不同线程之间也不能直接访问对方工作内存中的变量

![Screenshot_20200529_160454](https://images.ansore.top/i/2022/05/01/626e30e2e19cf.png)

## java内存模型的作用

java内存模型是一套多线程读写共享数据时，对共享数据的可见性、有序性、原子性的规则和保障。

synchronized,volatile

## CPU缓存、内存与java内存模型的关系

![Screenshot_20200529_160804](https://images.ansore.top/i/2022/05/01/626e30d8e13d8.png)



## 主内存与工作内存之间的交互

![Screenshot_20200529_162435](https://images.ansore.top/i/2022/05/01/626e30cc0ffa0.png)

1. 如果对一个变量执行lock操作，将会清空工作内存中此变量的值
2. 对一个变量执行unlock操作，必须先把此变量同步到主内存中

```
lock -> read -> load -> use -> assign -> store -> write -> unlock
```



# Synchronized保证三大特性

synchronized能够保证在同一时刻最多只有一个线程执行该段代码，已达到保证并发安全的效果

```java
synchronized (锁对象) {
    // 收保护资源
}
```

## Synchronized与原子性

```java
class AtomicityTest {
	// 1.定义一个共享变量number
	private static int number = 0;
	private static Object obj = new Object();
	public static void main(String[] args) throws InterruptedException {
		// 2.对number进行1000次
		Runnable increment = () -> {
			for(int i = 0; i < 1000; i ++) {
				synchronized (obj) {
					number ++;
				}
			}
		};
		List<Thread> list = new ArrayList<>();
		// 3.使用5个线程来进行
		for(int i = 0; i < 500; i ++) {
			Thread t = new Thread(increment);
			t.start();
			list.add(t);
		}
		for(Thread t : list) {
			// 等待线程执行完毕
			t.join();
		}

		System.out.println("number=" + number);
	}
}
```

## Synchronized与可见性

1. volatile

```java
private static volatile boolean flag = true;
```

缓存一致性协议，保证可见性与有序性，不保证原子性

2. Synchronized

```java
class VisibilityTest {
	// 1.创建一个共享变量
	private static boolean flag = true;
	private static Object obj = new Object();
	
	public static void main(String[] args) throws InterruptedException {
		// 2.创建一条线程不断读取共享变量
		new Thread(()->{
			while(flag) {
//				System.out.println(flag);
				synchronized (obj){
					
				}
			}
		}).start();

		Thread.sleep(2000);

		// 3.创建一条线程修改共享变量
		new Thread(()->{
			flag = false;
			System.out.println("修改了变量的值为false");
		}).start();
	}
}
```

保证可见性原理：Synchronized对应的lock原子操作会让工作内存变量获取最新值

另外

```java
System.out.println(flag);
```

也可以。println也用到了Synchronized

```java
public void println(boolean x) {
    synchronized (this) {
        print(x);
        newLine();
    }
}
```

## Synchronized与有序性

为了提高程序的执行效率，编译器和CPU会对程序中的代码进行重排序

as-if-serial语义：不论编译器和CPU如何重排序，必须保证在单线程情况下程序的结果是正确的

以下数据有依赖关系，不能重排序

写后读：

```java
int a = 1;
int b = a;
```

写后写：

```java
int a = 1;
int a = 2;
```

读后写：

```java
int a = 1;
int b = a;
int a = 2;
```

编译器和处理器不会对存在数据依赖关系的操作做重排序，因为这种重排序不会改变执行结果，但是，如果操作之间不存在数据依赖关系，这些操作就有可能被编译器和处理器重排序

```java
// a和b没有依赖关系
int a = 1;
int b = 2;
int c = a + b;

// 可以重排成这样
int b = 2;
int a = 1;
int c = a + b;
```

synchronized保证有序性：

```java
@JCStressTest
@Outcome(id = {"1"}, expect = Expect.ACCEPTABLE, desc = "ok")
@Outcome(id = {"4"}, expect = Expect.ACCEPTABLE_INTERESTING, desc = "ok2")
@Outcome(id = "0", expect = Expect.ACCEPTABLE_INTERESTING, desc = "danger")
@State
public class OrderingTest {
    private Object obj = new Object();
    int num = 0;
    boolean ready = false;

    // 线程1执行代码
    @Actor
    public void actor1(I_Result r) {
        synchronized (this) {
            if(ready) {
                r.r1 = num + num;
            } else {
                r.r1 = 1;
            }
        }
    }

    // 线程2执行代码
    @Actor
    public void actor2(I_Result r) {
        synchronized (obj) {
            num = 2;
            ready = true;
        }
    }
}
```

结果：

```
[OK] com.ansore.synchronized_demo.OrderingTest
(JVM args: [])
Observed state   Occurrences              Expectation  Interpretation                                              
0             0   ACCEPTABLE_INTERESTING  danger                                                      
1    16,715,561               ACCEPTABLE  ok                                                          
4    49,060,280   ACCEPTABLE_INTERESTING  ok2  
```

加synchronized后，依然会发生重排序，只不过同步代码块保证只有一个线程执行同步代码块中的内容

还可以使用volatile可以保证有序性，使两个变量不发生重排序



# Synchronized的特性

## 可重入

一个线程可以多次执行Synchronized，重复获取同一把锁。

```java
/**
 * 演示synchronized可重入
 * 1.自定义线程类
 * 2.在线程类中使用嵌套的同步代码块
 * 3.使用两个线程来执行
 */
public class Demo01 {

    public static void main(String[] args) {
        new MyThread().start();
        new MyThread().start();
    }
}

class MyThread extends Thread {
    @Override
    public void run() {
        synchronized (MyThread.class) {
            System.out.println(getName() + "进入同步代码块1");
            synchronized (MyThread.class) {
                System.out.println(getName() + "进入同步代码块2");
            }
        }
    }
}
```

结果：

```
Thread-0进入同步代码块1
Thread-0进入同步代码块2
Thread-1进入同步代码块1
Thread-1进入同步代码块2
```

锁对象中有个计数器（recursions）变量，会记录线程获得几次锁。

1. 可以避免死锁
2. 可以更好地封装代码

### 不可中断特性

一个线程获得锁后，另一个线程想要获得锁，必须处于阻塞或等待状态，如果第一个线程不是放锁，第二个线程会一直阻塞或等待，不可被中断

```java
/**
 * 演示synchronized不可中断
 * 1.定义一个Runnable
 * 2.在Runnable定义同步代码块
 * 3.先开启一个线程来执行同步代码块，保证不退出同步代码块
 * 4.后开启一个线程来执行同步代码块（阻塞状态）
 * 5.强行停止第二个线程
 */
public class Demo02Uninterruptible {
    private static Object obj = new Object();
    public static void main(String[] args) throws InterruptedException {
        // 1.定义一个Runnable
        Runnable run = () -> {
            // 2.在Runnable定义同步代码块
            synchronized (obj) {
                // 保证不退出同步代码块
                String name = Thread.currentThread().getName();
                System.out.println(name+"进入同步代码块");

                // 保证不退出同步代码块
                try {
                    Thread.sleep(88888);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        };
        // 3.先开启一个线程来执行同步代码块，保证不退出同步代码块
        Thread t1 = new Thread(run);
        t1.start();
        Thread.sleep(1000);
        // 4.后开启一个线程来执行同步代码块（阻塞状态）
        Thread t2 = new Thread(run);
        t2.start();

        // * 5.强行停止第二个线程
        System.out.println("停止线程前");
        t2.interrupt();
        System.out.println("停止线程后");

        System.out.println(t1.getState());
        System.out.println(t2.getState());
    }
}
```

结果：

```
Thread-0进入同步代码块
停止线程前
停止线程后
TIMED_WAITING
BLOCKED
```



##### ReentrantLock可中断与不可中断

```java
/**
 * 演示Lock不可中断和可中断
 *
 */
public class Demo02Interruptible {
    private static ReentrantLock lock = new ReentrantLock();
    public static void main(String[] args) throws InterruptedException {
        test2();
    }

    // Lock不可中断
    public static void test1() throws InterruptedException {
        Runnable run = () -> {
            String name = Thread.currentThread().getName();
            try {
                lock.lock();
                System.out.println(name + "获得锁，进入锁执行");
                Thread.sleep(888888);
            } catch (InterruptedException e) {
                e.printStackTrace();
            } finally {
                lock.unlock();
                System.out.println(name + "释放锁");
            }
        };

        Thread t1 = new Thread(run);
        t1.start();

        Thread.sleep(1000);
        Thread t2 = new Thread(run);
        t2.start();

        System.out.println("停止线程t2前");
        t2.interrupt();
        System.out.println("停止线程t2后");

        Thread.sleep(1000);
        System.out.println(t1.getState());
        System.out.println(t2.getState());

        /**
         * 运行结果
         * Thread-0获得锁，进入锁执行
         * 停止线程t2前
         * 停止线程t2后
         * TIMED_WAITING
         * WAITING
         */
    }

    public static void test2() throws InterruptedException {
        Runnable run = () -> {
            String name = Thread.currentThread().getName();
            boolean b = false;
            try {
                b = lock.tryLock(3, TimeUnit.SECONDS);
                if(b) {
                    System.out.println(name + "获得锁，进入锁执行");
                    Thread.sleep(888888);
                } else {
                    System.out.println(name+"在指定的时间内，没有获取锁");
                }
            } catch (InterruptedException e) {
                e.printStackTrace();
            } finally {
                if(b) {
                    lock.unlock();
                    System.out.println(name + "释放锁");
                }
            }
        };

        Thread t1 = new Thread(run);
        t1.start();

        Thread.sleep(1000);
        Thread t2 = new Thread(run);
        t2.start();

        /**
         * 运行结果：
         * Thread-0获得锁，进入锁执行
         * Thread-1在指定的时间内，没有获取锁
         */

    }
}
```

# Synchronized原理

monitor才是真正的锁，JVM会创建一个monitor C++对象

Synchronized的锁对象会关联一个monitor,这个monitor不是主动创建的，而是JVM线程执行到这个同步代码块，发现锁对象没有monitor就会创建monitor

```
monitor
owner:拥有锁的对象
recursions：获取锁的次数
```

- monitorenter

1. 若monitor的进入次数为0，线程可以进入monitor，当前线程为monitor的所有者
2. 托线程已经拥有monitor，允许它重入monitor,则进入monitor的次数+1
3. 若其他线程已经占有monitor的所有权，那么当前尝试获取monitor的所有权的线程会被阻塞，知道monitor的进入数变为0，才能重新尝试获取monitor的所有权

- monitorexit

1. 能执行monitorexit指令的一定是拥有当前对象的monitor的所有权的线程
2. 执行monitorexit时会将monitor的进入数-1，当monitor进入数为0时，当前线程推出monitor，不再拥有monitor的所有权。此时其他被这个monitor阻塞的线程可以尝试获取这个monitor的所有权



synchronized出现异常依然会释放锁



同步方法反汇编之后会增加ACC_SYNCHRONIZED修饰，会隐式调用monitorenter和monitorexit方法，执行同步方法之前会调用monitorenter，执行同步代码块之后会调用monitorexit



### synchronized与lock的区别

1. synchronized是关键字，而lock是接口
2. synchronized会自动释放锁，而lock必须手动释放锁
3. synchronized不可中断，lock可中断也可以不中断
4. 通过lock可以知道线程有没有拿到锁，而synchronized不能
5. synchronized能锁方法和代码块，而lock只能锁代码块
6. lock可以使用读锁提高多线程读效率
7. synchronized是非公平锁，ReentrantLock可以控制是否是公平



# JVM源码

## monitor监视器锁

monitor由ObjectMonitor实现，源码用C++实现的，位于HotSpot虚拟机源码的src/share/vm/runtime/objectMonitor.cpp下。主要数据结构如下：

```c++
  // initialize the monitor, exception the semaphore, all other fields
  // are simple integers or pointers
  ObjectMonitor() {
    _header       = NULL;
    _count        = 0;
    _waiters      = 0,
    _recursions   = 0; // 线程的重入次数
    _object       = NULL; // 存储该monitor对象
    _owner        = NULL; // 标识拥有该monitor的线程
    _WaitSet      = NULL; // 处于wait状态的线程，会被加入到_WaitSet中
    _WaitSetLock  = 0 ;
    _Responsible  = NULL ;
    _succ         = NULL ;
    _cxq          = NULL ; // 多线程竞争锁时的单向列表
    FreeNext      = NULL ;
    _EntryList    = NULL ; // 处于等待锁block状态的线程，会被加入该列表
    _SpinFreq     = 0 ;
    _SpinClock    = 0 ;
    OwnerIsThread = 0 ;
    _previous_owner_tid = 0;
  }
```

线程在执行过程中，有线程进来，首先会进入_cxq，线程执行完毕以后会竞争锁，为获得锁的线程会被加入_EntryList 处于阻塞状态。

## Monitor竞争

1. 执行monitorenter时，会调用InterpreterRuntime.cpp

(src/share/vm/interpreter/interpreterRuntime.cpp)

```c++
//------------------------------------------------------------------------------------------------------------------------
// Synchronization
//
// The interpreter's synchronization code is factored out so that it can
// be shared by method invocation and synchronized blocks.
//%note synchronization_3

//%note monitor_1
IRT_ENTRY_NO_ASYNC(void, InterpreterRuntime::monitorenter(JavaThread* thread, BasicObjectLock* elem))
#ifdef ASSERT
  thread->last_frame().interpreter_frame_verify_monitor(elem);
#endif
  if (PrintBiasedLockingStatistics) {
    Atomic::inc(BiasedLocking::slow_path_entry_count_addr());
  }
  Handle h_obj(thread, elem->obj());
  assert(Universe::heap()->is_in_reserved_or_null(h_obj()),
         "must be NULL or an object");
  if (UseBiasedLocking) {
    // Retry fast entry if bias is revoked to avoid unnecessary inflation
    ObjectSynchronizer::fast_enter(h_obj, elem->lock(), true, CHECK);
  } else {
    ObjectSynchronizer::slow_enter(h_obj, elem->lock(), CHECK);
  }
  assert(Universe::heap()->is_in_reserved_or_null(elem->obj()),
         "must be NULL or an object");
#ifdef ASSERT
  thread->last_frame().interpreter_frame_verify_monitor(elem);
#endif
IRT_END
```

2. 对于重量级锁，monitorenter函数会调用ObjectSynchronizer::slow_enter
3. 最终调用ObjectMonitor::enter (位于src/share/vm/runtime/objectMonitor.cpp)

```c++
void ATTR ObjectMonitor::enter(TRAPS) {
  // The following code is ordered to check the most common cases first
  // and to reduce RTS->RTO cache line upgrades on SPARC and IA32 processors.
  Thread * const Self = THREAD ;
  void * cur ;

  // 通过CAS操作尝试把monitor的_owner字段设置为当前线程
  cur = Atomic::cmpxchg_ptr (Self, &_owner, NULL) ;
  if (cur == NULL) {
     // Either ASSERT _recursions == 0 or explicitly set _recursions = 0.
     assert (_recursions == 0   , "invariant") ;
     assert (_owner      == Self, "invariant") ;
     // CONSIDER: set or assert OwnerIsThread == 1
     return ;
  }

  // 线程重入，_recursions ++
  if (cur == Self) {
     // TODO-FIXME: check for integer overflow!  BUGID 6557169.
     _recursions ++ ;
     return ;
  }

  // 如果当前线程第一次进入该monitor,设置_recursions = 1 ;_owner为当前线程
  if (Self->is_lock_owned ((address)cur)) {
    assert (_recursions == 0, "internal state error");
    _recursions = 1 ;
    // Commute owner from a thread-specific on-stack BasicLockObject address to
    // a full-fledged "Thread *".
    _owner = Self ;
    OwnerIsThread = 1 ;
    return ;
  }

  // We've encountered genuine contention.
  assert (Self->_Stalled == 0, "invariant") ;
  Self->_Stalled = intptr_t(this) ;

  // Try one round of spinning *before* enqueueing Self
  // and before going through the awkward and expensive state
  // transitions.  The following spin is strictly optional ...
  // Note that if we acquire the monitor from an initial spin
  // we forgo posting JVMTI events and firing DTRACE probes.
  if (Knob_SpinEarly && TrySpin (Self) > 0) {
     assert (_owner == Self      , "invariant") ;
     assert (_recursions == 0    , "invariant") ;
     assert (((oop)(object()))->mark() == markOopDesc::encode(this), "invariant") ;
     Self->_Stalled = 0 ;
     return ;
  }

  assert (_owner != Self          , "invariant") ;
  assert (_succ  != Self          , "invariant") ;
  assert (Self->is_Java_thread()  , "invariant") ;
  JavaThread * jt = (JavaThread *) Self ;
  assert (!SafepointSynchronize::is_at_safepoint(), "invariant") ;
  assert (jt->thread_state() != _thread_blocked   , "invariant") ;
  assert (this->object() != NULL  , "invariant") ;
  assert (_count >= 0, "invariant") ;

  // Prevent deflation at STW-time.  See deflate_idle_monitors() and is_busy().
  // Ensure the object-monitor relationship remains stable while there's contention.
  Atomic::inc_ptr(&_count);

  EventJavaMonitorEnter event;

  { // Change java thread status to indicate blocked on monitor enter.
    JavaThreadBlockedOnMonitorEnterState jtbmes(jt, this);

    DTRACE_MONITOR_PROBE(contended__enter, this, object(), jt);
    if (JvmtiExport::should_post_monitor_contended_enter()) {
      JvmtiExport::post_monitor_contended_enter(jt, this);
    }

    OSThreadContendState osts(Self->osthread());
    ThreadBlockInVM tbivm(jt);

    Self->set_current_pending_monitor(this);

    // TODO-FIXME: change the following for(;;) loop to straight-line code.
    for (;;) {
      jt->set_suspend_equivalent();
      // cleared by handle_special_suspend_equivalent_condition()
      // or java_suspend_self()

      // 如果获取锁失败，则等待锁的释放
      EnterI (THREAD) ;

      if (!ExitSuspendEquivalent(jt)) break ;

      //
      // We have acquired the contended monitor, but while we were
      // waiting another thread suspended us. We don't want to enter
      // the monitor while suspended because that would surprise the
      // thread that suspended us.
      //
          _recursions = 0 ;
      _succ = NULL ;
      exit (false, Self) ;

      jt->java_suspend_self();
    }
    Self->set_current_pending_monitor(NULL);
  }

  Atomic::dec_ptr(&_count);
  assert (_count >= 0, "invariant") ;
  Self->_Stalled = 0 ;

  // Must either set _recursions = 0 or ASSERT _recursions == 0.
  assert (_recursions == 0     , "invariant") ;
  assert (_owner == Self       , "invariant") ;
  assert (_succ  != Self       , "invariant") ;
  assert (((oop)(object()))->mark() == markOopDesc::encode(this), "invariant") ;

  // The thread -- now the owner -- is back in vm mode.
  // Report the glorious news via TI,DTrace and jvmstat.
  // The probe effect is non-trivial.  All the reportage occurs
  // while we hold the monitor, increasing the length of the critical
  // section.  Amdahl's parallel speedup law comes vividly into play.
  //
  // Another option might be to aggregate the events (thread local or
  // per-monitor aggregation) and defer reporting until a more opportune
  // time -- such as next time some thread encounters contention but has
  // yet to acquire the lock.  While spinning that thread could
  // spinning we could increment JVMStat counters, etc.

  DTRACE_MONITOR_PROBE(contended__entered, this, object(), jt);
  if (JvmtiExport::should_post_monitor_contended_entered()) {
    JvmtiExport::post_monitor_contended_entered(jt, this);
  }

  if (event.should_commit()) {
    event.set_klass(((oop)this->object())->klass());
    event.set_previousOwner((TYPE_JAVALANGTHREAD)_previous_owner_tid);
    event.set_address((TYPE_ADDRESS)(uintptr_t)(this->object_addr()));
    event.commit();
  }

  if (ObjectMonitor::_sync_ContendedLockAttempts != NULL) {
     ObjectMonitor::_sync_ContendedLockAttempts->inc() ;
  }
}
```

以上代码的流程概括如下：

1. 通过CAS尝试吧monitor的owner字段设置为当前线程
2. 如果设置之前的owner指向当前线程，说明当前线程再次进入Monitor，即重入锁，执行_recursions++， 记录重入次数
3. 如果当前线程是第一次进入该monitor，设置recursions为1，owner为当前线程，该线程成功获得锁并返回
4. 如果获取锁失败，则等待锁的释放

## monitor等待

竞争失败等待调用的是ObjectMonitor对象中的EnterI方法 (位于src/share/vm/runtime/objectMonitor.cpp)

```c++
void ATTR ObjectMonitor::EnterI (TRAPS) {
    Thread * Self = THREAD ;
    assert (Self->is_Java_thread(), "invariant") ;
    assert (((JavaThread *) Self)->thread_state() == _thread_blocked   , "invariant") ;

    // Try the lock - TATAS
    // 尝试获取锁
    if (TryLock (Self) > 0) {
        assert (_succ != Self              , "invariant") ;
        assert (_owner == Self             , "invariant") ;
        assert (_Responsible != Self       , "invariant") ;
        return ;
    }

    DeferredInitialize () ;

    // We try one round of spinning *before* enqueueing Self.
    //
    // If the _owner is ready but OFFPROC we could use a YieldTo()
    // operation to donate the remainder of this thread's quantum
    // to the owner.  This has subtle but beneficial affinity
    // effects.

    // 自旋获取锁
    if (TrySpin (Self) > 0) {
        assert (_owner == Self        , "invariant") ;
        assert (_succ != Self         , "invariant") ;
        assert (_Responsible != Self  , "invariant") ;
        return ;
    }

    // The Spin failed -- Enqueue and park the thread ...
    assert (_succ  != Self            , "invariant") ;
    assert (_owner != Self            , "invariant") ;
    assert (_Responsible != Self      , "invariant") ;

    // Enqueue "Self" on ObjectMonitor's _cxq.
    //
    // Node acts as a proxy for Self.
    // As an aside, if were to ever rewrite the synchronization code mostly
    // in Java, WaitNodes, ObjectMonitors, and Events would become 1st-class
    // Java objects.  This would avoid awkward lifecycle and liveness issues,
    // as well as eliminate a subset of ABA issues.
    // TODO: eliminate ObjectWaiter and enqueue either Threads or Events.
    //

    // 当前线程被封装成ObjectWaiter对象node,状态设置为ObjectWaiter::TS_CXQ 
    ObjectWaiter node(Self) ;
    Self->_ParkEvent->reset() ;
    node._prev   = (ObjectWaiter *) 0xBAD ;
    node.TState  = ObjectWaiter::TS_CXQ ;

    // Push "Self" onto the front of the _cxq.
    // Once on cxq/EntryList, Self stays on-queue until it acquires the lock.
    // Note that spinning tends to reduce the rate at which threads
    // enqueue and dequeue on EntryList|cxq.
    
    // 通过CAS吧node节点push到_cxq列表中
    ObjectWaiter * nxt ;
    for (;;) {
        node._next = nxt = _cxq ;
        if (Atomic::cmpxchg_ptr (&node, &_cxq, nxt) == nxt) break ;

        // Interference - the CAS failed because _cxq changed.  Just retry.
        // As an optional optimization we retry the lock.
        if (TryLock (Self) > 0) {
            assert (_succ != Self         , "invariant") ;
            assert (_owner == Self        , "invariant") ;
            assert (_Responsible != Self  , "invariant") ;
            return ;
        }
    }

    // Check for cxq|EntryList edge transition to non-null.  This indicates
    // the onset of contention.  While contention persists exiting threads
    // will use a ST:MEMBAR:LD 1-1 exit protocol.  When contention abates exit
    // operations revert to the faster 1-0 mode.  This enter operation may interleave
    // (race) a concurrent 1-0 exit operation, resulting in stranding, so we
    // arrange for one of the contending thread to use a timed park() operations
    // to detect and recover from the race.  (Stranding is form of progress failure
    // where the monitor is unlocked but all the contending threads remain parked).
    // That is, at least one of the contended threads will periodically poll _owner.
    // One of the contending threads will become the designated "Responsible" thread.
    // The Responsible thread uses a timed park instead of a normal indefinite park
    // operation -- it periodically wakes and checks for and recovers from potential
    // strandings admitted by 1-0 exit operations.   We need at most one Responsible
    // thread per-monitor at any given moment.  Only threads on cxq|EntryList may
    // be responsible for a monitor.
    //
    // Currently, one of the contended threads takes on the added role of "Responsible".
    // A viable alternative would be to use a dedicated "stranding checker" thread
    // that periodically iterated over all the threads (or active monitors) and unparked
    // successors where there was risk of stranding.  This would help eliminate the
    // timer scalability issues we see on some platforms as we'd only have one thread
    // -- the checker -- parked on a timer.

    if ((SyncFlags & 16) == 0 && nxt == NULL && _EntryList == NULL) {
        // Try to assume the role of responsible thread for the monitor.
        // CONSIDER:  ST vs CAS vs { if (Responsible==null) Responsible=Self }
        Atomic::cmpxchg_ptr (Self, &_Responsible, NULL) ;
    }

    // The lock have been released while this thread was occupied queueing
    // itself onto _cxq.  To close the race and avoid "stranding" and
    // progress-liveness failure we must resample-retry _owner before parking.
    // Note the Dekker/Lamport duality: ST cxq; MEMBAR; LD Owner.
    // In this case the ST-MEMBAR is accomplished with CAS().
    //
    // TODO: Defer all thread state transitions until park-time.
    // Since state transitions are heavy and inefficient we'd like
    // to defer the state transitions until absolutely necessary,
    // and in doing so avoid some transitions ...

    TEVENT (Inflated enter - Contention) ;
    int nWakeups = 0 ;
    int RecheckInterval = 1 ;

    for (;;) {

        // 线程在被挂起之前做一下挣扎，看能不能获取到锁
        if (TryLock (Self) > 0) break ;
        assert (_owner != Self, "invariant") ;

        if ((SyncFlags & 2) && _Responsible == NULL) {
           Atomic::cmpxchg_ptr (Self, &_Responsible, NULL) ;
        }

        // park self
        if (_Responsible == Self || (SyncFlags & 1)) {
            TEVENT (Inflated enter - park TIMED) ;
            Self->_ParkEvent->park ((jlong) RecheckInterval) ;
            // Increase the RecheckInterval, but clamp the value.
            RecheckInterval *= 8 ;
            if (RecheckInterval > 1000) RecheckInterval = 1000 ;
        } else {
            TEVENT (Inflated enter - park UNTIMED) ;
            // 通过park将线程挂起，等待被唤醒
            Self->_ParkEvent->park() ;
        }

        if (TryLock(Self) > 0) break ;

        // The lock is still contested.
        // Keep a tally of the # of futile wakeups.
        // Note that the counter is not protected by a lock or updated by atomics.
        // That is by design - we trade "lossy" counters which are exposed to
        // races during updates for a lower probe effect.
        TEVENT (Inflated enter - Futile wakeup) ;
        if (ObjectMonitor::_sync_FutileWakeups != NULL) {
           ObjectMonitor::_sync_FutileWakeups->inc() ;
        }
        ++ nWakeups ;

        // Assuming this is not a spurious wakeup we'll normally find _succ == Self.
        // We can defer clearing _succ until after the spin completes
        // TrySpin() must tolerate being called with _succ == Self.
        // Try yet another round of adaptive spinning.
        if ((Knob_SpinAfterFutile & 1) && TrySpin (Self) > 0) break ;

        // We can find that we were unpark()ed and redesignated _succ while
        // we were spinning.  That's harmless.  If we iterate and call park(),
        // park() will consume the event and return immediately and we'll
        // just spin again.  This pattern can repeat, leaving _succ to simply
        // spin on a CPU.  Enable Knob_ResetEvent to clear pending unparks().
        // Alternately, we can sample fired() here, and if set, forgo spinning
        // in the next iteration.

        if ((Knob_ResetEvent & 1) && Self->_ParkEvent->fired()) {
           Self->_ParkEvent->reset() ;
           OrderAccess::fence() ;
        }
        if (_succ == Self) _succ = NULL ;

        // Invariant: after clearing _succ a thread *must* retry _owner before parking.
        OrderAccess::fence() ;
    }

    // Egress :
    // Self has acquired the lock -- Unlink Self from the cxq or EntryList.
    // Normally we'll find Self on the EntryList .
    // From the perspective of the lock owner (this thread), the
    // EntryList is stable and cxq is prepend-only.
    // The head of cxq is volatile but the interior is stable.
    // In addition, Self.TState is stable.

    assert (_owner == Self      , "invariant") ;
    assert (object() != NULL    , "invariant") ;
    // I'd like to write:
    //   guarantee (((oop)(object()))->mark() == markOopDesc::encode(this), "invariant") ;
    // but as we're at a safepoint that's not safe.

    UnlinkAfterAcquire (Self, &node) ;
    if (_succ == Self) _succ = NULL ;

    assert (_succ != Self, "invariant") ;
    if (_Responsible == Self) {
        _Responsible = NULL ;
        OrderAccess::fence(); // Dekker pivot-point

        // We may leave threads on cxq|EntryList without a designated
        // "Responsible" thread.  This is benign.  When this thread subsequently
        // exits the monitor it can "see" such preexisting "old" threads --
        // threads that arrived on the cxq|EntryList before the fence, above --
        // by LDing cxq|EntryList.  Newly arrived threads -- that is, threads
        // that arrive on cxq after the ST:MEMBAR, above -- will set Responsible
        // non-null and elect a new "Responsible" timer thread.
        //
        // This thread executes:
        //    ST Responsible=null; MEMBAR    (in enter epilog - here)
        //    LD cxq|EntryList               (in subsequent exit)
        //
        // Entering threads in the slow/contended path execute:
        //    ST cxq=nonnull; MEMBAR; LD Responsible (in enter prolog)
        //    The (ST cxq; MEMBAR) is accomplished with CAS().
        //
        // The MEMBAR, above, prevents the LD of cxq|EntryList in the subsequent
        // exit operation from floating above the ST Responsible=null.
    }

    // We've acquired ownership with CAS().
    // CAS is serializing -- it has MEMBAR/FENCE-equivalent semantics.
    // But since the CAS() this thread may have also stored into _succ,
    // EntryList, cxq or Responsible.  These meta-data updates must be
    // visible __before this thread subsequently drops the lock.
    // Consider what could occur if we didn't enforce this constraint --
    // STs to monitor meta-data and user-data could reorder with (become
    // visible after) the ST in exit that drops ownership of the lock.
    // Some other thread could then acquire the lock, but observe inconsistent
    // or old monitor meta-data and heap data.  That violates the JMM.
    // To that end, the 1-0 exit() operation must have at least STST|LDST
    // "release" barrier semantics.  Specifically, there must be at least a
    // STST|LDST barrier in exit() before the ST of null into _owner that drops
    // the lock.   The barrier ensures that changes to monitor meta-data and data
    // protected by the lock will be visible before we release the lock, and
    // therefore before some other thread (CPU) has a chance to acquire the lock.
    // See also: http://gee.cs.oswego.edu/dl/jmm/cookbook.html.
    //
    // Critically, any prior STs to _succ or EntryList must be visible before
    // the ST of null into _owner in the *subsequent* (following) corresponding
    // monitorexit.  Recall too, that in 1-0 mode monitorexit does not necessarily
    // execute a serializing instruction.

    if (SyncFlags & 8) {
       OrderAccess::fence() ;
    }
    return ;
}
```

当线程被唤醒时，会从挂起的点继续执行，通过ObjectMonitor::TryLock尝试获取锁，TryLock方法实现如下：

```c++
int ObjectMonitor::TryLock (Thread * Self) {
   for (;;) {
      void * own = _owner ;
      if (own != NULL) return 0 ;
      // CAS
      if (Atomic::cmpxchg_ptr (Self, &_owner, NULL) == NULL) {
         // Either guarantee _recursions == 0 or set _recursions = 0.
         assert (_recursions == 0, "invariant") ;
         assert (_owner == Self, "invariant") ;
         // CONSIDER: set or assert that OwnerIsThread == 1
         return 1 ;
      }
      // The lock had been free momentarily, but we lost the race to the lock.
      // Interference -- the CAS failed.
      // We can either return -1 or retry.
      // Retry doesn't make as much sense because the lock was just acquired.
      if (true) return -1 ;
   }
}
```

以上代码概括流程如下：

1. 当前线程被封装成ObjectWaiter对象node，状态设置为ObjectWaiter::TS_CXQ
2. 在for循环中，通过CAS把node节点Push到_cxq列表中，同一时刻可能有多个线程吧自己的node节点push到 _cxq列表中
3. node节点push到_cxq列表之后，通过自旋尝试获取锁，如果还是被有获取到锁，则通过Park将当前线程挂起，等待被唤醒
4. 当该线程被唤醒时，会从挂起点继续执行，通过ObjectWaiter::TryLock尝试获取锁

## monitor释放

当某个持有锁的线程执行完同步代码块时，会进行锁的释放。通过退出monitor的方式实现锁的释放，并通知被阻塞的线程，具体实现位于ObjectMonitor的exit方法中

```c++
void ATTR ObjectMonitor::exit(bool not_suspended, TRAPS) {
   Thread * Self = THREAD ;
   if (THREAD != _owner) {
     if (THREAD->is_lock_owned((address) _owner)) {
       // Transmute _owner from a BasicLock pointer to a Thread address.
       // We don't need to hold _mutex for this transition.
       // Non-null to Non-null is safe as long as all readers can
       // tolerate either flavor.
       assert (_recursions == 0, "invariant") ;
       _owner = THREAD ;
       _recursions = 0 ;
       OwnerIsThread = 1 ;
     } else {
       // NOTE: we need to handle unbalanced monitor enter/exit
       // in native code by throwing an exception.
       // TODO: Throw an IllegalMonitorStateException ?
       TEVENT (Exit - Throw IMSX) ;
       assert(false, "Non-balanced monitor enter/exit!");
       if (false) {
          THROW(vmSymbols::java_lang_IllegalMonitorStateException());
       }
       return;
     }
   }

   if (_recursions != 0) {
     _recursions--;        // this is simple recursive enter
     TEVENT (Inflated exit - recursive) ;
     return ;
   }

   // Invariant: after setting Responsible=null an thread must execute
   // a MEMBAR or other serializing instruction before fetching EntryList|cxq.
   if ((SyncFlags & 4) == 0) {
      _Responsible = NULL ;
   }

#if INCLUDE_TRACE
   // get the owner's thread id for the MonitorEnter event
   // if it is enabled and the thread isn't suspended
   if (not_suspended && Tracing::is_event_enabled(TraceJavaMonitorEnterEvent)) {
     _previous_owner_tid = SharedRuntime::get_java_tid(Self);
   }
#endif

   for (;;) {
      assert (THREAD == _owner, "invariant") ;


      if (Knob_ExitPolicy == 0) {
         // release semantics: prior loads and stores from within the critical section
         // must not float (reorder) past the following store that drops the lock.
         // On SPARC that requires MEMBAR #loadstore|#storestore.
         // But of course in TSO #loadstore|#storestore is not required.
         // I'd like to write one of the following:
         // A.  OrderAccess::release() ; _owner = NULL
         // B.  OrderAccess::loadstore(); OrderAccess::storestore(); _owner = NULL;
         // Unfortunately OrderAccess::release() and OrderAccess::loadstore() both
         // store into a _dummy variable.  That store is not needed, but can result
         // in massive wasteful coherency traffic on classic SMP systems.
         // Instead, I use release_store(), which is implemented as just a simple
         // ST on x64, x86 and SPARC.
         OrderAccess::release_store_ptr (&_owner, NULL) ;   // drop the lock
         OrderAccess::storeload() ;                         // See if we need to wake a successor
         if ((intptr_t(_EntryList)|intptr_t(_cxq)) == 0 || _succ != NULL) {
            TEVENT (Inflated exit - simple egress) ;
            return ;
         }
         TEVENT (Inflated exit - complex egress) ;

         // Normally the exiting thread is responsible for ensuring succession,
         // but if other successors are ready or other entering threads are spinning
         // then this thread can simply store NULL into _owner and exit without
         // waking a successor.  The existence of spinners or ready successors
         // guarantees proper succession (liveness).  Responsibility passes to the
         // ready or running successors.  The exiting thread delegates the duty.
         // More precisely, if a successor already exists this thread is absolved
         // of the responsibility of waking (unparking) one.
         //
         // The _succ variable is critical to reducing futile wakeup frequency.
         // _succ identifies the "heir presumptive" thread that has been made
         // ready (unparked) but that has not yet run.  We need only one such
         // successor thread to guarantee progress.
         // See http://www.usenix.org/events/jvm01/full_papers/dice/dice.pdf
         // section 3.3 "Futile Wakeup Throttling" for details.
         //
         // Note that spinners in Enter() also set _succ non-null.
         // In the current implementation spinners opportunistically set
         // _succ so that exiting threads might avoid waking a successor.
         // Another less appealing alternative would be for the exiting thread
         // to drop the lock and then spin briefly to see if a spinner managed
         // to acquire the lock.  If so, the exiting thread could exit
         // immediately without waking a successor, otherwise the exiting
         // thread would need to dequeue and wake a successor.
         // (Note that we'd need to make the post-drop spin short, but no
         // shorter than the worst-case round-trip cache-line migration time.
         // The dropped lock needs to become visible to the spinner, and then
         // the acquisition of the lock by the spinner must become visible to
         // the exiting thread).
         //

         // It appears that an heir-presumptive (successor) must be made ready.
         // Only the current lock owner can manipulate the EntryList or
         // drain _cxq, so we need to reacquire the lock.  If we fail
         // to reacquire the lock the responsibility for ensuring succession
         // falls to the new owner.
         //
         if (Atomic::cmpxchg_ptr (THREAD, &_owner, NULL) != NULL) {
            return ;
         }
         TEVENT (Exit - Reacquired) ;
      } else {
         if ((intptr_t(_EntryList)|intptr_t(_cxq)) == 0 || _succ != NULL) {
            OrderAccess::release_store_ptr (&_owner, NULL) ;   // drop the lock
            OrderAccess::storeload() ;
            // Ratify the previously observed values.
            if (_cxq == NULL || _succ != NULL) {
                TEVENT (Inflated exit - simple egress) ;
                return ;
            }

            // inopportune interleaving -- the exiting thread (this thread)
            // in the fast-exit path raced an entering thread in the slow-enter
            // path.
            // We have two choices:
            // A.  Try to reacquire the lock.
            //     If the CAS() fails return immediately, otherwise
            //     we either restart/rerun the exit operation, or simply
            //     fall-through into the code below which wakes a successor.
            // B.  If the elements forming the EntryList|cxq are TSM
            //     we could simply unpark() the lead thread and return
            //     without having set _succ.
            if (Atomic::cmpxchg_ptr (THREAD, &_owner, NULL) != NULL) {
               TEVENT (Inflated exit - reacquired succeeded) ;
               return ;
            }
            TEVENT (Inflated exit - reacquired failed) ;
         } else {
            TEVENT (Inflated exit - complex egress) ;
         }
      }

      guarantee (_owner == THREAD, "invariant") ;

      ObjectWaiter * w = NULL ;
      int QMode = Knob_QMode ;

      //QMode == 2 :直接绕过EntryList队列，从cxq中回去线程用于竞争锁
      if (QMode == 2 && _cxq != NULL) {
          // QMode == 2 : cxq has precedence over EntryList.
          // Try to directly wake a successor from the cxq.
          // If successful, the successor will need to unlink itself from cxq.
          w = _cxq ;
          assert (w != NULL, "invariant") ;
          assert (w->TState == ObjectWaiter::TS_CXQ, "Invariant") ;
          ExitEpilog (Self, w) ;
          return ;
      }

       // QMode == 3 :cxq队列插入EntryList尾部
      if (QMode == 3 && _cxq != NULL) {
          // Aggressively drain cxq into EntryList at the first opportunity.
          // This policy ensure that recently-run threads live at the head of EntryList.
          // Drain _cxq into EntryList - bulk transfer.
          // First, detach _cxq.
          // The following loop is tantamount to: w = swap (&cxq, NULL)
          w = _cxq ;
          for (;;) {
             assert (w != NULL, "Invariant") ;
             ObjectWaiter * u = (ObjectWaiter *) Atomic::cmpxchg_ptr (NULL, &_cxq, w) ;
             if (u == w) break ;
             w = u ;
          }
          assert (w != NULL              , "invariant") ;

          ObjectWaiter * q = NULL ;
          ObjectWaiter * p ;
          for (p = w ; p != NULL ; p = p->_next) {
              guarantee (p->TState == ObjectWaiter::TS_CXQ, "Invariant") ;
              p->TState = ObjectWaiter::TS_ENTER ;
              p->_prev = q ;
              q = p ;
          }

          // Append the RATs to the EntryList
          // TODO: organize EntryList as a CDLL so we can locate the tail in constant-time.
          ObjectWaiter * Tail ;
          for (Tail = _EntryList ; Tail != NULL && Tail->_next != NULL ; Tail = Tail->_next) ;
          if (Tail == NULL) {
              _EntryList = w ;
          } else {
              Tail->_next = w ;
              w->_prev = Tail ;
          }

          // Fall thru into code that tries to wake a successor from EntryList
      }

      // QMode == 4： cxq队列插入到EntryList头部
      if (QMode == 4 && _cxq != NULL) {
          // Aggressively drain cxq into EntryList at the first opportunity.
          // This policy ensure that recently-run threads live at the head of EntryList.

          // Drain _cxq into EntryList - bulk transfer.
          // First, detach _cxq.
          // The following loop is tantamount to: w = swap (&cxq, NULL)
          w = _cxq ;
          for (;;) {
             assert (w != NULL, "Invariant") ;
             ObjectWaiter * u = (ObjectWaiter *) Atomic::cmpxchg_ptr (NULL, &_cxq, w) ;
             if (u == w) break ;
             w = u ;
          }
          assert (w != NULL              , "invariant") ;

          ObjectWaiter * q = NULL ;
          ObjectWaiter * p ;
          for (p = w ; p != NULL ; p = p->_next) {
              guarantee (p->TState == ObjectWaiter::TS_CXQ, "Invariant") ;
              p->TState = ObjectWaiter::TS_ENTER ;
              p->_prev = q ;
              q = p ;
          }

          // Prepend the RATs to the EntryList
          if (_EntryList != NULL) {
              q->_next = _EntryList ;
              _EntryList->_prev = q ;
          }
          _EntryList = w ;

          // Fall thru into code that tries to wake a successor from EntryList
      }

      // 找到w,执行唤醒
      w = _EntryList  ;
      if (w != NULL) {
          // I'd like to write: guarantee (w->_thread != Self).
          // But in practice an exiting thread may find itself on the EntryList.
          // Lets say thread T1 calls O.wait().  Wait() enqueues T1 on O's waitset and
          // then calls exit().  Exit release the lock by setting O._owner to NULL.
          // Lets say T1 then stalls.  T2 acquires O and calls O.notify().  The
          // notify() operation moves T1 from O's waitset to O's EntryList. T2 then
          // release the lock "O".  T2 resumes immediately after the ST of null into
          // _owner, above.  T2 notices that the EntryList is populated, so it
          // reacquires the lock and then finds itself on the EntryList.
          // Given all that, we have to tolerate the circumstance where "w" is
          // associated with Self.
          assert (w->TState == ObjectWaiter::TS_ENTER, "invariant") ;
          ExitEpilog (Self, w) ;
          return ;
      }

      // If we find that both _cxq and EntryList are null then just
      // re-run the exit protocol from the top.
      w = _cxq ;
      if (w == NULL) continue ;

      // Drain _cxq into EntryList - bulk transfer.
      // First, detach _cxq.
      // The following loop is tantamount to: w = swap (&cxq, NULL)
      for (;;) {
          assert (w != NULL, "Invariant") ;
          ObjectWaiter * u = (ObjectWaiter *) Atomic::cmpxchg_ptr (NULL, &_cxq, w) ;
          if (u == w) break ;
          w = u ;
      }
      TEVENT (Inflated exit - drain cxq into EntryList) ;

      assert (w != NULL              , "invariant") ;
      assert (_EntryList  == NULL    , "invariant") ;

      // Convert the LIFO SLL anchored by _cxq into a DLL.
      // The list reorganization step operates in O(LENGTH(w)) time.
      // It's critical that this step operate quickly as
      // "Self" still holds the outer-lock, restricting parallelism
      // and effectively lengthening the critical section.
      // Invariant: s chases t chases u.
      // TODO-FIXME: consider changing EntryList from a DLL to a CDLL so
      // we have faster access to the tail.

      if (QMode == 1) {
         // QMode == 1 : drain cxq to EntryList, reversing order
         // We also reverse the order of the list.
         ObjectWaiter * s = NULL ;
         ObjectWaiter * t = w ;
         ObjectWaiter * u = NULL ;
         while (t != NULL) {
             guarantee (t->TState == ObjectWaiter::TS_CXQ, "invariant") ;
             t->TState = ObjectWaiter::TS_ENTER ;
             u = t->_next ;
             t->_prev = u ;
             t->_next = s ;
             s = t;
             t = u ;
         }
         _EntryList  = s ;
         assert (s != NULL, "invariant") ;
      } else {
         // QMode == 0 or QMode == 2
         _EntryList = w ;
         ObjectWaiter * q = NULL ;
         ObjectWaiter * p ;
         for (p = w ; p != NULL ; p = p->_next) {
             guarantee (p->TState == ObjectWaiter::TS_CXQ, "Invariant") ;
             p->TState = ObjectWaiter::TS_ENTER ;
             p->_prev = q ;
             q = p ;
         }
      }

      // In 1-0 mode we need: ST EntryList; MEMBAR #storestore; ST _owner = NULL
      // The MEMBAR is satisfied by the release_store() operation in ExitEpilog().

      // See if we can abdicate to a spinner instead of waking a thread.
      // A primary goal of the implementation is to reduce the
      // context-switch rate.
      if (_succ != NULL) continue;

      w = _EntryList  ;
      if (w != NULL) {
          guarantee (w->TState == ObjectWaiter::TS_ENTER, "invariant") ;
          ExitEpilog (Self, w) ;
          return ;
      }
   }
}
```

1. 退出同步代码块会让\_recursions减1,当\_recursions 为0时，说明线程释放了锁。
2. 根据不同策略（由Qmode指定，从cxq或entryList中获取头节点，通过）ObjectMonitor::ExitEpilog方法唤醒该节点封装的线程，唤醒操作最终有unpark完成，实现如下：

```c++
void ObjectMonitor::ExitEpilog (Thread * Self, ObjectWaiter * Wakee) {
   assert (_owner == Self, "invariant") ;

   // Exit protocol:
   // 1. ST _succ = wakee
   // 2. membar #loadstore|#storestore;
   // 2. ST _owner = NULL
   // 3. unpark(wakee)

   _succ = Knob_SuccEnabled ? Wakee->_thread : NULL ;
   ParkEvent * Trigger = Wakee->_event ;

   // Hygiene -- once we've set _owner = NULL we can't safely dereference Wakee again.
   // The thread associated with Wakee may have grabbed the lock and "Wakee" may be
   // out-of-scope (non-extant).
   Wakee  = NULL ;

   // Drop the lock
   OrderAccess::release_store_ptr (&_owner, NULL) ;
   OrderAccess::fence() ;                               // ST _owner vs LD in unpark()

   if (SafepointSynchronize::do_call_back()) {
      TEVENT (unpark before SAFEPOINT) ;
   }

   DTRACE_MONITOR_PROBE(contended__exit, this, object(), Self);
    // 唤醒之前被park()挂起的线程
   Trigger->unpark() ;

   // Maintain stats and report events to JVMTI
   if (ObjectMonitor::_sync_Parks != NULL) {
      ObjectMonitor::_sync_Parks->inc() ;
   }
}
```

被唤醒的线程，会回到ATTR ObjectMonitor::EnterI (TRAPS)继续执行monitor竞争

```c++
// park self
if (_Responsible == Self || (SyncFlags & 1)) {
    TEVENT (Inflated enter - park TIMED) ;
    Self->_ParkEvent->park ((jlong) RecheckInterval) ;
    // Increase the RecheckInterval, but clamp the value.
    RecheckInterval *= 8 ;
    if (RecheckInterval > 1000) RecheckInterval = 1000 ;
} else {
    TEVENT (Inflated enter - park UNTIMED) ;
    Self->_ParkEvent->park() ;
}

if (TryLock(Self) > 0) break ;
```



## monitor是重量级锁

ObjectMonitor的函数调用中会涉及到Atomic::cmpxchg_ptr，Atimic::inc_ptr等内核函数，执行同步代码块，没有竞争到锁的对象会被park()挂起，竞争到锁的线程会unpark()唤醒。这个时候会存在操作系统用户态和内核态的转换，这个切换会消耗大量的系统资源，所以synchronized是java语言中的一个重量级(Heavyweight)的操作。

![Screenshot_20200530_171931](https://images.ansore.top/i/2022/05/01/626e311ad8f1c.png)

Linux操作系统的体系架构分为：用户空间和内核

内核：本质上可以理解成一种软件，控制计算机硬件资源，提供上层应用程序的运行环境

用户空间：上层应用程序活动的空间，应用程序的执行必须依托与内核提供的资源，包括CPU、存储资源、I/O资源等

系统调用：为了使上层应用能访问这些资源，内核必须为上层应用提供访问接口：即系统调用

系统调用过程：

1. 用户态程序将一些数值存放寄存器中，或是使用参数创建一个堆栈，以此表明需要操作系统提供服务
2. 用户态程序执行系统调用
3. CPU切换到内核态，并跳到位于内存指定位置的指令
4. 系统调用处理器(system call handler)会读取程序存放入内存的数据参数，并执行程序请求的服务。
5. 系统调用完成后，操作系统会重置CPU为用户态并返回系统调用的结果

在用户态和内核态的切换过程中，需要传递许多变量，同时内核还需要保存好用户态在切换时的一些寄存器的值、变量等，以备内核态切换回用户态。这种切换会带来巨大的资源消耗



# JDK6  Synchronized优化

## CAS

Compare And Swap，现在CPU广泛支持的一种对内存中共享数据进行操作的一种特殊指令

CAS可以将比较和交换转换为原子操作，这个原子操作直接由CPU保证，CAS可以保证共享变量赋值时的原子操作。

CAS操作依赖3个值：内存中的值V，旧的预估值X，要修改的新值B，如果旧的预估值X等于内存中值V,就将新的值保存到内存中。

```java
package com.ansore.cas;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 演示原子性问题
 * 1.定义一个共享变量number
 * 2.对number进行1000次++操作
 * 3.使用5个线程进行
 */
public class Demo01 {
    // 1.定义一个共享变量number
    private static AtomicInteger atomicInteger = new AtomicInteger();

    public static void main(String[] args) throws InterruptedException {
        // 2.对number进行1000次
        Runnable increment = () -> {
            for(int i = 0; i < 1000; i ++) {
                atomicInteger.incrementAndGet();
            }
        };
        List<Thread> list = new ArrayList<>();
        // 3.使用5个线程来进行
        for(int i = 0; i < 500; i ++) {
            Thread t = new Thread(increment);
            t.start();
            list.add(t);
        }
        for(Thread t : list) {
            // 等待线程执行完毕
            t.join();
        }

        System.out.println("number=" + atomicInteger.get());
    }
}
```

### CAS原理

Unsafe类提供原子操作

Unsafe类可以操作内存空间。同时也带来指针问题，过度使用Unsafe类会使得出错几率变大。Unsafe对象不能直接调用，只能通过反射获得

![Screenshot_20200530_175229](https://images.ansore.top/i/2022/05/01/626e312911b39.png)

### 乐观锁和悲观锁

悲观锁，每次拿数据都认为别人会修改，所以在每次拿数据都会上锁，这样别人想拿到数据时就会阻塞。因此synchronized我们也称其为悲观锁，JDK中ReentrantLock也是一种悲观锁。性能较差！

乐观锁，每次去拿数据都会认为别人不会修改，就算修改了也没关系，重试即可，所以不会上锁。但是总是在更新时判断一下在此期间别人有没有去修改这个数据，如果没有则更新，有则重试。

CAS这种机制可以称为乐观锁，综合性能较好。

CAS共享变量时，为了保证该变量的可见性，需要使用volatile修饰，结合CAS和volatile可以实现无锁并发，适合于竞争不激烈、多核CPU的场景下：

1. 因为没有synchronized，所以线程不会阻塞，这是效率提升的因素之一
2. 如果竞争激烈，可以想到重试必然会频繁发生，反而效率会受影响

### Synchronized锁升级过程

JDK1.6锁升级，包含偏向锁、轻量级锁和适应性自旋、锁消除、锁粗化等。这些技术都是为了线程间更高效的数据共享

无锁->偏向锁->轻量级锁->重量级锁

## java对象的布局

JVM中，对象在内存中的布局分为三块区域：对象头、实例数据和对齐填充：

![Screenshot_20200530_180450](https://images.ansore.top/i/2022/05/01/626e3131c18c3.png)

### 对象头

HotSpot采用InstanceOopDesc和arrayOopDesc来描述对象头，arrayOopDesc对象用来描述数组类型。InstanceOopDesc的定义的在HotSpot源码中instanceOop.hpp文件中，arrayOopDesc的定义对应arrayOop.hpp。

```c++
class instanceOopDesc : public oopDesc {
 public:
  // aligned header size.
  static int header_size() { return sizeof(instanceOopDesc)/HeapWordSize; }

  // If compressed, the offset of the fields of the instance may not be aligned.
  static int base_offset_in_bytes() {
    // offset computation code breaks if UseCompressedClassPointers
    // only is true
    return (UseCompressedOops && UseCompressedClassPointers) ?
             klass_gap_offset_in_bytes() :
             sizeof(instanceOopDesc);
  }

  static bool contains_field_offset(int offset, int nonstatic_field_size) {
    int base_in_bytes = base_offset_in_bytes();
    return (offset >= base_in_bytes &&
            (offset-base_in_bytes) < nonstatic_field_size * heapOopSize);
  }
};
```

继承了oopDesc：

```c++
class oopDesc {
  friend class VMStructs;
 private:
  volatile markOop  _mark;
  union _metadata {
    Klass*      _klass;
    narrowKlass _compressed_klass;
  } _metadata;

  // Fast access to barrier set.  Must be initialized.
  static BarrierSet* _bs;
    
  // 省略
};
```

在普通实例对象中，oopDesc的定义包含两个成员：\_mark和\_metadata

\_mark表示对象标记、属于markOop类型，记录了对象和锁有关的信息

\_metadata表示类元信息，类元信息存储的是对象指向它的类元数据(Klass)的首地址，其中Klass表示普通指针、\_compressed_klass表示压缩类指针

对象头由两部分组成，一部分用于存储自身运行时数据，称之为mark word，另一部分是类型指针，及对象指向它的类元数据的指针。

#### mark word

mark word用于存储对象自身的运行时数据，如哈希码(HashCode)，GC分代年龄、锁状态标志、线程持有的锁、偏向线程ID、偏向时间戳等等，占用内存大小与虚拟机位长一致，mark word对应的类型是markOop，源码位于markOop.hpp中

```c++
//  32 bits:
//  --------
//             hash:25 ------------>| age:4    biased_lock:1 lock:2 (normal object)
//             JavaThread*:23 epoch:2 age:4    biased_lock:1 lock:2 (biased object)
//             size:32 ------------------------------------------>| (CMS free block)
//             PromotedObject*:29 ---------->| promo_bits:3 ----->| (CMS promoted object)
//
//  64 bits:
//  --------
//  unused:25 hash:31 -->| unused:1   age:4    biased_lock:1 lock:2 (normal object)
//  JavaThread*:54 epoch:2 unused:1   age:4    biased_lock:1 lock:2 (biased object)
//  PromotedObject*:61 --------------------->| promo_bits:3 ----->| (CMS promoted object)
//  size:64 ----------------------------------------------------->| (CMS free block)

//    [JavaThread* | epoch | age | 1 | 01]       lock is biased toward given thread
//    [0           | epoch | age | 1 | 01]       lock is anonymously biased
//
//  - the two lock bits are used to describe three states: locked/unlocked and monitor.
//
//    [ptr             | 00]  locked             ptr points to real header on stack
//    [header      | 0 | 01]  unlocked           regular object header
//    [ptr             | 10]  monitor            inflated lock (header is wapped out)
//    [ptr             | 11]  marked             used by markSweep to mark an object
//                                               not valid at any other time
```



![Screenshot_20200530_183219](https://images.ansore.top/i/2022/05/01/626e313d854a6.png)

在64位虚拟机下，mark word是64bit大小，其存储结构如下：

![Screenshot_20200530_183329](https://images.ansore.top/i/2022/05/01/626e314685eda.png)

在32位虚拟机下，mark word是32bit大小，其存储结构如下：

![Screenshot_20200530_215527](https://images.ansore.top/i/2022/05/01/626e314e04fd7.png)



#### klass pointer

这一部分用于存储对象的类型指针，该指针指向它的类元数据，JVM通过这个指针确定对象良哪个类的实例。该指针的位长度为jVM的一个字大小，即32位的JVM为32位，64位的jVM为64位。

如果应用的对象过多，使用64位指针将大量浪费内存，统计而言，64位的JVM将会比32位的JVM多耗费50%的内存，为了节约内存可以使用选项-XX:+UseCompressedOops开启指针压缩，其中，oop即ordinary object pointer普通对象指针。开启该选项后，下列指针将压缩至32位：

1. 每个class的属性指针（即静态变量）
2. 每个对象的属性指针（即对象变量）
3. 普通对象数组的每个元素指针

当然，也不是所有的指针都会压缩，一些特殊类型的指针JVM不会优化，比如指向PermGen的Class对象指针(JDK8中指向元空间的Class对象指针)、本地变量、堆栈元素、入参、返回值和NULL指针等



对象头 = Mark Word + 类型指针（未开启指针压缩的情况）

32位系统中，Mark Word = 4 byte ，类型指针=4 bytes，对象头=8bytes = 64bits

64位系统中，Mark Word = 8 byte ，类型指针=8 bytes，对象头=16bytes = 64bits

#### 实例数据

类中定义的成员变量

#### 对齐填充

对齐填充并不是必然存在的，也没有什么特别的意义，它仅仅起着占位符的作用，由于HotSpot VM的自动内存管理系统要求对象的起始地址必须是8字节的整数倍，换句话说，就是对象的大小必须是8字节的整数倍，而对象头正好是8字节的倍数，因此，当对象实例数据部分没有对齐时，就需要通过对齐填充来补充。

#### 查看JAVA对象布局

pom引入：

```xml
<dependency>
    <groupId>org.openjdk.jol</groupId>
    <artifactId>jol-core</artifactId>
    <version>0.9</version>
</dependency>
```

创建一个类：

```java
public class LockObj {
    private int x;
}
```

测试代码：

```java
public class Demo01 {
    public static void main(String[] args) {
        LockObj lockObj = new LockObj();
        System.out.println(ClassLayout.parseInstance(lockObj).toPrintable());
    }
}
```

运行结果：

```
// 默认开启指针压缩
com.ansore.object_layout.LockObj object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4        (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     4        (object header)                           43 c1 00 f8 (01000011 11000001 00000000 11111000) (-134168253)
     12     4    int LockObj.x                                 0
Instance size: 16 bytes
Space losses: 0 bytes internal + 0 bytes external = 0 bytes total

// 运行参数去掉指针压缩 -XX:-UseCompressedOops
com.ansore.object_layout.LockObj object internals:
 OFFSET  SIZE   TYPE DESCRIPTION                               VALUE
      0     4        (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4        (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     4        (object header)                           d8 a4 94 f2 (11011000 10100100 10010100 11110010) (-225139496)
     12     4        (object header)                           92 7f 00 00 (10010010 01111111 00000000 00000000) (32658)
     16     4    int LockObj.x                                 0
     20     4        (loss due to the next object alignment)
Instance size: 24 bytes
Space losses: 0 bytes internal + 4 bytes external = 4 bytes total
```

开启指针压缩的情况下，改变类的结构：

```java
public class LockObj {
    private int x;
    private boolean b;
}
```

此时运行结果

```
com.ansore.object_layout.LockObj object internals:
 OFFSET  SIZE      TYPE DESCRIPTION                               VALUE
      0     4           (object header)                           01 00 00 00 (00000001 00000000 00000000 00000000) (1)
      4     4           (object header)                           00 00 00 00 (00000000 00000000 00000000 00000000) (0)
      8     4           (object header)                           43 c1 00 f8 (01000011 11000001 00000000 11111000) (-134168253)
     12     4       int LockObj.x                                 0
     16     1   boolean LockObj.b                                 false
     17     7           (loss due to the next object alignment)
Instance size: 24 bytes
Space losses: 0 bytes internal + 7 bytes external = 7 bytes total
```

自动填充了7个字节

HashCode值只有调用hashcode方法的时候才会生成

调用转成16进制：

```java
public class Demo01 {
    public static void main(String[] args) {
        LockObj lockObj = new LockObj();
        System.out.println(Integer.toHexString(lockObj.hashCode()));
        System.out.println(ClassLayout.parseInstance(lockObj).toPrintable());
    }
}
```

结果为

```
135fbaa4

com.ansore.object_layout.LockObj object internals:
 OFFSET  SIZE      TYPE DESCRIPTION                               VALUE
      0     4           (object header)                           01 a4 ba 5f (00000001 10100100 10111010 01011111) (1606067201)
      4     4           (object header)                           13 00 00 00 (00010011 00000000 00000000 00000000) (19)
      8     4           (object header)                           43 c1 00 f8 (01000011 11000001 00000000 11111000) (-134168253)
     12     4       int LockObj.x                                 0
     16     1   boolean LockObj.b                                 false
     17     7           (loss due to the next object alignment)
Instance size: 24 bytes
Space losses: 0 bytes internal + 7 bytes external = 7 bytes total
```

可以看到hashcode排列是反过来的，出现以上情况的原因是字节排列方式有以下两种情况

![Screenshot_20200530_221154](https://images.ansore.top/i/2022/05/01/626e31580473a.png)



## 偏向锁

锁会偏向于第一个获得它的线程，会在对象头存储锁偏向的线程ID，以后该线程进入和推出只需检查是否为偏向锁、锁标志位以及ThreadID即可

![Screenshot_20200530_183329](https://images.ansore.top/i/2022/05/01/626e314685eda.png)

不过一旦出现多个线程竞争时，必须撤销偏向锁，所以撤销偏向锁的性能必须小于之前省下来的CAS原子操作的性能消耗，不然就得不偿失了

适合反复是同一个线程执行的同步代码块

### 偏向锁实例

```java
// -XX:BiasedLockingStartupDelay=0 关闭延迟
public class Demo01 {
    public static void main(String[] args) {
        MyThread myThread = new MyThread();
        myThread.start();
    }
}

class MyThread extends Thread {
    static Object object = new Object();

    @Override
    public void run() {

        for(int i = 0; i < 5; i ++) {
            synchronized (object) {
                System.out.println(ClassLayout.parseInstance(object).toPrintable());
            }
        }
    }
}
```

打印的对象最后一个字节如下：

```java
00000101
```

此时便为偏向锁

### 偏向锁原理

当线程第一次访问同步块并获取锁时，偏向锁处理流程如下：

1. 检测Mark Word是否为可偏向状态，即是否为偏向锁1，锁标识位01
2. 若为可偏向状态，则测试线程ID是否为当前线程ID,如果是，执行同步代码块，否则执行步骤（3）
3. 如果测试线程ID不为当前线程ID，则通过CAS操作将Mark Word的线程ID替换为当前线程ID，执行同步代码块

持有偏向锁的线程以后每次进入这个锁相关的同步块时，虚拟机都可以不再进行任何同步操作，偏向锁的效率高。

### 偏向锁的撤销

1. 偏向锁的撤销动作必须等待全局安全点
2. 暂时拥有的偏向锁线程，判断锁对象是否处于被锁定状态
3. 撤销偏向锁，恢复到无锁（标志位为01）或轻量级锁（标志位为00）的状态

偏向锁在java 1.6之后是默认启用的，但在程序启动几秒钟后才激活，可以使用\-XX:BiasedLockingStartupDelay=0参数关闭延迟，如果确定应用程序中所有的锁通常属于竞争状态，可以使用\-XX:-UseBiasedLocking=false参数关闭偏向锁

### 偏向锁的好处

偏向锁是在只有一个线程执行同步块时进一步提高性能，适用于一个线程反复获得同一锁的情况，偏向锁可以提高带有同步但无竞争的程序性能。

它同样是有一个带有效益权衡性质的优化，也就是说，它并不一定总是对程序有利，如果程序中大多数锁总是被多个不同的线程访问比如线程池，那偏向模式就是多余的。



## 轻量级锁

“轻量级”是相对于适用monitor的传统而言，因此传统的锁机制就称为“重量级”锁。轻量级锁并不是替代重量级锁的。

引入轻量级锁的目的：在多线程交替执行同步块的情况下，尽量避免重量级锁引起的性能消耗，但是如果多个线程在同一时刻进入临界区，会导致轻量级锁升级成重量级锁，所以轻量级锁的出现并非是要替代重量级锁。

### 轻量级锁原理

当关闭偏向锁功能或者多个线程竞争偏向锁都会导致偏向锁升级为轻量级锁，则会尝试获取轻量级锁，其步骤如下：

1. 判断当前对象是否处于无锁状态（haskcode, 0, 01），如果是，则JVM首先将在当前线程的栈帧中建立一个锁记录(Lock Record)空间，用于存储锁对象目前的Mark Word的拷贝（官方吧这份拷贝嫁了一个Displaced前缀，即Displaced Mark Word），将对象的Mark Word复制到栈帧中的Lock Record中，将Lock Record的owner指向当前对象。
2. JVM利用CAS操作尝试将对象的Mard Word更新为指向Lock Record的指针，如果成功表示竞争到锁，则将锁的标志位变为00,执行同步操作
3. 如果失败则判断当前对象的Mark Word是否指向当前线程的栈帧，如果是则表示当前线程已经持有当前对象的锁，则直接执行同步代码块;否则只能说明该对象已经被其他线程占用，这时轻量级锁需要膨胀为重量级锁，标志位变成10，后面等待的线程将会进入阻塞状态。

![Screenshot_20200530_235343](https://images.ansore.top/i/2022/05/01/626e316b64a61.png)

### 轻量级锁的释放

轻量级锁的释放也是通过CAS来进行操作的：

1. 取出轻量级锁保持你在Displaced Mark Word中的数据
2. 用CAS操作将取出的数据替换为当前对象的Mark Word中，如果成功，则说明锁释放成功
3. 如果CAS操作替换失败，说明名有其他线程尝试获取该锁，则需要将轻量级锁膨胀升级为重量级锁

对于轻量级锁，其性能提升的依据是 对于绝大部分的锁，在整个生命周期内都是不会存在竞争的 ，如果打破这个依据，则除了互斥的开销外，还有额外的CAS操作，因此在有多线程竞争的情况下，轻量级锁比重量级锁更慢

### 轻量级锁的好处

在多线程交替执行同步代码块的情况下，可以避免重量级锁的性能消耗。



## 自旋锁

前面我们讨论monitor实现锁的时候，知道monitor会阻塞和唤醒线程，线程的阻塞和唤醒需要CPU从用户态转为核心态，频繁的阻塞和唤醒对CPU来说是一件负担很重的工作，这些操作给系统的并发性能带来了很大的压力。同时，虚拟机的开发团队也注意到在许多应用上，共享数据的锁定状态只会持续很短的一段时间，为了这段时间阻塞和唤醒线程并不值得。如果物理机器有一个以上的处理器，能让两个或以上的线程同时并行执，我们就可以让后面请求锁的那个线程"稍等一下"，但不放弃处理器的执行时间,看看持有锁的线程是否很快就会释放锁。为了让线程等待，我们只需让线程执行一个忙循环(自旋)，这项技术就是所谓的自旋锁。

自旋锁在JDK1.4.2中就已经引入，只不过默认是关闭的，可以使用-XX:+UseSpinning参数来开启，JDK6中就已经改为默认开启了。自旋等待不能代誉阻塞，且先不说对处理器数量的要求，自旋等待本身虽然避免了线程切换的开销，但它是要占用处理器时间的，因此，如果锁被占用的时间很短，自旋等待的效果就会非常好，反之，如果锁被占用的时间很长。那么自旋的线程只会白白消耗处理器资源，而不会做任何有用的工作，反而会带来性能上的浪费。因此，自旋等待的时间必须要有一定的限度，如果自旋超过了限定的次数仍然没有成功获得锁，就应当使用传统的方式去挂起线程了。自施次数的默认值是10次，用户可以使用参数\-XX:PreBlockSpin来更改。

### 适应性自旋锁

在JDK 6中引入了自适应的自旋锁。自适应意味着自旋的时间不再固定了，而是由前一次在同一个锁上的自旋时间及锁的拥有者的状态来决定。如果在同一个锁对象上，自旋等待刚刚成功获得过锁，并且持有锁的线程正在运行中，那么虚拟机就会认为这次自旋也很有可能再次成功，进而它将允许自旋等待持续相对更长的时间，比如100次循环。另外，如果对于某个锁，自旋很少成功获得过，那在以后要获取这个锁时将可能省略掉自旋过程，以避免浪费处理器资源。有了自适应自旋，随着程序运行和性能监控信息的不断完善，虚拟机对程序锁的状况预测就会越越准确，虚拟机就会变得越来越聪明"了。

自旋锁部分实现：

```c++
int ObjectMonitor::TrySpin_VaryDuration (Thread * Self) {
    static int Knob_FixedSpin          = 0 ;
    // Dumb, brutal spin.  Good for comparative measurements against adaptive spinning.
    // 自旋次数
    int ctr = Knob_FixedSpin ;
    if (ctr != 0) {
        while (--ctr >= 0) {
            if (TryLock (Self) > 0) return 1 ;
            // 等待
            SpinPause () ;
        }
        return 0 ;
    }

    static int Knob_PreSpin            = 10 ;      // 20-100 likely better

    // 适应性自旋
    for (ctr = Knob_PreSpin + 1; --ctr >= 0 ; ) {
        if (TryLock(Self) > 0) {
            // Increase _SpinDuration ...
            // Note that we don't clamp SpinDuration precisely at SpinLimit.
            // Raising _SpurDuration to the poverty line is key.
            int x = _SpinDuration ;
            if (x < Knob_SpinLimit) {
                if (x < Knob_Poverty) x = Knob_Poverty ;
                // 说明获取锁的可能性较大，增大自旋时间
                _SpinDuration = x + Knob_BonusB ;
            }
            return 1 ;
        }
        SpinPause () ;
    }
    // 省略
}
```



## 锁消除

锁消除是指虚拟机即时编译器 (IT)在运行时，对一些代码上要求同步，但是被检测到不可能存在共享数据竞争的领进行消除。锁消除的主要判定依据来源于逃递分析的数据支持，如果判新在一段代码中，堆上的所有数据都断会逃逸出去从而被其他线程访问到，那就可以把它们当做上数据对待，认为它们是线程私有的，同步加核自然编无须进行。变量是否逃逸，对于虚拟机来说需要便用数据流分析来确定，但是程序员自己应该是很清楚的，怎么会在明知道不存在数据争用的情况下要求同步呢?实际上有许多同步指施并不是程序员自己加入的，同步的代码在Java程序中的普遍程度也许超过了大部分读者的想象。下面这段非常简单的代码仅仅是输出3个字符率相加n的果,无论是源码字面上还是程房语义上都没有同步。

```java
public class Demo01 {
    public static void main(String[] args) {
        contactString("aa", "bb", "cc");
    }

    public static String contactString(String s1, String s2, String s3) {
        return new StringBuffer().append(s1).append(s2).append(s3).toString();
    }
    /**
     * 同步方法使用的锁是this,(new StringBuffer())
     * 此时这个synchronized同步方法没必要，所以在编译阶段JVM就自动消除这个同步代码块
     *     @Override
     *     public synchronized StringBuffer append(String str) {
     *         toStringCache = null;
     *         super.append(str);
     *         return this;
     *     }
     */
}
```

StringBuff的append()是一个同步方法，锁就是this也就是(new StringBuffer())。虚拟机发现它的动态作用域被限制在contactString()方法内部。也就是说 new StringBuffer() 对象引用永远不会"逃逸"到contactString()方法之外，其他线程无法访问到它，因此，这里虽然有锁，但是可以安全地被消除，在及时编译之后，这段代码就会忽略掉所有的同步，而直接执行。

## 锁粗化

原则上，我们在编写引代码的时候，总是推荐将同步块的作用范围限制得尽量小，只在共享数据的实际作用域中才进行同步，这样是为了使得需要同步的操作数量尽可能变小，如果存在锁竞争，那等待锁的线程也能尽快拿到锁。大部分情况下，上面的原则都是正确的，但是如果一系列的连续操作都对同一个对象反复加锁和解锁，甚至加锁操作是出现在循环体中的，那即使没有线程竞争，频繁地进行互斥同步操作也会导致不必要的性能损耗。

```java
package com.ansore.lock_coarsing;

public class Demo01 {
    public static void main(String[] args) {
        synchronized (Demo01.class) {
            System.out.println("aaa");
        }

        /**
         *     @Override
         *     public synchronized StringBuffer append(String str) {
         *         toStringCache = null;
         *         super.append(str);
         *         return this;
         *     }
         *     这样执行会进行多次加锁、释放锁操作
         */
        StringBuffer sb = new StringBuffer();
        for (int i = 0; i < 100; i++) {
            sb.append("aa");
        }

        /**
         * 直接把一连串细小的操作都是用同一个对象加锁，将同步代码块的范围方法，放到这串操作的外面，这样只要加一次锁即可
         *      StringBuffer sb = new StringBuffer();
         *         synchronized (this) {
         *             for (int i = 0; i < 100; i++) {
         *                 sb.append("aa");
         *             }
         *         }
         */

        System.out.println(sb.toString());
    }
}
```

直接把一连串细小的操作都是用同一个对象加锁，将同步代码块的范围方法，放到这串操作的外面，这样只要加一次锁即可



# 平时写代码如何对synchronized优化

## 减少synchronized的范围

同步代码块中尽量短，减少同步代码块中代码的执行时间，减少锁竞争

```java
synchronized (Demo01.class) {
    System.out.println("aaa");
}
```

## 降低synchronized锁的粒度

将一个锁拆分为多个锁提高并发度

```java
Hashtable hs = new Hashtable();
hs.put("aa", "bb");
hs.put("xx", "yy");
// Hashtable对所有增删改查的方法都加了锁
```

![Screenshot_20200531_012618](https://images.ansore.top/i/2022/05/01/626e2e2ad0c29.png)

![d1uHilCjs3BYw2x.png](https://images.ansore.top/i/2022/05/01/626e2c6582b66.png)

![Screenshot_20200531_013112](https://images.ansore.top/i/2022/05/01/626e319633d70.png)

LinkedBlockQueue入对和出队使用不同的锁，相对于读写只有一个锁的效率要高

![cojqrb3udYWElhG](https://images.ansore.top/i/2022/05/01/626e2e0ea666c.png)

## 读写分离

读取时不加锁，写入和删除时加锁

ConcurrentHashMap, CopyOnWriteArraryList和ConyOnWriteSet
