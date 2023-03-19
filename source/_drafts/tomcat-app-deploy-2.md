---
title: tomcat应用部署过程（二）
toc: true
typora-root-url: tomcat-app-deploy-2
typora-copy-images-to: tomcat-app-deploy-2
tags: tomcat-app-deploy
category: tomcat
---

除了前面介绍的，通过后台线程触发的自动部署，还有另外两种应用部署方式。

一种是通过RMI调用tomcat暴露出来的MBean的方法；

另外一种是直接在server.xml中声明我们的应用。

前者是intellij idea中tomcat插件的使用方式，后者可以将我们的应用作为默认的app。另外，spring boot使用的embedded tomcat也是自己组装的。

## RMI调用

![image-20221024224729507](/image-20221024224729507.png)

MBeanFactory对应的代码：

```java
// org.apache.catalina.mbeans.MBeanFactory#createStandardContext(java.lang.String, java.lang.String, java.lang.String)
public String createStandardContext(String parent,
                                    String path,
                                    String docBase)
  throws Exception {

  return createStandardContext(parent, path, docBase, false, false);
}

// org.apache.catalina.mbeans.MBeanFactory#createStandardContext(java.lang.String, java.lang.String, java.lang.String, boolean, boolean)
public String createStandardContext(String parent,
                                        String path,
                                        String docBase,
                                        boolean xmlValidation,
                                        boolean xmlNamespaceAware)
  throws Exception {

  // Create a new StandardContext instance
  StandardContext context = new StandardContext();
  path = getPathStr(path);
  context.setPath(path);
  context.setDocBase(docBase);
  context.setXmlValidation(xmlValidation);
  context.setXmlNamespaceAware(xmlNamespaceAware);

  // 之前讲过的ContextConfig
  ContextConfig contextConfig = new ContextConfig();
  context.addLifecycleListener(contextConfig);

  // Add the new instance to its parent component
  ObjectName pname = new ObjectName(parent);
  ObjectName deployer = new ObjectName(pname.getDomain()+
                                       ":type=Deployer,host="+
                                       pname.getKeyProperty("host"));
  if(mserver.isRegistered(deployer)) {
    String contextName = context.getName();
    mserver.invoke(deployer, "addServiced",
                   new Object [] {contextName},
                   new String [] {"java.lang.String"});
    String configPath = (String)mserver.getAttribute(deployer,
                                                     "configBaseName");
    String baseName = context.getBaseName();
    File configFile = new File(new File(configPath), baseName+".xml");
    if (configFile.isFile()) {
      context.setConfigFile(configFile.toURI().toURL());
    }
    mserver.invoke(deployer, "manageApp",
                   new Object[] {context},
                   new String[] {"org.apache.catalina.Context"});
    mserver.invoke(deployer, "removeServiced",
                   new Object [] {contextName},
                   new String [] {"java.lang.String"});
  } else {
    log.warn("Deployer not found for "+pname.getKeyProperty("host"));
    Service service = getService(pname);
    Engine engine = service.getContainer();
    Host host = (Host) engine.findChild(pname.getKeyProperty("host"));
    // 这里手动addChild，加入到host中，会触发context的初始化
    host.addChild(context);
  }

  // Return the corresponding MBean name
  return context.getObjectName().toString();

}
```

Context的初始化跟其他的方式没有太大的差别，部署的话会看有无注册deployer。有deployer的话，逻辑就委托给deployer了；没有的话就手动注册到Host上。

### Deployer

这里出来了个deployer的概念，使用arthas看下对应的mbean信息：

```bash
[arthas@84911]$ mbean | grep -i Deployer
Catalina:type=Deployer,host=localhost
[arthas@84911]$ mbean Catalina:type=Deployer,host=localhost
 OBJECT_NAME     Catalina:type=Deployer,host=localhost
--------------------------------------------------------------------------------------------------------------------------------------------------
 NAME            VALUE
--------------------------------------------------------------------------------------------------------------------------------------------------
 configBaseName  /Users/qishengli/Library/Caches/JetBrains/IntelliJIdea2020.2/tomcat/15632928-a384-44e8-ba78-fe9ca3f37059/conf/Catalina/localhost
 modelerType     org.apache.catalina.startup.HostConfig
 copyXML         false
 unpackWARs      true
 className       org.apache.catalina.startup.HostConfig
 deployXML       true
 contextClass    org.apache.catalina.core.StandardContext
```

查找这个mbean的注册位置，发现是HostConfig在启动的时候注册的：

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

  // 这里也会触发一次deploy，deployOnStartup默认是true
  if (host.getDeployOnStartup())
    deployApps();

}
```

翻看HostConfig的代码，意外发现，他在start的时候，也会触发一次deploy，跟后台线程的一致，最终也是丢到startStop线程池里。这个行为是有开关控制的，默认是true：
> | `deployOnStartup` | This flag value indicates if web applications from this host should be automatically deployed when Tomcat starts. The flag's value defaults to true. See [Automatic Application Deployment](https://tomcat.apache.org/tomcat-8.0-doc/config/host.html#Automatic_Application_Deployment) for more information. |
> | ----------------- | ------------------------------------------------------------ |

从deployer的注册代码可以看到，最终注册的bean就是HostConfig自身。前面部署的时候，如果有deployer，则会依次调用deployer的addServiced、manageApp、removeServiced方法。看下具体的实现：

#### addServiced

```java

/**
     * List of applications which are being serviced, and shouldn't be
     * deployed/undeployed/redeployed at the moment.
     */
protected final ArrayList<String> serviced = new ArrayList<>();

// org.apache.catalina.startup.HostConfig#addServiced
/**
     * Add a serviced application to the list.
     * @param name the context name
     */
public synchronized void addServiced(String name) {
  serviced.add(name);
}
```

从注释可以看到，加入到这个集合的就被认为正在处理中，不应该进行`deployed / undeployed / redeployed`等操作

在`deployDescriptors`方法中也做了check：

```java
// org.apache.catalina.startup.HostConfig#deployDescriptors
/**
     * Deploy XML context descriptors.
     * @param configBase The config base
     * @param files The XML descriptors which should be deployed
     */
protected void deployDescriptors(File configBase, String[] files) {

  if (files == null)
    return;

  ExecutorService es = host.getStartStopExecutor();
  List<Future<?>> results = new ArrayList<>();

  for (int i = 0; i < files.length; i++) {
    File contextXml = new File(configBase, files[i]);

    if (files[i].toLowerCase(Locale.ENGLISH).endsWith(".xml")) {
      ContextName cn = new ContextName(files[i], true);
			
      // 这里，如果在serviced集合中，则直接跳过了
      if (isServiced(cn.getName()) || deploymentExists(cn.getName()))
        continue;

      results.add(
        es.submit(new DeployDescriptor(this, cn, contextXml)));
    }
  }

  for (Future<?> result : results) {
    try {
      result.get();
    } catch (Exception e) {
      log.error(sm.getString(
        "hostConfig.deployDescriptor.threaded.error"), e);
    }
  }
}
```

#### manageApp

```java
// org.apache.catalina.startup.HostConfig#manageApp
 /**
     * Add a new Context to be managed by us.
     * Entry point for the admin webapp, and other JMX Context controllers.
     * @param context The context instance
     */
public void manageApp(Context context)  {

  String contextName = context.getName();

  // deploy过了，就不处理了
  if (deployed.containsKey(contextName))
    return;

  DeployedApplication deployedApp =
    new DeployedApplication(contextName, false);

  // Add the associated docBase to the redeployed list if it's a WAR
  boolean isWar = false;
  if (context.getDocBase() != null) {
    File docBase = new File(context.getDocBase());
    if (!docBase.isAbsolute()) {
      docBase = new File(host.getAppBaseFile(), context.getDocBase());
    }
    deployedApp.redeployResources.put(docBase.getAbsolutePath(),
                                      Long.valueOf(docBase.lastModified()));
    if (docBase.getAbsolutePath().toLowerCase(Locale.ENGLISH).endsWith(".war")) {
      isWar = true;
    }
  }
  // 也是加入到了Host容器中，这是最关键的一步
  host.addChild(context);
  // Add the eventual unpacked WAR and all the resources which will be
  // watched inside it
  boolean unpackWAR = unpackWARs;
  if (unpackWAR && context instanceof StandardContext) {
    unpackWAR = ((StandardContext) context).getUnpackWAR();
  }
  // 是否自动解压war包
  if (isWar && unpackWAR) {
    File docBase = new File(host.getAppBaseFile(), context.getBaseName());
    deployedApp.redeployResources.put(docBase.getAbsolutePath(),
                                      Long.valueOf(docBase.lastModified()));
    addWatchedResources(deployedApp, docBase.getAbsolutePath(), context);
  } else {
    addWatchedResources(deployedApp, null, context);
  }
  // 标记为已经deployed
  deployed.put(contextName, deployedApp);
}
```

#### removeServiced

和addServiced对应，manageApp结束之后，将其从serviced集合中移除：

```java
// org.apache.catalina.startup.HostConfig#removeServiced
/**
     * Removed a serviced application from the list.
     * @param name the context name
     */
public synchronized void removeServiced(String name) {
  serviced.remove(name);
}
```



## Server.xml中直接声明Context

```xml
<Host name="localhost"  appBase="webapps"
      unpackWARs="true" autoDeploy="true">
  <Context path="" docBase="/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT"/>
</Host>
```

```bash
➜  web-1.0-SNAPSHOT  pwd
/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT
➜  web-1.0-SNAPSHOT  tree
.
├── META-INF
├── WEB-INF
│   ├── classes
│   │   └── com
│   │       └── air
│   │           ├── SampleServlet.class
│   │           ├── async
│   │           │   ├── AppAsyncListener.class
│   │           │   ├── AppContextListener.class
│   │           │   ├── AsyncRequestProcessor$1.class
│   │           │   ├── AsyncRequestProcessor.class
│   │           │   └── AsyncServlet.class
│   │           └── transferencoding
│   │               └── TransferEncodingServlet.class
│   ├── lib
│   │   ├── javax.servlet-api-3.1.0.jar
│   │   ├── logback-classic-1.0.9.jar
│   │   ├── logback-core-1.0.9.jar
│   │   └── slf4j-api-1.7.25.jar
│   └── web.xml
└── index.jsp
```

启动时的日志：

```bash
29-Oct-2022 22:56:18.828 INFO [main] org.apache.coyote.AbstractProtocol.init Initializing ProtocolHandler ["http-nio-8080"]
29-Oct-2022 22:56:18.833 INFO [main] org.apache.tomcat.util.net.NioSelectorPool.getSharedSelector Using a shared selector for servlet write/read
29-Oct-2022 22:56:18.838 INFO [main] org.apache.coyote.AbstractProtocol.init Initializing ProtocolHandler ["ajp-nio-8009"]
29-Oct-2022 22:56:18.839 INFO [main] org.apache.tomcat.util.net.NioSelectorPool.getSharedSelector Using a shared selector for servlet write/read
29-Oct-2022 22:56:18.839 INFO [main] org.apache.catalina.startup.Catalina.load Initialization processed in 227 ms
29-Oct-2022 22:56:18.848 INFO [main] org.apache.catalina.core.StandardService.startInternal Starting service [Catalina]
29-Oct-2022 22:56:18.848 INFO [main] org.apache.catalina.core.StandardEngine.startInternal Starting Servlet Engine: Apache Tomcat/8.5.40
29-Oct-2022 22:56:18.996 INFO [localhost-startStop-1] org.apache.jasper.servlet.TldScanner.scanJars At least one JAR was scanned for TLDs yet contained no TLDs. Enable debug logging for this logger for a complete list of JARs that were scanned but no TLDs were found in them. Skipping unneeded JARs during scanning can improve startup time and JSP compilation time.
# 这里说明servlet已经被拉起了
22:56:19.046 [localhost-startStop-1] INFO  com.air.SampleServlet - initing sample servlet
29-Oct-2022 22:56:19.053 INFO [localhost-startStop-1] org.apache.catalina.startup.HostConfig.deployDirectory Deploying web application directory [/Users/qishengli/Downloads/apache-tomcat-8.5.40/webapps/docs]
```

使用arthas验证下：

```bash
[arthas@41194]$ mbean Catalina:type=Loader,host=localhost,context=/
 OBJECT_NAME               Catalina:type=Loader,host=localhost,context=/
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 NAME                      VALUE
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 delegate                  false
 loaderRepositoriesString  file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/classes/:file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/l
                           ib/slf4j-api-1.7.25.jar:file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/javax.servlet-api-3.1.0.jar:file:/Users/qishengli/D
                           ownloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/logback-core-1.0.9.jar:file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/lo
                           gback-classic-1.0.9.jar:
 modelerType               org.apache.catalina.loader.WebappLoader
 loaderRepositories        [file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/classes/, file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF
                           /lib/slf4j-api-1.7.25.jar, file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/javax.servlet-api-3.1.0.jar, file:/Users/qisheng
                           li/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/logback-core-1.0.9.jar, file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/l
                           ib/logback-classic-1.0.9.jar]
 stateName                 STARTED
 reloadable                false
 className                 org.apache.catalina.loader.WebappLoader
 

[arthas@41194]$ mbean Catalina:j2eeType=WebModule,name=//localhost/,J2EEApplication=none,J2EEServer=none
 OBJECT_NAME                       Catalina:j2eeType=WebModule,name=//localhost/,J2EEApplication=none,J2EEServer=none
----------------------------------------------------------------------------------------------------------------------
 NAME                              VALUE
----------------------------------------------------------------------------------------------------------------------
 antiResourceLocking               false
 encodedPath
 maxTime                           0
 paused                            false
 loader                            WebappLoader[]
 logger                            org.apache.juli.logging.DirectJDKLog@7af309b5
 useNaming                         true
 logEffectiveWebXml                false
 path
 originalDocBase                   null
 children                          [Ljavax.management.ObjectName;@7434e89b
 stateName                         STARTED
 clearReferencesStopTimerThreads   false
 useHttpOnly                       true
 managedResource                   StandardEngine[Catalina].StandardHost[localhost].StandardContext[]
 baseName                          ROOT
 errorCount                        0
 configured                        true
 unloadDelay                       2000
 ignoreAnnotations                 false
 processingTime                    0
 clearReferencesStopThreads        false
 privileged                        false
 xmlValidation                     false
 altDDName                         null
 name
 sessionTimeout                    30
 unpackWAR                         true
 javaVMs                           null
 renewThreadsWhenStoppingContext   true
 server                            null
 docBase                           /Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT
 modelerType                       org.apache.catalina.core.StandardContext
 displayName                       null
 defaultWebXml                     null
 reloadable                        false
 parentClassLoader                 java.net.URLClassLoader@548c4f57
 webappVersion
 clearReferencesThreadLocals       true
 cookies                           true
 delegate                          false
 mapperDirectoryRedirectEnabled    false
 minTime                           9223372036854775807
 swallowOutput                     false
 configFile                        null
 startTime                         1667055379052
 tldValidation                     false
 override                          false
 workDir                           work/Catalina/localhost/ROOT
 requestCount                      0
 distributable                     false
 manager                           org.apache.catalina.session.StandardManager[]
 namingContextListener             org.apache.catalina.core.NamingContextListener@700b62c5
 sessionCookiePath                 null
 mapperContextRootRedirectEnabled  true
 tldScanTime                       0
 startupTime                       8
 clearReferencesRmiTargets         true
 xmlNamespaceAware                 false
 instanceManager                   org.apache.catalina.core.DefaultInstanceManager@3509e2a0
 useRelativeRedirects              true
 crossContext                      false
 objectName                        Catalina:j2eeType=WebModule,name=//localhost/,J2EEApplication=none,J2EEServer=none
 sessionCookieDomain               null
 realm                             Realm[LockOutRealm]
 welcomeFiles                      [index.html, index.htm, index.jsp]
 defaultContextXml                 null
 sessionCookieName                 null
 publicId                          null
```

可以看到新建的Context已经自动的加载了。

### 何时添加？

debug下启动过程，看看何时被添加为Host的子容器：

![image-20221029232833246](/image-20221029232833246.png)

在main thread中添加了Context容器，但是此时Host容器还是NEW状态，**不会触发子容器的初始化**：

```java
// org.apache.catalina.core.ContainerBase#addChildInternal
 // Start child
// Don't do this inside sync block - start can be a slow process and
// locking the children object can cause problems elsewhere
try {
  // 这个条件不满足，此时是NEW状态，不会触发子容器的初始化！
  if ((getState().isAvailable() ||
       LifecycleState.STARTING_PREP.equals(getState())) &&
      startChildren) {
    child.start();
  }
} catch (LifecycleException e) {
  log.error("ContainerBase.addChild: start: ", e);
  throw new IllegalStateException("ContainerBase.addChild: start: " + e);
} finally {
  fireContainerEvent(ADD_CHILD_EVENT, child);
}
```

tomcat解析xml，采用了Apache的commons-digester：[Digester - Commons](https://commons.apache.org/proper/commons-digester/)，Host对应的规则如下:

```java
// org.apache.catalina.startup.HostRuleSet#addRuleInstances
 digester.addSetNext(prefix + "Host",
                            "addChild",
                            "org.apache.catalina.Container");
```

这个规则的意思是：如果在Host节点下遇到了Container类型的声明，会调用Host的addChild方法。正是这里，添加了Context子容器。

### 何时启动

Context真正被触发start，是Host容器start时触发的：

```java
// org.apache.catalina.core.ContainerBase#startInternal
// Start our child containers, if any
Container children[] = findChildren();
List<Future<Void>> results = new ArrayList<>();
for (int i = 0; i < children.length; i++) {
  // localhost-startStop-1
  results.add(startStopExecutor.submit(new StartChild(children[i])));
}
```

debug验证：

![image-20221029233632461](/image-20221029233632461.png)

有意思的是，Host容器是在Engine的startStopExecutor中初始化的，线程名称都是`Catalina-startStop-%d`

Context容器是在Host容器的startStopExecutor中初始化的，线程名称都是`localhost-startStop-%d`

```bash
"Catalina-startStop-1@1803" daemon prio=5 tid=0x13 nid=NA waiting
  java.lang.Thread.State: WAITING
	  at sun.misc.Unsafe.park(Unsafe.java:-1)
	  at java.util.concurrent.locks.LockSupport.park(LockSupport.java:175)
	  at java.util.concurrent.FutureTask.awaitDone(FutureTask.java:429)
	  at java.util.concurrent.FutureTask.get(FutureTask.java:191)
	  at org.apache.catalina.core.ContainerBase.startInternal(ContainerBase.java:942)
	  - locked <0x5ae> (a org.apache.catalina.core.StandardHost)
	  # Host容器启动
	  at org.apache.catalina.core.StandardHost.startInternal(StandardHost.java:872)
	  at org.apache.catalina.util.LifecycleBase.start(LifecycleBase.java:150)
	  at org.apache.catalina.core.ContainerBase$StartChild.call(ContainerBase.java:1423)
	  at org.apache.catalina.core.ContainerBase$StartChild.call(ContainerBase.java:1413)
	  at java.util.concurrent.FutureTask.run(FutureTask.java:266)
	  at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149)
	  at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
	  at java.lang.Thread.run(Thread.java:748)

"localhost-startStop-1@1806" daemon prio=5 tid=0x14 nid=NA runnable
  java.lang.Thread.State: RUNNABLE
  # 这里添加的是servlet的wrapper
	  at org.apache.catalina.core.ContainerBase.addChild(ContainerBase.java:725)
	  at org.apache.catalina.core.StandardContext.addChild(StandardContext.java:2883)
	  at org.apache.catalina.startup.ContextConfig.configureContext(ContextConfig.java:1372)
	  at org.apache.catalina.startup.ContextConfig.webConfig(ContextConfig.java:1156)
	  at org.apache.catalina.startup.ContextConfig.configureStart(ContextConfig.java:769)
	  - locked <0x814> (a org.apache.catalina.startup.ContextConfig)
	  at org.apache.catalina.startup.ContextConfig.lifecycleEvent(ContextConfig.java:299)
	  at org.apache.catalina.util.LifecycleBase.fireLifecycleEvent(LifecycleBase.java:94)
	  # Context容器启动
	  at org.apache.catalina.core.StandardContext.startInternal(StandardContext.java:5134)
	  - locked <0x5af> (a org.apache.catalina.core.StandardContext)
	  at org.apache.catalina.util.LifecycleBase.start(LifecycleBase.java:150)
	  at org.apache.catalina.core.ContainerBase$StartChild.call(ContainerBase.java:1423)
	  at org.apache.catalina.core.ContainerBase$StartChild.call(ContainerBase.java:1413)
	  at java.util.concurrent.FutureTask.run(FutureTask.java:266)
	  at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149)
	  at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
	  at java.lang.Thread.run(Thread.java:748)
```





## Spring boot的方式

spring boot使用的是embedded tomcat，通过编程的方式控制tomcat的组装。spring boot手动创建了Context容器，并把其添加为Host容器的子容器：

https://github.com/spring-projects/spring-boot/blob/90b68d8465a037e79ed2d96dc181d09280b2cc18/spring-boot-project/spring-boot/src/main/java/org/springframework/boot/web/embedded/tomcat/TomcatServletWebServerFactory.java

```java
@Override
public WebServer getWebServer(ServletContextInitializer... initializers) {
  if (this.disableMBeanRegistry) {
    Registry.disableRegistry();
  }
  Tomcat tomcat = new Tomcat();
  File baseDir = (this.baseDirectory != null) ? this.baseDirectory : createTempDir("tomcat");
  tomcat.setBaseDir(baseDir.getAbsolutePath());
  for (LifecycleListener listener : this.serverLifecycleListeners) {
    tomcat.getServer().addLifecycleListener(listener);
  }
  Connector connector = new Connector(this.protocol);
  connector.setThrowOnFailure(true);
  tomcat.getService().addConnector(connector);
  customizeConnector(connector);
  tomcat.setConnector(connector);
  tomcat.getHost().setAutoDeploy(false);
  configureEngine(tomcat.getEngine());
  for (Connector additionalConnector : this.additionalTomcatConnectors) {
    tomcat.getService().addConnector(additionalConnector);
  }
  // 这里添加的Context容器
  prepareContext(tomcat.getHost(), initializers);
  // 触发server的初始化
  return getTomcatWebServer(tomcat);
}

protected void prepareContext(Host host, ServletContextInitializer[] initializers) {
  File documentRoot = getValidDocumentRoot();
  TomcatEmbeddedContext context = new TomcatEmbeddedContext();
  if (documentRoot != null) {
    context.setResources(new LoaderHidingResourceRoot(context));
  }
  context.setName(getContextPath());
  context.setDisplayName(getDisplayName());
  context.setPath(getContextPath());
  File docBase = (documentRoot != null) ? documentRoot : createTempDir("tomcat-docbase");
  context.setDocBase(docBase.getAbsolutePath());
  context.addLifecycleListener(new FixContextListener());
  ClassLoader parentClassLoader = (this.resourceLoader != null) ? this.resourceLoader.getClassLoader()
    : ClassUtils.getDefaultClassLoader();
  context.setParentClassLoader(parentClassLoader);
  resetDefaultLocaleMapping(context);
  addLocaleMappings(context);
  try {
    context.setCreateUploadTargets(true);
  }
  catch (NoSuchMethodError ex) {
    // Tomcat is < 8.5.39. Continue.
  }
  configureTldPatterns(context);
  WebappLoader loader = new WebappLoader();
  loader.setLoaderInstance(new TomcatEmbeddedWebappClassLoader(parentClassLoader));
  loader.setDelegate(true);
  context.setLoader(loader);
  if (isRegisterDefaultServlet()) {
    addDefaultServlet(context);
  }
  if (shouldRegisterJspServlet()) {
    addJspServlet(context);
    addJasperInitializer(context);
  }
  context.addLifecycleListener(new StaticResourceConfigurer(context));
  ServletContextInitializer[] initializersToUse = mergeInitializers(initializers);
  // 这里也是手动addChild，此时host的状态还是NEW不会调用Context的start方法
  // Context的start，随着Host容器的start进行
  host.addChild(context);
  configureContext(context, initializersToUse);
  postProcessContext(context);
}

```

这种方式和Server.xml中直接声明的Context的形式类似。

```bash
[arthas@67]$ mbean | grep -i webmodule
Tomcat:j2eeType=Servlet,WebModule=//localhost/,name=dispatcherServlet,J2EEApplication=none,J2EEServer=none
Tomcat:j2eeType=Filter,WebModule=//localhost/,name=webMvcStatisticsFilter,J2EEApplication=none,J2EEServer=none
Tomcat:j2eeType=WebModule,name=//localhost/,J2EEApplication=none,J2EEServer=none
Tomcat:j2eeType=Servlet,WebModule=//localhost/,name=default,J2EEApplication=none,J2EEServer=none
Tomcat:j2eeType=Filter,WebModule=//localhost/,name=Tomcat WebSocket (JSR356) Filter,J2EEApplication=none,J2EEServer=none
Tomcat:j2eeType=Filter,WebModule=//localhost/,name=characterEncodingFilter,J2EEApplication=none,J2EEServer=none
Tomcat:j2eeType=Filter,WebModule=//localhost/,name=formContentFilter,J2EEApplication=none,J2EEServer=none
Tomcat:j2eeType=Filter,WebModule=//localhost/,name=requestContextFilter,J2EEApplication=none,J2EEServer=none
Tomcat:j2eeType=Filter,WebModule=//localhost/,name=hiddenHttpMethodFilter,J2EEApplication=none,J2EEServer=none
[arthas@67]$ mbean Tomcat:j2eeType=WebModule,name=//localhost/,J2EEApplication=none,J2EEServer=none
 OBJECT_NAME                               Tomcat:j2eeType=WebModule,name=//localhost/,J2EEApplication=none,J2EEServer=none                                   
----------------------------------------------------------------------------------------------------------------------------------------                      
 NAME                                      VALUE                                                                                                              
----------------------------------------------------------------------------------------------------------------------------------------                      
 maxTime                                   25537                                                                                                              
 clearReferencesObjectStreamClassCaches    false                                                                                                              
 resourceOnlyServlets                      jsp                                                                                                                
 catalinaBase                              /tmp/tomcat.2018439991675236204.21358                                                                              
 useNaming                                 false                                                                                                              
 catalinaHome                              /tmp/tomcat.2018439991675236204.21358                                                                              
 path                                                                                                                                                         
 throwOnFailure                            true                                                                                                               
 stateName                                 STARTED                                                                                                            
 errorCount                                0                                                                                                                  
 mBeanKeyProperties                        ,host=localhost,context=/                                                                                          
 containerSciFilter                        null                                                                                                               
 createUploadTargets                       true                                                                                                               
 processingTime                            43843                                                                                                              
 clearReferencesStopThreads                false                                                                                                              
 xmlValidation                             false                                                                                                              
 xmlBlockExternal                          true                                                                                                               
 domain                                    Tomcat                                                                                                             
 altDDName                                 null                                                                                                               
 charsetMapperClass                        org.apache.catalina.util.CharsetMapper                                                                             
 server                                    null                                                                                                               
 modelerType                               org.springframework.boot.web.embedded.tomcat.TomcatEmbeddedContext                                                 
 allowMultipleLeadingForwardSlashInPath    false                                                                                                              
 sendRedirectBody                          false                                                                                                              
 displayName                               application                                                                                                        
 backgroundProcessorDelay                  -1                                                                                                                 
 cookies                                   true                                                                                                               
 effectiveMinorVersion                     0                                                                                                                  
 delegate                                  false                                                                                                              
 wrapperClass                              org.apache.catalina.core.StandardWrapper                                                                           
 mapperDirectoryRedirectEnabled            false                                                                                                              
 preemptiveAuthentication                  false                                                                                                              
 minTime                                   0                                                                                                                  
 requestCharacterEncoding                  null                                                                                                               
 startTime                                 1667565292686                                                                                                      
 tldValidation                             false                                                                                                              
 workDir                                   work/Tomcat/localhost/ROOT                                                                                         
 override                                  false                                                                                                              
 dispatchersUseEncodedPaths                true                                                                                                               
 sessionCookiePathUsesTrailingSlash        false                                                                                                              
 distributable                             false                                                                                                              
 sessionCookiePath                         null                                                                                                               
 startupTime                               0                                                                                                                  
 xmlNamespaceAware                         false                                                                                                              
 clearReferencesHttpClientKeepAliveThread  true                                                                                                               
 startStopThreads                          1                                                                                                                  
 useRelativeRedirects                      false                                                                                                              
 validateClientProvidedNewSessionId        true                                                                                                               
 crossContext                              false                                                                                                              
 welcomeFiles                              []                                                                                                                 
 namingResources                           org.apache.catalina.deploy.NamingResourcesImpl@547202aa                                                            
 applicationLifecycleListeners             [Ljava.lang.Object;@4313117f                                                                                       
 publicId                                  null                                                                                                               
 encodedPath                                                                                                                                                  
 antiResourceLocking                       false                                                                                                              
 parallelAnnotationScanning                false                                                                                                              
 paused                                    false                                                                                                              
 logEffectiveWebXml                        false                                                                                                              
 originalDocBase                           null                                                                                                               
 clearReferencesStopTimerThreads           false                                                                                                              
 useHttpOnly                               true                                                                                                               
 responseCharacterEncoding                 null                                                                                                               
 baseName                                  ROOT                                                                                                               
 configured                                true                                                                                                               
 unloadDelay                               2000                                                                                                               
 ignoreAnnotations                         false                                                                                                              
 charsetMapper                             org.apache.catalina.util.CharsetMapper@6583c8e3                                                                    
 jndiExceptionOnFailedWrite                true                                                                                                               
 privileged                                false                                                                                                              
 logName                                   org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/]                                                    
 swallowAbortedUploads                     true                                                                                                               
 copyXML                                   false                                                                                                              
 name                                                                                                                                                         
 sessionTimeout                            30                                                                                                                 
 unpackWAR                                 true                                                                                                               
 javaVMs                                   null                                                                                                               
 effectiveMajorVersion                     3                                                                                                                  
 renewThreadsWhenStoppingContext           true                                                                                                               
 docBase                                   /tmp/tomcat-docbase.11781573241578164503.21358                                                                     
 loginConfig                               LoginConfig[authMethod=NONE]                                                                                       
 skipMemoryLeakChecksOnJvmShutdown         false                                                                                                              
 defaultWebXml                             null                                                                                                               
 workPath                                  /tmp/tomcat.2018439991675236204.21358/work/Tomcat/localhost/ROOT                                                   
 reloadable                                false                                                                                                              
 webappVersion                                                                                                                                                
 clearReferencesThreadLocals               false                                                                                                              
 applicationEventListeners                 [Ljava.lang.Object;@2be64414                                                                                       
 swallowOutput                             false                                                                                                              
 fireRequestListenersOnForwards            false                                                                                                              
 servlet22                                 false                                                                                                              
 allowCasualMultipartParsing               false                                                                                                              
 requestCount                              1169                                                                                                               
 addWebinfClassesResources                 false                                                                                                              
 j2EEApplication                           none                                                                                                               
 namingContextListener                     null                                                                                                               
 j2EEServer                                none                                                                                                               
 mapperContextRootRedirectEnabled          true                                                                                                               
 tldScanTime                               0                                                                                                                  
 useBloomFilterForArchives                 false                                                                                                              
 clearReferencesRmiTargets                 false                                                                                                              
 inProgressAsyncCount                      0                                                                                                                  
 replaceWelcomeFiles                       Unavailable                                                                                            
                                                                                                                                                              
 objectName                                Tomcat:j2eeType=WebModule,name=//localhost/,J2EEApplication=none,J2EEServer=none                                   
 sessionCookieDomain                       null                                                                                                               
 failCtxIfServletStartFails                true                                                                                                               
 sessionCookieName                         null                                                                                                               
 defaultContextXml                         null                                                                                                               
 denyUncoveredHttpMethods                  false                                                                                                              
 startChildren                             true                                                                                                               


[root@public-bjxy-rs6-kce-node382 tomcat.2018439991675236204.21358]# tree
.
└── work
    └── Tomcat
        └── localhost
            └── ROOT
            
            
[arthas@67]$ mbean Tomcat:type=Loader,host=localhost,context=/
 OBJECT_NAME               Tomcat:type=Loader,host=localhost,context=/                                                                                        
-----------------------------------------------------------------------                                                                                       
 NAME                      VALUE                                                                                                                              
-----------------------------------------------------------------------                                                                                       
 delegate                  true                                                                                                                               
 loaderRepositoriesString                                                                                                                                     
 modelerType               org.apache.catalina.loader.WebappLoader                                                                                            
 loaderRepositories        []                                                                                                                                 
 stateName                 STARTED                                                                                                                            
 reloadable                false                                                                                                                              
 className                 org.apache.catalina.loader.WebappLoader 


[arthas@67]$ mbean Tomcat:type=TomcatEmbeddedWebappClassLoader,host=localhost,context=/
 OBJECT_NAME                               Tomcat:type=TomcatEmbeddedWebappClassLoader,host=localhost,context=/                                               
----------------------------------------------------------------------------------------------------------------------------------------                      
 NAME                                      VALUE                                                                                                              
----------------------------------------------------------------------------------------------------------------------------------------                      
 hostName                                  localhost                                                                                                          
 contextName                               ROOT                                                                                                               
 modelerType                               org.springframework.boot.web.embedded.tomcat.TomcatEmbeddedWebappClassLoader                                       
 clearReferencesObjectStreamClassCaches    false                                                                                                              
 skipMemoryLeakChecksOnJvmShutdown         false                                                                                                              
 clearReferencesRmiTargets                 false                                                                                                              
 serviceName                               Tomcat                                                                                                             
 clearReferencesHttpClientKeepAliveThread  true                                                                                                               
 clearReferencesThreadLocals               false                                                                                                              
 clearReferencesStopThreads                false                                                                                                              
 delegate                                  true                                                                                                               
 clearReferencesLogFactoryRelease          true                                                                                                               
 stateName                                 STARTED                                                                                                            
 clearReferencesStopTimerThreads           false                                                                                                              
 name                                      null                                                                                                               
 defaultAssertionStatus                    Unavailable                                                                                            
                                                                                                                                                              
 webappName                                ROOT                                                                                                               
 registeredAsParallelCapable               true
 

[arthas@67]$ classloader -l
 name                                                           loadedCount  hash      parent                                                                 
 BootstrapClassLoader                                           4924         null      null                                                                   
 com.taobao.arthas.agent.ArthasClassloader@2fb54192             1364         2fb54192  jdk.internal.loader.ClassLoaders$PlatformClassLoader@3044e9c7          
 jdk.internal.loader.ClassLoaders$AppClassLoader@55054057       50           55054057  jdk.internal.loader.ClassLoaders$PlatformClassLoader@3044e9c7          
 jdk.internal.loader.ClassLoaders$PlatformClassLoader@3044e9c7  101          3044e9c7  null                                                                   
 org.codehaus.janino.ByteArrayClassLoader@10959ece              1            10959ece  org.springframework.boot.loader.LaunchedURLClassLoader@6433a2          
 org.springframework.boot.loader.LaunchedURLClassLoader@6433a2  16893        6433a2    jdk.internal.loader.ClassLoaders$AppClassLoader@55054057               
 sun.reflect.misc.MethodUtil@2b939972                           1            2b939972  jdk.internal.loader.ClassLoaders$AppClassLoader@55054057               
Affect(row-cnt:7) cost in 21 ms.
```



## 对比

META-INF/context.xml

```xml
<Context>

    <Loader loaderClass="com.air.AirWebAppClassLoader" />
    <!-- Uncomment this to disable session persistence across Tomcat restarts -->
    <!--
    <Manager pathname="" />
    -->
</Context>
```



```bash
 target (master|●1✚2) tree
.
├── classes
│   └── com
│       └── air
│           ├── SampleServlet.class
│           ├── async
│           │   ├── AppAsyncListener.class
│           │   ├── AppContextListener.class
│           │   ├── AsyncRequestProcessor$1.class
│           │   ├── AsyncRequestProcessor.class
│           │   └── AsyncServlet.class
│           └── transferencoding
│               └── TransferEncodingServlet.class
├── generated-sources
│   └── annotations
└── web-1.0-SNAPSHOT
    ├── META-INF
    │   ├── MANIFEST.MF
    │   └── context.xml
    ├── WEB-INF
    │   ├── classes
    │   │   └── com
    │   │       └── air
    │   │           ├── SampleServlet.class
    │   │           ├── async
    │   │           │   ├── AppAsyncListener.class
    │   │           │   ├── AppContextListener.class
    │   │           │   ├── AsyncRequestProcessor$1.class
    │   │           │   ├── AsyncRequestProcessor.class
    │   │           │   └── AsyncServlet.class
    │   │           └── transferencoding
    │   │               └── TransferEncodingServlet.class
    │   ├── lib
    │   │   ├── javax.servlet-api-3.1.0.jar
    │   │   ├── logback-classic-1.0.9.jar
    │   │   ├── logback-core-1.0.9.jar
    │   │   └── slf4j-api-1.7.25.jar
    │   └── web.xml
    └── index.jsp

16 directories, 22 files
```



![image-20221103232048542](/image-20221103232048542.png)

这两种方式好像没有处理/META-INF/context.xml，如何验证？

[/META-INF/context.xml seemingly ignored](https://users.tomcat.apache.narkive.com/XpC5p3PL/meta-inf-context-xml-seemingly-ignored)

```bash
➜  conf  tree /Users/qishengli/Library/Caches/JetBrains/IntelliJIdea2020.2/tomcat/15632928-a384-44e8-ba78-fe9ca3f37059/
/Users/qishengli/Library/Caches/JetBrains/IntelliJIdea2020.2/tomcat/15632928-a384-44e8-ba78-fe9ca3f37059/
├── conf
│   ├── Catalina
│   │   └── localhost
│   │       └── web_war_exploded.xml
│   ├── catalina.policy
│   ├── catalina.properties
│   ├── catalina.properties.0
│   ├── context.xml
│   ├── jaspic-providers.xml
│   ├── jaspic-providers.xsd
│   ├── logging.properties
│   ├── server.xml
│   ├── server.xml.0
│   ├── tomcat-users.xml
│   ├── tomcat-users.xsd
│   ├── web.xml
│   └── web.xml.0
├── jmxremote.access
├── jmxremote.password
└── logs
    ├── catalina.2022-10-05.log
```

```bash
➜  conf  cat /Users/qishengli/Library/Caches/JetBrains/IntelliJIdea2020.2/tomcat/15632928-a384-44e8-ba78-fe9ca3f37059/conf/Catalina/localhost/web_war_exploded.xml
<Context path="/web_war_exploded" docBase="/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT">
  <Loader loaderClass="com.air.AirWebAppClassLoader" />
</Context>
```

idea自动把META-INF/context.xml的内容，合并到了自己生成的配置文件里

```bash
[arthas@72360]$ mbean Catalina:j2eeType=WebModule,name=//localhost/web_war_exploded,J2EEApplication=none,J2EEServer=none
 OBJECT_NAME                       Catalina:j2eeType=WebModule,name=//localhost/web_war_exploded,J2EEApplication=none,J2EEServer=none
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 NAME                              VALUE
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 antiResourceLocking               false
 encodedPath                       /web_war_exploded
 maxTime                           565
 paused                            false
 loader                            WebappLoader[/web_war_exploded]
 logger                            org.apache.juli.logging.DirectJDKLog@3f7bad4b
 useNaming                         true
 logEffectiveWebXml                false
 path                              /web_war_exploded
 originalDocBase                   null
 children                          [Ljavax.management.ObjectName;@31bc44d4
 stateName                         STARTED
 clearReferencesStopTimerThreads   false
 useHttpOnly                       true
 managedResource                   StandardEngine[Catalina].StandardHost[localhost].StandardContext[/web_war_exploded]
 baseName                          web_war_exploded
 errorCount                        0
 configured                        true
 unloadDelay                       2000
 ignoreAnnotations                 false
 processingTime                    572
 clearReferencesStopThreads        false
 privileged                        false
 xmlValidation                     false
 altDDName                         null
 name                              /web_war_exploded
 sessionTimeout                    30
 unpackWAR                         true
 javaVMs                           null
 renewThreadsWhenStoppingContext   true
 server                            null
 docBase                           /Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT
 modelerType                       org.apache.catalina.core.StandardContext
 displayName                       null
 defaultWebXml                     null
 reloadable                        false
 parentClassLoader                 java.net.URLClassLoader@782830e
 webappVersion
 cookies                           true
 delegate                          false
 mapperDirectoryRedirectEnabled    false
 minTime                           7
 swallowOutput                     false
 configFile                        file:/Users/qishengli/Library/Caches/JetBrains/IntelliJIdea2020.2/tomcat/15632928-a384-44e8-ba78-fe9ca3f37059/conf/Catalina/localhost/web_wa
                                   r_exploded.xml
 startTime                         1667494105529
 tldValidation                     false
 override                          false
 workDir                           work/Catalina/localhost/web_war_exploded
 requestCount                      2
 distributable                     false
 manager                           org.apache.catalina.session.StandardManager[/web_war_exploded]
 namingContextListener             org.apache.catalina.core.NamingContextListener@3583c63b
 sessionCookiePath                 null
 mapperContextRootRedirectEnabled  true
 tldScanTime                       0
 startupTime                       19
 clearReferencesRmiTargets         true
 xmlNamespaceAware                 false
 instanceManager                   org.apache.catalina.core.DefaultInstanceManager@70814eef
 useRelativeRedirects              true
 crossContext                      false
 objectName                        Catalina:j2eeType=WebModule,name=//localhost/web_war_exploded,J2EEApplication=none,J2EEServer=none
 sessionCookieDomain               null
 realm                             Realm[LockOutRealm]
 welcomeFiles                      [index.html, index.htm, index.jsp]
 defaultContextXml                 null
 sessionCookieName                 null
 publicId                          null
 
 
[arthas@72360]$ sc -d *SampleServlet
 class-info        com.air.SampleServlet
 code-source       /Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/classes/
 name              com.air.SampleServlet
 isInterface       false
 isAnnotation      false
 isEnum            false
 isAnonymousClass  false
 isArray           false
 isLocalClass      false
 isMemberClass     false
 isPrimitive       false
 isSynthetic       false
 simple-name       SampleServlet
 modifier          public
 annotation        javax.servlet.annotation.WebServlet
 interfaces
 super-class       +-javax.servlet.http.HttpServlet
                     +-javax.servlet.GenericServlet
                       +-java.lang.Object





                     +-java.net.URLClassLoader@782830e
                       +-sun.misc.Launcher$AppClassLoader@18b4aac2
                         +-sun.misc.Launcher$ExtClassLoader@6e1567f1
 classLoaderHash   4706eb5b

Affect(row-cnt:1) cost in 94 ms.

[arthas@72360]$  classloader -l
 name                                                         loadedCount  hash      parent
 BootstrapClassLoader                                         3729         null      null
                                   163          4706eb5b  java.net.URLClassLoader@782830e




 com.taobao.arthas.agent.ArthasClassloader@4bc52a32           1379         4bc52a32  sun.misc.Launcher$ExtClassLoader@6e1567f1
 java.net.URLClassLoader@782830e                              1402         782830e   sun.misc.Launcher$AppClassLoader@18b4aac2
 javax.management.remote.rmi.NoCallStackClassLoader@61e717c2  1            61e717c2  null
 javax.management.remote.rmi.NoCallStackClassLoader@4e515669  1            4e515669  null
                                                                           7058d735  AirWebAppClassLoader
                                                                                       context: web_war_exploded
                                                                                       delegate: false
                                                                                     ----------> Parent Classloader:
                                                                                     java.net.URLClassLoader@782830e
 sun.misc.Launcher$AppClassLoader@18b4aac2                    39           18b4aac2  sun.misc.Launcher$ExtClassLoader@6e1567f1
 sun.misc.Launcher$ExtClassLoader@6e1567f1                    59           6e1567f1  null
 
 
 [arthas@72360]$ classloader -c 4706eb5b
 file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/classes/
 file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/lib/slf4j-api-1.7.25.jar
 file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/lib/javax.servlet-api-3.1.0.jar
 file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/lib/logback-core-1.0.9.jar
 file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/lib/logback-classic-1.0.9.jar
 Affect(row-cnt:10) cost in 2 ms.
 
[arthas@72360]$ mbean Catalina:type=Loader,host=localhost,context=/web_war_exploded
 OBJECT_NAME               Catalina:type=Loader,host=localhost,context=/web_war_exploded
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 NAME                      VALUE
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 delegate                  false
 loaderRepositoriesString  file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/classes/:file:/Users/qishengli/program/learning/Java_Tutori
                           al/web/target/web-1.0-SNAPSHOT/WEB-INF/lib/slf4j-api-1.7.25.jar:file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB
                           -INF/lib/javax.servlet-api-3.1.0.jar:file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/lib/logback-core-1.0.9
                           .jar:file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/lib/logback-classic-1.0.9.jar:
 modelerType               org.apache.catalina.loader.WebappLoader
 loaderRepositories        [file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/classes/, file:/Users/qishengli/program/learning/Java_Tuto
                           rial/web/target/web-1.0-SNAPSHOT/WEB-INF/lib/slf4j-api-1.7.25.jar, file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/
                           WEB-INF/lib/javax.servlet-api-3.1.0.jar, file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/lib/logback-core-1
                           .0.9.jar, file:/Users/qishengli/program/learning/Java_Tutorial/web/target/web-1.0-SNAPSHOT/WEB-INF/lib/logback-classic-1.0.9.jar]
 stateName                 STARTED
 reloadable                false
 className                 org.apache.catalina.loader.WebappLoader
 
 
 
 [arthas@72360]$ mbean Catalina:type=AirWebAppClassLoader,host=localhost,context=/web_war_exploded
 OBJECT_NAME                               Catalina:type=AirWebAppClassLoader,host=localhost,context=/web_war_exploded
----------------------------------------------------------------------------------------------------------------------------------------
 NAME                                      VALUE
----------------------------------------------------------------------------------------------------------------------------------------
 hostName                                  localhost
 contextName                               web_war_exploded
 modelerType                               com.air.AirWebAppClassLoader
 clearReferencesObjectStreamClassCaches    true
 clearReferencesRmiTargets                 true
 serviceName                               Catalina
 clearReferencesHttpClientKeepAliveThread  true
 clearReferencesStopThreads                false
 delegate                                  false
 clearReferencesLogFactoryRelease          true
 stateName                                 STARTED
 clearReferencesStopTimerThreads           false
 defaultAssertionStatus                    Unavailable
 webappName                                web_war_exploded

```







直接声明在context中：

```bash
[arthas@63352]$ mbean Catalina:j2eeType=WebModule,name=//localhost/,J2EEApplication=none,J2EEServer=none
 OBJECT_NAME                       Catalina:j2eeType=WebModule,name=//localhost/,J2EEApplication=none,J2EEServer=none
----------------------------------------------------------------------------------------------------------------------
 NAME                              VALUE
----------------------------------------------------------------------------------------------------------------------
 antiResourceLocking               false
 encodedPath
 maxTime                           0
 paused                            false
 loader                            WebappLoader[]
 logger                            org.apache.juli.logging.DirectJDKLog@3fe0bf5f
 useNaming                         true
 logEffectiveWebXml                false
 path
 originalDocBase                   null
 children                          [Ljavax.management.ObjectName;@3bdf2c7b
 stateName                         STARTED
 clearReferencesStopTimerThreads   false
 useHttpOnly                       true
 managedResource                   StandardEngine[Catalina].StandardHost[localhost].StandardContext[]
 baseName                          ROOT
 errorCount                        0
 configured                        true
 unloadDelay                       2000
 ignoreAnnotations                 false
 processingTime                    0
 clearReferencesStopThreads        false
 privileged                        false
 xmlValidation                     false
 altDDName                         null
 name
 sessionTimeout                    30
 unpackWAR                         true
 javaVMs                           null
 renewThreadsWhenStoppingContext   true
 server                            null
 docBase                           /Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT
 modelerType                       org.apache.catalina.core.StandardContext
 displayName                       null
 defaultWebXml                     null
 reloadable                        false
 parentClassLoader                 java.net.URLClassLoader@548c4f57
 webappVersion
 clearReferencesThreadLocals       true
 cookies                           true
 delegate                          false
 mapperDirectoryRedirectEnabled    false
 minTime                           9223372036854775807
 swallowOutput                     false
 configFile                        null
 startTime                         1667493585743
 tldValidation                     false
 override                          false
 workDir                           work/Catalina/localhost/ROOT
 requestCount                      0
 distributable                     false
 manager                           org.apache.catalina.session.StandardManager[]
 namingContextListener             org.apache.catalina.core.NamingContextListener@7eddb564
 sessionCookiePath                 null
 mapperContextRootRedirectEnabled  true
 tldScanTime                       0
 startupTime                       15
 clearReferencesRmiTargets         true
 xmlNamespaceAware                 false
 instanceManager                   org.apache.catalina.core.DefaultInstanceManager@75c9aaab
 useRelativeRedirects              true
 crossContext                      false
 objectName                        Catalina:j2eeType=WebModule,name=//localhost/,J2EEApplication=none,J2EEServer=none
 sessionCookieDomain               null
 realm                             Realm[LockOutRealm]
 welcomeFiles                      [index.html, index.htm, index.jsp]
 defaultContextXml                 null
 sessionCookieName                 null
 publicId                          null



[arthas@63352]$ sc -d *SampleServlet
 class-info        com.air.SampleServlet
 code-source       /Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/classes/
 name              com.air.SampleServlet
 isInterface       false
 isAnnotation      false
 isEnum            false
 isAnonymousClass  false
 isArray           false
 isLocalClass      false
 isMemberClass     false
 isPrimitive       false
 isSynthetic       false
 simple-name       SampleServlet
 modifier          public
 annotation        javax.servlet.annotation.WebServlet
 interfaces
 super-class       +-javax.servlet.http.HttpServlet
                     +-javax.servlet.GenericServlet
                       +-java.lang.Object





                     +-java.net.URLClassLoader@548c4f57
                       +-sun.misc.Launcher$AppClassLoader@18b4aac2
                         +-sun.misc.Launcher$ExtClassLoader@62043840
 classLoaderHash   166c7f52
 
 
 
 [arthas@63352]$ classloader -l
 name                                                         loadedCount  hash      parent
 BootstrapClassLoader                                         3325         null      null
 com.taobao.arthas.agent.ArthasClassloader@2a899e42           1381         2a899e42  sun.misc.Launcher$ExtClassLoader@62043840
 java.net.URLClassLoader@548c4f57                             705          548c4f57  sun.misc.Launcher$AppClassLoader@18b4aac2
 javax.management.remote.rmi.NoCallStackClassLoader@593772d2  1            593772d2  null
 javax.management.remote.rmi.NoCallStackClassLoader@5874c60f  1            5874c60f  null
                                   17           71e87c61  java.net.URLClassLoader@548c4f57




                                   163          166c7f52  java.net.URLClassLoader@548c4f57




 sun.misc.Launcher$AppClassLoader@18b4aac2                    39           18b4aac2  sun.misc.Launcher$ExtClassLoader@62043840
 sun.misc.Launcher$ExtClassLoader@62043840                    59           62043840  null
Affect(row-cnt:9) cost in 9 ms.


[arthas@63352]$ classloader -c 166c7f52
file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/classes/
file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/slf4j-api-1.7.25.jar
file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/javax.servlet-api-3.1.0.jar
file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/logback-core-1.0.9.jar
file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/logback-classic-1.0.9.jar
Affect(row-cnt:10) cost in 2 ms.


[arthas@63352]$ mbean Catalina:type=Loader,host=localhost,context=/
 OBJECT_NAME               Catalina:type=Loader,host=localhost,context=/
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 NAME                      VALUE
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 delegate                  false
 loaderRepositoriesString  file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/classes/:file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/l
                           ib/slf4j-api-1.7.25.jar:file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/javax.servlet-api-3.1.0.jar:file:/Users/qishengli/D
                           ownloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/logback-core-1.0.9.jar:file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/lo
                           gback-classic-1.0.9.jar:
 modelerType               org.apache.catalina.loader.WebappLoader
 loaderRepositories        [file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/classes/, file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF
                           /lib/slf4j-api-1.7.25.jar, file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/javax.servlet-api-3.1.0.jar, file:/Users/qisheng
                           li/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/lib/logback-core-1.0.9.jar, file:/Users/qishengli/Downloads/tomcat-test/web-1.0-SNAPSHOT/WEB-INF/l
                           ib/logback-classic-1.0.9.jar]
 stateName                 STARTED
 reloadable                false
 className                 org.apache.catalina.loader.WebappLoader
 

[arthas@63352]$ mbean Catalina:type=ParallelWebappClassLoader,host=localhost,context=/
 OBJECT_NAME  Catalina:type=ParallelWebappClassLoader,host=localhost,context=/
-------------------------------------------------------------------------------
 NAME         VALUE
-------------------------------------------------------------------------------
 delegate     false
 contextName  ROOT
 modelerType  org.apache.catalina.loader.ParallelWebappClassLoader
 URLs         [Ljava.net.URL;@6fc85f48
 stateName    STARTED
 className    org.apache.catalina.loader.ParallelWebappClassLoader
 
```





走扫描：

```bash
[arthas@52879]$ mbean Catalina:j2eeType=WebModule,name=//localhost/web-1.0-SNAPSHOT,J2EEApplication=none,J2EEServer=none
 OBJECT_NAME                       Catalina:j2eeType=WebModule,name=//localhost/web-1.0-SNAPSHOT,J2EEApplication=none,J2EEServer=none
--------------------------------------------------------------------------------------------------------------------------------------
 NAME                              VALUE
--------------------------------------------------------------------------------------------------------------------------------------
 antiResourceLocking               false
 encodedPath                       /web-1.0-SNAPSHOT
 maxTime                           0
 paused                            false
 loader                            WebappLoader[/web-1.0-SNAPSHOT]
 logger                            org.apache.juli.logging.DirectJDKLog@57ea35a2
 useNaming                         true
 logEffectiveWebXml                false
 path                              /web-1.0-SNAPSHOT
 originalDocBase                   null
 children                          [Ljavax.management.ObjectName;@6933331b
 stateName                         STARTED
 clearReferencesStopTimerThreads   false
 useHttpOnly                       true
 managedResource                   StandardEngine[Catalina].StandardHost[localhost].StandardContext[/web-1.0-SNAPSHOT]
 baseName                          web-1.0-SNAPSHOT
 errorCount                        0
 configured                        true
 unloadDelay                       2000
 ignoreAnnotations                 false
 processingTime                    0
 clearReferencesStopThreads        false
 privileged                        false
 xmlValidation                     false
 altDDName                         null
 name                              /web-1.0-SNAPSHOT
 sessionTimeout                    30
 unpackWAR                         true
 javaVMs                           null
 renewThreadsWhenStoppingContext   true
 server                            null
 docBase                           web-1.0-SNAPSHOT
 modelerType                       org.apache.catalina.core.StandardContext
 displayName                       null
 defaultWebXml                     null
 reloadable                        false
 parentClassLoader                 java.net.URLClassLoader@548c4f57
 webappVersion
 cookies                           true
 delegate                          false
 mapperDirectoryRedirectEnabled    false
 minTime                           9223372036854775807
 swallowOutput                     false
 configFile                        file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/META-INF/context.xml
 startTime                         1667493165221
 tldValidation                     false
 override                          false
 workDir                           work/Catalina/localhost/web-1.0-SNAPSHOT
 requestCount                      0
 distributable                     false
 manager                           org.apache.catalina.session.StandardManager[/web-1.0-SNAPSHOT]
 namingContextListener             org.apache.catalina.core.NamingContextListener@5d43997a
 sessionCookiePath                 null
 mapperContextRootRedirectEnabled  true
 tldScanTime                       0
 startupTime                       41
 clearReferencesRmiTargets         true
 xmlNamespaceAware                 false
 instanceManager                   org.apache.catalina.core.DefaultInstanceManager@23b02469
 useRelativeRedirects              true
 crossContext                      false
 objectName                        Catalina:j2eeType=WebModule,name=//localhost/web-1.0-SNAPSHOT,J2EEApplication=none,J2EEServer=none
 sessionCookieDomain               null
 realm                             Realm[LockOutRealm]
 welcomeFiles                      [index.html, index.htm, index.jsp]
 defaultContextXml                 null
 sessionCookieName                 null
 publicId                          null
 
 
[arthas@52879]$ sc -d *SampleServlet
 class-info        com.air.SampleServlet
 code-source       /Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/classes/
 name              com.air.SampleServlet
 isInterface       false
 isAnnotation      false
 isEnum            false
 isAnonymousClass  false
 isArray           false
 isLocalClass      false
 isMemberClass     false
 isPrimitive       false
 isSynthetic       false
 simple-name       SampleServlet
 modifier          public
 annotation        javax.servlet.annotation.WebServlet
 interfaces
 super-class       +-javax.servlet.http.HttpServlet
                     +-javax.servlet.GenericServlet
                       +-java.lang.Object





                     +-java.net.URLClassLoader@548c4f57
                       +-sun.misc.Launcher$AppClassLoader@18b4aac2
                         +-sun.misc.Launcher$ExtClassLoader@32e6e9c3
 classLoaderHash   23288a58

Affect(row-cnt:1) cost in 54 ms.

[arthas@52879]$ classloader -c 23288a58
file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/classes/
file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/lib/slf4j-api-1.7.25.jar
file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/lib/javax.servlet-api-3.1.0.jar
file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/lib/logback-core-1.0.9.jar
file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/lib/logback-classic-1.0.9.jar
Affect(row-cnt:10) cost in 1 ms.




[arthas@28425]$ mbean Catalina:type=Loader,host=localhost,context=/web-1.0-SNAPSHOT
 OBJECT_NAME               Catalina:type=Loader,host=localhost,context=/web-1.0-SNAPSHOT
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 NAME                      VALUE
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 delegate                  false
 loaderRepositoriesString  file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/classes/:file:/Users/qishengli/software/apache-tomcat-8.5.32/we
                           bapps/web-1.0-SNAPSHOT/WEB-INF/lib/slf4j-api-1.7.25.jar:file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/lib/jav
                           ax.servlet-api-3.1.0.jar:file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/lib/logback-core-1.0.9.jar:file:/Users
                           /qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/lib/logback-classic-1.0.9.jar:
 modelerType               org.apache.catalina.loader.WebappLoader
 loaderRepositories        [file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/classes/, file:/Users/qishengli/software/apache-tomcat-8.5.32/
                           webapps/web-1.0-SNAPSHOT/WEB-INF/lib/slf4j-api-1.7.25.jar, file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/lib/
                           javax.servlet-api-3.1.0.jar, file:/Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/lib/logback-core-1.0.9.jar, file:/
                           Users/qishengli/software/apache-tomcat-8.5.32/webapps/web-1.0-SNAPSHOT/WEB-INF/lib/logback-classic-1.0.9.jar]
 stateName                 STARTED
 reloadable                false
 className                 org.apache.catalina.loader.WebappLoader
 
 [arthas@52879]$ mbean Catalina:type=AirWebAppClassLoader,host=localhost,context=/web-1.0-SNAPSHOT
 OBJECT_NAME                               Catalina:type=AirWebAppClassLoader,host=localhost,context=/web-1.0-SNAPSHOT
----------------------------------------------------------------------------------------------------------------------------------------
 NAME                                      VALUE
----------------------------------------------------------------------------------------------------------------------------------------
 hostName                                  localhost
 contextName                               web-1.0-SNAPSHOT
 modelerType                               com.air.AirWebAppClassLoader
 clearReferencesObjectStreamClassCaches    true
 clearReferencesRmiTargets                 true
 serviceName                               Catalina
 clearReferencesHttpClientKeepAliveThread  true
 clearReferencesStopThreads                false
 delegate                                  false
 clearReferencesLogFactoryRelease          true
 stateName                                 STARTED
 clearReferencesStopTimerThreads           false
 defaultAssertionStatus                    Unavailable
 webappName                                web-1.0-SNAPSHOT
```



```java
public static final String ApplicationContextXml = "META-INF/context.xml";

/**
     * Should we deploy XML Context config files packaged with WAR files and
     * directories?
     */
protected boolean deployXML = false;

// org.apache.catalina.startup.HostConfig#deployDirectory
Context context = null;
File xml = new File(dir, Constants.ApplicationContextXml);
File xmlCopy =
  new File(host.getConfigBaseFile(), cn.getBaseName() + ".xml");


DeployedApplication deployedApp;
boolean copyThisXml = copyXML;

try {
  		// 这里默认是false，所以默认不加载META-INF/context.xml
  		// 但是host的是true，所以默认是true。。。
      if (deployXML && xml.exists()) {
        synchronized (digesterLock) {
          try {
            context = (Context) digester.parse(xml);
          } catch (Exception e) {
            log.error(sm.getString(
              "hostConfig.deployDescriptor.error",
              xml), e);
            context = new FailedContext();
          } finally {
            digester.reset();
            if (context == null) {
              context = new FailedContext();
            }
          }
        }

        if (copyThisXml == false && context instanceof StandardContext) {
          // Host is using default value. Context may override it.
          copyThisXml = ((StandardContext) context).getCopyXML();
        }

        if (copyThisXml) {
          Files.copy(xml.toPath(), xmlCopy.toPath());
          context.setConfigFile(xmlCopy.toURI().toURL());
        } else {
          context.setConfigFile(xml.toURI().toURL());
        }
      } else if (!deployXML && xml.exists()) {
        // 应该走到了这里，会打印error
        // Block deployment as META-INF/context.xml may contain security
        // configuration necessary for a secure deployment.
        log.error(sm.getString("hostConfig.deployDescriptor.blocked",
                               cn.getPath(), xml, xmlCopy));
        context = new FailedContext();
      } else {
        context = (Context) Class.forName(contextClass).newInstance();
      }
      Class<?> clazz = Class.forName(host.getConfigClass());
      LifecycleListener listener =
        (LifecycleListener) clazz.newInstance();
      context.addLifecycleListener(listener);

      context.setName(cn.getName());
      context.setPath(cn.getPath());
      context.setWebappVersion(cn.getVersion());
      context.setDocBase(cn.getBaseName());
      host.addChild(context);
	}
// 省略
}
```



## 总结

## 参考

- [HowTo - Apache Tomcat - Apache Software Foundation](https://cwiki.apache.org/confluence/display/tomcat/HowTo#HowTo-HowdoImakemywebapplicationbetheTomcatdefaultapplication?)
