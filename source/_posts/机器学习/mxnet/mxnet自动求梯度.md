---
title: mxnet自动求梯度
tags:
  - 机器学习
  - mxnet
categories:
  - 机器学习
cover: https://images.ansore.top/i/2022/04/28/6269696188c94.jpg
abbrlink: 7b9a92a9
date: 2018-12-30 14:06:21
---

### 求梯度实例

```python
from mxnet import autograd, nd

# 对函数y=2x(转置)x 求列向量x的梯度
x = nd.arange(4).reshape(4,1)
print(x)

# 调取attach_grad函数申请计算存储梯度所需的内存
x.attach_grad()

# record 函数要求mxnet记录求梯度相关的计算
with autograd.record():
    y = 2 * nd.dot(x.T, x)

# 调用backward自动求梯度
y.backward()

# 梯度应该为4x 验证梯度是否正确
assert (x.grad - 4 * x).norm().asscalar() == 0

print(x.grad)
```

### 训练模式和预测模式

调用record函数后，mxnet会记录并计算梯度。此外还将运行模式从预测模式转为训练模式。

```python
from mxnet import autograd

print(autograd.is_training())
with autograd.record():
    print(autograd.is_training())
```

### 对python控制流求梯度

```python
from mxnet import autograd, nd

def f(a):
    b = a * 2
    while b.norm().asscalar() < 1000:
        b = b * 2
    if b.sum().asscalar() > 0:
        c = b
    else:
        c = 100 * b
    return c

a = nd.random.normal(shape=1)

a.attach_grad()

with autograd.record():
    c = f(a)

c.backward()
print(a.grad == c / a)
```

上面定义的函数$f$。给定任意的a，其输出必然是$f(a) = x * a$的形式，其中标量西施x的值取决于输入a，由于$c = f(a)$有段a的梯度为x，且值为c/a。
