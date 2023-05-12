---
title: IP与域名的相互转换
tags:
  - C/C++
  - Linux
  - 编程
categories:
  - 编程
cover: https://img.ansore.de/2022/04/27/62693cf4b289d.jpg
abbrlink: 33dec441
date: 2016-10-15 18:35:36
---

在编程中，知道域名是不能直接访问主机，需要将其转换为IP地址。 但是在某些业务需求中需要将一个IP地址转换为域名。 Linux下，IP与域名的相互转换的C语言实现：

<!-- more -->

```c
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <netdb.h>
#include <arpa/inet.h>

//根据域名返回IP
void getIpByHostName(char *hostname);
//根据IP返回域名
void getHontNameByIp(char *ip);

/**
* 域名结构体
*/
// typedef struct hostent {
//     char * h_name;        //正式的主机名称
//     char ** h_aliases;    //主机的别名
//     int h_addrtype;       //主机名的类型
//     int h_length;         //地址的长度
//     char ** h_addr_list;  //从域名服务器获取的主机地址
// } hostent;

void getIpByHostName(char *hostname) {
    struct hostent * host;                            //定义hostent指针
    struct in_addr in;
    struct sockaddr_in addr_in;
    extern int h_errno;

    if((host = gethostbyname(hostname))!=NULL) {
        memcpy(&addr_in.sin_addr.s_addr,host->h_addr,4);  //复制主机地址、
        in.s_addr=addr_in.sin_addr.s_addr;
        printf("host name is %s\n", hostname);
        printf("IP length: %d\n", host->h_length);
        printf("Type: %d\n", host->h_addrtype);
        printf("IP : %s\n", inet_ntoa(in));
    }
    else {
        printf("host name is :%s\n",hostname);
        printf("error : %d\n",h_errno);
        printf("%s\n", hstrerror(h_errno));
    }
}

void getHontNameByIp(char *ip) {
    struct hostent *host;
    struct in_addr in;
    struct sockaddr_in addr_in;
    extern int h_errno;

    if((host=gethostbyaddr(ip, sizeof(ip), AF_INET))!=NULL){
        memcpy(&addr_in.sin_addr.s_addr, host->h_addr, 4);
        in.s_addr = addr_in.sin_addr.s_addr;
        printf("Host Name is %s\n", host->h_name);
        printf("Ip length %d\n", host->h_length);
        printf("Type is %d\n", host->h_addrtype);
        printf("Ip is %s\n", inet_ntoa(in));
    }
    else {
        printf("error %d\n", h_errno);
        printf("%s\n", hstrerror(h_errno));
    }
}

int main(int argc, char const *argv[]) {

  char hostname1[] = "www.ansore.net";              //定义一个存在的域名
  char hostname2[] = "www.123qwdferwerfsdfataewfar.net";        //定义一个不存在的域名
  char ip[] = "139.129.35.50";

  getIpByHostName(hostname1);
  printf("--------------------------------------------------------\n");
  getIpByHostName(hostname2);
  printf("--------------------------------------------------------\n");
  getHontNameByIp(ip);

  return 0;
}
```