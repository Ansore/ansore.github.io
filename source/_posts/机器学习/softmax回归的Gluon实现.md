---
title: softmax回归的Gluon实现
tags:
  - 机器学习
  - mxnet
  - softmax
categories:
  - 机器学习
cover: https://img.ansore.top/2022/04/28/6269696188c94.jpg
abbrlink: c643d6ee
date: 2019-01-05 19:46:19
---

使用MXNet提供的Gluon接口可以更加方便地实现Softmax回归

<!--more-->

```python
import gluonbook as gb
from mxnet import gluon, init, autograd
from mxnet.gluon import loss as gloss, nn

# 获取数据
batch_size = 256
train_iter, test_iter = gb.load_data_fashion_mnist(batch_size)

# 定义和初始化模型
net = nn.Sequential()
net.add(nn.Dense(10))
# 使用N(0,1)初始化模型权重参数
net.initialize(init.Normal(sigma=0.01))

# softmax和交叉熵损失函数
loss = gloss.SoftmaxCrossEntropyLoss()

# 定义优化算法
trainer = gluon.Trainer(net.collect_params(), 'sgd', {'learning_rate': 0.1})


# 计算分类准确率
def accuracy(y_hat, y):
    # y_hat.argmax(axis=1) 返回每行中最大元素的索引
    # y中对应的即是分类的索引值
    # == 获得非0即1的数
    # 求平均值 得到准确率
    return (y_hat.argmax(axis=1) == y.astype('float32')).mean().asscalar()

# 评估模型
# 对每个数据块准确率求和 算平均值
def evaluate_accuracy(data_iter, net):
    acc = 0
    for X, y in data_iter:
        acc += accuracy(net(X), y)
    return acc / len(data_iter)

# 训练模型
def train(net, train_iter, test_iter, loss, num_epochs, batch_size, params=None, lr=None, trainer=None):
    for epoch in range(num_epochs):
        train_l_sum = 0
        train_acc_sum = 0

        for X, y in train_iter:
            with autograd.record():
                y_hat = net(X)
                l = loss(y_hat, y)

            l.backward()

            if trainer is None:
                gb.sgd(params, lr, batch_size)
            else:
                trainer.step(batch_size)

            train_l_sum += l.mean().asscalar()
            train_acc_sum += accuracy(y_hat, y)

        test_acc = evaluate_accuracy(test_iter, net)

        print("epoch %d, loss %.4f, train_acc %.3f, test_acc %.3f" % (epoch + 1, train_l_sum / len(train_iter), train_acc_sum / len(train_iter), test_acc))


num_epochs = 5
lr = 0.1
train(net, train_iter, test_iter, loss, num_epochs, batch_size, None, None, trainer)
```

