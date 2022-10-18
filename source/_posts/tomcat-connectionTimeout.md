---
title: tomcat配置connectionTimeout
tags: tomcat
category: tomcat
toc: true
typora-root-url: tomcat配置connectionTimeout
typora-copy-images-to: tomcat配置connectionTimeout
date: 2022-10-18 23:32:15
---



> The number of milliseconds this **Connector** will wait, after accepting a connection, for the request URI line to be presented. Use a value of -1 to indicate no (i.e. infinite) timeout. The default value is 60000 (i.e. 60 seconds) but note that the standard server.xml that ships with Tomcat sets this to 20000 (i.e. 20 seconds). Unless **disableUploadTimeout** is set to `false`, this timeout will also be used when reading the request body (if any).

从连接被accept之后，到request line出现的超时时间，单位是毫秒。



## 验证

### telnet

使用telnet连接上tomcat的端口，然后不发送请求，等待超时。得到如下结果，耗时大概20s左右。

```bash
➜  qsli.github.com (hexo|✚23…) time telnet localhost 8087
Trying ::1...
Connected to localhost.
Escape character is '^]'.
Connection closed by foreign host.
telnet localhost 8087  0.01s user 0.01s system 0% cpu 20.064 total
```

### arthas

使用arthas查看mbean，找到超时的配置：

```bash
[arthas@77045]$ mbean Catalina:type=Connector,port=8087
 OBJECT_NAME               Catalina:type=Connector,port=8087
------------------------------------------------------------------------------------------------------------------------
 NAME                      VALUE
------------------------------------------------------------------------------------------------------------------------
 modelerType               null
 maxPostSize               2097152
 proxyName                 null
 scheme                    http
 className                 null
 acceptCount               100
 secret                    Unavailable
 secure                    false
 threadPriority            -1
 maxSwallowSize            2097152
 ajpFlush                  null
 maxSavePostSize           4096
 proxyPort                 0
 sslProtocols              null
 protocol                  HTTP/1.1
 maxParameterCount         10000
 useIPVHosts               false
 stateName                 STARTED
 redirectPort              8443
 allowTrace                false
 ciphers                   HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!kRSA
 protocolHandlerClassName  org.apache.coyote.http11.Http11NioProtocol
 maxThreads                -1
 connectionTimeout         20000
 tcpNoDelay                true
 useBodyEncodingForURI     false
 connectionLinger          -1
 processorCache            200
 keepAliveTimeout          20000
 maxKeepAliveRequests      100
 address                   null
 localPort                 8087
 enableLookups             false
 packetSize                null
 URIEncoding               UTF-8
 minSpareThreads           -1
 executorName              tomcatThreadPool
 ciphersUsed               null
 maxHeaderCount            100
 port                      8087
 xpoweredBy                false
```

> connectionTimeout         20000

配置的是20s



## 代码

实际是socket timeout

```java
// org.apache.coyote.AbstractProtocol#getConnectionTimeout
 /*
     * When Tomcat expects data from the client, this is the time Tomcat will
     * wait for that data to arrive before closing the connection.
     */
public int getConnectionTimeout() {
  // Note that the endpoint uses the alternative name
  return endpoint.getSoTimeout();
}
public void setConnectionTimeout(int timeout) {
  // Note that the endpoint uses the alternative name
  endpoint.setSoTimeout(timeout);
}

// org.apache.tomcat.util.net.AbstractEndpoint#setSoTimeout
public void setSoTimeout(int soTimeout) { socketProperties.setSoTimeout(soTimeout); }
```

使用的地方，设置在了NioSocketWrapper的ReadTimeout和WriteTimeout上：

```java
//org.apache.tomcat.util.net.NioEndpoint.Poller#register
 /**
         * Registers a newly created socket with the poller.
         *
         * @param socket    The newly created socket
         */
public void register(final NioChannel socket) {
  socket.setPoller(this);
  NioSocketWrapper ka = new NioSocketWrapper(socket, NioEndpoint.this);
  socket.setSocketWrapper(ka);
  ka.setPoller(this);
  // 这里，read/write timeout
  ka.setReadTimeout(getSocketProperties().getSoTimeout());
  ka.setWriteTimeout(getSocketProperties().getSoTimeout());
  ka.setKeepAliveLeft(NioEndpoint.this.getMaxKeepAliveRequests());
  ka.setSecure(isSSLEnabled());
  ka.setReadTimeout(getSoTimeout());
  ka.setWriteTimeout(getSoTimeout());
  PollerEvent r = eventCache.pop();
  ka.interestOps(SelectionKey.OP_READ);//this is what OP_REGISTER turns into.
  if ( r==null) r = new PollerEvent(socket,ka,OP_REGISTER);
  else r.reset(socket,ka,OP_REGISTER);
  addEvent(r);
}
```

Poller线程中会check这个key是否过期，并不是每次都check，而是有一定的策略：

>  However, do process timeouts if any of the following are true:
>
> - the **selector** simply **timed out** (suggests there isn't much load)
> - the **nextExpiration** time has **passed**
> - the server **socket** is **being closed**

```java
// org.apache.tomcat.util.net.NioEndpoint.Poller#timeout
protected void timeout(int keyCount, boolean hasEvents) {
  long now = System.currentTimeMillis();
  // This method is called on every loop of the Poller. Don't process
  // timeouts on every loop of the Poller since that would create too
  // much load and timeouts can afford to wait a few seconds.
  // However, do process timeouts if any of the following are true:
  // - the selector simply timed out (suggests there isn't much load)
  // - the nextExpiration time has passed
  // - the server socket is being closed
  if (nextExpiration > 0 && (keyCount > 0 || hasEvents) && (now < nextExpiration) && !close) {
    return;
  }
  //timeout
  int keycount = 0;
  try {
    for (SelectionKey key : selector.keys()) {
      keycount++;
      try {
        NioSocketWrapper ka = (NioSocketWrapper) key.attachment();
        if ( ka == null ) {
          cancelledKey(key); //we don't support any keys without attachments
        } else if (close) {
          key.interestOps(0);
          ka.interestOps(0); //avoid duplicate stop calls
          processKey(key,ka);
        } else if ((ka.interestOps()&SelectionKey.OP_READ) == SelectionKey.OP_READ ||
                   (ka.interestOps()&SelectionKey.OP_WRITE) == SelectionKey.OP_WRITE) {
          boolean isTimedOut = false;
          // Check for read timeout
          // 读超时
          if ((ka.interestOps() & SelectionKey.OP_READ) == SelectionKey.OP_READ) {
            long delta = now - ka.getLastRead();
            long timeout = ka.getReadTimeout();
            isTimedOut = timeout > 0 && delta > timeout;
          }
          // Check for write timeout
          // 写超时
          if (!isTimedOut && (ka.interestOps() & SelectionKey.OP_WRITE) == SelectionKey.OP_WRITE) {
            long delta = now - ka.getLastWrite();
            long timeout = ka.getWriteTimeout();
            isTimedOut = timeout > 0 && delta > timeout;
          }
          // 超时之后处理
          if (isTimedOut) {
            key.interestOps(0);
            ka.interestOps(0); //avoid duplicate timeout calls
            ka.setError(new SocketTimeoutException());
            // 注意这里是SocketEvent.ERROR
            if (!processSocket(ka, SocketEvent.ERROR, true)) {
              cancelledKey(key);
            }
          }
        }
      }catch ( CancelledKeyException ckx ) {
        cancelledKey(key);
      }
    }//for
  } catch (ConcurrentModificationException cme) {
    // See https://bz.apache.org/bugzilla/show_bug.cgi?id=57943
    log.warn(sm.getString("endpoint.nio.timeoutCme"), cme);
  }
  long prevExp = nextExpiration; //for logging purposes only
  nextExpiration = System.currentTimeMillis() +
    socketProperties.getTimeoutInterval();
  if (log.isTraceEnabled()) {
    log.trace("timeout completed: keys processed=" + keycount +
              "; now=" + now + "; nextExpiration=" + prevExp +
              "; keyCount=" + keyCount + "; hasEvents=" + hasEvents +
              "; eval=" + ((now < prevExp) && (keyCount>0 || hasEvents) && (!close) ));
  }
}
```

使用arthas观察下超时时服务端的处理：

```bash
`---ts=2022-10-18 23:38:39;thread_name=http-nio-8087-ClientPoller-0;id=1c;is_daemon=true;priority=5;TCCL=java.net.URLClassLoader@470e2030
    `---[0.269583ms] org.apache.tomcat.util.net.NioEndpoint$Poller:timeout()
        +---[2.06% 0.005542ms ] java.lang.System:currentTimeMillis() #1004
        +---[0.97% 0.002625ms ] java.nio.channels.Selector:keys() #1018
        +---[1.27% 0.003417ms ] java.util.Set:iterator() #1018
        +---[1.64% min=0.00175ms,max=0.002666ms,total=0.004416ms,count=2] java.util.Iterator:hasNext() #1018
        +---[1.04% 0.002791ms ] java.util.Iterator:next() #1018
        +---[0.91% 0.002458ms ] java.nio.channels.SelectionKey:attachment() #1021
        +---[0.99% 0.002666ms ] org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper:interestOps() #1028
        +---[0.60% 0.001625ms ] org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper:interestOps() #1032
        +---[0.74% 0.002ms ] org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper:getLastRead() #1033
        +---[0.85% 0.002291ms ] org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper:getReadTimeout() #1034
        +---[18.01% 0.048541ms ] java.nio.channels.SelectionKey:interestOps() #1044
        +---[2.74% 0.007375ms ] org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper:interestOps() #1045
        +---[7.31% 0.019708ms ] java.net.SocketTimeoutException:<init>() #1046
        +---[3.38% 0.009125ms ] org.apache.tomcat.util.net.NioEndpoint$NioSocketWrapper:setError() #1046
        +---[19.18% 0.051709ms ] org.apache.tomcat.util.net.NioEndpoint:processSocket() #1047
        +---[0.79% 0.002125ms ] java.lang.System:currentTimeMillis() #1061
        +---[0.88% 0.002375ms ] org.apache.tomcat.util.net.SocketProperties:getTimeoutInterval() #1061
        +---[0.88% 0.002375ms ] org.apache.tomcat.util.net.NioEndpoint:access$100() #1063
        `---[1.19% 0.003208ms ] org.apache.juli.logging.Log:isTraceEnabled() #1063
```

超时之后，new了一个SocketTimeoutException，交给processSocket进行处理：

```bash
[arthas@22174]$ trace org.apache.tomcat.util.net.AbstractEndpoint processSocket -v -n 5 --skipJDKMethod false '1==1'
Press Q or Ctrl+C to abort.
Affect(class count: 3 , method count: 1) cost in 123 ms, listenerId: 4
Condition express: 1==1 , result: true
`---ts=2022-10-18 23:41:44;thread_name=http-nio-8087-ClientPoller-1;id=1d;is_daemon=true;priority=5;TCCL=java.net.URLClassLoader@470e2030
    `---[0.355583ms] org.apache.tomcat.util.net.AbstractEndpoint:processSocket()
        +---[5.44% 0.019334ms ] org.apache.tomcat.util.collections.SynchronizedStack:pop() #1040
        +---[8.26% 0.029375ms ] org.apache.tomcat.util.net.SocketProcessorBase:reset() #1044
        +---[4.59% 0.016333ms ] org.apache.tomcat.util.net.AbstractEndpoint:getExecutor() #1046
        `---[25.59% 0.091ms ] java.util.concurrent.Executor:execute() #1048
```

接着跟进，看看是哪里退出的：

```bash
[arthas@22174]$ trace org.apache.tomcat.util.net.NioEndpoint$SocketProcessor doRun -v -n 5 --skipJDKMethod false '1==1'
Press Q or Ctrl+C to abort.
Affect(class count: 1 , method count: 1) cost in 140 ms, listenerId: 5
Condition express: 1==1 , result: true
`---ts=2022-10-18 23:44:40;thread_name=catalina-exec-2;id=1a;is_daemon=true;priority=5;TCCL=java.net.URLClassLoader@470e2030
    `---[1.595584ms] org.apache.tomcat.util.net.NioEndpoint$SocketProcessor:doRun()
        +---[1.79% 0.028584ms ] org.apache.tomcat.util.net.SocketWrapperBase:getSocket() #1430
        +---[1.14% 0.018125ms ] org.apache.tomcat.util.net.NioChannel:getIOChannel() #1431
        +---[1.92% 0.030625ms ] org.apache.tomcat.util.net.NioChannel:getPoller() #1431
        +---[1.19% 0.018916ms ] org.apache.tomcat.util.net.NioEndpoint$Poller:getSelector() #1431
        +---[30.62% 0.488542ms ] java.nio.channels.SocketChannel:keyFor() #1431
        +---[0.91% 0.0145ms ] org.apache.tomcat.util.net.NioChannel:isHandshakeComplete() #1438
        +---[1.07% 0.017ms ] org.apache.tomcat.util.net.NioEndpoint:getHandler() #1471
        +---[2.11% 0.033708ms ] org.apache.tomcat.util.net.AbstractEndpoint$Handler:process() #1471
        +---[24.60% 0.3925ms ] org.apache.tomcat.util.net.NioEndpoint:access$500() #1474
        `---[1.11% 0.017667ms ] org.apache.tomcat.util.collections.SynchronizedStack:push() #1495
        
[arthas@22174]$ trace org.apache.coyote.AbstractProtocol$ConnectionHandler process -v -n 5 --skipJDKMethod false '1==1'
Press Q or Ctrl+C to abort.
Affect(class count: 1 , method count: 1) cost in 659 ms, listenerId: 7
Condition express: 1==1 , result: true
`---ts=2022-10-18 23:49:21;thread_name=catalina-exec-2;id=1a;is_daemon=true;priority=5;TCCL=java.net.URLClassLoader@470e2030
    `---[0.475083ms] org.apache.coyote.AbstractProtocol$ConnectionHandler:process()
        +---[22.07% 0.104833ms ] org.apache.coyote.AbstractProtocol$ConnectionHandler:getLog() #705
        +---[5.65% 0.026833ms ] org.apache.juli.logging.Log:isDebugEnabled() #705
        +---[2.91% 0.013834ms ] org.apache.tomcat.util.net.SocketWrapperBase:getSocket() #714
        +---[3.99% 0.018959ms ] java.util.Map:get() #716
        +---[1.16% 0.0055ms ] org.apache.coyote.AbstractProtocol$ConnectionHandler:getLog() #717
        `---[0.84% 0.004ms ] org.apache.juli.logging.Log:isDebugEnabled() #717
```

由于传入的是SocketEvent.ERROR，在ConnectionHandler中就直接返回了：

```java
// org.apache.coyote.AbstractProtocol.ConnectionHandler#process
@Override
public SocketState process(SocketWrapperBase<S> wrapper, SocketEvent status) {
  if (getLog().isDebugEnabled()) {
    getLog().debug(sm.getString("abstractConnectionHandler.process",
                                wrapper.getSocket(), status));
  }
  if (wrapper == null) {
    // Nothing to do. Socket has been closed.
    return SocketState.CLOSED;
  }

  S socket = wrapper.getSocket();

  Processor processor = connections.get(socket);
  if (processor != null) {
    // Make sure an async timeout doesn't fire
    getProtocol().removeWaitingProcessor(processor);
  } else if (status == SocketEvent.DISCONNECT || status == SocketEvent.ERROR) {
    // Nothing to do. Endpoint requested a close and there is no
    // longer a processor associated with this socket.
    // 走到这里了，最终决定将连接关闭
    return SocketState.CLOSED;
  }
```

## 总结

- connectionTimeout文档上说是连接accept之后，等待requestLine的超时时间，单位毫秒
- 从NIO的代码来看，被当做了read、write的超时
- Poller线程在并不是每次都check超时，而是有一定的策略。在保证超时的语义下，尽量在load低的时候操作。
- 退出流程： 
  - Poller#timeout
  - NioEndpoint$SocketProcessor#run [**SocketEvent.ERROR**]
  - AbstractEndpoint$Handler#process [**SocketState.CLOSED**] 


## 参考

- [Apache Tomcat 8 Configuration Reference (8.5.83) - The HTTP Connector](https://tomcat.apache.org/tomcat-8.5-doc/config/http.html)
