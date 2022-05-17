---
title: 线性回归的Gluon实现
tags:
  - 机器学习
  - mxnet
  - 线性回归
categories:
  - 机器学习
cover: https://img.ansore.top/2022/04/28/6269696188c94.jpg
abbrlink: 593cfb3c
date: 2019-01-01 13:18:12
---

使用MXNet提供的Gluon接口实现线性回归

mxnet的nn（neural networks）模块定义了大量的神经网络的层。loss模块定义了各种损失函数

MXNet的initializer模块提供了模型参数初始化的各种方法

<!--more-->

```python
from mxnet import autograd, nd
from mxnet.gluon import loss as gloss
from mxnet.gluon import data as gdata
from mxnet.gluon import nn as gnn
from mxnet import init
from mxnet import gluon

# 生成数据集
num_input = 2
num_example = 1000
true_w = [2, -3.4]
true_b = 4.2

features = nd.random.normal(scale=1, shape=(num_example, num_input))
labels = true_w[0] * features[:, 0] + true_w[1] * features[:, 1] + true_b
labels += nd.random.normal(scale=0.01, shape=labels.shape)

# 读取数据
batch_size = 10
# 将训练数据的特征与标签组合
dataset = gdata.ArrayDataset(features, labels)
data_iter = gdata.DataLoader(dataset, batch_size, shuffle=True)

# 打印数据
# for x, y in data_iter:
#     print(x, y)

# 定义模型
# Sequential可以看做是串联各层的容器，容器的每一层将看做是下一层的输入
net = gnn.Sequential()
# 线性回归是单层神经网络，输出层的神经元和输入层各个输入完全连接，因此，线性回归输出层也叫全连接层
# gluon无需指定每一层的输入个数 模型会自动推断
# 定义输出个数为1
net.add(gnn.Dense(1))

# 初始化模型参数
# 通过init.Normal参数指定每个参数元素将在初始化时随机采样于服从N(0,0.01)的数，偏置默认初始化为0
net.initialize(init.Normal(sigma=0.01))

# 定义损失函数
# 平方损失 又称 L2范式损失
loss = gloss.L2Loss()

# 定义优化算法
# 指定学习率是0.03的小批量随机梯度下降（sgd）为优化算法
trainer = gluon.Trainer(net.collect_params(), 'sgd', {'learning_rate': 0.03})

# net[0].weight.attach_grad()

# 训练模型
num_epochs = 3
for epoch in range(1, num_epochs + 1):
    for x, y in data_iter:
        # 需要反向传导的地方record一下
        with autograd.record():
            l = loss(net(x), y)
        # 计算梯度
        l.backward()
        # 更新模型参数
        trainer.step(batch_size)
    l = loss(net(features), labels)
    print('epoch %d, loss: %f' % (epoch, l.mean().asnumpy()))


# 打印结果
print('true_w:')
print(true_w)

print('train_w: ')
print(net[0].weight.data())

print('true_b:')
print(true_b)

print('train_b: ')
print(net[0].bias.data())

# 梯度
print(net[0].weight.data().grad)

```

