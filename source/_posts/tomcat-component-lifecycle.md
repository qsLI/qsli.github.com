---
title: tomcat-component-lifecycle
tags: tomcat
category: tomcat
toc: true
typora-root-url: tomcat-component-lifecycle
typora-copy-images-to: tomcat-component-lifecycle
date: 2021-11-27 19:08:08
---



Tomcat将组件的声明周期抽象为了不同的状态，同时定义了组件状态转移的状态机，并将其定义为Lifecycle接口，通过这个接口来管理所有组件。

## Lifecycle 接口

Lifecycle 接口主要定义三个功能：

- tomcat组件生命周期对应的方法（init、start、stop、destroy等），这些方法会触发组件状态的变化，方法对应的状态转移如图：

![image-20211031182459713](/image-20211031182459713.png)

- 获取当前状态的一些方法（getState/getStateName）
- 以及Listener管理相关的方法（addLifecycleListener、findLifecycleListeners、removeLifecycleListener）



Lifecycle接口是tomcat中很基础的接口，tomcat的组件都直接或者间接地实现了这个接口，继承这个接口的类如图所示。

![image-20211127182758386](/image-20211127182758386.png)

从图中可以看出，tomcat的Server接口、Service接口、以及Container接口都继承了Lifecycle。这些常用的组件一般不会直接实现这个接口，一般会通过继承`LifeCycleBase`（LifecycleBase —> Lifecycle）或者`LifecycleMbeanBase`（LifecycleMbeanBase —> LifecycleBase —> Lifecycle）



## LifeCycleBase


>  Base implementation of the {@link Lifecycle} interface that implements the
>  state transition rules for {@link Lifecycle#start()} and
>  {@link Lifecycle#stop()}

这个类实现了接口定义中的LifecycleListener管理、以及组件状态的管理。他的子类无需关心状态转移、以及Listener的通知，只用实现对应的抽象方法：

```java
    protected abstract void startInternal() throws LifecycleException;
    protected abstract void initInternal() throws LifecycleException;
    protected abstract void stopInternal() throws LifecycleException;
    protected abstract void destroyInternal() throws LifecycleException;
```

以这个接口实现的init为例：

```java
// org.apache.catalina.util.LifecycleBase#init
@Override
public final synchronized void init() throws LifecycleException {
  if (!state.equals(LifecycleState.NEW)) {
    invalidTransition(Lifecycle.BEFORE_INIT_EVENT);
  }

  try {
    setStateInternal(LifecycleState.INITIALIZING, null, false);
    initInternal();
    setStateInternal(LifecycleState.INITIALIZED, null, false);
  } catch (Throwable t) {
    ExceptionUtils.handleThrowable(t);
    setStateInternal(LifecycleState.FAILED, null, false);
    throw new LifecycleException(
      sm.getString("lifecycleBase.initFail",toString()), t);
  }
}
```

代码中已经做了状态转移的判断，只有从NEW状态才能调用init，抽象方法`initInternal`，实现了状态从`INITIALIZING`到状态`INITIALIZED`的转义，发生异常时会自动的将状态转移到`FAILED`。

`setStateInternal`中也完成了Listener的触发：

```java
// org.apache.catalina.util.LifecycleBase#setStateInternal
private synchronized void setStateInternal(LifecycleState state,
                                           Object data, boolean check) throws LifecycleException {

  if (log.isDebugEnabled()) {
    log.debug(sm.getString("lifecycleBase.setState", this, state));
  }

  if (check) {
    // Must have been triggered by one of the abstract methods (assume
    // code in this class is correct)
    // null is never a valid state
    if (state == null) {
      invalidTransition("null");
      // Unreachable code - here to stop eclipse complaining about
      // a possible NPE further down the method
      return;
    }

    // Any method can transition to failed
    // startInternal() permits STARTING_PREP to STARTING
    // stopInternal() permits STOPPING_PREP to STOPPING and FAILED to
    // STOPPING
    if (!(state == LifecycleState.FAILED ||
          (this.state == LifecycleState.STARTING_PREP &&
           state == LifecycleState.STARTING) ||
          (this.state == LifecycleState.STOPPING_PREP &&
           state == LifecycleState.STOPPING) ||
          (this.state == LifecycleState.FAILED &&
           state == LifecycleState.STOPPING))) {
      // No other transition permitted
      invalidTransition(state.name());
    }
  }

  this.state = state;
  // 状态转移对应的事件
  String lifecycleEvent = state.getLifecycleEvent();
  if (lifecycleEvent != null) {
    fireLifecycleEvent(lifecycleEvent, data);
  }
}

// org.apache.catalina.util.LifecycleBase#fireLifecycleEvent
protected void fireLifecycleEvent(String type, Object data) {
  LifecycleEvent event = new LifecycleEvent(this, type, data);
  for (LifecycleListener listener : lifecycleListeners) {
    listener.lifecycleEvent(event);
  }
}
```

这样状态转移的时候，listener也能感知到了，注意这都是在**一个线程**中通知的，不要在Listener中做特别重的操作。

状态对应的event：

```java
// org.apache.catalina.LifecycleState
NEW(false, null),
INITIALIZING(false, Lifecycle.BEFORE_INIT_EVENT),
INITIALIZED(false, Lifecycle.AFTER_INIT_EVENT),
STARTING_PREP(false, Lifecycle.BEFORE_START_EVENT),
STARTING(true, Lifecycle.START_EVENT),
STARTED(true, Lifecycle.AFTER_START_EVENT),
STOPPING_PREP(true, Lifecycle.BEFORE_STOP_EVENT),
STOPPING(false, Lifecycle.STOP_EVENT),
STOPPED(false, Lifecycle.AFTER_STOP_EVENT),
DESTROYING(false, Lifecycle.BEFORE_DESTROY_EVENT),
DESTROYED(false, Lifecycle.AFTER_DESTROY_EVENT),
FAILED(false, null);
```



## LifecycleMbeanBase

`LifecycleMbeanBase`继承了`LifeCycleBase`，同时也实现了`JmxEnabled`接口:

```java
public interface JmxEnabled extends MBeanRegistration {

    /**
     * @return the domain under which this component will be / has been
     * registered.
     */
    String getDomain();


    /**
     * Specify the domain under which this component should be registered. Used
     * with components that cannot (easily) navigate the component hierarchy to
     * determine the correct domain to use.
     *
     * @param domain The name of the domain under which this component should be
     *               registered
     */
    void setDomain(String domain);


    /**
     * @return the name under which this component has been registered with JMX.
     */
    ObjectName getObjectName();
}
```

`JmxEnabled`接口继承了`javax.management.MBeanRegistration`,用以通过Mbean来暴露对应的组件。可以用arthas 查看tomcat暴露的mbean信息：

```bash
[arthas@62513]$ mbean
Catalina:type=Service
Catalina:type=StringCache
Catalina:type=Valve,host=localhost,context=/servlet,name=NonLoginAuthenticator
Catalina:type=JspMonitor,WebModule=//localhost/servlet,name=jsp,J2EEApplication=none,J2EEServer=none
Catalina:type=NamingResources,host=localhost,context=/servlet
Catalina:type=WebResourceRoot,host=localhost,context=/atour_crawler_war
Catalina:type=ThreadPool,name="ajp-nio-8009"
```

可以看到这里暴露了一个Service，正是`StandardService`,他继承了`LifecycleMbeanBase`,于是自动的暴露出去了。下面来分析下他是如何实现的：

```java

// org.apache.catalina.util.LifecycleMBeanBase#initInternal
	/**
     * Sub-classes wishing to perform additional initialization should override
     * this method, ensuring that super.initInternal() is the first call in the
     * overriding method.
     */
    @Override
    protected void initInternal() throws LifecycleException {

        // If oname is not null then registration has already happened via
        // preRegister().
        if (oname == null) {
            mserver = Registry.getRegistry(null, null).getMBeanServer();

            oname = register(this, getObjectNameKeyProperties());
        }
    }

// org.apache.catalina.util.LifecycleMBeanBase#destroyInternal
  /**
     * Sub-classes wishing to perform additional clean-up should override this
     * method, ensuring that super.destroyInternal() is the last call in the
     * overriding method.
     */
    @Override
    protected void destroyInternal() throws LifecycleException {
        unregister(oname);
    }

```

在初始化的时候，如果当前组件没有注册到`Registry`，会自动的进行注册。注意，子类在覆盖这个方法的时候，不要忘了调用父类的`initInternal`。在组件声明周期结束的时候，也会自动的将其从`Registry`移除。

具体的注册逻辑：

```java
    /**
     * Default domain for MBeans if none can be determined
     */
    public static final String DEFAULT_MBEAN_DOMAIN = "Catalina";

// org.apache.catalina.util.LifecycleMBeanBase#register
protected final ObjectName register(Object obj,
            String objectNameKeyProperties) {

  // Construct an object name with the right domain
  StringBuilder name = new StringBuilder(getDomain());
  name.append(':');
  name.append(objectNameKeyProperties);

  ObjectName on = null;

  try {
    on = new ObjectName(name.toString());

    Registry.getRegistry(null, null).registerComponent(obj, on, null);
  } catch (MalformedObjectNameException e) {
    log.warn(sm.getString("lifecycleMBeanBase.registerFail", obj, name),
             e);
  } catch (Exception e) {
    log.warn(sm.getString("lifecycleMBeanBase.registerFail", obj, name),
             e);
  }

  return on;
}
```

默认注册的名称，格式是`domain:组件名称`，这里默认的domain就是`Catalina`。组件的名称是通过`getObjectNameKeyProperties`，这是个抽象方法，留给子类的钩子。我们看下`StandardService`是如何实现的：

```java
// org.apache.catalina.core.StandardService#getObjectNameKeyProperties
    @Override
    public final String getObjectNameKeyProperties() {
        return "type=Service";
    }
```

这个跟arthas的输出结果正好印证上了。



## 总结

tomcat通过Lifecycle接口来管理各个组件，定义了init/start/stop/destroy等方法。同时提供了抽象类的实现，对子类屏蔽了状态转移和Listener机制的实现。也通过LifecycleMbeanBase提供了通一的暴露到jmx的方式。

至于这些组件的init/start/stop/destroy等方法是何时被调用的，我们会在接下来的文章中接着分析启动的过程。
