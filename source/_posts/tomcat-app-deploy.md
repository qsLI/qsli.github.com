---
title: tomcat应用部署过程（一）
tags: tomcat-app-deploy
category: tomcat
toc: true
typora-root-url: tomcat-app-deploy
typora-copy-images-to: tomcat-app-deploy
date: 2022-10-23 17:07:04
---



从前两篇文章中，我们熟悉了tomcat核心组件的启动过程。但是应用是如何部署的，何时部署的，这些过程仍然没有解释清楚。这篇文章，我们主要分析下应用部署的过程。要厘清楚调用关系，最快的莫过于火焰图。

![image-20211205203743479](/image-20211205203743479.png)

从火焰图中，可以清晰地看到，spring应用的启动是在HostConfig#deployDirectory中进行的。那么这个HostConfig到底是何方神圣，启动过程中，怎么没有见到他的身影呢？



# 源码

## HostConfig

### 从哪里来？

```java
public class HostConfig implements LifecycleListener {
 
  // 省略
}
```

HostConfig是LifecycleListener的实现，通过前面的分析，我们知道所有的Listener都在LifecyBase中注册。开启debug模式，在addListener的时候，添加断点，就不难找到调用链路了。

![image-20211205204201902](/image-20211205204201902.png)

Digester解析StandardHost过程中创建的HostConfig，默认的我们的server.xml中是没有声明HostConfig的，顺藤摸瓜，可以在代码中找到调用点：

```java
// org.apache.catalina.startup.Catalina#createStartDigester
digester.addRuleSet(new HostRuleSet("Server/Service/Engine/"));

// org.apache.catalina.startup.HostRuleSet#addRuleInstances
digester.addRule(prefix + "Host",
                 new LifecycleListenerRule
                 ("org.apache.catalina.startup.HostConfig",
                  "hostConfigClass"));
```

### 干了什么？

先看start方法：

```java
// org.apache.catalina.startup.HostConfig#start
 /**
     * Process a "start" event for this Host.
     */
public void start() {

  if (log.isDebugEnabled())
    log.debug(sm.getString("hostConfig.start"));

  try {
    ObjectName hostON = host.getObjectName();
    oname = new ObjectName
      (hostON.getDomain() + ":type=Deployer,host=" + host.getName());
    // 注册deployer
    Registry.getRegistry(null, null).registerComponent
      (this, oname, this.getClass().getName());
  } catch (Exception e) {
    log.error(sm.getString("hostConfig.jmx.register", oname), e);
  }

  if (!host.getAppBaseFile().isDirectory()) {
    log.error(sm.getString("hostConfig.appBase", host.getName(),
                           host.getAppBaseFile().getPath()));
    host.setDeployOnStartup(false);
    host.setAutoDeploy(false);
  }

  // 尝试deploy一次app，这个开关默认是true
  if (host.getDeployOnStartup())
    deployApps();

}
```

再看看看他在监听的方法里做了什么：

```java
// org.apache.catalina.startup.HostConfig#lifecycleEvent
 /**
     * Process the START event for an associated Host.
     *
     * @param event The lifecycle event that has occurred
     */
    @Override
    public void lifecycleEvent(LifecycleEvent event) {

        // Identify the host we are associated with
        try {
            host = (Host) event.getLifecycle();
          	// 从StandardHost复制一些配置过来
            if (host instanceof StandardHost) {
                setCopyXML(((StandardHost) host).isCopyXML());
                setDeployXML(((StandardHost) host).isDeployXML());
                setUnpackWARs(((StandardHost) host).isUnpackWARs());
                setContextClass(((StandardHost) host).getContextClass());
            }
        } catch (ClassCastException e) {
            log.error(sm.getString("hostConfig.cce", event.getLifecycle()), e);
            return;
        }

      	// 这里是listener提供的功能
        // Process the event that has occurred
        if (event.getType().equals(Lifecycle.PERIODIC_EVENT)) {
            check();
        } else if (event.getType().equals(Lifecycle.BEFORE_START_EVENT)) {
            beforeStart();
        } else if (event.getType().equals(Lifecycle.START_EVENT)) {
            start();
        } else if (event.getType().equals(Lifecycle.STOP_EVENT)) {
            stop();
        }
    }
```

LifeCycleEvent中，除了PERIODIC_EVENT不是状态转移触发的，其他的基本都是状态转移触发的，可以查看前面的相关文章。

#### PERIODIC_EVENT

##### 事件来源

首先看`Lifecycle.PERIODIC_EVENT`，这个事件是ContainerBase中发出的， **是在单独的线程中处理的**。

```java
// org.apache.catalina.core.ContainerBase#backgroundProcess
fireLifecycleEvent(Lifecycle.PERIODIC_EVENT, null);
```

ContainerBase在startInternal的最后，如果**backgroundProcessorDelay > 0（默认值-1）**，则会**启动一个线程**来**周期性**地调用自身和child容器的backgroundProcess。**只有StandardEngine修改了默认值**，改为了10，所以会持有这个backgroundProcessor：

```java
// org.apache.catalina.core.StandardEngine#StandardEngine
/**
     * Create a new StandardEngine component with the default basic Valve.
     */
public StandardEngine() {

  super();
  pipeline.setBasic(new StandardEngineValve());
  /* Set the jmvRoute using the system property jvmRoute */
  try {
    setJvmRoute(System.getProperty("jvmRoute"));
  } catch(Exception ex) {
    log.warn(sm.getString("standardEngine.jvmRouteFail"));
  }
  // By default, the engine will hold the reloading thread
  // 这里修改了默认值
  backgroundProcessorDelay = 10;

}
```

用jstack可以验证下，发现只有一条这个线程：

```java
"ContainerBackgroundProcessor[StandardEngine[Catalina]]" #57 daemon prio=5 os_prio=31 tid=0x0000000118f72000 nid=0x7203 waiting on condition [0x000000017a0ba000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
        at java.lang.Thread.sleep(Native Method)
        at org.apache.catalina.core.ContainerBase$ContainerBackgroundProcessor.run(ContainerBase.java:1357)
        at java.lang.Thread.run(Thread.java:748)
```

线程启动的代码位置：

```java
// org.apache.catalina.core.ContainerBase#startInternal
// Start our thread
threadStart();

// org.apache.catalina.core.ContainerBase#threadStart
 /**
     * Start the background thread that will periodically check for
     * session timeouts.
     */
    protected void threadStart() {

        if (thread != null)
            return;
      	// 注意虽然Host/Context/Wrapper也继承了ContainerBase，但是这个值都是默认的-1，不会创建线程
      	// StandardEngine修改了默认值，所以会有这个线程，线程内会调用子容器的backgroundProcess（）方法
        if (backgroundProcessorDelay <= 0)
            return;

        threadDone = false;
        String threadName = "ContainerBackgroundProcessor[" + toString() + "]";
        thread = new Thread(new ContainerBackgroundProcessor(), threadName);
        thread.setDaemon(true);
        thread.start();

    }

// org.apache.catalina.core.ContainerBase.ContainerBackgroundProcessor
 protected class ContainerBackgroundProcessor implements Runnable {
   @Override
   public void run() {
     Throwable t = null;
     String unexpectedDeathMessage = sm.getString(
       "containerBase.backgroundProcess.unexpectedThreadDeath",
       Thread.currentThread().getName());
     try {
       while (!threadDone) {
         try {
           // 这里有sleep
           Thread.sleep(backgroundProcessorDelay * 1000L);
         } catch (InterruptedException e) {
           // Ignore
         }
         if (!threadDone) {
           processChildren(ContainerBase.this);
         }
       }
     } catch (RuntimeException|Error e) {
       t = e;
       throw e;
     } finally {
       if (!threadDone) {
         log.error(unexpectedDeathMessage, t);
       }
     }
   }

// org.apache.catalina.core.ContainerBase.ContainerBackgroundProcessor#processChildren
 protected void processChildren(Container container) {
   ClassLoader originalClassLoader = null;

   try {
     if (container instanceof Context) {
       Loader loader = ((Context) container).getLoader();
       // Loader will be null for FailedContext instances
       if (loader == null) {
         return;
       }

       // Ensure background processing for Contexts and Wrappers
       // is performed under the web app's class loader
       originalClassLoader = ((Context) container).bind(false, null);
     }
     // 调用自身的，
     container.backgroundProcess();
     Container[] children = container.findChildren();
     for (int i = 0; i < children.length; i++) {
       if (children[i].getBackgroundProcessorDelay() <= 0) {
         // 递归处理子容器
         processChildren(children[i]);
       }
     }
   } catch (Throwable t) {
     ExceptionUtils.handleThrowable(t);
     log.error("Exception invoking periodic operation: ", t);
   } finally {
     if (container instanceof Context) {
       ((Context) container).unbind(false, originalClassLoader);
     }
   }
 }
```

##### 对应操作

StandardEngine会递归的调用子容器的backgroundProcess方法，该方法中会发出PERIODIC_EVENT。

StandardHost发出PERIODIC_EVENT，HostConfig作为其listener接收到PERIODIC_EVENT，会执行check的逻辑，

```java
// org.apache.catalina.startup.HostConfig#check()

 /**
     * Check status of all webapps.
     */
    protected void check() {
				
      	// 是否开启自动部署
        if (host.getAutoDeploy()) {
            // Check for resources modification to trigger redeployment
            DeployedApplication[] apps =
                deployed.values().toArray(new DeployedApplication[0]);
            for (int i = 0; i < apps.length; i++) {
                if (!isServiced(apps[i].name))
                    checkResources(apps[i], false);
            }

            // Check for old versions of applications that can now be undeployed
            if (host.getUndeployOldVersions()) {
                checkUndeploy();
            }

            // Hotdeploy applications
            deployApps();
        }
    }

// org.apache.catalina.startup.HostConfig#deployApps()
		/**
     * Deploy applications for any directories or WAR files that are found
     * in our "application root" directory.
     */
    protected void deployApps() {

        File appBase = host.getAppBaseFile();
        File configBase = host.getConfigBaseFile();
        String[] filteredAppPaths = filterAppPaths(appBase.list());
        // Deploy XML descriptors from configBase
        deployDescriptors(configBase, configBase.list());
      	// 部署war包
        // Deploy WARs
        deployWARs(appBase, filteredAppPaths);
      	//部署 war_exploded
        // Deploy expanded folders
        deployDirectories(appBase, filteredAppPaths);

    }
```

这三种形式的deploy最终都会以**任务**的形式提交到host的**startStopExecutor**中（不阻塞其他的Listener），

- deployDescriptors -> DeployDescriptor
- deployWARs -> DeployWar
- deployDirectories -> DeployDirectory

最终也会调用HostConfig的方法进行部署，以DeployDirectory为例，最终调用org.apache.catalina.startup.HostConfig#deployDirectory。

这个过程跟火焰图中的调用栈就对得上了。

```java
// org.apache.catalina.startup.HostConfig#deployDirectory
 Class<?> clazz = Class.forName(host.getConfigClass());
LifecycleListener listener =
  (LifecycleListener) clazz.newInstance();
context.addLifecycleListener(listener);

context.setName(cn.getName());
context.setPath(cn.getPath());
context.setWebappVersion(cn.getVersion());
context.setDocBase(cn.getBaseName());
host.addChild(context);
```

核心的代码就是创建Contex，添加为host的子容器。Context可以通过META-INF/context.xml里定制，如果没有的话，会走默认的。这样应用就添加到了tomcat里。子容器在添加之后，host会调用其start方法，触发它的初始化流程。

#### BEFORE_START_EVENT

创建server.xml中声明的appBase和configBase目录：

```java
// org.apache.catalina.startup.HostConfig#beforeStart
 				if (host.getCreateDirs()) {
            File[] dirs = new File[] {host.getAppBaseFile(),host.getConfigBaseFile()};
            for (int i=0; i<dirs.length; i++) {
                if (!dirs[i].mkdirs() && !dirs[i].isDirectory()) {
                    log.error(sm.getString("hostConfig.createDirs",dirs[i]));
                }
            }
        }
```

#### START_EVENT

```java
//  org.apache.catalina.startup.HostConfig#start
 /**
     * Process a "start" event for this Host.
     */
    public void start() {

        if (log.isDebugEnabled())
            log.debug(sm.getString("hostConfig.start"));

        try {
            ObjectName hostON = host.getObjectName();
            oname = new ObjectName
                (hostON.getDomain() + ":type=Deployer,host=" + host.getName());
            Registry.getRegistry(null, null).registerComponent
                (this, oname, this.getClass().getName());
        } catch (Exception e) {
            log.error(sm.getString("hostConfig.jmx.register", oname), e);
        }

        if (!host.getAppBaseFile().isDirectory()) {
            log.error(sm.getString("hostConfig.appBase", host.getName(),
                    host.getAppBaseFile().getPath()));
            host.setDeployOnStartup(false);
            host.setAutoDeploy(false);
        }

        if (host.getDeployOnStartup())
            deployApps();

    }
```

这里只是注册HostConfig到Mbean的Registry中，如果开启了deployOnStartup，这里也会尝试部署一次应用。

#### STOP_EVENT

```java
// org.apache.catalina.startup.HostConfig#stop
 /**
     * Process a "stop" event for this Host.
     */
    public void stop() {

        if (log.isDebugEnabled())
            log.debug(sm.getString("hostConfig.stop"));

        if (oname != null) {
            try {
                Registry.getRegistry(null, null).unregisterComponent(oname);
            } catch (Exception e) {
                log.error(sm.getString("hostConfig.jmx.unregister", oname), e);
            }
        }
        oname = null;
    }
```

同理，stop中，只是将自身从Registry中移除。



## ContextConfig

### 从哪里来？

和HostConfig类似，Context会有一个对应的LifecycleListener，叫做ContextConfig。他也是在创建的时候默认指定的：

```java
// org.apache.catalina.startup.ContextRuleSet
digester.addRule(prefix + "Context",
                 new LifecycleListenerRule
                 ("org.apache.catalina.startup.ContextConfig",
                  "configClass"));
```

### 干了什么？

看下他在监听部分做了什么：

```java
//org.apache.catalina.startup.ContextConfig#lifecycleEvent
 @Override
    public void lifecycleEvent(LifecycleEvent event) {

        // Identify the context we are associated with
        try {
            context = (Context) event.getLifecycle();
        } catch (ClassCastException e) {
            log.error(sm.getString("contextConfig.cce", event.getLifecycle()), e);
            return;
        }

        // Process the event that has occurred
        if (event.getType().equals(Lifecycle.CONFIGURE_START_EVENT)) {
            configureStart();
        } else if (event.getType().equals(Lifecycle.BEFORE_START_EVENT)) {
            beforeStart();
        } else if (event.getType().equals(Lifecycle.AFTER_START_EVENT)) {
            // Restore docBase for management tools
            if (originalDocBase != null) {
                context.setDocBase(originalDocBase);
            }
        } else if (event.getType().equals(Lifecycle.CONFIGURE_STOP_EVENT)) {
            configureStop();
        } else if (event.getType().equals(Lifecycle.AFTER_INIT_EVENT)) {
            init();
        } else if (event.getType().equals(Lifecycle.AFTER_DESTROY_EVENT)) {
            destroy();
        }

    }
```

#### CONFIGURE_START_EVENT

##### 事件来源

StandardContext在启动的时候会发出这个事件，Listener在收到这个event之后，会做一些初始化的准备工作。listener逻辑执行完成之后，会继续执行Context启动的后续逻辑

```java
// org.apache.catalina.core.StandardContext#startInternal
// Notify our interested LifecycleListeners
fireLifecycleEvent(Lifecycle.CONFIGURE_START_EVENT, null);

 // Start our child containers, if not already started
// 子容器启动（ServletWrapper）
for (Container child : findChildren()) {
  if (!child.getState().isAvailable()) {
    child.start();
  }
}

// Start the Valves in our pipeline (including the basic),
// if any
// pipeline的初始化，会拉起valve的初始化
if (pipeline instanceof Lifecycle) {
  ((Lifecycle) pipeline).start();
}

// Call ServletContainerInitializers
// SCI初始化，spring boot默认依赖这个机制启动，org.springframework.web.SpringServletContainerInitializer
// Jasper JSP Engine也是通过SCI初始化： org.apache.jasper.servlet.JasperInitializer
for (Map.Entry<ServletContainerInitializer, Set<Class<?>>> entry :
     initializers.entrySet()) {
  try {
    entry.getKey().onStartup(entry.getValue(),
                             getServletContext());
  } catch (ServletException e) {
    log.error(sm.getString("standardContext.sciFail"), e);
    ok = false;
    break;
  }
}

// Configure and call application event listeners
// ServletContextListener的初始化，使用spring父子容器的话，这里会拉起父容器
// spring的listener： org.springframework.web.context.ContextLoaderListener
if (ok) {
  if (!listenerStart()) {
    log.error(sm.getString("standardContext.listenerFail"));
    ok = false;
  }
}

 // Configure and call application filters
// filter启动
if (ok) {
  if (!filterStart()) {
    log.error(sm.getString("standardContext.filterFail"));
    ok = false;
  }
}

// Load and initialize all "load on startup" servlets
// servlet启动，如果servlet设置了load-on-startup
// 如果只是使用了spring mvc，一般就是个servlet，则是在这一步拉起来的
if (ok) {
  if (!loadOnStartup(findChildren())){
    log.error(sm.getString("standardContext.servletFail"));
    ok = false;
  }
}
```

loadOnStartup如果是true，则启动的时候就拉起Servlet，否则的话是第一个请求过来时触发加载，**lazy式**的：

```java
// org.apache.catalina.core.StandardContext#loadOnStartup
// Load the collected "load on startup" servlets
for (ArrayList<Wrapper> list : map.values()) {
  for (Wrapper wrapper : list) {
    try {
      // 触发servlet加载，走入servlet的声明周期，调用servlet的init方法
      wrapper.load();
    } catch (ServletException e) {
      getLogger().error(sm.getString("standardContext.loadOnStartup.loadException",
                                     getName(), wrapper.getName()), StandardWrapper.getRootCause(e));
      // NOTE: load errors (including a servlet that throws
      // UnavailableException from the init() method) are NOT
      // fatal to application startup
      // unless failCtxIfServletStartFails="true" is specified
      if(getComputedFailCtxIfServletStartFails()) {
        return false;
      }
    }
  }
}
```



##### 对应操作

在这个事件的处理函数configureStart中，会扫描web.xml以及相关的文件，配置context。最主要的方法是webConfig()。

> Scan the web.xml files that apply to the web application and merge them
> using the rules defined in the spec. For the global web.xml files,
> where there is duplicate configuration, the most specific level wins. ie
> an application's web.xml takes precedence over the host level or global
> web.xml file.

值得一提的是，这里的listener处理是**同步的**，处理完才会返回到主流程中。webConfig中包含了Servlet注解、filter等的**扫描**，也包含了SCI的处理。

```java
// org.apache.catalina.startup.ContextConfig#configureStart
 /**
     * Process a "contextConfig" event for this Context.
     */
protected synchronized void configureStart() {
  // Called from StandardContext.start()

  // 核心，web.xml, web-fragment.xml, SCI处理
  // ASM读取class上servlet3.0相关的注解(WEB-INF/classes和)
  // 多个fragment合并成一个web.xml，可以log effective web.xml，
  // 处理WEB-INF/classes/META-INF/resources
  // 扫描过程中找到的servlet定义，也会添加为Context的子容器（Wrapper）
  webConfig();

  // 处理Listener/Filter/Servlet上的@Resource注解 JSR250
  if (!context.getIgnoreAnnotations()) {
    applicationAnnotationsConfig();
  }
  if (ok) {
    validateSecurityRoles();
  }

  // Configure an authenticator if we need one
  if (ok) {
    authenticatorConfig();
  }

  // Make our application available if no problems were encountered
  if (ok) {
    context.setConfigured(true);
  } else {
    log.error(sm.getString("contextConfig.unavailable"));
    context.setConfigured(false);
  }

}
```

> | `logEffectiveWebXml` | Set to `true` if you want the effective web.xml used for a web application to be logged (at INFO level) when the application starts. The effective web.xml is the result of combining the application's web.xml with any defaults configured by Tomcat and any web-fragment.xml files and annotations discovered. If not specified, the default value of `false` is used. |
> | -------------------- | ------------------------------------------------------------ |

#### BEFORE_START_EVENT

调用start之前的钩子，主要是计算docBase

```java
// org.apache.catalina.startup.ContextConfig#beforeStart
/**
     * Process a "before start" event for this Context.
     */
protected synchronized void beforeStart() {

  try {
    fixDocBase();
  } catch (IOException e) {
    log.error(sm.getString(
      "contextConfig.fixDocBase", context.getName()), e);
  }

  antiLocking();
}
```



#### AFTER_START_EVENT

> Restore docBase for management tools

```java
// Restore docBase for management tools
if (originalDocBase != null) {
  context.setDocBase(originalDocBase);
}
```


#### CONFIGURE_STOP_EVENT

和configure start event对应，容器销毁时执行：

- Removing children
- Removing application parameters
- Removing security constraints
- Removing Ejbs
- Removing environments
- Removing errors pages
- Removing filter defs
- Removing filter maps
- Removing local ejbs
- Removing Mime mappings
- Removing parameters
- Removing resource env refs
- Removing resource links
- Removing resources
- Removing security role
- Removing servlet mappings
- Removing welcome files
- Removing wrapper lifecycles
- Removing wrapper listeners
- Remove (partially) folders and files created by antiLocking
- Reset ServletContextInitializer scanning

#### AFTER_INIT_EVENT

如果存在`conf/context.xml`，则处理下

```java
// org.apache.catalina.startup.ContextConfig#init
/**
     * Process a "init" event for this Context.
     */
protected void init() {
  // Called from StandardContext.init()

  Digester contextDigester = createContextDigester();
  contextDigester.getParser();

  if (log.isDebugEnabled()) {
    log.debug(sm.getString("contextConfig.init"));
  }
  context.setConfigured(false);
  ok = true;

  contextConfig(contextDigester);
}
```

#### AFTER_DESTROY_EVENT

删除对应的work dir

```java
// org.apache.catalina.startup.ContextConfig#destroy
/**
     * Process a "destroy" event for this Context.
     */
protected synchronized void destroy() {
  // Called from StandardContext.destroy()
  if (log.isDebugEnabled()) {
    log.debug(sm.getString("contextConfig.destroy"));
  }

  // Skip clearing the work directory if Tomcat is being shutdown
  Server s = getServer();
  if (s != null && !s.getState().isAvailable()) {
    return;
  }

  // Changed to getWorkPath per Bugzilla 35819.
  if (context instanceof StandardContext) {
    String workDir = ((StandardContext) context).getWorkPath();
    if (workDir != null) {
      ExpandWar.delete(new File(workDir));
    }
  }
}
```

#   总结

- 应用的部署和初始化是依赖于HostConfig的，HostConfig是Host容器的**LifecycleListener**，如果没有在xml中显式声明的话，会有默认的
- HostConfig在start的时候，会尝试deployApps，会首次触发一次应用的部署，也是向startStopExecutor线程池提交一个任务（localhost-startStop）。
- Engine在启动结束时，会起一个ContainerBackgroundProcessor的线程，每10s会调用子容器的`backgroundProcess`方法，Host容器会发出PERIODIC_EVENT
- HostConfig监听到PERIODIC_EVENT，会判断是否开启了**autoDeploy**，如果开启了，则会检查是否有变更。有变更的话会触发部署，向startStopExecutor线程池提交一个任务（localhost-startStop）
- 任务的主要内容就是创建Context容器，并添加为Host容器的子容器，并触发Context容器的初始化
- Context容器也有一个**LifeCycleListener**——ContextConfig，会接收Context容器相关的事件
- Context容器在start时，会发出CONFIGURE_START_EVENT，ContextConfig接收到之后，会扫描web.xml、扫描jar包等，做一些准备的工作
- Context容器在调用Listener之后，会初始化他的子容器（ServletWrapper）和pipeline（触发valve的初始化），调用SCI的onstartup方法，**按顺序**触发ContextListener、Filter、Servlet。
- Servlet如果声明了load-on-startup，则会在Context的start方法中被初始化（调用servlet的init方法）
- 除了这种通过HostConfig触发的应用部署，还有关闭autoDeploy的情况下的部署，我们在下篇文章中再介绍。
