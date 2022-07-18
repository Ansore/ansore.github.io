---
title: BOOT加载LOADER
tags:
  - 64位系统实现
  - 操作系统
categories:
  - 操作系统
cover: 'https://img.ansore.top/2022/04/27/62692c1359d83.jpg'
date: 2022-07-17 01:27:12
---


# FAT12文件系统数据

```assembly
[org 0x7c00]
; 设置栈指针的位置
BaseOfStack equ 0x7c00
; 加载Loader到内存里的位置（20位）
BaseOfLoader equ 0x1000
OffsetOfLoader equ 0x00

; 根目录占用的扇区数：(BPB_RootEntCnt * 32 + BPB_BytesPerSec - 1) / BPB_BytesPerSec
; (224 * 32 + 512 - 1) / 512 = 14
RootDirSectors equ 14
; 根目录的起始扇区号 = 保留扇区数(BPB_RsvdSecCnt) + FAT表扇区数(BPB_FATSz16) + FAT表份数(BPB_NumFATs) = 1 + 9 * 2 = 19
SectorNumOfRootDirStart equ 19
; FAT表的起始扇区号，引导扇区的扇区号是0
SectorNumOfFAT1Start equ 1
; 用于平衡文件（或目录）的起始簇号与数据区起始簇号的差值。
SectorBalance equ 17

; FAT12 Head
jmp short LableStart nop
BS_OEMName	db	'ANOSboot'
BPB_BytesPerSec	dw	512
BPB_SecPerClus	db	1
BPB_RsvdSecCnt	dw	1
BPB_NumFATs	db	2
BPB_RootEntCnt	dw	224
BPB_TotSec16	dw	2880
BPB_Media	db	0xf0
BPB_FATSz16	dw	9
BPB_SecPerTrk	dw	18
BPB_NumHeads	dw	2
BPB_HiddSec	dd	0
BPB_TotSec32	dd	0
BS_DrvNum	db	0
BS_Reserved1	db	0
BS_BootSig	db	0x29
BS_VolID	dd	0
BS_VolLab	db	'boot loader'
BS_FileSysType	db	'FAT12   '
```

`BaseOfLoader`与`OffsetOfLoader`组成了Loader的起始物理地址，即`BaseOfLoader:OffsetOfLoader=0x10000`。

`RootDirSectors equ 14`定义了根目录占用的扇区数，这个数值是FAT12文件系统提供的信息计算得到的。即`(BPB_RootEntCnt * 32 + BPB_BytesPerSec - 1) / BPB_BytesPerSec = (224 * 32 + 512 - 1) / 512 = 14`

`SectorNumOfRootDirStart equ 19`定义了根目录的起始扇区，这个数组也是计算得到的。保留扇区数+FAT表扇区数\*FAT表份数=1+2\*9=19，扇区编号从0开始，所以根目录扇区编号为19

`SectorBalance equ 17`用于平衡文件（目录）的起始簇号与数据区起始簇号的差值。因为数据区对应的有效簇号是2，为了正确计算出FAT表项对应的数据区起始扇区号，则FAT表项值减2，或者将数据区的起始簇号/扇区号减2（仅在每簇一个扇区组成时可用）。暂用一种取巧的方式，将根目录起始扇区减2（19-2=17），进而间接把数据区的起始扇区号（数据区起始扇区号=根目录起始扇区号+根目录所占的扇区数）减2

# FAT中读取文件

## 读取磁盘扇区模块

```assembly
; read one sector from floppy
; 从第 ax 个 Sector 开始, 将 cl 个 Sector 读入 es:bx 中
ReadOneSector:
  push bp
  mov bp, sp
  sub esp, 2 ; 辟出两个字节的堆栈区域保存要读的扇区数: byte [bp-2]
  mov byte [bp-2], cl
  push bx
  mov bl, [BPB_SecPerTrk]
  div bl
  inc ah
  mov cl, ah
  mov dh, al
  shr al, 1
  mov ch, al
  and dh, 1
  pop bx
  mov dl, [BS_DrvNum]

GoOnReading:
  mov ah, 2
  mov al, byte [bp-2]
  int 0x13
  jc GoOnReading
  add esp, 2
  pop bp
  ret
```

通过中断`int 13`，从驱动器中读取开始地址(`ax`号扇区)后指定数量(`cl`个)扇区数据到目标地址(`es:bp`)

`ReadOneSector`负责实现读取。仅仅是对BIOS中断服务程序的再次封装，以简化读取磁盘扇区需要的操作，

`INT13, AH=0x02`功能：读取磁盘扇区

- AL=读取扇区数（非0）
- CH=磁道号（柱面号）的低8位
- CL=扇区号1~63（bit 0~5），磁道号（柱面号）的高2位（bit 6~7，只对硬盘有效）
- DH=磁头号
- DL=驱动器号（如果操作的是硬盘驱动器，bit 7必须被置位）
- ES:BX=>数据缓冲区

模块`ReadOneSector`仅仅是对BIOS的`0x13`号中断`0x02`号功能的封装，以简化磁盘读取扇区的的操作过程，该模块是需要参数的，参数说明如下：

- AX = 待读取的磁盘起始扇区号
- CL= 读入的扇区数量
- EX : BX => 数据缓冲区起始地址

模块`ReadOneSector`的参数中传入的磁盘扇区号是 **LBA（Logical Block Address，逻辑块寻址）** 格式的，而BIOS的`0x13`号中断`0x02`号功能只能接受 **CHS（Cylinder/Head/Sector，柱面/磁头/扇区）** 格式的磁盘扇区号，那么就需要将LBA格式的转换为CHS格式的，通过以下公式，便可以转换：

$$LAB扇区号 \div 每磁道扇区数 \begin{cases} 商Q \rightarrow \begin{cases} 柱面号=Q>=1 \\ 磁头号=Q \end{cases}\\ 余数R \rightarrow 起始扇区号 = R + 1 \end{cases}$$

具体流程如下：

1. 模块`ReadOneSector`一开始，先保存栈帧寄存器（`bp`）和栈寄存器（`sp`）中的数值（`bp`存储在栈中，`sp`保存在`bp`寄存器中）
2. 然后从栈中开辟两个字节的存储空间，即是`sp`向下移动两个字节（`sub esp, 2`）。然后将`CL`中的内容（1个字节，参数，读入扇区数）存入栈中，因为接下来要使用到`CL`寄存器。**注：** `CL`中的内容是一个字节，而栈项要对齐，所以要要用两个字节保存一个字节的内容，即使浪费了一个字节。
3. 然后就是把`BX`的内容也保存到栈中，因为接下来要用到`BX`。
4. 使用`AX`寄存器（待读取的磁盘起始扇区号）除以`BL`寄存器（每磁道扇区数），计算出目标磁道号（商：`AL`寄存器）和目标磁道内的起始扇区号（余数：`AH`寄存器），又因为磁道内的起始扇区号是从1开始计数的，故将此余数值加1（`inc ah; mov cl, ah`）紧接着按照以上公式计算出磁道号（即是柱面号）、磁头号。
5. 恢复`BX`
6. 获取驱动器号`BS_DrvNum`
7. 设置`0x13`中断功能号`AH=0x02`，设置读入扇区数`mov al, byte [bp - 2]`（我们之前把参数`CL`读入扇区数保存在了栈中，所以现在用`bp`去索引它）。
8. 然后调用`0x13`号中断。
9. 判断是否读取成功（即是若CF位为0，则成功），否则（CF=1）回到步骤`7`。

## LOADER.BIN文件搜索

```assembly
; search loader.bin
; 保存根目录的起始扇区号(SectorNo)，赋值为SectorNumOfRootDirStart(根目录的起始扇区)
; 19
mov word [SectorNo], SectorNumOfRootDirStart

SearchInRootDirBegin:
  ; RootDirSizeForLoop(临时变量) == RootDirSectors (14)
  cmp word [RootDirSizeForLoop], 0
  jz NoLoaderBin
  ; 查找扇区-1
  dec word [RootDirSizeForLoop]
  ; 设置读取扇区模块参数 EX:BX,AX,CL
  mov ax, 0x0000
  mov es, ax
  mov bx, 0x8000
  mov ax, [SectorNo]
  mov cl, 1
  ; 读取扇区模块
  call ReadOneSector
  ; 开始查找loader.bin
  mov si, LoaderFileName ; 文件名源地址
  mov di, 0x8000 ; 文件名目标地址
  cld ; DF复位=0，往高地址递进
  mov dx, 0x10

SearchForLoaderBin:
  ; 如果dx=0,说明比较完成，开始读取下一个根目录扇区
  cmp dx, 0
  jz GotoNextSectorInRoorDir
  ; 否则dx-1（目录项-1）
  dec dx
  ; cx保存目录项文件名长度 11bits
  mov cx, 11

CmpFileName:
  ; 判断文件名是否比较完
  ; 如果cx=0,说明已找到
  cmp cx, 0
  jz FileNameFound
  ; 没有比较完, cx-1，继续比较下一个字符
  dec cx
  ; 从DS:SI读取一个字节到寄存器AL，然后SI+=1（取决与DF）
  lodsb
  ; 比较目标字符串中对应的字符与AL中的字符是否相等
  cmp al, byte [es:di]
  ; 如果相等，继续比较下一个字符(跳转到GOON)
  jz GoOn
  ; 如果不相等,就继续下一个文件项
  jmp Different

GoOn:
  ; 目标字符串+1，然后继续比较
  inc di
  jmp CmpFileName

Different:
  ; di低5位清零
  and di, 0xffe0
  ; di += 32，表示指向下一个目录
  and di, 0x20
  ; si指向LoaderFileName的起始地址
  mov si, LoaderFileName
  ; 继续比较
  jmp SearchForLoaderBin

GotoNextSectorInRoorDir:
  ; 如果在当前扇区找不到loader.bin，继续在下一个扇区找
  ; 扇区号+1
  add word [SectorNo], 1
  jmp SearchInRootDirBegin

```

## 找不到LOADER.BIN文件

```assembly
; display on screen: Error LEADER.BIN file not found
NoLoaderBin:
  mov ax, 0x1301
  mov bx, 0x008c
  mov dx, 0x0100
  mov cx, 21
  push ax
  mov ax, ds
  mov es, ax
  pop ax
  mov bp, NoLoaderBinText
  int 0x10
  jmp $
```

屏幕上显示错误信息

## FAT表项解析

当找到loader.bin文件之后，根据FAT表项提供的簇号顺序依次加载扇区数据到内存中，这会涉及到FAT表项的解析工作：

```assembly
; get FAT Entry
; AX = FAT表项号
GetFATEntry:
  push es
  push bx
  push ax
  mov ax, 0x00
  mov es, ax
  pop ax
  ; Odd奇偶标志变量
  mov byte [Odd], 0
  mov bx, 3
  mul bx
  mov bx, 2
  div bx
  ; 判断余数的奇偶性
  cmp dx, 0
  jz Even
  mov byte [Odd], 1

Even:
  ; 读取FAT表扇区，总共两个扇区
  xor dx, dx
  mov bx, [BPB_BytesPerSec]
  div bx
  push dx
  mov bx, 0x8000
  add ax, SectorNumOfFAT1Start
  mov cl, 2
  call ReadOneSector

  pop dx
  add bx, dx
  mov ax, [es:bx]
  cmp byte [Odd], 1
  jnz Even2
  shr ax, 4

Even2:
  and ax, 0xfff
  pop bx
  pop es
  ret

```

该模块`GetFATEntry`的功能：根据当前FAT表项索引出下一个FAT表项，参数如下：

- AH=FAT表项号（输入/输出参数）

首先把FAT表项号（AX）保存，并将奇偶标志变量置0，因为每个FAT表项占1.5B，并不是偶数对齐，所以就将FAT表项乘以3再除以2（也就是扩大1.5倍），然后判断余数的奇偶性并保存在变量`[Odd]`中（奇数为1，偶数为0），再将计算结果除以每扇区字节数，商即为FAT表项的偏移扇区号，余数为FAT表项在扇区中的位置。然后通过`ReadOneSector`模块，连续读入两个扇区，这样做的目的是，为了解决FAT表项横跨两个扇区的问题，最后根据奇偶标志变量`[Odd]`处理奇偶项错位问题，即是奇数项向右移动4位。

## 加载loader.bin到内存

```assembly
; found loader.bin name in root dir
; 如果在根目录找到了loader.bin文件
FileNameFound:
  ; 如果找到了的话，当前es:di指向的就是目标表项
  ; ax保存根目录占用的扇区
  mov ax, RootDirSectors
  ; 定位到表项起始簇号的位置（偏移0x1a）
  and di, 0xffe0
  add di, 0x1a
  ; 起始簇号保存到cx
  mov cx, word [es:di]
  push cx
  ; 计算数据区起始扇区号
  ; 数据区起始扇区号=根目录起始扇区号+根目录所占扇区数-2
  add cx, ax
  ; SectorBalance = 根目录起始扇区号-2
  add cx, SectorBalance
  ; 配置loader的加载位置es:bx
  mov ax, BaseOfLoader
  mov es, ax
  mov bx, OffsetOfLoader
  ; ax = loader起始扇区号
  mov ax, cx

GoOnLoadingFile:
  ; 显示字符 "."
  push ax
  push bx
  mov ah, 0x0e
  mov al, '.'
  mov bl, 0xf
  int 0x10
  pop bx
  pop ax

  ; 读取loader
  ; 每读入一个扇区就通过GetFATEntry模块读取下一个FAT表项
  ; 然后继续读入数据
  mov cl, 1
  call ReadOneSector
  ; 恢复簇号
  pop ax
  ; 读取下一个簇号
  call GetFATEntry
  ; 查看是否已经读取完成
  cmp ax, 0xfff
  jz FileLoaded
  ; 否则保存获取到的簇号
  push ax
  ; 计算loader文件的下一个簇号的位置
  mov dx, RootDirSectors
  add ax, dx
  add ax, SectorBalance
  add bx, [BPB_BytesPerSec]
  ; 继续读取文件
  jmp GoOnLoadingFile

FileLoaded:
  ; 加载完文件，死循环等待
  jmp $
```

## 临时变量和字符串变量

```assembly
; temp variable
RootDirSizeForLoop dw RootDirSectors
SectorNo dw 0
Odd db 0

; display message
StartBootText: db "Start Boot Anos"
NoLoaderBinText: db "ERROR: LOADER.BIN FILE NOT FOUND"
LoaderFileName: db "LOADER  BIN", 0
```

# 生成镜像测试

编译boot.bin

```assembly
nasm -f bin boot.asm -o boot.bin
```

生成软盘镜像：

```bash
bximage -q -fd=1.44M -func=create ./boot.img
```

写入引导扇区：

```assembly
dd if=$(BUILD)/boot.bin of=boot.img bs=512 count=1 conv=notrunc
```

boches配置：

```ini
# configuration file generated by Bochs
plugin_ctrl: unmapped=true, biosdev=true, speaker=true, extfpuirq=true, parallel=true, serial=true, iodebug=true, pcidev=false, usb_uhci=false
config_interface: textconfig
display_library: x, options="gui_debug"
memory: host=32, guest=32
romimage: file="/usr/share/bochs/BIOS-bochs-latest", address=0x00000000, options=none
vgaromimage: file="/usr/share/bochs/VGABIOS-lgpl-latest"
boot: floppy
floppy_bootsig_check: disabled=0
floppya: type=1_44, 1_44="boot.img", status=inserted, write_protected=0
# floppya: type=1_44
# no floppyb
ata0: enabled=true, ioaddr1=0x1f0, ioaddr2=0x3f0, irq=14
ata0-master: type=none
ata0-slave: type=none
ata1: enabled=true, ioaddr1=0x170, ioaddr2=0x370, irq=15
ata1-master: type=none
ata1-slave: type=none
ata2: enabled=false
ata3: enabled=false
optromimage1: file=none
optromimage2: file=none
optromimage3: file=none
optromimage4: file=none
optramimage1: file=none
optramimage2: file=none
optramimage3: file=none
optramimage4: file=none
pci: enabled=1, chipset=i440fx, slot1=none, slot2=none, slot3=none, slot4=none, slot5=none
vga: extension=vbe, update_freq=5, realtime=1, ddc=builtin
cpu: count=1:1:1, ips=4000000, quantum=16, model=bx_generic, reset_on_triple_fault=1, cpuid_limit_winnt=0, ignore_bad_msrs=1, mwait_is_nop=0
cpuid: level=6, stepping=3, model=3, family=6, vendor_string="AuthenticAMD", brand_string="AMD Athlon(tm) processor"
cpuid: mmx=true, apic=xapic, simd=sse2, sse4a=false, misaligned_sse=false, sep=true
cpuid: movbe=false, adx=false, aes=false, sha=false, xsave=false, xsaveopt=false, avx_f16c=false
cpuid: avx_fma=false, bmi=0, xop=false, fma4=false, tbm=false, x86_64=true, 1g_pages=false
cpuid: pcid=false, fsgsbase=false, smep=false, smap=false, mwait=true
print_timestamps: enabled=0
debugger_log: -
magic_break: enabled=1
port_e9_hack: enabled=0
private_colormap: enabled=0
clock: sync=none, time0=local, rtc_sync=0
# no cmosimage
log: -
logprefix: %t%e%d
debug: action=ignore
info: action=report
error: action=report
panic: action=ask
keyboard: type=mf, serial_delay=250, paste_delay=100000, user_shortcut=none
mouse: type=ps2, enabled=false, toggle=ctrl+mbutton
speaker: enabled=true, mode=system
parport1: enabled=true, file=none
parport2: enabled=false
com1: enabled=true, mode=null
com2: enabled=false
com3: enabled=false
com4: enabled=false
```

boches加载镜像：

```assembly
bochs -q -f bochsrc.floppy -unlock
```

此时可以看到虚拟机输出：

```
ERROR: LOADER.BIN FILE NOT FOUND
```

# 加载简单的LOADER.BIN

首先修改加载文件后的跳转地址：

```assembly
FileLoaded:
  jmp BaseOfLoader:OffsetOfLoader
```

编写简单的loader.bin文件：

```assembly
[org 0x10000]

mov ax, cs
mov ds, ax
mov es, ax
mov ax, 0x00
mov ss, ax
mov sp, 0x7c00

; display start loader ...
mov ax, 0x1301
mov bx, 0xf
mov dx, 0x200
mov cx, 15
push ax
mov ax, ds
mov es, ax
pop ax
mov bp, StartLoaderText
int 0x10

jmp $

StartLoaderText: db "Start Loader..."
```

就是在屏幕上输出：`Start Loader...`

## 加载测试

测试编译loader.bin

```bash
nasm -f bin loader.asm -o loader.bin
```

将loader.bin拷贝进软盘中：

```bash
mkdir ./tmp
mount boot.img tmp -t vfat -o loop
cp loader.bin tmp
sync
umount ./tmp
```

再次运行测试：

```bash
bochs -q -f bochsrc.floppy -unlock
```

此时可以看到屏幕输出：

```
Start Loader...
```

Loader.bin成功加载
