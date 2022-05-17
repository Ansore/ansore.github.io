---
title: C语言-字符串操作
tags:
  - c
categories:
  - c
cover: https://img.ansore.top/2022/05/04/627266bb421cf.jpg
abbrlink: 750880bf
date: 2020-08-02 14:20:31
---

# 字符测试函数

字符测试函数，由头文件`"ctype.h"`定义

##### 数字或字母测试函数`isalnum`

```c
int isalnum(int c)
```

检查c是否为英文或者阿拉伯数字，若是返回真，否则返回假

##### 字母测试函数`isalpha`

```c
int isalpha(int c)
```

测试一个字符是不是英文字母，包括大小写

##### 可打印字符测试函数`isgraph`

```c
int isgrath(int c)
```

不可打印指的是转义字符、格式控制或特殊作用的字符

##### 大小写测试函数`islower`和`isupper`

```c
int islower(int c)
int isupper(int c)
```

`islower`用于测试一个字符是不是小写字符，`isupper`用于测试是不是大写字符

##### 数字测试函数`isxdigit`

```c
int isdigit(int c)
```

测试一个字母是不是0~9之间的阿拉伯数字

##### 符号测试函数`ispunct`

```c
int ispunct(int c)
```

测试一个字符是否为标点符号作者特殊符号

```c
#include <stdio.h>
#include <ctype.h>

int main(int argc, char *argv[])
{
	char s[] = "123adfa0QsdQDSDF923;sdfa\nsdf;;\tsdfas";
	for (int i = 0; s[i] != NULL; i ++) {
		if (isalnum(s[i])) {
			printf("%c is a number or character.\n", s[i]);
		}
		if (isalpha(s[i])) {
			printf("%c is a character.\n", s[i]);
		}
		if (isgraph(s[i])) {
			printf("%c is a printable character.\n", s[i]);
		}
		if (islower(s[i])) {
			printf("%c is a islower character.\n", s[i]);
		}
		if (isupper(s[i])) {
			printf("%c is a upper character.\n", s[i]);
		}
		if (isxdigit(s[i])) {
			printf("%c is a number.\n", s[i]);
		}
	}
	return 0;
}
```

# 字符串转换

##### 字符串转化为浮点型函数`atof`

```c
double atof(char *nptr)
```

##### 字符串转化为浮点数`strtod`

```c
double strtod(const char *nptr, char **endptr)
```

##### 字符串转化为整型函数`atoi`

````c
int atoi(char *nptr)
````

##### 字符串转化为长整型函数`atol`

```c
long aotl(char *nptr)
```

##### 字符串转化为无符号长整型`strtoul`

```c
unsigned long int strtoul(const char *nptr, char **endptr, int base)
```

##### 将浮点型转化为字符串函数`ecvt`

```c
char *ecvt(double number, int ndigits, int *decpt, int *sign)
```

- `number`是一个`double`类型的浮点数
- `ndigits`在浮点数中从左向右取的位数
- `decpt`一个整型的指针，显示浮点数中小数点在第几位
- `sign`一个整型的指针，代表数值的正负，正为0，否则1

##### 字母大小写转化函数`tolower`和`toupper`

```c
int tolower(int c)
int toupper(int c) 
```

`tolower`把大写字母转化为小写字母，`toupper`相反

##### 将整数转成合法的ASCII码`toascii`

```c
int toascii(int c)
```

# 字符串比较

头文件`"string.h"`中定义的

##### 字符串比较函数`bcmp`

```c
int bcmp(const void *s1, const void *s2, int n);
```

比较两个字符串的前n个字节是否相同，相同返回0，否则返回非0

##### 字符串大小比较函数`memcmp`

```c
int memcmp(const void *s1, const void *s2, size_t n)
```

比较两个字符串的大小是否相同，并且返回第一个不相同字符串的差值，n表示比较前n个字符

##### 忽略大小写比较字符串函数`strncasecmp`

```c
int strncasecmp(const char *s1, const char *s2, size_t n)
```

忽略大小写比较两个字符串

# 字符串复制

##### 字符串复制函数`bcopy`

```c
void bcopy(const void *src, void *dest, int n)
```

`src`表示需要复制的字符串，`dest`表示复制到的字符串。n表示需要在字符串中复制的字符数目

##### 字符串复制函数`memccpy`

```c
void *memccpy(void *dest, const void *src, int c, size_t n)
```

将一个字符串中的前n个字节复制到另一个字符串中。与`bcopy`不同的是`memccpy`可以检查字符串里是不是有某一字符。`src`和`dest`分别表示源字符和目标字符，c表示需要在字符串`dest`中查找赋值为c的字符，如果找到这个字符，则返回下一个字符的指针

```c
#include <stdio.h>
#include <string.h>

int main(int argc, char *argv[])
{
	char a[20] = "asdfagh";
	char b[20] = "ijklmn";
	char *s;
	printf("%s\n%s\n", a, b);
	s = memccpy(a, b, 'k', 3);
	printf("%c\n", *s);
	printf("%s\n%s\n", a, b);
	return 0;
}
/**结果
asdfagh
ijklmn
f
ijkfagh
ijklmn
*/
```

##### 字符串复制函数`strcpy`

```c
char *strcpy(char *dest, const char *src)
```

函数返回字符串`dest`指针，`dest`必须有足够的空间，否则会发生溢出

##### 字符串复制函数`strncpy`

```c
char *strncpy(char *dest, const char *src, size_t n);
```

将一个字符串中的若干字符复制到另一个字符串中哦你

# 字符串的清理与填充 

##### 字符串清理函数`bzero`

```c
void bzero(void *s,int n) 
```

将字符串中的前n个字符写入`NULL`值

##### 字符串填充函数`memset`

```c
void * memset (void *s ,int c, size_t n)
```

将一个字符的前 n 个字符填充为某一个字符

# 字符串查找

##### 字符查找函数`index`与`rindex`

```c
char *index( const char *s, int c);
char *rindex( const char *s, int c); 
```

 函数`index`用来在字符串中找出需要查找字符第一次的出现位置，然后将该字符地址返 回。`rindex`的使用方法与`index`相似，但作用是找出字符串中最后一次某字符出现的位置。、

##### 字符查找函数`memchr`

```c
void * memchr(const void *s,int c,size_t n)
```

在一个字符串的前 n 个字符中查找某一个字符，返回这个字符的指针地址

##### 字符查找函数`strchr`与`strrchr`

```c
char * strchr (const char *s,int c)
char * strrchr (const char *s,int c) 
```

`strchr`的作用是在一个字符串中查找某一个字符第一次出现的位置。`strrchr`的作用是在一个字符串中查找某一个字符最后一次出现的位置

# 字符串的连接与分割

##### 字符串连接函数`strcat`

```c
char *strcat (char *dest,const char *src) 
```

将一个字符串连接到另一个字符串后面

##### 字符串分割函数`strtok`

```c
char * strtok(char *s,const char *delim); 
```

将字符串分割成多个字符串，

 `strtok`在参数`s`字符串中发现参数`delim`的分割字符时，将该字符改为`NULL`字符，然后返回更改以后的字符串。再次调用时，将参数`s`设置成`NULL`。每次调用成功则返回下一个分割 后的字符串指针

```c
#include <stdio.h>
#include <string.h>

int main(int argc, char *argv[])
{
	char *p;
	char a[20] = "qweaQQWEa^!@#aIOP";
	char s[] = "a";
	printf("%s\n", a);
	p = strtok(a, s);
	printf("%s\n", p);
	while(p = strtok(NULL, s)) {
		printf("%s\n", p);
	}
	return 0;
}
/** 结果
qweaQQWEa^!@#aIOP
qwe
QQWE
^!@#
IOP
*/
```

# 其他字符串函数

##### 字符串长度函数`strlen`

```c
size_t strlen (const char *s); 
```

返回字符串的长度，也就是字符串里一共有多少个字符。函数的使用

##### 允许出现字符查找函数`strspn`

```c
size_t strspn (const char *s,const char * accept); 
```

返回一个字符串中首次不包含在指定字符串内容中的字符的位置。

```c
#include <stdio.h>
#include <string.h>

int main(int argc, char *argv[])
{
	char a[] = "abc";
	char b[] = "aaabbb.ccc";
	int i = strspn(b, a);
	printf("%d\n", i);
	return 0;
}
/** 结果
6
*/
```

##### 不允许出现字符查找函数`strcspn`

```c
size_t strcspn ( const char *s,const char * reject) 
```

查找出一个字符串中不允许出现的某个字符的位置

