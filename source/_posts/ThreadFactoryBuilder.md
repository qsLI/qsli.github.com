title: Guava中的ThreadFactoryBuilder
tags: concurrent
category: guava
toc: true
date: 2017-11-18 17:15:34
---


## 用法

java中自定义线程池时可以传入一个`ThreadFactory`，用来创建线程。

```java
 /**
     * Creates a new {@code ThreadPoolExecutor} with the given initial
     * parameters and default rejected execution handler.
     *
     * @param corePoolSize the number of threads to keep in the pool, even
     *        if they are idle, unless {@code allowCoreThreadTimeOut} is set
     * @param maximumPoolSize the maximum number of threads to allow in the
     *        pool
     * @param keepAliveTime when the number of threads is greater than
     *        the core, this is the maximum time that excess idle threads
     *        will wait for new tasks before terminating.
     * @param unit the time unit for the {@code keepAliveTime} argument
     * @param workQueue the queue to use for holding tasks before they are
     *        executed.  This queue will hold only the {@code Runnable}
     *        tasks submitted by the {@code execute} method.
     * @param threadFactory the factory to use when the executor
     *        creates a new thread
     * @throws IllegalArgumentException if one of the following holds:<br>
     *         {@code corePoolSize < 0}<br>
     *         {@code keepAliveTime < 0}<br>
     *         {@code maximumPoolSize <= 0}<br>
     *         {@code maximumPoolSize < corePoolSize}
     * @throws NullPointerException if {@code workQueue}
     *         or {@code threadFactory} is null
     */
    public ThreadPoolExecutor(int corePoolSize,
                              int maximumPoolSize,
                              long keepAliveTime,
                              TimeUnit unit,
                              BlockingQueue<Runnable> workQueue,
                              ThreadFactory threadFactory) {
        this(corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue,
             threadFactory, defaultHandler);
    }
```

`ThreadFactory`接口只有一个方法，就是创建线程

```java
public interface ThreadFactory {

    /**
     * Constructs a new {@code Thread}.  Implementations may also initialize
     * priority, name, daemon status, {@code ThreadGroup}, etc.
     *
     * @param r a runnable to be executed by new thread instance
     * @return constructed thread, or {@code null} if the request to
     *         create a thread is rejected
     */
    Thread newThread(Runnable r);
}
```

创建`Thread`时可以设置一些列的属性， 属性比较多，于是`guava`里有一个便利类 ———— `ThreadFactoryBuilder`。

直接看`build`方法:

```java
private static ThreadFactory build(ThreadFactoryBuilder builder) {
    final String nameFormat = builder.nameFormat;
    final Boolean daemon = builder.daemon;
    final Integer priority = builder.priority;
    final UncaughtExceptionHandler uncaughtExceptionHandler =
        builder.uncaughtExceptionHandler;
    final ThreadFactory backingThreadFactory =
        (builder.backingThreadFactory != null)
        ? builder.backingThreadFactory
        : Executors.defaultThreadFactory();
    final AtomicLong count = (nameFormat != null) ? new AtomicLong(0) : null;
    return new ThreadFactory() {
      @Override public Thread newThread(Runnable runnable) {
        Thread thread = backingThreadFactory.newThread(runnable);
        if (nameFormat != null) {
          thread.setName(format(nameFormat, count.getAndIncrement()));
        }
        if (daemon != null) {
          thread.setDaemon(daemon);
        }
        if (priority != null) {
          thread.setPriority(priority);
        }
        if (uncaughtExceptionHandler != null) {
          thread.setUncaughtExceptionHandler(uncaughtExceptionHandler);
        }
        return thread;
      }
    };
  }
```

使用起来挺顺手的：

```java
  private static ThreadPoolExecutor executor = new ThreadPoolExecutor(
            10,
            15,
            10,
            TimeUnit.SECONDS,
            blockingQueue,
            new ThreadFactoryBuilder().setNameFormat("guava-%d").build(),
            new ThreadPoolExecutor.DiscardPolicy()
    );
```

主要就是给线程整一个名字，用`jstack`等工具排查问题时方便知道是哪个线程池里的。

`jstack`的结果：

```
"guava-9" #19 prio=5 os_prio=0 tid=0x00007f5024468000 nid=0x5e3b waiting on condition [0x00007f50104f7000]
   java.lang.Thread.State: WAITING (parking)
        at sun.misc.Unsafe.park(Native Method)
        - parking to wait for  <0x00000000d709af38> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
        at java.util.concurrent.locks.LockSupport.park(LockSupport.java:175)
        at java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2039)
        at java.util.concurrent.ArrayBlockingQueue.take(ArrayBlockingQueue.java:403)
        at java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1067)
        at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1127)
        at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:617)
        at java.lang.Thread.run(Thread.java:745)

```

## 更多

1. [ExecutorService-10个要诀和技巧 - ImportNew](http://www.importnew.com/20263.html)