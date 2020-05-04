---
title: Druid连接泄露记录
tags: druid
category: druid
toc: true
typora-root-url: Druid连接泄露记录
typora-copy-images-to: Druid连接泄露记录
date: 2020-04-25 20:36:21
---



## 现象

当时数据库需要升级配置，已知中间会有闪断，按照之前的经验都是自动重连然后恢复。但是，这次tomcat的连接线程全部变成busy，导致应用不能提供服务。线程栈如下：

```bash
"http-nio-11022-exec-196" #216701 daemon prio=5 os_prio=0 tid=0x00007fbac4082000 nid=0x3c4a waiting on condition [0x00007fba0fb52000]
   java.lang.Thread.State: WAITING (parking)
	at sun.misc.Unsafe.park(Native Method)
	- parking to wait for  <0x00007fbb318710f0> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
	at java.util.concurrent.locks.LockSupport.park(LockSupport.java:175)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2039)
	at com.alibaba.druid.pool.DruidDataSource.takeLast(DruidDataSource.java:1899)
	at com.alibaba.druid.pool.DruidDataSource.getConnectionInternal(DruidDataSource.java:1460)
	at com.alibaba.druid.pool.DruidDataSource.getConnectionDirect(DruidDataSource.java:1255)
	at com.alibaba.druid.filter.FilterChainImpl.dataSource_connect(FilterChainImpl.java:5007)
	at com.alibaba.druid.filter.FilterAdapter.dataSource_getConnection(FilterAdapter.java:2745)
	at com.alibaba.druid.filter.FilterChainImpl.dataSource_connect(FilterChainImpl.java:5003)
	at com.alibaba.druid.filter.logging.LogFilter.dataSource_getConnection(LogFilter.java:876)
	at com.alibaba.druid.filter.FilterChainImpl.dataSource_connect(FilterChainImpl.java:5003)
	at com.alibaba.druid.filter.stat.StatFilter.dataSource_getConnection(StatFilter.java:680)
	at com.alibaba.druid.filter.FilterChainImpl.dataSource_connect(FilterChainImpl.java:5003)
	at com.alibaba.druid.filter.FilterAdapter.dataSource_getConnection(FilterAdapter.java:2745)
	at com.alibaba.druid.filter.FilterChainImpl.dataSource_connect(FilterChainImpl.java:5003)
	at com.alibaba.druid.filter.stat.StatFilter.dataSource_getConnection(StatFilter.java:680)
	at com.alibaba.druid.filter.FilterChainImpl.dataSource_connect(FilterChainImpl.java:5003)
	at com.alibaba.druid.filter.FilterAdapter.dataSource_getConnection(FilterAdapter.java:2745)
	at com.alibaba.druid.filter.FilterChainImpl.dataSource_connect(FilterChainImpl.java:5003)
	at com.alibaba.druid.pool.DruidDataSource.getConnection(DruidDataSource.java:1233)
	at com.alibaba.druid.pool.DruidDataSource.getConnection(DruidDataSource.java:1225)
	at com.alibaba.druid.pool.DruidDataSource.getConnection(DruidDataSource.java:90)
	at com.atour.db.DynamicDataSource.getConnection(DynamicDataSource.java:140)
	at org.springframework.jdbc.datasource.DataSourceUtils.fetchConnection(DataSourceUtils.java:151)
	at org.springframework.jdbc.datasource.DataSourceUtils.doGetConnection(DataSourceUtils.java:115)
	at org.springframework.jdbc.datasource.DataSourceUtils.getConnection(DataSourceUtils.java:78)
	at org.mybatis.spring.transaction.SpringManagedTransaction.openConnection(SpringManagedTransaction.java:82)
	at org.mybatis.spring.transaction.SpringManagedTransaction.getConnection(SpringManagedTransaction.java:68)
	at com.atour.migrate.helper.mybatis.interceptor.MyBatisMigrateChainIdKiller.checkDsIgnoreTableStatus(MyBatisMigrateChainIdKiller.java:181)
```

查看jstack的输出发现连接线程都卡在了`DruidDataSource.java:1899`， 代码如下：

```java
 DruidConnectionHolder takeLast() throws InterruptedException, SQLException {
        try {
            while (poolingCount == 0) {
                emptySignal(); // send signal to CreateThread create connection

                if (failFast && failContinuous.get()) {
                    throw new DataSourceNotAvailableException(createError);
                }

                notEmptyWaitThreadCount++;
                if (notEmptyWaitThreadCount > notEmptyWaitThreadPeak) {
                    notEmptyWaitThreadPeak = notEmptyWaitThreadCount;
                }
                try {
                  	// DruidDataSource.java:1899 卡在这里
                    notEmpty.await(); // signal by recycle or creator
                } finally {
                    notEmptyWaitThreadCount--;
                }
                notEmptyWaitCount++;

                if (!enable) {
                    connectErrorCountUpdater.incrementAndGet(this);
                    throw new DataSourceDisableException();
                }
            }
        } catch (InterruptedException ie) {
            notEmpty.signal(); // propagate to non-interrupted thread
            notEmptySignalCount++;
            throw ie;
        }

        decrementPoolingCount();
        DruidConnectionHolder last = connections[poolingCount];
        connections[poolingCount] = null;

        return last;
    }
```

等待在druid的notEmpty队里上，等待有可用的连接。找到对应的创建连接线程：

```bash
"Druid-ConnectionPool-Create-219971169" #80 daemon prio=5 os_prio=0 tid=0x00007fbab2fce000 nid=0x67e0 waiting on condition [0x00007fba2b974000]
   java.lang.Thread.State: WAITING (parking)
	at sun.misc.Unsafe.park(Native Method)
	- parking to wait for  <0x00007fbb31048098> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
	at java.util.concurrent.locks.LockSupport.park(LockSupport.java:175)
	at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2039)
	at com.alibaba.druid.pool.DruidDataSource$CreateConnectionThread.run(DruidDataSource.java:2448)

   Locked ownable synchronizers:
	- None
```

对应的代码：

```java
// 防止创建超过maxActive数量的连接
if (activeCount + poolingCount >= maxActive) {
  // DruidDataSource.java:2448
  empty.await();
  continue;
}
```

奇怪的是，创建连接的线程在等待empty的条件。问题可能就出在`activeCount + poolingCount >= maxActive`这个条件上，其他线程都在等待连接，所以`poolingCount`肯定是0（连接池里没有空闲的连接），那么有问题的肯定是`activeCount`这里了。

第一反应是`druid`的bug，去github的issue上找了好久也没有找到类似的bug，只能再深入的挖掘系统的错误日志，最终还是找到了一些端倪。最初断开连接的时候出错日志：

```bash
2020-04-09 17:32:29.321 ERROR [pms-provider-prod,cbcb523cffa38a5d,cbcb523cffa38a5d,false] --- [io-11022-exec-2] c.a.m.h.m.i.MyBatisMigrateChainIdKiller  : migrate.helper.MyBatisMigrateChainIdKillerError处理过程出现错误,

org.springframework.jdbc.CannotGetJdbcConnectionException: Failed to obtain JDBC Connection; nested exception is com.microsoft.sqlserver.jdbc.SQLServerException: SQL Server 未返回响应。连接已关闭。
	at org.springframework.jdbc.datasource.DataSourceUtils.getConnection(DataSourceUtils.java:81)
	at org.mybatis.spring.transaction.SpringManagedTransaction.openConnection(SpringManagedTransaction.java:82)
	at org.mybatis.spring.transaction.SpringManagedTransaction.getConnection(SpringManagedTransaction.java:68)
	at com.atour.migrate.helper.mybatis.interceptor.MyBatisMigrateChainIdKiller.checkDsIgnoreTableStatus(MyBatisMigrateChainIdKiller.java:181)
	...
Caused by: com.microsoft.sqlserver.jdbc.SQLServerException: SQL Server 未返回响应。连接已关闭。
	at com.microsoft.sqlserver.jdbc.SQLServerConnection.terminate(SQLServerConnection.java:1667)
	at com.microsoft.sqlserver.jdbc.SQLServerConnection.terminate(SQLServerConnection.java:1654)
	at com.microsoft.sqlserver.jdbc.TDSReader.readPacket(IOBuffer.java:4844)
	at com.microsoft.sqlserver.jdbc.TDSCommand.startResponse(IOBuffer.java:6154)
	at com.microsoft.sqlserver.jdbc.TDSCommand.startResponse(IOBuffer.java:6106)
	at com.microsoft.sqlserver.jdbc.SQLServerConnection$1ConnectionCommand.doExecute(SQLServerConnection.java:1756)
	at com.microsoft.sqlserver.jdbc.TDSCommand.execute(IOBuffer.java:5696)
	at com.microsoft.sqlserver.jdbc.SQLServerConnection.executeCommand(SQLServerConnection.java:1715)
	at com.microsoft.sqlserver.jdbc.SQLServerConnection.connectionCommand(SQLServerConnection.java:1761)
	at com.microsoft.sqlserver.jdbc.SQLServerConnection.setCatalog(SQLServerConnection.java:2063)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:750)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.proxy.jdbc.ConnectionProxyImpl.setCatalog(ConnectionProxyImpl.java:437)
	at com.alibaba.druid.pool.DruidPooledConnection.setCatalog(DruidPooledConnection.java:910)
	at com.atour.db.DynamicDataSource.getConnection(DynamicDataSource.java:143)
	at org.springframework.jdbc.datasource.DataSourceUtils.fetchConnection(DataSourceUtils.java:151)
	at org.springframework.jdbc.datasource.DataSourceUtils.doGetConnection(DataSourceUtils.java:115)
	at org.springframework.jdbc.datasource.DataSourceUtils.getConnection(DataSourceUtils.java:78)
	... 131 common frames omitted



2020-04-09 17:32:43.701 ERROR [pms-provider-prod,,,] --- [reate-219971169] com.alibaba.druid.pool.DruidDataSource   : create connection SQLException, url: jdbc:sqlserver://xxx:3433;DatabaseName=xx, errorCode 0, state 08S01

com.microsoft.sqlserver.jdbc.SQLServerException: 通过端口 1433 连接到主机 R8IC10364 的 TCP/IP 连接失败。错误:“null。请验证连接属性。确保 SQL Server 的实例正在主机上运行，且在此端口接受 TCP/IP 连接，还要确保防火墙没有阻止到此端口的 TCP 连接。”。
	at com.microsoft.sqlserver.jdbc.SQLServerException.makeFromDriverError(SQLServerException.java:190)
	at com.microsoft.sqlserver.jdbc.SQLServerException.ConvertConnectExceptionToSQLServerException(SQLServerException.java:241)
	at com.microsoft.sqlserver.jdbc.SocketFinder.findSocket(IOBuffer.java:2243)
	at com.microsoft.sqlserver.jdbc.TDSChannel.open(IOBuffer.java:491)
	at com.microsoft.sqlserver.jdbc.SQLServerConnection.connectHelper(SQLServerConnection.java:1309)
	


2020-04-09 17:33:09.338 ERROR [pms-provider-prod,69497e80a3d973de,69497e80a3d973de,false] --- [io-11022-exec-9] c.a.m.h.m.i.MyBatisMigrateChainIdKiller  : migrate.helper.MyBatisMigrateChainIdKillerError处理过程出现错误,

org.springframework.jdbc.CannotGetJdbcConnectionException: Failed to obtain JDBC Connection; nested exception is com.microsoft.sqlserver.jdbc.SQLServerException: Database 'xxx' cannot be opened. It is in the middle of a restore.
	at org.springframework.jdbc.datasource.DataSourceUtils.getConnection(DataSourceUtils.java:81)
	at org.mybatis.spring.transaction.SpringManagedTransaction.openConnection(SpringManagedTransaction.java:82)
	...
Caused by: com.microsoft.sqlserver.jdbc.SQLServerException: Database 'xxxx' cannot be opened. It is in the middle of a restore.
	at com.microsoft.sqlserver.jdbc.SQLServerException.makeFromDatabaseError(SQLServerException.java:216)
	at com.microsoft.sqlserver.jdbc.TDSTokenHandler.onEOF(tdsparser.java:254)
	at com.microsoft.sqlserver.jdbc.TDSParser.parse(tdsparser.java:84)
	at com.microsoft.sqlserver.jdbc.TDSParser.parse(tdsparser.java:39)
	at com.microsoft.sqlserver.jdbc.SQLServerConnection$1ConnectionCommand.doExecute(SQLServerConnection.java:1756)
	at com.microsoft.sqlserver.jdbc.TDSCommand.execute(IOBuffer.java:5696)
	at com.microsoft.sqlserver.jdbc.SQLServerConnection.executeCommand(SQLServerConnection.java:1715)
	at com.microsoft.sqlserver.jdbc.SQLServerConnection.connectionCommand(SQLServerConnection.java:1761)
	at com.microsoft.sqlserver.jdbc.SQLServerConnection.setCatalog(SQLServerConnection.java:2063)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:750)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.filter.FilterAdapter.connection_setCatalog(FilterAdapter.java:991)
	at com.alibaba.druid.filter.FilterChainImpl.connection_setCatalog(FilterChainImpl.java:745)
	at com.alibaba.druid.proxy.jdbc.ConnectionProxyImpl.setCatalog(ConnectionProxyImpl.java:437)
	at com.alibaba.druid.pool.DruidPooledConnection.setCatalog(DruidPooledConnection.java:910)
	at com.atour.db.DynamicDataSource.getConnection(DynamicDataSource.java:143)
	at org.springframework.jdbc.datasource.DataSourceUtils.fetchConnection(DataSourceUtils.java:151)
	at org.springframework.jdbc.datasource.DataSourceUtils.doGetConnection(DataSourceUtils.java:115)
	at org.springframework.jdbc.datasource.DataSourceUtils.getConnection(DataSourceUtils.java:78)
  ... 131 common frames omitted
```

异常栈中关键的代码：

```java
    @Override
    public Connection getConnection() throws SQLException {
    	Connection connection = this.determineTargetDataSource().getConnection();
    	if(dynamicInstance) {
    		/**数据源创建到实例维度，获取连接之前设置数据库名*/
        // 这里setCatalog抛出了异常
    		connection.setCatalog(databaseNameMap.get(DynamicDataSourceHolder.getDataSouce()));
    	}
        return connection;
    }
```

首先druid的配置没有设置`testOnBorrow`，拿到连接之后没有校验连接的有效性；

其次，由于分库太多（实例没有那么多），公司开发了中间件，动态切换数据库（就是上面的代码，一个druid实例默认就有一个Create线程和Destroy线程，有上百分库的时候，开销就相当大）。

**连接池的变化**

数据库刚开始断开的时候，业务线程拿到连接之后，执行`setCatalog`操作，此时会失败，然后没有catch关闭对应的数据库连接，就会占用druid的一个active count；

中间有创建连接Druid-ConnectionPool-C`reate-219971169`， 尝试创建，然后失败了。

后续数据库应该可以连上了，但是切换分库会有问题，也会占用druid的一个active count；

最终active count 会被占满，然后就无法创建连接，业务线程和连接创建线程都会一直等待。



## 改进

- 必须设置获取连接的等待时间（maxWait) 和最大等待线程个数（maxWaitThreadCount）。

- 操作连接的时候，一定要在异常的情况下关闭连接，不要造成连接的泄露
- 可以设置druid的
  - `removeAbandoned` （是否强制关闭连接时长大于removeAbandonedTimeoutMillis的连接）
  - `removeAbandonedTimeoutMillis` （一个连接从被连接到被关闭之间的最大生命周期）
  - `logAbandoned` （强制关闭连接时是否记录日志）



