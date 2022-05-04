---
title: 初识WebService
tags:
  - java
  - WebService
categories:
  - java
cover: https://images.ansore.top/i/2022/04/27/6269303eae58b.jpg
abbrlink: 2d791364
date: 2017-03-07 16:46:52
---

WebService，一句话来说就是跨编程语言和操作系统的交互技术，实现了异构平台之间的交互，基于HTTP使用SOAP协议 JAVA自身也提供了一个WebService的实现：JAX-WS(Java API Xml For Web Service) 简单实例： 首先创建一个接口

<!-- more -->

```java
package org.test.service;

import javax.jws.WebService;

@WebService
public interface TestService {

    public int max(int a,int b);

    public int min(int a,int b);
}
```


创建它的实现类：

```java
package org.test.service;

import javax.jws.WebService;

@WebService(endpointInterface = "org.test.service.TestService")
public class TestServiceImpl implements TestService {

    @Override
    public int max(int a, int b) {
        System.out.println("max is "+(a>b?a:b));
        return a>b?a:b;
    }

    @Override
    public int min(int a, int b) {
        System.out.println("min is "+(a<b?a:b));
        return a<b?a:b;
    }
}
```


创建服务：

```java
package org.test.service;

import javax.xml.ws.Endpoint;

public class MyService {
    public static void main(String[] args) {

        String address = "http://localhost:8888/ab";

        Endpoint.publish(address, new TestServiceImpl());
    }
}
```


运行该程序，即可创建一个服务，浏览器访问"http://localhost:8888/ab?wsdl"，即可访问该服务，这就是公开的服务接口。 然后写一个客户端测试类：

```java
package org.test.service;

import java.net.MalformedURLException;
import java.net.URL;

import javax.xml.namespace.QName;
import javax.xml.ws.Service;

public class TestClient {

    public static void main(String[] args) {
        try {
            URL url = new URL("http://localhost:8888/ab?wsdl");

            QName sName = new QName("http://service.test.org/","TestServiceImplService");

            Service service = Service.create(url,sName);

            TestService ms = service.getPort(TestService.class);

            System.out.println(ms.max(11, 123));
        } catch (MalformedURLException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
    }
}
```


运行即可获得执行结果，但是这样做存在一些缺陷，这个客户端测试类依赖了一个TestService类，存在了很多局限性。 java下提供了wsimport这个工具可以实现java类的导入，切换到命令行下输入： wsimport -d d:/0001/ -keep -verbose http://localhost:8888/ns?wsdl  即可在d:/0001/目录下获得自动生成的java类，导入工程即可，但是生成的java类并不是服务端的接口类。 wsimport参数说明：      -d 指定输出路径      -keep 指定是否生成.java的源文件      -verbose 显示生成的详细过程
