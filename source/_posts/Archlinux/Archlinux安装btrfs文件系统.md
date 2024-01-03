---
title: Archlinux安装btrfs文件系统
tags:
  - Archlinux
categories:
  - Archlinux
date: 2023-12-03 22:42:08
---

以北外镜像站为例，在`/etc/pacman.d/mirrorlist`文件最开头添加这样一行：
```
Server = https://mirrors.bfsu.edu.cn/archlinux/$repo/os/$arch
```
硬盘分区如下：
```
$ lsblk
NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
sda      8:0    0 465.8G  0 disk
├─sda1   8:1    0   512M  0 part /boot
├─sda2   8:2    0    16G  0 part [SWAP]
└─sda3   8:3    0 449.3G  0 part /home
                                 /var/log
                                 /var/cache/pacman/pkg
                                 /
```
格式化分区:
```
mkfs.fat -F 32 /dev/sda1    # 格式化 boot 分区
mkswap /dev/sda2    # 格式化 swap 分区
mkfs.btrfs /dev/sda3    # 格式化主分区
```
然后是挂载分区，btrfs 分区的挂载比较复杂，首先挂载整个 btrfs 分区到 `/mnt`，这样才可以创建子卷：
```
mount /dev/sda3 /mnt    # 挂载分区
# 创建子卷
btrfs subvolume create /mnt/@
btrfs subvolume create /mnt/@home
btrfs subvolume create /mnt/@log
btrfs subvolume create /mnt/@pkg
umount /dev/sda3    # 卸载分区
```
于子卷的划分，我打算使用 Timeshift 来管理快照，而 Timeshift 只支持 Ubuntu 类型的子卷布局，也就是根目录挂载在 @ 子卷上，`/home` 目录挂载在 @home 子卷上；另外我还打算使用 grub-btrfs来为快照自动创建 grub 目录，grub-btrfs 要求 `/var/log` 挂载在单独的子卷上；还有 @pkg 子卷挂载在 `/var/cache/pacman/pkg` 目录下，这个目录下保存的是下载的软件包缓存，也没什么保存快照的必要，所以也单独划分了个子卷。
接下来就是挂载子卷了，使用 `subvol` 挂载选项来指定挂载的子卷：
```bash
# 挂载根目录
mount /dev/sda3 /mnt -o subvol=@,noatime,discard=async,compress=zstd
# 挂载家目录
mkdir /mnt/home
mount /dev/sda3 /mnt/home -o subvol=@home,noatime,discard=async,compress=zstd
# 挂载 /var/log 目录
mkdir -p /mnt/var/log
mount /dev/sda3 /mnt/var/log -o subvol=@log,noatime,discard=async,compress=zstd
# 挂载 /var/cache/pacman/pkg 目录
mkdir -p /mnt/var/cache/pacman/pkg
mount /dev/sda3 /mnt/var/cache/pacman/pkg -o subvol=@pkg,noatime,discard=async,compress=zstd
```
除了 `subvol` 选项用来指定挂载的子卷，我还添加了其他的挂载选项用于优化 btrfs 文件系统的性能：`noatime` 选项可以降低数据读取和写入的访问时间；`discard=async` 选项可以在闲时释放磁盘中未使用的区块，也就是 TRIM，另外也可以不添加这个选项，而是在系统安装完成后启用 `fstrim.timer` 服务从而定时执行 TRIM，可以根据自己的喜好选择；`compress` 选项可以在数据写入前进行压缩，减少磁盘的写入量，增加磁盘寿命，在某些场景下还能优化一些性能，支持的压缩算法有 `zlib`、`lzo` 和 `zstd`，`zstd` 算法是最快的。在系统安装完成后也可以编辑 `/etc/fstab` 文件修改挂载选项。
接下来挂载其他分区：
```bash
# 挂载 boot 分区
mkdir /mnt/boot
mount /dev/sda1 /mnt/boot
# 启用 swap 分区
swapon /dev/sda2
```
生成fstab文件：
```bash
genfstab -U /mnt >> /mnt/etc/fstab
```
因为 `/var/log` 和 `/var/cache/pacman/pkg` 在将来并不会被保存快照，也可以选择为这两个目录禁用写时复制：
```bash
chattr +C /mnt/var/log
chattr +C /mnt/var/cache/pacman/pkg
```
管理 btrfs 文件系统，比较推荐安装 btrfs-progs，其包含了很多用于管理 btrfs 文件系统的命令，前文用到的 `btrfs subvolume create` 命令就是来自这个软件包，Arch 官方的的安装镜像已经集成了这个软件包。可以在 `pacstrap` 步骤中安装这个包，我一般会在这个步骤装上如下的软件包：
```bash
pacstrap -K /mnt base base-devel linux-lts linux-lts-headers linux-firmware neovim btrfs-progs intel-ucode
```
使用`arch-chroot`进入系统，对于 btrfs 文件系统，需要编辑 mkinitcpio 文件，通常位于 `/etc/mkinitcpio.conf`，找到 `MODULES=()` 一行，在括号中添加 btrfs，这是为了在系统启动时提前加载 btrfs 内核模块，从而正常启动系统。记得每次编辑完 mkinitcpio 文件后都需要手动重新生成 initramfs：
```bash
mkinitcpio -P
```
配置完成后，再进行安装GRUB:
```bash
pacman -S grub
grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=Arch
grub-mkconfig -o /boot/grub/grub.cfg
```
