---
title: Kernel中的地址转换
tags:
  - Kernel
categories:
  - Kernel
cover: 'https://img.ansore.top/2022/04/27/62692c1359d83.jpg'
abbrlink: 3be91ca
date: 2022-03-13 23:13:10
---

在Linux中的地址转换如下图所示，逻辑地址通过段选择子查询GDT得到段描述，然后加上偏移得到线性地址（虚拟地址），而在Linux中并没有完整的使用分段机制，它让所有的段都指向相同的地址范围，段的基地址都为0，也就是说逻辑地址和线性地址在数值上就相同了。在由分页机制将线性地址转换为物理地址

![Screenshot_20220313_223502](https://img.ansore.top/2022/05/01/626e276143e9b.png)

在Linux系统中，为了兼容32位和64位，它需要一个统一的页面地址模型，目前常用的是4级页表模型。包括PGD页全局目录、PUD页上级目录、PMD页中级目的、PTE页表。根据情况某些页表不会被使用，每个页表项的大小会根据计算机体系结构的不同做相应的改变。例如没有启用物理地址扩展的32位系统来说，两级页表页表就够了，那么Linux会在线性地址中，会让PUD和PMD索引置为0，从根本上取消了这两个字段，但是这两个页目录在指针序列中的位置仍然被保留下来，也就是说在寻址过程中不能通过PUD和PMD直接都页表，内核会将这两个页目录表项都置为1。

![Screenshot_20220313_224447](https://img.ansore.top/2022/05/01/626e29585cc08.png)

由于64位系统硬件限制，实际的地址线有48条，所以线性地址实际使用也只有48位。在64位Linux中使用了4级页表结构。线性地址划分如下：

![Screenshot_20220313_224507](https://img.ansore.top/2022/05/01/626e2761c3efb.png)

PGD、PUD、PMD、PTE索引分别占了9位，页内偏移占了12位，总计48位，剩下高位保留。页面的大小都为4kb，每一个页表项大小为8bit，整个页面可以映射的空间是256TB。而新的Intel芯片的MMU硬件规定可以进行5级的页表映射，所以在4.15的内核中，在PGD和PUD之间又新增了一个新的页目录，叫做P4D页目录。这个页目录同32位中的情况还未使用，它的页目录项只有一个，线性地址中也没有它的索引。

CR3寄存器是一系列CPU控制寄存器之一，这些寄存器主要用来保存和控制系统级别操作的数据和信息。其中这个CR3寄存器用来保存当前进程的页全局目录的地址。寻页就是从页全局目录开始，内核在创建一个进程的时候就会为它分配一个页全局目录。

在进程描述符`task_struct`结构体中有一个指向`mm_struct`结构的`mm`指针，而`mm_struct`结构用来描述进程的虚拟地址空间，在`mm_struct`中有一个`PGD`字段就是用来保存该进程的页全局目录的（物理）地址。所以在进程切换的时候，操作系统通过访问`mm_struct`结构体`PGD`字段取得新进程的页全局目录地址填充到CR3寄存器中，就完成了页表的切换。

代码演示如下：

```c
#include <linux/init.h>
#include <linux/module.h>
#include <linux/sched.h>
#include <linux/mm.h>
#include <linux/mm_types.h>
#include <linux/export.h>

static unsigned long cr0, cr3;
static unsigned long vaddr = 0;

static void get_pgtable_macro(void)
{
  cr0 = read_cr0();
  cr3 = read_cr3_pa();

  printk("cr0 = 0x%lx, cr3 = 0x%lx\n", cr0, cr3);
  printk("PGDIR_SHIFT = %d\n", PGDIR_SHIFT);
  printk("P4D_SHIFT = %d\n", P4D_SHIFT);
  printk("PUD_SHIFT = %d\n", PUD_SHIFT);
  printk("PMD_SHIFT = %d\n", PMD_SHIFT);
  printk("PAGE_SHIFT = %d\n", PAGE_SHIFT);

  printk("PTRS_PER_PGD = %d\n", PTRS_PER_PGD);
  printk("PTRS_PER_P4D = %d\n", PTRS_PER_P4D);
  printk("PTRS_PER_PUD = %d\n", PTRS_PER_PUD);
  printk("PTRS_PER_PMD = %d\n", PTRS_PER_PMD);
  printk("PTRS_PER_PTE = %d\n", PTRS_PER_PTE);
  printk("PAGE_MASK = 0x%lx\n", PAGE_MASK);
}

static unsigned long vaddr2paddr(unsigned long vaddr)
{
  pgd_t *pgd;
  p4d_t *p4d;
  pud_t *pud;
  pmd_t *pmd;
  pte_t *pte;
  unsigned long paddr = 0;
  unsigned long page_addr = 0;
  unsigned long page_offset = 0;

  pgd = pgd_offset(current->mm, vaddr);
  printk("pgd_val = 0x%lx, pgd_index = %lu\n", pgd_val(*pgd), pgd_index(vaddr));
  if (pgd_none(*pgd)) {
    printk("not mapped in pgd\n");
    return -1;
  }

  p4d = p4d_offset(pgd, vaddr);
  printk("p4d_val = 0x%lx, p4d_index = %lu\n", p4d_val(*p4d), p4d_index(vaddr));
  if (p4d_none(*p4d)) {
    printk("not mapped in p4d\n");
    return -1;
  }

  pud = pud_offset(p4d, vaddr);
  printk("pud_val = 0x%lx, pud_index = %lu\n", pud_val(*pud), pud_index(vaddr));
  if (pud_none(*pud)) {
    printk("not mapped in pud\n");
    return -1;
  }

  pmd = pmd_offset(pud, vaddr);
  printk("pmd_val = 0x%lx, pmd_index = %lu\n", pmd_val(*pmd), pmd_index(vaddr));
  if (pmd_none(*pmd)) {
    printk("not mapped in pmd\n");
    return -1;
  }

  pte = pte_offset_kernel(pmd, vaddr);
  printk("pte_val = 0x%lx, pte_index = %lu\n", pte_val(*pte), pte_index(vaddr));
  if (pte_none(*pte)) {
    printk("not mapped in pte\n");
    return -1;
  }

  page_addr = pte_val(*pte) & PAGE_MASK;
  page_offset = vaddr & ~PAGE_MASK;
  paddr = page_addr | page_offset;
  printk("page_addr = 0x%lx, page_offset = 0x%lx\n", page_addr, page_offset);
  printk("vaddr = 0x%lx, paddr = 0x%lx\n", vaddr, paddr);
  return paddr;
}

static int __init v2p_init(void)
{
  unsigned long vaddr = 0;
  printk("vaddr to paddr module is running..\n");
  get_pgtable_macro();
  printk("\n");
  vaddr = __get_free_page(GFP_KERNEL);
  if (vaddr == 0) {
    printk("__get_free_page failed..\n");
    return 0;
  }
  sprintf((char *) vaddr, "Hello world from kernel");
  printk("get_age_addr = 0x%lx\n", vaddr);
  vaddr2paddr(vaddr);
  return 0;
}

static void __exit v2p_exit(void)
{
  printk("vaddr to paddr module is exiting..\n");
  free_page(vaddr);
}

module_init(v2p_init);
module_exit(v2p_exit);
MODULE_LICENSE("GPL");
```

Makefile文件：

```c
ifneq ($(KERNELRELEASE),)
obj-m := v2p.o
else
PWD := $(shell pwd)
KERNEL_VERSION := $(shell uname -r)
KDIR := /lib/modules/`uname -r`/build
all:
	make -C $(KDIR) M=$(PWD)
clean:
	rm -rf *.o *.ko *.mod.c *.symvers *.c~ *~
endif
```

编译后加载进内核：

```shell
$ sudo insmod v2p.ko
```

移出内核：

```shell
$ sudo rmmod v2p
```

查看内核输出：

```shell
$ sudo dmesg
```

最后输出结果：

```
[ 9026.990307] vaddr to paddr module is running..
[ 9026.990311] cr0 = 0x80050033, cr3 = 0x1b60a0000
[ 9026.990312] PGDIR_SHIFT = 39
[ 9026.990313] P4D_SHIFT = 39
[ 9026.990313] PUD_SHIFT = 30
[ 9026.990314] PMD_SHIFT = 21
[ 9026.990314] PAGE_SHIFT = 12
[ 9026.990315] PTRS_PER_PGD = 512
[ 9026.990315] PTRS_PER_P4D = 1
[ 9026.990315] PTRS_PER_PUD = 512
[ 9026.990316] PTRS_PER_PMD = 512
[ 9026.990317] PTRS_PER_PTE = 512
[ 9026.990317] PAGE_MASK = 0xfffffffffffff000

[ 9026.990318] get_age_addr = 0xffff9f95d83cd000
[ 9026.990319] pgd_val = 0x71001067, pgd_index = 319
[ 9026.990320] p4d_val = 0x71001067, p4d_index = 0
[ 9026.990321] pud_val = 0x1daf88063, pud_index = 87
[ 9026.990322] pmd_val = 0x1d82f5063, pmd_index = 193
[ 9026.990323] pte_val = 0x80000001d83cd163, pte_index = 461
[ 9026.990323] page_addr = 0x80000001d83cd000, page_offset = 0x0
[ 9026.990324] vaddr = 0xffff9f95d83cd000, paddr = 0x80000001d83cd000
[ 9032.670145] vaddr to paddr module is exiting..
```

