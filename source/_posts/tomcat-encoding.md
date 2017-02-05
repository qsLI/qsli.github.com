---
title: tomcat中文编码设置
tags: encoding
category: tomcat
toc: true
date: 2016-12-23 00:43:20
---


## tomcat中文乱码

tomcat 默认的编`ISO-8859-1`编码，部分中文会出现乱码

> *URIEncoding*   
This specifies the character encoding used to decode the URI bytes, after %xx decoding the URL. If not specified, ISO-8859-1 will be used.


## 编码设置

`conf/server.xml`

修改前：

```xml
<Connector port="8080" redirectPort="8443" connectionTimeout="20000" protocol="HTTP/1.1"/>
```

修改后：

```xml
    <Connector port="8080" redirectPort="8443" connectionTimeout="20000" 
    protocol="HTTP/1.1"               
    URIEncoding="UTF-8"/>
```

## 参考

1. [The HTTP Connector](https://tomcat.apache.org/tomcat-7.0-doc/config/http.html)

