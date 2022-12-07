---
title: Linux文件系统之AUFS
tags:
  - Linux
  - AUFS
  - 文件系统
categories:
  - Linux
cover: 'https://img.ansore.top/2022/04/26/626803b75f8df.jpg'
abbrlink: cdaf4fa3
date: 2022-04-20 20:31:12
---

AUFS(advanced multi-layered unification filesystem, 高级多层统一文件系统)，用于为Linux文件系统实现联合挂载。AUFS没有合入Linux主线，但是ubuntu中有该文件系统

# 检查系统是否支持AUFS

使用一下命令查看是否支持AUFS：

```bash
$ grep aufs /proc/filesystems 
nodev   aufs
# 如果命令没有输出，表示内核不支持AUFS
```

# 创建AUFS

## 实验准备

创建实验目录

```bash
mkdir aufs
```

然后在 aufs 中创建名称为 mnt 的目录作为文件系统的挂载点：

```bash
mkdir aufs/mnt
```

接下来在 aufs 目录下创建 container-layer 文件夹(模拟容器的读写层)，并且在文件夹中创建文件 container-layer.txt，文件的内容初始化为 "I am container layer"：

```bash
mkdir aufs/container-layer
echo "I am container layer" > aufs/container-layer/container-layer.txt
```

最后在 aufs 目录下创建三个文件夹 image-layer1、image-layer2、image-layer3(用它们来模拟容器的镜像层)。在这三个文件夹中分别创建文件，并初始化为对应的内容：

```bash
mkdir aufs/{image-layer1,image-layer2,image-layer3}
echo "I am image layer 1" > aufs/image-layer1/image-layer1.txt
echo "I am image layer 2" > aufs/image-layer2/image-layer2.txt
echo "I am image layer 3" > aufs/image-layer3/image-layer3.txt
```

## 创建AUFS文件系统

mount 是一个非常强大的命令，我们可以用它来创建 AUFS 文件系统。下面的命令把 container-layer、image-layer1、image-layer2、image-layer3 以 AUFS 的方式挂载到刚才创建的 mnt 目录下：

```bash
cd aufs
sudo mount -t aufs -o dirs=./container-layer:./image-layer1:./image-layer2:./image-layer3 none ./mnt
```

挂载完成之后mnt目录结构如下：

```bash
mnt
├── container-layer.txt
├── image-layer1.txt
├── image-layer2.txt
└── image-layer3.txt
```

默认行为是：dirs指定左边的第一个目录是read-write权限，后续目录都是read-only权限。查看挂载的4个文件夹的权限信息。

```bash
cat /sys/fs/aufs/si_4458ac905a87e3a2/*
/home/ansore/aufs/container-layer=rw
/home/ansore/aufs/image-layer1=ro
/home/ansore/aufs/image-layer2=ro
/home/ansore/aufs/image-layer3=ro
64
65
66
67
```

其中`si_4458ac905a87e3a2`目录是系统为mnt这个挂载点创建的。

## 写时复制

向`mnt/image-layer1.txt`中文件末尾添加一行文字：

```bash
echo -e "\nwrite to mnt's image-layer1.txt" >> ./mnt/image-layer1.txt
```

查看 `mnt/image-layer1.txt` 的内容

```bash
cat mnt/image-layer1.txt 

I am image layer 1

write to mnt's image-layer1.txt
```

此时`image-layer1/image-layer1.txt`的内容并没有变化：

```c
cat image-layer1/image-layer1.txt 
I am image layer 1
```

此时去`container-layer`目录中发现多了`image-layer1.txt`文件，内容如下：

```bash
cat container-layer/image-layer1.txt 
I am image layer 1

write to mnt's image-layer1.txt
```

当尝试向 mnt/image-layer1.txt 中写入文件时，系统首先在 mnt 目录下查找名为 image-layer1.txt 的文件，将其拷贝到 read-write 层的 container-layer 目录中，接着对 container-layer 目录中的 image-layer1.txt 的文件进行写操作。
