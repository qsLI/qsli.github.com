title: tomcat access log 格式设置
tags: access-log
category: tomcat
toc: true

date: 2016-12-23 00:43:10
---


## Tomcat access log 日志格式


文件位置: `conf/server.xml`

默认配置

```xml
        <!-- Access log processes all example.
             Documentation at: /docs/config/valve.html
             Note: The pattern used is equivalent to using pattern="common" -->
        <Valve className="org.apache.catalina.valves.AccessLogValve" directory="logs"
               prefix="localhost_access_log." suffix=".txt"
               pattern="%h %l %u %t &quot;%r&quot; %s %b" />
```

|名称 | 含义|
|-|-|
|%a | Remote IP address|
|%A | Local IP address|
|%b | Bytes sent, excluding HTTP headers, or '-' if zero|
|%B | Bytes sent, excluding HTTP headers|
|%h | Remote host name (or IP address if enableLookups for the connector is false)|
|%H | Request protocol|
|%l | Remote logical username from identd (always returns '-')|
|%m | Request method (GET, POST, etc.)|
|%p | Local port on which this request was received|
|%q | Query string (prepended with a '?' if it exists)|
|%r | First line of the request (method and request URI)|
|%s | HTTP status code of the response|
|%S | User session ID|
|%t | Date and time, in Common Log Format|
|%u | Remote user that was authenticated (if any), else '-'|
|%U | Requested URL path|
|%v | Local server name|
|%D | Time taken to process the request, in millis|
|%T | Time taken to process the request, in seconds|
|%F | Time taken to commit the response, in millis|
|%I | Current request thread name (can compare later with stacktraces)|

默认的配置打出来的access日志如下：

||||||||
| -| -| -|-|- |- | -|
|127.0.0.1 |-| -| [07/Oct/2016:22:31:56 +0800]| "GET /dubbo/ HTTP/1.1" |404 |963|
|远程IP |logical username| remote user|时间和日期| http请求的第一行| 状态码| 除去http头的发送大小| 

### header、cookie、session其他字段的支持

> There is also support to write information incoming or outgoing headers, cookies, session or request attributes and special timestamp formats. It is modeled after the Apache HTTP Server log configuration syntax:

|名称 | 含义|
|-|-|
|%{xxx}i |for incoming headers|
|%{xxx}o |for outgoing response headers|
|%{xxx}c |for a specific cookie|
|%{xxx}r |xxx is an attribute in the ServletRequest|
|%{xxx}s |xxx is an attribute in the HttpSession|
|%{xxx}t |xxx is an enhanced SimpleDateFormat pattern|

例如： `%{X-Forwarded-For}i`即可打印出实际访问的ip地址（考虑到ng的反向代理）

HTTP头一般格式如下:

`X-Forwarded-For: client1, proxy1, proxy2`
>其中的值通过一个 逗号+空格 把多个IP地址区分开, 最左边（client1）是最原始客户端的IP地址, 代理服务器每成功收到一个请求，就把请求来源IP地址添加到右边。 在上面这个例子中，这个请求成功通过了三台代理服务器：proxy1, proxy2 及 proxy3。请求由client1发出，到达了proxy3（proxy3可能是请求的终点）。请求刚从client1中发出时，XFF是空的，请求被发往proxy1；通过proxy1的时候，client1被添加到XFF中，之后请求被发往proxy2;通过proxy2的时候，proxy1被添加到XFF中，之后请求被发往proxy3；通过proxy3时，proxy2被添加到XFF中，之后请求的的去向不明，如果proxy3不是请求终点，请求会被继续转发。

>鉴于伪造这一字段非常容易，应该谨慎使用X-Forwarded-For字段。正常情况下XFF中最后一个IP地址是最后一个代理服务器的IP地址, 这通常是一个比较可靠的信息来源。


## 参考

1. [The Valve Component](http://tomcat.apache.org/tomcat-7.0-doc/config/valve.html)

2. [X-Forwarded-For](https://zh.wikipedia.org/wiki/X-Forwarded-For)