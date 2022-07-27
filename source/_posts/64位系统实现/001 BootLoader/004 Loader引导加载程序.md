---
title: Loader引导加载程序
tags:
  - 64位系统实现
  - 操作系统
categories:
  - 操作系统
cover: 'https://img.ansore.top/2022/04/27/62692c1359d83.jpg'
abbrlink: de9aab27
date: 2022-07-24 01:27:12
---


# Loader需要做的事

-  检测硬件信息
- 处理器模式切换
- 向内核传递数据

# Loader详解

## 基础数据定义和头文件引用

```assembly
[org 0x10000]
jmp LabelStart

%include "boot/fat12.inc"

BaseOfKernelFile equ 0x00
OffsetOfKernelFile equ 0x100000

BaseTmpOfKernelAddr equ 0x00
OffsetTmpOfKernelFile equ 0x7e00

MemoryStructBufferAddr equ 0x7e00
```

`fat12.inc`为FAT12文件系统结构。

定义内核程序的起始地址为`0x100000`（1MB），因为1MB以下的内存并不是全部可用的空间。这段内存被划分为若干个子空间段，可以是内存空间、非内存空间以及地址空间。内核程序很可能超过1MB，所以让内核跳过这段复杂的空间。

`0x7e00`是内核程序的临时转存空间，由于内核读取是通过BIOS中断`INT 0x13`调用，BIOS在实模式下只支持1MB的物理地址空间寻址，所以需要先存储到临时空间，然后再通过特殊的操作传到1MB以上空间中。当内核程序全部转存到内存空间后，这个临时转存空间可以改为内存结构数据的存储空间，供内核程序在初始化时候使用。

## LOADER引导程序入口

```assembly
[SECTION .s16]
[BITS 16]
LableStart:
```

`[SECTION .s16]`为定义一个.s16的段，`[BITS 16]`伪指令可以通知编译器编译代码时在16位宽的处理器上运行

## 开启实模式下4GB寻址功能

```assembly
[SECTION gdt]
LABEL_GDT: dd 0,0
LABEL_DESC_CODE32: dd 0x0000FFFF,0x00CF9A00
LABEL_DESC_DATA32: dd 0x0000FFFF,0x00CF9200

GdtLen equ $ - LABEL_GDT
GdtPtr dw GdtLen - 1
       dd LABEL_GDT

SelectorCode32 equ LABEL_DESC_CODE32 - LABEL_GDT
SelectorData32 equ LABEL_DESC_DATA32 - LABEL_GDT

; ......

  ; open address A20
  push ax
  in al, 0x92
  or al, 00000010b
  out 0x92, al
  pop ax
  
  cli

  db 0x66
  lgdt [GdtPtr]

  mov eax, cr0
  or eax, 1
  mov cr0, eax

  mov ax, SelectorData32
  mov fs, ax
  mov eax, cr0
  and al, 11111110b
  mov cr0, eax

  sti
```

开启地址A20功能，此功能属于历史遗留问题。最初处理器只有20根地址线，只有1MB的寻址能力，如果超过了1MB的寻址范围操作，也只有低20位是有效的。为了保证向下兼容，便出现了一个控制开启/禁止1MB以上地址空间的开关。当时的8042键盘控制器上恰好有空闲的端口引脚（输出端口P2，引脚P21），从而使用此引脚作为控制开关，即A20功能。如果A20引脚为低电平，那么只有低20位有效。

开启A20功能的方法：

- 操作键盘控制器，由于键盘控制器是低速设备，以至于功能开启速度过慢
- A20快速门（Fast Gate A20），它使用I/O端口0x92来处理A20信号线。对于不含键盘控制器的操作系统，就只能使用0x92端口来控制，但是该端口可能被其他设备使用
- 通过读0xee端口来开启A20信号线，而写该端口则会禁止A20信号线

上面代码通过A20快速门来开启A20。

当A20功能开启后，紧接着使用`cli`指令关闭外部中断，再通过指令LGDT加载保护模式结构数据信息，并置CR0寄存器的第0位来开启保护模式。当进入保护模式后，为FS段寄存器加载新的数据段值，一旦完成数据加载就从保护模式中退出，并开启外部中断。

整个操作实现了保护模式的开启和关闭，其目的是为了FS段寄存器可以在实模式下寻址能力超过1MB，也就是Big Real Mode模式。

## FAT12文件系统搜索内核文件程序

```assembly
  ; search kernel.bin
  mov word [SectorNo], SectorNumOfRootDirStart

SearchInRootDirBegin:
  cmp word [RootDirSizeForLoop], 0
  jz NoKernelBin
  dec word [RootDirSizeForLoop]
  mov ax, 0x0000
  mov es, ax
  mov bx, 0x8000
  mov ax, [SectorNo]
  mov cl, 1
  call ReadOneSector
  mov si, KernelFileName
  mov di, 0x8000
  cld
  mov dx, 0x10

SearchForKernelBin:
  cmp dx, 0
  jz GotoNextSectorInRoorDir
  dec dx
  mov cx, 11

CmpFileName:
  cmp cx, 0
  jz FileNameFound
  dec cx
  lodsb
  cmp al, byte [es:di]
  jz GoOn
  jmp Different

GoOn:
  inc di
  jmp CmpFileName

Different:
  and di, 0xffe0
  add di, 0x20
  mov si, KernelFileName
  jmp SearchForKernelBin

GotoNextSectorInRoorDir:
  add word [SectorNo], 1
  jmp SearchInRootDirBegin

; display on screen: Error: KERNEL NOT FOUNT
NoKernelBin:
  mov ax, 0x1301
  mov bx, 0x008c
  mov dx, 0x0300 ; row 3
  mov cx, 23
  push ax
  mov ax, ds
  mov es, ax
  pop ax
  mov bp, NoKernelBinMessage
  int 0x10
  jmp $
```

## 将KERNEL读取到物理内存中

```assembly
; found kernel.bin name in root dir
FileNameFound:
  mov ax, RootDirSectors
  and di, 0xffe0
  add di, 0x1a
  mov cx, word [es:di]
  push cx
  add cx, ax
  add cx, SectorBalance
  mov eax, BaseTmpOfKernelAddr ; base of kernel file
  mov es, ax
  mov bx, OffsetTmpOfKernelFile ; offset of kernel file
  mov ax, cx

GoOnLoadingFile:
  push ax
  push bx
  mov ah, 0x0e
  mov al, '.'
  mov bl, 0x0f
  int 0x10
  pop bx
  pop ax

  mov cl, 1
  call ReadOneSector
  pop ax

  push cx
  push eax
  push fs
  push edi
  push ds
  push esi

  mov cx, 0x200
  mov ax, BaseOfKernelFile
  mov fs, ax
  mov edi, dword [OffsetOfKernelFileCount]

  mov ax, BaseTmpOfKernelAddr
  mov ds, ax
  mov esi, OffsetTmpOfKernelFile

MovKernel:
  mov al, byte [ds:esi]
  mov byte [fs:edi], al
  inc esi
  inc edi

  loop MovKernel

  mov eax, 0x1000
  mov ds, eax
  mov dword [OffsetOfKernelFileCount], edi

  pop esi
  pop ds
  pop edi
  pop fs
  pop eax
  pop cx

  call GetFATEntry
  cmp ax, 0xfff
  jz FileLoaded
  push ax
  mov dx, RootDirSectors
  add ax, dx
  add ax, SectorBalance
  jmp GoOnLoadingFile
```

这部分负责将内核程序读取到临时转存空间中，随后再将它移动到1MB以上的物理内存空间。为了避免转存发生错误，一个字节一个字节的复制，借助汇编的LOOP指令可以完成。由于内核体积庞大必须逐个簇读取和转存，那么每次转存的时候必须保存目标偏移，该值（EDI寄存器）保存于临时变量`OffsetOfKernelFileCount`中。

## 加载完成后显示字母G

```assembly
FileLoaded:
  mov ax, 0xb800
  mov gs, ax
  mov ah, 0x0f ; 0000 black background, 1111 white word
  mov al, 'G'
  mov [gs:((80*0+39)*2)], ax ; 0 row, 39 colum
```

## 关闭软驱马达

```assembly
KillMotor:
  push dx
  mov dx, 0x03f2
  mov al, 0
  out dx, al
  pop dx
```

关闭软驱马达是通过向I/O端口0x3f2写入控制命令实现的，此端口控制着软盘驱动器的不少硬件功能

![Screenshot_20220709_004852](https://img.ansore.top/2022/07/9/24e2e9db417aec58589dbbc4e5ad08fd.png)

内核程序从软盘加载到内存，可以向此I/O端口写入0关闭全部软盘驱动器。在使用OUT汇编指令操作I/O端口时，需要注意8位端口与16位端口的使用区别。

> OUT指令的源操作数根据端口位宽可以选用AL/AX/EAX寄存器；目的操作数可以是立即数或DX寄存器，其中立即数的取值范围只能是8位宽（0\~0xFF），而DX寄存器允许的取值范围是16位宽（0\~0xFFFF）

## 物理地址空间信息获取

```assembly
  ; get memory address size type
  mov ax, 0x1301
  mov bx, 0xf
  mov dx, 0x400
  mov cx, 24
  push ax
  mov ax, ds
  mov es, ax
  pop ax
  mov bp, StartGetMemStructMessage
  int 0x10

  mov ebx, 0
  mov ax, 0x00
  mov es, ax
  mov di, MemoryStructBufferAddr

GetMemStruct:
  mov eax, 0x0e820
  mov ecx, 20
  mov edx, 0x534d4150
  int 0x15
  jc GetMemFailed
  add di, 20

  cmp ebx, 0
  jne GetMemStruct
  jmp GetMemOk

GetMemFailed:
  mov ax, 0x1301
  mov bx, 0x008c
  mov dx, 0x0500
  mov cx, 23
  push ax
  mov ax, ds
  mov es, ax
  pop ax
  mov bp, GetMemStructErrorMessage
  int 0x10
  jmp $

GetMemOk:
  mov ax, 0x1301
  mov bx, 0x000f
  mov dx, 0x0600
  mov cx, 29
  push ax
  mov ax, ds
  mov es, ax
  pop ax
  mov bp, GetMemStructOkMessage
  int 0x10
```

物理地址空间信息由一个结构体数组构成，计算机平台的地址空间划分情况都能从这个结构体数组中反映出来，它记录的地址空间类型包括可用物理内存地址空间、设备寄存器地址空间、内存空洞等。

这段程序借助BIOS中断服务程序`INT 0x15`来获取物理地址空间信息，并将其保存到0x7e00地址处的临时空间内，操作系统会在初始化内存管理单元时解析该结构体数组。

## 显示AL寄存器

```assembly
; display num in al
DisplauAL:
  push ecx
  push edx
  push edi

  mov edi, [DispalyPosition]
  mov ah, 0x0f
  mov dl, al
  shr al, 4
  mov ecx, 2

.begin:
  and al, 0x0f
  cmp al, 9
  jz .1
  add al, '0'
  jmp .2

.1:
  sub al, 0x0a
  add al, 'A'

.2:
  mov [gs:edi], ax
  add edi, 2

  mov al, dl
  loop .begin
  mov [DispalyPosition], edi

  pop edi
  pop edx
  pop ecx

  ret
```

`DisplauAL`的功能：显示16进制数字

- AL=要显示的十六进制数

先保存即将变更的寄存器值到栈中，然后把变量`DispalyPosition`保存的屏幕偏移值（字符游标索引值）载入到`edi`寄存器中，并向AH寄存器存入字体的颜色属性值。为了先显示AL寄存器的高四位数据，暂时吧AL寄存器的低4位数据保存在DL寄存器。然后将AL寄存器的高4位与9比较，如果大于9，则减去`0x0a`并与字符`A`相加，否则与字符`0`相加。然后将AX寄存器（AL与AH寄存器组合而成）的值，保存到GS段寄存器的基地址、`DispalyPosition`变量为偏移的显示字符内存空间中。

## 显示视频图像芯片的查询信息

```assembly
  ; set the SVGA mode (VESA VBE)
  mov ax, 0x4f02
  mov bx, 0x4180 ; model: 0x180 or 0x143
  int 0x10

  cmp ax, 0x004f
  jnz SetSVGAModeVesaVbeFailed
```

这段程序设置了SVGA芯片的显示模式， `0x180` 和 `0x143`是显示模式：

![Screenshot_20220713_225659](https://img.ansore.top/2022/07/13/537f8ad772fe8226b1538fc74de3e000.png)

## 切换保护模式需要的系统数据结构

```assembly
[SECTION gdt]
GDT: dd 0,0
DESC_CODE32: dd 0x0000FFFF,0x00CF9A00
DESC_DATA32: dd 0x0000FFFF,0x00CF9200

GdtLen equ $ - GDT
GdtPtr dw GdtLen - 1
       dd GDT

SelectorCode32 equ DESC_CODE32 - GDT
SelectorData32 equ DESC_DATA32 - GDT
```

这是个临时的GDT表。为了避免保护模式段结构的复杂型，此处将代码段和数据段的段地址都设置在0x00000000地址处，此处限长位0xffffffff，即段可以索引0~4GB的内存地址空间。

GDT表的基地址和长度必须借助`LGDT`指令才能加载得到`GDTR`寄存器，而GDTR寄存器是一个6B的结构，结构中的低2B保存GDT表的长度，高4B保存GDT表的基地址，标识符GdtPrt是此结构的起始地址。这个GDT表用于开启Big Real Mode模式，由于其数据结构被设置成平坦地址空间（0~4GB地址空间），所以FS段寄存器可以寻址整个4GB内存地址空间。

`SelectorCode32`和`SelectorData32`是两个段选择子，它们是段描述符在GDT表中的索引号。

## 开辟IDT内存空间

```assembly
; tmp IDT
IDT:
  times 0x50 dq 0
IDT_END:

IDT_POINTER:
  dw IDT_END - IDT - 1
  dd IDT
```

## 切换到保护模式

在处理器切换到保护模式之前，引导加载程序已使用CLI指令禁止外部中断，所以在切换到保护模式的过程中不会产生中断和异常，进而不必完整初始化IDT，只要有相应的结构体即可。如果能保证在切换过程中不会产生任何异常，即使没有IDT也可以。

处理器进入保护模式的标志：执行MOV汇编指令置位CR0控制寄存器的PE标志位（可同时置CR0寄存器的PG标志位开启分页机制）。进入保护模式后，处理器将从0特权级开始执行。具体步骤如下：

1. 执行`CLI`指令禁止可屏蔽的硬件中断，对于不可屏蔽中断NMI只能借助外部电路才能禁止。（模式切换过程中必须保证在切换过程中不能产生中断和异常）
2. 执行`LGDT`指令将GDT的基地址和长度加载到`GDTR`寄存器
3. 执行`MOV CR0`指令置CR0控制寄存器的PE标志位。（可同时置CR0控制寄存器的PG标志位）
4. 一旦`MOV CR0`指令执行结束，其后必须执行一条远跳转（far JMP）或远调用（far CALL）指令，切换到保护模式的代码区执行
5. 通过执行`JMP`或`CALL`指令，可以改变处理器的执行流水先，进而使处理器加载执行保护模式的代码段
6. 如果开启分页机制，那么`MOV CR0`指令和`JMP/CALL`指令必须位于同一地址映射页面内。（因为保护模式和分页机制使能后的物理地址，与执行`JMP/CALL`指令的线性地址相同）至于`JMP`或`CALL`指令的目标地址，则无需进行同一性地址映射（线性地址和物理地址重合）
7. 如需使用`LDT`，则需借助`LLDT`汇编指令将GDT内的LDT段选择子加载到LDTR寄存器中。
8. 执行LTR指令将一个TSS段描述符的段选择子加载到TR任务寄存器。处理器对TSS段结构无特殊要求，凡是可写内存空间都可以
9. 进入保护模式后，数据段寄存器仍然保留这实模式的段数据，必须重新加载数据段选择子或使用JMP/CALL执行新任务，便可以将其更新为保护模式。对于不使用的数据段寄存器（DS和SS寄存器除外），可将NULL段选择子加载到其中。
10. 执行LIDT指令，将保护模式下的IDT表的基地址和长度加载到IDTR寄存器
11. 执行STI指令使能可屏蔽硬件中断，并执行必要的硬件操作使能NMI不可屏蔽中断。

代码如下：

```assembly
  ; init IDT GDT goto protect mode
  cli ; close interrupt

  db 0x66
  lgdt [GdtPtr]
  
  mov eax, cr0
  or eax, 1
  mov cr0, eax

  jmp dword SelectorCode32:GoToTmpProtect
```

`db 0x66`这个字节是LGDT和LIDT汇编指令的前缀，用于修饰当前指令的操作数是32位宽。而最后一条远跳指令明确指定目标代码段选择子和段内偏移地址。

## 从保护模式到IA-32e模式

在进入IA-32e模式前，处理器依然要位IA-32e模式准备执行代码，必要的系统数据结构以及配置相关控制寄存器。此外处理器只能在开启分页机制的保护模式下才能切换到IA-32e模式

- 系统数据结构。系统各个描述符表寄存器必须重新加载（GDRT、LDTR、IDTR、TR）为IA-32e模式的64位描述符表
- 中断和异常。在IDTR寄存器更新为64位中断描述符表IDT前不要触发中断和异常。

`IA32_EFER`寄存器（位于MSR寄存器组）的`LME`标志位用于控制IA-32e模式的开启和关闭，该寄存器会伴随处理器的重启而清零。IA-32e模式的页管理机制将物理地址扩展为4层页表结构。IA-32e模式激活前（`CR0.PG=1`，处理器运行在32位兼容模式），CR3寄存器仅有低32位可写入数据，从而限制页表只能寻址4GB的物理内存空间、

IA-32e模式的初始化步骤：

1. 在保护模式下，使用`MOV CR0`汇编指令复位`CR0`控制寄存器的PG标志位，以关闭分页机制。
2. 置位`CR4`控制寄存器的PAE标志位，开启物理地址扩展功能（PAE）。在IA-32e模式的初始化过程中，如果PAE开启失败，将会产生通用保护性异常。
3. 将页目录（顶层页表`PML4`）的物理基地址加载到`CR3`控制寄存器
4. 置`IA32_EFER`寄存器的`LME`标志位，开启IA-32e模式
5. 置CR0控制寄存器的PG标志位开启分页机制，此时处理器会自从置`IA32_EFER`的LMA标志位。当执行MOV CR0指令开启分页机制时，其后指令必须位于同一性地址映射的页面内（直到处理器进入IA-32e模式后，才可以使用非同一性地址映射的页面）

如果试图改变`IA32_EFER`、`CR0.PG`和`CR4.PAE`等影响IA-32e模式开启的标志位，处理器会进行64位模式的一致性检测，以确保处理器不会进入未定义模式或不可预测状态。如果一致性检测失败，处理器将会产生通用保护性异常（#GP）。以下之一会导致检测失败：

- 当开启分页机制后，再试图使能或禁止IA-32e模式
- 当开启IA-32e模式后，试图在开启物理地址扩展（`PAE`）功能前使能分页机制
- 在激活IA-32e模式后，试图禁止`PAE`
- 当`CS`寄存器的L位被置位时，在试图激活IA-32e模式
- 如果`TR`寄存器加载的是16位`TSS`段结构

## IA-32e模式的临时GDT表

```assembly
[SECTION gdt64]
GDT64: dq 0x0000000000000000
DESC_CODE64: dq 0x0020980000000000
DESC_DATA64: dq 0x0000920000000000

GdtLen64 equ $ - GDT64
GdtPtr64 dw GdtLen64 - 1
         dd GDT64

SelectorCode64 equ DESC_CODE64 - GDT64
SelectorData64 equ DESC_DATA64 - GDT64
```

IA-32e模式简化了保护模式的段结构，删掉冗余的段基地址和段限长，使段直接覆盖整个线性地址空间，进而变成平坦地址空间。

## 初始化各个段寄存器以及栈指针

```assembly
[SECTION .s32]
[BITS 32]
GoToTmpProtect:
  ; go to tmp long mode
  mov ax, 0x10
  mov ds, ax
  mov es, ax
  mov fs, ax
  mov ss, ax
  mov esp, 0x7e00
  call SupportLongMode
  test eax, eax
  jz NoSupport
```

## 检测处理器是否支持IA-32e模式

```assembly
; test support long mode or not
SupportLongMode:
  mov eax, 0x80000000
  cpuid
  cmp eax, 0x80000001
  setnb al
  jb SupportLongModeDone
  mov eax, 0x80000001
  cpuid
  bt edx, 29
  setc al

SupportLongModeDone:
  movzx eax, al
  ret

NoSupport:
  jmp $
```

由于`CPUID`指令的扩展功能项`0x80000001`的第29位，指示处理器是否支持IA-32e模式。首先检测当前处理器对`CPUID`指令的支持情况，判断该指令的最大扩展功能号是否超过`0x80000000`。只有当`CPUID`指令的扩展功能号大于等于`0x80000001`时，才有可能支持64位长模式。所以需要先检测`CPUID`指令支持的扩展功能号，再读取相应的标志位。最后将读取的结果存入EAX寄存器供模块调用者判断。

`CPUID`指令：

- `EFLAGS`标志寄存器的ID标志位（第21位）表明处理器是否支持`CPUID`指令，如果程序可以操作（置位和复位）此标志位，则说明处理器支持`CPUID`指令，`CPUID`指令在64位模式和32位模式执行效果相同。
- `CPUID`指令会根据EAX寄存器传入的基础功能号，查询处理器的鉴定信息和机能信息，其返回结构将保存在`EAX`、`EBX`、`ECX`、`EDX`寄存器中

## 配置临时页目录项和页表项

```assembly
  ; init temporary page table 0x90000
  mov dword [0x90000], 0x91007
  mov dword [0x90800], 0x91007
  mov dword [0x91000], 0x92007
  mov dword [0x92000], 0x000083
  mov dword [0x92008], 0x200083
  mov dword [0x92010], 0x400083
  mov dword [0x92018], 0x600083
  mov dword [0x92020], 0x800083
  mov dword [0x92028], 0xa00083
```

将IA-32e模式的页目录首地址设置在`0x90000`处，并相继配置各级页表项的值（该值由页表起始地址和页属性组成）。

## 重新加载全局描述符表GDT

```assembly
  ; load GDTR
  db 0x66
  lgdt [GdtPtr64]
  mov ax, 0x10
  mov ds, ax
  mov es, ax
  mov fs, ax
  mov gs, ax
  mov ss, ax
  mov esp, 0x7e00
```

使用`LGDT`汇编指令，加载IA-32e模式的临时GDT表到GDTR寄存器中，并将临时GDT表的数据段初始化到各个数据段寄存器（除了CS段寄存器），由于CS寄存器不能采用直接复制方式来该表，所以必须借助跨段跳转指令（far JMP）或跨段调用指令（far CALL）才能改变

## 开启物理地址扩展功能（PAE）

```assembly
  ; open PAE
  mov eax, cr4
  bts eax, 5
  mov cr4, eax
```

CR4控制寄存器的第5位是PAE功能的标志位，置位该标志位可开启PAE。

## CR3控制寄存器设置

```assembly
  ; load cr3
  mov eax, 0x90000
  mov cr3, eax
```

将页目录基地址加载到CR3控制寄存器。

## 置位IA32_EFER寄存器LME标志位激活IA-32e模式

```assembly
  ; enble long-mode
  mov ecx, 0x0c0000080 ; IA32_EFER
  rdmsr

  bts eax, 8
  wrmsr
```

- 借助`RDMSR/WRMSR`指令可以访问64位的`MSR`寄存器。在访问`MSR`寄存器前，必须向`ECX`寄存器（在64位模式下，`RCX`寄存器的高32位被忽略）传入寄存器地址。而目标`MSR`寄存器则是由`EDX:EAX`组成的64位寄存器代表，其中`EDX`寄存器保存`MSR`寄存器的高32位，`EAX`寄存器保存低32位。（64位模式下，`RAX`和`RDX`寄存器的高32位均为0）

- `RDMSR`与`WRMSR`指令必须在0特权级或者实模式下执行。在使用这两条指令前，应该使用`CPUID`指令（`CPUID.01h:EDX[5]=1`）来检测处理器是否支持`MSR`寄存器组。

## 使能分页寄存器

```assembly
  ; open PE and paging
  mov eax, cr0
  bts eax, 0
  bts eax, 31
  mov cr0, eax
```

置位CR0控制寄存器的PG标志位。到这里处理器进入IA-32e模式。但是处理器目前还在执行保护模式的程序，这种状态叫做兼容模式，即运行在IA-32e模式下的32位模式程序。若要真正运行在IA-32e模式，还需要一条跨段跳转/调用指令将CS段寄存器的值更新为IA-32e模式的代码段描述符。

## 从Loader跳转到内核程序

```assembly
  jmp SelectorCode64:OffsetOfKernelFile
```

## 测试

开启bochs虚拟机，使用`b`命令在`0x100000`处设置一个断点：

```
Num Type           Disp Enb Address
  1 pbreakpoint    keep y   0x000000100000 
```

`c`执行到端点处，查看各个段寄存器状态：

```
es:0x0010, dh=0x00009300, dl=0x00000000, valid=1
	Data segment, base=0x00000000, limit=0x00000000, Read/Write, Accessed
cs:0x0008, dh=0x00209900, dl=0x00000000, valid=1
	Code segment, base=0x00000000, limit=0x00000000, Execute-Only, Non-Conforming, Accessed, 64-bit
ss:0x0010, dh=0x00009300, dl=0x00000000, valid=1
	Data segment, base=0x00000000, limit=0x00000000, Read/Write, Accessed
ds:0x0010, dh=0x00009300, dl=0x00000000, valid=1
	Data segment, base=0x00000000, limit=0x00000000, Read/Write, Accessed
fs:0x0010, dh=0x00009300, dl=0x00000000, valid=1
	Data segment, base=0x00000000, limit=0x00000000, Read/Write, Accessed
gs:0x0010, dh=0x00009300, dl=0x00000000, valid=1
	Data segment, base=0x00000000, limit=0x00000000, Read/Write, Accessed
ldtr:0x0000, dh=0x00008200, dl=0x0000ffff, valid=1
tr:0x0000, dh=0x00008b00, dl=0x0000ffff, valid=1
gdtr:base=0x0000000000010064, limit=0x17
idtr:base=0x0000000000000000, limit=0x3ff
```

可以看出所有段寄存器均被赋值为IA-32a模式的段描述符，经过跳转后的CS段寄存器，它也运行在IA-32e模式下。

`q`退出时也可看到状态：

```
00015213659i[      ] dbg: Quit
00015213659i[CPU0  ] CPU is in long mode (active)
00015213659i[CPU0  ] CS.mode = 64 bit
00015213659i[CPU0  ] SS.mode = 64 bit
00015213659i[CPU0  ] EFER   = 0x00000500
00015213659i[CPU0  ] | RAX=00000000e0000011  RBX=0000000000000000
00015213659i[CPU0  ] | RCX=00000000c0000080  RDX=0000000000000000
00015213659i[CPU0  ] | RSP=0000000000007e00  RBP=00000000000094cd
00015213659i[CPU0  ] | RSI=00000000000080ae  RDI=000000000000c800
00015213659i[CPU0  ] |  R8=0000000000000000   R9=0000000000000000
00015213659i[CPU0  ] | R10=0000000000000000  R11=0000000000000000
00015213659i[CPU0  ] | R12=0000000000000000  R13=0000000000000000
00015213659i[CPU0  ] | R14=0000000000000000  R15=0000000000000000
00015213659i[CPU0  ] | IOPL=0 id vip vif ac vm rf nt of df if tf sf zf af pf cf
00015213659i[CPU0  ] | SEG sltr(index|ti|rpl)     base    limit G D
00015213659i[CPU0  ] |  CS:0008( 0001| 0|  0) 00000000 00000000 0 0
00015213659i[CPU0  ] |  DS:0010( 0002| 0|  0) 00000000 00000000 0 0
00015213659i[CPU0  ] |  SS:0010( 0002| 0|  0) 00000000 00000000 0 0
00015213659i[CPU0  ] |  ES:0010( 0002| 0|  0) 00000000 00000000 0 0
00015213659i[CPU0  ] |  FS:0010( 0002| 0|  0) 00000000 00000000 0 0
00015213659i[CPU0  ] |  GS:0010( 0002| 0|  0) 00000000 00000000 0 0
00015213659i[CPU0  ] |  MSR_FS_BASE:0000000000000000
00015213659i[CPU0  ] |  MSR_GS_BASE:0000000000000000
00015213659i[CPU0  ] | RIP=0000000000100000 (0000000000100000)
00015213659i[CPU0  ] | CR0=0xe0000011 CR2=0x0000000000000000
00015213659i[CPU0  ] | CR3=0x0000000000090000 CR4=0x00000020
00015213659i[CMOS  ] Last time is 1657731512 (Thu Jul 14 00:58:32 2022)
00015213659i[XGUI  ] Exit
00015213659i[SIM   ] quit_sim called with exit code 0
```

随着Loader引导加载程序最后一条跳转指令，处理器的控制权就到了内核程序上。
