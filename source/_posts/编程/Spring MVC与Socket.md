---
title: Spring MVC与Socket
tags:
  - java
  - 编程
categories:
  - 编程
abbrlink: dccbf65
date: 2016-09-26 18:19:05
---

前几天做一个项目，项目需求服务器端与手机APP用HTTP协议，与硬件用Socket协议。 服务器后端基于Spring MVC + MyBatis框架，实现与手机APP的通信没问题，但是业务需求中与硬件的交互需要用到Spring的service层的一些东西，首先创建ServerSocket监听某一端口，所以不能用Spring的IOC容器，而且Spring也没有提供这方面的IOC（控制反转），其次在Socket线程中，直接DI（依赖注入）也是不可能的，，因为这个实例都不是IOC容器托管的。 具体解决方案如下： 首先实现一个监听类来创建ServerSocket线程： web.xml:

```xml
<!–注册ServerSocket监听器–>
<listener>
<listener-class>com.test.listener.SocketServiceLoader</listener-class>
</listener>
```


SocketServiceLoader:

```java
/**
 * 监听类 启动ServerSocket 线程
 * Created by Ansore on 16-9-12.
 */
public class SocketServiceLoader implements ServletContextListener {

    //Socket服务器线程
    private ServerSocketThread serverSocketThread;

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        System.out.println("进入监听器");
        //启动线程
        if(null == serverSocketThread) {
            serverSocketThread = new ServerSocketThread();
            serverSocketThread.start();
            System.out.println("启动线程");
        }
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        //结束后销毁线程
        if(null != serverSocketThread) {
            //释放资源 , 结束线程
            serverSocketThread.destroyedServerSocket();
            serverSocketThread.interrupt();
        }
    }
}
```


创建线程后，实现了端口监听，此时要用到service层的东西，但是service实现类由IOC托管，直接new也显然不行，解决方案就是直接从Spring的IOC容器中直接获取service实例：

```java
    ApplicationContext applicationContext = new FileSystemXmlApplicationContext("classpath:spring/spring.xml");
    TestService testService = (TestService) applicationContext.getBean("testServiceImpl");
```


加载配置service的xml文件，后面一定要跟service的实现类，不然也会出错 就这样即可得到一个service实例。 这样的方法也同样可以用在其他地方获取service实例。
