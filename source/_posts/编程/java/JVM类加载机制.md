---
title: JVM类加载机制
tags:
  - jvm
  - java
categories:
  - 编程
cover: https://images.ansore.top/i/2022/04/27/6269303eae58b.jpg
abbrlink: de06556f
date: 2017-11-01 19:19:46
---

## JVM类加载机制

JVM类加载机制分为五个部分：加载（Loading）、验证（Verification）、准备（Preparation）、解析（Resolution）、初始化（Initialization）。然后 使用（Using）、卸载（Unloading）。其中验证、准备和解析统称为连接（Linking）

### 加载（Loading）

加载是第一个阶段，这个阶段会在内存中生成这个类的java.lang.Class对象，最为方法区这个类的各种数据的入口。这里并不一定要从class文件中获取，也可以从zip包中读取（jar、war）、运行时生成（动态代理）。

### 连接（Linking）

#### 验证（Verification）

这一阶段的主要目的是确保Class文件的字节流中包含的信息符合当前虚拟机的要求，并且不会危害虚拟机的安全。不同虚拟机对这个阶段的实现可能不同，大致上分为一下四个阶段的校验过程：

1. 文件格式验证。验证字节流是否符合class文件格式规范，并且是否能被当前虚拟机所处理
2. 元数据验证。对字节码描述信息进行语义分析，保证其描述的信息符合java语言的规范
3. 字节码验证。也是最复杂的一个阶段，主要对数据流和控制流进行分析。这个阶段对类的方法体进行校验，确保运行时不会危害虚拟机的安全
4. 符号引用验证。最后一个阶段发生在虚拟机将符号引用直接转化为直接引用的时候，这个转化将在连接的第三个阶段（解析）时产生。符号引用校验可以看做是对类自身以外的的信息进行匹配性的校验

#### 准备（Preparation）

准备阶段是正式给类变量分配内存并设置类变量的初始值阶段，即在方法区中分配这些变量所使用的内存空间。

#### 解析（Resolution）

解析阶段是指虚拟机将常量池中的符号引用替换为直接引用的过程

> - 符号引用与虚拟机实现的布局无关，引用的目标并不一定要已经加载到内存中。各种虚拟机实现的内存布局可以各不相同，但是它们能接受的符号引用必须是一致的，因为符号引用的字面量形式明确定义在java虚拟机规范的class文件格式中
> - 直接引用可以是指向目标的指针，相对偏移量或是一个能间接定位到目标的句柄。如果有了直接引用，那引用的目标必定已经在内存中存在

### 初始化（Initialization）

初始化阶段是类加载的最后一个阶段，前面的类加载阶段之后，除了在加载阶段可以自定义加载器以外，其他都是由虚拟机完成的。到了初始阶段，才开始真正执行类中定义的java代码

初始化阶段的执行类构造器<client>方法的过程。<client>方法是由编译器自动收集类中的类变量的赋值操作和静态语句块中的语句合并而成的。虚拟机会保证执行<client>方法之前，父类的<client>已经执行完毕。如果一个类中没有静态语句块、也没有对静态变量赋值，那么编译器可以不为这个类生成<client>方法。

## 类加载器和双亲委派模型

JVM提供的三个类加载器：

- 启动类加载器（Bootstrap ClassLoader）：负责加载 JAVA_HOME\lib 目录中的，或通过-Xbootclasspath参数指定路径中的，且被虚拟机认可（按文件名识别，如rt.jar）的类。
- 扩展类加载器(Extension ClassLoader)：负责加载 JAVA_HOME\lib\ext 目录中的，或通过java.ext.dirs系统变量指定路径中的类库。
- 应用程序类加载器(Application ClassLoader)：负责加载用户路径（classpath）上的类库。

当一个类加载器收到类加载任务，会先交给其父类加载器去完成，因此最终加载任务都会传递到顶层的启动类加载器，只有当父类加载器无法完成任务时，才会执行加载任务

 JVM通过双亲委派模型进行类的加载，同时用户也可以通过实现java.lang.ClassLoader实现自定义的类加载器。jdk中ClassLoader实现如下：

```java
    protected Class<?> loadClass(String name, boolean resolve)
        throws ClassNotFoundException
    {
        synchronized (getClassLoadingLock(name)) {
            // First, check if the class has already been loaded
            Class<?> c = findLoadedClass(name);
            if (c == null) {
                long t0 = System.nanoTime();
                try {
                    if (parent != null) {
                        c = parent.loadClass(name, false);
                    } else {
                        c = findBootstrapClassOrNull(name);
                    }
                } catch (ClassNotFoundException e) {
                    // ClassNotFoundException thrown if class not found
                    // from the non-null parent class loader
                }

                if (c == null) {
                    // If still not found, then invoke findClass in order
                    // to find the class.
                    long t1 = System.nanoTime();
                    c = findClass(name);

                    // this is the defining class loader; record the stats
                    sun.misc.PerfCounter.getParentDelegationTime().addTime(t1 - t0);
                    sun.misc.PerfCounter.getFindClassTime().addElapsedTimeFrom(t1);
                    sun.misc.PerfCounter.getFindClasses().increment();
                }
            }
            if (resolve) {
                resolveClass(c);
            }
            return c;
        }
    }
```

1. 首先通过`Class<?> c = findLoadedClass(name);`判断一个类是否被加载过
2. 如果类没有被加载过，遵循双亲委派模型，首先会递归从父类加载器开始找，直到父类加载器为Bootstrap ClassLoader为止
3. 最后分局resolve判断这个类是否需要解析

最后findClass的定义如下：

```java
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        throw new ClassNotFoundException(name);
    }
```

直接抛出了一个异常，并且方法是protected的，很明显这是留给开发者自己实现的。
