---
title: Archlinux交换esc和CapsLock键
tags:
  - Archlinux
categories:
  - Archlinux
cover: https://images.ansore.top/i/2022/05/05/6272a869843cd.png
abbrlink: 66617a24
date: 2022-04-22 23:15:41
---

作为一个neovim重度用户，实在觉得ESC键太远了，而且CapsLock键没啥用还占了个黄金位置，所以就交换了两个键的位置。

我用的X11，设置如下

在用户目录下创建文件：

```bash
vim ~/.Xmodmap
```

编辑如下：

```
remove Lock = Caps_Lock

keysym Escape = Caps_Lock
keysym Caps_Lock = Escape

add Lock = Caps_Lock
```

保存重新登录即可
