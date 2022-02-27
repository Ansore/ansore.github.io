---
title: Fashion-MNIST数据集
tags:
  - 机器学习
  - mxnet
  - fashion-mnist
categories:
  - 机器学习
abbrlink: 7e7e4a71
date: 2019-01-05 09:30:59
---

### 简介

Fashion-MNIST是一个替代手写数字集的图像数据集，比手写数据集更加复杂。它是由Zalando旗下的研究部门提供。

### 特征

- 60000张训练图像和标签数据
- 10000张测试图像和标签数据
- 10个类别
- 每张图片28x28分辨率
- 灰度图片

类别如下：

| 标注编号 |    描述     |
| :------: | :---------: |
|    0     | T-shirt/top |
|    1     |   Trouser   |
|    2     |  Pullover   |
|    3     |    Dress    |
|    4     |    Coat     |
|    5     |   Sandal    |
|    6     |    Shirt    |
|    7     |   Sneaker   |
|    8     |     Bag     |
|    9     | Ankle boot  |

### 获取数据集

通过mxnet.gluon的data包来下载这个数据集。第一次调用会从网上获取数据。

```python
from mxnet.gluon import data as gdata

mnist_train = gdata.vision.FashionMNIST(train=True)
mnist_test = gdata.vision.FashionMNIST(train=True)

print(len(mnist_train))
print(len(mnist_test))

feature, label = mnist_train[0]

print(feature.shape, label.dtype)
```

mxnet默认是从国外下载数据集，所以速度特别慢，可以在启动notebook时指定nexnet的国内镜像。

```sh
MXNET_GLUON_REPO=https://apache-mxnet.s3.cn-north-1.amazonaws.com.cn/ jupyter notebook
```

该数据集会下载到.mxnet/datasets/fashion-mnist/目录下，一共四个文件，分别是训练图片、标签和测试图片、标签。

官方数据集的github地址为：https://github.com/zalandoresearch/fashion-mnist

### 读取小批量数据

Gluon的DataLoader中一个很方便的功能是允许使用多进程来加速数据读取（暂时不支持windows系统）

此外，通过ToTensor类将图像数据从uint8格式转换为32位浮点格式，并除以255使得所有像素点的数值均在0到1之间。ToTensor类还将图像通道从最后一维移到最前一维。通过数据集的transform_firt函数，可以将ToTensor变得变换应用到每个数据样本（图像和标签）的第一个元素，即图像之上。

```python
from mxnet.gluon import data as gdata
import sys
import time

mnist_train = gdata.vision.FashionMNIST(train=True)
mnist_test = gdata.vision.FashionMNIST(train=True)

print(len(mnist_train))
print(len(mnist_test))

batch_size = 256

transformer = gdata.vision.transforms.ToTensor()

if sys.platform.startswith("win"):
    # 0表示不需要额外的进程加速数据读取
    num_workers = 0
else:
    num_workers = 4

train_iter = gdata.DataLoader(mnist_train.transform_first(transformer), batch_size, shuffle=True, num_workers=num_workers)
test_iter = gdata.DataLoader(mnist_test.transform_first(transformer), batch_size, shuffle=True, num_workers=num_workers)

# 查看读取一遍训练数据需要的时间
start = time.time()
for X, y in train_iter:
    continue
print("%.2f s", time.time()-start)

```

