---
title: QEMU搭建ARM32环境
tags:
  - Linux
  - 编程
categories:
  - 编程
date: 2023-01-03 22:40:02
---

环境基于ubuntu18.04

# 编译内核
```
#获取内核源码
wget https://mirrors.tuna.tsinghua.edu.cn/kernel/v5.x/linux-5.4.18.tar.xz
tar -vxf linux-5.4.18.tar.xz

#编译内核
mkdir -p output
KERNEL_OUT=$PWD/output

cd linux-5.4.18

export ARCH=arm
export CROSS_COMPILE=/usr/local/arm/gcc-arm-11.2-2022.02-x86_64-arm-none-linux-gnueabihf/bin/arm-none-linux-gnueabihf-

make O=$KERNEL_OUT vexpress_defconfig
make O=$KERNEL_OUT zImage -j12
make O=$KERNEL_OUT modules -j12
make O=$KERNEL_OUT dtbs -j12
```
等待编译完成
```
内核镜像在：arch/arm/boot/zImage
设备树文件在：arch/arm/boot/dts/vexpress-v2p-ca9.dtb
```
# 制作arm32的ubuntu20.04根文件系统
## 安装 debootstrap 工具
```
sudo apt-get install binfmt-support qemu qemu-user-static debootstrap
```
## 制作ubuntu20.04文件系统
```
mkdir -p ubuntu20.04_rootfs

sudo debootstrap --arch=armhf --foreign focal ubuntu20.04_rootfs/ https://mirrors.tuna.tsinghua.edu.cn/ubuntu-ports/
#--arch：指定要制作文件系统的处理器体系结构，比如 armhf、arm64
#focal：指定 ubuntu 的版本。focal 是 ubuntu 20.04 系统
#--foreign: 只执行引导的初始解包阶段，仅仅下载和解压
#https://mirrors.tuna.tsinghua.edu.cn/ubuntu-ports/: 清华大学开源 ubuntu 镜像源地址

# sudo cp /usr/bin/qemu-aarch64-static ubuntu20.04_rootfs/usr/bin/
# sudo cp /usr/bin/qemu-arm-static ubuntu20.04_rootfs/usr/bin/
sudo chroot ubuntu20.04_rootfs/ debootstrap/debootstrap --second-stage
```
## 设置根文件系统的用户名和密码
```
#进入文件系统
sudo chroot ubuntu20.04_rootfs/

#修改root密码
passwd root

#添加用户
adduser username

#将username添加到/etc/sudoers中，否则无法使用sudo
sudo chmod +w /etc/sudoers
#修改/etc/sudoers，在root    ALL=(ALL:ALL) ALL下添加：
username    ALL=(ALL:ALL) ALL

sudo chmod -w /etc/sudoers

#设置编码类型
locale-gen zh_CN.UTF-8

#安装网络工具
apt update
apt install net-tools
apt install network-manager
apt install openssh-server
```
## 制作文件系统镜像文件
```
dd if=/dev/zero of=ubuntu20.04_arm.img bs=1M count=2048
mkfs.ext4 ubuntu20.04_arm.img

mkdir -p tmpfs
mount -t ext4 ubuntu20.04_arm.img tmpfs/ -o loop
cp -af ubuntu20.04_rootfs/* tmpfs/
umount tmpfs
chmod 777 ubuntu20.04_arm.img
```
# qemu启动脚本run.sh
```
#!/bin/bash
#https://wiki.qemu.org/Documentation

kernel_root=$PWD/system-image
kernel_image=$kernel_root/zImage
kernel_dtb=$kernel_root/vexpress-v2p-ca9.dtb
rootfs_image=$PWD/ubuntu20.04_arm.img

qemu-system-arm \
	-M vexpress-a9 \
	-m 1024M \
	-smp 4 \
	-nographic \
	-kernel $kernel_image \
	-dtb $kernel_dtb \
	-sd $rootfs_image \
	-append "noinitrd root=/dev/mmcblk0 rw rootwait earlyprintk console=ttyAMA0"	\
	-net nic -net user,hostfwd=tcp::2222-:22	\
	-vnc :1

exit 0
```
参数说明：
```
-M：指定开发板型号
-m：指定内存大小
-smp：指定cpu核心数
-nographic：无图形界面启动
-kernel：内核镜像
-dtb：设备树镜像
-sd：文件系统镜像
-append：传递给内核的启动参数
-net：指定网络类型，并将22端口映射为2222用于ssh登录
-vnc：指定vnc的端口，端口为5900+冒号后的数字
```
# 启动登录
```
#进入系统 
./run.sh
#登陆后获取网络ip 
sudo dhclient
```
# 配置ubuntu20.04自动获取ip
第4步中，需要每次开机都执行sudo dhclient才能获取到ip，过于麻烦。ubuntu20.04网络的配置信息将不再保存在/etc/network/interfaces文件中，虽然该文件依然存在，但是内容是空的。新系统已经使用netplan管理网络，可以在/etc/netplan/中创建00-installer-config.yaml配置文件实现:
```
sudo vim /etc/netplan/00-installer-config.yaml
```
添加如下内容,其中eth0为使用的网卡：
```
network:
	version: 2
	ethernets:
		eth0:
			dhcp4: true
			nameservers:
				addresses: [114.114.114.114,223.5.5.5]
```
保存后执行以下命令生效：
```
sudo netplan apply
```
# 解决apt update失败问题
执行 apt update 命令报错:
Certificate verification failed: The certificate is NOT trusted. The certificate chain uses expired certificate. Could not handshake: Error in the certificate verification
证书验证失败：证书不受信任。证书链使用过期的证书。无法握手：证书验证错误
解决方法：  
手动下载 ca-certificates deb 文件重新安装最新版。
```
wget http://archive.ubuntu.com/ubuntu/pool/main/c/ca-certificates/ca-certificates_20210119~16.04.1_all.deb

sudo dpkg -i ./ca-certificates_20210119~16.04.1_all.deb
```
