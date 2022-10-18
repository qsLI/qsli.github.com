---
title: tomcat应用部署过程
toc: true
typora-root-url: tomcat-app-deploy
typora-copy-images-to: tomcat-app-deploy
tags: tomcat
category: tomcat
---

从前两篇文章中，我们熟悉了tomcat核心组件的启动过程。但是应用是如何部署的，何时部署的，这些过程仍然没有解释清楚。这篇文章，我们主要分析下应用部署的过程。要厘清楚调用关系，最快的莫过于火焰图。

![image-20211205203743479](/image-20211205203743479.png)

从火焰图中，可以清晰地看到，spring应用的启动是在HostConfig#deployDirectory中进行的。那么这个HostConfig到底是何方神圣，启动过程中，怎么没有见到他的身影呢？



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

很简单，看他在监听的方法里做了什么：

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

#### PERIODIC_EVENT

首先看`Lifecycle.PERIODIC_EVENT`，这个事件是ContainerBase中发出的， 

```java
// org.apache.catalina.core.ContainerBase#backgroundProcess
fireLifecycleEvent(Lifecycle.PERIODIC_EVENT, null);
```

ContainerBase在startInternal的最后，会启动一个线程来周期性地调用自身和child容器的backgroundProcess:

```java
"ContainerBackgroundProcessor[StandardEngine[Catalina]]" #57 daemon prio=5 os_prio=31 tid=0x0000000118f72000 nid=0x7203 waiting on condition [0x000000017a0ba000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
        at java.lang.Thread.sleep(Native Method)
        at org.apache.catalina.core.ContainerBase$ContainerBackgroundProcessor.run(ContainerBase.java:1357)
        at java.lang.Thread.run(Thread.java:748)
```

代码位置：

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
        if (backgroundProcessorDelay <= 0)
            return;

        threadDone = false;
        String threadName = "ContainerBackgroundProcessor[" + toString() + "]";
        thread = new Thread(new ContainerBackgroundProcessor(), threadName);
        thread.setDaemon(true);
        thread.start();

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
     // 调用自身的
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

当HostConfig接收到周期调用的会执行check的逻辑，

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

这三种形式的deploy最终都会以任务的形式提交到host的startStopExecutor中（不阻塞其他的Listener），

- deployDescriptors -> DeployDescriptor
- deployWARs -> DeployWar
- deployDirectories -> DeployDirectory

最终也会调用HostConfig的方法进行部署，以DeployDirectory为例，最终调用org.apache.catalina.startup.HostConfig#deployDirectory

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

和HostConfig类似，Context会有一个对应的LifecycleListener，叫做ContextConfig。他也是在创建的时候默认指定的：

```java
// org.apache.catalina.startup.ContextRuleSet
digester.addRule(prefix + "Context",
                 new LifecycleListenerRule
                 ("org.apache.catalina.startup.ContextConfig",
                  "configClass"));
```

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

### CONFIGURE_START_EVENT

StandardContext在启动的时候会发出这个事件：

```java
// org.apache.catalina.core.StandardContext#startInternal
// Notify our interested LifecycleListeners
fireLifecycleEvent(Lifecycle.CONFIGURE_START_EVENT, null);
```

在这个事件中，会扫描web.xml以及相关的文件，配置context。最主要的方法是webConfig()。

> Scan the web.xml files that apply to the web application and merge them
> using the rules defined in the spec. For the global web.xml files,
> where there is duplicate configuration, the most specific level wins. ie
> an application's web.xml takes precedence over the host level or global
> web.xml file.

值得一提的是，这里的listener处理是同步的，处理完才会返回到主流程中。webConfig中包含了Servlet注解、filter等的扫描，也包含了SCI的处理，这里就不详细展开了。

