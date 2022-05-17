---
title: BF串匹配算法
tags:
  - 算法
categories:
  - 算法
cover: https://img.ansore.top/2022/04/27/62692f1609241.jpg
abbrlink: da8e22a5
date: 2017-11-12 00:11:16
---

> BF算法比较简单粗暴，属于蛮力法 原理也比较简单，将主串与模式从第一个字符依次开始匹配，知道完全匹配上或者主串结束，因此最坏情况下时间复杂度为O(m*n)

C++描述：

<!-- more -->

```c
#include<iostream>

using namespace std;

int BF(char S[], char T[]) {
    int index = 0, i = 0, j = 0;
    //当主串或者模式都未到达最末尾时候循环
    while(S[i] != '\0' && T[j] != '\0') {
        if(S[i] == T[j]) {
            i ++;
            j ++;
        } else {
            index ++;
            i = index;
            j = 0;
        }
    }

    if(T[j] == '\0') {
        return index + 1;
    } else {
        return 0;
    }
}

int main () {
    char S[] = "sdasaaas";
    char T[] = "aaas";
    cout << BF(S, T) << endl;
    return 0;
}
```
