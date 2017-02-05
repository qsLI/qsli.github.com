---
title: Tomcat工作流程
toc: true
category: tomcat
date: 2017-01-21 00:59:55
tags:
---

StringManager


禁用DNS轮询，DNS的优化点？?


Windows 7下安装了Cygwin，发现没有telnet这个命令。在cygwin的搜索中也找不到telnet。
但是经常使用telnet这个小工具。Google了一下发现包含telnet的包是 inetutils。直接安装inetutils即可。


telnet localhost 8097 shutdown

➜  dev which telnet
/usr/bin/telnet
➜  dev telnet localhost 8005
Trying 127.0.0.1...
Connected to localhost.
Escape character is '^]'.
SHUTDOWN
Connection closed by foreign host.


## Connector

##  

## 线程池策略

场景1：接受一个请求，此时tomcat启动的线程数还没有达到corePoolSize(tomcat里头叫minSpareThreads)，tomcat会启动一个线程来处理该请求；
场景2：接受一个请求，此时tomcat启动的线程数已经达到了corePoolSize，tomcat把该请求放入队列(offer)，如果放入队列成功，则返回，放入队列不成功，则尝试增加工作线程，在当前线程个数<maxThreads的时候，可以继续增加线程来处理，超过maxThreads的时候，则继续往等待队列里头放，等待队列放不进去，则抛出RejectedExecutionException；

## JDK线程池策略

每次提交任务时，如果线程数还没达到coreSize就创建新线程并绑定该任务。所以第coreSize次提交任务后线程总数必达到coreSize，不会重用之前的空闲线程。
线程数达到coreSize后，新增的任务就放到工作队列里，而线程池里的线程则努力的使用take()从工作队列里拉活来干。
如果队列是个有界队列，又如果线程池里的线程不能及时将任务取走，工作队列可能会满掉，插入任务就会失败，此时线程池就会紧急的再创建新的临时线程来补救。
临时线程使用poll(keepAliveTime，timeUnit)来从工作队列拉活，如果时候到了仍然两手空空没拉到活，表明它太闲了，就会被解雇掉。
如果core线程数＋临时线程数 >maxSize，则不能再创建新的临时线程了，转头执行RejectExecutionHanlder。默认的AbortPolicy抛RejectedExecutionException异常，其他选择包括静默放弃当前任务(Discard)，放弃工作队列里最老的任务(DisacardOldest)，或由主线程来直接执行(CallerRuns).


CachedPool则把coreSize设成0，然后选用了一种特殊的Queue -- SynchronousQueue，只要当前没有空闲线程，Queue就会立刻报插入失败，让线程池增加新的临时线程，默认的KeepAliveTime是1分钟，而且maxSize是整型的最大值，也就是说只要有干不完的活，都会无限增增加线程数，直到高峰过去线程数才会回落。

## console 被tomcat 重定向到 catalina.out中


## 参考

requestProcess.pdf

7. [Java-Latte: Architecture of Apache Tomcat](http://java-latte.blogspot.kr/2014/10/introduction-to-architecture-of-apache-tomcat-with-server.xml.html)

[Tomcat 系统架构与设计模式，第 1 部分: 工作原理](https://www.ibm.com/developerworks/cn/java/j-lo-tomcat1/)

[Guidewire, SAP, Oracle, UNIX, Genesys Technology Blog: Tomcat shutdown port 8005 - Remote Shutdown](http://singcheong.blogspot.kr/2012/10/tomcat-shutdown-port-8005-remote.html)

[tomcat线程池策略 - xixicat - SegmentFault](https://segmentfault.com/a/1190000008052008)

[Java ThreadPool的正确打开方式 | 江南白衣](http://calvin1978.blogcn.com/articles/java-threadpool.html)

[Tomcat线程池，更符合大家想象的可扩展线程池 | 江南白衣](http://calvin1978.blogcn.com/articles/tomcat-threadpool.html)


