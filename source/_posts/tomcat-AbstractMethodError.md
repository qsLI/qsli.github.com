---
title: tomcat访问时发生AbstractMethodError
category: tomcat
toc: true
date: 2017-01-27 17:16:10
tags:
---


## 异常堆栈

```
javax.servlet.ServletException: Servlet execution threw an exception
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:313) [catalina.jar:6.0.29]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:206) [catalina.jar:6.0.29]
        at qunar.ServletWatcher.doFilter(ServletWatcher.java:160) ~[common-core-8.3.5.jar:na]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:235) [catalina.jar:6.0.29]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:206) [catalina.jar:6.0.29]
        at org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:121) [spring-web-4.2.5.RELEASE.jar:4.2.5.RELEASE]
        at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:107) [spring-web-4.2.5.RELEASE.jar:4.2.5.RELEASE]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:235) [catalina.jar:6.0.29]
        at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:206) [catalina.jar:6.0.29]
        at org.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:233) [catalina.jar:6.0.29]
        at org.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:191) [catalina.jar:6.0.29]
        at org.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:127) [catalina.jar:6.0.29]
        at org.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:102) [catalina.jar:6.0.29]
        at org.apache.catalina.valves.AccessLogValve.invoke(AccessLogValve.java:555) [catalina.jar:6.0.29]
        at org.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:109) [catalina.jar:6.0.29]
        at org.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:298) [catalina.jar:6.0.29]
        at org.apache.coyote.http11.Http11Processor.process(Http11Processor.java:857) [tomcat-coyote.jar:6.0.29]
        at org.apache.coyote.http11.Http11Protocol$Http11ConnectionHandler.process(Http11Protocol.java:588) [tomcat-coyote.jar:6.0.29]
        at org.apache.tomcat.util.net.JIoEndpoint$Worker.run(JIoEndpoint.java:489) [tomcat-coyote.jar:6.0.29]
        at java.lang.Thread.run(Thread.java:745) [na:1.8.0_60]
Caused by: java.lang.AbstractMethodError: null
        at javax.servlet.http.HttpServletResponseWrapper.getStatus(HttpServletResponseWrapper.java:228) ~[lib/:na]
        at javax.servlet.http.HttpServletResponseWrapper.getStatus(HttpServletResponseWrapper.java:228) ~[lib/:na]
        at org.springframework.web.servlet.FrameworkServlet.publishRequestHandledEvent(FrameworkServlet.java:1070) ~[spring-webmvc-4.2.5.RELEASE.jar:4.2.5.RELEASE]
        at org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1003) ~[spring-webmvc-4.2.5.RELEASE.jar:4.2.5.RELEASE]
        at org.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:859) ~[spring-webmvc-4.2.5.RELEASE.jar:4.2.5.RELEASE]
        at javax.servlet.http.HttpServlet.doHead(HttpServlet.java:244) ~[lib/:na]
        at javax.servlet.http.HttpServlet.service(HttpServlet.java:644) ~[lib/:na]
        at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:844) ~[spring-webmvc-4.2.5.RELEASE.jar:4.2.5.RELEASE]
        at javax.servlet.http.HttpServlet.service(HttpServlet.java:728) ~[lib/:na]
        at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:290) [catalina.jar:6.0.29]
        ... 19 common frames omitted
```

### AbstractMethodError异常

```java
/**
 * Thrown when an application tries to call an abstract method.
 * Normally, this error is caught by the compiler; this error can
 * only occur at run time if the definition of some class has
 * incompatibly changed since the currently executing method was last
 * compiled.
 *
 * @author  unascribed
 * @since   JDK1.0
 */
public
class AbstractMethodError extends IncompatibleClassChangeError {...}
```

就是调用了一个没有实现的抽象方法时会抛出这个异常。

## 原因

### 环境被搞乱

有人把`servlet-api 3.0`的jar包拷贝到了`tomcat6`的lib目录下，替换了原来的jar包，造成spring以为他支持Servlet3.0 但是tomcat却没有实现这个方法。

## Spring 版本

Spring的版本是4.2.5，增加了一些`Servlet 3.0` 的特性支持, 但是使用之前Spring会根据使用的

`Servlet-api`来检测是否支持`Servlet 3.0`

使用的3.0的api

```java
    /**
     * Gets the current status code of this response.
     *
     * @return the current status code of this response
     *
     * @since Servlet 3.0
     */
    public int getStatus();

```

在`FrameworkServlet`中会进行相应的检测和使用：

```java
    /** Checking for Servlet 3.0+ HttpServletResponse.getStatus() */
    private static final boolean responseGetStatusAvailable =
            ClassUtils.hasMethod(HttpServletResponse.class, "getStatus");


private void publishRequestHandledEvent(
HttpServletRequest request, HttpServletResponse response, long startTime, Throwable failureCause) {

    if (this.publishEvents) {
        // Whether or not we succeeded, publish an event.
        long processingTime = System.currentTimeMillis() - startTime;
        int statusCode = (responseGetStatusAvailable ? response.getStatus() : -1);
        this.webApplicationContext.publishEvent(
            new ServletRequestHandledEvent(this,
                    request.getRequestURI(), request.getRemoteAddr(),
                    request.getMethod(), getServletConfig().getServletName(),
                    WebUtils.getSessionId(request), getUsernameForRequest(request),
                    processingTime, failureCause, statusCode));
    }
}
```

### 为什么编译时没有报错

>当前的JVM规范中，与方法调用相关的指令有4个：invokevirtual、invokeinterface、invokestatic与invokespecial。其中调用接口方法时使用的JVM指令是invokeinterface。这个指令与另外3个方法调用指令有一个显著的差异：它不要求JVM的校验器（verifier）检查被调用对象（receiver）的类型；另外3个方法调用指令都要求校验被调用对象。也就是说，使用invokeinterface时如果被调用对象没有实现指定的接口，则应该在运行时而不是链接时抛出异常；而另外3个方法调用指令都要求在链接时抛出异常。 

这也是为啥类的载入是成功的，但是tomcat里面没有实现那个方法。

## servlet和tomcat的对应关系

{% asset_img tomcat-servlet.jpg  tomcat和Servlet的版本对应关系 %}

## 参考

1. [JVM在校验阶段不检查接口的实现状况 - Script Ahead, Code Behind - ITeye技术网站](http://rednaxelafx.iteye.com/blog/400362)

2. [Apache Tomcat® - Which Version Do I Want?](http://tomcat.apache.org/whichversion.html)