---
title: 构建RPM包
tags:
  - RPM
categories:
  - RPM
cover: 'https://img.ansore.top/2022/04/27/62692c1359d83.jpg'
abbrlink: 722c5981
date: 2022-09-10 23:15:41
---

# Archlinux下安装RPM包管理工具

`rpm-tools`是RPM的包管理工具，包括`rpm`、`rpmbuild`等命令，安装：

```bash
yay -S rpm-tools
```

# 准备

下载示例项目：https://github.com/opensourceway/how-to-rpm

解压：`tar -xvf utils.tar`

查看目录结构：

```
$ tree development  
development
├── license
│   ├── Copyright.and.GPL.Notice.txt
│   └── GPL_LICENSE.txt
├── scripts
│   ├── create_motd
│   ├── die
│   ├── mymotd
│   └── sysdata
└── spec
    └── utils.spec

3 directories, 7 files
```

# spec文件

每个spec文件有许多部分，其中一部分可能会忽略，取决于rpm包的具体情况。这个特定的 spec 文件不是工作所需的最小文件的示例，但它是一个包含不需要编译的文件的中等复杂 spec 文件的很好例子。 如果需要编译，它将在 `%build` 部分中执行，该部分在此 spec 文件中省略掉了，因为它不是必需的。

## 前言

这是spec文件唯一没有标签的部分，它包含运行命令`rpm -qi [package name]`时看到的大部分信息。

```ini
###############################################################################
# Spec file for Utils
################################################################################
# Configured to be built by user student or other non-root user
################################################################################
#
Summary: Utility scripts for testing RPM creation
Name: utils
Version: 1.0.0
Release: 1
License: GPL
URL: http://www.both.org
Group: System
Packager: David Both
Requires: bash
Requires: screen
Requires: mc
Requires: dmidecode
BuildRoot: ~/rpmbuild/

# Build with the following syntax:
# rpmbuild --target noarch -bb utils.spec
```

`rpmbuild` 程序会忽略注释行。我总是喜欢在本节中添加注释，其中包含创建包所需的 `rpmbuild` 命令的确切语法。

`Summary` 标签是包的简短描述。

`Name`、`Version` 和 `Release` 标签用于创建 rpm 文件的名称，如 `utils-1.00-1.rpm`。通过增加发行版号码和版本号，你可以创建 rpm 包去更新旧版本的。

`License` 标签定义了发布包的许可证。我总是使用 GPL 的一个变体。指定许可证对于澄清包中包含的软件是开源的这一事实非常重要。这也是我将 `License` 和 `GPL` 语句包含在将要安装的文件中的原因。

`URL` 通常是项目或项目所有者的网页。

`Group` 标签很有趣，通常用于 GUI 应用程序。 `Group` 标签的值决定了应用程序菜单中的哪一组图标将包含此包中可执行文件的图标。与 `Icon` 标签（我们此处未使用）一起使用时，`Group` 标签允许在应用程序菜单结构中添加用于启动程序的图标和所需信息。

`Packager` 标签用于指定负责维护和创建包的人员或组织。

`Requires` 语句定义此 rpm 包的依赖项。每个都是包名。如果其中一个指定的软件包不存在，DNF 安装实用程序将尝试在 `/etc/yum.repos.d` 中定义的某个已定义的存储库中找到它，如果存在则安装它。如果 DNF 找不到一个或多个所需的包，它将抛出一个错误，指出哪些包丢失并终止。

`BuildRoot` 行指定顶级目录，`rpmbuild` 工具将在其中找到 spec 文件，并在构建包时在其中创建临时目录。完成的包将存储在我们之前指定的 `noarch` 子目录中。

注释显示了构建此程序包的命令语法，包括定义了目标体系结构的 `–target noarch` 选项。因为这些是 Bash 脚本，所以它们与特定的 CPU 架构无关。如果省略此选项，则构建将选用正在执行构建的 CPU 的体系结构。

`rpmbuild` 程序可以针对许多不同的体系结构，并且使用 `--target` 选项允许我们在不同的体系结构主机上构建特定体系结构的包，其具有与执行构建的体系结构不同的体系结构。所以我可以在 x86_64 主机上构建一个用于 i686 架构的软件包，反之亦然。

## 描述部分

spec 文件的 `%description` 部分包含 rpm 包的描述。 它可以很短，也可以包含许多信息。

```ini
%description
A collection of utility scripts for testing RPM creation.
```

## 准备部分

`%prep` 部分是在构建过程中执行的第一个脚本。 在安装程序包期间不会执行此脚本。

这个脚本只是一个 Bash shell 脚本。 它准备构建目录，根据需要创建用于构建的目录，并将相应的文件复制到各自的目录中。 这将包括作为构建的一部分的完整编译所需的源代码。

`$RPM_BUILD_ROOT` 目录表示已安装系统的根目录。 在 `$RPM_BUILD_ROOT` 目录中创建的目录是真实文件系统中的绝对路径，例如 `/user/local/share/utils`、`/usr/local/bin` 等。

对于我们的包，我们没有预编译源，因为我们的所有程序都是 Bash 脚本。 因此，我们只需将这些脚本和其他文件复制到已安装系统的目录中。

```ini
%prep
################################################################################
# Create the build tree and copy the files from the development directories    #
# into the build tree.                                                         #
################################################################################
echo "BUILDROOT = $RPM_BUILD_ROOT"
mkdir -p $RPM_BUILD_ROOT/usr/local/bin/
mkdir -p $RPM_BUILD_ROOT/usr/local/share/utils

cp ~/RPM/how-to-rpm/development/scripts/* $RPM_BUILD_ROOT/usr/local/bin
cp ~/RPM/how-to-rpm/development/license/* $RPM_BUILD_ROOT/usr/local/share/utils
cp ~/RPM/how-to-rpm/development/spec/* $RPM_BUILD_ROOT/usr/local/share/utils

exit
```

本节末尾的 `exit` 语句是必需的。

## 文件部分

spec 文件的 `%files` 这一部分定义了要安装的文件及其在目录树中的位置。 它还指定了要安装的每个文件的文件属性（`%attr`）以及所有者和组所有者。 文件权限和所有权是可选的，但我建议明确设置它们以消除这些属性在安装时不正确或不明确的任何可能性。 如果目录尚不存在，则会在安装期间根据需要创建目录。

```ini
%files
%attr(0744, root, root) /usr/local/bin/*
%attr(0644, root, root) /usr/local/share/utils/*
```

## 安装前

此部分为空。 这应该放置那些需要 rpm 中的文件安装前执行的脚本。\

```ini
%pre
...
```



## 安装后

spec 文件的这一部分是另一个 Bash 脚本。 这个在文件安装后运行。 此部分几乎可以是你需要或想要的任何内容，包括创建文件、运行系统命令以及重新启动服务以在进行配置更改后重新初始化它们。 我们的 rpm 包的 `%post` 脚本执行其中一些任务。

```ini
%post
################################################################################
# Set up MOTD scripts                                                          #
################################################################################
cd /etc
# Save the old MOTD if it exists
if [ -e motd ]
then
   cp motd motd.orig
fi
# If not there already, Add link to create_motd to cron.daily
cd /etc/cron.daily
if [ ! -e create_motd ]
then
   ln -s /usr/local/bin/create_motd
fi
# create the MOTD for the first time
/usr/local/bin/mymotd > /etc/motd
```

## 卸载后

部分包含将在卸载 rpm 软件包后运行的脚本。 使用 `rpm` 或 `dnf` 删除包会删除文件部分中列出的所有文件，但它不会删除安装后部分创建的文件或链接，因此我们需要在本节中处理。

此脚本通常由清理任务组成，只是清除以前由 `rpm` 安装的文件，但 rpm 本身无法完成清除。 对于我们的包，它包括删除 `%post` 脚本创建的链接并恢复 motd 文件的已保存原件。

```ini
%postun
# remove installed files and links
rm /etc/cron.daily/create_motd

# Restore the original MOTD if it was backed up
if [ -e /etc/motd.orig ]
then
   mv -f /etc/motd.orig /etc/motd
fi
```

## 清理

这个 Bash 脚本在 rpm 构建过程之后开始清理。 下面 `%clean` 部分中的两行删除了 `rpm-build` 命令创建的构建目录。 在许多情况下，可能还需要额外的清理。

```ini
%clean
rm -rf $RPM_BUILD_ROOT/usr/local/bin
rm -rf $RPM_BUILD_ROOT/usr/local/share/utils
```

## 变更日志

此可选的文本部分包含 rpm 及其包含的文件的变更列表。最新的变更记录在本部分顶部。

```ini
%changelog
* Wed Aug 29 2018 Your Name <Youremail@yourdomain.com>
  - The original package includes several useful scripts. it is
    primarily intended to be used to illustrate the process of
    building an RPM.
```

# 构建rpm

运行以下命令以构建 rpm：

```bash
rpmbuild --target noarch -bb utils.spec
```

可查看对应目录所对应的包
