---
title: tomcat bind/listen/acceptor过程
tags: tomcat-startup
category: tomcat
toc: true
typora-root-url: tomcat-startup-3
typora-copy-images-to: tomcat-startup-3
date: 2022-10-19 22:58:12
---



**tomcat bind/listen/acceptor过程**

经典的网络server，一般有如下的流程：

![image-20221019224156247](/image-20221019224156247.png)

今天来看下tomcat对应的步骤是如何实现的。

# **日志**

几个关键日志：

```
19-Oct-2022 11:32:58.320 INFO [main] org.apache.coyote.AbstractProtocol.init Initializing ProtocolHandler ["http-nio-8080"]
19-Oct-2022 11:32:58.407 INFO [main] org.apache.tomcat.util.net.NioSelectorPool.getSharedSelector Using a shared selector for servlet write/read
19-Oct-2022 11:33:07.092 INFO [main] org.apache.catalina.startup.Catalina.load Initialization processed in 9593 ms

19-Oct-2022 11:33:07.123 INFO [main] org.apache.catalina.core.StandardService.startInternal Starting service [Catalina]
19-Oct-2022 11:33:07.124 INFO [main] org.apache.catalina.core.StandardEngine.startInternal Starting Servlet engine: [Apache Tomcat/8.5.66]
19-Oct-2022 11:33:07.165 INFO [main] org.apache.coyote.AbstractProtocol.start Starting ProtocolHandler ["http-nio-8080"]
19-Oct-2022 11:33:50.942 INFO [main] org.apache.catalina.startup.Catalina.start Server startup in 43847 ms
```

对应关系：

- bind & listen ->  Initializing ProtocolHandler ["http-nio-8080"]
- accept -> Starting ProtocolHandler ["http-nio-8080"]

tomcat的组件都实现了LifeCycle接口，都会有`init`和`start`方法。`bind`和`listen`默认就是在`init`方法中初始化的；`accept`是Acceptor初始化之后开始的，是在start方法中进行的。

# **bind & listen**

> org.apache.catalina.startup.Catalina.load Initialization processed in 9593 ms

```java
// org.apache.catalina.startup.Catalina#load()
 // Start the new server
try {
  getServer().init();
} catch (LifecycleException e) {
  if (Boolean.getBoolean("org.apache.catalina.startup.EXIT_ON_INIT_FAILURE")) {
    throw new java.lang.Error(e);
  } else {
    log.error("Catalina.start", e);
  }
}

long t2 = System.nanoTime();
if(log.isInfoEnabled()) {
  log.info("Initialization processed in " + ((t2 - t1) / 1000000) + " ms");
}
```

StandardServer的init会触发子组件的init，直到AbstractProtocol的init：

```bash
"main@1" prio=5 tid=0x1 nid=NA runnable
  java.lang.Thread.State: RUNNABLE
    #AbstractEndpoint.init
	  at org.apache.tomcat.util.net.AbstractEndpoint.init(AbstractEndpoint.java:1153)
    #AbstractJsseEndpoint.init
	  at org.apache.tomcat.util.net.AbstractJsseEndpoint.init(AbstractJsseEndpoint.java:222)
		#AbstractProtocol.init
	  at org.apache.coyote.AbstractProtocol.init(AbstractProtocol.java:599)
	  at org.apache.coyote.http11.AbstractHttp11Protocol.init(AbstractHttp11Protocol.java:80)
    #Connector.initInternal
	  at org.apache.catalina.connector.Connector.initInternal(Connector.java:1074)
	  at org.apache.catalina.util.LifecycleBase.init(LifecycleBase.java:136)
	  - locked <0x99f> (a org.apache.catalina.connector.Connector)
    #StandardService.initInternal
	  at org.apache.catalina.core.StandardService.initInternal(StandardService.java:552)
	  - locked <0x9c6> (a java.lang.Object)
	  at org.apache.catalina.util.LifecycleBase.init(LifecycleBase.java:136)
	  - locked <0x9a0> (a org.apache.catalina.core.StandardService)
    #StandardServer.initInternal
	  at org.apache.catalina.core.StandardServer.initInternal(StandardServer.java:846)
	  at org.apache.catalina.util.LifecycleBase.init(LifecycleBase.java:136)
	  - locked <0x9a1> (a org.apache.catalina.core.StandardServer)
    #catalina.load
	  at org.apache.catalina.startup.Catalina.load(Catalina.java:639)
	  at org.apache.catalina.startup.Catalina.load(Catalina.java:662)
	  at sun.reflect.NativeMethodAccessorImpl.invoke0(NativeMethodAccessorImpl.java:-1)
	  at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	  at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	  at java.lang.reflect.Method.invoke(Method.java:498)
	  at org.apache.catalina.startup.Bootstrap.load(Bootstrap.java:302)
	  at org.apache.catalina.startup.Bootstrap.main(Bootstrap.java:472)
```

> Initializing ProtocolHandler ["http-nio-8080"]

```java
// org.apache.coyote.AbstractProtocol#init
@Override
public void init() throws Exception {
  // 日志输出的地方
  if (getLog().isInfoEnabled()) {
    getLog().info(sm.getString("abstractProtocolHandler.init", getName()));
  }

  if (oname == null) {
    // Component not pre-registered so register it
    oname = createObjectName();
    if (oname != null) {
      Registry.getRegistry(null, null).registerComponent(this, oname, null);
    }
  }

  if (this.domain != null) {
    ObjectName rgOname = new ObjectName(domain + ":type=GlobalRequestProcessor,name=" + getName());
    this.rgOname = rgOname;
    Registry.getRegistry(null, null).registerComponent(
      getHandler().getGlobal(), rgOname, null);
  }

  String endpointName = getName();
  endpoint.setName(endpointName.substring(1, endpointName.length()-1));
  endpoint.setDomain(domain);
	// 调用endpoint的init
  endpoint.init();
}
```

endpoint实际进行了bind和listen

```java
// org.apache.tomcat.util.net.AbstractEndpoint#init
public void init() throws Exception {
  // 注意这里有开关控制，默认是true
  if (bindOnInit) {
    // 这里有bind
    bind();
    bindState = BindState.BOUND_ON_INIT;
  }
  if (this.domain != null) {
    // Register endpoint (as ThreadPool - historical name)
    oname = new ObjectName(domain + ":type=ThreadPool,name=\"" + getName() + "\"");
    Registry.getRegistry(null, null).registerComponent(this, oname, null);

    ObjectName socketPropertiesOname = new ObjectName(domain +
                                                      ":type=SocketProperties,name=\"" + getName() + "\"");
    socketProperties.setObjectName(socketPropertiesOname);
    Registry.getRegistry(null, null).registerComponent(socketProperties, socketPropertiesOname, null);

    for (SSLHostConfig sslHostConfig : findSslHostConfigs()) {
      registerJmx(sslHostConfig);
    }
  }
}

// org.apache.tomcat.util.net.NioEndpoint#bind
 /**
     * Initialize the endpoint.
     */
@Override
public void bind() throws Exception {

  if (!getUseInheritedChannel()) {
    serverSock = ServerSocketChannel.open();
    socketProperties.setProperties(serverSock.socket());
    InetSocketAddress addr = (getAddress()!=null?new InetSocketAddress(getAddress(),getPort()):new InetSocketAddress(getPort()));
    // 这里进行了bind和listen
    serverSock.socket().bind(addr,getAcceptCount());
  } else {
    // Retrieve the channel provided by the OS
    Channel ic = System.inheritedChannel();
    if (ic instanceof ServerSocketChannel) {
      serverSock = (ServerSocketChannel) ic;
    }
    if (serverSock == null) {
      throw new IllegalArgumentException(sm.getString("endpoint.init.bind.inherited"));
    }
  }
  serverSock.configureBlocking(true); //mimic APR behavior

  // Initialize thread count defaults for acceptor, poller
  if (acceptorThreadCount == 0) {
    // FIXME: Doesn't seem to work that well with multiple accept threads
    acceptorThreadCount = 1;
  }
  if (pollerThreadCount <= 0) {
    //minimum one poller thread
    pollerThreadCount = 1;
  }
  setStopLatch(new CountDownLatch(pollerThreadCount));

  // Initialize SSL if needed
  initialiseSsl();

  selectorPool.open();
}


// java.net.ServerSocket#bind(java.net.SocketAddress, int)
 public void bind(SocketAddress endpoint, int backlog) throws IOException {
   if (isClosed())
     throw new SocketException("Socket is closed");
   if (!oldImpl && isBound())
     throw new SocketException("Already bound");
   if (endpoint == null)
     endpoint = new InetSocketAddress(0);
   if (!(endpoint instanceof InetSocketAddress))
     throw new IllegalArgumentException("Unsupported address type");
   InetSocketAddress epoint = (InetSocketAddress) endpoint;
   if (epoint.isUnresolved())
     throw new SocketException("Unresolved address");
   if (backlog < 1)
     backlog = 50;
   try {
     SecurityManager security = System.getSecurityManager();
     if (security != null)
       security.checkListen(epoint.getPort());
     // 先bind端口
     getImpl().bind(epoint.getAddress(), epoint.getPort());
     // 再listen，listen时内核会创建SYN Queue和Accept Queue
     getImpl().listen(backlog);
     bound = true;
   } catch(SecurityException e) {
     bound = false;
     throw e;
   } catch(IOException e) {
     bound = false;
     throw e;
   }
 }
```

至此已经`bind`和`listen`，但是应用层还没有`accept`连接，如果此时有请求过来，都是待在`SYN Queue`和`Accept Queue`中。

bindOnInit配置：

> Controls **when** the socket used by the connector is bound. 
>
> By default it is bound when the connector is **initiated** and unbound when the connector is **destroyed**. 
>
> If set to false, the socket will be bound when the connector is **started** and unbound when it is **stopped**.

# **accept**

> org.apache.catalina.startup.Catalina.start Server startup in 43847 ms

对应代码：

```java
// org.apache.catalina.startup.Catalina#start
 // Start the new server
try {
  getServer().start();
} catch (LifecycleException e) {
  log.fatal(sm.getString("catalina.serverStartFail"), e);
  try {
    getServer().destroy();
  } catch (LifecycleException e1) {
    log.debug("destroy() failed for failed Server ", e1);
  }
  return;
}

long t2 = System.nanoTime();
if(log.isInfoEnabled()) {
  log.info("Server startup in " + ((t2 - t1) / 1000000) + " ms");
}
```

同样的StandardServer的start也会触发子组件的start

```bash
"main@1" prio=5 tid=0x1 nid=NA runnable
  java.lang.Thread.State: RUNNABLE
    #NioEndpoint.startInternal
	  at org.apache.tomcat.util.net.NioEndpoint.startInternal(NioEndpoint.java:261)
    #AbstractEndpoint.start
	  at org.apache.tomcat.util.net.AbstractEndpoint.start(AbstractEndpoint.java:1219)
    #AbstractProtocol.start
	  at org.apache.coyote.AbstractProtocol.start(AbstractProtocol.java:609)
    #Connector.startInternal
	  at org.apache.catalina.connector.Connector.startInternal(Connector.java:1099)
	  at org.apache.catalina.util.LifecycleBase.start(LifecycleBase.java:183)
	  - locked <0x99d> (a org.apache.catalina.connector.Connector)
    #StandardService.startInternal
	  at org.apache.catalina.core.StandardService.startInternal(StandardService.java:440)
	  - locked <0xa6a> (a java.lang.Object)
	  at org.apache.catalina.util.LifecycleBase.start(LifecycleBase.java:183)
	  - locked <0x99e> (a org.apache.catalina.core.StandardService)
    #StandardServer.startInternal
	  at org.apache.catalina.core.StandardServer.startInternal(StandardServer.java:766)
	  - locked <0xa6b> (a java.lang.Object)
	  at org.apache.catalina.util.LifecycleBase.start(LifecycleBase.java:183)
	  - locked <0x99f> (a org.apache.catalina.core.StandardServer)
    #Catalina.start
	  at org.apache.catalina.startup.Catalina.start(Catalina.java:688)
	  at sun.reflect.NativeMethodAccessorImpl.invoke0(NativeMethodAccessorImpl.java:-1)
	  at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	  at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	  at java.lang.reflect.Method.invoke(Method.java:498)
	  at org.apache.catalina.startup.Bootstrap.start(Bootstrap.java:342)
	  at org.apache.catalina.startup.Bootstrap.main(Bootstrap.java:473)
```

> Starting ProtocolHandler ["http-nio-8080"]

```java
// org.apache.coyote.AbstractProtocol#start
@Override
public void start() throws Exception {
  // 日志输出的地方
  if (getLog().isInfoEnabled()) {
    getLog().info(sm.getString("abstractProtocolHandler.start", getName()));
  }
	
  // 调用endpoint的start
  endpoint.start();

  // Start timeout thread
  asyncTimeout = new AsyncTimeout();
  Thread timeoutThread = new Thread(asyncTimeout, getNameInternal() + "-AsyncTimeout");
  int priority = endpoint.getThreadPriority();
  if (priority < Thread.MIN_PRIORITY || priority > Thread.MAX_PRIORITY) {
    priority = Thread.NORM_PRIORITY;
  }
  timeoutThread.setPriority(priority);
  timeoutThread.setDaemon(true);
  timeoutThread.start();
}
```

AbstractProtocol最终调用endpoint的start方法：

```java
// org.apache.tomcat.util.net.AbstractEndpoint#start
public final void start() throws Exception {
  // 如果没有初始化，就触发一次bind
  if (bindState == BindState.UNBOUND) {
    bind();
    bindState = BindState.BOUND_ON_START;
  }
  startInternal();
}

// org.apache.tomcat.util.net.NioEndpoint#startInternal
/**
     * Start the NIO endpoint, creating acceptor, poller threads.
     */
@Override
public void startInternal() throws Exception {

  if (!running) {
    running = true;
    paused = false;

    processorCache = new SynchronizedStack<>(SynchronizedStack.DEFAULT_SIZE,
                                             socketProperties.getProcessorCache());
    eventCache = new SynchronizedStack<>(SynchronizedStack.DEFAULT_SIZE,
                                         socketProperties.getEventCache());
    nioChannels = new SynchronizedStack<>(SynchronizedStack.DEFAULT_SIZE,
                                          socketProperties.getBufferPool());

    // Create worker collection
    // 创建线程池
    if (getExecutor() == null) {
      createExecutor();
    }

    // 创建maxConnections限制
    initializeConnectionLatch();

    // Start poller threads
    // Poller线程
    pollers = new Poller[getPollerThreadCount()];
    for (int i=0; i<pollers.length; i++) {
      pollers[i] = new Poller();
      Thread pollerThread = new Thread(pollers[i], getName() + "-ClientPoller-"+i);
      pollerThread.setPriority(threadPriority);
      pollerThread.setDaemon(true);
      pollerThread.start();
    }

    // 启动acceptor线程
    startAcceptorThreads();
  }
}


// org.apache.tomcat.util.net.AbstractEndpoint#startAcceptorThreads
protected final void startAcceptorThreads() {
  int count = getAcceptorThreadCount();
  acceptors = new Acceptor[count];

  for (int i = 0; i < count; i++) {
    acceptors[i] = createAcceptor();
    String threadName = getName() + "-Acceptor-" + i;
    acceptors[i].setThreadName(threadName);
    Thread t = new Thread(acceptors[i], threadName);
    t.setPriority(getAcceptorThreadPriority());
    t.setDaemon(getDaemon());
    t.start();
  }
}
```

至此acceptor线程启动，tomcat具备了accept的能力。看下Acceptor线程是干啥的：

```java
// org.apache.tomcat.util.net.NioEndpoint.Acceptor
/**
     * The background thread that listens for incoming TCP/IP connections and
     * hands them off to an appropriate processor.
     */
protected class Acceptor extends AbstractEndpoint.Acceptor {

  @Override
  public void run() {

    int errorDelay = 0;

    // Loop until we receive a shutdown command
    while (running) {

      // Loop if endpoint is paused
      while (paused && running) {
        state = AcceptorState.PAUSED;
        try {
          Thread.sleep(50);
        } catch (InterruptedException e) {
          // Ignore
        }
      }

      if (!running) {
        break;
      }
      state = AcceptorState.RUNNING;

      try {
        //if we have reached max connections, wait
        countUpOrAwaitConnection();

        SocketChannel socket = null;
        try {
          // Accept the next incoming connection from the server
          // socket
          // 注意这里accept了
          socket = serverSock.accept();
        } catch (IOException ioe) {
          // We didn't get a socket
          countDownConnection();
          if (running) {
            // Introduce delay if necessary
            errorDelay = handleExceptionWithDelay(errorDelay);
            // re-throw
            throw ioe;
          } else {
            break;
          }
        }
        // Successful accept, reset the error delay
        errorDelay = 0;

        // Configure the socket
        if (running && !paused) {
          // setSocketOptions() will hand the socket off to
          // an appropriate processor if successful
          if (!setSocketOptions(socket)) {
            closeSocket(socket);
          }
        } else {
          closeSocket(socket);
        }
      } catch (Throwable t) {
        ExceptionUtils.handleThrowable(t);
        log.error(sm.getString("endpoint.accept.fail"), t);
      }
    }
    state = AcceptorState.ENDED;
  }


  private void closeSocket(SocketChannel socket) {
    countDownConnection();
    try {
      socket.socket().close();
    } catch (IOException ioe)  {
      if (log.isDebugEnabled()) {
        log.debug(sm.getString("endpoint.err.close"), ioe);
      }
    }
    try {
      socket.close();
    } catch (IOException ioe) {
      if (log.isDebugEnabled()) {
        log.debug(sm.getString("endpoint.err.close"), ioe);
      }
    }
  }
}
```



# **其他组件初始化时机**

其他组件初始化是在bind/accept之间，还是之后？

## **本地测试结果：**

```bash
19-Oct-2022 14:51:28.147 INFO [main] org.apache.coyote.AbstractProtocol.init Initializing ProtocolHandler ["http-nio-8080"]
19-Oct-2022 14:51:28.164 INFO [main] org.apache.tomcat.util.net.NioSelectorPool.getSharedSelector Using a shared selector for servlet write/read
19-Oct-2022 14:51:28.176 INFO [main] org.apache.catalina.startup.Catalina.load Initialization processed in 501 ms
19-Oct-2022 14:51:28.237 INFO [main] org.apache.catalina.core.StandardService.startInternal Starting service [Catalina]
19-Oct-2022 14:51:28.237 INFO [main] org.apache.catalina.core.StandardEngine.startInternal Starting Servlet engine: [Apache Tomcat/8.5.66]
19-Oct-2022 14:51:28.251 INFO [main] org.apache.coyote.AbstractProtocol.start Starting ProtocolHandler ["http-nio-8080"]
19-Oct-2022 14:51:28.257 INFO [main] org.apache.catalina.startup.Catalina.start Server startup in 80 ms
Connected to server
[2022-10-19 02:51:28,339] Artifact web:war exploded: Artifact is being deployed, please wait...
19-Oct-2022 14:51:28.747 INFO [RMI TCP Connection(2)-127.0.0.1] org.apache.jasper.servlet.TldScanner.scanJars At least one JAR was scanned for TLDs yet contained no TLDs. Enable debug logging for this logger for a complete list of JARs that were scanned but no TLDs were found in them. Skipping unneeded JARs during scanning can improve startup time and JSP compilation time.
14:51:28.803 [RMI TCP Connection(2)-127.0.0.1] INFO  c.a.context.SimpleLogContextListener - contextInitialized... begin sleep
19-Oct-2022 14:51:38.253 INFO [localhost-startStop-1] org.apache.catalina.startup.HostConfig.deployDirectory Deploying web application directory [/Users/qishengli/Downloads/apache-tomcat-8.5.66/webapps/manager]
19-Oct-2022 14:51:38.278 INFO [localhost-startStop-1] org.apache.jasper.servlet.TldScanner.scanJars At least one JAR was scanned for TLDs yet contained no TLDs. Enable debug logging for this logger for a complete list of JARs that were scanned but no TLDs were found in them. Skipping unneeded JARs during scanning can improve startup time and JSP compilation time.
19-Oct-2022 14:51:38.296 INFO [localhost-startStop-1] org.apache.catalina.startup.HostConfig.deployDirectory Deployment of web application directory [/Users/qishengli/Downloads/apache-tomcat-8.5.66/webapps/manager] has finished in [42] ms
14:51:38.812 [RMI TCP Connection(2)-127.0.0.1] INFO  com.air.filter.TestFilter - initing Filter...
14:51:48.818 [RMI TCP Connection(2)-127.0.0.1] INFO  com.air.TestServlet2 - init TestServlet2...
14:51:58.819 [RMI TCP Connection(2)-127.0.0.1] INFO  com.air.SampleServlet - initing sample servlet
14:51:58.820 [RMI TCP Connection(2)-127.0.0.1] INFO  com.air.TestServlet3 - init TestServlet3...
[2022-10-19 02:52:08,833] Artifact web:war exploded: Artifact is deployed successfully
[2022-10-19 02:52:08,833] Artifact web:war exploded: Deploy took 40,494 milliseconds
```



Initializing ProtocolHandler ["http-nio-8080"]  ->  Starting ProtocolHandler ["http-nio-8080"] ->  contextInitialized... begin sleep (**Context Listener**)  -> initing Filter... (**Filter**)

-> init TestServlet2 （**@WebServlet**） -> init TestServlet3 (**web.xml配置的servlet**)

## **线上日志：**



```bash
19-Oct-2022 14:29:36.778 INFO [main] org.apache.coyote.AbstractProtocol.init Initializing ProtocolHandler ["http-nio-21002"]
19-Oct-2022 14:29:36.790 INFO [main] org.apache.tomcat.util.net.NioSelectorPool.getSharedSelector Using a shared selector for servlet write/read
19-Oct-2022 14:29:36.796 INFO [main] org.apache.catalina.startup.Catalina.load Initialization processed in 448 ms
19-Oct-2022 14:29:36.801 INFO [main] org.apache.catalina.core.StandardService.startInternal Starting service [Catalina]
19-Oct-2022 14:29:36.801 INFO [main] org.apache.catalina.core.StandardEngine.startInternal Starting Servlet Engine: Apache Tomcat/8.5.38
19-Oct-2022 14:29:38.641 INFO [localhost-startStop-1] org.apache.jasper.servlet.TldScanner.scanJars At least one JAR was scanned for TLDs yet contained no TLDs. Enable debug logging for this logger for a complete list of JARs that were scanned but no TLDs were found in them. Skipping unneeded JARs during scanning can improve startup time and JSP compilation time.
# 中间有业务日志
19-Oct-2022 14:34:25.888 INFO [main] org.apache.coyote.AbstractProtocol.start Starting ProtocolHandler ["http-nio-21002"]
19-Oct-2022 14:34:25.894 INFO [main] org.apache.catalina.startup.Catalina.start Server startup in 289097 ms
```

**Initializing** ProtocolHandler ["http-nio-21002"]  ->  spring初始化  -> **Starting** ProtocolHandler ["http-nio-21002"] 

## **main vs localhost-startStop**

从上面的日志可以看到，bind&listen和accept的初始化都是在main线程中，其他操作是在localhost-startStop-1线程中（RMI TCP这个估计跟idea有关系，暂且搁置）。

main thread就是tomcat的主线程，tomcat在启动Context/Engine/Host/Wrapper等组件时，会丢到startStopExectutor中进行，最终阻塞等待所有结果返回，如下代码所示：

```java
// org.apache.catalina.core.ContainerBase#initInternal
@Override
protected void initInternal() throws LifecycleException {
  BlockingQueue<Runnable> startStopQueue = new LinkedBlockingQueue<>();
  startStopExecutor = new ThreadPoolExecutor(
    getStartStopThreadsInternal(),
    getStartStopThreadsInternal(), 10, TimeUnit.SECONDS,
    startStopQueue,
    // 就是这个线程
    new StartStopThreadFactory(getName() + "-startStop-"));
  startStopExecutor.allowCoreThreadTimeOut(true);
  super.initInternal();
}

// org.apache.catalina.core.ContainerBase#startInternal
 // Start our child containers, if any
Container children[] = findChildren();
List<Future<Void>> results = new ArrayList<>();
for (Container child : children) {
  // 提交startChild的任务
  results.add(startStopExecutor.submit(new StartChild(child)));
}

for (Future<Void> result : results) {
  try {
    // 等待每个child启动完成
    result.get();
  } catch (Throwable e) {
    log.error(sm.getString("containerBase.threadedStartFailed"), e);
    if (multiThrowable == null) {
      multiThrowable = new MultiThrowable();
    }
    multiThrowable.add(e);
  }

}
```

正常启动时，spring就是由startStopExecutor的线程拉起的，梳理tomcat组件之间的启动顺序可以发现是这样的：

![tomcat-start-component](/tomcat-start-component.png)

service有多个组件，包含engine和connector。start时，engine的调用顺序在connector前面。

engine后续会负责servlet容器的初始化，从而触发spring的初始化。虽然是在线程池中异步初始化的，但是会一直等待子组件初始化完成，再返回。

connector会触发endpoint的初始化，最终触发Acceptor的初始化。

所以默认的servlet初始化应该是在accept之前，从本地的测试日志也可以看出来：

> 19-Oct-2022 14:51:38.296 INFO [localhost-startStop-1] org.apache.catalina.startup.HostConfig.deployDirectory Deployment of web application directory [/Users/qishengli/Downloads/apache-tomcat-8.5.66/webapps/manager] has finished in [42] ms

本地测试的结果不对，应该是idea使用了RMI调用，在启动结束之后，添加了Context。

![image-20221019224635074](/image-20221019224635074.png)

# **总结**

- bind& listen过程
  catalina.load -> StandardServer.initInternal -> StandardService.initInternal ->  Connector.initInternal -> AbstractProtocol.init -> AbstractEndpoint.init -> NioEndpoint#bind
- accept过程
  Catalina.start -> StandardServer.startInternal -> StandardService.startInternal  -> Connector.startInternal -> AbstractProtocol.start ->  AbstractEndpoint.start -> NioEndpoint.startInternal -> Acceptor线程启动可以accept
- 默认的context listener、filter、servlet都是在**bind之后**，**accept之前**初始化的
- init的时候是否bind&listen，可以通过**bindOnInit**参数控制，默认是true
- bind&listen和accept之间，穿插了spring的初始化，这段时间**应用层不会处理连接**。探活（容器启动之后）过来的大量连接都堆积在全连接队列中，最终造成队列溢出，出现listenDrop的现象。
- bindOnInit修改为false之后，可以避免发布时大量的listenDrop问题

# **参考**

- [TCP SYN Queue and Accept Queue Overflow Explained - Alibaba Cloud Community](https://www.alibabacloud.com/blog/tcp-syn-queue-and-accept-queue-overflow-explained_599203)
