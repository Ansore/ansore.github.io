---
title: MyBatisPlus之条件构造器
tags:
  - jvm
  - java
categories:
  - java
cover: 'https://img.ansore.top/2022/05/04/627260e19ba56.jpg'
abbrlink: 96d74952
date: 2021-02-22 18:20:46
---

# 条件构造器

# Wapper

![Wapper](https://img.ansore.top/2022/05/04/627262378e3a3.png)

Wrapper ： 条件构造抽象类，最顶端父类

AbstractWrapper ： 用于查询条件封装，生成 sql 的 where 条件

QueryWrapper ： Entity 对象封装操作类，不是用lambda语法

UpdateWrapper ： Update 条件封装，用于Entity对象更新操作

AbstractLambdaWrapper ： Lambda 语法使用 Wrapper统一处理解析 lambda 获取 column。

LambdaQueryWrapper ：看名称也能明白就是用于Lambda语法使用的查询Wrapper

LambdaUpdateWrapper ： Lambda 更新封装Wrapper

# AbstractWrapper

**注意：**以下条件构造器的方法入参中的 column 均表示数据库字段

## **ge、gt、le、lt、isNull、isNotNull**

```java
@Test
void testDelete() {
    QueryWrapper<User> queryWrapper = new QueryWrapper<>();
    queryWrapper
            .isNull("name")
            .ge("age", 12)
            .isNotNull("email");
    int result = userMapper.delete(queryWrapper);
    System.out.println("delete return count = " + result);
}
```

SQL：

```sql
UPDATE user SET deleted=1 WHERE deleted=0 AND (name IS NULL AND age >= 12 AND email IS NOT NULL)
```

## eq、ne

注意：seletOne返回的是一条实体记录，当出现多条时会报错

```java
// seletOne返回的是一条实体记录，当出现多条时会报错
@Test
void testSelectOne() {
    QueryWrapper<User> queryWrapper = new QueryWrapper<>();
    queryWrapper.eq("name", "Tom");

    User user = userMapper.selectOne(queryWrapper);
    System.out.println(user);
}
```

SQL：

```sql
SELECT id,name,age,email,create_time,update_time,version,deleted FROM user WHERE deleted=0 AND (name = 'Tom')
```

## between、notBetween

包含大小边界

```java
@Test
void testSelectCount() {
    QueryWrapper<User> queryWrapper = new QueryWrapper<>();
    queryWrapper.between("age", 20, 30);

    Integer count = userMapper.selectCount(queryWrapper);
    System.out.println(count);
}
```

SQL：

```sql
SELECT COUNT( 1 ) FROM user WHERE deleted=0 AND (age BETWEEN 20 AND 30)
```

## allEq

```java
@Test
void testSelectList() {
    QueryWrapper<User> queryWrapper = new QueryWrapper<>();
    Map<String, Object> map = new HashMap<>();
    map.put("id", 2);
    map.put("name", "Tom");
    map.put("age", 20);

    queryWrapper.allEq(map);
    List<User> users = userMapper.selectList(queryWrapper);

    users.forEach(System.out::println);
}
```

SQL：

```sql
SELECT id,name,age,email,create_time,update_time,version,deleted FROM user WHERE deleted=0 AND (name = 'Tom' AND id = 2 AND age = 20)
```

## like、notLike、likeLeft、likeRight

selectMaps返回Map集合列表

```java
@Test
void testSelectMap() {
    QueryWrapper<User> queryWrapper = new QueryWrapper<>();
    queryWrapper
            .notLike("name", "e")
            .likeRight("email", "t");

    List<Map<String, Object>> maps = userMapper.selectMaps(queryWrapper);
    maps.forEach(System.out::println);
}
```

SQL：

```sql
SELECT id,name,age,email,create_time,update_time,version,deleted FROM user WHERE deleted=0 AND (name NOT LIKE '%e%' AND email LIKE 't%')
```

## in、notIn、inSql、notinSql、exists、notExists

in、notIn：

- notIn("age",{1,2,3})--->age not in (1,2,3)
- notIn("age", 1, 2, 3)--->age not in (1,2,3)

inSql、notinSql：可以实现子查询

- 例: inSql("age", "1,2,3,4,5,6")--->age in (1,2,3,4,5,6)
- 例: inSql("id", "select id from table where id < 3")--->id in (select id from table where id < 3)

```java
@Test
void testSelectObjs() {
     QueryWrapper<User> queryWrapper = new QueryWrapper<>();
//   queryWrapper.in("id", 1, 2, 3, 4);
     queryWrapper.inSql("id", "select id from user where id < 5");
     List<Object> objects = userMapper.selectObjs(queryWrapper);
     objects.forEach(System.out::println);
}
```

SQL：

```sql
SELECT id,name,age,email,create_time,update_time,version,deleted FROM user WHERE deleted=0 AND (id IN (select id from user where id < 5))
```

## or、and

**注意：**这里使用的是 UpdateWrapper

不调用or则默认为使用 and 连

```java
@Test
void testUpdate1() {
    // 修改值
    User user = new User();
    user.setAge(99);
    user.setName("Helen");

    // 修改条件
    UpdateWrapper<User> userUpdateWrapper = new UpdateWrapper<>();
    userUpdateWrapper
            .like("name", "h")
            .or()
            .between("age", 20, 30);
    int result = userMapper.update(user, userUpdateWrapper);
    System.out.println(result);
}
```

SQL：

```sql
UPDATE user SET name='Helen', age=99, update_time='2020-05-21T23:49:15.357+0800' WHERE deleted=0 AND (name LIKE '%h%' OR age BETWEEN 20 AND 30)
```

## 嵌套or、嵌套and

这里使用了lambda表达式，or中的表达式最后翻译成sql时会被加上圆括号

```java
@Test
void testUpdate2() {
    // 修改值
    User user = new User();
    user.setAge(88);
    user.setName("Andy");

    // 修改条件
    UpdateWrapper<User> userUpdateWrapper = new UpdateWrapper<>();
    userUpdateWrapper
            .like("name", "h")
            .or(i -> i.eq("name", "Helen").ne("age", 99));

    int result = userMapper.update(user, userUpdateWrapper);
    System.out.println(result);
}
```

SQL：

```sql
UPDATE user SET name='Andy', age=88, update_time='2020-05-21T23:54:24.215+0800' WHERE deleted=0 AND (name LIKE '%h%' OR (name = 'Helen' AND age <> 99))
```

## orderBy、orderByDesc、orderByAs

```java
@Test
void testSelectListOrderBy() {
    QueryWrapper<User> queryWrapper = new QueryWrapper<>();
    queryWrapper.orderByDesc("id");
    List<User> users = userMapper.selectList(queryWrapper);
    users.forEach(System.out::println);
}
```

SQL：

```sql
SELECT id,name,age,email,create_time,update_time,version,deleted FROM user WHERE deleted=0 ORDER BY id DESC
```

## last

直接拼接到 sql 的最后

**注意：**只能调用一次,多次调用以最后一次为准 有sql注入的风险,请谨慎使用

```java
@Test
void testSelectListLast() {
    QueryWrapper<User> queryWrapper = new QueryWrapper<>();
    queryWrapper.last("limit 1");

    List<User> users = userMapper.selectList(queryWrapper);
    users.forEach(System.out::println);
}
```

SQL：

```sql
SELECT id,name,age,email,create_time,update_time,version,deleted FROM user WHERE deleted=0 limit 1
```

## 指定要查询的列

```java
@Test
void testSelectListColumn() {
    QueryWrapper<User> queryWrapper = new QueryWrapper<>();
    queryWrapper.select("id", "name", "age");

    List<User> users = userMapper.selectList(queryWrapper);
    users.forEach(System.out::println);
}
```

SQL：

```sql
SELECT id,name,age FROM user WHERE deleted=0
```

## set、setSql

最终的sql会合并 user.setAge()，以及 userUpdateWrapper.set() 和 setSql() 中 的字段

```java
@Test
void testUpdateSet() {
    // 修改值
    User user = new User();
    user.setAge(99);
    // 修改条件
    UpdateWrapper<User> userUpdateWrapper = new UpdateWrapper<>();
    userUpdateWrapper
            .like("name", "h")
            .set("name", "Andy") // 除了可以查询还可以使用set设置修改的字段
            .setSql("email='1456@qq.com'"); // 可以有子查询
    int result = userMapper.update(user, userUpdateWrapper);
    System.out.println(result);
}
```

SQL：

```sql
UPDATE user SET age=99, update_time='2020-05-22T00:10:29.631+0800', name='Andy',email='1456@qq.com' WHERE deleted=0 AND (name LIKE '%h%')
```
