---
title: http协议详解
toc: true
tags: http
category: web
abbrlink: 13962
---


## HTTP Request组成

{% asset_img  http_request_message.png %}

CRLF分隔

```
HTTP-message   = Request | Response     ; HTTP/1.1 messages


 generic-message = start-line
                          *(message-header CRLF)
                          CRLF
                          [ message-body ]
        start-line      = Request-Line | Status-Line

    message-header = field-name ":" [ field-value ]
       field-name     = token
       field-value    = *( field-content | LWS )
       field-content  = <the OCTETs making up the field-value
                        and consisting of either *TEXT or combinations
                        of token, separators, and quoted-string>

       message-body = entity-body
                    | <entity-body encoded as per Transfer-Encoding>
```

### Request LINE

### Request HEADER

### PAYLOAD

## HTTP Response组成

### URI 协议 

### Response HEADER

### Response Body


### CGI示例

cache 

keep-alive

websocket

## 缺点

文本协议，需要转换


# HTTP 2.0

> SPDY（发音如英语：speedy），一种开放的网络传输协议，由Google开发，用来发送网页内容。基于传输控制协议（TCP）的应用层协议。SPDY也就是HTTP/2的前身。Google最早是在Chromium中提出的SPDY协议[1]。被用于Google Chrome浏览器中来访问Google的SSL加密服务。SPDY并不是首字母缩略字，而仅仅是"speedy"的缩写。SPDY现为Google的商标[2]。HTTP/2的关键功能主要来自SPDY技术，换言之，SPDY的成果被采纳而最终演变为HTTP/2。

## 参考

[In Introduction to HTTP Basics](https://www.ntu.edu.sg/home/ehchua/programming/webprogramming/HTTP_Basics.html)

[HTTP2.0的奇妙日常 | Web前端 腾讯AlloyTeam Blog | 愿景: 成为地球卓越的Web团队！](http://www.alloyteam.com/2015/03/http2-0-di-qi-miao-ri-chang/)

[Ed Burns谈HTTP/2和Java EE Servlet 4规范](http://www.infoq.com/cn/news/2015/04/burns-servlet-http2)

[HTTP/1.1: HTTP Message](https://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html)