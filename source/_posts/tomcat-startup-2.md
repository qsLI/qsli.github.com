---
title: tomcat-startup-2
tags: tomcat-startup
category: tomcat
toc: true
typora-root-url: tomcat-startup-2
typora-copy-images-to: tomcat-startup-2
date: 2021-12-05 20:07:45
---





书接上回，我们从启动脚本跟踪到了`Bootstrap`类，发现它只是个**传话筒**，内部通过发射将调用都转给了`Catalina`，用官方的话来说就是`roundabout approach`（迂回战术），目的是为了不将tomcat的内部lib暴露给class path。

这篇文章，我们就分析下`Catalina`以及tomcat内部的关键组件的启动。

先看下tomcat的整体组件，按web.xml中的声明，主要包含Catalina、Server、Service、Connector、Engine、Host、Context、Wrapper等，以及图中没有画到的Valve、Listener等组件。



![tomcat-arch](/tomcat-arch.jpg)



组件启动顺序：

![tomcat-start-component](/tomcat-start-component.png)

# Catalina


> Startup/Shutdown shell program for Catalina. 


Catalina提供了命令行参数的解析，持有Server对象，主要提供的功能：

- start
  - digester解析web.xml
  - 调用Server的init方法

- stop
  - ShutdownHook

- Configtest

从前面的分析我们知道，Bootstrap是通过反射直接调用的Catalina的start方法，start方法的实现如下：

```java
// org.apache.catalina.startup.Catalina#start
    /**
     * Start a new server instance.
     */
    public void start() {

        if (getServer() == null) {
          	// 首次会走到这里，负责加载web.xml，初始化对应的组件
            load();
        }

        if (getServer() == null) {
            log.fatal("Cannot start server. Server instance is not configured.");
            return;
        }

        long t1 = System.nanoTime();

        // Start the new server
        try {
          	// 调用server的start方法
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

        // Register shutdown hook
        if (useShutdownHook) {
            if (shutdownHook == null) {
                shutdownHook = new CatalinaShutdownHook();
            }
            Runtime.getRuntime().addShutdownHook(shutdownHook);

            // If JULI is being used, disable JULI's shutdown hook since
            // shutdown hooks run in parallel and log messages may be lost
            // if JULI's hook completes before the CatalinaShutdownHook()
            LogManager logManager = LogManager.getLogManager();
            if (logManager instanceof ClassLoaderLogManager) {
                ((ClassLoaderLogManager) logManager).setUseShutdownHook(
                        false);
            }
        }
				
      	// startup时Bootstrap会设置为true
      	// 调用server的await，退出后调用自身的stop方法
        if (await) {
            await();
            stop();
        }
    }
```

`load`方法里就是解析web.xml的具体过程，这里就不赘述了，同时load方法里会**调用server的init方法**进行初始化，绑定Server所属的Catalina。

初始化之后，就直接**调用了Server的start方法**，触发其包含的组件的启动。然后这里还注册了Jvm的shutdownHook，关闭的时候也会调用Catalina的stop方法。

最后，调用server的await方法，等待Server的声明周期结束。



# Server

Server是tomcat中比较重要的组件，默认实现是`StandardServer`。主要提供的功能：

- 管理Service组件
  - addService
  - removeService
  - findService
- shutdown端口监听
- naming相关的功能
- 可以设置ParentClassLoader（后面讲类加载的时候，会统一讲）

Server实现了Lifecycle接口，我们着重关注下`initInternal`方法和`startInternal`方法。

## initInternal

```java
// org.apache.catalina.core.StandardServer#initInternal
@Override
    protected void initInternal() throws LifecycleException {

        super.initInternal();

        // Register global String cache
        // Note although the cache is global, if there are multiple Servers
        // present in the JVM (may happen when embedding) then the same cache
        // will be registered under multiple names
        onameStringCache = register(new StringCache(), "type=StringCache");

        // Register the MBeanFactory
        MBeanFactory factory = new MBeanFactory();
        factory.setContainer(this);
        onameMBeanFactory = register(factory, "type=MBeanFactory");

        // Register the naming resources
        globalNamingResources.init();

        // Populate the extension validator with JARs from common and shared
        // class loaders
       	// 省略...
      
        // Initialize our defined Services
        for (int i = 0; i < services.length; i++) {
            services[i].init();
        }
    }
```

在前面的文章中，我们知道Server默认实现了`LifecycleMbeanBase`,会自动将自身暴露给Jmx，这里Server手动也额外地注册了个MBean的对象。然后初始化了Naming相关的东西，extension validator。最后也是最关键的，对Server中包含的所有的Service**调用其init方法**，触发其初始化。

## startInternal

```java
// org.apache.catalina.core.StandardServer#startInternal
    @Override
    protected void startInternal() throws LifecycleException {

        fireLifecycleEvent(CONFIGURE_START_EVENT, null);
        setState(LifecycleState.STARTING);

        globalNamingResources.start();

        // Start our defined Services
        synchronized (servicesLock) {
            for (int i = 0; i < services.length; i++) {
                services[i].start();
            }
        }
    }
```

这里除了基类默认触发的时间，这里也有自己定义的`CONFIGURE_START_EVENT`事件，然后触发naming相关的启动。最后，**调用对应Service的start方法**。

## await

Catalina会调用Server的await，来等待Server结束服务。await的实现如下：

```java
// org.apache.catalina.core.StandardServer#await
 /**
     * Wait until a proper shutdown command is received, then return.
     * This keeps the main thread alive - the thread pool listening for http
     * connections is daemon threads.
     */
    @Override
    public void await() {
        // Negative values - don't wait on port - tomcat is embedded or we just don't like ports
        if( port == -2 ) {
            // undocumented yet - for embedding apps that are around, alive.
            return;
        }
      	// port没有定义的话，就直接没10s检查一次是否结束服务
      	// 这里使用了变量awaitThread来标识结束，当然他是volatile的
        if( port==-1 ) {
            try {
                awaitThread = Thread.currentThread();
                while(!stopAwait) {
                    try {
                        Thread.sleep( 10000 );
                    } catch( InterruptedException ex ) {
                        // continue and check the flag
                    }
                }
            } finally {
                awaitThread = null;
            }
            return;
        }

      	// 这里会启动一个Server，监听shutdown的端口，和发过来的命令
        // Set up a server socket to wait on
        try {
            awaitSocket = new ServerSocket(port, 1,
                    InetAddress.getByName(address));
        } catch (IOException e) {
            log.error("StandardServer.await: create[" + address
                               + ":" + port
                               + "]: ", e);
            return;
        }

        try {
            awaitThread = Thread.currentThread();

            // Loop waiting for a connection and a valid command
            while (!stopAwait) {
                ServerSocket serverSocket = awaitSocket;
                if (serverSocket == null) {
                    break;
                }

                // Wait for the next connection
                Socket socket = null;
                StringBuilder command = new StringBuilder();
                try {
                    InputStream stream;
                    long acceptStartTime = System.currentTimeMillis();
                    try {
                        socket = serverSocket.accept();
                        socket.setSoTimeout(10 * 1000);  // Ten seconds
                        stream = socket.getInputStream();
                    } catch (SocketTimeoutException ste) {
                        // This should never happen but bug 56684 suggests that
                        // it does.
                        log.warn(sm.getString("standardServer.accept.timeout",
                                Long.valueOf(System.currentTimeMillis() - acceptStartTime)), ste);
                        continue;
                    } catch (AccessControlException ace) {
                        log.warn("StandardServer.accept security exception: "
                                + ace.getMessage(), ace);
                        continue;
                    } catch (IOException e) {
                        if (stopAwait) {
                            // Wait was aborted with socket.close()
                            break;
                        }
                        log.error("StandardServer.await: accept: ", e);
                        break;
                    }

                    // Read a set of characters from the socket
                    int expected = 1024; // Cut off to avoid DoS attack
                    while (expected < shutdown.length()) {
                        if (random == null)
                            random = new Random();
                        expected += (random.nextInt() % 1024);
                    }
                    while (expected > 0) {
                        int ch = -1;
                        try {
                            ch = stream.read();
                        } catch (IOException e) {
                            log.warn("StandardServer.await: read: ", e);
                            ch = -1;
                        }
                        // Control character or EOF (-1) terminates loop
                        if (ch < 32 || ch == 127) {
                            break;
                        }
                        command.append((char) ch);
                        expected--;
                    }
                } finally {
                    // Close the socket now that we are done with it
                    try {
                        if (socket != null) {
                            socket.close();
                        }
                    } catch (IOException e) {
                        // Ignore
                    }
                }

                // Match against our command string
                boolean match = command.toString().equals(shutdown);
                if (match) {
                    log.info(sm.getString("standardServer.shutdownViaPort"));
                    break;
                } else
                    log.warn("StandardServer.await: Invalid command '"
                            + command.toString() + "' received");
            }
        } finally {
            ServerSocket serverSocket = awaitSocket;
            awaitThread = null;
            awaitSocket = null;

            // Close the server socket and return
            if (serverSocket != null) {
                try {
                    serverSocket.close();
                } catch (IOException e) {
                    // Ignore
                }
            }
        }
    }
```

配置了shutdown端口，会监听这个端口，如果发送过来的是`SHUTDOWN`的命令，就会调用

```xml
<Server port="8005" shutdown="SHUTDOWN">
```

测试下：

```bash
➜  bin  telnet localhost 8005
Trying ::1...
telnet: connect to address ::1: Connection refused
Trying 127.0.0.1...
Connected to localhost.
Escape character is '^]'.
sdf
Connection closed by foreign host.

# 上面的命令不对，tomcat没有反应，这里还能连接8005端口
➜  bin  telnet localhost 8005
Trying ::1...
telnet: connect to address ::1: Connection refused
Trying 127.0.0.1...
Connected to localhost.
Escape character is '^]'.
SHUTDOWN
Connection closed by foreign host.

# 此时tomcat已经被shutdown了
➜  bin  telnet localhost 8005
Trying ::1...
telnet: connect to address ::1: Connection refused
Trying 127.0.0.1...
telnet: connect to address 127.0.0.1: Connection refused
telnet: Unable to connect to remote host
```

被shutdown的同时，会在Catalina.out中打印如下的日志：

```bash
27-Nov-2021 21:00:14.933 INFO [main] org.apache.catalina.core.StandardServer.await A valid shutdown command was received via the shutdown port. Stopping the Server instance.
```

如果下次，tomcat莫名奇妙shutdown了，可以考虑下是不是被人打接口导致的。



# Service

> A "Service" is a collection of one or more "Connectors" that share
>
> a single "Container" Note:  A "Service" is not itself a "Container",
>
>  so you may not define subcomponents such as "Valves" at this level.

service的作用就是连接多个`Connectors`和一个`Container`。主要提供的功能：

- 管理Engine
  - getContainer/setContainer
- 管理Connector组件
  - addConnector
  - findConnectors
  - removeConnector
- 管理executor
  - addExecutor
  - findExecutors
  - getExecutor
  - removeExecutor
- Mapper/MapperListener的管理



## initInternal

init操作也是中规中矩，没有特殊操作，挨个调用被管理的Engine/Connector/Executor/MapperListener的`init`方法。

## startInternal

同initInternal一样，调用子组件的start方法。

## 其他

Connector内部是数组存储的，每次修改操作会加锁：

```java
/**
     * The set of Connectors associated with this Service.
     */
protected Connector connectors[] = new Connector[0];
private final Object connectorsLock = new Object();

 /**
     * Add a new Connector to the set of defined Connectors, and associate it
     * with this Service's Container.
     *
     * @param connector The Connector to be added
     */
    @Override
    public void addConnector(Connector connector) {

        synchronized (connectorsLock) {
          // 省略
        }
    }
```

重要属性变更时，会发出一个PropertyChangeEvent:

```java
/**
 * The property change support for this component.
 */
protected final PropertyChangeSupport support = new PropertyChangeSupport(this);

// Report this property change to interested listeners
support.firePropertyChange("container", oldEngine, this.engine);
```



# Engine

> If used, an Engine is always the top level Container in a Catalina hierarchy.
>
>  It is useful in the following types of scenarios:
>
> 1. You wish to use Interceptors that see every single request processed
>       by the entire engine.
> 2. You wish to run Catalina in with a standalone HTTP connector, but still
>       want support for multiple virtual hosts.

Engine容器的子容器，必须是Host容器，而且他自身必须是top level的容器，也就是不能有parent 容器。Engine下可以配置Valve，可以拦截所有的请求。同时可以配置多个virtual host。

默认的实现是`StandardEngine`，`StandardEngine`继承了`ContainerBase`，`ContainerBase`实现了子容器的管理、以及`ContainerListener`的管理。

## initInternal

Engine自身没有特殊的实现，逻辑都在ContainerBase中：

```java
// org.apache.catalina.core.ContainerBase#initInternal
@Override
protected void initInternal() throws LifecycleException {
  BlockingQueue<Runnable> startStopQueue = new LinkedBlockingQueue<>();
  startStopExecutor = new ThreadPoolExecutor(
    getStartStopThreadsInternal(),
    getStartStopThreadsInternal(), 10, TimeUnit.SECONDS,
    startStopQueue,
    new StartStopThreadFactory(getName() + "-startStop-"));
  startStopExecutor.allowCoreThreadTimeOut(true);
  super.initInternal();
}
```

仅仅是初始化了一个`startStopExecutor`

## startInternal

逻辑也在ContainerBase中：

```java
// org.apache.catalina.core.ContainerBase#startInternal
    @Override
    protected synchronized void startInternal() throws LifecycleException {

        // Start our subordinate components, if any

        // Start our child containers, if any
        Container children[] = findChildren();
        List<Future<Void>> results = new ArrayList<>();
        for (int i = 0; i < children.length; i++) {
            // 子容器的启动是在刚才创建的线程池中
            results.add(startStopExecutor.submit(new StartChild(children[i])));
        }

        boolean fail = false;
        for (Future<Void> result : results) {
            try {
                result.get();
            } catch (Exception e) {
                log.error(sm.getString("containerBase.threadedStartFailed"), e);
                fail = true;
            }

        }
        if (fail) {
            throw new LifecycleException(
                    sm.getString("containerBase.threadedStartFailed"));
        }

        // Start the Valves in our pipeline (including the basic), if any
        if (pipeline instanceof Lifecycle)
            ((Lifecycle) pipeline).start();


        setState(LifecycleState.STARTING);

      	// 后台线程
        // Start our thread
        threadStart();

    }
```

# Host

Engine的子容器是Host容器，它与url中的host对应，server.xml中的配置如下：

```xml
  <Host name="localhost"  appBase="webapps"
             unpackWARs="true" autoDeploy="true">
```

配置中指定了该host的部署目录，比如webapps，是否自动解压war包，自动部署等属性。默认实现是StandardHost，init和start没有特殊的逻辑，只是设置了error report valve。valve的机制，会在后面请求处理过程中详细解析。



# Context

> A Context is a Container that represents a servlet context, and therefore an individual web application, in the Catalina servlet engine.



Context代表一个tomcat的应用，也就是appBase下的一个目录。可以包含一个或者多个Servlet。



# Wrapper

> Standard implementation of the Wrapper interface that represents an individual servlet definition.  No child Containers are allowed, and the parent Container must be a Context.



wrapper就是servlet的包装，默认实现是StandardWrapper，init和start没有特殊的逻辑。



# Connector

![img](/6eeaeb93839adcb4e76c15ee93f545ce.jpg)

Connector组件负责网络连接的处理、协议的解析等。网络协议的处理是tomcat中很重要的一块儿，后面也会单独分析不同协议的实现。

## initInternal

```java
// org.apache.catalina.connector.Connector#initInternal
    @Override
    protected void initInternal() throws LifecycleException {

        super.initInternal();

        // Initialize adapter
        adapter = new CoyoteAdapter(this);
        protocolHandler.setAdapter(adapter);

      	// 省略
      
        try {
            protocolHandler.init();
        } catch (Exception e) {
            throw new LifecycleException(
                    sm.getString("coyoteConnector.protocolHandlerInitializationFailed"), e);
        }
    }
```

主要是protocolHandler的初始化

## startInternal

```java
// org.apache.catalina.connector.Connector#startInternal
    @Override
    protected void startInternal() throws LifecycleException {

        // Validate settings before starting
        if (getPort() < 0) {
            throw new LifecycleException(sm.getString(
                    "coyoteConnector.invalidPort", Integer.valueOf(getPort())));
        }

        setState(LifecycleState.STARTING);

        try {
            protocolHandler.start();
        } catch (Exception e) {
            String errPrefix = "";
            if(this.service != null) {
                errPrefix += "service.getName(): \"" + this.service.getName() + "\"; ";
            }

            throw new LifecycleException
                (errPrefix + " " + sm.getString
                 ("coyoteConnector.protocolHandlerStartFailed"), e);
        }
    }
```

同样的委托给protocolHandler。

# Executor

Executor也是标准的tomcat组件，它的默认实现类是`StandardThreadExecutor`。可以在server.xml的Service节点下配置，默认是没有配置的。tomcat给了一个示例：

```xml
  55     <!--The connectors can use a shared executor, you can define one or more named thread pools-->
  56     <!--
  57     <Executor name="tomcatThreadPool" namePrefix="catalina-exec-"
  58         maxThreads="150" minSpareThreads="4"/>
  59     -->
```

如果这里设置了，是可以在Connector中共享的，这一部分是在解析server.xml时实现的：

```java
// org.apache.catalina.startup.ConnectorCreateRule#begin
 		@Override
    public void begin(String namespace, String name, Attributes attributes)
            throws Exception {
        Service svc = (Service)digester.peek();
        Executor ex = null;
        if ( attributes.getValue("executor")!=null ) {
          	// 如果配置executor属性，则从service中，查找对应的executor
            ex = svc.getExecutor(attributes.getValue("executor"));
        }
        Connector con = new Connector(attributes.getValue("protocol"));
        if (ex != null) {
          	// 设置executor为共享的
            setExecutor(con, ex);
        }
        String sslImplementationName = attributes.getValue("sslImplementationName");
        if (sslImplementationName != null) {
            setSSLImplementationName(con, sslImplementationName);
        }
        digester.push(con);
    }
```

> | `executor` | A reference to the name in an [Executor](https://tomcat.apache.org/tomcat-8.5-doc/config/executor.html) element. If this attribute is set, and the named executor exists, the connector will use the executor, and all the other thread attributes will be ignored. Note that if a shared executor is not specified for a connector then the connector will use a private, internal executor to provide the thread pool |
> | ---------- | ------------------------------------------------------------ |
> |            |                                                              |

## initInternal

无特殊逻辑

## startInternal

```java
//org.apache.catalina.core.StandardThreadExecutor#startInternal
 /**
     * Start the component and implement the requirements
     * of {@link org.apache.catalina.util.LifecycleBase#startInternal()}.
     *
     * @exception LifecycleException if this component detects a fatal error
     *  that prevents this component from being used
     */
    @Override
    protected void startInternal() throws LifecycleException {

        taskqueue = new TaskQueue(maxQueueSize);
        TaskThreadFactory tf = new TaskThreadFactory(namePrefix,daemon,getThreadPriority());
      	// 注意，这里是tomcat自己实现的ThreadPoolExecutor
        executor = new ThreadPoolExecutor(getMinSpareThreads(), getMaxThreads(), maxIdleTime, TimeUnit.MILLISECONDS,taskqueue, tf);
        executor.setThreadRenewalDelay(threadRenewalDelay);
        if (prestartminSpareThreads) {
            executor.prestartAllCoreThreads();
        }
        taskqueue.setParent(executor);

        setState(LifecycleState.STARTING);
    }
```

没有特殊的逻辑，只是这个tomcat的自己实现的Executor，和jdk的默认executor在行为上有所差异，后面会专门分析。

# MapperListener

MapperListener实现了`ContainerListener`接口和`LifecycleListener`接口，可以监听容器发出的`ContainerEvent`。MapperListener主要是为了Mapper服务的，通过监听到的事件，注册对应的信息到Mapper中。

这个组件没有覆写initInternal，startInternal的时候，将自己注册为Engine以及Engine的各个子容器的listener：

```java
//	org.apache.catalina.mapper.MapperListener#addListeners
 		/**
     * Add this mapper to the container and all child containers
     *
     * @param container
     */
    private void addListeners(Container container) {
        container.addContainerListener(this);
        container.addLifecycleListener(this);
        for (Container child : container.findChildren()) {
          	// 递归
            addListeners(child);
        }
    }

```

同时会将Host组件的相关信息注册至Mapper：

```java
// org.apache.catalina.mapper.MapperListener#registerHost
 		/**
     * Register host.
     */
    private void registerHost(Host host) {

        String[] aliases = host.findAliases();
        mapper.addHost(host.getName(), aliases, host);

        for (Container container : host.findChildren()) {
            if (container.getState().isAvailable()) {
              	// 子容器的映射信息
                registerContext((Context) container);
            }
        }
        if(log.isDebugEnabled()) {
            log.debug(sm.getString("mapperListener.registerHost",
                    host.getName(), domain, service));
        }
    }
```

以此类推，从 Engine -> Host -> Context -> Wrapper都会将映射信息注册到Mapper中，为后面的查找提供支撑。



除了启动时，自动注册信息到Mapper中，动态添加组件时，MapperListener也能监听到对应的变动：

```java
// org.apache.catalina.mapper.MapperListener#lifecycleEvent
 @Override
    public void lifecycleEvent(LifecycleEvent event) {
        if (event.getType().equals(Lifecycle.AFTER_START_EVENT)) {
          
        } else if (event.getType().equals(Lifecycle.BEFORE_STOP_EVENT)) {
          
        }
    }

// org.apache.catalina.mapper.MapperListener#containerEvent

   @Override
    public void containerEvent(ContainerEvent event) {

        if (Container.ADD_CHILD_EVENT.equals(event.getType())) {
          
        } else if (Container.REMOVE_CHILD_EVENT.equals(event.getType())) {
            // No need to unregister - life-cycle listener will handle this when
            // the child stops
        } else if (Host.ADD_ALIAS_EVENT.equals(event.getType())) {
            // Handle dynamically adding host aliases
        } else if (Host.REMOVE_ALIAS_EVENT.equals(event.getType())) {
            // Handle dynamically removing host aliases
        } else if (Wrapper.ADD_MAPPING_EVENT.equals(event.getType())) {
            // Handle dynamically adding wrappers
        } else if (Wrapper.REMOVE_MAPPING_EVENT.equals(event.getType())) {
            // Handle dynamically removing wrappers
        } else if (Context.ADD_WELCOME_FILE_EVENT.equals(event.getType())) {
            // Handle dynamically adding welcome files
        } else if (Context.REMOVE_WELCOME_FILE_EVENT.equals(event.getType())) {
            // Handle dynamically removing welcome files
        } else if (Context.CLEAR_WELCOME_FILES_EVENT.equals(event.getType())) {
            // Handle dynamically clearing welcome files
        }
    }

```

# Mapper

> Mapper, which implements the servlet API mapping rules (which are derived
> from the HTTP rules).

Mapper，顾名思义，是专门做映射的。请求进来的时候负责根据请求中的host、uri等参数找到对应的容器。

映射的代码在`org.apache.catalina.mapper.Mapper#internalMap`，后续我们会在请求处理篇章中，具体分析映射的过程。

这个类没有实现接口。



# 总结

本文走马观花似的，过了一遍tomcat启动过程中涉及到的各个基础组件，分析了各个组件的initInternal和startInternal方法，详细地梳理了tomcat初始化的流程详细。



# 参考

- [06 | Tomcat系统架构（下）：聊聊多层容器的设计](https://time.geekbang.org/column/article/96764)
- [05 | Tomcat系统架构（上）： 连接器是如何设计的？](https://time.geekbang.org/column/article/96328)
