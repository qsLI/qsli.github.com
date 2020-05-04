---
title: jdbc-batching
toc: true
typora-root-url: jdbc-batching
typora-copy-images-to: jdbc-batching
tags: executeBatch
category: jdbc
mathjax: true
---

## 批量处理

### 批量插入

```java
/**
     * insert into words (word)  values(?)  ->  stopwatch = 66487
     */
    @Test
    @SneakyThrows
    public void testBatch() {
        String connectString = "jdbc:mysql://localhost/test?user=root&password=toor&useLocalSessionState=true&useSSL=false";
        Class.forName("com.mysql.jdbc.Driver")
            .newInstance();
        try (Connection conn = DriverManager.getConnection(connectString)) {
            //插入100000条测试代码
            Stopwatch stopwatch = Stopwatch.createStarted();
            try (PreparedStatement psts = conn.prepareStatement("insert into words (`word`)  VALUES(?)")) {
                for (int i = 0; i < 100000; i++) {
                    psts.setString(1, "123");
                    psts.addBatch();
                }
                psts.executeBatch();
                stopwatch.stop();
                System.out.println("stopwatch = " + stopwatch.elapsed(TimeUnit.MILLISECONDS));
            }
        }
    }
```

打开mysql的general log:

```bash
mysql> show variables like '%general%';
+------------------+---------------------------------------+
| Variable_name    | Value                                 |
+------------------+---------------------------------------+
| general_log      | ON                                    |
| general_log_file | /usr/local/var/mysql/qishengdembp.log |
+------------------+---------------------------------------+
2 rows in set (0.01 sec)
```

这里已经是开启的状态，如果没有开启可以设置下：

```bash
mysql> set global general_log=1;
Query OK, 0 rows affected (0.00 sec)
```

上述java代码执行的时候，查看general log:

```bash
2020-05-02T23:41:28.438048Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.438535Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.439123Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.439725Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.440244Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.440827Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.441424Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.441962Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.442464Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.443025Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.443645Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.444439Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.444938Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.445491Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.446027Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.446575Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.447071Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.447608Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.448215Z	  154 Query	insert into words (`word`)  VALUES('123')
2020-05-02T23:41:28.453209Z	  154 Quit
```

对应的抓包：

![image-20200503131020833](/image-20200503131020833.png)

看起来是一个一个发送的，server端也是一个一个执行的。这样并不能提高效率

#### rewriteBatchedStatements=true

jdbc的连接上配置这个参数，重复上面的过程，得到的结果：

```
stopwatch = 1320
```

sql被改写成了：

```sql
2020-05-03T05:27:17.921856Z	  163 Connect	root@localhost on test using TCP/IP
2020-05-03T05:27:17.925632Z	  163 Query	/* mysql-connector-java-8.0.16 (Revision: 34cbc6bc61f72836e26327537a432d6db7c77de6) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout
2020-05-03T05:27:17.944989Z	  163 Query	SET character_set_results = NULL
2020-05-03T05:27:18.312174Z	  163 Query	insert into words (`word`)  VALUES('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123')
2020-05-03T05:27:19.280437Z	  163 Quit
```

![image-20200503132913411](/image-20200503132913411.png)

抓包也只看到了一次请求，这个性能提升有60+倍。

### 批量删除

测试下批量删除会变成什么样子

```java
@Test
@SneakyThrows
public void testDeleteBatch() {
  Class.forName("com.mysql.jdbc.Driver")
    .newInstance();
  try (Connection conn = DriverManager.getConnection(connectString)) {
    Stopwatch stopwatch = Stopwatch.createStarted();
    try (PreparedStatement psts = conn.prepareStatement("delete from words where id = ?")) {
      for (int i = 0; i < 100000; i++) {
        psts.setInt(1, i);
        psts.addBatch();
      }
      psts.executeBatch();
      stopwatch.stop();
      System.out.println("stopwatch = " + stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }
  }
}
```

![image-20200503141225096](/image-20200503141225096.png)

**sql是一起发过去的**， response貌似是逐个返回的，看下general log：

```bash
2020-05-03T06:14:33.457011Z	  180 Query	delete from words where id = 99980;
2020-05-03T06:14:33.460456Z	  180 Query	delete from words where id = 99981;
2020-05-03T06:14:33.465265Z	  180 Query	delete from words where id = 99982;
2020-05-03T06:14:33.466960Z	  180 Query	delete from words where id = 99983;
2020-05-03T06:14:33.471134Z	  180 Query	delete from words where id = 99984;
2020-05-03T06:14:33.478481Z	  180 Query	delete from words where id = 99985;
2020-05-03T06:14:33.482165Z	  180 Query	delete from words where id = 99986;
2020-05-03T06:14:33.484546Z	  180 Query	delete from words where id = 99987;
2020-05-03T06:14:33.489019Z	  180 Query	delete from words where id = 99988;
2020-05-03T06:14:33.492171Z	  180 Query	delete from words where id = 99989;
2020-05-03T06:14:33.496335Z	  180 Query	delete from words where id = 99990;
2020-05-03T06:14:33.502214Z	  180 Query	delete from words where id = 99991;
2020-05-03T06:14:33.504907Z	  180 Query	delete from words where id = 99992;
2020-05-03T06:14:33.511418Z	  180 Query	delete from words where id = 99993;
2020-05-03T06:14:33.519557Z	  180 Query	delete from words where id = 99994;
2020-05-03T06:14:33.524177Z	  180 Query	delete from words where id = 99995;
2020-05-03T06:14:33.530256Z	  180 Query	delete from words where id = 99996;
2020-05-03T06:14:33.533451Z	  180 Query	delete from words where id = 99997;
2020-05-03T06:14:33.536034Z	  180 Query	delete from words where id = 99998;
2020-05-03T06:14:33.537884Z	  180 Query	delete from words where id = 99999
2020-05-03T06:14:33.947681Z	  180 Quit
```

执行是一条一条执行的

### 内存占用过大

如果一直`addBatch`,内存压力会比较大，可以分批执行下。


## mysql的实现

在低版本的mysql connector里，有的不会改写成`insert into xx () values`的形式，感觉是个bug；升级版本之后就可以了。

mysql-connector-java-8.0.16.jar

```java
// com.mysql.cj.jdbc.ClientPreparedStatement#executeBatchInternal
try {
  statementBegins();
  clearWarnings();

  if (!this.batchHasPlainStatements && this.rewriteBatchedStatements.getValue()) {

    if (((PreparedQuery<?>) this.query).getParseInfo().canRewriteAsMultiValueInsertAtSqlLevel()) {
      // batch insert 重写
      return executeBatchedInserts(batchTimeout);
    }

    if (!this.batchHasPlainStatements && this.query.getBatchedArgs() != null
        && this.query.getBatchedArgs().size() > 3 /* cost of option setting rt-wise */) {
      return executePreparedBatchAsMultiStatement(batchTimeout);
    }
  }

  return executeBatchSerially(batchTimeout);
} finally {
  this.query.getStatementExecuting().set(false);

  clearBatch();
}
```

## 添加事务

之前执行都是自动提交的，相当于是多个事务，这次修改成一个单独的事务看看效果：

```java
@Test
@SneakyThrows
public void testBatchWithTransaction() {
  Class.forName("com.mysql.jdbc.Driver")
    .newInstance();
  try (Connection conn = DriverManager.getConnection(connectString)) {
    // 关闭事务的自动提交
    conn.setAutoCommit(false);
    Stopwatch stopwatch = Stopwatch.createStarted();
    try (PreparedStatement psts = conn.prepareStatement("insert into words (word)  values(?)")) {
      for (int i = 0; i < 100000; i++) {
        psts.setString(1, "123");
        psts.addBatch();
      }
      psts.executeBatch();
      // 提交事务
      conn.commit();
      stopwatch.stop();
      System.out.println("stopwatch = " + stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }
  }
}
```

General log：

```bash
2020-05-03T06:58:19.567073Z	  191 Query	insert into words (word)  values('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123'),('123')
2020-05-03T06:58:26.751411Z	  191 Query	commit
2020-05-03T06:58:26.784298Z	  191 Query	rollback
2020-05-03T06:58:26.828868Z	  191 Quit
```

执行时间：

```bash
stopwatch = 2236
```

时间并没有提升，反倒有些下降，这个涉及的原因可能跟数据库的事务相关的各种配置有关系，后面再继续研究。

## 结论

- executeBatch要和`rewriteBatchedStatements`或`allowMultiQueries`一起使用才有效果
- executeBatch执行的sql太多时最好分批次，避免对jvm造成太大的压力
- executeBatch执行的sql个数大于3


## 参考

- [MySQL Jdbc驱动的rewriteBatchedStatements参数使batch生效 - 如风达的个人空间 - OSCHINA](https://my.oschina.net/u/2300159/blog/783613)
- [MySQL :: MySQL 5.6 Reference Manual :: 8.2.4.1 Optimizing INSERT Statements](https://dev.mysql.com/doc/refman/5.6/en/insert-optimization.html)
- [Mysql 批量insert 性能测试-云栖社区-阿里云](https://yq.aliyun.com/articles/131279)
- [High-Performance JDBC Voxxed Bucharest 2016](https://www.slideshare.net/VladMihalcea/highperformance-jdbc-voxxed-bucharest-2016/7)

