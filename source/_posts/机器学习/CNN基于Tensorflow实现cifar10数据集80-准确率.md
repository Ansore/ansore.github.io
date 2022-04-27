---
title: CNN基于Tensorflow实现cifar10数据集80准确率
tags:
  - cnn
  - tensorflow
  - cifar
categories:
  - 机器学习
cover: https://images.ansore.top/i/2022/04/28/626969f586f24.jpg
abbrlink: 4c3e71da
date: 2018-03-29 16:23:32
---

## 数据导入和预处理

本文使用的是CIFAR10的数据集。CIFAR10包含了十个类型的图片，有60000张大小为32x32的彩色图片，其中50000张用于训练，10000张用于测试。数据集共分为5个训练块和1个测试块，每个块有10000个图像，包含以下数据：
1. data——1个数据块中包含1个10000*3072大小的uint8s数组，数组每行存储1张32x32图像，第一个1024数组包含红色通道，下一个1024数组包含绿色通道，最后一个1024包含蓝色通道。图像存储以行顺序为主，所以数组的前32列为图像的第一行红色通道的值。
2. lables——1个数据块包含1个10000数的列表，范围为0-9，分别对应图片不同的分类，索引值i的数值表示数组data中的第i个图片的标签。

```python
def load_CIFAR_batch(filename):
    """ 载入cifar数据集的一个batch """
    with open(filename, 'rb') as f:
        datadict = p.load(f, encoding='latin1')
        X = datadict['data']
        Y = datadict['labels']
        X = X.reshape(10000, 3, 32, 32).transpose(0, 2, 3, 1).astype("float32")
        Y = np.array(Y)
        return X, Y

# one hot 处理
def make_one_hot(data1):
    return (np.arange(10)==data1[:,None]).astype(np.integer)

def load_CIFAR10(ROOT):
    """ 载入cifar全部数据 """
    xs = []
    ys = []
    for b in range(1, 6):
        f = os.path.join(ROOT, 'data_batch_%d' % (b,))
        X, Y = load_CIFAR_batch(f)
        xs.append(X)
        ys.append(Y)
    Xtr = np.concatenate(xs)
    Ytr = np.concatenate(ys)
    del X, Y
    Xte, Yte = load_CIFAR_batch(os.path.join(ROOT, 'test_batch'))

    # one hot 处理
    Ytr = make_one_hot(Ytr)
    Yte = make_one_hot(Yte)

    return Xtr, Ytr, Xte, Yte
```

读取过程中，将每张图片维度转换为[32,32,3]，然后将数据类型改变为float，每批数据都是10000x32x32x3，相当于超过了3000万个浮点数，数据类型float实际与float64相同，也就是说每个数字占用8个字节，这就意味着每批数据至少占用240M内存，一次将训练集和测试集载入内存的话，至少需要1.4G内存空间，这还只是数据的准备阶段。

函数load_CIFAR10函数传入的值为cifar10数据的加载的相对目录，读出数据后还要对10类标签进行one-hot编码，以供后来的softmax分类处理。该函数返回值分别为训练集图像、训练集标签、测试集图像、测试集标签，他们的索引值一一对应。

## 创建模型

TensorFlow基于数据流图的框架，首先定义模型之前要将各个节点表示成某种抽象的计算，边表示节点之间张量的联系。也就是说Tensorflow不单独地运行单一的复杂计算，而是先用图描述一系列可交互性的计算操作，然后全部一起在Python之外运行，提高运算效率。

本文采用的卷积神经网络（CNN）主要用来识别以为、缩放以及其他形式扭曲不变性的二维图像，相较于一般神经网络，卷积网络的输入图像和网络的拓扑结构能很好的吻合，特征提取和模式分类可以同时进行，并且都在训练中产生。采用监督学习训练模型，每一个输入对象都有一个期望的输出值，利用一组已知类别的样本调整分类器参数，使其各层参数最终分别收敛。

本文创建的模型，是一个多层架构，采用类似vgg16的结构创建模型，由卷积层和非线性层（nonlinearities）交替多次后排列构成，但是没有用到vgg16庞大的全连接层结构，设计思路如下：
1. 所有卷积层均使用3X3的小卷积核
2. 两层卷积搭配一层池化
3. 使用vgg16前三个卷积和池化操作，以2的次幂依次递增卷积核数量(64,128,256) 
4. 调整精度控制，防止过拟合或者欠拟合的情况
5. 模型的全连接层没有采用vgg16的三层结构，卷积层输出后直接跟10分类的softmax classifier
6. 初始化权重和偏置全部采用随机，防止0梯度的情况
7. 建立状态可视化，分别记录训练过程中的损失以及对训练集准确率的变化
8. 定义输入和输出节点，供安卓端调用

### 定义占位符

因为Tensorflow是基于图来计算的，每执行一步程序，都是一个op，整个程序在运行之前必须定义要执行的操作，placeholder其实也是一种常量，但是是由用户在调用run方法的时候传递的。在训练过程中，由于数据量比较庞大，不可能将所有数据一次性载入内存执行运算，所以运用placeholder在运算的时候传入一小部分数据进行运算，计算完毕以后再传入另外一部分进行运算，这样一直迭代下去，减少对计算机配置的需求。

首先创建图的输入部分，分别为inputnode（图片）和classes（分类），在定义这Tensor Variable时，需要指定名字，以方便安卓端调用的时候能找到计算流图中的输入位置（通过形参name指定），在Tensorflow进行运算的时候使用：

```python
with tf.name_scope("inputs"):
        x = tf.placeholder(tf.float32, [None, 32, 32, 3], name="inputnode")
        y_ = tf.placeholder(tf.float32, [None, 10], name="classes")
```

图片输入x为浮点数4维张量，定义它的shape为[None, 32, 32, 3]，其中None可以为任意值，第2、3维是图片的尺寸，表示输入图片的大小为32x32像素，第4维为图片的颜色通道，黑白图片为1，彩色图片为3（r、g、b三个输入通道）。输入值y_是一个2维张量，每一行的10维向量代表不同图片的分类，这里输入的是图片标签的真实分类。

### 权重和偏置初始化

当训练模型时，用变量来存储和更新参数。变量包含张量（Tensor）存放在内存中，建立模型时它们需要明确被初始化，训练模型后它们可以存放到磁盘。之后训练模型和分析可以直接加载。

创建模型的时候，变量初始化时加入轻微噪声，打破对称性，防止0梯度问题。为了避免在建模型的时候反复进行初始化操作，直接定义两个函数用于初始化权重和偏置：

```python
def weight_variable(shape):
    init = tf.random_normal(shape, stddev=0.01)
    return tf.Variable(init, name="Weights")
def bias_variable(shape):
    init = tf.random_normal(shape)
    return tf.Variable(init, name="biases")
```

在tensorflow中创建一个变量的时候，需要将一个张量作为初始值传入构造函数Variable()。所有这些操作都需要指定张量的shape，也就是张量的维度。变量的维度通常是固定的。

### 卷积、池化和dropout

卷积运算可以理解成一种加权求和，通过卷积运算，可以使原信号特征增强，而且可以降低噪声，本文使用1步长、0边距的模板，保证输入和输出的向量是同样大小。

采用池化层的原因是，根据图像的局部相关性原理，对图像进行子采样可以减少计算量，同时也可以保证图像不变性，本文采用2x2大小的模板做最大池化。

Dropout在深度学习中，按照一定的概率使一部分神经元不被激活，也就是说按一定概率将它从神经网络中暂时丢弃，从而防止过度拟合。依然定义函数进行操作：

```python
def conv2d(x, W):
    conv = tf.nn.conv2d(x, W, strides=[1,1,1,1], padding='SAME', name="Conv2D")
    return conv
def max_pool_2x2(x):
    pool = tf.nn.max_pool(x, ksize=[1,2,2,1], strides=[1,2,2,1], padding='SAME', name="MaxPool2D")
    return pool
def dropout(x, keep):
    return tf.nn.dropout(x, keep, name="dropout")
```

每一层卷积之后，紧接着¬用一个非线性层，主要目的是在系统中引入非线性特征。本文中使用Relu层，具有比tanh和sigmoid函数更好的效率和速度，Relu层只要对input的所有值应用函数f(x)=max(0,x)，也就是说这一层所有的negative activation为0，可以很大程度上减少存储空间，同时也可以加快收敛速度。添加卷积层同样抽象成一个函数：

```python
#　添加卷积层　
# inputs 输入数据　
# weight_shape权重格式　
# bias_shape 偏置格式
# keep_prob 过拟合
# activation_function激励函数
def add_conv(inputs, weight_shape, bias_shape, keep_prob, activation_function = None):
    Weights1 = weight_variable(weight_shape)
    biases1 = bias_variable(bias_shape)
    # 卷积
    if activation_function is None:
        conv = conv2d(inputs, Weights1) + biases1
    else:
        conv = activation_function(conv2d(inputs, Weights1)+biases1)
    drop = dropout(conv, keep_prob)
    return drop
```

### 定义网络结构

本文采用卷积层和采样层（池化层）交替设置，即layer1的具体结构就是两层卷积层搭配一层采样层，layer2和layer3同样也是两层卷积层加上一层采样层，经过这样三层运算后图片维度变化为：
> input:32x32 -> layer1:16x16 -> layer2:8x8 -> layer3:4x4


网络结构代码如下：

```python
# layer 1
    with tf.name_scope("layer1"):
        drop1 = add_conv(images, [3, 3, 3, 64], [64], 1, tf.nn.relu)
        drop1 = add_conv(drop1, [3, 3, 64, 64], [64], 1, tf.nn.relu)
        drop1 = max_pool_2x2(drop1)

    # layer 2
    with tf.name_scope("layer2"):
        drop2 = add_conv(drop1, [3, 3, 64, 128], [128], 1, tf.nn.relu)
        drop2 = add_conv(drop2, [3, 3, 128, 128], [128], 1, tf.nn.relu)
        drop2 = max_pool_2x2(drop2)

    # layer 3
    with tf.name_scope("layer3"):
        drop3 = add_conv(drop2, [3, 3, 128, 256], [256], 1, tf.nn.relu)
        drop3 = add_conv(drop3, [3, 3, 256, 256], [256], 1, tf.nn.relu)
        drop3 = max_pool_2x2(drop3)
        
    drop3_flat = tf.reshape(drop3, [-1, 4 * 4 * 256], name="reshape")

    dropf = dropout(drop3_flat, 0.5)

    # out
    with tf.name_scope("out"):
        Wf = weight_variable([4*4*256, 10])
        bf = bias_variable([10])
        dense = tf.matmul(dropf, Wf) + bf
```

Layer1由两个卷积接一个max_pooling完成。第一层卷积在每个3x3的patch中算出64个特征值。权重是一个[3, 3, 3, 64]的张量，前两个维度是卷积核（patch）的大小，接着是输入通道，最后一个是输出通道，输出对应同样大小的偏置向量。第二层卷积在每个3x3的patch中会得到64个特征。后接一个最大池化层，进行图片采样，进入下一个隐含层。

为了构建一个更深的网络结构，本文将几个类似的层堆叠起来，layer2和layer3的结构几乎一样。layer2中每个3x3的patch会得到128个特征，layer3中每个3x3的patch会得到256个特征。

Layer3执行完毕后，图片的大小为(4x4)x256（最后一层输出特征图大小为256），紧接着通过tensorflow的reshape将这个四维张量拉直成一个二维张量（第1维是图片的序列，第二维是所有的图片特征）。然后接一个dropout防止过拟合。
本文所定义的CNN结构不包含全连接层（测试过添加一层256节点的全连接层，训练80个循环以后，测试集只能达到72%左右的准确率，效果比不加还要差）。

最后直接跟输出层，输入图片大小为(4x4)x256，输出10个特征图，即图片的十个分类，输出层由欧式径向基函数（RBF，Euclidean Radial Basis Function）单元组成，每个类一个单元，每个单元由4x4x256个输入，输出层的作用函数为线性函数，对隐藏层神经元输出的结果进行线性加权后输出，作为整个神经网络的输出结果。

## 定义训练方式

### 定义模型训练指标

卷积网络在本质上是一种输入到输出的映射，它能够学习大量的输入与输出之间的映射关系，而不需要任何输入和输出之间的精确的数学表达式，只要用已知的模式对卷积网络加以训练，网络就具有输入输出对之间的映射能力。

卷积网络执行的是监督训练，所以其样本集是由形如：（输入向量，理想输出向量）的向量对构成的。所有这些向量对，都是来源于已经准备好的训练数据集。

定义训练方法代码如下：

```python
out = inference(x)

    p = tf.nn.softmax(out, name="outnode")

    with tf.name_scope("loss"):
        cross_entropy = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(logits=out, labels=y_))

    with tf.name_scope("train"):
        train_step = tf.train.AdamOptimizer(1e-4).minimize(cross_entropy)

    with tf.name_scope("accuracy"):
        accuracy = tf.reduce_mean(tf.cast(tf.equal(tf.argmax(out, 1), tf.argmax(y_, 1)), tf.float32))
    tf.summary.scalar('loss', cross_entropy)
    tf.summary.scalar('train_accuracy', accuracy)
```

模型训练分为以下两个阶段：

第一阶段，前向传播阶段：
1. 样本集中取一个样本，输入网络
2. 计算相应的实际输出；在此阶段，信息从输入层经过逐级的变换，传送到输出层。

这个过程也是网络在完成训练后正常执行时执行的过程。

第二阶段，反向传播阶段（BP）：
1. 将每个元组的网络预测与真实的类标号相比较，计算差值
2. 按极小化误差的方法，修改权重和偏置，使得网络预测和实际之间的均方误差减小。

即由输出层，经由每个隐藏层，到第一个隐藏层（后向传播）。理论上来说，权重和偏置最终会收敛，学习过程停止。

要完成这两步，首先需要定义一个指标来评估这个模型的好坏，在机器学习中一般定义一个指标表示这个模型是坏的，这个指标成为成本（cost）或损失（loss），然后尽量减小这个指标。本文中使用的成本函数是“交叉熵”（cross-entropy），交叉熵产生与信息论，简单来说，交叉熵是衡量两个概率分布p和q之间的相似性，其定义如下：

$$ H_{y'}(y) = -\sum_i{y'_i\log y_i} $$

y是预测的概率分布，y`是实际的分布（即输入的ont-hot vector）。

程序中计算交叉熵：

```python
cross_entropy = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(logits=out, labels=y_))
```

softmax_cross_entropy_with_logits实现过程如下：
1. 对网络输入的最后一层（out）做一个softmax（所以在网络的输出层没有加softmax）
2. 用tf.log计算上层每个结果的对数，然后把y_的每个元素和tf.log(y_)对应的元素相乘
3. 用tf.reduce_sum计算张量的所有元素的总和

最后用tf.reduce_mean计算batch维度（第一维度）下交叉熵（cross-entropy）的平均值，并将这个值作为总损失（loss）。

TensorFlow拥有一张描述各个计算单元的图，也就是说TensorFlow是基于图的，并不是基于数据流的，而且它可以自动使用反向传播算法（BP，backpropagation algorithm），有效确定变量是如何影响需要最小化的那个成本值（cross-entropy），然后通过优化算法不断修改变量来降低成本值。

```python
train_step = tf.train.AdamOptimizer(1e-4).minimize(cross_entropy)
```

TensorFlow中有大量内置的优化算法。本文中使用实现了Adam算法的优化器，Adam 也是基于梯度下降的方法，每次迭代参数的学习步长都有一个确定的范围，不会因为很大的梯度导致很大的学习步长，参数的值比较稳定，AdamOptimizer通过使用动量（参数的移动平均数）来改善传统梯度下降，促进参数的动态调整。然后以1e-4的学习效率最小化交叉熵。

这一步实际上是用来往图上添加一个新操作，其中包括计算梯度，计算每个参数的步长变化，并且计算出新的参数值。整个模型可以反复地运行train_step完成梯度下降来更新权值，不断减少损失。TensorFlow在这里做的是，它在后台给计算的那张图里面增加一系列新的操作单元用于实现反向传播算法和梯度下降算法。然后，返回一个单一的操作。也就是说，它把那些繁琐的操作都进行了封装，直接调用即可。

### 模型评估

训练模型之后，需要定量评估模型的性能以及准确率如何，分类算法的模型是基于数值输入预测分类值，实际目标是1和0的序列。这就需要度量预测值和真实值之间的距离。分类算法的损失函数一般不容易评估模型的好坏，所以通常情况下是看准确预测分类结果的百分比。

首先需要找出哪些lable是预测正确的，然后除以总数得到正确率。

实现代码如下：

```python
accuracy = tf.reduce_mean(tf.cast(tf.equal(tf.argmax(out, 1), tf.argmax(y_, 1)), tf.float32))
```

其中tf.argmax会返回一个张量某个维度中的最大值得索引，如tf.argmax(out,1)表示模型对每个输入的最大概率的分类的分类值，而tf.argmax(y_,1)表示真实分类的分类值。然后用tf.equal来判断预测是否和真实分类一致。到这一步返回的是一个布尔数组，为了计算准确率，通过tf.cast将布尔值转化为浮点数来代表对、错（如1代表对、0代表错），然后通过tf.reduce_mean取平均值。

### 安卓的输出节点

```python
p = tf.nn.softmax(out, name="outnode")
```

这里使用了softmax回归（softmax regression）模型，这个模型可以用来给不同的对象分配概率，关于softmax定义如下：

$$ softmax(x)_i = \frac {exp(x_i)} {\sum_j{exp(x_j)}} $$

Softmax把输入值当成幂指数求值，然后再正则化这些结果。这个幂运算表示，更大的evidence对应更大的假设模型里面的乘数权重值，反之，更少的evidence意味假设模型里面更小的乘数权重值。如果模型里的权值不能是0或者负数，softmax然后会正则化这些权重值，使它们的总和等于1，以此来构造一个有效的概率分布。

这里把softmax看成一个激励（activation）函数，把定义的线性函数输出转换成需要的格式，也就是关于图片的10个类别。所以，给定一张图片，它对于每个类别的吻合成都可以被softmax函数转换成一个概率值。

将这个概率值作为输出节点，并指明输出节点（通过name指定），供安卓端调用。

### 状态可视化

Tensorflow发布包中提供了TensorBoard，用于展示Tensorflow任务在计算过程中的Graph、定量指标图以及附加数据。为了释放tensorboard中所使用的事件文件，所有的即时数据都要在图表构建阶段合并到一个操作（op）中。

```python
 tf.summary.scalar('loss', cross_entropy)
    tf.summary.scalar('train_accuracy', accuracy)

    merged_summary_op = tf.summary.merge_all()
```

创建好会话（Session）后，实例化一个tf.summary.FileWriter，用于写入包含图表和即时数据具体值的事件文件

```python
summary_writer = tf.summary.FileWriter('./tmp', graph=tf.get_default_graph())
```

每次运行merged_summary_op时，都会往事件文件中写入最新的即时数据，函数的输出会传入事件文件读写器（writer）的add_summary()函数。

```python
_,loss,summary = sess.run([train_step, cross_entropy, merged_summary_op],feed_dict={x:batch_x,y_:batch_y})

summary_writer.add_summary(summary, n*num_batch+i)
```

事件文件写入完毕后，就训练文件夹打开一个Tensorboard，查看即时数据情况。

## 训练和保存模型

### 环境以及配置

使用计算机配置：

> 处理器：Intel 酷睿i3-6100
>
> GPU：NVIDIA GeForce GTX 1050Ti
>
> 内存：16G

运行环境：

> 操作系统：windows 10
>
> Python版本：python3.6
>
> TensorFlow版本：tensorflow-1.7
>
> GPU驱动环境：cuda_9.0，cudnn-7.1

### 训练模型

整个训练过程主要包括训练模型、保存即时数据、保存检查点文件（checkpoint file）、评估模型几个部分。具体代码如下所示：

```python
def load_model(sess, saver,ckpt_path):
    latest_ckpt = tf.train.latest_checkpoint(ckpt_path)
    print(latest_ckpt)
    if latest_ckpt:
        print ('恢复模型-', latest_ckpt)
        saver.restore(sess, latest_ckpt)
        return int(latest_ckpt[latest_ckpt.rindex('-') + 1:])
    else:
        print ('新建模型')
        sess.run(tf.global_variables_initializer())
        return -1

def cnn_train(batch, x_train, y_train, x_test, y_test):

    num_batch = len(x_train) // batch

    with tf.Session() as sess:

        # load model
        sess.run(tf.initialize_all_variables())

        saver = tf.train.Saver(tf.all_variables())
        last_epoch = load_model(sess, saver, 'save_model/')

        summary_writer = tf.summary.FileWriter('./tmp ', graph=tf.get_default_graph())

        for n in range(last_epoch + 1, 1000):
            # 每次取batch_size张图片
            for i in range(num_batch):
                batch_x = x_train[i*batch : (i+1)*batch]
                batch_y = y_train[i*batch : (i+1)*batch]
                # 开始训练数据，同时训练三个变量，返回三个数据
                _,loss,summary = sess.run([train_step, cross_entropy, merged_summary_op],
                                           feed_dict={x:batch_x,y_:batch_y})
                summary_writer.add_summary(summary, n*num_batch+i)

                # 打印损失
                if (n*num_batch+i) % 10 == 0:
                    print(n*num_batch+i, loss)

                if (n*num_batch+i) % 50 == 0:
                    # 获取测试数据的准确率
                    x_test_t = x_test[0: 2000]
                    y_test_t = y_test[0: 2000]
                    acc = sess.run(accuracy, feed_dict={x:x_test_t, y_:y_test_t})
                    # tf.summary.scalar('test_accuracy', acc)
                    print(n*num_batch+i, acc)

                    if acc > 0.77:
                        constant_graph = graph_util.convert_variables_to_constants(sess, sess.graph_def, ["outnode"])
                        with tf.gfile.FastGFile("android_model/model-"+str(acc)+".pb", mode='wb') as f:
                            f.write(constant_graph.SerializeToString())
            saver.save(sess, 'save_model /cifar.model', global_step=n)

if __name__ == '__main__':
    cifar10_dir = 'data/cifar-10-batches-py/'
    X_train, y_train, X_test, y_test = input_data.load_CIFAR10(cifar10_dir)
    batch_size = 128

    cnn_train(batch_size, X_train, y_train, X_test, y_test)
```

Tensorflow结构以C API为界限，将整个系统分为“前端”和“后端”两个子系统，前端系统提供编程模型，负责构造计算图。后端用C/C++语言编写，运算速度比较快，因此后端提供运行时环境，负责执行计算图。前端通过Session连接后端，所以tensorflow构建的计算图必须通过session会话才能执行。

构造图的阶段完成后，才能启动图。启动图的第一步是创建一个Session对象, 如果无任何创建参数, 会话构造器将启动默认图。会话会管理TensorFlow程序运行时的所有资源。当所有计算完成之后需要关闭会话来帮助系统回收资源，否则就可能出现资源泄露的问题，本文中使用Python上下文管理器来使用会话，当上下文退出时，关闭和资源释放也会自动完成。

在训练过程中，传入的整个图像和标签数据集会被切片，以符合每个操作所设置的batch值，占位符操作将填补以符合这个值，然后使用feed_dict参数，将数据传入会话函数（session）。

模型的训练过程描述如下：
1. 取得训练集和验证集，将所有数据输入到训练模型函数中。
2. 选定训练组，本文从样本集中分别随机地寻求128个样本作为一个训练组(batch)。
3. 检测是否有检查点文件（checkpoint file），如果有，直接从文件中恢复上次保存的模型，继续训练；如果没有，新建模型，从头开始训练，并初始化所有参数。
4. 取一个训练组加入到网络，并给出它的目标向量（真实值）。
5. 计算损失（loss）和准确率（accuracy），输出到操作（op）中，并通过优化器来减小损失，调整各层权重和偏置。
6. 每经过N个batch后，用验证集评估模型准确率，判断指标是否满足精度要求，如果满足要求，则将模型保存为安卓端可用的模型（.pb为后缀的模型，保存了整张图和每层的权重和偏置），如果不满足，则跳过不保存
7. 训练集每经过一次迭代，就保存模型，向训练文件夹中写入包含了所有课训练变量的值的检查点文件（checkpoint file），以便于中断训练后，可以直接从上次训练的部分恢复继续训练，不需要再进行初始化。
8. 迭代结束或者键盘中断，则结束训练。

在循环的每个步骤中，程序都会抓取训练数据中的128个批处理数据点（也就是一个batch），然后用这些数据点作为参数替换之前的占位符来运行train_step。

如此反复多次，直到最终误差收敛。

本文使用随机训练（stochastic training）的方法，每次使用其中一小部分的随机数据来进行训练，更确切地说是随机梯度下降训练。在理想的情况下，所有的数据都来进行每一步的训练，这能得到更好的训练结果，但是这显然也需要很大的计算开销。所以，每一次训练的时候，使用不同的数据子集，这样既可以减少计算开销，又可以最大化地学习到数据集的总特性。

在一块GPU上运行了大约81000个batch，也就是210左右次迭代，大约用了一个半小时，该模型使用验证集评估，最高达到80%的精度。

### 保存模型

在官方api中，提供了两种不同的模型保存方法。

一种是使用tf.train.Saver()保存，这种方式只保存了网络中的各层参数值，并不保存模型结构。这种方式有几个缺点，首先这种模型文件是依赖tensorflow的，只能在tensorflow框架下使用，其次在恢复模型参数之前，还需要再定义一遍网络结构，然后才能恢复到网络中。

另外一种是基于Protocol Buffers的序列化协议，将网络中各层参数值和网络模型结构通过预定好的格式进行持久化保存，也是谷歌推荐的保存模型的方式，它可以独立运行，封闭的序列化格式，任何语言都可以解析它。另外的好处是保存为pb文件的时候，模型的变量都会变成固定的，导致模型大小会大大减小，适合手机端运行。

保存模型具体代码如下：

```python
constant_graph = graph_util.convert_variables_to_constants(sess, sess.graph_def, ["outnode"])

with tf.gfile.FastGFile("android_model/model-"+str(acc)+".pb", mode='wb') as f:
    f.write(constant_graph.SerializeToString())
        saver.save(sess, 'save_model /cifar.model', global_step=n)
```
这样就将模型保存为了.pb后缀的文件，这样的模型文件会在之后移植到安卓端的时候使用。

### 训练结果分析

本文中使用的模型总参量为120万左右，这还是简化后的VGG16模型，在一块1050ti的GPU上训练了一个半小时左右，经过210次左右迭代。

在经过20000个batch后损失的变化就相对来说比较小了，损失没有上升趋势，说明没有出现过拟合情况。而且在运行时间不长的情况下，说明参数收敛的比较快。在1小时33分钟左右，经过约80000个batch后，损失值达到4.27e-3。此时对于训练集的准确率达到了99.22%，相对来说，应该算是比较好的结果。

对于训练集，在经过约30000个batch以后，准确率基本维持在98%以上，在到达80000个batch以后，一直稳定在99%以上。也就是说对于当前这个数据集来说，模型继续学习下去得到的收益并不大。可以通过引入新的数据集或者调节各个图像的对比度等等，增加样本多样性，以此增加模型精度。

对于测试集的准确率，最高达到了80%，而官方提供模型准确率是86%。
