---
title: 简单工厂模式（Simple Factory Pattern）
tags:
  - 设计模式
categories:
  - 设计模式
cover: https://img.ansore.top/2022/04/27/626944743c474.jpg
abbrlink: eaa7cc98
date: 2016-09-17 23:39:50
---

简单工厂模式又叫静态工厂方法模式。目的也很简单，就是提供一个创建对象的接口。 在编程中，我们一般遵循“高内聚低耦合”的原则，工厂模式在一定程度上降低了程序间的耦合性，增加了程序的灵活性、可扩展性。 但由于所有实例逻辑都是由工厂类所创建，所以一旦工厂类出现问题，会导致所有客户端都会受到影响，而且每增加一个产品（客户端），工厂类总是很被动，在工厂类中增加相应的业务逻辑，也违背了开闭原则（对扩展开放、对修改封闭）。 简单工厂模式java实现：

<!-- more -->

```java
/**
 * SimpleFactory
 * @author Ansore
 *
 */

public class SimpleFactory {

    public static void main(String[] args) {
        try {

            Operation operation;
            operation = OperationFactory.CreateOperation("*");
            operation.setNumA(12);
            operation.setNumB(11);
            System.out.println(operation.getResult());

        } catch (Exception e) {
            System.out.println(e);
        }
    }
}

//Create Operation
class OperationFactory {
    public static Operation CreateOperation (String operate) {
        Operation operation = null;
        switch(operate) {
        case "+":
            operation = new AddOpetarion();
            break;
        case "-":
            operation = new SubOperation();
            break;
        case "*":
            operation = new MulOperation();
            break;
        case "/":
            operation = new DivOperation();
            break;
        }
        return operation;
    }
}

// Operation Class
class Operation {
    double numA;
    double numB;

    public double getNumA() {
        return numA;
    }
    public void setNumA(double numA) {
        this.numA = numA;
    }
    public double getNumB() {
        return numB;
    }
    public void setNumB(double numB) {
        this.numB = numB;
    }

    public double getResult(){
        return 0;
    }
}

//ADD Operation
class AddOpetarion extends Operation {
    @Override
    public double getResult(){
        return numA + numB;
    }
}

//Subtract Operation
class SubOperation extends Operation {
    @Override
    public double getResult() {
        return numA - numB;
    }
}

//Multiply Operation
class MulOperation extends Operation {
    @Override
    public double getResult() {
        return numA * numB;
    }
}

//Divide Operation 
class DivOperation extends Operation {
    @Override
    public double getResult() {
        if(numB==0)
            try {
                throw new Exception("除数不能是0");
            } catch (Exception e) {
                // TODO Auto-generated catch block
                e.printStackTrace();
            }
        return numA / numB;
    }
}
```
