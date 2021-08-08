---
title: keepalive
tags: keepalive
category: http
toc: true
typora-root-url: keepalive
typora-copy-images-to: keepalive
date: 2021-03-29 16:02:45
---



## TCP keep alive

TCP协议栈的`keepalive`，连接空闲一定时间后，会进行保活探测

```bash
[qisheng.li@YD-order-center-01 ~]$ sudo sysctl -a | grep keep
net.ipv4.tcp_keepalive_intvl = 75
net.ipv4.tcp_keepalive_probes = 9
net.ipv4.tcp_keepalive_time = 7200
```

- tcp_keepalive_time

  the interval between the last data packet sent (simple ACKs are not considered data) and the first keepalive probe; after the connection is marked to need keepalive, this counter is not used any further

  连接空闲`tcp_keepalive_time`这么久之后，系统协议栈会认为连接需要保活

- tcp_keepalive_intvl

  the interval between subsequential keepalive probes, regardless of what the connection has exchanged in the meantime

  两次探测的间隔

- tcp_keepalive_probes

  the number of unacknowledged probes to send before considering the connection dead and notifying the application layer

  探测次数

  ![TCP Timers Chia-tai Tsai Introduction The 7 Timers for each Connection  Connection-Establishment Timer Establish a new connection. - ppt download](/slide_16.jpg)

## HTTP keep alive

从HTTP/1.1之后默认就使用keepalive了，http请求之后，连接不会关闭。这里只是实现了**连接的复用**，但是**并没有保活相关的逻辑**。

主要是通过header中的`Connection: Keep-Alive`来实现连接的复用的，http/1.1之后默认就是keepalive，除非显式地声明为close。


> parameters
>
> A comma-separated list of parameters, each consisting of an identifier and a value separated by the equal sign (`'='`). The following identifiers are possible:
>
> - `timeout`: indicating the *minimum* amount of time an idle connection has to be kept opened (in seconds). Note that timeouts longer than the TCP timeout may be ignored if no keep-alive TCP message is set at the transport level.
> - `max`: indicating the maximum number of requests that can be sent on this connection before closing it. Unless `0`, this value is ignored for non-pipelined connections as another request will be sent in the next response. An HTTP pipeline can use it to limit the pipelining.

返回示例：

```bash
HTTP/1.1 200 OK
Connection: Keep-Alive
Content-Encoding: gzip
Content-Type: text/html; charset=utf-8
Date: Thu, 11 Aug 2016 15:23:13 GMT
Keep-Alive: timeout=5, max=1000
Last-Modified: Mon, 25 Jul 2016 04:32:39 GMT
Server: Apache

(body)
```

### 浏览器

> 那么 TCP 连接在发送后将仍然保持打开状态，**这样浏览器就可以继续通过同一个 TCP 连接发送请求**。保持 TCP 连接可以省去下次请求时需要建立连接的时间，提升资源加载速度。比如，一个 Web 页面中内嵌的图片就都来自同一个 Web 站点，如果初始化了一个持久连接，你就可以复用该连接，以请求其他资源，而不需要重新再建立新的 TCP 连接。

### Nginx

```bash
http {
    upstream  BACKEND {
        server   192.168.0.1：8080  weight=1 max_fails=2 fail_timeout=30s;
        server   192.168.0.2：8080  weight=1 max_fails=2 fail_timeout=30s;

        keepalive 300;        // 这个很重要！
    }

    server {
        listen 8080 default_server;
        server_name "";

        location /  {
            proxy_pass http://BACKEND;
            proxy_set_header Host  $Host;
            proxy_set_header x-forwarded-for $remote_addr;
            proxy_set_header X-Real-IP $remote_addr;
            add_header Cache-Control no-store;
            add_header Pragma  no-cache;

            proxy_http_version 1.1;                    // 这两个最好也设置
            proxy_set_header Connection "";

            client_max_body_size  3072k;
            client_body_buffer_size 128k;
        }
    }
}
```

> 默认情况下，nginx已经自动开启了对client连接的keep alive支持。一般场景可以直接使用，但是对于一些比较特殊的场景，还是有必要调整个别参数。
>
> 需要修改nginx的配置文件(在nginx安装目录下的conf/nginx.conf):
>
> ```
> http {
>     keepalive_timeout  120s 120s; // 默认75s
>     keepalive_requests 10000; // 默认是100
> }
> ```

- keepalive_timeout

  > 第一个参数设置keep-alive客户端连接在服务器端保持开启的超时值。值为0会禁用keep-alive客户端连接。可选的第二个参数在响应的header域中设置一个值“Keep-Alive: timeout=time”。这两个参数可以不一样。

- keepalive_requests

  > keepalive_requests指令用于设置一个keep-alive连接上可以服务的请求的最大数量。当最大请求数量达到时，连接被关闭。默认是100。

-  keepalive

   > The `*connections*` parameter sets the **maximum number of idle keepalive connections** to upstream servers that are preserved in the cache of **each worker process**. When this number is exceeded, **the least recently used connections are closed**.

   类似`maxIdle`

### Tomcat
| 配置名称 | 备注 |
| ---------------------- | ------------------------------------------------------------ |
| `keepAliveTimeout`     | The number of milliseconds this Connector will **wait for another HTTP request before closing the connection**. The default value is to use the value that has been set for the connectionTimeout attribute. Use a value of -1 to indicate no (i.e. infinite) timeout. |
| `maxKeepAliveRequests` | The maximum number of HTTP requests which **can be pipelined** until the connection is closed by the server. Setting this attribute to 1 will disable HTTP/1.0 keep-alive, as well as HTTP/1.1 keep-alive and pipelining. Setting this to -1 will allow an unlimited amount of pipelined or keep-alive HTTP requests. If not specified, this attribute is set to 100. |

### HttpClient

apache的httpclient也没有保活的机制，连接的复用依赖于HTTP协议中的`keep-alive`。HttpClient中有定时的任务，去清理过期和空闲的连接。

```java
/**
     * Closes connections that have been idle longer than the given period
     * of time and evicts them from the pool.
     *
     * @param idletime maximum idle time.
     * @param tunit time unit.
     */
// org.apache.http.pool.AbstractConnPool#closeIdle
public void closeIdle(final long idletime, final TimeUnit tunit) {
  Args.notNull(tunit, "Time unit");
  long time = tunit.toMillis(idletime);
  if (time < 0) {
    time = 0;
  }
  final long deadline = System.currentTimeMillis() - time;
  enumAvailable(new PoolEntryCallback<T, C>() {

    @Override
    public void process(final PoolEntry<T, C> entry) {
      // 空闲超过idleTime的，给关闭掉
      if (entry.getUpdated() <= deadline) {
        entry.close();
      }
    }
  });
}


/**
     * Closes expired connections and evicts them from the pool.
     */
// org.apache.http.pool.AbstractConnPool#closeExpired
public void closeExpired() {
  final long now = System.currentTimeMillis();
  enumAvailable(new PoolEntryCallback<T, C>() {

    @Override
    public void process(final PoolEntry<T, C> entry) {
      // 过期的，Keep-Alive: timeout=5, max=1000
      if (entry.isExpired(now)) {
        entry.close();
      }
    }

  });
}


/**
     * Enumerates all available connections.
     *
     * @since 4.3
     */
// org.apache.http.pool.AbstractConnPool#enumAvailable
protected void enumAvailable(final PoolEntryCallback<T, C> callback) {
  this.lock.lock();
  try {
    final Iterator<E> it = this.available.iterator();
    while (it.hasNext()) {
      final E entry = it.next();
      callback.process(entry);
      if (entry.isClosed()) {
        final RouteSpecificPool<T, C, E> pool = getPool(entry.getRoute());
        pool.remove(entry);
        it.remove();
      }
    }
    purgePoolMap();
  } finally {
    this.lock.unlock();
  }
}
```

归还连接时，根据response header中的来判断是否可以复用：

```java
// org.apache.http.impl.execchain.MinimalClientExec#execute
// The connection is in or can be brought to a re-usable state.
if (reuseStrategy.keepAlive(response, context)) {
  // Set the idle duration of this connection
  final long duration = keepAliveStrategy.getKeepAliveDuration(response, context);
  // 连接有效期
  releaseTrigger.setValidFor(duration, TimeUnit.MILLISECONDS);
  // 标记为可以复用
  releaseTrigger.markReusable();
} else {
  releaseTrigger.markNonReusable();
}


// org.apache.http.impl.conn.PoolingHttpClientConnectionManager#releaseConnection
public void releaseConnection(
  final HttpClientConnection managedConn,
  final Object state,
  final long keepalive, final TimeUnit tunit) {
  Args.notNull(managedConn, "Managed connection");
  synchronized (managedConn) {
    final CPoolEntry entry = CPoolProxy.detach(managedConn);
    if (entry == null) {
      return;
    }
    final ManagedHttpClientConnection conn = entry.getConnection();
    try {
      if (conn.isOpen()) {
        entry.setState(state);
        // 设置对象的过期时间
        entry.updateExpiry(keepalive, tunit != null ? tunit : TimeUnit.MILLISECONDS);
        // debug 日志
        if (this.log.isDebugEnabled()) {
          final String s;
          if (keepalive > 0) {
            s = "for " + (double) keepalive / 1000 + " seconds";
          } else {
            s = "indefinitely";
          }
          this.log.debug("Connection " + format(entry) + " can be kept alive " + s);
        }
      }
    } finally {
      this.pool.release(entry, conn.isOpen() && entry.isRouteComplete());
      if (this.log.isDebugEnabled()) {
        this.log.debug("Connection released: " + format(entry) + formatStats(entry.getRoute()));
      }
    }
  }
}
```

#### ConnectionKeepAliveStrategy

```java
// org.apache.http.conn.ConnectionKeepAliveStrategy
public interface ConnectionKeepAliveStrategy {

  /**
     * Returns the duration of time which this connection can be safely kept
     * idle. If the connection is left idle for longer than this period of time,
     * it MUST not reused. A value of 0 or less may be returned to indicate that
     * there is no suitable suggestion.
     *
     * When coupled with a {@link org.apache.http.ConnectionReuseStrategy}, if
     * {@link org.apache.http.ConnectionReuseStrategy#keepAlive(
     *   HttpResponse, HttpContext)} returns true, this allows you to control
     * how long the reuse will last. If keepAlive returns false, this should
     * have no meaningful impact
     *
     * @param response
     *            The last response received over the connection.
     * @param context
     *            the context in which the connection is being used.
     *
     * @return the duration in ms for which it is safe to keep the connection
     *         idle, or <=0 if no suggested duration.
     */
  long getKeepAliveDuration(HttpResponse response, HttpContext context);

}
```

默认实现：

```java
// org.apache.http.impl.client.DefaultConnectionKeepAliveStrategy
@Immutable
public class DefaultConnectionKeepAliveStrategy implements ConnectionKeepAliveStrategy {

    public static final DefaultConnectionKeepAliveStrategy INSTANCE = new DefaultConnectionKeepAliveStrategy();

    public long getKeepAliveDuration(final HttpResponse response, final HttpContext context) {
        Args.notNull(response, "HTTP response");
      	// header中的Keep-Alive
        final HeaderElementIterator it = new BasicHeaderElementIterator(
                response.headerIterator(HTTP.CONN_KEEP_ALIVE));
        while (it.hasNext()) {
            final HeaderElement he = it.nextElement();
            final String param = he.getName();
            final String value = he.getValue();
            if (value != null && param.equalsIgnoreCase("timeout")) {
                try {
                  	// 解析timeout的值
                    return Long.parseLong(value) * 1000;
                } catch(final NumberFormatException ignore) {
                }
            }
        }
        return -1;
    }

}
```

#### ConnectionReuseStrategy

```java
// org.apache.http.ConnectionReuseStrategy
public interface ConnectionReuseStrategy {

    /**
     * Decides whether a connection can be kept open after a request.
     * If this method returns <code>false</code>, the caller MUST
     * close the connection to correctly comply with the HTTP protocol.
     * If it returns <code>true</code>, the caller SHOULD attempt to
     * keep the connection open for reuse with another request.
     * <br/>
     * One can use the HTTP context to retrieve additional objects that
     * may be relevant for the keep-alive strategy: the actual HTTP
     * connection, the original HTTP request, target host if known,
     * number of times the connection has been reused already and so on.
     * <br/>
     * If the connection is already closed, <code>false</code> is returned.
     * The stale connection check MUST NOT be triggered by a
     * connection reuse strategy.
     *
     * @param response
     *          The last response received over that connection.
     * @param context   the context in which the connection is being
     *          used.
     *
     * @return <code>true</code> if the connection is allowed to be reused, or
     *         <code>false</code> if it MUST NOT be reused
     */
    boolean keepAlive(HttpResponse response, HttpContext context);

}
```

默认实现：

```java
// org.apache.http.impl.DefaultConnectionReuseStrategy
// see interface ConnectionReuseStrategy
public boolean keepAlive(final HttpResponse response,
                         final HttpContext context) {
  Args.notNull(response, "HTTP response");
  Args.notNull(context, "HTTP context");

  // Check for a self-terminating entity. If the end of the entity will
  // be indicated by closing the connection, there is no keep-alive.
  final ProtocolVersion ver = response.getStatusLine().getProtocolVersion();
  final Header teh = response.getFirstHeader(HTTP.TRANSFER_ENCODING);
  if (teh != null) {
    // 有Transfer-Encoding，但是值不是chunked的，不可复用
    // 看上面的注释是因为，有些encoding会以连接关闭来标识entity结束
    if (!HTTP.CHUNK_CODING.equalsIgnoreCase(teh.getValue())) {
      return false;
    }
  } else {
    // 有response body，但是content-length不合法的也应该关闭
    // 这是RFC中规定的
    if (canResponseHaveBody(response)) {
      final Header[] clhs = response.getHeaders(HTTP.CONTENT_LEN);
      // Do not reuse if not properly content-length delimited
      if (clhs.length == 1) {
        final Header clh = clhs[0];
        try {
          final int contentLen = Integer.parseInt(clh.getValue());
          if (contentLen < 0) {
            return false;
          }
        } catch (final NumberFormatException ex) {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  // Check for the "Connection" header. If that is absent, check for
  // the "Proxy-Connection" header. The latter is an unspecified and
  // broken but unfortunately common extension of HTTP.
  // header中的Connection
  HeaderIterator hit = response.headerIterator(HTTP.CONN_DIRECTIVE);
  if (!hit.hasNext()) {
    hit = response.headerIterator("Proxy-Connection");
  }

  // Experimental usage of the "Connection" header in HTTP/1.0 is
  // documented in RFC 2068, section 19.7.1. A token "keep-alive" is
  // used to indicate that the connection should be persistent.
  // Note that the final specification of HTTP/1.1 in RFC 2616 does not
  // include this information. Neither is the "Connection" header
  // mentioned in RFC 1945, which informally describes HTTP/1.0.
  //
  // RFC 2616 specifies "close" as the only connection token with a
  // specific meaning: it disables persistent connections.
  //
  // The "Proxy-Connection" header is not formally specified anywhere,
  // but is commonly used to carry one token, "close" or "keep-alive".
  // The "Connection" header, on the other hand, is defined as a
  // sequence of tokens, where each token is a header name, and the
  // token "close" has the above-mentioned additional meaning.
  //
  // To get through this mess, we treat the "Proxy-Connection" header
  // in exactly the same way as the "Connection" header, but only if
  // the latter is missing. We scan the sequence of tokens for both
  // "close" and "keep-alive". As "close" is specified by RFC 2068,
  // it takes precedence and indicates a non-persistent connection.
  // If there is no "close" but a "keep-alive", we take the hint.

  if (hit.hasNext()) {
    try {
      final TokenIterator ti = createTokenIterator(hit);
      boolean keepalive = false;
      while (ti.hasNext()) {
        final String token = ti.nextToken();
        if (HTTP.CONN_CLOSE.equalsIgnoreCase(token)) {
          // 如果是Connection: close，是不能复用的
          return false;
        } else if (HTTP.CONN_KEEP_ALIVE.equalsIgnoreCase(token)) {
          // continue the loop, there may be a "close" afterwards
          // Connection: Keep-Alive
          keepalive = true;
        }
      }
      if (keepalive)
      {
        return true;
        // neither "close" nor "keep-alive", use default policy
      }

    } catch (final ParseException px) {
      // invalid connection header means no persistent connection
      // we don't have logging in HttpCore, so the exception is lost
      return false;
    }
  }
	
  // HTTP/1.1之后，默认都是可以keepalive的
  // default since HTTP/1.1 is persistent, before it was non-persistent
  return !ver.lessEquals(HttpVersion.HTTP_1_0);
}
```




## 应用层



### Dubbo

```java
// org.apache.dubbo.remoting.exchange.support.header.HeartbeatTimerTask#doTask
@Override
protected void doTask(Channel channel) {
  try {
    Long lastRead = lastRead(channel);
    Long lastWrite = lastWrite(channel);
    if ((lastRead != null && now() - lastRead > heartbeat)
        || (lastWrite != null && now() - lastWrite > heartbeat)) {
      Request req = new Request();
      req.setVersion(Version.getProtocolVersion());
      req.setTwoWay(true);
      req.setEvent(HEARTBEAT_EVENT);
      channel.send(req);
      if (logger.isDebugEnabled()) {
        logger.debug("Send heartbeat to remote channel " + channel.getRemoteAddress()
                     + ", cause: The channel has no data-transmission exceeds a heartbeat period: "
                     + heartbeat + "ms");
      }
    }
  } catch (Throwable t) {
    logger.warn("Exception when heartbeat to remote channel " + channel.getRemoteAddress(), t);
  }
}
```



### Druid

> 在Druid-1.0.27之前的版本，DruidDataSource建议使用TestWhileIdle来保证连接的有效性，但仍有很多场景需要对连接进行保活处理。在1.0.28版本之后，新加入keepAlive配置，缺省关闭。
>
> 使用keepAlive功能，建议使用最新版本，比如1.1.21或者更高版本

### Hikari CP

> ⏳`keepaliveTime`
> This property controls how frequently HikariCP will attempt to keep a connection alive, in order to **prevent it from being timed out by the database or network infrastructure**. This value **must be less than the `maxLifetime` value**. A "keepalive" will only occur on an idle connection. When the time arrives for a "keepalive" against a given connection, that connection will be removed from the pool, "pinged", and then returned to the pool. The 'ping' is one of either: invocation of the JDBC4 `isValid()` method, or execution of the `connectionTestQuery`. Typically, the duration out-of-the-pool should be measured in single digit milliseconds or even sub-millisecond, and therefore should have little or no noticible performance impact. The minimum allowed value is 30000ms (30 seconds), but a value in the range of minutes is most desirable. *Default: 0 (disabled)*

> ⏳`idleTimeout`
> This property controls the maximum amount of time that a connection is allowed to sit idle in the pool. **This setting only applies when `minimumIdle` is defined to be less than `maximumPoolSize`.** Idle connections will *not* be retired once the pool reaches `minimumIdle` connections. Whether a connection is retired as idle or not is subject to a maximum variation of +30 seconds, and average variation of +15 seconds. A connection will never be retired as idle *before* this timeout. A value of 0 means that idle connections are never removed from the pool. The minimum allowed value is 10000ms (10 seconds). *Default: 600000 (10 minutes)*



## 参考

- [03 | HTTP请求流程：为什么很多站点第二次打开速度会很快？](https://time.geekbang.org/column/article/116588)
- [brettwooldridge/HikariCP: 光 HikariCP・A solid, high-performance, JDBC connection pool at last.](https://github.com/brettwooldridge/HikariCP)
- [KeepAlive_cn · alibaba/druid Wiki](https://github.com/alibaba/druid/wiki/KeepAlive_cn)
- [Keep-Alive - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Keep-Alive)
- [Using TCP keepalive under Linux](https://tldp.org/HOWTO/TCP-Keepalive-HOWTO/usingkeepalive.html)
- [TCP Timers Chia-tai Tsai Introduction The 7 Timers for each Connection Connection-Establishment Timer Establish a new connection. - ppt download](https://slideplayer.com/slide/7378740/)
- [Using NGINX as an Accelerating Proxy for HTTP Servers](https://www.nginx.com/blog/http-keepalives-and-web-performance/)
- [Dubbo分析之心跳设计 - ksfzhaohui的个人页面 - OSCHINA - 中文开源技术交流社区](https://my.oschina.net/OutOfMemory/blog/4272077)
- [聊聊 TCP 长连接和心跳那些事 | 徐靖峰|个人博客](https://www.cnkirito.moe/tcp-talk/)
- [长连接 · Nginx 学习笔记](https://skyao.gitbooks.io/learning-nginx/content/documentation/keep_alive.html)
- [Module ngx_http_upstream_module](http://nginx.org/en/docs/http/ngx_http_upstream_module.html#:~:text=The%20connections%20parameter%20sets%20the,recently%20used%20connections%20are%20closed.)
- [NGINX + TOMCAT出现大量的TIME-WAIT状态的TCP连接解决 - 小海bug的个人空间 - OSCHINA - 中文开源技术交流社区](https://my.oschina.net/haitaohu/blog/3043113)
- [Apache Tomcat 8 Configuration Reference (8.5.64) - The HTTP Connector](https://tomcat.apache.org/tomcat-8.5-doc/config/http.html)

