---
title: tomcat busy thread如何统计的
tags: busy-thread
category: tomcat
toc: true
typora-root-url: tomcat busy thread如何统计的
typora-copy-images-to: tomcat busy thread如何统计的
date: 2020-04-27 13:59:37
---



## tomcat busy thread

突然好奇tomcat的busy thread怎么统计的，翻了下代码。

### 定义

```java
// org.apache.tomcat.util.net.AbstractEndpoint#getCurrentThreadsBusy   
/**
     * Return the amount of threads that are in use
     *
     * @return the amount of threads that are in use
     */
public int getCurrentThreadsBusy() {
  if (executor!=null) {
    if (executor instanceof ThreadPoolExecutor) {
      return ((ThreadPoolExecutor)executor).getActiveCount();
    } else if (executor instanceof ResizableExecutor) {
      return ((ResizableExecutor)executor).getActiveCount();
    } else {
      return -1;
    }
  } else {
    return -2;
  }
}
```

其实就是在执行任务的线程跟线程的状态没有关系：

```java
// java.util.concurrent.ThreadPoolExecutor#getActiveCount
/**
     * Returns the approximate number of threads that are actively
     * executing tasks.
     *
     * @return the number of threads
     */
public int getActiveCount() {
  final ReentrantLock mainLock = this.mainLock;
  mainLock.lock();
  try {
    int n = 0;
    for (Worker w : workers)
      if (w.isLocked())
        ++n;
    return n;
  } finally {
    mainLock.unlock();
  }
}
```

### 获取

```java
final MBeanServer server = ManagementFactory.getPlatformMBeanServer();
Set<ObjectName> names = server.queryNames(new ObjectName("Catalina:type=ThreadPool,*"), null);
for (final ObjectName name : names) {
    System.out.println(name);
    final Object maxThreads = server.getAttribute(name, "maxThreads");
    final Object currentThreadCount = server.getAttribute(name, "currentThreadCount");
    final Object currentThreadsBusy = server.getAttribute(name, "currentThreadsBusy");
    System.out.println("maxThreads = " + maxThreads);
    System.out.println("currentThreadCount = " + currentThreadCount);
    System.out.println("currentThreadsBusy = " + currentThreadsBusy);
}
```

输出结果

```bash
Catalina:type=ThreadPool,name="ajp-nio-8009"
maxThreads = 200
currentThreadCount = 10
currentThreadsBusy = 0
Catalina:type=ThreadPool,name="http-nio-8080"
maxThreads = 200
currentThreadCount = 10
currentThreadsBusy = 0
```

