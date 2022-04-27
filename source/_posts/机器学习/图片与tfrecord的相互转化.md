---
title: 图片与TFRecord的相互转化
tags:
  - tfrecord
  - tensorflow
categories:
  - 机器学习
cover: https://images.ansore.top/i/2022/04/28/626969f586f24.jpg
abbrlink: 7931261f
date: 2019-03-01 08:49:25
---

### 简介

TFRecord是一种二进制格式文件，理论上可以保存任何格式的信息，可以将任何类型数据转化为Tensorflow所支持的格式，这种方法可以让数据集和网络架构更容易相互匹配。TFRecord文件包含了tf.train.Example协议内存块（protocol buffer）。可以将数据填入Example协议内存块（protocol buffer），将协议内存块序列化为一个字符串，并且通过tf.python_io.TFRecordWriter写入到TFRecord文件。

Protocol Buffer（protobuf）是Google公司出口的一种独立于开发语言，独立于平台的可扩展结构化徐磊机制。与xml、json类似。是一种数据交互格式协议。

Example消息体：

```
message Example {
  Features features = 1;
};

message Features {
  // Map from feature name to feature.
  map<string, Feature> feature = 1;
};

message Feature {
  // Each feature can be exactly one kind.
  oneof kind {
    BytesList bytes_list = 1;
    FloatList float_list = 2;
    Int64List int64_list = 3;
  }
};

message BytesList {
  repeated bytes value = 1;
}
message FloatList {
  repeated float value = 1 [packed = true];
}
message Int64List {
  repeated int64 value = 1 [packed = true];
}
```

一个包含一系列的feature属性。灭一个feature是一个map，也就是key-value键值对的形式，key取值是String类型，而value是feature类型的消息体，他的类型有三种：

- BytesList
- FloatList
- Int64List

它们都是列表形式。

### 图片转TfRecord格式

python代码如下：

```python
import os
import numpy as np
from PIL import Image
import tensorflow as tf

# 打包图片文件 to tfrecord

# 图片路径，两组标签都在该目录下
filename = "./images/train.txt"

# tfrecord文件保存路径
file_path = r"/image/tfrecord/train/"

# 每个tfrecord存放图片个数
bestnum = 2000

# 第几个图片
num = 0

# 第几个TFRecord文件
recordfilenum = 0

# 文件格式：图片路径 标签
def load_images_labels(filename = filename):
    images_list = []
    labels_list = []
    with open(filename) as f:
        lines = f.readlines()
        for line in lines:
            # rstrip：用来去除结尾字符、空白符(包括\n、\r、\t、' '，即：换行、回车、制表符、空格)
            content = line.rstrip().split(' ')
            name = content[0]
            # labels = []
            for value in content[1:]:
                labels_list.append(int(value))
            images_list.append(name)
    # 将训练数据随机打乱以获得更好的训练效果。
    state = np.random.get_state()
    np.random.shuffle(images_list)
    np.random.set_state(state)
    np.random.shuffle(labels_list)

    return images_list, labels_list

if __name__ == '__main__':

    # tfrecords格式文件名
    ftrecordfilename = ("train-%d.tfrecords" % recordfilenum)
    writer = tf.python_io.TFRecordWriter(os.path.join(file_path, ftrecordfilename))

    images_list, labels_list = load_images_labels()

    for i, image_path in enumerate(images_list):

        # 超过2000，写入下一个tfrecord
        if i !=0 and i % bestnum == 0:
            print("(%d/%d) 已完成" % (i, len(images_list)))
            recordfilenum += 1
            ftrecordfilename = ("train-%d.tfrecords" % recordfilenum)
            writer = tf.python_io.TFRecordWriter(os.path.join(file_path, ftrecordfilename))

        img = Image.open(image_path, 'r')
        # 将图片转化为二进制格式
        img_raw = img.tobytes()
        example = tf.train.Example(
            features=tf.train.Features(feature={
                'label': tf.train.Feature(int64_list=tf.train.Int64List(value=[labels_list[i]])),
                'image_raw': tf.train.Feature(bytes_list=tf.train.BytesList(value=[img_raw])),
            }))
        # 序列化为字符串
        writer.write(example.SerializeToString())
    writer.close()
```

### 读取TFRecord格式文件

```python
import tensorflow as tf

img_size = 224

def read_and_decode_tfrecord(filename):
    filename_deque = tf.train.string_input_producer(filename)
    reader = tf.TFRecordReader()
    _, serialized_example = reader.read(filename_deque)
    features = tf.parse_single_example(serialized_example, features={
        'label': tf.FixedLenFeature([], tf.int64),
        'image_raw': tf.FixedLenFeature([], tf.string)})
    label = tf.cast(features['label'], tf.int32)
    img = tf.decode_raw(features['image_raw'], tf.uint8)
    img = tf.reshape(img, [img_size, img_size, 3])

    # 归一化处理
    img = tf.image.convert_image_dtype(img, dtype=tf.float32)
    # 归一化处理 两种方式效果相同
    # img = tf.cast(img, tf.float32) / 255.0
    # One-hot处理
    label = tf.one_hot(label, 8)
    return img, label

# TFrecord文件路径
train_list = ['./images/test/train-0.tfrecords', './images/test/train-1.tfrecords']

img, label = read_and_decode_tfrecord(train_list)

# 小批量读取
img_batch, label_batch = tf.train.batch([img, label], num_threads=1, batch_size=10, capacity=1000)

# print(img_batch.shape)

with tf.Session() as sess:
    sess.run(tf.global_variables_initializer())
    # 创建一个协调器，管理线程
    coord = tf.train.Coordinator()
    # 启动QueueRunner,此时文件名队列已经进队
    threads = tf.train.start_queue_runners(sess=sess, coord=coord)
    for i in range(5):
        b_image, b_label = sess.run([img_batch, label_batch])
        # b_image = Image.fromarray(b_image[0])
        # plt.imshow(b_image)
        # plt.axis('off')
        # plt.show()
        # print(b_image)
        print(b_label)
    coord.request_stop()
    # 其他所有线程关闭之后，这一函数才能返回
    coord.join(threads)
```

