---
title: 异步Servlet使用和原理解析
toc: true
tags: servlet
category: spring
---

并发，qps

        QPS（TPS）：每秒钟request/事务 数量

        并发数： 系统同时处理的request/事务数

        响应时间：  一般取平均响应时间

        QPS（TPS）= 并发数/平均响应时间

        串行处理和并行处理，qps

## 测试

限定 tomcat的连接池个数为50，并发为200（>> 线程池大小），时异步具有很大的优势。

如果并发量小于线程池大小，异步的反倒比同步的时间长了很久。

```xml
<Connector port="8080" protocol="HTTP/1.1"
            maxThreads="50"
            connectionTimeout="20000"
            redirectPort="8443" URIEncoding="UTF-8"/>
```

### async ab测试

```
$ ab -n 10000 -c 200 http://localhost:8080/async
This is ApacheBench, Version 2.3 <$Revision: 655654 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking localhost (be patient)
Completed 1000 requests
Completed 2000 requests
Completed 3000 requests
Completed 4000 requests
Completed 5000 requests
Completed 6000 requests
Completed 7000 requests
Completed 8000 requests
Completed 9000 requests
Completed 10000 requests
Finished 10000 requests


Server Software:        Apache-Coyote/1.1
Server Hostname:        localhost
Server Port:            8080

Document Path:          /async
Document Length:        40 bytes

Concurrency Level:      200
Time taken for tests:   1000.284 seconds
Complete requests:      10000
Failed requests:        47
   (Connect: 0, Receive: 0, Length: 47, Exceptions: 0)
Write errors:           0
Non-2xx responses:      47
Total transferred:      1530740 bytes
HTML transferred:       506980 bytes
Requests per second:    10.00 [#/sec] (mean)
Time per request:       20005.686 [ms] (mean)
Time per request:       100.028 [ms] (mean, across all concurrent requests)
Transfer rate:          1.49 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   5.0      0     501
Processing:     2 19810 1683.3  20001   20560
Waiting:        1 19810 1683.4  20000   20558
Total:          2 19811 1683.0  20001   20560

Percentage of the requests served within a certain time (ms)
  50%  20001
  66%  20001
  75%  20002
  80%  20002
  90%  20004
  95%  20009
  98%  20020
  99%  20035
 100%  20560 (longest request)
```

测试过程中出的异常：

```
一月 21, 2017 1:05:32 上午 org.apache.catalina.core.StandardWrapperValve invoke
严重: Servlet.service() for servlet [com.air.async.AsyncServlet] in context with path [] threw exception
java.util.concurrent.RejectedExecutionException: Task com.air.async.AsyncRequestProcessor@3caec762 rejected from java.util.concurrent.ThreadPoolExecutor@64db0f23[Running, pool size = 100, active threads = 100, queued tasks = 100, completed tasks = 9726]
  at java.util.concurrent.ThreadPoolExecutor$AbortPolicy.rejectedExecution(ThreadPoolExecutor.java:2048)
  at java.util.concurrent.ThreadPoolExecutor.reject(ThreadPoolExecutor.java:821)
  at java.util.concurrent.ThreadPoolExecutor.execute(ThreadPoolExecutor.java:1372)
  at com.air.async.AsyncServlet.doGet(AsyncServlet.java:25)
  at javax.servlet.http.HttpServlet.service(HttpServlet.java:621)
  at javax.servlet.http.HttpServlet.service(HttpServlet.java:728)
  at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:305)
  at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:210)
  at org.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:51)
  at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:243)
  at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:210)
  at org.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:222)
  at org.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:123)
  at org.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:502)
  at org.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:171)
  at org.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:100)
  at org.apache.catalina.valves.AccessLogValve.invoke(AccessLogValve.java:953)
  at org.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:118)
  at org.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:408)
  at org.apache.coyote.http11.AbstractHttp11Processor.process(AbstractHttp11Processor.java:1041)
  at org.apache.coyote.AbstractProtocol$AbstractConnectionHandler.process(AbstractProtocol.java:603)
  at org.apache.tomcat.util.net.AprEndpoint$SocketProcessor.doRun(AprEndpoint.java:2430)
  at org.apache.tomcat.util.net.AprEndpoint$SocketProcessor.run(AprEndpoint.java:2419)
  at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1145)
  at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:615)
  at java.lang.Thread.run(Thread.java:745)
```

有47个失败的case，是队列满了，然后丢掉了请求。

tomcat的请求队列？？？？

#### sync ab测试

```
$ ab -n 10000 -c 200 http://localhost:8080/hello
This is ApacheBench, Version 2.3 <$Revision: 655654 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking localhost (be patient)
Completed 1000 requests
Completed 2000 requests
Completed 3000 requests
Completed 4000 requests
Completed 5000 requests
Completed 6000 requests
Completed 7000 requests
Completed 8000 requests
Completed 9000 requests
Completed 10000 requests
Finished 10000 requests


Server Software:        Apache-Coyote/1.1
Server Hostname:        localhost
Server Port:            8080

Document Path:          /hello
Document Length:        12 bytes

Concurrency Level:      200
Time taken for tests:   2002.151 seconds
Complete requests:      10000
Failed requests:        0
Write errors:           0
Total transferred:      1340000 bytes
HTML transferred:       120000 bytes
Requests per second:    4.99 [#/sec] (mean)
Time per request:       40043.028 [ms] (mean)
Time per request:       200.215 [ms] (mean, across all concurrent requests)
Transfer rate:          0.65 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   0.4      0       8
Processing: 10002 39740 2686.3  40005   50319
Waiting:    10002 39740 2686.4  40004   50319
Total:      10002 39741 2686.3  40005   50319

Percentage of the requests served within a certain time (ms)
  50%  40005
  66%  40009
  75%  40014
  80%  40022
  90%  40122
  95%  40316
  98%  40449
  99%  40483
 100%  50319 (longest request)
```

## 实现

```java
 /**
     * Puts this request into asynchronous mode, and initializes its
     * {@link AsyncContext} with the original (unwrapped) ServletRequest
     * and ServletResponse objects.
     *
     * <p>Calling this method will cause committal of the associated
     * response to be delayed until {@link AsyncContext#complete} is
     * called on the returned {@link AsyncContext}, or the asynchronous
     * operation has timed out.
     *
     * <p>Calling {@link AsyncContext#hasOriginalRequestAndResponse()} on
     * the returned AsyncContext will return <code>true</code>. Any filters
     * invoked in the <i>outbound</i> direction after this request was put
     * into asynchronous mode may use this as an indication that any request
     * and/or response wrappers that they added during their <i>inbound</i>
     * invocation need not stay around for the duration of the asynchronous
     * operation, and therefore any of their associated resources may be
     * released.
     *
     * <p>This method clears the list of {@link AsyncListener} instances
     * (if any) that were registered with the AsyncContext returned by the
     * previous call to one of the startAsync methods, after calling each
     * AsyncListener at its {@link AsyncListener#onStartAsync onStartAsync}
     * method.
     *
     * <p>Subsequent invocations of this method, or its overloaded 
     * variant, will return the same AsyncContext instance, reinitialized
     * as appropriate.
     *
     * @return the (re)initialized AsyncContext
     * 
     * @throws IllegalStateException if this request is within the scope of
     * a filter or servlet that does not support asynchronous operations
     * (that is, {@link #isAsyncSupported} returns false),
     * or if this method is called again without any asynchronous dispatch
     * (resulting from one of the {@link AsyncContext#dispatch} methods),
     * is called outside the scope of any such dispatch, or is called again
     * within the scope of the same dispatch, or if the response has
     * already been closed
     *
     * @see AsyncContext#dispatch()
     * @since Servlet 3.0
     */
        public AsyncContext startAsync() throws IllegalStateException;
```

## Spring 对异步Servlet的支持



## 参考

1. [Async Servlet Feature of Servlet 3 - JournalDev](http://www.journaldev.com/2008/async-servlet-feature-of-servlet-3)

2. [17.12 Asynchronous Processing - Java Platform, Enterprise Edition: The Java EE Tutorial (Release 7)](https://docs.oracle.com/javaee/7/tutorial/servlets012.htm)

3. [ab - Apache HTTP server benchmarking tool - Apache HTTP Server Version 2.4](https://httpd.apache.org/docs/2.4/programs/ab.html)

4. [系统吞吐量（TPS）、用户并发量、性能测试概念和公式](http://www.ha97.com/5095.html)

5. [servlet3新特性——异步请求处理 | 晓的技术博客](https://lanjingling.github.io/2016/01/20/servlet3-new-furture/)

6. [解决java.util.concurrent.RejectedExecutionException - 小一的专栏 - 博客频道 - CSDN.NET](http://blog.csdn.net/wzy_1988/article/details/38922449)

