---
title: Java分页查询
tags: mysql
category: base
toc: true
date: 2016-09-30 00:19:07
typora-root-url: pagination
typora-copy-images-to: pagination

---

## MySQL的三种查询模式

半双工工作模式

![img](/a027c300d7dde8cea4fad8f34b670ebd.jpg)



> **Every cursor uses temporary resources to hold its data**. These resources can be memory, a disk paging file, temporary disk files, or even temporary storage in the database. 
>
> The cursor is called a ***client-side* cursor** when these resources are located on the **client** computer. 
>
> The cursor is called a ***server-side* cursor** when these resources are located on the **server**.

Client Side Cursor

​	JDBC默认使用的是client side cursor

​	mysql_store_result（客户端本地缓存结果）

Server Side Cursor

​	mysql_use_result（Server端缓存结果）



### 验证

**使用到的表结构：**

```mysql
mysql> desc words;
+-------+-------------+------+-----+---------+----------------+
| Field | Type        | Null | Key | Default | Extra          |
+-------+-------------+------+-----+---------+----------------+
| id    | int(11)     | NO   | PRI | NULL    | auto_increment |
| word  | varchar(64) | YES  |     | NULL    |                |
+-------+-------------+------+-----+---------+----------------+
2 rows in set (0.00 sec)

mysql> select count(*) from words
    -> ;
+----------+
| count(*) |
+----------+
|    99996 |
+----------+
1 row in set (0.02 sec)

mysql> select * from words limit 20;
+----+------+
| id | word |
+----+------+
|  2 | 123  |
|  3 | 123  |
|  4 | 123  |
|  5 | 123  |
|  6 | 123  |
|  7 | 123  |
|  8 | 123  |
|  9 | 123  |
| 11 | 123  |
| 12 | 123  |
| 13 | 123  |
| 14 | 123  |
| 15 | 123  |
| 16 | 123  |
| 17 | 123  |
| 18 | 123  |
| 19 | 123  |
| 20 | 123  |
| 21 | 123  |
| 22 | 123  |
+----+------+
20 rows in set (0.00 sec)
```



#### Client Side Cursor

什么都不配置的情况下，mysql默认会把所有的数据发送给客户端，也就是默认使用的是Client Side Cursor。

~~流控只能根据TCP的发送窗口来做~~

**Mybatis配置：**

```xml
// mybatis-config
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE configuration PUBLIC "-//mybatis.org//DTD Config 3.0//EN" "http://mybatis.org/dtd/mybatis-3-config.dtd">
<configuration>
    <properties>
        <property name="dialect" value="mysql"/>
    </properties>
    
    <environments default="development">
        <environment id="development">
            <transactionManager type="JDBC"/>
            <dataSource type="POOLED">
                <property name="driver" value="com.mysql.jdbc.Driver"/>
                <property name="url" value="jdbc:mysql://127.0.0.1:3306/test?useSSL=false"/>
                <property name="username" value="root"/>
                <property name="password" value="toor"/>
            </dataSource>
        </environment>
    </environments>

    <mappers>
        <mapper resource="./Mapper.xml" />
    </mappers>

</configuration>


// Mapper.xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="org.apache.ibatis.test">

    <select id="selectAll" resultType="com.air.mybatis.sqlsession.WordDTO">
       select * from words
    </select>

</mapper>
```

**Java端代码：**

```java
@Data
public class WordDTO {

    private Integer id;

    private String word;
}


@RunWith(JUnit4ClassRunner.class)
public class SqlSessionTest {

    @Test
    @SneakyThrows
    public void testSelect() {
        try (Reader reader = Resources.getResourceAsReader("mybatis-config.xml")) {
            //创建SqlSessionFactory
            SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(reader);
            //获取SqlSession
            SqlSession sqlSession = sqlSessionFactory.openSession();
            //使用mybatis自带的RowBounds进行分页
            final List<Object> selectAll = sqlSession.selectList("selectAll", null, new RowBounds(10,20));
            System.out.println("selectAll = " + selectAll);
        }
    }
}
```

**执行的返回结果：**

确实只返回了十条数据

```bash
selectAll = [WordDTO(id=13, word=123), WordDTO(id=14, word=123), WordDTO(id=15, word=123), WordDTO(id=16, word=123), WordDTO(id=17, word=123), WordDTO(id=18, word=123), WordDTO(id=19, word=123), WordDTO(id=20, word=123), WordDTO(id=21, word=123), WordDTO(id=22, word=123), WordDTO(id=23, word=123), WordDTO(id=24, word=123), WordDTO(id=25, word=123), WordDTO(id=26, word=123), WordDTO(id=27, word=123), WordDTO(id=28, word=123), WordDTO(id=29, word=123), WordDTO(id=30, word=123), WordDTO(id=31, word=123), WordDTO(id=32, word=123)]
```

**WireShark抓包结果：**

![image-20201129225745250](/image-20201129225745250.png)

从抓包的结果看，mysql 把所有数据都发送到了client端

**General log的结果：**

```bash
2020-11-29T14:52:45.255304Z	   26 Connect	root@localhost on test using TCP/IP
2020-11-29T14:52:45.257730Z	   26 Query	/* mysql-connector-java-8.0.16 (Revision: 34cbc6bc61f72836e26327537a432d6db7c77de6) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout
2020-11-29T14:52:45.275263Z	   26 Query	SET character_set_results = NULL
2020-11-29T14:52:45.276567Z	   26 Query	SET autocommit=1
2020-11-29T14:52:45.286060Z	   26 Query	SET autocommit=0
2020-11-29T14:52:45.320721Z	   26 Query	select * from words
```

#### Server Side Cursor

要使用Server Side Cursor，需要改两个配置，

- 一个是jdbc的连接参数`useCursorFetch`

> **useCursorFetch**
>
> If connected to MySQL > 5.0.2, and setFetchSize() > 0 on a statement, should that statement use cursor-based fetching to retrieve rows?
>
> Default: false
>
> Since version: 5.0.0

```xml
jdbc:mysql://127.0.0.1:3306/test?useSSL=false&useCursorFetch=true
```

- 一个就是fetchSize:

  ```xml
  <select id="selectAll" fetchSize="3" resultType="com.air.mybatis.sqlsession.WordDTO">
    select * from words
  </select>
  ```

  也可以设置一个全局的：

  ```xml
  // mybatis-config
  <settings>
    <setting name="defaultFetchSize" value="3"/>
  </settings>
  ```

修改配置之后，再次查询，wireshark的抓包结果：

![image-20201129230831912](/image-20201129230831912.png)

General log:

```bash
2020-11-29T15:07:33.852536Z	   27 Connect	root@localhost on test using TCP/IP
2020-11-29T15:07:33.855425Z	   27 Query	/* mysql-connector-java-8.0.16 (Revision: 34cbc6bc61f72836e26327537a432d6db7c77de6) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout
2020-11-29T15:07:33.869299Z	   27 Query	SET character_set_results = NULL
2020-11-29T15:07:33.870598Z	   27 Query	SET autocommit=1
2020-11-29T15:07:33.880234Z	   27 Query	SET autocommit=0
2020-11-29T15:07:33.900411Z	   27 Prepare	select * from words
2020-11-29T15:07:34.044284Z	   27 Close stmt
```

自动变成了PreparedStatement，抓包发现又多次Fetch Data的请求，我们设置的fetchSize=3, 总共需要数据30条（10 offset + 20 limit），需要fetch的次数 30 / 3 = 10 次，图中显示也有10次Fetch Data的请求。

为什么offset的也算上了？debug发现：

```java
// org.apache.ibatis.executor.resultset.DefaultResultSetHandler#skipRows
private void skipRows(ResultSet rs, RowBounds rowBounds) throws SQLException {
  if (rs.getType() != ResultSet.TYPE_FORWARD_ONLY) {
    if (rowBounds.getOffset() != RowBounds.NO_ROW_OFFSET) {
      rs.absolute(rowBounds.getOffset());
    }
  } else {
    for (int i = 0; i < rowBounds.getOffset(); i++) {
      if (!rs.next()) {
        break;
      }
    }
  }
}
```

![image-20201129231559886](/image-20201129231559886.png)

ResultSet的type是1003，正好是forward only：

```java
/**
     * The constant indicating the type for a <code>ResultSet</code> object
     * whose cursor may move only forward.
     * @since 1.2
     */
int TYPE_FORWARD_ONLY = 1003;
```

字面上就是只能一次一次往前走，所以offset的数据也得fetch到，然后一条一条的丢弃掉。

这个可以修改statement的声明：

```xml
<select id="selectAll" fetchSize="3" resultSetType="SCROLL_INSENSITIVE" resultType="com.air.mybatis.sqlsession.WordDTO">
  select * from words
</select>
```

抓包发现没有生效，打印是否支持：

```java
metaData.support.TYPE_SCROLL_INSENSITIVE = true
metaData.support.TYPE_SCROLL_SENSITIVE = false
  
final DatabaseMetaData metaData = sqlSession.getConnection().getMetaData();
System.out.println("metaData.support.TYPE_SCROLL_INSENSITIVE = " + metaData.supportsResultSetType(ResultSet.TYPE_SCROLL_INSENSITIVE));
System.out.println("metaData.support.TYPE_SCROLL_SENSITIVE = " + metaData.supportsResultSetType(ResultSet.TYPE_SCROLL_SENSITIVE));
```

debug发现，连接创建的时候设置的确实是`TYPE_SCROLL_INSENSITIVE`，但是返回过来的却还是默认的`TYPE_FORWARD_ONLY`

```java
  @Override
  protected Statement instantiateStatement(Connection connection) throws SQLException {
    String sql = boundSql.getSql();
    if (mappedStatement.getKeyGenerator() instanceof Jdbc3KeyGenerator) {
      String[] keyColumnNames = mappedStatement.getKeyColumns();
      if (keyColumnNames == null) {
        return connection.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS);
      } else {
        return connection.prepareStatement(sql, keyColumnNames);
      }
    } else if (mappedStatement.getResultSetType() == ResultSetType.DEFAULT) {
      return connection.prepareStatement(sql);
    } else {
      // 走到了这里
      return connection.prepareStatement(sql, mappedStatement.getResultSetType().getValue(), ResultSet.CONCUR_READ_ONLY);
    }
  }
```

查了下发现是jdbc的bug：

> When creating a `Statement`, the specification for the `resultSetType` parameter was not honored, so that the `ResultSet` type was always set to `ResultSet.TYPE_FORWARD_ONLY`. With this fix, the `resultSetType` parameter is now honored. Also, type validation has been added so that calling the methods `beforeFirst`, `afterLast`, `first`, `last`, `absolute`, `relative`, or `previous` results in an exception if the `ResultSet` type is `ResultSet.TYPE_FORWARD_ONLY`. (Bug #30474158)

[MySQL :: MySQL Connector/J 8.0 Release Notes :: Changes in MySQL Connector/J 8.0.20 (2020-04-27, General Availability)](https://dev.mysql.com/doc/relnotes/connector-j/8.0/en/news-8-0-20.html)

我用的版本刚好是`8.0.16`， 升级个版本看下：

![image-20201129235515875](/image-20201129235515875.png)

这次好了，不过有些请求wireshark没有识别出来，大概能看出来fetch data请求了4次， 正好是10 / 3 = 4，符合我们的预期了。

### 普通查询

### 流式查询

### 游标查询

## JDBC的实现



## Java的ResultSet

ResultSet（java.sql.ResultSet）的定义：

>  A table of data representing a database result set, which is usually generated by executing a statement that queries the database.

> A `ResultSet` object **maintains a cursor pointing to its current row of data**. Initially the cursor is positioned before the first row. The `next` method moves the cursor to the next row, and because it returns `false` when there are no more rows in the `ResultSet` object, it can be used in a `while` loop to iterate through the result set.

> **A default `ResultSet` object is not updatable and has a cursor that moves forward only.** Thus, you can iterate through it only once and only from the first row to the last row. It is possible to produce `ResultSet` objects that are scrollable and/or updatable. The following code fragment, in which `con` is a valid `Connection` object, illustrates how to make a result set that is scrollable and insensitive to updates by others, and that is updatable. See `ResultSet` fields for other options.

```java
Statement stmt = con.createStatement(
  ResultSet.TYPE_SCROLL_INSENSITIVE,
  ResultSet.CONCUR_UPDATABLE);
ResultSet rs = stmt.executeQuery("SELECT a, b FROM TABLE2");
// rs will be scrollable, will not show changes made by others,
// and will be updatable
```

![E2C5CD7D-0E98-4771-96CC-BA185B62F8B3](/E2C5CD7D-0E98-4771-96CC-BA185B62F8B3.jpg)

ResultSet类型：

## 分页的三种方式

### 逻辑分页

Mybatis提供了RowBounds来进行分页：

```java

```

![image-20201130110527335](/image-20201130110527335.png)

### 物理分页

物理分页是指基于数据库提供的类似 `limit offset,rows`这样的语法。

但是，比如`limit 10000,20`,  就会读取10020条数据，但是只会返回后面20条数据。

### 手工计算

如果id是有序的，可以做一个简单的转换，比如使用  `where id between 10000 and 10020`, 这样的效率就会相对的高些

## 参考

1. [ResultSet (Java Platform SE 7 )](https://docs.oracle.com/javase/7/docs/api/java/sql/ResultSet.html)
2. [PPC2009_mysql_pagination.pdf](PPC2009_mysql_pagination.pdf)
3. [Mybatis3.3.x技术内幕（十三）：Mybatis之RowBounds分页原理 - 祖大俊的个人页面 - OSCHINA - 中文开源技术交流社区](https://my.oschina.net/zudajun/blog/671446)
4. [Interface result set](https://pt.slideshare.net/myrajendra/interface-result-set)
5. [MySQL :: MySQL 5.7 Reference Manual :: 13.6.6 Cursors](https://dev.mysql.com/doc/refman/5.7/en/cursors.html)
6. [MyBatis中使用流式查询避免数据量过大导致OOM - 云+社区 - 腾讯云](https://cloud.tencent.com/developer/article/1330441)
7. [JDBC操作MySQL（3）—查询（普通、流式、游标） - 简书](https://www.jianshu.com/p/c7c5dbe63019)
8. [33 | 我查这么多数据，会不会把数据库内存打爆？](https://time.geekbang.org/column/article/79407)
9. [正确使用MySQL JDBC setFetchSize()方法解决JDBC处理大结果 - 有梦就能实现 - 博客园](https://www.cnblogs.com/firstdream/p/7834833.html)
10. [MySQL JDBC/MyBatis Stream方式读取SELECT超大结果集 - 陈龙的blog - 博客园](https://www.cnblogs.com/logicbaby/p/4281100.html)
11. [The Significance of Cursor Location | Microsoft Docs](https://docs.microsoft.com/en-us/office/client-developer/access/desktop-database-reference/the-significance-of-cursor-location)
12. [MySQL :: MySQL Connector/J 5.1 Developer Guide :: 5.3 Configuration Properties for Connector/J](https://dev.mysql.com/doc/connector-j/5.1/en/connector-j-reference-configuration-properties.html)
13. [Mybatis源码之美:3.7.深入了解select元素](https://juejin.cn/post/6844904143392358407)
14. [MySQL JDBC Memory Usage on Large ResultSet · Ben Christensen](http://benjchristensen.com/2008/05/27/mysql-jdbc-memory-usage-on-large-resultset/)
15. [MySQL :: MySQL Connector/J 8.0 Release Notes :: Changes in MySQL Connector/J 8.0.20 (2020-04-27, General Availability)](https://dev.mysql.com/doc/relnotes/connector-j/8.0/en/news-8-0-20.html)
16. 《高性能MySQL》

