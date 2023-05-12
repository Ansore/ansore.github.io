---
title: QEMU启动hda文件系统
tags:
  - 操作系统
categories:
  - 操作系统
cover: 'https://img.ansore.de/2022/04/27/62692c1359d83.jpg'
abbrlink: c9a89521
date: 2022-01-05 10:23:19
---


# QEMU启动hda文件系统

创建文件系统，大小为16M

```
dd if=/dev/zero of=./rootfs.img bs=1M count=16
```

格式化

```
mkfs.ext3 rootfs.ext3
```

挂载文件系统

```
mount -o loop rootfs.img ./fs
```

此时在/dev下有个loop0的设备

写入磁盘引导和数据

```
dd if=./readhdd.bin of=/dev/loop0 bs=512 count=1
dd if=./data of=/dev/loop0 seek=10 bs=512 count=1
```

卸载硬盘

```
umount /dev/loop0
```

qemu虚拟机启动

```
qemu-system-x86_64 -hda rootfs.img
```

或者写入时：

```
dd if=./readhdd.bin of=/dev/loop0 bs=512 count=1 conv=notrunc
```

notrunc规定在写入数据后不截断
