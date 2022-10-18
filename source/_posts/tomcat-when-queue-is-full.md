---
title: tomcat队列满了之后会发生什么？
tags: tomcat
category: tomcat
toc: true
typora-root-url: tomcat队列满了之后会发生什么？
typora-copy-images-to: tomcat队列满了之后会发生什么？
date: 2022-10-05 16:08:22
---



tomcat线程池满了之后，请求会堆积在队列里。队列满了之后会发生什么？



# 队列长度

首先需要看下队列长度，使用tomcat默认的线程池，采用的是无界队列：

```java
// org.apache.tomcat.util.net.AbstractEndpoint#createExecutor
public void createExecutor() {
  internalExecutor = true;
  // 默认是无界的
  TaskQueue taskqueue = new TaskQueue();
  TaskThreadFactory tf = new TaskThreadFactory(getName() + "-exec-", daemon, getThreadPriority());
  executor = new ThreadPoolExecutor(getMinSpareThreads(), getMaxThreads(), 60, TimeUnit.SECONDS,taskqueue, tf);
  taskqueue.setParent( (ThreadPoolExecutor) executor);
}
```

好在可以自定义线程池：

```xml
    <Executor name="tomcatThreadPool" namePrefix="catalina-exec-"
        maxThreads="7" minSpareThreads="4" maxQueueSize="3"/>
    <!-- A "Connector" using the shared thread pool-->
    <Connector executor="tomcatThreadPool"
               port="8080" protocol="HTTP/1.1"
               connectionTimeout="20000"
               redirectPort="8443" />
```

此处可以设置maxQueueSize，这里设置为3

启动之后，使用arthas查看mbean：

```bash
[arthas@84145]$ mbean Catalina:type=Executor,name=tomcatThreadPool
 OBJECT_NAME              Catalina:type=Executor,name=tomcatThreadPool
--------------------------------------------------------------------------
 NAME                     VALUE
--------------------------------------------------------------------------
 activeCount              1
 modelerType              org.apache.catalina.core.StandardThreadExecutor
 queueSize                0
 largestPoolSize          7
 poolSize                 4
 maxIdleTime              60000
 threadPriority           5
 daemon                   true
 minSpareThreads          4
 maxQueueSize             3
 stateName                STARTED
 namePrefix               catalina-exec-
 name                     tomcatThreadPool
 corePoolSize             4
 completedTaskCount       16
 maxThreads               7
 prestartminSpareThreads  false
 threadRenewalDelay       1000
```

maxQueueSize确实是3，maxThreads是7



# 构造队列满的场景

servlet代码，代码里直接sleep，占住tomcat的线程：

```java
@Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
      try {
        // 多睡一会儿
        Thread.sleep(1000_000);
      } catch (InterruptedException e) {
        e.printStackTrace();
      }
      resp.getWriter().write("Hello World!");
}
```

客户端直接curl，20个并发请求 > maxThreads + maxQueueSize = 7 + 3 = 10

```bash
for i in `seq 1 20`; do curl -v  http://localhost:8080/web_war_exploded/hello &; done
```

看一眼tomcat的状态：

```bash
[arthas@84145]$ mbean Catalina:type=Executor,name=tomcatThreadPool
 OBJECT_NAME              Catalina:type=Executor,name=tomcatThreadPool
--------------------------------------------------------------------------
 NAME                     VALUE
--------------------------------------------------------------------------
 activeCount              7
 modelerType              org.apache.catalina.core.StandardThreadExecutor
 queueSize                3
 largestPoolSize          7
 poolSize                 7
 maxIdleTime              60000
 threadPriority           5
 daemon                   true
 minSpareThreads          4
 maxQueueSize             3
 stateName                STARTED
 namePrefix               catalina-exec-
 name                     tomcatThreadPool
 corePoolSize             4
 completedTaskCount       29
 maxThreads               7
 prestartminSpareThreads  false
 threadRenewalDelay       1000
```

queueSize 3已经达到了maxQueueSize。

此时我们再次curl，tomcat应该就会抛出队列满的异常：

```bash
➜  ~ curl  http://localhost:8080/web_war_exploded/hello  --trace-ascii -
== Info:   Trying 127.0.0.1:8080...
== Info: Connected to localhost (127.0.0.1) port 8080 (#0)
=> Send header, 100 bytes (0x64)
0000: GET /web_war_exploded/hello HTTP/1.1
0026: Host: localhost:8080
003c: User-Agent: curl/7.79.1
0055: Accept: */*
0062:
== Info: Recv failure: Connection reset by peer
== Info: Closing connection 0
curl: (56) Recv failure: Connection reset by peer
```

curl的连接直接别reset了，再看tomcat的日志：

```bash
	java.util.concurrent.RejectedExecutionException: The executor's work queue is full
		at org.apache.catalina.core.StandardThreadExecutor.execute(StandardThreadExecutor.java:179)
		at org.apache.tomcat.util.net.AbstractEndpoint.processSocket(AbstractEndpoint.java:1105)
		at org.apache.tomcat.util.net.NioEndpoint$Poller.processKey(NioEndpoint.java:896)
		at org.apache.tomcat.util.net.NioEndpoint$Poller.run(NioEndpoint.java:872)
		at java.lang.Thread.run(Thread.java:750)
```

提交任务到线程池失败之后，tomcat会cancel掉这个key：

```bash
[arthas@84145]$ stack org.apache.tomcat.util.net.NioEndpoint$Poller cancelledKey  -n 5
Press Q or Ctrl+C to abort.
Affect(class count: 1 , method count: 1) cost in 696 ms, listenerId: 2
ts=2022-09-30 14:04:45;thread_name=http-nio-8080-ClientPoller-0;id=1c;is_daemon=true;priority=5;TCCL=java.net.URLClassLoader@123772c4
    @org.apache.tomcat.util.net.NioEndpoint$Poller.cancelledKey()
        at org.apache.tomcat.util.net.NioEndpoint$Poller.processKey(NioEndpoint.java:906)
        at org.apache.tomcat.util.net.NioEndpoint$Poller.run(NioEndpoint.java:872)
        at java.lang.Thread.run(Thread.java:750)
        
[arthas@84145]$ trace org.apache.tomcat.util.net.NioEndpoint$Poller cancelledKey  -n 5 --skipJDKMethod false
Press Q or Ctrl+C to abort.
Affect(class count: 1 , method count: 1) cost in 473 ms, listenerId: 4
`---ts=2022-09-30 14:12:30;thread_name=http-nio-8080-ClientPoller-0;id=1c;is_daemon=true;priority=5;TCCL=java.net.URLClassLoader@123772c4
    `---[0.508941ms] org.apache.tomcat.util.net.NioEndpoint$Poller:cancelledKey()
        +---[3.74% 0.01904ms ] java.nio.channels.SelectionKey:attach() #765
        +---[1.98% 0.010098ms ] org.apache.tomcat.util.net.NioEndpoint:getHandler() #769
        +---[4.51% 0.022943ms ] org.apache.tomcat.util.net.AbstractEndpoint$Handler:release() #769
        +---[1.04% 0.005282ms ] java.nio.channels.SelectionKey:isValid() #771
        +---[2.64% 0.013427ms ] java.nio.channels.SelectionKey:cancel() #771
        +---[1.75% 0.008886ms ] org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper:getSocket() #778
        +---[10.72% 0.054534ms ] org.apache.tomcat.util.net.NioChannel:close() #778
        +---[2.54% 0.01293ms ] java.nio.channels.SelectionKey:channel() #788
        +---[1.82% 0.009248ms ] java.nio.channels.SelectableChannel:isOpen() #788
        +---[5.49% 0.027926ms ] org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper:getSendfileData() #799
        +---[7.03% 0.035797ms ] org.apache.tomcat.util.net.NioEndpoint:countDownConnection() #807
        `---[2.58% 0.01312ms ] org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper:access$202() #808
```

# 实验结果分析

tomcat，线程池满了之后，观察到的现象：

- 新的http请求，会得到Connection reset by peer，无法正常进行
- tomcat日志中会有work queue is full的异常

## work queue is full

代码位置：

> Executes the given command at some time in the future.  The command may execute in a new thread, in a pooled thread, or in the calling thread, at the discretion of the <code>Executor</code> implementation.
> If no threads are available, it will be added to the work queue.
> If the **work queue is full**, the system will **wait** for the specified time and it throw a **RejectedExecutionException** if the queue is **still** **full after that**.

```java
// org.apache.tomcat.util.threads.ThreadPoolExecutor#execute(java.lang.Runnable, long, java.util.concurrent.TimeUnit)
// @deprecated This will be removed in Tomcat 10.1.x onwards
 @Deprecated
public void execute(Runnable command, long timeout, TimeUnit unit) {
  submittedCount.incrementAndGet();
  try {
    executeInternal(command);
  } catch (RejectedExecutionException rx) {
    if (getQueue() instanceof TaskQueue) {
      // If the Executor is close to maximum pool size, concurrent
      // calls to execute() may result (due to Tomcat's use of
      // TaskQueue) in some tasks being rejected rather than queued.
      // If this happens, add them to the queue.
      final TaskQueue queue = (TaskQueue) getQueue();
      try {
        // 如果是TaskQueue，这里还会等一会儿，如果还是失败，再抛出异常
        if (!queue.force(command, timeout, unit)) {
          submittedCount.decrementAndGet();
          throw new RejectedExecutionException(sm.getString("threadPoolExecutor.queueFull"));
        }
      } catch (InterruptedException x) {
        submittedCount.decrementAndGet();
        throw new RejectedExecutionException(x);
      }
    } else {
      submittedCount.decrementAndGet();
      throw rx;
    }
  }
}
```

用arthas验证下，是否走到force：

```bash
[arthas@84145]$ stack org.apache.tomcat.util.threads.TaskQueue force  -n 5
Press Q or Ctrl+C to abort.
Affect(class count: 1 , method count: 2) cost in 82 ms, listenerId: 7
ts=2022-09-30 14:52:32;thread_name=http-nio-8080-ClientPoller-1;id=1d;is_daemon=true;priority=5;TCCL=java.net.URLClassLoader@123772c4
    @org.apache.tomcat.util.threads.TaskQueue.force()
        at org.apache.tomcat.util.threads.ThreadPoolExecutor.execute(ThreadPoolExecutor.java:178)
        at org.apache.tomcat.util.threads.ThreadPoolExecutor.execute(ThreadPoolExecutor.java:151)
        at org.apache.catalina.core.StandardThreadExecutor.execute(StandardThreadExecutor.java:175)
        at org.apache.tomcat.util.net.AbstractEndpoint.processSocket(AbstractEndpoint.java:1105)
        at org.apache.tomcat.util.net.NioEndpoint$Poller.processKey(NioEndpoint.java:896)
        at org.apache.tomcat.util.net.NioEndpoint$Poller.run(NioEndpoint.java:872)
        at java.lang.Thread.run(Thread.java:750)
        
[arthas@84145]$ watch org.apache.tomcat.util.threads.TaskQueue force 'params'  -n 5  -x 1
Press Q or Ctrl+C to abort.
Affect(class count: 1 , method count: 2) cost in 45 ms, listenerId: 10
method=org.apache.tomcat.util.threads.TaskQueue.force location=AtExit
ts=2022-09-30 14:55:19; [cost=0.648436ms] result=@Object[][
    @SocketProcessor[org.apache.tomcat.util.net.NioEndpoint$SocketProcessor@5af3cff6],
    @Long[0],
    @[MILLISECONDS],
]
```

确实走到了force的逻辑，但是默认的timeout是0，0代表不等待。只是相当于多了一次尝试。

而且这个超时是无法配置的，对于http请求来说，功能相当于是废掉的。

AbstractEndpoint  -> StandardThreadExecutor -> org.apache.tomcat.util.threads.ThreadPoolExecutor

```java
// org.apache.tomcat.util.net.AbstractEndpoint#processSocket
// 这里用的Executor的接口来接的，没有传超时的地方，这里返回的就是StandardThreadExecutor
Executor executor = getExecutor();
if (dispatch && executor != null) {
  // 没地方传超时
  executor.execute(sc);
} else {
  sc.run();
}


// org.apache.catalina.core.StandardThreadExecutor#execute(java.lang.Runnable)
@Override
public void execute(Runnable command) {
  if (executor != null) {
    // Note any RejectedExecutionException due to the use of TaskQueue
    // will be handled by the o.a.t.u.threads.ThreadPoolExecutor
    // 没地方传超时
    executor.execute(command);
  } else {
    throw new IllegalStateException(sm.getString("standardThreadExecutor.notStarted"));
  }
}


// org.apache.tomcat.util.threads.ThreadPoolExecutor#execute(java.lang.Runnable)
@Override
public void execute(Runnable command) {
  // timeout 0
  execute(command,0,TimeUnit.MILLISECONDS);
}
```

## Connection reset by peer

从提交线程池的地方，逆流而上：

```java
// org.apache.tomcat.util.net.AbstractEndpoint#processSocket
public boolean processSocket(SocketWrapperBase<S> socketWrapper,
                             SocketEvent event, boolean dispatch) {
  try {
   	// 省略
    SocketProcessorBase<S> sc = processorCache.pop();
    Executor executor = getExecutor();
    if (dispatch && executor != null) {
      executor.execute(sc);
    } else {
      sc.run();
    }
  } catch (RejectedExecutionException ree) {
    getLog().warn(sm.getString("endpoint.executor.fail", socketWrapper) , ree);
    return false;
  } catch (Throwable t) {
    ExceptionUtils.handleThrowable(t);
    // This means we got an OOM or similar creating a thread, or that
    // the pool and its queue are full
    getLog().error(sm.getString("endpoint.process.fail"), t);
    return false;
  }
  return true;
}

// org.apache.tomcat.util.net.NioEndpoint.Poller#processKey
 if (!processSocket(attachment, SocketEvent.OPEN_READ, true)) {
   closeSocket = true;
 }
  if (closeSocket) {
    cancelledKey(sk);
  }

// org.apache.tomcat.util.net.NioEndpoint.Poller#cancelledKey
// If attachment is non-null then there may be a current
// connection with an associated processor.
1. getHandler().release(ka);
2. key.cancel();
3. ka.getSocket().close(true);
4. countDownConnection();
```

AbstractEndpoint#processSocket 返回false  -> NioEndpoint.Poller#cancelledKey，取消主要包含了4步：

1. 【tomcat】getHandler().release(ka);
   - 从当前处理的集合（connections）中移除
   - 释放Http11Processor至对象池
2. 【nio】key.cancel();
   - 处理select的deregister逻辑
3. 【tomcat】ka.getSocket().close(true);
   - 关闭IOChannel对应的socket
   - 关闭IOChannel
4. 【tomcat】countDownConnection();
   - LimitLatch计数减少



那么为啥是tcp reset呢？

> socket接收缓冲区（Recv-Q）中的数据，未完全被应用程序读取时，关闭该socket会产生TCP Reset

Http协议的解析都是在worker线程中进行的，由于提交任务失败，**这部分内容是没有读取的**。因此在连接关闭时，TCP发现Receive Buffer中还有数据没有读取，因此给对端发送了Rest。



# 结论

- 默认的Executor的队列是**无界队列**，因此不会有队列满的情况
- 使用定制的Executor可以设置maxQueueSize
- RejectedExecutionException之后，tomcat会**立即重试一次提交**（timeout是0）
- 重试之后，仍然失败，会走到cancelledKey的逻辑，**关闭底层的连接**
- http协议的解析都是在worker线程池中进行的，由于提交任务失败，**Receive Buffer里仍有数据**
- TCP协议在关闭连接时，发现Receive Buffer里仍有数据，给对端**发送Reset**



# 参考

- [tcp rst产生的几种情况 - 知乎](https://zhuanlan.zhihu.com/p/30791159)
