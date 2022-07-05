---
title: MyBatisPlus之CRUD
tags:
  - jvm
  - java
categories:
  - java
cover: 'https://img.ansore.top/2022/05/04/627260e19ba56.jpg'
abbrlink: 2723818a
date: 2021-02-22 15:20:46
---

# CRUD

# insert

## 插入操作

```java
// 添加操作
@Test
void testInsert() {
    System.out.println("--------insert--------");
    User user = new User();
    user.setAge(18);
    user.setEmail("123@123.com");
    user.setName("haha");

    int result = userMapper.insert(user);
    //影响的行数
    System.out.println("result:" + result);
    //id自动回填
    System.out.println(user);
}
```

控制台输出：

```
result:1
User(id=1263011719026946049, name=haha, age=18, email=123@123.com)
```

注意：数据库插入id值默认为：全局唯一id

## 主键策略

### **ID_WORKER**

MyBatis-Plus默认的主键策略是：**ID_WORKER  全局唯一ID**

使用IdWorker工具类测试id的生成，了解id生成原理

```java
@Test
void testIdWorker() {
    IdWorker idWorker = new IdWorker();
    for (int i = 0; i < 10; i++) {
        System.out.println(idWorker.getId());
    }
}
```

### 自增策略

- 要想主键自增需要配置如下主键策略
    - 需要在创建数据表的时候设置主键自增
    - 实体字段中配置 @TableId(type = IdType.AUTO)

```java
@TableId(type = IdType.AUTO)
private Long id;
```

要想影响所有实体的配置，可以设置全局主键配置

```
#全局设置主键生成策略
mybatis-plus.global-config.db-config.id-type=auto
```

其它主键策略：分析 IdType 源码可知

```java
@Getter
public enum IdType {
    /**
     * 数据库ID自增
     */
    AUTO(0),
    /**
     * 该类型为未设置主键类型
     */
    NONE(1),
    /**
     * 用户输入ID
     * 该类型可以通过自己注册自动填充插件进行填充
     */
    INPUT(2),
    /* 以下3种类型、只有当插入对象ID 为空，才自动填充。 */
    /**
     * 全局唯一ID (idWorker)
     */
    ID_WORKER(3),
    ASSIGN_ID(3),
    /**
     * 全局唯一ID (UUID)
     */
    UUID(4),
ASSIGN_UUID(4),
    /**
     * 字符串全局唯一ID (idWorker 的字符串表示)
     */
    ID_WORKER_STR(3),
    private int key;
    IdType(int key) {
        this.key = key;
    }
}
```

# update

## 根据Id更新操作

注意：update时生成的sql自动是动态sql：

`UPDATE user SET age=? WHERE id=?`

```java
@Test
void testUpdate() {
    User user = new User();
    user.setId(1L);
    user.setAge(28);
    int i = userMapper.updateById(user);
    System.out.println("result:"+i);
}
```

## 自动填充

项目中经常会遇到一些数据，每次都使用相同的方式填充，例如记录的创建时间，更新时间等。

我们可以使用MyBatis Plus的自动填充功能，完成这些字段的赋值工作：

**数据库表中添加自动填充字段**

在User表中添加datetime类型的新的字段 create_time、update_time

**实体上添加注解**

```java
@Data
public class User {
    ......
    @TableField(fill = FieldFill.INSERT)
    private Date createTime;
    //@TableField(fill = FieldFill.UPDATE)
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private Date updateTime;
}
```

**实现元对象处理器接口**

注意：不要忘记添加 @Component 注解

```java
import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Date;

@Component
public class MyMetaObjectHandler implements MetaObjectHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(MyMetaObjectHandler.class);

    @Override
    public void insertFill(MetaObject metaObject) {
        LOGGER.info("start insert fill ....");
        this.setFieldValByName("createTime", new Date(), metaObject);
        this.setFieldValByName("updateTime", new Date(), metaObject);
    }
    
    @Override
    public void updateFill(MetaObject metaObject) {
        LOGGER.info("start update fill ....");
        this.setFieldValByName("updateTime", new Date(), metaObject);
    }
}
```

## 乐观锁

**主要适用场景：**当要更新一条记录的时候，希望这条记录没有被别人更新，也就是说实现线程安全的数据更新

乐观锁实现方式：

- 取出记录时，获取当前version
- 更新时，带上这个version
- 执行更新时， set version = newVersion where version = oldVersion
- 如果version不对，就更新失败

**数据库中添加version字段**

```sql
ALTER TABLE `user` ADD COLUMN `version` INT
```

**实体类添加version字段**

并添加 @Version 注解

```java
@Version
@TableField(fill = FieldFill.INSERT)
private Integer version;
```

**元对象处理器接口添加version的insert默认值**

```java
@Override
public void insertFill(MetaObject metaObject) {
    ......
    this.setFieldValByName("version", 1, metaObject);
}
```

**特别说明:**

- 支持的数据类型只有 int,Integer,long,Long,Date,Timestamp,LocalDateTime
- 整数类型下 newVersion = oldVersion + 1
- newVersion 会回写到 entity 中
- 仅支持 updateById(id) 与 update(entity, wrapper) 方法
- 在 update(entity, wrapper) 方法下, wrapper 不能复用!!!

**在 MybatisPlusConfig 中注册 Bean**

```java
@EnableTransactionManagement
@Configuration
@MapperScan("com.ansore.mybatisplus.mapper")
public class MyBatisConfig {

    // 乐观锁插件
    @Bean
    public OptimisticLockerInterceptor optimisticLockerInterceptor() {
        return new OptimisticLockerInterceptor();
    }
}
```

**测试乐观锁可以修改成功**

```java
@Test
void testOptimisticLocker() {

    //查询
    User user = userMapper.selectById(1L);
    //修改数据
    user.setName("Helen Yao");
    user.setEmail("1456@qq.com");

    userMapper.updateById(user);
}
```

打印的sql

```
==>  Preparing: UPDATE user SET name=?, age=?, email=?, create_time=?, update_time=?, version=? WHERE id=? AND version=? 
==> Parameters: Helen Yao(String), 18(Integer), 1456@qq.com(String), 2020-05-21 20:02:39.0(Timestamp), 2020-05-21 20:04:14.007(Timestamp), 2(Integer), 1263440062872309762(Long), 1(Integer)
<==    Updates: 1
```

**测试乐观锁修改失败**

```java
@Test
void testOptimisticLockerFail() {
    //查询
    User user = userMapper.selectById(1263440062872309762L);
    //修改数据
    user.setName("Helen Yao");
    user.setEmail("1456@qq.com");

    // 取出模拟数据后，数据库中version实际数据比取出的值大，即已被其他线程修改并更新了version
    user.setVersion(user.getVersion() - 1);

    // 执行更新
    userMapper.updateById(user);
}
```

打印的sql：

```
==>  Preparing: UPDATE user SET name=?, age=?, email=?, create_time=?, update_time=?, version=? WHERE id=? AND version=? 
==> Parameters: Helen Yao(String), 18(Integer), 1456@qq.com(String), 2020-05-21 20:02:39.0(Timestamp), 2020-05-21 20:13:14.86(Timestamp), 2(Integer), 1263440062872309762(Long), 1(Integer)
<==    Updates: 0
```

# **select**

## **根据id查询记录**

```java
@Test
void testSelectById(){
    User user = userMapper.selectById(1L);
    System.out.println(user);
}
```

# **通过多个id批量查询**

完成了动态sql的foreach的功能

```java
@Test
void testSelectBatchIds() {
    List<User> users = userMapper.selectBatchIds(Arrays.asList(1, 2, 3));
    users.forEach(System.out::println);
}
```

## **简单的条件查询**

通过map封装查询条件

```java
@Test
void testSelectByMap() {
    HashMap<String, Object> map = new HashMap<>();
    map.put("name", "Helen");
    map.put("age", 18);
    List<User> users = userMapper.selectByMap(map);
    users.forEach(System.out::println);
}
```

## 分页

MyBatis Plus自带分页插件，只要简单的配置即可实现分页功能

**创建配置类**

此时可以删除主类中的 *@MapperScan* 扫描注解

```java
// 分页插件
@Bean
public PaginationInterceptor paginationInterceptor(){
    return new PaginationInterceptor();
}
```

**测试selectPage分页**

**测试：**最终通过page对象获取相关数据

```java
@Test
void testSelectPage() {
    Page<User> page = new Page<>(1, 5);
    userMapper.selectPage(page, null);

    page.getRecords().forEach(System.out::println);
    System.out.println(page.getCurrent());
    System.out.println(page.getPages());
    System.out.println(page.getSize());
    System.out.println(page.getTotal());
    System.out.println(page.hasNext());
    System.out.println(page.hasPrevious());
}
```

控制台打印的sql:

```
==>  Preparing: SELECT id,name,age,email,create_time,update_time,version FROM user LIMIT ?,? 
==> Parameters: 0(Long), 5(Long)
```

**测试selectMapsPage分页：结果集是Map**

```
@Test
void testSelectMapsPage() {
    // 3.3.1 后的写法
    IPage<Map<String, Object>> page = new Page<>(1, 5);
    IPage<Map<String, Object>> mapIPage = userMapper.selectMapsPage(page, null);

    // 注意：此行必须使用mapIPage获取记录列表，否则会有数据类型转换的错误
    mapIPage.getRecords().forEach(System.out::println);

    System.out.println(page.getCurrent());
    System.out.println(page.getPages());
    System.out.println(page.getSize());
    System.out.println(page.getTotal());
}
```

# delete

## 根据id删除记录

```java
@Test
void testDeleteById() {
    int r = userMapper.deleteById(5L);
    System.out.println(r);
}
```

## 批量删除

```java
@Test
void testDeleteBatchIds() {
    int result = userMapper.deleteBatchIds(Arrays.asList(2, 3, 4));
    System.out.println(result);
}
```

## 简单的条件查询删除

```java
@Test
void testDeleteByMap() {
    HashMap<String, Object> map = new HashMap<>();
    map.put("name", "haha");
    int result = userMapper.deleteByMap(map);
    System.out.println(result);
}
```

## **逻辑删除**

- 物理删除：真实删除，将对应数据从数据库中删除，之后查询不到此条被删除数据
- 逻辑删除：假删除，将对应数据中代表是否被删除字段状态修改为“被删除状态”，之后在数据库中仍旧能看到此条数据记录

**数据库中添加 deleted字段**

```sql
ALTER TABLE `user` ADD COLUMN `deleted` boolean
```

**application.properties 加入配置**

此为默认值，如果你的默认值和mp默认的一样,该配置可无

```
# 逻辑删除字段 
mybatis-plus.global-config.db-config.logic-delete-field=flag
# 已删除默认值
mybatis-plus.global-config.db-config.logic-delete-value=1
# 未删除默认值
mybatis-plus.global-config.db-config.logic-not-delete-value=0
```

**实体类添加deleted 字段**

并加上 @TableLogic 注解

全局逻辑删除: begin 3.3.0

如果公司代码比较规范，比如统一了全局都是flag为逻辑删除字段。

使用此配置则不需要在实体类上添加 @TableLogic。

但如果实体类上有 @TableLogic 则以实体上的为准，忽略全局。 即先查找注解再查找全局，都没有则此表没有逻辑删除。

```java
@TableLogic
private Integer deleted;
```

**注册 Bean(3.1.1开始不再需要这一步)：**

```java
@Bean
    public ISqlInjector sqlInjector() {
        return new LogicSqlInjector();
    }
```

**测试逻辑删除**

- 测试后发现，数据并没有被删除，deleted字段的值由0变成了1
- 测试后分析打印的sql语句，是一条update
- **注意：被删除数据的deleted 字段的值必须是 0，才能被选取出来执行逻辑删除的操作**

```java
@Test
void testLogicDeleteByMap() {
    HashMap<String, Object> map = new HashMap<>();
    map.put("name", "haha");
    int result = userMapper.deleteByMap(map);
    System.out.println(result);
}
```

打印的sql：

```
==>  Preparing: UPDATE user SET deleted=1 WHERE name = ? AND deleted=0 
==> Parameters: haha(String)
<==    Updates: 20
```

**测试逻辑删除后的查询**

MyBatis Plus中查询操作也会自动添加逻辑删除字段的判断

```java
// 测试逻辑删除后的查询，不包括撒谎拿出字段的判断
@Test
void testLogicDeleteSelect() {
    List<User> users = userMapper.selectList(null);
    users.forEach(System.out::println);
}
```

测试后分析打印的sql语句，包含 WHERE deleted=0

```sql
SELECT id,name,age,email,create_time,update_time,version,deleted FROM user WHERE deleted=0
```

# 性能分析

性能分析拦截器，用于输出每条 SQL 语句及其执行时间

该插件 3.2.0 以上版本移除

推荐使用第三方扩展 执行SQL分析打印 功能

## **参数说明**

参数：maxTime： SQL 执行最大时长，超过自动停止运行，有助于发现问题。

参数：format： SQL是否格式化，默认false。

## 在 MybatisPlusConfig 中配置

```java
/**
 * SQL 执行性能分析插件
 * 开发环境使用，线上不推荐。 maxTime 指的是 sql 最大执行时长
 */
@Bean
@Profile({"dev","test"})// 设置 dev test 环境开启
public PerformanceInterceptor performanceInterceptor() {
    PerformanceInterceptor performanceInterceptor = new PerformanceInterceptor();
    performanceInterceptor.setMaxTime(100);//ms，超过此处设置的ms则sql不执行
    performanceInterceptor.setFormat(true);
    return performanceInterceptor;
}
```

- 参数：maxTime SQL 执行最大时长，超过自动停止运行，有助于发现问题。
- 参数：format SQL SQL是否格式化，默认false。
- 该插件只用于开发环境，不建议生产环境使用。

**（3）Spring Boot 中设置dev环境**

```
#环境设置：dev、test、prod
spring.profiles.active=dev
```

# 执行SQL分析打印

## p6spy 依赖引入

```xml
<dependency>
    <groupId>p6spy</groupId>
    <artifactId>p6spy</artifactId>
    <version>3.9.0</version>
</dependency>
```

## application.properties 配置

```
spring.datasource.driver-class-name=com.p6spy.engine.spy.P6SpyDriver
spring.datasource.url=jdbc:p6spy:mysql://localhost:3306/demo_mybatis_plus?serverTimezone=GMT%2B8
```

## spy.properties 配置

```
#3.2.1以上使用
modulelist=com.baomidou.mybatisplus.extension.p6spy.MybatisPlusLogFactory,com.p6spy.engine.outage.P6OutageFactory
#3.2.1以下使用或者不配置
#modulelist=com.p6spy.engine.logging.P6LogFactory,com.p6spy.engine.outage.P6OutageFactory
# 自定义日志打印
logMessageFormat=com.baomidou.mybatisplus.extension.p6spy.P6SpyLogger
#日志输出到控制台
appender=com.baomidou.mybatisplus.extension.p6spy.StdoutLogger
# 使用日志系统记录 sql
#appender=com.p6spy.engine.spy.appender.Slf4JLogger
# 设置 p6spy driver 代理
deregisterdrivers=true
# 取消JDBC URL前缀
useprefix=true
# 配置记录 Log 例外,可去掉的结果集有error,info,batch,debug,statement,commit,rollback,result,resultset.
excludecategories=info,debug,result,commit,resultset
# 日期格式
dateformat=yyyy-MM-dd HH:mm:ss
# 实际驱动可多个
#driverlist=org.h2.Driver
# 是否开启慢SQL记录
outagedetection=true
# 慢SQL记录标准 2 秒
outagedetectioninterval=2
```

- driver-class-name 为 p6spy 提供的驱动类
- url 前缀为 jdbc:p6spy 跟着冒号为对应数据库连接地址
- 打印出sql为null,在excludecategories增加commit
- 批量操作不打印sql,去除excludecategories中的batch
- 批量操作打印重复的问题请使用MybatisPlusLogFactory (3.2.1新增）
- 该插件有性能损耗，不建议生产环境使用。

## 测试

打印的sql:

```
Consume Time：5 ms 2020-05-21 22:29:46
 Execute SQL：INSERT INTO user ( id, name, age, email, create_time, version, deleted ) VALUES ( 1263477085830135810, 'haha', 18, '123@123.com', '2020-05-21T22:29:46.190+0800', 1, 0 )
```
