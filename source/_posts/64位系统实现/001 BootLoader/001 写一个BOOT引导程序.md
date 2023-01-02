---
title: 64位操作系统-写一个BOOT引导程序
tags:
  - 64位系统实现
  - 操作系统
categories:
  - 操作系统
cover: 'https://img.ansore.top/2022/09/11/f01cf15d850f0ce8f2c97c93a206411c8d3bf927.png'
abbrlink: ea957129
date: 2022-07-12 00:06:09
---

# 写一个BOOT引导程序

先上代码

```assembly
[org 0x7c00]

BaseOfStack equ 0x7c00

; init reg
mov ax, cs
mov ds, ax
mov es, ax
mov ss, ax
mov sp, BaseOfStack

; clear screen
mov ax, 0x600
mov bx, 0x700
mov cx, 0x0
mov dx, 0x184f
int 0x10

; set focus
mov ax, 0x200
mov bx, 0x0
mov dx, 0x0
int 0x10

; display on screen
mov ax, 0x1301
mov bx, 0xf
mov dx, 0x0
mov cx, 15
push ax
mov ax, ds
mov es, ax
pop ax
mov bp, StartBootMessage
int 0x10

; reset floppy
xor ah, ah
xor dl, dl
int 0x13

jmp $

StartBootMessage: db "Start Boot Anos"

times 510-($-$$) db 0

; dw 0xaa55
db 0x55, 0xaa
```

`org 0x7c00`用于指定程序的起始地址，如果程序未指定起始地址，那么编译器会把0x0000最为程序的起始地址。`BaseOfStack equ 0x7c00`意思是`BaseOfStack`等价与`0x7c00`

```assembly
mov ax, cs
mov ds, ax
mov es, ax
mov ss, ax
mov sp, BaseOfStack
```

这几条指令则是将CS寄存器的段基地址设置到DS、ES、SS等寄存器中，设置栈的指针SP寄存器。

# INT 0x10中断

## 设置屏幕光标位置

BIOS中断服务程序`INT 0x10`的主功能号`AH=0x02`可以实现光标位置的设置，具体说明如下：

`INT 0x10, AH=0x02`功能：设置光标

- DH=游标的列数
- DL=游标的行数
- BH=页码数

```assembly
mov ax, 0x200
mov bx, 0x0
mov dx, 0x0
int 0x10
```

这几行代码是将光标位置设置到屏幕左上角(0,0)

## 上卷指定范围的窗口（包括清屏）

BIOS中断服务程序`INT 0x10`的主功能号`AH=0x06`可以实现按指定范围滚动窗口，同时也包括清屏，具体说明如下：

`INT 0x10, AH=0x06`功能：按指定范围滚动窗口

- AL=滚动的列数，若为0则实现清屏功能
- BH=滚动后空出的位置放入的属性
- CH=滚动的范围的左上角坐标的列号
- CL=滚动的范围的左上角坐标的行号

- DH=滚动的范围的右上角坐标的列号
- DL=滚动的范围的右上角坐标的行号
- BH=颜色属性
  - bit0~2：字体颜色（0：黑、1：蓝、2：绿、3：青、4：红、5：紫、6：棕、7：白）
  - bit 3：字体亮度（0：字体正常、1：字体高亮度）
  - bit 4~6：背景颜色（0：黑、1：蓝、2：绿、3：青、4：红、5：紫、6：棕、7：白）
  - bit 7：字体闪烁（0：不闪烁、1：闪烁）

如果AL=0，则清屏，其他BX、CX、DX寄存器参数将不起作用。

```assembly
mov ax, 0x600
mov bx, 0x700
mov cx, 0x0
mov dx, 0x184f
int 0x10
```

## 显示字符串

BIOS中断服务程序`INT 0x10`的主功能号`AH=0x13`可以实现字符串显示功能，具体说明如下：

`INT 0x10, AH=0x13`功能：显示一行字符串

- AL=写入模式
  - AL=0x00：字符串属性由BL寄存器提供，而CX寄存器提供字符串长度（以B为单位），显示后光标位置不变
  - AL=0x01：同AL=0x00，但光标位置会移动到字符串末尾
  - AL=0x02：字符串属性由每个字符后面紧跟的字节提供，所以CX寄存器提供的字符串长度以Word为单位，显示后光标位置不变
  - AL=0x03：同AL=0x02，但是光标位置会移动到末端
- CX=字符串的长度
- DH=游标的坐标行号
- DL=游标的坐标列号
- ES:BP=要显示字符串的内存地址
- BH=页码
- BL=字符串属性/颜色属性
  - bit0~2：字体颜色（0：黑、1：蓝、2：绿、3：青、4：红、5：紫、6：棕、7：白）
  - bit 3：字体亮度（0：字体正常、1：字体高亮度）
  - bit 4~6：背景颜色（0：黑、1：蓝、2：绿、3：青、4：红、5：紫、6：棕、7：白）
  - bit 7：字体闪烁（0：不闪烁、1：闪烁）

# INT 0x13中断

```assembly
; reset floppy
xor ah, ah
xor dl, dl
int 0x13
```

这段代码实现了软盘的复位功能。

`INT 0x13, AH=0x00`功能：重置磁盘驱动器，为下一次读写软盘做准备

- DL=驱动器号，0x00\~0x7F：软盘，0x80\~0xFF：硬盘

