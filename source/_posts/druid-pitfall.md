---
title: druid踩坑记录
tags: pitfall mysql-connector-java 8.x
category: druid
toc: true
typora-root-url: druid-pitfall
typora-copy-images-to: druid-pitfall
date: 2020-08-04 16:16:21
---





### Druid配置踩坑记录

我用的druid版本 `1.1.10`

#### maxWait和公平锁

设置maxWait之后，druid默认开启了公平锁，公平锁对性能影响比较大。

可以看下有赞的压测结论：

![640](/640.png)

![image-20200804160210813](/image-20200804160210813.png)

使用非公平锁性能可以提升70%，但是会导致有些连接的饥饿问题，这个需要自己权衡下。

#### testOnBorrow、testWhileIdle、testOnReturn和mysql-connector-java 8.x+

这个都是在不同的节点validate连接是否有效的，都会走到同一处逻辑：

```java
// com.alibaba.druid.pool.DruidAbstractDataSource#testConnectionInternal(com.alibaba.druid.pool.DruidConnectionHolder, java.sql.Connection)
if (valid && isMySql) { // unexcepted branch
  // 问题出在这里
  long lastPacketReceivedTimeMs = MySqlUtils.getLastPacketReceivedTimeMs(conn);
  if (lastPacketReceivedTimeMs > 0) {
    long mysqlIdleMillis = currentTimeMillis - lastPacketReceivedTimeMs;
    if (lastPacketReceivedTimeMs > 0 //
        && mysqlIdleMillis >= timeBetweenEvictionRunsMillis) {
      discardConnection(conn);
      String errorMsg = "discard long time none received connection. "
        + ", jdbcUrl : " + jdbcUrl
        + ", jdbcUrl : " + jdbcUrl
        + ", lastPacketReceivedIdleMillis : " + mysqlIdleMillis;
      LOG.error(errorMsg);
      return false;
    }
  }
}

// com.alibaba.druid.util.MySqlUtils#getLastPacketReceivedTimeMs
if (class_connectionImpl == null && !class_connectionImpl_Error) {
  try {
    // 这个类在8.x里面没有，但是loadClass内部catch住了ClassNotFoundException, 而且ignore了
    // 所以上面的if，会一直成立，每次都会触发这个类的加载
    class_connectionImpl = Utils.loadClass("com.mysql.jdbc.MySQLConnection");
  } catch (Throwable error){
    class_connectionImpl_Error = true;
  }
}


// com.alibaba.druid.util.Utils#loadClass
public static Class<?> loadClass(String className) {
        Class<?> clazz = null;

        if (className == null) {
            return null;
        }

        try {
            return Class.forName(className);
        } catch (ClassNotFoundException e) {
          	// 这里忽略了。。。
            // skip
        }

        ClassLoader ctxClassLoader = Thread.currentThread().getContextClassLoader();
        if (ctxClassLoader != null) {
            try {
                clazz = ctxClassLoader.loadClass(className);
            } catch (ClassNotFoundException e) {
                // skip
            }
        }

        return clazz;
    }
```

我们的应用设置了testWhileIdle, 所以时不时的会有tomcat的thread busy:

```bash
"query-order-async-task-15" Id=663 BLOCKED
	at org.apache.catalina.loader.WebappClassLoaderBase.loadClass(WebappClassLoaderBase.java:1152)
	at org.apache.catalina.loader.WebappClassLoaderBase.loadClass(WebappClassLoaderBase.java:1119)
	at java.lang.Class.forName0(Native Method)
	at java.lang.Class.forName(Class.java:264)
	at com.alibaba.druid.util.Utils.loadClass(Utils.java:203)
	at com.alibaba.druid.util.MySqlUtils.getLastPacketReceivedTimeMs(MySqlUtils.java:351)
--
"http-nio-9301-exec-103" Id=567 BLOCKED
	at org.apache.catalina.loader.WebappClassLoaderBase.loadClass(WebappClassLoaderBase.java:1152)
	at org.apache.catalina.loader.WebappClassLoaderBase.loadClass(WebappClassLoaderBase.java:1119)
	at java.lang.Class.forName0(Native Method)
	at java.lang.Class.forName(Class.java:264)
	at com.alibaba.druid.util.Utils.loadClass(Utils.java:203)
	at com.alibaba.druid.util.MySqlUtils.getLastPacketReceivedTimeMs(MySqlUtils.java:351)
--
"http-nio-9301-exec-124" Id=863 BLOCKED
	at org.apache.catalina.loader.WebappClassLoaderBase.loadClass(WebappClassLoaderBase.java:1152)
	at org.apache.catalina.loader.WebappClassLoaderBase.loadClass(WebappClassLoaderBase.java:1119)
	at java.lang.Class.forName0(Native Method)
	at java.lang.Class.forName(Class.java:264)
	at com.alibaba.druid.util.Utils.loadClass(Utils.java:203)
	at com.alibaba.druid.util.MySqlUtils.getLastPacketReceivedTimeMs(MySqlUtils.java:351)
--
"query-order-async-task-0" Id=641 BLOCKED
	at org.apache.catalina.loader.WebappClassLoaderBase.loadClass(WebappClassLoaderBase.java:1152)
	at org.apache.catalina.loader.WebappClassLoaderBase.loadClass(WebappClassLoaderBase.java:1119)
	at java.lang.Class.forName0(Native Method)
	at java.lang.Class.forName(Class.java:264)
	at com.alibaba.druid.util.Utils.loadClass(Utils.java:203)
	at com.alibaba.druid.util.MySqlUtils.getLastPacketReceivedTimeMs(MySqlUtils.java:351)
```



### 参考

1. [有赞DB连接池性能优化](https://mp.weixin.qq.com/s/RaiU9_ioWHvomZLLKuSuGw)
2. [Druid锁的公平模式问题 · alibaba/druid Wiki](https://github.com/alibaba/druid/wiki/Druid%E9%94%81%E7%9A%84%E5%85%AC%E5%B9%B3%E6%A8%A1%E5%BC%8F%E9%97%AE%E9%A2%98)
3. [alibaba/druid pool analysis · Issue #232 · brettwooldridge/HikariCP](https://github.com/brettwooldridge/HikariCP/issues/232)
4. [com.alibaba:druid:1.1.20 MysqlUtils写死了mysql-connector-java 5.1版本的MySQLConnection类加载，导致线程阻塞，性能受限 · Issue #3808 · alibaba/druid](https://github.com/alibaba/druid/issues/3808)

