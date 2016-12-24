title: JS跨域原理
tags: ajax
category: fe
toc: true

date: 2016-10-02 11:42:13
---


## 同源策略

>同源策略限制了一个源（origin）中加载文本或脚本与来自其它源（origin）中资源的交互方式。

例如在使用XMLHttpRequest 或 <img> 标签时则会受到同源策略的约束。交互通常分为三类：

1. 通常允许进行跨域写操作（`Cross-origin writes`）。例如链接（links），重定向以及表单提交。特定少数的HTTP请求需要添加 preflight。

2. 通常允许跨域资源嵌入（`Cross-origin embedding`）。
3. 通常不允许跨域读操作（`Cross-origin reads`）。

下表给出了相对`http://store.company.com/dir/page.html`同源检测的示例:

|URL	|结果|	原因|
|---|---|
|http://store.company.com/dir2/other.html	|成功|	 |
|http://store.company.com/dir/inner/another.html	|成功|	 |
|https://store.company.com/secure.html	|失败|	协议不同|
|http://store.company.com:81/dir/etc.html	|失败|	端口不同|
|http://news.company.com/dir/other.html	|失败|	主机名不同|



## ajax 跨域

> 同源政策规定，AJAX请求只能发给同源的网址，否则就报错。

请求其他域资源的时候，由于同源策略的限制一般会出现如下的错误：

>XMLHttpRequest cannot load http://xxxxx. No 'Access-Control-Allow-Origin' header is present on the requested resource. Origin 'null' is therefore not allowed access. The response had HTTP status code 500.

### JSONP

`<script src="..."></script>` 标签是支持跨域的，JSONP的原理就是使用这个标签。

服务器会在传给浏览器前将JSON数据填充到回调函数中

{% gist cc896797f4ef746e9cbc75b8f6ebc24f %}

上述代码中`    return param + '(' + json.dumps(data) + ')'`是将返回的数据填充到回调函数中

前端的代码如下：

{% gist 8d90c2a0599818488a647177b4f196c2 %}

使用了jQuery的ajax请求

**但是JSONP的方式只支持get请求**

### CORS (`Cross-Origin Resource Sharing`)

CORS是一个W3C标准, 不仅支持GET方式还支持POST方式的跨域请求

> 浏览器将CORS请求分成两类：简单请求（simple request）和非简单请求（not-so-simple request）。

请求的流程图如下：
{%  asset_img   cors.png  %}




详细原理参考阮一峰老师的[跨域资源共享 CORS 详解](http://www.ruanyifeng.com/blog/2016/04/cors.html)

### Websocket

>WebSocket是一种通信协议，使用ws://（非加密）和wss://（加密）作为协议前缀。该协议不实行同源政策，只要服务器支持，就可以通过它进行跨源通信。

详细原理参考阮一峰老师的 [浏览器的同源策略](https://developer.mozilla.org/zh-CN/docs/Web/Security/Same-origin_policy)

## 参考链接

1. [跨域资源共享 CORS 详解](http://www.ruanyifeng.com/blog/2016/04/cors.html)

2. [浏览器的同源策略](https://developer.mozilla.org/zh-CN/docs/Web/Security/Same-origin_policy)

3. [浏览器同源政策及其规避方法](http://www.ruanyifeng.com/blog/2016/04/same-origin-policy.html)

4. [ ajax 设置Access-Control-Allow-Origin实现跨域访问](http://blog.csdn.net/fdipzone/article/details/46390573)

5. [使用CORS（译）](http://liuwanlin.info/corsxiang-jie/)
