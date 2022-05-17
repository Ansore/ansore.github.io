---
title: 跳表SkipList以及实现
tags:
  - SkipList
  - 算法
categories:
  - 算法
cover: https://img.ansore.top/2022/04/27/62692f1609241.jpg
abbrlink: 891d221b
date: 2020-08-24 13:51:02
---

# 跳表

普通链表查找需要顺序比较，复杂度较高，而折半查找可以将复杂度降到$O(\log n)$，跳表就是利用折半的思想，建立索引，以空间换时间，优化后的空间约为原来所占空间的2倍。

![Screenshot_20200824_135818](https://img.ansore.top/2022/05/01/626e3217b5ff8.png)

跳表的结构类似：

![Screenshot_20200824_140040](https://img.ansore.top/2022/05/01/626e321fc0477.png)

# C语言实现

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define MAX_L 16

// NEW_NODE生成一个node结构体,同时生成包含n个Node*元素的数组
#define NEW_NODE(n) ((Node*) malloc(sizeof(Node) + n*sizeof(Node*)))

typedef int keyType;
typedef int valueType;

typedef struct Node {
  keyType key;
  valueType value;
  // 后继指针数组,可实现结构体变长
  struct Node *next[1];
} Node;

// 跳表结构
typedef struct SkipList {
  // 层数
  int level;
  // 指向头节点
  Node *head;
} SkipList;

// 创建节点
// level 节点层数
// key 节点关键字
// value 节点值
Node* createNode(int level, keyType key, valueType value);

// 创建跳表
SkipList* createSkipList();

// 插入元素时所占的层数;随机算法
int randomLevel();

// 插入节点
// sl跳表指针
// key节点关键字
// 节点值
void insert(SkipList *sl, keyType key, valueType val);

// 删除节点
void erase(SkipList *sl, keyType key);

// 查找节点
valueType* search(SkipList *sl, keyType key);

// 从高层逐层打印
void printSkipList(SkipList *sl);

// 释放跳表
void freeSkipList(SkipList *sl);

Node* createNode(int level, keyType key, valueType value) {
  Node *p = NEW_NODE(level);
  if(!p) return NULL;
  p->key = key;
  p->value = value;
  return p;
}

SkipList* createSkipList() {
  SkipList *sl = (SkipList*) malloc(sizeof(SkipList));
  if(!sl) return NULL;
  // 设置跳表的层,初始为0层,数组从0开始
  sl->level = 0;

  // 创建头节点
  Node *h = createNode(MAX_L, 0, 0);
  if(!h) {
    free(sl);
    return NULL;
  }
  sl->head = h;
  for(int i = 0; i < MAX_L; i ++) h->next[i] = NULL;
  srand(time(0));
  return sl;
}

int randomLevel() {
  int level = 1;
  while(rand() % 2) level ++;
  level = MAX_L>level?level:MAX_L;
  return level;
}

// 1. 查找每层待插入的位置,更新update数组
// 2. 随机产生一个层数
// 从高层往下插入,与普通链表完全相同
void insert(SkipList *sl, keyType key, valueType value) {
  Node *update[MAX_L];
  Node *q = NULL;
  Node *p = sl->head;

  int i = sl->level-1;
  // 1 把降层的节点保存到update数组
  for(; i >= 0; i --) {
    while((q = p->next[i]) && q->key < key) p = q;
    update[i] = p;
  }
  // key已经存在
  if(q && q->key == key) {
    q->value = value;
    return;
  }

  // 2 
  int level = randomLevel();
  if(level > sl->level) {
    for(i = sl->level; i < level; i ++) update[i] = sl->head;
    sl->level = level;
  }
  
  // 3
  q = createNode(level, key, value);
  if(!q) return;
  // 逐层更新
  for(i = level-1; i >= 0; i --) {
    q->next[i] = update[i]->next[i];
    update[i]->next[i] = q;
  }
}

void erase(SkipList *sl, keyType key) {
  Node *update[MAX_L];
  Node *q = NULL;
  Node *p = sl->head;
  int i = sl->level-1;
  for(; i >= 0; i --) {
    while((q = p->next[i]) && q->key < key) p = q;
    update[i] = p;
  }
  // 判断是否为待删除
  if(!q || (q && q->key != key)) return;

  // 逐层删除
  for(i = sl->level-1; i >= 0; i --) {
    if(update[i]->next[i]==q) {
      update[i]->next[i] = q->next[i];
      // 如果删除的是最高层节点,则level--
      if(sl->head->next[i] == NULL) sl->level --;
    }
  }
  free(q);
  q = NULL;
}

// 查找
valueType* search(SkipList *sl, keyType key) {
  Node *q = NULL;
  Node *p = sl->head;
  int i = sl->level-1;
  for(; i >= 0; i --) {
    while((q = p->next[i]) && q->key < key) p = q;
    if(q && key == q->key) return &q->value;
  }
  return NULL;
}

void printSkipList(SkipList *sl) {
  Node *q;
  int i = sl->level-1;
  for(; i >= 0; i --) {
    q = sl->head->next[i];
    printf("level %d:\n", i+1);
    while(q) {
      printf("key:%d val:%d\t", q->key, q->value);
      q = q->next[i];
    }
    printf("\n");
  }
}

void freeSkipList(SkipList *sl) {
  if(!sl) return;
  Node *q = sl->head;
  Node *next;
  while(q) {
    next = q->next[0];
    free(q);
    q = next;
  }
  free(sl);
}

int main(int argc, char *argv[])
{
  SkipList *sl = createSkipList();
  for(int i = 1; i < 100000; i ++) insert(sl, i, i);
  for(int i = 11; i < 100000; i ++) erase(sl, i);
  printSkipList(sl);
  int *p = search(sl, 10);
  if(p) printf("search value is %d \n", *p);
  freeSkipList(sl);
  return 0;
}
```

