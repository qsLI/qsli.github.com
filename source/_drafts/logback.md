---
title: logback 使用
tags: logback
category: java
toc: true
abbrlink: 33648
---

# Logback总结

配置示例：

{% gist 06f32243a766ea3d5da8746e9de25729 %}

### Colored Log in Console

highlight 关键字

```xml
<appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
        <pattern>
            %d{yyyy-MM-dd HH:mm:ss.SSS} %highlight(%-5level) [%-40.40logger{10}] - %msg%n
        </pattern>
    </encoder>
</appender>
```
效果:

{%  asset_img   colored.jpg  %}

## 日志级别

logback定义了以下日志级别：

```java
  /**
   * The <code>OFF</code> is used to turn off logging.
   */
  public static final Level OFF = new Level(OFF_INT, "OFF");

  /**
   * The <code>ERROR</code> level designates error events which may or not
   * be fatal to the application.
   */
  public static final Level ERROR = new Level(ERROR_INT, "ERROR");

  /**
   * The <code>WARN</code> level designates potentially harmful situations.
   */
  public static final Level WARN = new Level(WARN_INT, "WARN");

  /**
   * The <code>INFO</code> level designates informational messages
   * highlighting overall progress of the application.
   */
  public static final Level INFO = new Level(INFO_INT, "INFO");

  /**
   * The <code>DEBUG</code> level designates informational events of lower
   * importance.
   */
  public static final Level DEBUG = new Level(DEBUG_INT, "DEBUG");

  /**
   * The <code>TRACE</code> level designates informational events of very low
   * importance.
   */
  public static final Level TRACE = new Level(TRACE_INT, "TRACE");

  /**
   * The <code>ALL</code> is used to turn on all logging.
   */
  public static final Level ALL = new Level(ALL_INT, "ALL");

```

### 按照包名设置日志级别

```xml
    <logger name="com.air.nio" level="error">
        <appender-ref ref="STDOUT" />
    </logger>
```

通过上面的配置，`com.air.nio`包下打印的日志级别必须在`error`才能打印出来。

## 打了好几遍日志？？？ —— additivity

>The output of a log statement of logger L will go to all the appenders in L and its ancestors. This is the meaning of the term "appender additivity"



![image-20180819180255641](/image-20180819180255641.png)

catalina.out - 启动日志，和localhost日志功能类似，默认ROOT logger打印至此，其他未显式配置的logger也走这里， 所以尽量不要过滤级别
error.log - 异常日志， 配置了`additivity=true`的必须多加一个error log对应的appender（打印error级别的日志）
sys.log  - 业务日志


## logger 的层级关系

>A logger is said to be an ancestor of another logger if its name followed by a dot is a prefix of the descendant logger name. A logger is said to be a parent of a child logger if there are no ancestors between itself and the descendant logger.

```java
Logger x = LoggerFactory.getLogger("wombat"); 
Logger y = LoggerFactory.getLogger("wombat");
```

x and y refer to exactly the same logger object.


## Filter





# 参考
1. [COLORED LOGS IN A CONSOLE (ANSI STYLING)](http://blog.codeleak.pl/2014/02/colored-logs-in-console-ansi-styling.html)

2. [Chapter 7: Filters](https://logback.qos.ch/manual/filters.html)

3. [Chapter 2: Architecture](https://logback.qos.ch/manual/architecture.html)

