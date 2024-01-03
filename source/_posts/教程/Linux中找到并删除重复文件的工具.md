---
title: Linux中找到并删除重复文件的工具
tags:
  - Linux
  - 编程
categories:
  - 编程
date: 2023-02-11 20:44:11
---

1. Rdfind
2. Fdupes
3. FSlint

# Rdfind

**Rdfind** 意即 **r**edundant **d**ata **find**（冗余数据查找），是一个通过访问目录和子目录来找出重复文件的自由开源的工具。它是基于文件内容而不是文件名来比较。Rdfind 使用**排序**算法来区分原始文件和重复文件。如果你有两个或者更多的相同文件，Rdfind 会很智能的找到原始文件并认定剩下的文件为重复文件。一旦找到副本文件，它会向你报告。你可以决定是删除还是使用[硬链接或者符号（软）链接](https://link.zhihu.com/?target=https%3A//www.ostechnix.com/explaining-soft-link-and-hard-link-in-linux-with-examples/)代替它们。

**安装 Rdfind**

Rdfind 存在于 [AUR](https://link.zhihu.com/?target=https%3A//aur.archlinux.org/packages/rdfind/) 中。因此，在基于 Arch 的系统中，你可以像下面一样使用任一如 [Yay](https://link.zhihu.com/?target=https%3A//www.ostechnix.com/yay-found-yet-another-reliable-aur-helper/) AUR 程序助手安装它。

```
yay -S rdfind
```

在 Debian、Ubuntu、Linux Mint 上：

```text
sudo apt-get install rdfind
```

在 Fedora 上：

```text
sudo dnf install rdfind
```

在 RHEL、CentOS 上：

```text
sudo yum install epel-release
sudo yum install rdfind
```

**用法**

一旦安装完成，仅带上目录路径运行 Rdfind 命令就可以扫描重复文件。

```text
rdfind ~/Downloads
```

Rdfind 命令将扫描 `~/Downloads` 目录，并将结果存储到当前工作目录下一个名为 `results.txt` 的文件中。你可以在 `results.txt` 文件中看到可能是重复文件的名字。

```
$ cat results.txt
# Automatically generated
# duptype id depth size device inode priority name
DUPTYPE_FIRST_OCCURRENCE 1469 8 9 2050 15864884 1 /home/sk/Downloads/tor-browser_en-US/Browser/TorBrowser/Tor/PluggableTransports/fte/tests/dfas/test5.regex
DUPTYPE_WITHIN_SAME_TREE -1469 8 9 2050 15864886 1 /home/sk/Downloads/tor-browser_en-US/Browser/TorBrowser/Tor/PluggableTransports/fte/tests/dfas/test6.regex
[...]
DUPTYPE_FIRST_OCCURRENCE 13 0 403635 2050 15740257 1 /home/sk/Downloads/Hyperledger(1).pdf
DUPTYPE_WITHIN_SAME_TREE -13 0 403635 2050 15741071 1 /home/sk/Downloads/Hyperledger.pdf
# end of file
```

通过检查 `results.txt` 文件，你可以很容易的找到那些重复文件。如果愿意你可以手动的删除它们。

此外，你可在不修改其他事情情况下使用 `-dryrun` 选项找出所有重复文件，并在终端上输出汇总信息。

```
rdfind -dryrun true ~/Downloads
```

一旦找到重复文件，你可以使用硬链接或符号链接代替他们。

使用硬链接代替所有重复文件，运行：

```text
rdfind -makehardlinks true ~/Downloads
```

使用符号链接/软链接代替所有重复文件，运行：

```text
rdfind -makesymlinks true ~/Downloads
```

目录中有一些空文件，也许你想忽略他们，你可以像下面一样使用 `-ignoreempty` 选项：

```text
rdfind -ignoreempty true ~/Downloads
```

如果你不再想要这些旧文件，删除重复文件，而不是使用硬链接或软链接代替它们。

删除重复文件，就运行：

```text
rdfind -deleteduplicates true ~/Downloads
```

如果你不想忽略空文件，并且和所哟重复文件一起删除。运行：

```text
rdfind -deleteduplicates true -ignoreempty false ~/Downloads
```

更多细节，参照帮助部分：

```text
rdfind --help
```

手册页：

```text
man rdfind
```

# Fdupes

**Fdupes** 是另一个在指定目录以及子目录中识别和移除重复文件的命令行工具。这是一个使用 C 语言编写的自由开源工具。Fdupes 通过对比文件大小、部分 MD5 签名、全部 MD5 签名，最后执行逐个字节对比校验来识别重复文件。

与 Rdfind 工具类似，Fdupes 附带非常少的选项来执行操作，如：

- 在目录和子目录中递归的搜索重复文件
- 从计算中排除空文件和隐藏文件
- 显示重复文件大小
- 出现重复文件时立即删除
- 使用不同的拥有者/组或权限位来排除重复文件
- 更多

**安装 Fdupes**

Fdupes 存在于大多数 Linux 发行版的默认仓库中。

在 Arch Linux 和它的变种如 Antergos、Manjaro Linux 上，如下使用 Pacman 安装它。

```text
sudo pacman -S fdupes
```

在 Debian、Ubuntu、Linux Mint 上:

```text
sudo apt-get install fdupes
```

在 Fedora 上：

```text
sudo dnf install fdupes
```

在 RHEL、CentOS 上：

```text
sudo yum install epel-release
sudo yum install fdupes
```

**用法**

Fdupes 用法非常简单。仅运行下面的命令就可以在目录中找到重复文件，如：`~/Downloads`。

```text
fdupes ~/Downloads
```

我系统中的样例输出：

```text
/home/sk/Downloads/Hyperledger.pdf
/home/sk/Downloads/Hyperledger(1).pdf
```

你可以看到，在 `/home/sk/Downloads/` 目录下有一个重复文件。它仅显示了父级目录中的重复文件。如何显示子目录中的重复文件？像下面一样，使用 `-r` 选项。

```text
fdupes -r ~/Downloads
```

现在你将看到 `/home/sk/Downloads/` 目录以及子目录中的重复文件。

Fdupes 也可用来从多个目录中迅速查找重复文件。

```text
fdupes ~/Downloads ~/Documents/ostechnix
```

你甚至可以搜索多个目录，递归搜索其中一个目录，如下：

```text
fdupes ~/Downloads -r ~/Documents/ostechnix
```

上面的命令将搜索 `~/Downloads` 目录，`~/Documents/ostechnix` 目录和它的子目录中的重复文件。

有时，你可能想要知道一个目录中重复文件的大小。你可以使用 `-S` 选项，如下：

```text
$ fdupes -S ~/Downloads
403635 bytes each:
/home/sk/Downloads/Hyperledger.pdf
/home/sk/Downloads/Hyperledger(1).pdf
```

类似的，为了显示父目录和子目录中重复文件的大小，使用 `-Sr` 选项。

我们可以在计算时分别使用 `-n` 和 `-A` 选项排除空白文件以及排除隐藏文件。

```text
fdupes -n ~/Downloads
fdupes -A ~/Downloads
```

在搜索指定目录的重复文件时，第一个命令将排除零长度文件，后面的命令将排除隐藏文件。

汇总重复文件信息，使用 `-m` 选项。

```text
$ fdupes -m ~/Downloads
1 duplicate files (in 1 sets), occupying 403.6 kilobytes
```

删除所有重复文件，使用 `-d` 选项。

```text
fdupes -d ~/Downloads
```

样例输出：

```text
[1] /home/sk/Downloads/Hyperledger Fabric Installation.pdf
[2] /home/sk/Downloads/Hyperledger Fabric Installation(1).pdf

Set 1 of 1, preserve files [1 - 2, all]:
```

这个命令将提示你保留还是删除所有其他重复文件。输入任一号码保留相应的文件，并删除剩下的文件。当使用这个选项的时候需要更加注意。如果不小心，你可能会删除原文件。

如果你想要每次保留每个重复文件集合的第一个文件，且无提示的删除其他文件，使用 `-dN` 选项（不推荐）。

```text
fdupes -dN ~/Downloads
```

当遇到重复文件时删除它们，使用 `-I` 标志。

```text
fdupes -I ~/Downloads
```

关于 Fdupes 的更多细节，查看帮助部分和 man 页面。

```text
fdupes --help
man fdupes
```

# FSlint

**FSlint** 是另外一个查找重复文件的工具，有时我用它去掉 Linux 系统中不需要的重复文件并释放磁盘空间。不像另外两个工具，FSlint 有 GUI 和 CLI 两种模式。因此对于新手来说它更友好。FSlint 不仅仅找出重复文件，也找出坏符号链接、坏名字文件、临时文件、坏的用户 ID、空目录和非精简的二进制文件等等。

**安装 FSlint**

FSlint 存在于 [AUR](https://link.zhihu.com/?target=https%3A//aur.archlinux.org/packages/fslint/)，因此你可以使用任一 AUR 助手安装它。

```text
yay -S fslint
```

在 Debian、Ubuntu、Linux Mint 上：

```text
sudo apt-get install fslint
```

在 Fedora 上：

```text
sudo dnf install fslint
```

在 RHEL，CentOS 上：

```text
sudo yum install epel-release
sudo yum install fslint
```

一旦安装完成，从菜单或者应用程序启动器启动它。

**FSlint 命令行选项**

FSlint 提供下面的 CLI 工具集在你的文件系统中查找重复文件。

- `findup` — 查找重复文件
- `findnl` — 查找名称规范（有问题的文件名）
- `findu8` — 查找非法的 utf8 编码的文件名
- `findbl` — 查找坏链接（有问题的符号链接）
- `findsn` — 查找同名文件（可能有冲突的文件名）
- `finded` — 查找空目录
- `findid` — 查找死用户的文件
- `findns` — 查找非精简的可执行文件
- `findrs` — 查找文件名中多余的空白
- `findtf` — 查找临时文件
- `findul` — 查找可能未使用的库
- `zipdir` — 回收 ext2 目录项下浪费的空间

所有这些工具位于 `/usr/share/fslint/fslint/fslint` 下面。

例如，在给定的目录中查找重复文件，运行：

```text
$ /usr/share/fslint/fslint/findup ~/Downloads/
```

类似的，找出空目录命令是：

```text
$ /usr/share/fslint/fslint/finded ~/Downloads/
```

获取每个工具更多细节，例如：`findup`，运行：

```text
$ /usr/share/fslint/fslint/findup --help
```

关于 FSlint 的更多细节，参照帮助部分和 man 页。

```text
$ /usr/share/fslint/fslint/fslint --help
$ man fslint
```
