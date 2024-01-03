---
title: KVM与实体机共享目录
tags:
  - Linux
  - 编程
categories:
  - 编程
date: 2023-05-06 22:43:03
---

# virtiofs
```xml
<filesystem type="mount" accessmode="passthrough">
  <driver type="virtiofs"/>
  <binary path="/usr/lib/virtiofsd"/>
  <source dir="/home/ansore/DATADISK/DISK3/virt_mount/project"/>
  <target dir="/home/ansore/project"/>
  <alias name="fs0"/>
  <address type="pci" domain="0x0000" bus="0x08" slot="0x00" function="0x0"/>
</filesystem>
```
挂载目录：
```bash
mount -t virtiofs myfs /mnt
```
# 9P
编辑配置文件：
`virsh edit kvm1`
```xml
<devices>
    <filesystem type="mount" accessmode="passthrough">
    <source dir="/home/ansore/DATADISK/DISK1/study/EFI"/>
    <target dir="share_dir"/>
    <address type="pci" domain="0x0000" bus="0x07" slot="0x00" function="0x0"/>
    </filesystem>
</devices>
```
启动虚拟机`virsh start kvm1`
执行控制台连接`virsh console kvm1`
确保9p和virtio内存驱动已经加载 `lsmod | grep 9p`
```
9pnet_virtio 17006 0 9pnet 61632 1 9pnet_virtio virtio_ring 17513 3 virtio_pci,virtio_balloon,9pnet_virtio virtio 13058 3 virtio_pci,virtio_balloon,9pnet_virtio
```
挂载共享的目录到/mnt. **`mount -t 9p -o trans=virtio tmp_shared /mnt`**
列出挂载 `mount | grep tmp_shared`
