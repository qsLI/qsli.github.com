---
title: JDK的HttpURLConnection强制把GET请求转成了POST
tags: HttpURLConnection
category: java
toc: true
typora-root-url: JDK的HttpURLConnection强制把GET请求转成了POST
typora-copy-images-to: JDK的HttpURLConnection强制把GET请求转成了POST
date: 2020-05-13 01:22:39
---





## 现象

升级了下feign底层的client，换成了httpclient，然后qa同学在测试的时候，发现有一个接口挂了。

![image-20200513005934085](/image-20200513005934085.png)

接口如下：

```java
/**
     * 查询房间信息
     *
     * @param roomQueryParam
     * @return
     */
@Headers(HttpConstants.HEADER_CONTENT_TYPE_JSON)
@RequestLine("GET /room/queryRooms")
List<RoomDTO> queryRooms(@Valid RoomQueryParam roomQueryParam);
```

接口上声明的是GET方法，再看controller的实现：

```java
/**
     * 查询房间信息
     *
     * @param roomQueryParam
     * @return
     */
@Override
@RequestMapping(value = "/queryRooms", method = RequestMethod.POST)
@ApiOperation(value = "条件查询房间信息", httpMethod = "POST", produces = "application/json;charset=UTF-8", consumes = "application/json;")
public List<RoomDTO> queryRooms(
  @Valid @NotNull @RequestBody @ApiParam(value = "房间查询参数", required = true) RoomQueryParam roomQueryParam) {
  return roomService.queryRooms(roomQueryParam);
}
```

**controller上只允许POST请求**，但是线上一直是ok的。

看feign的日志：

```bash
2020-05-12 22:20:59.051 INFO [pms-api,de87cf7f069503a3,de87cf7f069503a3,true] --- [o-10026-exec-14] http.consumer.log                        : [GalaxyRoomRemote#queryRooms]
GET http://192.168.16.212:10024/room/queryRooms HTTP/1.1
Content-Type: application/json;charset=UTF-8
Content-Length: 86
appCode: pms

{
  "chainId" : 114,
  "roomNo" : "8235",
  "roomTypeId" : [ ],
  "cleanState" : [ ]
}
 <--- HTTP/1.1 200  elapsed : 13 ms
connection: keep-alive
content-type: application/json;charset=UTF-8
date: Tue, 12 May 2020 14:20:59 GMT
keep-alive: timeout=20
transfer-encoding: chunked
zipkin-trace-id: de2d912a29ae1a91
 <--- END HTTP (468-byte body)
```

**确实是GET请求！** 再看server端的tomcat的access日志：

```bash

2020-05-12 22:20:59.050 INFO [galaxy,de2d912a29ae1a91,de2d912a29ae1a91,false] --- [io-10024-exec-7] http.request.response.log                :
POST http://192.168.16.212:10024/room/queryRooms?
content-type: application/json;charset=UTF-8
appcode: pms
accept: */*
cache-control: no-cache
pragma: no-cache
user-agent: Java/1.8.0_171
host: 192.168.16.212:10024
connection: keep-alive

{  "chainId" : 114,  "roomNo" : "8235",  "roomTypeId" : [ ],  "cleanState" : [ ]}

ret code 200, start time 1589293259041 --> end time 1589293259050, cost: 9
```

**神奇的是变成了POST请求**！

### 到底是什么请求？

这俩日志肯定有一个撒了谎，这时候只有请出地藏菩萨了。用tcpdump抓包后发现：

```bash
$ sudo tcpdump -n -S -s 0 -A    dst port 8182   | grep "queryRooms"  -C40 --color

01:02:45.933534 IP 192.168.6.212.38430 > 192.168.1.3.vmware-fdm: Flags [P.], seq 1572827156:1572827402, ack 904633996, win 981, options [nop,nop,TS val 1568347176 ecr 3383828365], length 246
E..*..@.@.*.............].p.5.......r......
]{.(....POST /room/queryRooms HTTP/1.1
Content-Type: application/json;charset=UTF-8
appCode: pms
Accept: */*
Cache-Control: no-cache
Pragma: no-cache
User-Agent: Java/1.8.0_171
Host: 192.168.1.3:8182
Connection: keep-alive
Content-Length: 89
```

tcp包，告诉我们这是一个post！


## 原因

### 初步定位

简单写了个单测，debug了下新旧代码，发现了经过下面的代码之后，请求方式就变了：

```java
// sun.net.www.protocol.http.HttpURLConnection#getOutputStream0
 private synchronized OutputStream getOutputStream0() throws IOException {
        try {
            if (!doOutput) {
                throw new ProtocolException("cannot write to a URLConnection"
                               + " if doOutput=false - call setDoOutput(true)");
            }

            if (method.equals("GET")) {
                method = "POST"; // Backward compatibility
            }
          // 省略
}
```



搜了下， 发现了stackoverflow上有人问过了：

> The `httpCon.setDoOutput(true);` implicitly set the request method to POST because that's the default method whenever you want to send a request body.
>
> If you want to use GET, remove that line and remove the `OutputStreamWriter out = new OutputStreamWriter(httpCon.getOutputStream());` line. You don't need to send a request body for GET requests.

升级为httpclient， 就没有这个兼容，直接就报错了。至于为啥要升级成httpclient，因为feign默认的是没有连接池的：

```java
// feign.Client.Default#convertAndSend
 HttpURLConnection convertAndSend(Request request, Options options) throws IOException {
   // 每次打开一个连接   
   final HttpURLConnection
          connection =
          (HttpURLConnection) new URL(request.url()).openConnection();
      if (connection instanceof HttpsURLConnection) {
        HttpsURLConnection sslCon = (HttpsURLConnection) connection;
        if (sslContextFactory != null) {
          sslCon.setSSLSocketFactory(sslContextFactory);
        }
        if (hostnameVerifier != null) {
          sslCon.setHostnameVerifier(hostnameVerifier);
        }
      }
      connection.setConnectTimeout(options.connectTimeoutMillis());
      connection.setReadTimeout(options.readTimeoutMillis());
      connection.setAllowUserInteraction(false);
      connection.setInstanceFollowRedirects(true);
      connection.setRequestMethod(request.method());

      Collection<String> contentEncodingValues = request.headers().get(CONTENT_ENCODING);
      boolean
          gzipEncodedRequest =
          contentEncodingValues != null && contentEncodingValues.contains(ENCODING_GZIP);
      boolean
          deflateEncodedRequest =
          contentEncodingValues != null && contentEncodingValues.contains(ENCODING_DEFLATE);

      boolean hasAcceptHeader = false;
      Integer contentLength = null;
      for (String field : request.headers().keySet()) {
        if (field.equalsIgnoreCase("Accept")) {
          hasAcceptHeader = true;
        }
        for (String value : request.headers().get(field)) {
          if (field.equals(CONTENT_LENGTH)) {
            if (!gzipEncodedRequest && !deflateEncodedRequest) {
              contentLength = Integer.valueOf(value);
              connection.addRequestProperty(field, value);
            }
          } else {
            connection.addRequestProperty(field, value);
          }
        }
      }
      // Some servers choke on the default accept string.
      if (!hasAcceptHeader) {
        connection.addRequestProperty("Accept", "*/*");
      }

      if (request.body() != null) {
        if (contentLength != null) {
          connection.setFixedLengthStreamingMode(contentLength);
        } else {
          connection.setChunkedStreamingMode(8196);
        }
        connection.setDoOutput(true);
        OutputStream out = connection.getOutputStream();
        if (gzipEncodedRequest) {
          out = new GZIPOutputStream(out);
        } else if (deflateEncodedRequest) {
          out = new DeflaterOutputStream(out);
        }
        try {
          out.write(request.body());
        } finally {
          try {
            out.close();
          } catch (IOException suppressed) { // NOPMD
          }
        }
      }
      return connection;
    }
```



### GET可以有BODY吗？

mdn:

> The final part of the request is its body. Not all requests have one: requests fetching resources, like `GET`, `HEAD`, `DELETE`, or `OPTIONS`, usually don't need one. Some requests send data to the server in order to update it: as often the case with `POST` requests (containing HTML form data).

Stackoverflow:

> The RFC2616 referenced as "HTTP/1.1 spec" is now obsolete. In 2014 it was replaced by RFCs 7230-7237. Quote "the message-body SHOULD be ignored when handling the request" has been deleted. It's now just "Request message framing is independent of method semantics, even if the method doesn't define any use for a message body" The 2nd quote "The GET method means retrieve whatever information ... is identified by the Request-URI" was deleted. - From a comment

早期是不让有body的，JDK这么做也是有历史原因的。

后来RFC更新了，GET可以有body，一般不建议这么做。

## 参考

- [java - HttpURLConnection sends a POST request even though httpCon.setRequestMethod("GET"); is set - Stack Overflow](https://stackoverflow.com/questions/8760052/httpurlconnection-sends-a-post-request-even-though-httpcon-setrequestmethodget)
- [rest - HTTP GET with request body - Stack Overflow](https://stackoverflow.com/questions/978061/http-get-with-request-body)
- [HTTP Messages - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Messages)

