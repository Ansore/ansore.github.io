---
title: softmax回归的实现
tags:
  - 机器学习
  - mxnet
  - softmax
categories:
  - 机器学习
cover: https://img.ansore.de/2022/04/28/6269696188c94.jpg
abbrlink: 532472fc
date: 2019-01-05 19:30:44
---

softmax回归的实现与线性回归的实现非常相似。同样使用小批量随机梯度下降来优化模型的损失函数。在训练模型是，迭代周期num_epochs和学习率lr都是可以调节的参数。

<!--more-->

```python
import gluonbook as gb
from mxnet import autograd, nd

batch_size = 256
train_iter, test_iter = gb.load_data_fashion_mnist(batch_size)

# 输入向量28x28x1 (宽28 高28 灰度)
num_input = 784
# 输出向量 10个分类
num_output = 10

# 权重初始化
weight = nd.random.normal(scale=0.01, shape=(num_input, num_output))
# 偏置初始化
bias = nd.zeros(num_output)

# 对模型参数附上梯度
weight.attach_grad()
bias.attach_grad()

# 定义softmax运算
# 1.对每个元素进行指数运算
# 2.对exp矩阵同行元素求和
# 3.令矩阵各元素与该行元素之和相除
# 最终得到每行元素和为1，且非负
def softmax(X):
    X_exp = X.exp()
    partition = X_exp.sum(axis=1, keepdims=True)
    # 运用广播机制
    return X_exp / partition

# 定义模型
def net(X):
    return softmax(nd.dot(X.reshape((-1, num_input)), weight) + bias)

# 定义损失函数
# 交叉熵
def cross_entropy(y_hat, y):
    return - nd.pick(y_hat, y).log()

# nd.pick说明
# y_hat是对两个样本的预测的三个概率值
# y是真实类别 可用pick函数，这直接的到这两个标签的预测概率
# y_hat = nd.array([[0.1,0.2,0.7], [0.3,0.2,0.5]])
# y = nd.array([0,2])
# print(nd.pick(y_hat, y))
# y = nd.array([0,0])
# print(nd.pick(y_hat, y))

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
num_epochs = 5
lr = 0.1

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


train(net, train_iter, test_iter, cross_entropy, num_epochs, batch_size, [weight, bias], lr, None)
```

