title: tomcat连接数相关的配置
tags: connections
category: tomcat
toc: true
date: 2017-04-05 01:22:17
---


*以下是tomcat7的一些配置说明*

# tomcat交互图

{%  asset_img   tomcat-interaction.jpg  图片取自参考1 %}

## maxConnections

tomcat接受的最大连接的个数，超过这个连接个数，acceptor就会阻塞。

> The maximum number of connections that the server will accept and process at any given time. When this number has been reached, the server will accept, but not process, one further connection. This additional connection be blocked until the number of connections being processed falls below maxConnections at which point the server will start accepting and processing new connections again. Note that once the limit has been reached, the operating system may still accept connections based on the acceptCount setting. The default value varies by connector type. For BIO the default is the value of maxThreads unless an Executor is used in which case the default will be the value of maxThreads from the executor. For NIO the default is 10000. For APR/native, the default is 8192.

需要注意的是，在BIO模式下，`maxConnections`的值默认等于`maxThreads`的值!!!

达到maxConnections之后，acceptor线程就会阻塞，用jstack查看堆栈会发现Acceptor线程阻塞在下面的代码

```bash
sudo -u tomcat jstack  `pgrep -f 'tomcat'` | less
```

tomcat  7的源码中相应的代码

```java
                    //if we have reached max connections, wait
                    countUpOrAwaitConnection();
```

函数的具体实现

```java
    protected void countUpOrAwaitConnection() throws InterruptedException {
        if (maxConnections==-1) return;
        LimitLatch latch = connectionLimitLatch;
        if (latch!=null) latch.countUpOrAwait();
    }
```

其中`LimitLatch`是tomcat自己实现的一个类似`CountDownLatch`的东西。

```java
/**
 * Shared latch that allows the latch to be acquired a limited number of times
 * after which all subsequent requests to acquire the latch will be placed in a
 * FIFO queue until one of the shares is returned.
 */
public class LimitLatch {...}
```

它的初始化过程：

```java
    protected LimitLatch initializeConnectionLatch() {
        if (maxConnections==-1) return null;
        if (connectionLimitLatch==null) {
            connectionLimitLatch = new LimitLatch(getMaxConnections());
        }
        return connectionLimitLatch;
    }
```

## maxThreads

tomcat的连接线程最大个数。


> The maximum number of request processing threads to be created by this Connector, which therefore determines the maximum number of simultaneous requests that can be handled. If not specified, this attribute is set to 200. If an executor is associated with this connector, this attribute is ignored as the connector will execute tasks using the executor rather than an internal thread pool. Note that if an executor is configured any value set for this attribute will be recorded correctly but it will be reported (e.g. via JMX) as -1 to make clear that it is not used.

>maxThreads、minSpareThreads是tomcat工作线程池的配置参数，maxThreads就相当于jdk线程池的maxPoolSize，而minSpareThreads就相当于jdk线程池的corePoolSize。

相应的代码如下：

```java
    public void createExecutor() {
        internalExecutor = true;
        TaskQueue taskqueue = new TaskQueue();
        TaskThreadFactory tf = new TaskThreadFactory(getName() + "-exec-", daemon, getThreadPriority());
        executor = new ThreadPoolExecutor(getMinSpareThreads(), getMaxThreads(), 60, TimeUnit.SECONDS,taskqueue, tf);
        taskqueue.setParent( (ThreadPoolExecutor) executor);
    }
```

## acceptCount

系统积压队列的大小。

>The maximum queue length for incoming connection requests when all possible request processing threads are in use. Any requests received when the queue is full will be refused. The default value is 100.

tomcat7的源码中有这么一段，大概就是别名的替换。`acceptCount`被替换成了`backlog`，`backlog`的意思是积压的东西。

```java
     static {
         replacements.put("acceptCount", "backlog");
         replacements.put("connectionLinger", "soLinger");
         replacements.put("connectionTimeout", "soTimeout");
         replacements.put("rootFile", "rootfile");
     }
```

`acceptCount`是在初始`bind`的时候传给jdk的`bind`函数的，最终会传递到系统层。
以`NioEndpoint`为例，大概如下：

```java
 /**
     * Initialize the endpoint.
     */
    @Override
    public void bind() throws Exception {

        serverSock = ServerSocketChannel.open();
        socketProperties.setProperties(serverSock.socket());
        InetSocketAddress addr = (getAddress()!=null?new InetSocketAddress(getAddress(),getPort()):new InetSocketAddress(getPort()));
        serverSock.socket().bind(addr,getBacklog());
        serverSock.configureBlocking(true); //mimic APR behavior
        serverSock.socket().setSoTimeout(getSocketProperties().getSoTimeout());

        // Initialize thread count defaults for acceptor, poller
        if (acceptorThreadCount == 0) {
            // FIXME: Doesn't seem to work that well with multiple accept threads
            acceptorThreadCount = 1;
        }
        if (pollerThreadCount <= 0) {
            //minimum one poller thread
            pollerThreadCount = 1;
        }
        stopLatch = new CountDownLatch(pollerThreadCount);

        // Initialize SSL if needed
        if (isSSLEnabled()) {
           //ssl stuff
           //...
           //...
        }

        if (oomParachute>0) reclaimParachute(true);
        selectorPool.open();
    }
```

看下`getBackLog`的实现(`AbstractEndpoint`)：

```java
    /**
     * Allows the server developer to specify the backlog that
     * should be used for server sockets. By default, this value
     * is 100.
     */
    private int backlog = 100;
    public void setBacklog(int backlog) { if (backlog > 0) this.backlog = backlog; }
    public int getBacklog() { return backlog; }
```

默认值大小是`100`。

# 总结

tomcat的`Acceptor`线程会不停的从系统的全连接队列里去拿对应的socket连接，直到达到了`maxConnections`的值。
之后`Acceptor`会阻塞在那里，直到处理的连接小于`maxConnections`的值。如果一直阻塞的话，就会在系统的tcp
连接队列中阻塞，这个队列的长度是`acceptCount`控制的，默认是`100`。如果仍然处理不过来，系统可能就会丢掉
一些建立的连接了。

所以，大致可以估计下最多能处理的连接数：

`最大处理连接数 = acceptCount + maxConnection`

#参考

1. [tomcat的acceptCount与maxConnections - xixicat - SegmentFault](https://segmentfault.com/a/1190000008064162)

2. [Apache Tomcat 7 Configuration Reference (7.0.77) - The HTTP Connector](https://tomcat.apache.org/tomcat-7.0-doc/config/http.html)

