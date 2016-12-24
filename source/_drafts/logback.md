title: logback 使用
tags: logback
category: java
toc: true

---

# Logback总结

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




# 参考
1. [COLORED LOGS IN A CONSOLE (ANSI STYLING)](http://blog.codeleak.pl/2014/02/colored-logs-in-console-ansi-styling.html)

