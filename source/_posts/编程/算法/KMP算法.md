---
title: KMP算法
tags:
  - 算法
  - 编程
categories:
  - 编程
cover: https://images.ansore.top/i/2022/04/27/62692f1609241.jpg
abbrlink: 2da0528d
date: 2017-11-18 23:44:22
---

> KMP算法是BF算法的改进算法， 当匹配过程中有不匹配项时，在BF算法中，主串直接回溯到i+1，而模式回溯到第一个字符上重新匹配。KMP算法中，匹配失败时，主串指针i不变，模式指针j回退到next\[j\]重新进行匹配，当j指针回退到0时，指针i和指针j同时自增1。next中的值是模式的真前缀和真后缀相等的最大字串长度。

KMP算法C++实现：

```c
#include<iostream>
using namespace std;

void getNext(char T[], int next[]) {
    int i,j,len;
    next[0] = -1;
    for(j = 1; T[j] != '\0'; j ++) {
        for(len = j - 1; len >= 1; len --) {
            for(i = 0; i < len; i ++) {
                if(T[i] != T[j-len+i])
                break;
            }
            if(i == len) {
                next[j] = len;
                break;
            }

            if(len < 1) {
                next[j] = 0;
            }
        }
    }
}

int KMP(char S[], char T[]) {
    int i = 0, j = 0;
    int next[80];
    getNext(T, next);
    while(S[i] != '\0' && T[j] != '\0') {
        if(S[i] == T[j]) {
            i ++;
            j ++;
        } else {
            j = next[j];
            if(j == -1) {
                i ++;
                j ++;
            }
        }
    }
    if(T[j] == '\0') {
        return (i-j+1);
    } else {
        return 0;
    }
}

    int main () {
        char S[] = "sdfasdfads";
        char T[] = "dfas";
        int r = KMP(S,T);
        cout << "result is " << r << endl;
        return 0;
    }
```
