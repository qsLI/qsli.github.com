---
title: jdbc预编译缓存加速sql执行
tags: cache-prep-stmts
category: jdbc
toc: true
typora-root-url: jdbc预编译缓存加速sql执行
typora-copy-images-to: jdbc预编译缓存加速sql执行
date: 2020-05-05 00:21:27
---



`PreparedStatement`可以防止sql注入，这个大家都知道；今天来聊聊他对性能的提升。



## SQL syntax

SQL syntax for prepared statements is based on three SQL statements:

- [`PREPARE`](https://dev.mysql.com/doc/refman/5.7/en/prepare.html) prepares a statement for execution (see [Section 13.5.1, “PREPARE Statement”](https://dev.mysql.com/doc/refman/5.7/en/prepare.html)).
- [`EXECUTE`](https://dev.mysql.com/doc/refman/5.7/en/execute.html) executes a prepared statement (see [Section 13.5.2, “EXECUTE Statement”](https://dev.mysql.com/doc/refman/5.7/en/execute.html)).
- [`DEALLOCATE PREPARE`](https://dev.mysql.com/doc/refman/5.7/en/deallocate-prepare.html) releases a prepared statement (see [Section 13.5.3, “DEALLOCATE PREPARE Statement”](https://dev.mysql.com/doc/refman/5.7/en/deallocate-prepare.html)).

```sql
mysql> PREPARE stmt1 FROM 'SELECT * FROM words where id = ?';
Query OK, 0 rows affected (0.00 sec)
Statement prepared

mysql> SET @i=1;
Query OK, 0 rows affected (0.00 sec)
mysql> EXECUTE stmt1 USING @i;
Empty set (0.01 sec)

mysql> SET @i=2;
Query OK, 0 rows affected (0.00 sec)
mysql> EXECUTE stmt1 USING @i;
+----+------+
| id | word |
+----+------+
|  2 | 123  |
+----+------+
1 row in set (0.00 sec)

mysql> deallocate prepare stmt1;
Query OK, 0 rows affected (0.00 sec)

mysql> EXECUTE stmt1 USING @i;
ERROR 1243 (HY000): Unknown prepared statement handler (stmt1) given to EXECUTE
```

## MySQL Connector/J

### 普通的sql执行

```java
@Test
@SneakyThrows
public void testPreCompile() {
  String connectString = "jdbc:mysql://localhost/test?user=root&password=toor&useLocalSessionState=true&useSSL=false";
  Class.forName("com.mysql.jdbc.Driver")
    .newInstance();
  try (Connection conn = DriverManager.getConnection(connectString)) {
    Stopwatch stopwatch = Stopwatch.createStarted();
    try (PreparedStatement psts = conn.prepareStatement("delete from words where id = ?")) {
      psts.setInt(1, 1);
      psts.execute();
      stopwatch.stop();
      System.out.println("stopwatch = " + stopwatch.elapsed(TimeUnit.MILLISECONDS));
      psts.setInt(1, 10);
      psts.execute();
    }
  }
}
```

wireshark抓包：

![image-20200504210731650](/image-20200504210731650.png)

mysql general log:

```bash
2020-05-04T13:06:07.883131Z	   15 Connect	root@localhost on test using TCP/IP
2020-05-04T13:06:07.885668Z	   15 Query	/* mysql-connector-java-8.0.16 (Revision: 34cbc6bc61f72836e26327537a432d6db7c77de6) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout
2020-05-04T13:06:07.905021Z	   15 Query	SET character_set_results = NULL
2020-05-04T13:06:07.929557Z	   15 Query	delete from words where id = 1
2020-05-04T13:06:07.934906Z	   15 Query	delete from words where id = 10
2020-05-04T13:06:07.940645Z	   15 Quit
```

### with useServerPrepStmts=true

> **useServerPrepStmts**
>
> Use server-side prepared statements if the server supports them?
>
> Default: false
>
> Since version: 3.1.0

jdbc的连接参数加上`useServerPrepStmts=true`：

![image-20200504211949686](/image-20200504211949686.png)

首选需要编译statement，请求如下：

![image-20200504212134794](/image-20200504212134794.png)

后面执行的时候，只传了对应的statement id 1和占位符对应的值 1，大大减少了网络的传输：

![image-20200504212218401](/image-20200504212218401.png)

mysql的general log如下，也是先prepare， 然后excute了两次， 最后关闭stmt：

```bash
2020-05-04T13:15:55.611149Z	   16 Connect	root@localhost on test using TCP/IP
2020-05-04T13:15:55.615655Z	   16 Query	/* mysql-connector-java-8.0.16 (Revision: 34cbc6bc61f72836e26327537a432d6db7c77de6) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout
2020-05-04T13:15:55.640086Z	   16 Query	SET character_set_results = NULL
2020-05-04T13:15:55.672345Z	   16 Prepare	delete from words where id = ?
2020-05-04T13:15:55.676355Z	   16 Execute	delete from words where id = 1
2020-05-04T13:15:55.681600Z	   16 Execute	delete from words where id = 10
2020-05-04T13:15:55.681949Z	   16 Close stmt
2020-05-04T13:15:55.687659Z	   16 Quit
```

### cachePrepStmts和useServerPrepStmts同时打开

> **cachePrepStmts**
>
> Should the driver cache the parsing stage of PreparedStatements of client-side prepared statements, the "check" for suitability of server-side prepared and server-side prepared statements themselves?
>
> Default: false
>
> Since version: 3.0.10

这里就是加上缓存，stmt close的时候，并不会把之前预编译的stmt给关闭，这个缓存是connection级别的。

```java
@Test
@SneakyThrows
public void testPreCompile() {
  String connectString = "jdbc:mysql://localhost/test?user=root&password=toor&useLocalSessionState=true&useSSL=false&useServerPrepStmts=true&cachePrepStmts=true";
  Class.forName("com.mysql.jdbc.Driver")
    .newInstance();
  try (Connection conn = DriverManager.getConnection(connectString)) {
    Stopwatch stopwatch = Stopwatch.createStarted();
    try (PreparedStatement psts = conn.prepareStatement("delete from words where id = ?")) {
      psts.setInt(1, 1);
      psts.execute();
      stopwatch.stop();
      System.out.println("stopwatch = " + stopwatch.elapsed(TimeUnit.MILLISECONDS));
      psts.setInt(1, 10);
      psts.execute();
    }

    // 上面的stmt关闭之后，再次执行
    try (PreparedStatement psts = conn.prepareStatement("delete from words where id = ?")) {
      psts.setInt(1, 100);
      psts.execute();
    }
  }

  // 上面的connection关闭之后，再次执行
  try (Connection conn = DriverManager.getConnection(connectString)) {
    try (PreparedStatement psts = conn.prepareStatement("delete from words where id = ?")) {
      psts.setInt(1, 66);
      psts.execute();
    }
  }

}
```

wireshark抓包：

![image-20200504231854521](/image-20200504231854521.png)
mysql的general log：

```bash
2020-05-04T15:17:32.921041Z	   19 Connect	root@localhost on test using TCP/IP
2020-05-04T15:17:32.929561Z	   19 Query	/* mysql-connector-java-8.0.16 (Revision: 34cbc6bc61f72836e26327537a432d6db7c77de6) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout
2020-05-04T15:17:32.949986Z	   19 Query	SET character_set_results = NULL
2020-05-04T15:17:32.983173Z	   19 Prepare	delete from words where id = ?
2020-05-04T15:17:32.990498Z	   19 Execute	delete from words where id = 1
2020-05-04T15:17:32.997115Z	   19 Execute	delete from words where id = 10
2020-05-04T15:17:32.997566Z	   19 Reset stmt
2020-05-04T15:17:32.997725Z	   19 Execute	delete from words where id = 100
2020-05-04T15:17:33.003682Z	   19 Quit
2020-05-04T15:17:33.009206Z	   20 Connect	root@localhost on test using TCP/IP
2020-05-04T15:17:33.009643Z	   20 Query	/* mysql-connector-java-8.0.16 (Revision: 34cbc6bc61f72836e26327537a432d6db7c77de6) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout
2020-05-04T15:17:33.010569Z	   20 Query	SET character_set_results = NULL
2020-05-04T15:17:33.011244Z	   20 Prepare	delete from words where id = ?
2020-05-04T15:17:33.011475Z	   20 Execute	delete from words where id = 66
2020-05-04T15:17:33.114892Z	   20 Quit
```

连接关闭之后，重新执行同样的sql，发现又触发了编译。

### 缓存大小的限制

下面两个参数，分别限制了能够缓存多少个和最大sql的长度

#### prepStmtCacheSize

> **prepStmtCacheSize**
>
> If prepared statement caching is enabled, **how many** prepared statements should be cached?
>
> Default: 25
>
> Since version: 3.0.10
>
> 

#### prepStmtCacheSqlLimit

> If prepared statement caching is enabled, what's the **largest SQL** the driver will cache the parsing for?
>
> Default: 256
>
> Since version: 3.0.10



## druid 连接池下使用

测试代码：

```java
@Test
    @SneakyThrows
    public void testPreCompile() {
        String connectString = "jdbc:mysql://localhost/test?user=root&password=toor&useLocalSessionState=true&useSSL=false&useServerPrepStmts=true&cachePrepStmts=true";

        final DruidDataSource druidDataSource = new DruidDataSource();
        druidDataSource.setUrl(connectString);
        druidDataSource.setUsername("root");
        druidDataSource.setPassword("toor");
        druidDataSource.setFilters("slf4j");
        //        druidDataSource.setTestOnBorrow(true);
        //        druidDataSource.setTestOnReturn(true);
        //        druidDataSource.setTestWhileIdle(true);
        druidDataSource.setMaxActive(1);
        druidDataSource.setInitialSize(1);
        druidDataSource.setTimeBetweenLogStatsMillis(900);
        try (Connection conn = druidDataSource.getConnection()) {
            Stopwatch stopwatch = Stopwatch.createStarted();
            try (PreparedStatement psts = conn.prepareStatement("delete from words where id = ?")) {
                psts.setInt(1, 1);
                psts.execute();
                stopwatch.stop();
                System.out.println("stopwatch = " + stopwatch.elapsed(TimeUnit.MILLISECONDS));
                psts.setInt(1, 10);
                psts.execute();
            }

            // 上面的stmt关闭之后，再次执行
            try (PreparedStatement psts = conn.prepareStatement("delete from words where id = ?")) {
                psts.setInt(1, 100);
                psts.execute();
            }
        }

        // 上面的connection关闭之后，再次执行
        try (Connection conn = druidDataSource.getConnection()) {
            try (PreparedStatement psts = conn.prepareStatement("delete from words where id = ?")) {
                psts.setInt(1, 66);
                psts.execute();
            }
        }
    }
```

只有一个连接的druid连接池，连接关闭连接时其实是归还到池子中，所以第二次拿连接，**拿到的还是同一个**；所以没有触发第二次编译。

wireshark抓包：

![image-20200504232259775](/image-20200504232259775.png)

mysql general log：

```bash

2020-05-04T15:21:34.187732Z	   21 Connect	root@localhost on test using TCP/IP
2020-05-04T15:21:34.202166Z	   21 Query	/* mysql-connector-java-8.0.16 (Revision: 34cbc6bc61f72836e26327537a432d6db7c77de6) */SELECT  @@session.auto_increment_increment AS auto_increment_increment, @@character_set_client AS character_set_client, @@character_set_connection AS character_set_connection, @@character_set_results AS character_set_results, @@character_set_server AS character_set_server, @@collation_server AS collation_server, @@collation_connection AS collation_connection, @@init_connect AS init_connect, @@interactive_timeout AS interactive_timeout, @@license AS license, @@lower_case_table_names AS lower_case_table_names, @@max_allowed_packet AS max_allowed_packet, @@net_write_timeout AS net_write_timeout, @@performance_schema AS performance_schema, @@sql_mode AS sql_mode, @@system_time_zone AS system_time_zone, @@time_zone AS time_zone, @@transaction_isolation AS transaction_isolation, @@wait_timeout AS wait_timeout
2020-05-04T15:21:34.240492Z	   21 Query	SET character_set_results = NULL
2020-05-04T15:21:34.316483Z	   21 Prepare	delete from words where id = ?
2020-05-04T15:21:34.333444Z	   21 Execute	delete from words where id = 1
2020-05-04T15:21:34.344075Z	   21 Execute	delete from words where id = 10
2020-05-04T15:21:34.351728Z	   21 Reset stmt
2020-05-04T15:21:34.352101Z	   21 Execute	delete from words where id = 100
2020-05-04T15:21:34.356117Z	   21 Reset stmt
2020-05-04T15:21:34.356407Z	   21 Execute	delete from words where id = 66
```



## 翻翻源码

### jdbc conenctor

![image-20200505000534357](/image-20200505000534357.png)

prepare的时候，会先从缓存中取：

```java
// com.mysql.cj.jdbc.ConnectionImpl#prepareStatement(java.lang.String, int, int)
 @Override
    public java.sql.PreparedStatement prepareStatement(String sql, int resultSetType, int resultSetConcurrency) throws SQLException {
        synchronized (getConnectionMutex()) {
            checkClosed();

            //
            // FIXME: Create warnings if can't create results of the given type or concurrency
            //
            ClientPreparedStatement pStmt = null;

            boolean canServerPrepare = true;

            String nativeSql = this.processEscapeCodesForPrepStmts.getValue() ? nativeSQL(sql) : sql;

            if (this.useServerPrepStmts.getValue() && this.emulateUnsupportedPstmts.getValue()) {
                canServerPrepare = canHandleAsServerPreparedStatement(nativeSql);
            }

            if (this.useServerPrepStmts.getValue() && canServerPrepare) {
                if (this.cachePrepStmts.getValue()) {
                    synchronized (this.serverSideStatementCache) {
                      	// 从cache中取出来
                        pStmt = this.serverSideStatementCache.remove(new CompoundCacheKey(this.database, sql));

                        if (pStmt != null) {
                          	// 强转为ServerPreparedStatement，清理参数，直接返回
                            ((com.mysql.cj.jdbc.ServerPreparedStatement) pStmt).setClosed(false);
                            pStmt.clearParameters();
                        }

                        if (pStmt == null) {
                          	// 创建新的ServerPreparedStatement
                            try {
                                pStmt = ServerPreparedStatement.getInstance(getMultiHostSafeProxy(), nativeSql, this.database, resultSetType,
                                        resultSetConcurrency);
                                if (sql.length() < this.prepStmtCacheSqlLimit.getValue()) {
                                    ((com.mysql.cj.jdbc.ServerPreparedStatement) pStmt).isCached = true;
                                }

                                pStmt.setResultSetType(resultSetType);
                                pStmt.setResultSetConcurrency(resultSetConcurrency);
                            } catch (SQLException sqlEx) {
                                // Punt, if necessary
                                if (this.emulateUnsupportedPstmts.getValue()) {
                                    pStmt = (ClientPreparedStatement) clientPrepareStatement(nativeSql, resultSetType, resultSetConcurrency, false);

                                    if (sql.length() < this.prepStmtCacheSqlLimit.getValue()) {
                                        this.serverSideStatementCheckCache.put(sql, Boolean.FALSE);
                                    }
                                } else {
                                    throw sqlEx;
                                }
                            }
                        }
                    }
                } else {
                  	// only canServerPrepare
                    try {
                        pStmt = ServerPreparedStatement.getInstance(getMultiHostSafeProxy(), nativeSql, this.database, resultSetType, resultSetConcurrency);

                        pStmt.setResultSetType(resultSetType);
                        pStmt.setResultSetConcurrency(resultSetConcurrency);
                    } catch (SQLException sqlEx) {
                        // Punt, if necessary
                        if (this.emulateUnsupportedPstmts.getValue()) {
                            pStmt = (ClientPreparedStatement) clientPrepareStatement(nativeSql, resultSetType, resultSetConcurrency, false);
                        } else {
                            throw sqlEx;
                        }
                    }
                }
            } else {
              	// 正常流程
                pStmt = (ClientPreparedStatement) clientPrepareStatement(nativeSql, resultSetType, resultSetConcurrency, false);
            }

            return pStmt;
        }
    }
```

`ServerPreparedStatement`的继承关系

![image-20200505001544675](/image-20200505001544675.png)

statement关闭时会重新放入缓存：

```java
// com.mysql.cj.jdbc.ServerPreparedStatement#close
 @Override
public void close() throws SQLException {
  JdbcConnection locallyScopedConn = this.connection;

  if (locallyScopedConn == null) {
    return; // already closed
  }

  synchronized (locallyScopedConn.getConnectionMutex()) {

    if (this.isCached && isPoolable() && !this.isClosed) {
      clearParameters();

      this.isClosed = true;
			// 重新缓存起来
      this.connection.recachePreparedStatement(this);
      return;
    }

    this.isClosed = false;
    realClose(true, true);
  }
}

// com.mysql.cj.jdbc.ConnectionImpl#recachePreparedStatement
    @Override
    public void recachePreparedStatement(JdbcPreparedStatement pstmt) throws SQLException {
        synchronized (getConnectionMutex()) {
            if (this.cachePrepStmts.getValue() && pstmt.isPoolable()) {
                synchronized (this.serverSideStatementCache) {
                    Object oldServerPrepStmt = this.serverSideStatementCache.put(
                            new CompoundCacheKey(pstmt.getCurrentCatalog(), ((PreparedQuery<?>) pstmt.getQuery()).getOriginalSql()),
                            (ServerPreparedStatement) pstmt);
                    if (oldServerPrepStmt != null && oldServerPrepStmt != pstmt) {
                        ((ServerPreparedStatement) oldServerPrepStmt).isCached = false;
                        ((ServerPreparedStatement) oldServerPrepStmt).setClosed(false);
                        ((ServerPreparedStatement) oldServerPrepStmt).realClose(true, true);
                    }
                }
            }
        }
    }
```



### druid

druid的配置说明中，有如下的介绍，也有了一个更短的名字**PSCache**：

| 配置                                      | 缺省值 | 说明                                                         |
| ----------------------------------------- | ------ | ------------------------------------------------------------ |
| poolPreparedStatements                    | false  | 是否缓存preparedStatement，也就是**PSCache**。PSCache对支持游标的数据库性能提升巨大，比如说oracle。在mysql下建议关闭。 |
| maxPoolPreparedStatementPerConnectionSize | -1     | 要启用PSCache，必须配置大于0，当大于0时，poolPreparedStatements自动触发修改为true。在Druid中，不会存在Oracle下PSCache占用内存过多的问题，可以把这个数值配置大一些，比如说100 |

看下相关的代码：

```java
// com.alibaba.druid.pool.DruidPooledConnection#closePoolableStatement
public void closePoolableStatement(DruidPooledPreparedStatement stmt) throws SQLException {
  PreparedStatement rawStatement = stmt.getRawPreparedStatement();

  if (holder == null) {
    return;
  }

  if (stmt.isPooled()) {
    try {
      rawStatement.clearParameters();
    } catch (SQLException ex) {
      this.handleException(ex, null);
      if (rawStatement.getConnection().isClosed()) {
        return;
      }

      LOG.error("clear parameter error", ex);
    }
  }

  PreparedStatementHolder stmtHolder = stmt.getPreparedStatementHolder();
  stmtHolder.decrementInUseCount();
  // holder.isPoolPreparedStatements 对应上面配置的开关
  if (stmt.isPooled() && holder.isPoolPreparedStatements() && stmt.exceptionCount == 0) {
    // 放入缓存池子中
    holder.getStatementPool().put(stmtHolder);

    stmt.clearResultSet();
    holder.removeTrace(stmt);

    stmtHolder.setFetchRowPeak(stmt.getFetchRowPeak());
		
    stmt.setClosed(true); // soft set close
  } else if (stmt.isPooled() && holder.isPoolPreparedStatements()) {
    // the PreparedStatement threw an exception
    stmt.clearResultSet();
    holder.removeTrace(stmt);

    // 开启了PSCache但是这个stmt抛出过异常，直接从缓存中移除
    holder.getStatementPool()
      .remove(stmtHolder);
  } else {
    try {
      //Connection behind the statement may be in invalid state, which will throw a SQLException.
      //In this case, the exception is desired to be properly handled to remove the unusable connection from the pool.
      stmt.closeInternal();
    } catch (SQLException ex) {
      this.handleException(ex, null);
      throw ex;
    } finally {
      holder.getDataSource().incrementClosedPreparedStatementCount();
    }
  }
}
```

管理这个cache的最终是`com.alibaba.druid.pool.PreparedStatementPool`，内部是用的`LinkedHashMap`实现的

```java
// com.alibaba.druid.pool.PreparedStatementPool.LRUCache
public class LRUCache extends LinkedHashMap<PreparedStatementKey, PreparedStatementHolder> {

  private static final long serialVersionUID = 1L;

  public LRUCache(int maxSize){
    // 最后一个参数true，保证了是按照访问顺序存储的
    // the ordering mode - <tt>true</tt> for access-order, 
    // <tt>false</tt> for insertion-order
    super(maxSize, 0.75f, true);
  }

  protected boolean removeEldestEntry(Entry<PreparedStatementKey, PreparedStatementHolder> eldest) {
    boolean remove = (size() > dataSource.getMaxPoolPreparedStatementPerConnectionSize());

    if (remove) {
      closeRemovedStatement(eldest.getValue());
    }

    return remove;
  }
}
```

开启了druid的`poolPreparedStatements`，就不用开启jdbc的相关缓存了; 此外druid还有`sharePreparedStatements`等特性，后面可以接着研究一波。

## 其他

### bug问题

看到一些文章说，这两个参数有bug，专门查了下，大部分是connector的bug，升级即可；server端的bug很少。

![image-20200504214214243](/image-20200504214214243.png)

[聊聊一次与DeadLock的相遇](https://mp.weixin.qq.com/s?__biz=MzA3NDcyMTQyNQ==&mid=2649257737&idx=1&sn=1704e467a71e747ac66dd2588ae2c3e0&chksm=8767a6f7b0102fe146ed7185bb7e7c182f4171b7250b4ae3afeed6656f6301e127b99a8fc024&mpshare=1&scene=1&srcid=05042eGYalgiTMQDhreEiRVD&sharer_sharetime=1588528226758&sharer_shareid=56c8325ce0536d61fe7c36f461094531%23rd)

[三、mysql 报错 Unknown type '14 in column 3 of 5 in binary-encoded result set - 爱笑的berg - 博客园](https://www.cnblogs.com/jiarui-zjb/p/12635971.html)

### 是否需要开启

在[浅析MySQL JDBC连接配置上的两个误区](https://mp.weixin.qq.com/s?__biz=MzIzNjUxMzk2NQ==&mid=2247484886&idx=1&sn=2cd673f89d3add0e4b50cf8b65bcdadb&chksm=e8d7fa14dfa073024507ddce1c8eed19c175d9dcf97b3781b09ec78b4860bec1205b41b8cdbf&mpshare=1&scene=1&srcid=0504sUEKJQ0os3LxdsVFrQ9C&sharer_sharetime=1588527189589&sharer_shareid=56c8325ce0536d61fe7c36f461094531%23rd)中对这个问题，有比较好的说明:

> 综上所述，现在在使用MySQL时（如果版本比较新的话），出于性能考虑，应该在数据库连接池上开启针对PreparedStatement的缓存。如果没有使用连接池，或者所用的连接池不支持PSCache，也可以在JDBC连接上设置cachePrepStmts=true。

当然，加上这些参数之后，还是应该观察下系统的监控，看看是否性能有提升。

其中提到了``useConfigs`=maxPerformance`, 查了下官网：

```
--  maxPerformance相当于打开了
cachePrepStmts=true
cacheCallableStmts=true
cacheServerConfiguration=true
useLocalSessionState=true
elideSetAutoCommits=true
alwaysSendSetIsolation=false
enableQueryTimeouts=false
```

类似的还有：`solarisMaxPerformance`、`fullDebug`、`coldFusion`等，可以在[MySQL :: MySQL Connector/J 5.1 Developer Guide :: 5.3 Configuration Properties for Connector/J](https://dev.mysql.com/doc/connector-j/5.1/en/connector-j-reference-configuration-properties.html)找到对应的解释。



另外，HikariCP的wiki里也有一篇[MySQL Configuration · brettwooldridge/HikariCP Wiki](https://github.com/brettwooldridge/HikariCP/wiki/MySQL-Configuration), 也是建议开启。

## 参考

- [MySQL :: MySQL 5.7 Reference Manual :: 13.5 Prepared Statements](https://dev.mysql.com/doc/refman/5.7/en/sql-prepared-statements.html)
- [PreparedStatement是如何大幅度提高性能的 - it610.com](https://www.it610.com/article/4927543.htm)
- [MySQL Bugs: #24344: useServerPrepStmts impacts time zone calculations](https://bugs.mysql.com/bug.php?id=24344)
- [浅析MySQL JDBC连接配置上的两个误区](https://mp.weixin.qq.com/s?__biz=MzIzNjUxMzk2NQ==&mid=2247484886&idx=1&sn=2cd673f89d3add0e4b50cf8b65bcdadb&chksm=e8d7fa14dfa073024507ddce1c8eed19c175d9dcf97b3781b09ec78b4860bec1205b41b8cdbf&mpshare=1&scene=1&srcid=0504sUEKJQ0os3LxdsVFrQ9C&sharer_sharetime=1588527189589&sharer_shareid=56c8325ce0536d61fe7c36f461094531%23rd)
- [聊聊一次与DeadLock的相遇](https://mp.weixin.qq.com/s?__biz=MzA3NDcyMTQyNQ==&mid=2649257737&idx=1&sn=1704e467a71e747ac66dd2588ae2c3e0&chksm=8767a6f7b0102fe146ed7185bb7e7c182f4171b7250b4ae3afeed6656f6301e127b99a8fc024&mpshare=1&scene=1&srcid=05042eGYalgiTMQDhreEiRVD&sharer_sharetime=1588528226758&sharer_shareid=56c8325ce0536d61fe7c36f461094531%23rd)
- [三、mysql 报错 Unknown type '14 in column 3 of 5 in binary-encoded result set - 爱笑的berg - 博客园](https://www.cnblogs.com/jiarui-zjb/p/12635971.html)
- [预编译语句(Prepared Statements)介绍，以MySQL为例 - 活在夢裡 - 博客园](https://www.cnblogs.com/micrari/p/7112781.html)
- [MySQL :: MySQL Connector/J 5.1 Developer Guide :: 5.3 Configuration Properties for Connector/J](https://dev.mysql.com/doc/connector-j/5.1/en/connector-j-reference-configuration-properties.html)
- [DruidDataSource配置属性列表 · alibaba/druid Wiki](https://github.com/alibaba/druid/wiki/DruidDataSource%E9%85%8D%E7%BD%AE%E5%B1%9E%E6%80%A7%E5%88%97%E8%A1%A8)
- [MySQL :: MySQL Connector/J 8.0 Developer Guide :: 6.3 Configuration Properties](https://dev.mysql.com/doc/connector-j/8.0/en/connector-j-reference-configuration-properties.html)
- [MySQL Configuration · brettwooldridge/HikariCP Wiki](https://github.com/brettwooldridge/HikariCP/wiki/MySQL-Configuration)

