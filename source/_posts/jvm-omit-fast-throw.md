title: Tomcat日志中异常堆栈不完整
tags: tomcat
category: tomcat
toc: true
date: 2017-12-03 01:02:29
---


## 现象

tomcat的异常日志会打印到`catalina.out`中，有的时候发现日志的堆栈并不完整， 只能看到部分的堆栈信息。

```
java.lang.Exception: NullPointerException | 2390852_pd2390852_prc2390852_sr2390852_ncb2390852_pm45090051_pd45090051_prc45090051_sr45090051_ncb45090051_pm36619638_pd36619638_prc36619638_sr36619638_ncb36619638_pm1122394_pd1122394_prc1122394_sr1122394_ncb1122394_pm
        ...
        ...
        at sun.reflect.GeneratedMethodAccessor481.invoke(Unknown Source) ~[na:na]
        at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43) ~[na:1.8.0_60]
        at java.lang.reflect.Method.invoke(Method.java:497) ~[na:1.8.0_60]
        at org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:221) ~[spring-web-4.2.5.RELEASE.jar:4.2.5.RELEASE]
        at org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:136) ~[spring-web-4.2.5.RELEASE.jar:4.2.5.RELEASE]
        at org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:110) ~[spring-webmvc-4.2.5.RELEASE.jar:4.2.5.RELEASE]
        at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invoke
java.lang.NullPointerException: null
[2016-12-05 11:29:27][h_hprice_breeze_p_161205.112927.10.90.5.48.6486.595359_1][ESC[31mWARN ESC[0;39m]logX -> desc = SHotel 状态无效, data = hotelId[
```

可以看到这个`NPE`只打印了，一个message， 内部的堆栈都没有了，这样就无法根据堆栈信息找到对应的代码的位置。

## 原因

### jvm的优化

>HotSpot虚拟机的JIT优化，把多次打的堆栈给优化掉了，往上Grep应该能Grep到完整的堆栈。

#### 解决方案

这种被优化调的堆栈，第一次都是打出来完整的，因此可以向上翻翻，应该是能找到完整的现场的。

频繁的打印异常的堆栈，对系统性能也有较大的影响，不过如果不是生产环境，可以在jvm的启动参数后面加上

```
-XX:-OmitStackTraceInFastThrow 
```
将这种优化主动关闭

### 日志打的太快

其实打到tomcat的`catalina.out`的应该是有两个日志框架，一个是tomcat自己带的，一个是应用的。

tomcat自己带了一个日志的框架 —— `juli`

自己的应用中一般也会用一个日志的框架，比如 —— `logback`

这样就存在同时写入`catalina.out`文件的可能，`juli`日志刚打了一半， 就被`logback`打的日志穿插了。
这样本来两行相邻的日志，就会差的十万八千里。

>Tomcat 的内部日志使用 JULI 组件，这是一个 Apache Commons 日志的重命名的打包分支，默认被硬编码，使用 java.util.logging 架构。
>这能保证 Tomcat 内部日志与 Web 应用的日志保持独立，即使 Web 应用使用的是 Apache Commons Logging。

正是这个独立性，导致了日志有可能是乱的。
tomcat加载内部的日志组件的加载器是`System class loader`，
应用的日志组件的类加载器是`webapp class loader`，因此即使用的是同一套日志体系，相互之间应该还是隔离的。


logback的官方文档也说明了：

>By virtue of class loader separation provided by the container, 
>each web-application will load its own copy of LoggerContext which will pickup its own copy of logback.xml.


## 参考

1. [Hotspot caused exceptions to lose their stack traces in production – and the fix at JAW Speak](http://jawspeak.com/2010/05/26/hotspot-caused-exceptions-to-lose-their-stack-traces-in-production-and-the-fix/)

2. [[译]生产环境中异常堆栈丢失的解决方案 | 戎码一生](http://rongmayisheng.com/post/%E8%AF%91%E7%94%9F%E4%BA%A7%E7%8E%AF%E5%A2%83%E4%B8%AD%E5%BC%82%E5%B8%B8%E5%A0%86%E6%A0%88%E4%B8%A2%E5%A4%B1%E7%9A%84%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88)

3. [日志机制 - Tomcat 8 权威指南 - 极客学院Wiki](http://wiki.jikexueyuan.com/project/tomcat/logging.html)

4. [Chapter 9: Logging separation](https://logback.qos.ch/manual/loggingSeparation.html)
