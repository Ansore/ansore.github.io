---
title: 用tf.data读取TFRecord
tags:
  - tfrecord
  - tensorflow
categories:
  - 机器学习
cover: https://img.ansore.top/2022/04/28/626969f586f24.jpg
abbrlink: 9658a59d
date: 2019-03-19 21:05:06
---

tf.TFRecordReader()可能会弃用，官方推荐用tf.data读取TFRecord，用起来也相对方便。实现代码如下：

<!--more-->

```python
import tensorflow as tf
import random
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image

img_size = 224

def parse_exmp(serial_exmp):
    features = tf.parse_single_example(serial_exmp, features={
        'label': tf.FixedLenFeature([], tf.int64),
        'image_raw': tf.FixedLenFeature([], tf.string)
    })
    label = tf.cast(features['label'], tf.int32)
    img = tf.decode_raw(features['image_raw'], tf.uint8)

    # print(img.shape)
    img = tf.reshape(img, [224, 224, 3])
    # 归一化处理
    img = tf.image.convert_image_dtype(img, dtype=tf.uint8)
    # img = tf.cast(img, tf.float32) / 255.0
    # label = tf.one_hot(label, 8)
    return img, label


# TFrecord文件路径
train_list = ['./images/test/train-0.tfrecords']

train_set = tf.data.TFRecordDataset(train_list)
train_set = train_set.map(parse_exmp).repeat().batch(1).shuffle(buffer_size=50)
train_iterator = train_set.make_one_shot_iterator()
images_batch, labels_batch = train_iterator.get_next()

with tf.Session() as sess:
    sess.run(tf.global_variables_initializer())

    for n in range(100):
        images, labels = sess.run([images_batch, labels_batch])
        b_image = Image.fromarray(images[0])
        print(labels[0])
        plt.imshow(b_image)
        # plt.axis('off')
        plt.show()
        # print(labels)
```

