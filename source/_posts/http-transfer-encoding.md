---
title: http-transfer-encoding探秘
tags: tranfer-encoding
category: http
toc: true
typora-root-url: http-transfer-encoding
typora-copy-images-to: http-transfer-encoding
date: 2020-07-26 01:09:13
---



### 缘起

公司有一些后台系统支持导出Excel，导出量大的时候机器直接oom了。调用流程大概如下：

> db ——> tomcat ——> http协议 ——> client

最初的开发人员，似乎并没有考虑这个问题，从db到tomcat都是一个sql直接select的。

有同事改进了一版，采用分页查询，然后用支持流式写入的excel工具。但是这样真的就不会oom了吗？

其实得**整条链路上都是流式**的才可以，读到一部分数据，立马发出去，这部分内存释放了，也就不会oom了。

所以还差tomcat到client的流式传输，那就不得不说到`Content-Lenght`和`Transfer-Encoding`这俩参数了。

### 小实验

写一个普通的servlet，代码如下：

```java
/**
 * @author 代故
 * @date 2020/7/24 9:57 PM
 */
@WebServlet("/foo")
public class TransferEncodingServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        final PrintWriter writer = resp.getWriter();
        writer.print("hello");
        writer.flush();
        try {
            TimeUnit.SECONDS.sleep(10);
            writer.print("world");
            writer.close();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        final PrintWriter writer = resp.getWriter();
        resp.addHeader("Content-Type", "application/octet-stream;charset=UTF-8");
        writer.print("hello world");
    }
}
```

然后curl一下，看下结果：

#### post接口

```bash
➜  qsli.github.com curl -XPOST  "http://localhost:8080/servlet/foo" -v
*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 8080 (#0)
> POST /servlet/foo HTTP/1.1
> Host: localhost:8080
> User-Agent: curl/7.54.0
> Accept: */*
>
< HTTP/1.1 200
< Content-Type: application/octet-stream;charset=ISO-8859-1
< Content-Length: 11
< Date: Sat, 25 Jul 2020 16:03:25 GMT
<
* Connection #0 to host localhost left intact
hello world
```

这个post接口，返回的header中直接告诉了我们`Content-Length`是11，抓包看下传输过程是否分块：

![image-20200726000650709](/image-20200726000650709.png)

response在frame-7中：

![image-20200726000832630](/image-20200726000832630.png)

一个tcp就把结果返回了。

#### get接口

```bash
➜  qsli.github.com curl -XGET  "http://localhost:8080/servlet/foo" -v
Note: Unnecessary use of -X or --request, GET is already inferred.
*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 8080 (#0)
> GET /servlet/foo HTTP/1.1
> Host: localhost:8080
> User-Agent: curl/7.54.0
> Accept: */*
>
< HTTP/1.1 200
< Transfer-Encoding: chunked
< Date: Sat, 25 Jul 2020 16:09:48 GMT
<
* Connection #0 to host localhost left intact
helloworld%
```

这次并没有`Content-Length`，但是多了个`Transfer-Encoding`,抓包结果如下：

![image-20200726001126073](/image-20200726001126073.png)

结果在frame-19

![image-20200726001503151](/image-20200726001503151.png)

可以看到有三个`Data chunk`，每个`chunk`的组成是三部分：

> 1. Chunk size
> 2. Data
> 3. Chunk boundary

wireshark自动帮我们聚合展示了，看具体的tcp包：

![image-20200726002220628](/image-20200726002220628.png)

分别在Frame-9和Frame-19中，Frame-9传了header信息和hello，Frame-19的包传了world和结束信息。

### why?

先看下两个的定义：

#### `Content-Lenght`

> The **`Content-Length`** entity header indicates the size of the entity-body, in bytes, sent to the recipient.
>
> Content-Length: <length>
>
> The length in decimal number of octets.

#### `Transfer-Encoding`

>The **`Transfer-Encoding`** header specifies the form of encoding used to safely transfer the payload body to the user.
>
>[HTTP/2](https://wikipedia.org/wiki/HTTP/2) doesn't support HTTP 1.1's chunked transfer encoding mechanism, as it provides its own, more efficient, mechanisms for data streaming.
>
>Chunked encoding is useful when **larger amounts of data** are sent to the client and the total size of the response may not be known until the request has been fully processed. For example, when generating a large HTML table resulting from a database query or when transmitting large images.

Tranfer-encoding需要配合**长连接**来使用：

> 暂时把 Transfer-Encoding 放一边，我们来看 HTTP 协议中另外一个重要概念：**Persistent Connection（持久连接，通俗说法长连接）**。我们知道 HTTP 运行在 TCP 连接之上，自然也有着跟 TCP 一样的三次握手、慢启动等特性，为了尽可能的提高 HTTP 性能，使用持久连接就显得尤为重要了。为此，HTTP 协议引入了相应的机制。
>
> HTTP/1.0 的持久连接机制是后来才引入的，通过 `Connection: keep-alive` 这个头部来实现，服务端和客户端都可以使用它告诉对方在发送完数据之后不需要断开 TCP 连接，以备后用。**HTTP/1.1 则规定所有连接都必须是持久的，除非显式地在头部加上 `Connection: close`。**所以实际上，HTTP/1.1 中 Connection 这个头部字段已经没有 keep-alive 这个取值了，但由于历史原因，很多 Web Server 和浏览器，还是保留着给 HTTP/1.1 长连接发送 `Connection: keep-alive` 的习惯。



#### Tomcat中的实现

为什么flush之后就变成了chunked传输？这里tomcat的源码版本是`7.0.47`，对应的Response是``

```java
// org.apache.catalina.connector.OutputBuffer#doFlush
/**
     * Flush bytes or chars contained in the buffer.
     *
     * @param realFlush <code>true</code> if this should also cause a real network flush
     * @throws IOException An underlying IOException occurred
     */
protected void doFlush(boolean realFlush) throws IOException {

  if (suspended) {
    return;
  }

  try {
    doFlush = true;
    if (initial) {
      coyoteResponse.sendHeaders();
      initial = false;
    }
    if (cb.remaining() > 0) {
      flushCharBuffer();
    }
    if (bb.remaining() > 0) {
      flushByteBuffer();
    }
  } finally {
    doFlush = false;
  }

  if (realFlush) {
    coyoteResponse.action(ActionCode.CLIENT_FLUSH, null);
    // If some exception occurred earlier, or if some IOE occurred
    // here, notify the servlet with an IOE
    if (coyoteResponse.isExceptionPresent()) {
      throw new ClientAbortException(coyoteResponse.getErrorException());
    }
  }

}
// org.apache.catalina.connector.OutputBuffer#flushCharBuffer
private void flushCharBuffer() throws IOException {
  realWriteChars(cb.slice());
  // 这里清空了
  clear(cb);
}

// nio
private void clear(Buffer buffer) {
  buffer.rewind().limit(0);
}

// org.apache.coyote.AbstractProcessor#action
 case CLIENT_FLUSH: {
   action(ActionCode.COMMIT, null);
   try {
     flush();
   } catch (IOException e) {
     setErrorState(ErrorState.CLOSE_CONNECTION_NOW, e);
     response.setErrorException(e);
   }
   break;
 }
```

![image-20200726005435610](/image-20200726005435610.png)

最后直接调用socket的flush：

![image-20200726005800544](/image-20200726005800544.png)

之后就是系统的TCP/IP协议栈处理了。

### 参考

1. [Content-Length - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Length)
2. [Transfer-Encoding - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Transfer-Encoding)
3. [HTTP 协议中的 Transfer-Encoding | JerryQu 的小站](https://imququ.com/post/transfer-encoding-header-in-http.html)
4. [transfer-encoding和content-length的不同实现 – i flym](https://www.iflym.com/index.php/code/20140601001.html)

