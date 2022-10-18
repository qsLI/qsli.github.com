---
title: tomcat的线程池为什么不回落？
tags: threadpool
category: tomcat
toc: true
typora-root-url: tomcat的线程池为什么不回落？
typora-copy-images-to: tomcat的线程池为什么不回落？
date: 2022-10-06 00:25:21
---



# 现象

从监控上看，tomcat的线程busy的非常少，线程池使用率很低，但是线程池里的线程的个数却很多。

难道tomcat的线程池没有回落机制吗？

```bash
[arthas@22]$ mbean | grep -i thread
Catalina:type=ThreadPool,name="http-nio-22441"
java.lang:type=Threading
Catalina:type=ThreadPool,name="http-nio-22441",subType=SocketProperties
[arthas@22]$ mbean Catalina:type=ThreadPool,name=*
 OBJECT_NAME                       Catalina:type=ThreadPool,name="http-nio-22441"
----------------------------------------------------------------------------------
 NAME                              VALUE
----------------------------------------------------------------------------------
 currentThreadsBusy                2
 sslImplementationName             null
 paused                            false
 selectorTimeout                   1000
 modelerType                       org.apache.tomcat.util.net.NioEndpoint
 connectionCount                   46
 acceptCount                       2000
 threadPriority                    5
 executorTerminationTimeoutMillis  5000
 running                           true
 currentThreadCount                916
 sSLEnabled                        false
 sniParseLimit                     65536
 maxThreads                        2000
 sslImplementation                 null
 connectionTimeout                 2000
 tcpNoDelay                        true
 maxConnections                    20000
 connectionLinger                  -1
 keepAliveCount                    1
 keepAliveTimeout                  5000
 maxKeepAliveRequests              2000
 localPort                         22441
 deferAccept                       false
 useSendfile                       true
 acceptorThreadCount               1
 pollerThreadCount                 2
 daemon                            true
 minSpareThreads                   25
 useInheritedChannel               false
 alpnSupported                     false
 acceptorThreadPriority            5
 bindOnInit                        true
 pollerThreadPriority              5
 port                              22441
 domain                            Catalina
 name                              http-nio-22441
 defaultSSLHostConfigName          _default_
```

几个关键点：

- currentThreadsBusy                2
- currentThreadCount              916
- maxThreads                              2000
- minSpareThreads                   25

干活的线程只有2个，但是线程池里有916个线程？why？

多次观察，仍然是这个情况。

# 原因

## mbean数据来源

先搞清楚mbean的数据来源。

```java
// org.apache.tomcat.util.net.AbstractEndpoint#init
// Register endpoint (as ThreadPool - historical name)
oname = new ObjectName(domain + ":type=ThreadPool,name=\"" + getName() + "\"");
Registry.getRegistry(null, null).registerComponent(this, oname, null);
```

- currentThreadBusy——当前有任务的线程个数

  ```java
  // org.apache.tomcat.util.net.AbstractEndpoint#getCurrentThreadsBusy
  public int getCurrentThreadsBusy() {
    Executor executor = this.executor;
    if (executor != null) {
      if (executor instanceof ThreadPoolExecutor) {
        return ((ThreadPoolExecutor) executor).getActiveCount();
      } else if (executor instanceof ResizableExecutor) {
        return ((ResizableExecutor) executor).getActiveCount();
      } else {
        return -1;
      }
    } else {
      return -2;
    }
  }
  ```

- currentThreadCount——线程池中，当前线程个数

  ```java
  // org.apache.tomcat.util.net.AbstractEndpoint#getCurrentThreadCount
  public int getCurrentThreadCount() {
    Executor executor = this.executor;
    if (executor != null) {
      if (executor instanceof ThreadPoolExecutor) {
        return ((ThreadPoolExecutor) executor).getPoolSize();
      } else if (executor instanceof ResizableExecutor) {
        return ((ResizableExecutor) executor).getPoolSize();
      } else {
        return -1;
      }
    } else {
      return -2;
    }
  }
  ```

- maxThreads——最大线程数

  ```java
  // org.apache.tomcat.util.net.AbstractEndpoint#getMaxThreads
  public int getMaxThreads() {
    if (internalExecutor) {
      return maxThreads;
    } else {
      return -1;
    }
  }
  
  ```

- minSpareThreads——核心线程数

  ```java
  // org.apache.tomcat.util.net.AbstractEndpoint#getMinSpareThreads
  public int getMinSpareThreads() {
    return Math.min(getMinSpareThreadsInternal(), getMaxThreads());
  }
  private int getMinSpareThreadsInternal() {
    if (internalExecutor) {
      return minSpareThreads;
    } else {
      return -1;
    }
  }
  ```

默认线程池初始化逻辑：

```java
// org.apache.tomcat.util.net.AbstractEndpoint#createExecutor
public void createExecutor() {
  // 使用内部线程池
  internalExecutor = true;
  TaskQueue taskqueue = new TaskQueue();
  TaskThreadFactory tf = new TaskThreadFactory(getName() + "-exec-", daemon, getThreadPriority());
  // 注意，这个ThreadPoolExecutor是tomcat自己魔改过的
  executor = new ThreadPoolExecutor(getMinSpareThreads(), getMaxThreads(), 60, TimeUnit.SECONDS,taskqueue, tf);
  taskqueue.setParent( (ThreadPoolExecutor) executor);
}
```

看到线程池的初始化，就会发现miniSpareThreads其实就是corePoolSize! 而且有一个写死的**keepAliveTime 60s。**而且任务队列是个无界的队列。

## 线程池的keepAliveTime

先看JDK中的注释：

> @param keepAliveTime when the number of threads is greater than
>   the core, this is the maximum time that excess idle threads
>     will wait for new tasks before terminating.

简单来说，就是超过核心数的线程，如果等待keepAliveTime，还没有接到任务，就会被终止掉。

看一眼实现：

```java
// java.util.concurrent.ThreadPoolExecutor#runWorker
try {
  // 注意，没有获取到task，这里循环也就结束了，走到线程退出的逻辑
  while (task != null || (task = getTask()) != null) {
    // 省略
    task.run();
  }
  completedAbruptly = false;
} finally {
  // 线程退出的一些清理工作
  processWorkerExit(w, completedAbruptly);
}

// 获取task的逻辑
// java.util.concurrent.ThreadPoolExecutor#getTask
for (;;) {
    // Are workers subject to culling?
    boolean timed = allowCoreThreadTimeOut || wc > corePoolSize;

    // 如果允许timeout，而且timeout发生了，这里直接返回null，循环结束，线程的任务就结束了（退出）
    if ((wc > maximumPoolSize || (timed && timedOut))
        && (wc > 1 || workQueue.isEmpty())) {
      if (compareAndDecrementWorkerCount(c))
        return null;
      continue;
    }

    try {
      // 允许timeout（核心线程，或者worker count > 核心个数），则使用poll，而且timeout是keepAliveTime
      // 否则，走的是阻塞版本的take
      Runnable r = timed ?
        workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS) :
      workQueue.take();
      // poll到task，或者take到，可以直接返回
      if (r != null)
        return r;
      // 走到这里肯定是poll超时了
      timedOut = true;
    } catch (InterruptedException retry) {
      timedOut = false;
    }
}
```

从源码上看，这个keepAliveTime并没有什么问题。

## ReentrantLock

![image-20221005165254624](/image-20221005165254624.png)

有没有一种可能，task queue的poll是雨露均撒的？

> When you have eliminated the impossible, whatever remains, however improbable, must be the truth.

tomcat使用的TaskQueue作为队列，继承自LinkedBlockingQueue。但是核心的poll逻辑，还是用的LinkedBlockingQueue:

```java
// org.apache.tomcat.util.threads.TaskQueue#poll
@Override
public Runnable poll(long timeout, TimeUnit unit)
  throws InterruptedException {
  Runnable runnable = super.poll(timeout, unit);
  if (runnable == null && parent != null) {
    // the poll timed out, it gives an opportunity to stop the current
    // thread if needed to avoid memory leaks.
    parent.stopCurrentThreadIfNeeded();
  }
  return runnable;
}

//java.util.concurrent.LinkedBlockingQueue#poll(long, java.util.concurrent.TimeUnit)
public E poll(long timeout, TimeUnit unit) throws InterruptedException {
  E x = null;
  int c = -1;
  long nanos = unit.toNanos(timeout);
  final AtomicInteger count = this.count;
  final ReentrantLock takeLock = this.takeLock;
  // 锁范围开始
  takeLock.lockInterruptibly();
  try {
    while (count.get() == 0) {
      // 超时时间为0（没有设置超时，或者超时时间到了），则没有就直接返回
      if (nanos <= 0)
        return null;
      // 否则，放入ReentrantLock的条件队列，等待timeout时间
      nanos = notEmpty.awaitNanos(nanos);
    }
    // 此时count > 0，取出一个
    x = dequeue();
    // 减少计数
    c = count.getAndDecrement();
    // 如果还有，则通知条件队列里等待的线程
    if (c > 1)
      notEmpty.signal();
  } finally {
    // 锁范围结束
    takeLock.unlock();
  }
  // 因为poll走了一个，现在容量是capacity - 1，所以signalNotFull
  if (c == capacity)
    signalNotFull();
  return x;
}
```

核心就在takeLock和notEmpty上，takeLock是ReentrantLock默认非公平，notEmpty是takeLock的条件队列。

```java
// java.util.concurrent.LinkedBlockingQueue

/** Lock held by take, poll, etc */
private final ReentrantLock takeLock = new ReentrantLock();

/** Wait queue for waiting takes */
private final Condition notEmpty = takeLock.newCondition();
```

ReentrantLock默认非公平的，底层基于AQS实现。公平和非公平的区别只是在**首次抢锁的行为**上，首次如果没有抢到，都是排队，然后按顺序解锁。

```java
// java.util.concurrent.locks.ReentrantLock.Sync#nonfairTryAcquire
 /**
   * Performs non-fair tryLock.  tryAcquire is implemented in
   * subclasses, but both need nonfair try for trylock method.
   */
@ReservedStackAccess
final boolean nonfairTryAcquire(int acquires) {
  final Thread current = Thread.currentThread();
  int c = getState();
  if (c == 0) {
    // 因为是非公平，这里直接抢一次
    if (compareAndSetState(0, acquires)) {
      setExclusiveOwnerThread(current);
      return true;
    }
  }
  // 如果没有抢到，看看是不是自己已经获取（可重入）
  else if (current == getExclusiveOwnerThread()) {
    int nextc = c + acquires;
    if (nextc < 0) // overflow
      throw new Error("Maximum lock count exceeded");
    setState(nextc);
    return true;
  }
  // 最终抢失败，返回false
  return false;
}
```

qps比较低的场景下，锁的竞争并不激烈，大部分线程即使抢到了锁，也拿不到任务，只能在条件队列中。

```java
// java.util.concurrent.locks.AbstractQueuedLongSynchronizer.ConditionObject#signal
 /**
         * Moves the longest-waiting thread, if one exists, from the
         * wait queue for this condition to the wait queue for the
         * owning lock.
         *
         * @throws IllegalMonitorStateException if {@link #isHeldExclusively}
         *         returns {@code false}
         */
public final void signal() {
  if (!isHeldExclusively())
    throw new IllegalMonitorStateException();
  Node first = firstWaiter;
  if (first != null)
    doSignal(first);
}
```

条件队列里是按排队的顺序（longest-waiting thread）去通知的，将条件队列里的wait node转移到锁的等待队列中，重新竞争锁。

此时竞争的对象很少，基本就是busy的线程+被notify唤醒的线程，因此大概率还是能抢到任务的。

![image-20221005180143867](/image-20221005180143867.png)

# 实验

问题的根源在于如果task很少，大家会在notEmpty的Condition队列中排队；task来的时候，又是按顺序解锁，如果qps和keepAliveTime合适，在keepAliveTime时间内，每个worker线程都能有机会至少活得一个task，从而不会被回收掉。



## 顺序排队

maxThreads设置为10，打印每次处理的线程的名称，测试代码：

```java
@Override
protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
  LOGGER.error("thread is " + Thread.currentThread().getName());
  try {
    Thread.sleep(1_000);
  } catch (InterruptedException e) {
    e.printStackTrace();
  }
  resp.getWriter().write("Hello World! " + Thread.currentThread().getName());
}
```

串行curl 7次：

```bash
for i in `seq 1 10`; do curl "http://localhost:8087/web_war_exploded/hello" && echo -e '\n'; done;
```

输出：

```bash
➜  conf  for i in `seq 1 10`; do curl "http://localhost:8087/web_war_exploded/hello" && echo -e '\n'; done;
Hello World! http-nio-8087-exec-8

Hello World! http-nio-8087-exec-9

Hello World! http-nio-8087-exec-1

Hello World! http-nio-8087-exec-2

Hello World! http-nio-8087-exec-3

Hello World! http-nio-8087-exec-4

Hello World! http-nio-8087-exec-5

Hello World! http-nio-8087-exec-7

Hello World! http-nio-8087-exec-9

Hello World! http-nio-8087-exec-10
```

确实是类似round robin的形式来的



## 线程回落

tomcat默认的线程池，keepAliveTime是60s，修改maxThreads为10，minSpareThreads为3。

启动之后，mbean输出：

```
[arthas@98537]$ mbean Catalina:type=ThreadPool,name=*
 OBJECT_NAME                       Catalina:type=ThreadPool,name="http-nio-8087"
--------------------------------------------------------------------------------------------------------------------------------
 NAME                              VALUE
--------------------------------------------------------------------------------------------------------------------------------
 currentThreadsBusy                0
 running                           true
 currentThreadCount                3
 maxThreads                        10
 minSpareThreads                   3
```

跟设置一致，先来波高峰请求，创建出来10个worker（maxThreads）

```bash
for i in `seq 1 10`; do curl -s "http://localhost:8087/web_war_exploded/hello" & done;
```

此时mbean输出：

```bash
[arthas@98537]$ mbean Catalina:type=ThreadPool,name=*
 OBJECT_NAME                       Catalina:type=ThreadPool,name="http-nio-8087"
--------------------------------------------------------------------------------------------------------------------------------
 NAME                              VALUE
--------------------------------------------------------------------------------------------------------------------------------
 currentThreadsBusy                0
 running                           true
 currentThreadCount                10
 maxThreads                        10
 minSpareThreads                   3
```

currentThreadCount有10个了，等1min，然后再看：

```bash
[arthas@98537]$ mbean Catalina:type=ThreadPool,name=*
 OBJECT_NAME                       Catalina:type=ThreadPool,name="http-nio-8087"
--------------------------------------------------------------------------------------------------------------------------------
 NAME                              VALUE
--------------------------------------------------------------------------------------------------------------------------------
 currentThreadsBusy                0
 running                           true
 currentThreadCount                3
 maxThreads                        10
 minSpareThreads                   3
```

currentThreadCount已经回落到了3个（minSpareThreads）

## 线程不回落

线程不回落，只用保证每个线程1min内有一个task就行了。maxThreads是10，也就是10 qpm就行了。

先冲高

```bash
for i in `seq 1 10`; do curl -s "http://localhost:8087/web_war_exploded/hello" & done;
```

再维持10 qpm

```bash
for i in `seq 1 100000`; do curl -s "http://localhost:8087/web_war_exploded/hello" && echo "-n" && sleep 5; done;
```

代码里sleep了1s，加上curl的sleep 5s，一个请求6s，一分钟10个请求。此时再看mbean输出：

```bash
[arthas@98537]$ mbean Catalina:type=ThreadPool,name=*
 OBJECT_NAME                       Catalina:type=ThreadPool,name="http-nio-8087"
--------------------------------------------------------------------------------------------------------------------------------
 NAME                              VALUE
--------------------------------------------------------------------------------------------------------------------------------
 currentThreadsBusy                0
 running                           true
 currentThreadCount                10
 maxThreads                        10
 minSpareThreads                   3
```

一直是10，跟线上的现象一样，复现了线程不回落的情形。

修改sleep的时间，降低qpm，看看是否有部分回落：

```bash
for i in `seq 1 100000`; do curl -s "http://localhost:8087/web_war_exploded/hello" && echo "-n" && sleep 7; done;
```

逐渐回落至8个线程：

```bash
[arthas@98537]$ mbean Catalina:type=ThreadPool,name=* | grep -i currentThreadCount
 currentThreadCount                8
```



# 解决方案

QPS的临界值是maxThreads / keepAliveTime，考虑上请求的处理时间，实际值可能稍微大一点。大于临界值则不会发生线程的回落，小于临界值会逐渐回落。

- 调整keepAliveTime

Tomcat使用默认的线程池，keepAliveTime是无法调整的，但是可以使用自定义的线程池，可以设置maxIdleTime（即keepAliveTime）。

```xml
<!--The connectors can use a shared executor, you can define one or more named thread pools-->
<Executor name="tomcatThreadPool" namePrefix="catalina-exec-"
          maxThreads="10" minSpareThreads="3" maxIdleTime="10000"/>
<Connector executor="tomcatThreadPool"
           port="8080" protocol="HTTP/1.1"
           connectionTimeout="20000"
           redirectPort="8443" />
```

调整为10s之后，维持10qpm，很快就回落了：

```bash
[arthas@54257]$ mbean Catalina:type=ThreadPool,name=* | grep -i currentThreadCount
 currentThreadCount                3
```

# 总结

- tomcat的线程池使用TaskQueue控制请求的分发，poll的逻辑和父类LinkedBlockingQueue一致
- LinkedBlockingQueue内部，如果没有task时，poll的**线程**都会在notEmpty的ReentrantLock的Condition队列中，**按序排队**
- 任务来时，signal操作是按队列里的顺序唤醒的，**先入先出**
- **qps > maxThreads / keepAliveTime**，可以保证在keepAliveTime，每个线程都有机会获得task，从而避免被回收
- tomcat默认的线程池，不支持设置keepAliveTime，可以使用**自定义的线程池**解决
- JDK的线程池同样有这个问题，需要注意keepAliveTime的设置
- 频繁的线程切换，会导致频繁的**上下文切换**，对性能应该也有影响
- 对于线上的服务，一般会有**探活机制**，也是线程不回落的原因之一

# 参考

- [Tomcat线程池，更符合大家想象的可扩展线程池](https://www.bbsmax.com/A/kmzLY8vWJG/)
- [每天都在用，但你知道 Tomcat 的线程池有多努力吗？ - why技术 - 博客园](https://www.cnblogs.com/thisiswhy/p/12782548.html)
