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


## 按照包名设置日志级别

```xml
    <logger name="com.air.nio" level="error">
        <appender-ref ref="STDOUT" />
    </logger>
```

通过上面的配置，`com.air.nio`包下打印的日志级别必须在`error`才能打印出来。


## Filter





# 参考
1. [COLORED LOGS IN A CONSOLE (ANSI STYLING)](http://blog.codeleak.pl/2014/02/colored-logs-in-console-ansi-styling.html)

2. [Chapter 7: Filters](https://logback.qos.ch/manual/filters.html)

