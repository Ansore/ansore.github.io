---
title: mxnet数据操作
tags:
  - 机器学习
  - mxnet
categories:
  - 机器学习
abbrlink: 81968f16
date: 2018-12-30 12:48:36
---

### 创建NDArray

```python
from mxnet import nd

# 创建行向量
x = nd.arange(12)
print(x)

# 打印实例形状
print(x.shape)
# 输出 (12,)

# 改变实例形状
x = x.reshape((3,4))
# x = x.reshape((-1,4))
print(x)

# 创建各项为0 形状为(2,3,4)的张量
print(nd.zeros((2,3,4)))

# 创建各项为1 形状为(2,3,4)的张量
print(nd.ones((2,3,4)))

# 创建指定元素的张量
y = nd.array([[1,2,3,4], [2,3,5,6], [2,5,7,8]])
print(y)

# 随机生成 形状为(3,4) 每个元素均服从N(0,1)的正态分布
z = nd.random.normal(0, 1, shape=(3,4))
print(z)
```

### 运算

```python
from mxnet import nd

# 创建向量
x = nd.arange(12)
x = x.reshape((3,4))
y = nd.array([[1,2,3,4], [2,3,5,6], [2,5,7,8]])

# 按元素加法运算
print(x+y)

# 减法运算
print(x-y)

# 乘法运算
print(x*y)

# 除法运算
print(x/y)

# 指数运算
print(y.exp())

# 用dot做矩阵运算 x与y的转置相乘 得到3x3的矩阵
print(nd.dot(x, y.T))

# 两个矩阵连接到一起 在行上 (维度为0)
print(nd.concat(x, y, dim=0))
# 在列上 (维度为1)
print(nd.concat(x, y, dim=1))

# 按元素判断是否相等 返回一个新矩阵 (相等为1 不相等为0)
print(x == y)

# 求和 返回一个元素
print(x.sum())
```

###  广播机制

当对形状不同的两个NDArray按元素操作后，可能会触发广播（broadcasting）机制：先适当复制元素使得两个NDArray形状相同后再按元素操作。

```python
from mxnet import nd

a = nd.arange(3).reshape((3,1))
b = nd.arange(2).reshape((2,1))

print(a,b)

# 加法运算
print(a + b)
```

### 索引

```python
from mxnet import nd

x = nd.arange(12).reshape((3,4))

print(x)

# 下标从0开始
# 按范围截取 截取1,2两行
print(x[1:3])

# 访问单个元素
x[1,2] = 12
print(x)

# 截取一部分元素重新赋值
x[1:2, :] = 24
print(x)
```

### 运算的内存开销

对每个操作新开内存来存储运算结果。即使像y = x + 这样的运算，都会新建内存，然后y指向新的内存。可以使用python自带的id函数来证明这一点：如果两个实例id一致，那么他们所对应的内存地址相同，反之则不同。

```python
from mxnet import nd

# 创建向量
x = nd.arange(12)
x = x.reshape((3,4))
y = nd.array([[1,2,3,4], [2,3,5,6], [2,5,7,8]])

before = id(y)
y = x + y
print(id(y) == before)
# False

# 指定结果到特定内存 创建了临时内存来存储x+y的结果
z = y.zeros_like()
before = id(z)
z[:] = x + y
print(id(z) == before)
# True

# 避免临时内存开销
nd.elemwise_add(x, y, out=z)
print(id(z) == before)
# True

# 如果x不再被复用 也可以使用x[:] = x + y 或者 x += y来减少内存开销
before = id(x)
x += y
print(id(x) == before)
# True
```

### NDArray 和 NumPy互相转化

``` python
import numpy as np
from mxnet import nd

p = np.ones((2,3))
d = nd.array(p)

print(d)

print(d.asnumpy())
```

