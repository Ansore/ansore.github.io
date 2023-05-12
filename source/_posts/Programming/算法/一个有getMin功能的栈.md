---
title: 一个有getMin功能的栈
tags:
  - 算法
categories:
  - 算法
cover: https://img.ansore.de/2022/04/27/62692f1609241.jpg
abbrlink: 7be922d9
date: 2017-07-06 14:16:15
---



思路：设计两个栈，一个和正常功能的栈没有区别，另一个保存每一步的最小值，每次弹出时，两个栈同时弹出，这样保证每步都保存了剩余元素的最小值。

java实现代码如下：

<!-- more -->

```java
import java.util.Stack;

public class MyStack1 {
    private Stack<Integer> stackData;
    private Stack<Integer> stackMin;

    public MyStack1() {
        stackData = new Stack<>();
        stackMin = new Stack<>();
    }

    public static void main(String[] args) {
        MyStack1 myStack1 = new MyStack1();
        try {
            myStack1.push(12);
            myStack1.push(5);
            myStack1.push(4);
            myStack1.push(11);
            myStack1.push(2);
            myStack1.push(5);
            myStack1.push(4);
            myStack1.push(11);
            myStack1.push(2);
            myStack1.push(5);
            myStack1.push(11);
            System.out.println(myStack1.getMin());
            System.out.println(myStack1.pop());
            System.out.println(myStack1.pop());
            System.out.println(myStack1.pop());
            System.out.println(myStack1.getMin());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void push(Integer data) throws Exception {
        if(this.stackMin.isEmpty()) {
            this.stackMin.push(data);
        } else if(data.intValue() < getMin()) {
            this.stackMin.push(data);
        } else {
            Integer newValue = new Integer(this.getMin());
            this.stackMin.push(newValue);
        }
        this.stackData.push(data);
    }

    public int pop() {
        if(this.stackData.isEmpty()) {
            throw new RuntimeException("The Stack Is Empty!");
        }
        this.stackMin.pop();
        return this.stackData.pop().intValue();
    }

    public int getMin() {
        if(this.stackMin.isEmpty()) {
            throw new RuntimeException("The Stack Is Empty!");
        }
        return this.stackMin.peek().intValue();
    }
}
```

