---
title: 策略模式(Strategy Pattern)
tags:
  - 设计模式
categories:
  - 设计模式
cover: https://images.ansore.top/i/2022/04/27/626944777b7d1.jpg
abbrlink: 5db9b4b7
date: 2016-10-31 18:47:37
---

策略模式是一种定义一系列算法的方法，从概念的角度来讲，算法所做的工作是相同的，只是实现不同而已，它可以用相同的方式调用所有算法，以减少算法类和算法调用类之间的耦合性。 策略模式的Strategy类层次为Context定义了一系列的可供重用的算法或行为。继承可以析取出这些算法中的公共的功能。 策略模式主要应用需要在不同时间应用不同的业务规则。 任何的需求变更都需要成本，花最小的代价或的最大的收益就是我们要做的，也是学设计模式的目的。 策略模式JAVA语言实现：

<!-- more -->

```java
package com.strategy;

public class StrategyMode {

    public static void main(String[] args) {
        Context context;
        context = new Context(new AlgonrithmA());
        context.ContextInterface();

        context = new Context(new AlgonrithmB());
        context.ContextInterface();

        context = new Context(new AlgonrithmC());
        context.ContextInterface();
    }
}

class Context {
    private Strategy strategy;
    public Context(Strategy strategy) {
        this.strategy = strategy;
    }

    public void ContextInterface() {
        strategy.AlgonrithmInterface();
    }
}

abstract class Strategy {
    public abstract void AlgonrithmInterface();
}

class AlgonrithmA extends Strategy {

    @Override
    public void AlgonrithmInterface() {
        System.out.println("算法A实现");
    }
}

class AlgonrithmB extends Strategy {
    @Override
    public void AlgonrithmInterface() {
    System.out.println("算法B实现");    
    }
}

class AlgonrithmC extends Strategy {
    @Override
    public void AlgonrithmInterface() {
        System.out.println("算法C实现");
    }
}
```
