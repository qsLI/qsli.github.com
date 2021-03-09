---
title: spring-aop
tags: spring-aop
category: spring
toc: true
typora-root-url: spring-aop
typora-copy-images-to: spring-aop
date: 2021-03-10 01:19:43
---



Spring-Aop是spring提供的面向切面编程的工具，spring的好多功能也是基于切面来实现。切面编程可以将分散的逻辑集中在切面中，便于代码的维护。

## AOP使用
### 注解方式

配置：

```java
/**
 * @author 代故
 * @date 2021/3/7 1:18 AM
 */
@EnableAspectJAutoProxy
@Configuration
public class AopConfig {

    @Bean
    public Foo foo() {
        return new Foo();
    }

    @Bean
    public PerformanceTraceAspect performanceTraceAspect() {
        return new PerformanceTraceAspect();
    }
}


//
```

切面的代码：

```java
/**
 * @author 代故
 * @date 2021/3/5 5:24 PM
 */
@Aspect
@Slf4j
public class PerformanceTraceAspect {

  @Pointcut("execution(public void *.hello1()) || execution(public void *.hello2())")
  public void pointCut() {
  }

  @Around("pointCut()")
  public Object tracePerformance(ProceedingJoinPoint proceedingJoinPoint) throws Throwable {

    Stopwatch stopwatch = Stopwatch.createStarted();
    try {
      return proceedingJoinPoint.proceed();
    } finally {
      log.info("{} total cost {} ms", proceedingJoinPoint.getSignature()
               .getName(), stopwatch.elapsed(TimeUnit.MILLISECONDS));
    }
  }
}


/**
 * @author 代故
 * @date 2021/3/5 5:28 PM
 */
@Slf4j
public class Foo {

    public void hello1() {
        log.info("hello1");
    }

    public void hello2() {
        log.info("hello2");
    }
}

/**
 * @author 代故
 * @date 2021/3/5 5:29 PM
 */
@RunWith(JUnit4ClassRunner.class)
@Slf4j
public class AopTest {

    /**
    * 2021-03-05 17:36:05.406[main][INFO ]c.a.s.a.AopTest.testWeave:31 foo class is Foo$$EnhancerBySpringCGLIB$$a5169b75
    * 2021-03-05 17:36:05.854[main][INFO ]c.a.s.a.Foo.hello1:13 hello1
     * 2021-03-05 17:36:05.862[main][INFO ]c.a.s.a.PerformanceTraceAspect.tracePerformance:31 hello1 total cost 25 ms
     * 2021-03-05 17:36:05.863[main][INFO ]c.a.s.a.Foo.hello2:17 hello2
     * 2021-03-05 17:36:05.863[main][INFO ]c.a.s.a.PerformanceTraceAspect.tracePerformance:31 hello2 total cost 0 ms
     */
    @Test
    public void testWeave() {
        final AspectJProxyFactory aspectJProxyFactory = new AspectJProxyFactory();
        aspectJProxyFactory.setProxyTargetClass(true);
        aspectJProxyFactory.setTarget(new Foo());
        aspectJProxyFactory.addAspect(PerformanceTraceAspect.class);
        Foo proxy = (Foo)aspectJProxyFactory.getProxy();
        log.info("foo class is {}", proxy.getClass().getSimpleName());
        proxy.hello1();
        proxy.hello2();
    }

    /**
     * 2021-03-07 01:20:33.714[main][INFO ]o.s.c.a.AnnotationConfigApplicationContext.prepareRefresh:582 Refreshing org.springframework.context.annotation.AnnotationConfigApplicationContext@e45f292: startup date [Sun Mar 07 01:20:33 CST 2021]; root of context hierarchy
     * 2021-03-07 01:20:35.859[main][INFO ]c.a.s.a.AopTest.testWithSpringContext:47 foo class is Foo$$EnhancerBySpringCGLIB$$2546ecd
     * 2021-03-07 01:20:35.094[main][INFO ]c.a.s.a.Foo.hello1:13 hello1
     * 2021-03-07 01:20:35.096[main][INFO ]c.a.s.a.PerformanceTraceAspect.tracePerformance:31 hello1 total cost 31 ms
     * 2021-03-07 01:20:35.100[main][INFO ]c.a.s.a.Foo.hello2:17 hello2
     * 2021-03-07 01:20:35.103[main][INFO ]c.a.s.a.PerformanceTraceAspect.tracePerformance:31 hello2 total cost 0 ms
     */
    @Test
    public void testWithSpringContext() {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(AopConfig.class);
        final Foo foo = context.getBean(Foo.class);
        log.info("foo class is {}", foo.getClass().getSimpleName());
        foo.hello1();
        foo.hello2();
    }
}

```

在配置类上使用注解`@EnableAspectJAutoProxy`即可，从输出的日志中可以看到，拿到的类其实是CGLIB代理过的。

```bash
2021-03-07 01:20:35.859[main][INFO ]c.a.s.a.AopTest.testWithSpringContext:47 foo class is Foo$$EnhancerBySpringCGLIB$$2546ecd
```

注解有两个属性：

- proxyTargetClass

  默认是false， 如果是true会强制使用cglib代理（默认的对于接口的，是使用的JDK代理）

  > Indicate whether subclass-based (CGLIB) proxies are to be created as opposed
  > to standard Java interface-based proxies. The default is {@code false}.

- ExposeProxy

  默认是false，是否暴露代理类， 可以通过`org.springframework.aop.framework.AopContext`获取（ThreadLocal）

  > Indicate that the proxy should be exposed by the AOP framework as a {@code ThreadLocal}
  > for retrieval via the {@link org.springframework.aop.framework.AopContext} class.
  > Off by default, i.e. no guarantees that {@code AopContext} access will work.

### xml方式

```xml
<aop:aspectj-autoproxy proxy-target-class="true"/>
```

除了配置方式不同，使用和注解的方式类似。xml方式也提供了类似的属性，和上面介绍的一致。

## 源码分析

### BeanPostProcess注册过程

#### 注解方式
注册过程：

{% plantuml %}

@startuml 

participant EnableAspectJAutoProxy

participant AspectJAutoProxyRegistrar 

participant AopConfigUtils

participant BeanDefinitionRegistry

==  BeanPostProcessor注册过程 (@EnableAspectJAutoProxy方式) ==

EnableAspectJAutoProxy -> AspectJAutoProxyRegistrar: import

AspectJAutoProxyRegistrar -> AopConfigUtils: registerAspectJAnnotationAutoProxyCreatorIfNecessary

AopConfigUtils -> BeanDefinitionRegistry: 注册AnnotationAwareAspectJAutoProxyCreator.class

@enduml 

{% endplantuml%}

#### xml方式

注册过程：

{% plantuml %}

@startuml 

participant AopNamespaceHandler 

participant AspectJAutoProxyBeanDefinitionParser

participant AopNamespaceUtils

participant AopConfigUtils

participant BeanDefinitionRegistry

==  BeanPostProcessor注册过程 (aop:aspectj-autoproxy xml方式) ==

AopNamespaceHandler -> AspectJAutoProxyBeanDefinitionParser: 注册处理器

AspectJAutoProxyBeanDefinitionParser -> AopNamespaceUtils: registerAspectJAnnotationAutoProxyCreatorIfNecessary

AopNamespaceUtils -> AopConfigUtils: registerAspectJAnnotationAutoProxyCreatorIfNecessaryAopConfigUtils

AopConfigUtils -> BeanDefinitionRegistry: 注册AnnotationAwareAspectJAutoProxyCreator.class

@enduml 

{% endplantuml%}

#### AopConfigUtils
核心代码：

```java
/**
	 * The bean name of the internally managed auto-proxy creator.
	 */
public static final String AUTO_PROXY_CREATOR_BEAN_NAME =
  "org.springframework.aop.config.internalAutoProxyCreator";
// org.springframework.aop.config.AopConfigUtils#registerOrEscalateApcAsRequired
private static BeanDefinition registerOrEscalateApcAsRequired(Class<?> cls, BeanDefinitionRegistry registry, Object source) {
  Assert.notNull(registry, "BeanDefinitionRegistry must not be null");
  // 如果已经有同名的注册过了
  if (registry.containsBeanDefinition(AUTO_PROXY_CREATOR_BEAN_NAME)) {
    BeanDefinition apcDefinition = registry.getBeanDefinition(AUTO_PROXY_CREATOR_BEAN_NAME);
    // 如果不是AnnotationAwareAspectJAutoProxyCreator.class
    if (!cls.getName().equals(apcDefinition.getBeanClassName())) {
      int currentPriority = findPriorityForClass(apcDefinition.getBeanClassName());
      int requiredPriority = findPriorityForClass(cls);
      // 取优先级大的注册
      if (currentPriority < requiredPriority) {
        apcDefinition.setBeanClassName(cls.getName());
      }
    }
    return null;
  }
  // 没有注册过，直接注册AnnotationAwareAspectJAutoProxyCreator.class
  RootBeanDefinition beanDefinition = new RootBeanDefinition(cls);
  beanDefinition.setSource(source);
  beanDefinition.getPropertyValues().add("order", Ordered.HIGHEST_PRECEDENCE);
  beanDefinition.setRole(BeanDefinition.ROLE_INFRASTRUCTURE);
  registry.registerBeanDefinition(AUTO_PROXY_CREATOR_BEAN_NAME, beanDefinition);
  return beanDefinition;
}
```

### BeanPostProcessor处理逻辑

Spring-Aop是通过`BeanPostProcessor`来生成代理类，`BeanPostProcessor`可以在bean初始化之前和之后做一些修改：

```java
public interface BeanPostProcessor {

	/**
	 * Apply this BeanPostProcessor to the given new bean instance <i>before</i> any bean
	 * initialization callbacks (like InitializingBean's <code>afterPropertiesSet</code>
	 * or a custom init-method). The bean will already be populated with property values.
	 * The returned bean instance may be a wrapper around the original.
	 * @param bean the new bean instance
	 * @param beanName the name of the bean
	 * @return the bean instance to use, either the original or a wrapped one
	 * @throws org.springframework.beans.BeansException in case of errors
	 * @see org.springframework.beans.factory.InitializingBean#afterPropertiesSet
	 */
	Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException;
  
  /**
	 * Apply this BeanPostProcessor to the given new bean instance <i>after</i> any bean
	 * initialization callbacks (like InitializingBean's {@code afterPropertiesSet}
	 * or a custom init-method). The bean will already be populated with property values.
	 * The returned bean instance may be a wrapper around the original.
	 * <p>In case of a FactoryBean, this callback will be invoked for both the FactoryBean
	 * instance and the objects created by the FactoryBean (as of Spring 2.0). The
	 * post-processor can decide whether to apply to either the FactoryBean or created
	 * objects or both through corresponding {@code bean instanceof FactoryBean} checks.
	 * <p>This callback will also be invoked after a short-circuiting triggered by a
	 * {@link InstantiationAwareBeanPostProcessor#postProcessBeforeInstantiation} method,
	 * in contrast to all other BeanPostProcessor callbacks.
	 * @param bean the new bean instance
	 * @param beanName the name of the bean
	 * @return the bean instance to use, either the original or a wrapped one;
	 * if {@code null}, no subsequent BeanPostProcessors will be invoked
	 * @throws org.springframework.beans.BeansException in case of errors
	 * @see org.springframework.beans.factory.InitializingBean#afterPropertiesSet
	 * @see org.springframework.beans.factory.FactoryBean
	 */
	Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException;
  
}
```

前面注册的`AnnotationAwareAspectJAutoProxyCreator`就间接实现了这个接口，生成对应bean的代理类，继承结构如下：

![image-20210307163021098](/image-20210307163021098.png)

处理代码：

```java
// org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#postProcessBeforeInstantiation
@Override
public Object postProcessBeforeInstantiation(Class<?> beanClass, String beanName) {
  // 用于缓存, 对于之前的Foo.class, 这里就是foo; 如果是FactoryBean，前面会加&用于区分
  Object cacheKey = getCacheKey(beanClass, beanName);

  if (!StringUtils.hasLength(beanName) || !this.targetSourcedBeans.contains(beanName)) {
    // 增强过的直接就返回null，
    // @return the bean instance to use, either the original or a wrapped one;
	  // if {@code null}, no subsequent BeanPostProcessors will be invoked
    if (this.advisedBeans.containsKey(cacheKey)) {
      return null;
    }
    // Advice, Pointcut, Advisor, AopInfrastructureBean这些类直接跳过
    if (isInfrastructureClass(beanClass) || shouldSkip(beanClass, beanName)) {
      this.advisedBeans.put(cacheKey, Boolean.FALSE);
      return null;
    }
  }

  // Create proxy here if we have a custom TargetSource.
  // Suppresses unnecessary default instantiation of the target bean:
  // The TargetSource will handle target instances in a custom fashion.
  TargetSource targetSource = getCustomTargetSource(beanClass, beanName);
  if (targetSource != null) {
    if (StringUtils.hasLength(beanName)) {
      this.targetSourcedBeans.add(beanName);
    }
    // 
    Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(beanClass, beanName, targetSource);
    Object proxy = createProxy(beanClass, beanName, specificInterceptors, targetSource);
    this.proxyTypes.put(cacheKey, proxy.getClass());
    return proxy;
  }

  return null;
}

// org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#postProcessAfterInitialization
/**
	 * Create a proxy with the configured interceptors if the bean is
	 * identified as one to proxy by the subclass.
	 * @see #getAdvicesAndAdvisorsForBean
	 */
@Override
public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
  if (bean != null) {
    Object cacheKey = getCacheKey(bean.getClass(), beanName);
    if (!this.earlyProxyReferences.contains(cacheKey)) {
      return wrapIfNecessary(bean, beanName, cacheKey);
    }
  }
  return bean;
}


// org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#wrapIfNecessary
/**
	 * Wrap the given bean if necessary, i.e. if it is eligible for being proxied.
	 * @param bean the raw bean instance
	 * @param beanName the name of the bean
	 * @param cacheKey the cache key for metadata access
	 * @return a proxy wrapping the bean, or the raw bean instance as-is
	 */
protected Object wrapIfNecessary(Object bean, String beanName, Object cacheKey) {
  if (beanName != null && this.targetSourcedBeans.contains(beanName)) {
    return bean;
  }
  if (Boolean.FALSE.equals(this.advisedBeans.get(cacheKey))) {
    return bean;
  }
  if (isInfrastructureClass(bean.getClass()) || shouldSkip(bean.getClass(), beanName)) {
    this.advisedBeans.put(cacheKey, Boolean.FALSE);
    return bean;
  }

  // Create proxy if we have advice.
  // 这里就会找到performanceTraceAspect
  Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(bean.getClass(), beanName, null);
  if (specificInterceptors != DO_NOT_PROXY) {
    // 记录增强过的类
    this.advisedBeans.put(cacheKey, Boolean.TRUE);
    // 创建代理
    Object proxy = createProxy(
      bean.getClass(), beanName, specificInterceptors, new SingletonTargetSource(bean));
   // 记录代理类
    this.proxyTypes.put(cacheKey, proxy.getClass());
    // 用代理类替代原始的类
    return proxy;
  }
	
  // 记录无需增强的类
  this.advisedBeans.put(cacheKey, Boolean.FALSE);
  return bean;
}
```

创建代理类主要的步骤有两步，第一步是找到满足条件的Advice和Advisor，第二步是创建代理类。

#### 获取Advisor

这里的`getAdvicesAndAdvisorsForBean`是一个抽象方法，子类可以覆盖整个方法，实现自己的查找策略：

```java
// org.springframework.aop.framework.autoproxy.AbstractAdvisorAutoProxyCreator#getAdvicesAndAdvisorsForBean
@Override
protected Object[] getAdvicesAndAdvisorsForBean(Class<?> beanClass, String beanName, TargetSource targetSource) {
  List<Advisor> advisors = findEligibleAdvisors(beanClass, beanName);
  if (advisors.isEmpty()) {
    return DO_NOT_PROXY;
  }
  return advisors.toArray();
}

/**
	 * Find all eligible Advisors for auto-proxying this class.
	 * @param beanClass the clazz to find advisors for
	 * @param beanName the name of the currently proxied bean
	 * @return the empty List, not {@code null},
	 * if there are no pointcuts or interceptors
	 * @see #findCandidateAdvisors
	 * @see #sortAdvisors
	 * @see #extendAdvisors
	 */
protected List<Advisor> findEligibleAdvisors(Class<?> beanClass, String beanName) {
 	// 找出当前beanFactory中的所有的Advisor
  List<Advisor> candidateAdvisors = findCandidateAdvisors();
  // 筛选出能用于当前beanClass的Advisor
  List<Advisor> eligibleAdvisors = findAdvisorsThatCanApply(candidateAdvisors, beanClass, beanName);
  // 扩展点
  extendAdvisors(eligibleAdvisors);
  if (!eligibleAdvisors.isEmpty()) {
    // 按照@Order定义的优先级排序
    eligibleAdvisors = sortAdvisors(eligibleAdvisors);
  }
  return eligibleAdvisors;
}


/**
	 * Find all candidate Advisors to use in auto-proxying.
	 * @return the List of candidate Advisors
	 */
protected List<Advisor> findCandidateAdvisors() {
  return this.advisorRetrievalHelper.findAdvisorBeans();
}

// org.springframework.aop.framework.autoproxy.BeanFactoryAdvisorRetrievalHelper#findAdvisorBeans
/**
	 * Find all eligible Advisor beans in the current bean factory,
	 * ignoring FactoryBeans and excluding beans that are currently in creation.
	 * @return the list of {@link org.springframework.aop.Advisor} beans
	 * @see #isEligibleBean
	 */
public List<Advisor> findAdvisorBeans() {
  // Determine list of advisor bean names, if not cached already.
  String[] advisorNames = null;
  synchronized (this) {
    // 有缓存
    advisorNames = this.cachedAdvisorBeanNames;
    if (advisorNames == null) {
      // Do not initialize FactoryBeans here: We need to leave all regular beans
      // uninitialized to let the auto-proxy creator apply to them!
      advisorNames = BeanFactoryUtils.beanNamesForTypeIncludingAncestors(
        this.beanFactory, Advisor.class, true, false);
      this.cachedAdvisorBeanNames = advisorNames;
    }
  }
  if (advisorNames.length == 0) {
    return new LinkedList<Advisor>();
  }

  List<Advisor> advisors = new LinkedList<Advisor>();
  // 遍历所有的advisor
  for (String name : advisorNames) {
    if (isEligibleBean(name)) {
      if (this.beanFactory.isCurrentlyInCreation(name)) {
        if (logger.isDebugEnabled()) {
          logger.debug("Skipping currently created advisor '" + name + "'");
        }
      }
      else {
        try {
          advisors.add(this.beanFactory.getBean(name, Advisor.class));
        }
        catch (BeanCreationException ex) {
          Throwable rootCause = ex.getMostSpecificCause();
          if (rootCause instanceof BeanCurrentlyInCreationException) {
            BeanCreationException bce = (BeanCreationException) rootCause;
            if (this.beanFactory.isCurrentlyInCreation(bce.getBeanName())) {
              if (logger.isDebugEnabled()) {
                logger.debug("Skipping advisor '" + name +
                             "' with dependency on currently created bean: " + ex.getMessage());
              }
              // Ignore: indicates a reference back to the bean we're trying to advise.
              // We want to find advisors other than the currently created bean itself.
              continue;
            }
          }
          throw ex;
        }
      }
    }
  }
  return advisors;
}
```

`AnnotationAwareAspectJAutoProxyCreator`中重写了`findCandidateAdvisors`方法，调用了父类的`findCandidateAdvisors`,也加上了自己的特化逻辑：

```java
// org.springframework.aop.aspectj.annotation.AnnotationAwareAspectJAutoProxyCreator#findCandidateAdvisors
	@Override
	protected List<Advisor> findCandidateAdvisors() {
    // 上述的逻辑，从beanFactory中查找advisor
		// Add all the Spring advisors found according to superclass rules.
		List<Advisor> advisors = super.findCandidateAdvisors();
    // AnnotationAwareAspectJAutoProxyCreator自己的逻辑
		// Build Advisors for all AspectJ aspects in the bean factory.
		advisors.addAll(this.aspectJAdvisorsBuilder.buildAspectJAdvisors());
		return advisors;
	}

// org.springframework.aop.aspectj.annotation.BeanFactoryAspectJAdvisorsBuilder#buildAspectJAdvisors
/**
	 * Look for AspectJ-annotated aspect beans in the current bean factory,
	 * and return to a list of Spring AOP Advisors representing them.
	 * <p>Creates a Spring Advisor for each AspectJ advice method.
	 * @return the list of {@link org.springframework.aop.Advisor} beans
	 * @see #isEligibleBean
	 */
public List<Advisor> buildAspectJAdvisors() {
  List<String> aspectNames = this.aspectBeanNames;

  if (aspectNames == null) {
    synchronized (this) {
      aspectNames = this.aspectBeanNames;
      if (aspectNames == null) {
        List<Advisor> advisors = new LinkedList<Advisor>();
        aspectNames = new LinkedList<String>();
        // 这里传入的是Object类，和上面传入的Advisor类不同
        String[] beanNames = BeanFactoryUtils.beanNamesForTypeIncludingAncestors(
          this.beanFactory, Object.class, true, false);
        for (String beanName : beanNames) {
          if (!isEligibleBean(beanName)) {
            continue;
          }
          // We must be careful not to instantiate beans eagerly as in this case they
          // would be cached by the Spring container but would not have been weaved.
          Class<?> beanType = this.beanFactory.getType(beanName);
          if (beanType == null) {
            continue;
          }
          // 是否是切面类，一般需要有@Aspect标记
          if (this.advisorFactory.isAspect(beanType)) {
            aspectNames.add(beanName);
            AspectMetadata amd = new AspectMetadata(beanType, beanName);
            if (amd.getAjType().getPerClause().getKind() == PerClauseKind.SINGLETON) {
              // 根据标记的类生成Advisor
              MetadataAwareAspectInstanceFactory factory =
                new BeanFactoryAspectInstanceFactory(this.beanFactory, beanName);
              List<Advisor> classAdvisors = this.advisorFactory.getAdvisors(factory);
              if (this.beanFactory.isSingleton(beanName)) {
                this.advisorsCache.put(beanName, classAdvisors);
              }
              else {
                this.aspectFactoryCache.put(beanName, factory);
              }
              advisors.addAll(classAdvisors);
            }
            else {
              // Per target or per this.
              if (this.beanFactory.isSingleton(beanName)) {
                throw new IllegalArgumentException("Bean with name '" + beanName +
                                                   "' is a singleton, but aspect instantiation model is not singleton");
              }
              MetadataAwareAspectInstanceFactory factory =
                new PrototypeAspectInstanceFactory(this.beanFactory, beanName);
              this.aspectFactoryCache.put(beanName, factory);
              advisors.addAll(this.advisorFactory.getAdvisors(factory));
            }
          }
        }
        this.aspectBeanNames = aspectNames;
        return advisors;
      }
    }
  } // 初始化缓存的逻辑

  if (aspectNames.isEmpty()) {
    return Collections.emptyList();
  }
  List<Advisor> advisors = new LinkedList<Advisor>();
  for (String aspectName : aspectNames) {
    List<Advisor> cachedAdvisors = this.advisorsCache.get(aspectName);
    if (cachedAdvisors != null) {
      // 从缓存里直接取的逻辑
      advisors.addAll(cachedAdvisors);
    }
    else {
      // 新生成Advisor
      MetadataAwareAspectInstanceFactory factory = this.aspectFactoryCache.get(aspectName);
      advisors.addAll(this.advisorFactory.getAdvisors(factory));
    }
  }
  return advisors;
}

```

#### 生成代理类

```java
// org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#createProxy
protected Object createProxy(
  Class<?> beanClass, String beanName, Object[] specificInterceptors, TargetSource targetSource) {

  if (this.beanFactory instanceof ConfigurableListableBeanFactory) {
    // 可以通过determineTargetClass获取被代理的类
    AutoProxyUtils.exposeTargetClass((ConfigurableListableBeanFactory) this.beanFactory, beanName, beanClass);
  }

  ProxyFactory proxyFactory = new ProxyFactory();
  proxyFactory.copyFrom(this);

  if (!proxyFactory.isProxyTargetClass()) {
    if (shouldProxyTargetClass(beanClass, beanName)) {
      proxyFactory.setProxyTargetClass(true);
    }
    else {
      evaluateProxyInterfaces(beanClass, proxyFactory);
    }
  }

  Advisor[] advisors = buildAdvisors(beanName, specificInterceptors);
  for (Advisor advisor : advisors) {
    proxyFactory.addAdvisor(advisor);
  }

  proxyFactory.setTargetSource(targetSource);
  customizeProxyFactory(proxyFactory);

  proxyFactory.setFrozen(this.freezeProxy);
  if (advisorsPreFiltered()) {
    proxyFactory.setPreFiltered(true);
  }

  return proxyFactory.getProxy(getProxyClassLoader());
}
```

获取代理的过程和测试代码中的步骤一致：

```java
 final AspectJProxyFactory aspectJProxyFactory = new AspectJProxyFactory();
aspectJProxyFactory.setProxyTargetClass(true);
// 设置target
aspectJProxyFactory.setTarget(new Foo());
// 设置aspect
aspectJProxyFactory.addAspect(PerformanceTraceAspect.class);
Foo proxy = (Foo)aspectJProxyFactory.getProxy();
log.info("foo class is {}", proxy.getClass().getSimpleName());
proxy.hello1();
proxy.hello2();
```

具体是JDK代理，还是CGLIB字节码增强，要看ProxyFactory

![image-20210307210031053](/image-20210307210031053.png)

```java
// org.springframework.aop.framework.ProxyFactory#getProxy(java.lang.ClassLoader)
public Object getProxy(ClassLoader classLoader) {
  return createAopProxy().getProxy(classLoader);
}

protected final synchronized AopProxy createAopProxy() {
  if (!this.active) {
    activate();
  }
  return getAopProxyFactory().createAopProxy(this);
}

// org.springframework.aop.framework.AopProxyFactory
public interface AopProxyFactory {

	/**
	 * Create an {@link AopProxy} for the given AOP configuration.
	 * @param config the AOP configuration in the form of an
	 * AdvisedSupport object
	 * @return the corresponding AOP proxy
	 * @throws AopConfigException if the configuration is invalid
	 */
	AopProxy createAopProxy(AdvisedSupport config) throws AopConfigException;

}

//唯一的实现 org.springframework.aop.framework.DefaultAopProxyFactory
@Override
public AopProxy createAopProxy(AdvisedSupport config) throws AopConfigException {
  if (config.isOptimize() || config.isProxyTargetClass() || hasNoUserSuppliedProxyInterfaces(config)) {
    Class<?> targetClass = config.getTargetClass();
    if (targetClass == null) {
      throw new AopConfigException("TargetSource cannot determine target class: " +
                                   "Either an interface or a target is required for proxy creation.");
    }
    // 实现了接口的，或者已经是JDK代理类
    if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
      return new JdkDynamicAopProxy(config);
    }
    // CglibAopProxy 代理的子类
    return new ObjenesisCglibAopProxy(config);
  }
  else {
    return new JdkDynamicAopProxy(config);
  }
}

```

`AopProxy`的继承关系，ProxyFactory也实现了这个接口。

![image-20210307205728646](/image-20210307205728646.png)

### TargetSource

spring的代理其实是三层的：

cglib/jdk proxy  -> targetSource -> target

targetSource封装了获取target的逻辑，比如实现对象池化的`CommonsPool2TargetSource`、热修改的`HotSwappableTargetSource`;也可以扩展这个类，实现自己的获取逻辑。

#### HotSwappableTargetSource

多了个swap的逻辑：

```java
/**
	 * Swap the target, returning the old target object.
	 * @param newTarget the new target object
	 * @return the old target object
	 * @throws IllegalArgumentException if the new target is invalid
	 */
public synchronized Object swap(Object newTarget) throws IllegalArgumentException {
  Assert.notNull(newTarget, "Target object must not be null");
  Object old = this.target;
  this.target = newTarget;
  return old;
}
```

有点类似jdk的`AtomicReference`，使用如下：

```java
@Bean
public ProxyFactoryBean barFactory(HotSwappableTargetSource hotSwappableTargetSource) {
  ProxyFactoryBean pfb = new ProxyFactoryBean();
  pfb.setTargetSource(hotSwappableTargetSource);
  pfb.setSingleton(false);
  return pfb;
}

@Bean(name = "barTarget")
@Scope(value = SCOPE_PROTOTYPE)
public Bar barTarget() {
  return new Bar(System.nanoTime());
}

@Bean
public HotSwappableTargetSource hotSwappableTargetSource(Bar bar) {
  final HotSwappableTargetSource hotSwappableTargetSource = new HotSwappableTargetSource(bar);
  return hotSwappableTargetSource;
}
```

测试代码：

```java
@Test
public void testHotSwap() {
  AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(AopConfig.class);
  final HotSwappableTargetSource swapper = context.getBean(HotSwappableTargetSource.class);
  final Hello bar = context.getBean("barFactory", Hello.class);
  // 2021-03-08 17:13:39.308[main][INFO ]c.a.s.a.Bar.sayHello:22 hello...327431205655481
  bar.sayHello();
  // 替换类
  swapper.swap(new Bar(System.nanoTime()));
  // 2021-03-08 17:13:39.308[main][INFO ]c.a.s.a.Bar.sayHello:22 hello...327431263396408
  bar.sayHello();
  // 2021-03-08 17:13:39.309[main][INFO ]c.a.s.a.Bar.sayHello:22 hello...327431263396408
  bar.sayHello();
}
```



#### CommonsPool2TargetSource

底层是apache的对象池，`getTarget`时是从对象池中取，在`releaseTarget`

```java
// org.springframework.aop.target.CommonsPool2TargetSource#releaseTarget
/**
	 * Returns the specified object to the underlying {@code ObjectPool}.
	 */
@Override
public void releaseTarget(Object target) throws Exception {
  this.pool.returnObject(target);
}

// org.springframework.aop.target.CommonsPool2TargetSource#getTarget
/**
	 * Borrows an object from the {@code ObjectPool}.
	 */
@Override
public Object getTarget() throws Exception {
  return this.pool.borrowObject();
}
```

需要注意对象池的一些超时设置，比如`maxWait`等，防止业务hang住。

```java
/**
 * @author 代故
 * @date 2021/3/7 1:18 AM
 */
@EnableAspectJAutoProxy(proxyTargetClass = true)
@Configuration
public class AopConfig {

    @Bean
    public ProxyFactoryBean barFactory() {
        ProxyFactoryBean pfb = new ProxyFactoryBean();
        pfb.setTargetSource(poolTargetSource());
        pfb.setSingleton(false);
        return pfb;
    }

    @Bean(name = "barTarget")
    @Scope(value = SCOPE_PROTOTYPE)
    public Bar barTarget() {
        return new Bar(System.nanoTime());
    }

    @Bean
    public CommonsPool2TargetSource poolTargetSource() {
        final CommonsPool2TargetSource targetSource = new CommonsPool2TargetSource();
        targetSource.setMaxSize(2);
        targetSource.setMaxWait(500);
        targetSource.setTargetBeanName("barTarget");
        targetSource.setTargetClass(Bar.class);
        return targetSource;
    }
}
```

测试获取对象：

```java
 @Test
@SneakyThrows
public void testCustomTargetSource() throws Exception {
  AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(AopConfig.class);
  final ThreadFactory threadFactory = new ThreadFactoryBuilder().setUncaughtExceptionHandler(
    (Thread t, Throwable e) -> {
      // submit返回的是future，抛异常了，也是在Future get的时候抛的
      // execute没有返回值，如果异常了，就进到这里了
      log.error("thread {} throws exception {}", t.getName(), e);
    })
    .build();
  ThreadPoolExecutor executor = new ThreadPoolExecutor(5, 5, 60,
                                                       TimeUnit.SECONDS, new ArrayBlockingQueue<>(30), threadFactory);
  executor.execute(() -> actionCGLIB(context));
  executor.execute(() -> actionCGLIB(context));
  executor.execute(() -> actionCGLIB(context));
  executor.execute(() -> actionCGLIB(context));
  executor.shutdown();
  //        actionCGLIB(context);
  executor.awaitTermination(6000000, TimeUnit.MILLISECONDS);
  TimeUnit.SECONDS.sleep(30);
}


private void actionCGLIB(AnnotationConfigApplicationContext context) {
  final Bar bar1 = ((Bar)context.getBean("barFactory"));
  log.info("bar1 = " + bar1.hashCode() + ", className=" + bar1.getClass());
  try {
    bar1.sayHello();
  } catch (Throwable t) {
    log.error("say hello exception", t);
    throw t;
  }
}

```

输出结果：

```bash
2021-03-08 17:41:13.137[pool-2-thread-3][INFO ]c.a.s.a.AopTest.action:91 bar1 = -1196711332, className=class com.sun.proxy.$Proxy23
2021-03-08 17:41:13.137[pool-2-thread-1][INFO ]c.a.s.a.AopTest.action:91 bar1 = -1196711332, className=class com.sun.proxy.$Proxy23
2021-03-08 17:41:13.137[pool-2-thread-2][INFO ]c.a.s.a.AopTest.action:91 bar1 = -1196711332, className=class com.sun.proxy.$Proxy23
2021-03-08 17:41:13.137[pool-2-thread-4][INFO ]c.a.s.a.AopTest.action:91 bar1 = -1196711332, className=class com.sun.proxy.$Proxy23
2021-03-08 17:41:23.143[pool-2-thread-2][INFO ]c.a.s.a.Bar.sayHello:22 hello...329095160261362
2021-03-08 17:41:23.143[pool-2-thread-3][INFO ]c.a.s.a.Bar.sayHello:22 hello...329095160261350
2021-03-08 17:41:23.146[pool-2-thread-1][INFO ]c.a.s.a.Bar.sayHello:22 hello...329095160261350
2021-03-08 17:41:23.147[pool-2-thread-4][INFO ]c.a.s.a.Bar.sayHello:22 hello...329095160261362
```

每次获取到的都是`ProxyFactoryBean`, 在每次调用具体的方法时，`ProxyFactoryBean`会调用底层的`TargetSource`来获取`Target`（这里就是`CommonsPool2TargetSource`）。`CommonsPool2TargetSource`会从持有的对象池中复用对象。典型的应用场景就是spring的状态机，使用完之后可以放入对象池中，避免频繁创建对象的开销。

spring提供了Advisor来获取对象池的状态：

```java
@Bean
public MethodInvokingFactoryBean poolConfigAdvisor(CommonsPool2TargetSource pool2TargetSource) {
  final MethodInvokingFactoryBean factoryBean = new MethodInvokingFactoryBean();
  factoryBean.setTargetObject(pool2TargetSource);
  factoryBean.setTargetMethod("getPoolingConfigMixin");
  return factoryBean;
}

 @Bean
public ProxyFactoryBean barFactory() {
  ProxyFactoryBean pfb = new ProxyFactoryBean();
  pfb.setTargetSource(poolTargetSource());
  pfb.setSingleton(false);
  // 配置interceptor的bean名称
  pfb.setInterceptorNames("poolConfigAdvisor");
  return pfb;
}

@Bean(name = "barTarget")
@Scope(value = SCOPE_PROTOTYPE)
public Bar barTarget() {
  return new Bar(System.nanoTime());
}

@Bean
public CommonsPool2TargetSource poolTargetSource() {
  final CommonsPool2TargetSource targetSource = new CommonsPool2TargetSource();
  targetSource.setMaxSize(2);
  targetSource.setMaxWait(500);
  targetSource.setTargetBeanName("barTarget");
  targetSource.setTargetClass(Bar.class);
  return targetSource;
}
```

调用代码：

```java
@Test
public void testPooling() {
  AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(AopConfig.class);
  PoolingConfig poolingConfig = (PoolingConfig)context.getBean("barFactory");
  log.info("pooling config is active={}, max={}", poolingConfig.getActiveCount(), poolingConfig.getMaxSize());
}
```

`MethodInvokingFactoryBean`会把目标对象（targetObject）方法（targetMethod）的返回值，作为bean实例；就是`CommonsPool2TargetSource#getPoolingConfigMixin`的返回值`DefaultIntroductionAdvisor`, 会被交给spring管理（相当于是**factory-method**的特化）。另外`DelegatingIntroductionInterceptor`实现了`IntroductionInterceptor`是per 实例的。

```java
/**
	 * Return an IntroductionAdvisor that providing a mixin
	 * exposing statistics about the pool maintained by this object.
	 */
public DefaultIntroductionAdvisor getPoolingConfigMixin() {
  DelegatingIntroductionInterceptor dii = new DelegatingIntroductionInterceptor(this);
  // 这个advisor的作用就是给生成的Target加了个接口PoolingConfig.class，这样后面拿到target之后就可以强转了
  // 调用PoolingConfig接口中的方法就会给代理到当前的TargetSource
  return new DefaultIntroductionAdvisor(dii, PoolingConfig.class);
}
```

拿到的代理对象实现了`PoolingConfig`接口，对应的调用就转到了`TargetSource`上

![image-20210309154235213](/image-20210309154235213.png)

###  Jdk代理

#### 静态代理

静态代理需要自己写代理类，实现接口，然后代理方法委托给底层的实现：

```java
/**
 * Created by KL on 2015/12/8.
 */
public interface Greeting {
    void sayHello(String name);
}

/**
 * Created by KL on 2015/12/8.
 * 具体的实现类
 */
public class GreetingImpl implements Greeting {
    public void sayHello(String name) {
        System.out.println(name);
    }
}

/**
 * 手动创建代理类
 * Created by KL on 2015/12/8.
 * static proxy
 */
public class GreetingProxy implements Greeting {
    private Greeting greetingImpl;

    public GreetingProxy(Greeting greetingImpl) {
        this.greetingImpl = greetingImpl;
    }

    public void sayHello(String name) {
        before();
      	// 具体的调用委托给底层的实现
        greetingImpl.sayHello(name);
        after();
    }

    private void before() {
        System.out.println("before");
    }

    private void after() {
        System.out.println("after");
    }

}
```

#### 动态代理

动态代理需要用到JDK提供的`InvocationHandler`接口, 

```java
// java.lang.reflect.InvocationHandler
public Object invoke(Object proxy, Method method, Object[] args)
  throws Throwable;
```

实现代理类：

```java
/**
 * Created by KL on 2015/12/8.
 */
public class GreetingDynamicProxy implements InvocationHandler {
    private Object target;

    public GreetingDynamicProxy(Object target) {
        this.target = target;
    }

  	// 获取代理类
    @SuppressWarnings("unchecked")
    public <T> T getProxy() {
        return (T) Proxy.newProxyInstance(
                target.getClass().getClassLoader(),
                target.getClass().getInterfaces(),
                this
        );
    }
		
  	// 调用对应的方法
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        before();
        Object result = method.invoke(target,args);
        after();
        return result;
    }

    private void before() {
        System.out.println("Before");
    }

    private void after() {
        System.out.println("After");
    }
}
```

使用：

```java
//test dynamic proxy
Greeting greeting = new GreetingDynamicProxy(new GreetingImpl()).getProxy();
greeting.sayHello("haha!");
```

使用arthas查看生成的代理类：

```java
[arthas@61770]$ jad com.sun.proxy.\\$Proxy0

ClassLoader:
+-sun.misc.Launcher$AppClassLoader@18b4aac2
  +-sun.misc.Launcher$ExtClassLoader@3429535c

Location:


/*
 * Decompiled with CFR.
 *
 * Could not load the following classes:
 *  com.air.proxy.Greeting
 */
package com.sun.proxy;

import com.air.proxy.Greeting;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.lang.reflect.UndeclaredThrowableException;

public final class $Proxy0 extends Proxy implements Greeting {
    private static Method m1;
    private static Method m3;
    private static Method m2;
    private static Method m0;

    public $Proxy0(InvocationHandler invocationHandler) {
        super(invocationHandler);
    }

    public final boolean equals(Object object) {
        try {
            return (Boolean)this.h.invoke(this, m1, new Object[]{object});
        }
        catch (Error | RuntimeException throwable) {
            throw throwable;
        }
        catch (Throwable throwable) {
            throw new UndeclaredThrowableException(throwable);
        }
    }
		
  	// 实现的接口方法
    public final void sayHello(String string) {
        try {
          	// h就是invocationHandler
            // m3就是sayHello方法
            this.h.invoke(this, m3, new Object[]{string});
            return;
        }
        catch (Error | RuntimeException throwable) {
            throw throwable;
        }
        catch (Throwable throwable) {
            throw new UndeclaredThrowableException(throwable);
        }
    }

    public final String toString() {
        try {
            return (String)this.h.invoke(this, m2, null);
        }
        catch (Error | RuntimeException throwable) {
            throw throwable;
        }
        catch (Throwable throwable) {
            throw new UndeclaredThrowableException(throwable);
        }
    }

    public final int hashCode() {
        try {
            return (Integer)this.h.invoke(this, m0, null);
        }
        catch (Error | RuntimeException throwable) {
            throw throwable;
        }
        catch (Throwable throwable) {
            throw new UndeclaredThrowableException(throwable);
        }
    }

    static {
        try {
            m1 = Class.forName("java.lang.Object").getMethod("equals", Class.forName("java.lang.Object"));
            m3 = Class.forName("com.air.proxy.Greeting").getMethod("sayHello", Class.forName("java.lang.String"));
            m2 = Class.forName("java.lang.Object").getMethod("toString", new Class[0]);
            m0 = Class.forName("java.lang.Object").getMethod("hashCode", new Class[0]);
            return;
        }
        catch (NoSuchMethodException noSuchMethodException) {
            throw new NoSuchMethodError(noSuchMethodException.getMessage());
        }
        catch (ClassNotFoundException classNotFoundException) {
            throw new NoClassDefFoundError(classNotFoundException.getMessage());
        }
    }
}

Affect(row-cnt:1) cost in 907 ms.
```



#### JdkDynamicAopProxy

创建代理：

```java
// org.springframework.aop.framework.JdkDynamicAopProxy#getProxy(java.lang.ClassLoader)
@Override
public Object getProxy(ClassLoader classLoader) {
  if (logger.isDebugEnabled()) {
    logger.debug("Creating JDK dynamic proxy: target source is " + this.advised.getTargetSource());
  }
  // 查找实现的接口
  Class<?>[] proxiedInterfaces = AopProxyUtils.completeProxiedInterfaces(this.advised, true);
  findDefinedEqualsAndHashCodeMethods(proxiedInterfaces);
  // 生成代理类
  return Proxy.newProxyInstance(classLoader, proxiedInterfaces, this);
}


// org.springframework.aop.framework.JdkDynamicAopProxy#invoke
	/**
	 * Implementation of {@code InvocationHandler.invoke}.
	 * <p>Callers will see exactly the exception thrown by the target,
	 * unless a hook method throws an exception.
	 */
@Override
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
  MethodInvocation invocation;
  Object oldProxy = null;
  boolean setProxyContext = false;

  TargetSource targetSource = this.advised.targetSource;
  Class<?> targetClass = null;
  Object target = null;

  try {
    if (!this.equalsDefined && AopUtils.isEqualsMethod(method)) {
      // The target does not implement the equals(Object) method itself.
      return equals(args[0]);
    }
    else if (!this.hashCodeDefined && AopUtils.isHashCodeMethod(method)) {
      // The target does not implement the hashCode() method itself.
      return hashCode();
    }
    else if (method.getDeclaringClass() == DecoratingProxy.class) {
      // There is only getDecoratedClass() declared -> dispatch to proxy config.
      return AopProxyUtils.ultimateTargetClass(this.advised);
    }
    else if (!this.advised.opaque && method.getDeclaringClass().isInterface() &&
             method.getDeclaringClass().isAssignableFrom(Advised.class)) {
      // Service invocations on ProxyConfig with the proxy config...
      return AopUtils.invokeJoinpointUsingReflection(this.advised, method, args);
    }

    Object retVal;
		// 暴露代理类
    if (this.advised.exposeProxy) {
      // Make invocation available if necessary.
      oldProxy = AopContext.setCurrentProxy(proxy);
      setProxyContext = true;
    }

    // May be null. Get as late as possible to minimize the time we "own" the target,
    // in case it comes from a pool.
    // 从targetSource获取对应的信息
    target = targetSource.getTarget();
    if (target != null) {
      targetClass = target.getClass();
    }

    // Get the interception chain for this method.
    // 获取针对targetClass的MethodInterceptor, @Aspect等声明的会在这个chain中
    List<Object> chain = this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass);

    // Check whether we have any advice. If we don't, we can fallback on direct
    // reflective invocation of the target, and avoid creating a MethodInvocation.
    if (chain.isEmpty()) {
      // 没有advised的，就直接用普通的jdk代理
      // We can skip creating a MethodInvocation: just invoke the target directly
      // Note that the final invoker must be an InvokerInterceptor so we know it does
      // nothing but a reflective operation on the target, and no hot swapping or fancy proxying.
      Object[] argsToUse = AopProxyUtils.adaptArgumentsIfNecessary(method, args);
      retVal = AopUtils.invokeJoinpointUsingReflection(target, method, argsToUse);
    }
    else {
      // 包装成ReflectiveMethodInvocation，
      // ReflectiveMethodInvocation类似filterChain，内部有状态记录处理到第几个，递归调用，使每个Interceptor都能执行
      // We need to create a method invocation...
      invocation = new ReflectiveMethodInvocation(proxy, target, method, args, targetClass, chain);
      // Proceed to the joinpoint through the interceptor chain.
      retVal = invocation.proceed();
    }

    // Massage return value if necessary.
    Class<?> returnType = method.getReturnType();
    if (retVal != null && retVal == target &&
        returnType != Object.class && returnType.isInstance(proxy) &&
        !RawTargetAccess.class.isAssignableFrom(method.getDeclaringClass())) {
      // Special case: it returned "this" and the return type of the method
      // is type-compatible. Note that we can't help if the target sets
      // a reference to itself in another returned object.
      retVal = proxy;
    }
    else if (retVal == null && returnType != Void.TYPE && returnType.isPrimitive()) {
      throw new AopInvocationException(
        "Null return value from advice does not match primitive return type for: " + method);
    }
    return retVal;
  }
  finally {
    if (target != null && !targetSource.isStatic()) {
      // Must have come from TargetSource.
      // 底层的targetSource可能是池化的，这里把对象归还给池子
      targetSource.releaseTarget(target);
    }
    if (setProxyContext) {
      // Restore old proxy.
      AopContext.setCurrentProxy(oldProxy);
    }
  }
}
```

跟前面介绍的动态代理差不多，只是框架生成的，而且加上了一些interceptor的逻辑（AOP Alliance）

### CglibAopProxy

![image-20210310001148937](/image-20210310001148937.png)

获取Proxy的源码：

```java
@Override
public Object getProxy(ClassLoader classLoader) {
  if (logger.isDebugEnabled()) {
    logger.debug("Creating CGLIB proxy: target source is " + this.advised.getTargetSource());
  }

  try {
    Class<?> rootClass = this.advised.getTargetClass();
    Assert.state(rootClass != null, "Target class must be available for creating a CGLIB proxy");

    Class<?> proxySuperClass = rootClass;
    if (ClassUtils.isCglibProxyClass(rootClass)) {
      proxySuperClass = rootClass.getSuperclass();
      Class<?>[] additionalInterfaces = rootClass.getInterfaces();
      for (Class<?> additionalInterface : additionalInterfaces) {
        this.advised.addInterface(additionalInterface);
      }
    }

    // Validate the class, writing log messages as necessary.
    validateClassIfNecessary(proxySuperClass, classLoader);

    // Configure CGLIB Enhancer...
    Enhancer enhancer = createEnhancer();
    if (classLoader != null) {
      enhancer.setClassLoader(classLoader);
      if (classLoader instanceof SmartClassLoader &&
          ((SmartClassLoader) classLoader).isClassReloadable(proxySuperClass)) {
        enhancer.setUseCache(false);
      }
    }
    // 父类
    enhancer.setSuperclass(proxySuperClass);
    // 实现的接口
    enhancer.setInterfaces(AopProxyUtils.completeProxiedInterfaces(this.advised));
    // 代理类的命名规则
    enhancer.setNamingPolicy(SpringNamingPolicy.INSTANCE);
    // 
    enhancer.setStrategy(new ClassLoaderAwareUndeclaredThrowableStrategy(classLoader));
		
    // callback数组，这个顺序要和CallBackFilter对应起来
    Callback[] callbacks = getCallbacks(rootClass);
    // callback的类型
    Class<?>[] types = new Class<?>[callbacks.length];
    for (int x = 0; x < types.length; x++) {
      types[x] = callbacks[x].getClass();
    }
    // fixedInterceptorMap only populated at this point, after getCallbacks call above
    // callback对应的filter，filter的返回值决定了使用哪个下表的Callback
    enhancer.setCallbackFilter(new ProxyCallbackFilter(
      this.advised.getConfigurationOnlyCopy(), this.fixedInterceptorMap, this.fixedInterceptorOffset));
    // callback的类型
    enhancer.setCallbackTypes(types);

    // Generate the proxy class and create a proxy instance.
    // 生成代理类和实例
    return createProxyClassAndInstance(enhancer, callbacks);
  }
  catch (CodeGenerationException ex) {
    throw new AopConfigException("Could not generate CGLIB subclass of class [" +
                                 this.advised.getTargetClass() + "]: " +
                                 "Common causes of this problem include using a final class or a non-visible class",
                                 ex);
  }
  catch (IllegalArgumentException ex) {
    throw new AopConfigException("Could not generate CGLIB subclass of class [" +
                                 this.advised.getTargetClass() + "]: " +
                                 "Common causes of this problem include using a final class or a non-visible class",
                                 ex);
  }
  catch (Exception ex) {
    // TargetSource.getTarget() failed
    throw new AopConfigException("Unexpected AOP exception", ex);
  }
}
```

这里主要关注下Callback和CallbackFilter:

#### Callback

callback里就是拦截的逻辑，spring支持多种，最常用的就是`MethodInterceptor`：

![image-20210310001935402](/image-20210310001935402.png)

```java
// org.springframework.aop.framework.CglibAopProxy#getCallbacks
private Callback[] getCallbacks(Class<?> rootClass) throws Exception {
  // Parameters used for optimisation choices...
  // 是否暴露代理类
  boolean exposeProxy = this.advised.isExposeProxy();
  // 配置是否已经不可改
  boolean isFrozen = this.advised.isFrozen();
  // 是否静态，静态就是每次调用getTarget返回的都是同一个对象，动态就是每次返回的可能不一样
  boolean isStatic = this.advised.getTargetSource().isStatic();

  // Choose an "aop" interceptor (used for AOP calls).
  // 1、最常用的Interceptor
  Callback aopInterceptor = new DynamicAdvisedInterceptor(this.advised);

  // Choose a "straight to target" interceptor. (used for calls that are
  // unadvised but can return this). May be required to expose the proxy.
  // 2、这里区分动态的TargetSource和静态的，动态的比如底层是对象池，每次getTarget()都是不同的对象
  // Dynamic的每次用完还需要releaseTarget
  Callback targetInterceptor;
  if (exposeProxy) {
    targetInterceptor = isStatic ?
      new StaticUnadvisedExposedInterceptor(this.advised.getTargetSource().getTarget()) :
    new DynamicUnadvisedExposedInterceptor(this.advised.getTargetSource());
  }
  else {
    targetInterceptor = isStatic ?
      new StaticUnadvisedInterceptor(this.advised.getTargetSource().getTarget()) :
    new DynamicUnadvisedInterceptor(this.advised.getTargetSource());
  }

  // Choose a "direct to target" dispatcher (used for
  // unadvised calls to static targets that cannot return this).
  // 3. 
  Callback targetDispatcher = isStatic ?
    new StaticDispatcher(this.advised.getTargetSource().getTarget()) : new SerializableNoOp();

  // 主要的几个callback
  Callback[] mainCallbacks = new Callback[] {
    aopInterceptor,  // for normal advice
    targetInterceptor,  // invoke target without considering advice, if optimized
    new SerializableNoOp(),  // no override for methods mapped to this
    targetDispatcher, this.advisedDispatcher,
    new EqualsInterceptor(this.advised),
    new HashCodeInterceptor(this.advised)
  };

  Callback[] callbacks;

  // If the target is a static one and the advice chain is frozen,
  // then we can make some optimisations by sending the AOP calls
  // direct to the target using the fixed chain for that method.
  // 优化逻辑，tldr
  if (isStatic && isFrozen) {
    Method[] methods = rootClass.getMethods();
    Callback[] fixedCallbacks = new Callback[methods.length];
    this.fixedInterceptorMap = new HashMap<String, Integer>(methods.length);

    // TODO: small memory optimisation here (can skip creation for methods with no advice)
    for (int x = 0; x < methods.length; x++) {
      List<Object> chain = this.advised.getInterceptorsAndDynamicInterceptionAdvice(methods[x], rootClass);
      fixedCallbacks[x] = new FixedChainStaticTargetInterceptor(
        chain, this.advised.getTargetSource().getTarget(), this.advised.getTargetClass());
      this.fixedInterceptorMap.put(methods[x].toString(), x);
    }

    // Now copy both the callbacks from mainCallbacks
    // and fixedCallbacks into the callbacks array.
    callbacks = new Callback[mainCallbacks.length + fixedCallbacks.length];
    System.arraycopy(mainCallbacks, 0, callbacks, 0, mainCallbacks.length);
    System.arraycopy(fixedCallbacks, 0, callbacks, mainCallbacks.length, fixedCallbacks.length);
    this.fixedInterceptorOffset = mainCallbacks.length;
  }
  else {
    callbacks = mainCallbacks;
  }
  return callbacks;
}
```

#### CallbackFilter

再看`CallbackFilter`:

> Implementation of CallbackFilter.accept() to return the index of the callback we need.

`CallbackFilter`就是根据调用的方法名称，来dispatch到不同的callback上，从而实现不同方法不同的拦截

```java
// org.springframework.aop.framework.CglibAopProxy.ProxyCallbackFilter#accept
/**
		 * Implementation of CallbackFilter.accept() to return the index of the
		 * callback we need.
		 * <p>The callbacks for each proxy are built up of a set of fixed callbacks
		 * for general use and then a set of callbacks that are specific to a method
		 * for use on static targets with a fixed advice chain.
		 * <p>The callback used is determined thus:
		 * <dl>
		 * <dt>For exposed proxies</dt>
		 * <dd>Exposing the proxy requires code to execute before and after the
		 * method/chain invocation. This means we must use
		 * DynamicAdvisedInterceptor, since all other interceptors can avoid the
		 * need for a try/catch block</dd>
		 * <dt>For Object.finalize():</dt>
		 * <dd>No override for this method is used.</dd>
		 * <dt>For equals():</dt>
		 * <dd>The EqualsInterceptor is used to redirect equals() calls to a
		 * special handler to this proxy.</dd>
		 * <dt>For methods on the Advised class:</dt>
		 * <dd>the AdvisedDispatcher is used to dispatch the call directly to
		 * the target</dd>
		 * <dt>For advised methods:</dt>
		 * <dd>If the target is static and the advice chain is frozen then a
		 * FixedChainStaticTargetInterceptor specific to the method is used to
		 * invoke the advice chain. Otherwise a DynamicAdvisedInterceptor is
		 * used.</dd>
		 * <dt>For non-advised methods:</dt>
		 * <dd>Where it can be determined that the method will not return {@code this}
		 * or when {@code ProxyFactory.getExposeProxy()} returns {@code false},
		 * then a Dispatcher is used. For static targets, the StaticDispatcher is used;
		 * and for dynamic targets, a DynamicUnadvisedInterceptor is used.
		 * If it possible for the method to return {@code this} then a
		 * StaticUnadvisedInterceptor is used for static targets - the
		 * DynamicUnadvisedInterceptor already considers this.</dd>
		 * </dl>
		 */
@Override
public int accept(Method method) {
  // final方法不代理
  if (AopUtils.isFinalizeMethod(method)) {
    logger.trace("Found finalize() method - using NO_OVERRIDE");
    return NO_OVERRIDE;
  }
  // 允许代理类被转为Advised, 且方法是Advised接口声明的
  // 直接走dispatcher，返回对应的Advised
  if (!this.advised.isOpaque() && method.getDeclaringClass().isInterface() &&
      method.getDeclaringClass().isAssignableFrom(Advised.class)) {
    if (logger.isTraceEnabled()) {
      logger.trace("Method is declared on Advised interface: " + method);
    }
    return DISPATCH_ADVISED;
  }
  // We must always proxy equals, to direct calls to this.
  // Equals方法的代理
  if (AopUtils.isEqualsMethod(method)) {
    if (logger.isTraceEnabled()) {
      logger.trace("Found 'equals' method: " + method);
    }
    return INVOKE_EQUALS;
  }
  // We must always calculate hashCode based on the proxy.
  // HashCode方法的代理
  if (AopUtils.isHashCodeMethod(method)) {
    if (logger.isTraceEnabled()) {
      logger.trace("Found 'hashCode' method: " + method);
    }
    return INVOKE_HASHCODE;
  }
  Class<?> targetClass = this.advised.getTargetClass();
  // Proxy is not yet available, but that shouldn't matter.
  List<?> chain = this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass);
  boolean haveAdvice = !chain.isEmpty();
  boolean exposeProxy = this.advised.isExposeProxy();
  boolean isStatic = this.advised.getTargetSource().isStatic();
  boolean isFrozen = this.advised.isFrozen();
  // 有advice，或者配置还能改
  if (haveAdvice || !isFrozen) {
    // If exposing the proxy, then AOP_PROXY must be used.
    if (exposeProxy) {
      if (logger.isTraceEnabled()) {
        logger.trace("Must expose proxy on advised method: " + method);
      }
      return AOP_PROXY;
    }
    String key = method.toString();
    // Check to see if we have fixed interceptor to serve this method.
    // Else use the AOP_PROXY.
    // 优化逻辑，暂时不看
    if (isStatic && isFrozen && this.fixedInterceptorMap.containsKey(key)) {
      if (logger.isTraceEnabled()) {
        logger.trace("Method has advice and optimizations are enabled: " + method);
      }
      // We know that we are optimizing so we can use the FixedStaticChainInterceptors.
      int index = this.fixedInterceptorMap.get(key);
      return (index + this.fixedInterceptorOffset);
    }
    else {
      if (logger.isTraceEnabled()) {
        logger.trace("Unable to apply any optimizations to advised method: " + method);
      }
      return AOP_PROXY;
    }
  }
  else {
    // See if the return type of the method is outside the class hierarchy of the target type.
    // If so we know it never needs to have return type massage and can use a dispatcher.
    // If the proxy is being exposed, then must use the interceptor the correct one is already
    // configured. If the target is not static, then we cannot use a dispatcher because the
    // target needs to be explicitly released after the invocation.
    if (exposeProxy || !isStatic) {
      return INVOKE_TARGET;
    }
    Class<?> returnType = method.getReturnType();
    if (targetClass != null && returnType.isAssignableFrom(targetClass)) {
      if (logger.isTraceEnabled()) {
        logger.trace("Method return type is assignable from target type and " +
                     "may therefore return 'this' - using INVOKE_TARGET: " + method);
      }
      return INVOKE_TARGET;
    }
    else {
      if (logger.isTraceEnabled()) {
        logger.trace("Method return type ensures 'this' cannot be returned - " +
                     "using DISPATCH_TARGET: " + method);
      }
      return DISPATCH_TARGET;
    }
  }
}
```

![image-20210309202927411](/image-20210309202927411.png)


#### 再看AdvisedDispatcher

`AdvisedDispatcher`每次返回的都是`AdvisedSupport`:

```java
// org.springframework.aop.framework.CglibAopProxy.AdvisedDispatcher
/**  
	 * Dispatcher for any methods declared on the Advised class.
	 */
private static class AdvisedDispatcher implements Dispatcher, Serializable {

  private final AdvisedSupport advised;

  public AdvisedDispatcher(AdvisedSupport advised) {
    this.advised = advised;
  }

  // 每次方法调用都会走这里
  @Override
  public Object loadObject() throws Exception {
    return this.advised;
  }
}

// org.springframework.aop.framework.CglibAopProxy.StaticDispatcher
/**
	 * Dispatcher for a static target. Dispatcher is much faster than
	 * interceptor. This will be used whenever it can be determined that a
	 * method definitely does not return "this"
	 */
private static class StaticDispatcher implements Dispatcher, Serializable {

  private Object target;

  public StaticDispatcher(Object target) {
    this.target = target;
  }

  @Override
  public Object loadObject() {
    return this.target;
  }
}
```

可以将代理对象转成Advised，测试代码：

```java
@Test
public void testCastToAdvised() {
  AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(AopConfig.class);
  final Foo foo = context.getBean(Foo.class);
  log.info("foo class is {}", foo.getClass()
           .getSimpleName());
  foo.hello1();
  foo.hello2();
  final Advised advised = (Advised)foo;
  log.info("advised {}", Arrays.toString(advised.getAdvisors()));
}
```

输出：

```bash
2021-03-10 01:04:34.103[main][INFO ]o.s.c.a.AnnotationConfigApplicationContext.prepareRefresh:582 Refreshing org.springframework.context.annotation.AnnotationConfigApplicationContext@5f2108b5: startup date [Wed Mar 10 01:04:34 CST 2021]; root of context hierarchy
2021-03-10 01:04:34.576[main][INFO ]c.a.s.a.Foo.init:22 init foo
2021-03-10 01:04:34.730[main][INFO ]c.a.s.a.AopTest.testCastToAdvised:55 foo class is Foo$$EnhancerBySpringCGLIB$$ce661b8a
2021-03-10 01:04:34.744[main][INFO ]c.a.s.a.Foo.hello1:26 hello1
2021-03-10 01:04:34.745[main][INFO ]c.a.s.a.PerformanceTraceAspect.tracePerformance:31 hello1 total cost 9 ms
2021-03-10 01:04:34.745[main][INFO ]c.a.s.a.Foo.hello2:30 hello2
2021-03-10 01:04:34.756[main][INFO ]c.a.s.a.HelloImpl.sayHello:15 haha
2021-03-10 01:04:34.756[main][INFO ]c.a.s.a.PerformanceTraceAspect.tracePerformance:31 hello2 total cost 11 ms
2021-03-10 01:04:34.757[main][INFO ]c.a.s.a.AopTest.testCastToAdvised:60 advised [org.springframework.aop.interceptor.ExposeInvocationInterceptor.ADVISOR, InstantiationModelAwarePointcutAdvisor: expression [pointCut()]; advice method [public java.lang.Object com.air.spring.aop.PerformanceTraceAspect.tracePerformance(org.aspectj.lang.ProceedingJoinPoint) throws java.lang.Throwable]; perClauseKind=SINGLETON]
```

![image-20210310011207987](/image-20210310011207987.png)

## AOP的用途

aop在spring中的用途非常广泛，比如注解事务的实现、Lazy初始化的实现等等。这里看几个简单的例子。

### @Lazy实现

lazy初始化的，也是生成了代理类，在实际调用方法时才会去做初始化。

```java
// org.springframework.context.annotation.CommonAnnotationBeanPostProcessor#buildLazyResourceProxy
/**
	 * Obtain a lazily resolving resource proxy for the given name and type,
	 * delegating to {@link #getResource} on demand once a method call comes in.
	 * @param element the descriptor for the annotated field/method
	 * @param requestingBeanName the name of the requesting bean
	 * @return the resource object (never {@code null})
	 * @since 4.2
	 * @see #getResource
	 * @see Lazy
	 */
	protected Object buildLazyResourceProxy(final LookupElement element, final String requestingBeanName) {
    // 匿名的TargetSource
    TargetSource ts = new TargetSource() {
      @Override
      public Class<?> getTargetClass() {
        return element.lookupType;
      }
      @Override
      public boolean isStatic() {
        return false;
      }
      @Override
      public Object getTarget() {
        // 这里实际去加载对应的类
        return getResource(element, requestingBeanName);
      }
      @Override
      public void releaseTarget(Object target) {
      }
    };
    
    // 生成代理类
    ProxyFactory pf = new ProxyFactory();
    pf.setTargetSource(ts);
    if (element.lookupType.isInterface()) {
      pf.addInterface(element.lookupType);
    }
    ClassLoader classLoader = (this.beanFactory instanceof ConfigurableBeanFactory ?
                               ((ConfigurableBeanFactory) this.beanFactory).getBeanClassLoader() : null);
    return pf.getProxy(classLoader);
  }
```

### Config配置类代理

有的系统有些祖传代码，写成这样：

```java
@Configuration
public class AppConfig {
  
  @Bean
  public HuiPingDataSourceIdsBean getHuiPingDataSourceIdsBean() {
    return new HuiPingDataSourceIdsBean();
  }
}
```

声明看起来是没有问题的，使用的代码：

```java
 String dataSourceId = appConfig.getHuiPingDataSourceIdsBean().getDataSourceId();
```

那么这个`HuiPingDataSourceIdsBean` 会创建多次吗？答案是并不会，原因就是这个方法被代理了。

```java
// org.springframework.context.annotation.ConfigurationClassPostProcessor#enhanceConfigurationClasses
	/**
	 * Post-processes a BeanFactory in search of Configuration class BeanDefinitions;
	 * any candidates are then enhanced by a {@link ConfigurationClassEnhancer}.
	 * Candidate status is determined by BeanDefinition attribute metadata.
	 * @see ConfigurationClassEnhancer
	 */
public void enhanceConfigurationClasses(ConfigurableListableBeanFactory beanFactory) {
  Map<String, AbstractBeanDefinition> configBeanDefs = new LinkedHashMap<String, AbstractBeanDefinition>();
  // 遍历当前的bean
  for (String beanName : beanFactory.getBeanDefinitionNames()) {
    BeanDefinition beanDef = beanFactory.getBeanDefinition(beanName);
    // 如果是full Configuration的标记了@Configuration
    if (ConfigurationClassUtils.isFullConfigurationClass(beanDef)) {
      if (!(beanDef instanceof AbstractBeanDefinition)) {
        throw new BeanDefinitionStoreException("Cannot enhance @Configuration bean definition '" +
                                               beanName + "' since it is not stored in an AbstractBeanDefinition subclass");
      }
      else if (logger.isWarnEnabled() && beanFactory.containsSingleton(beanName)) {
        logger.warn("Cannot enhance @Configuration bean definition '" + beanName +
                    "' since its singleton instance has been created too early. The typical cause " +
                    "is a non-static @Bean method with a BeanDefinitionRegistryPostProcessor " +
                    "return type: Consider declaring such methods as 'static'.");
      }
      // 加入到待处理集合
      configBeanDefs.put(beanName, (AbstractBeanDefinition) beanDef);
    }
  }
  
  if (configBeanDefs.isEmpty()) {
    // nothing to enhance -> return immediately
    return;
  }
  // 这里出现了enhancer，内部是cglib的enhancer
  ConfigurationClassEnhancer enhancer = new ConfigurationClassEnhancer();
  for (Map.Entry<String, AbstractBeanDefinition> entry : configBeanDefs.entrySet()) {
    AbstractBeanDefinition beanDef = entry.getValue();
    // If a @Configuration class gets proxied, always proxy the target class
    beanDef.setAttribute(AutoProxyUtils.PRESERVE_TARGET_CLASS_ATTRIBUTE, Boolean.TRUE);
    try {
      // Set enhanced subclass of the user-specified bean class
      Class<?> configClass = beanDef.resolveBeanClass(this.beanClassLoader);
      // 生成增强类
      Class<?> enhancedClass = enhancer.enhance(configClass, this.beanClassLoader);
      if (configClass != enhancedClass) {
        if (logger.isDebugEnabled()) {
          logger.debug(String.format("Replacing bean definition '%s' existing class '%s' with " +
                                     "enhanced class '%s'", entry.getKey(), configClass.getName(), enhancedClass.getName()));
        }
        // 替换为增强类
        beanDef.setBeanClass(enhancedClass);
      }
    }
    catch (Throwable ex) {
      throw new IllegalStateException("Cannot load configuration class: " + beanDef.getBeanClassName(), ex);
    }
  }
}
```

测试代码：

```java
@Test
public void testConfigurationProxy() {
  AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(AopConfig.class);
  final AopConfig aopConfig = context.getBean(AopConfig.class);
  log.info("aopConfig class = {}", aopConfig.getClass());
}
```

输出：

```bash
2021-03-09 16:04:16.978[main][INFO ]c.a.s.a.AopTest.testConfigurationProxy:132 aopConfig class = class com.air.spring.aop.AopConfig$$EnhancerBySpringCGLIB$$b88034a1
```



## 参考

- [实战CGLib系列之proxy篇(二)：回调过滤CallbackFilter - mn_1127的个人空间 - OSCHINA - 中文开源技术交流社区](https://my.oschina.net/mn1127/blog/649006?p=1)
- [死磕cglib系列之一 cglib简介与callback解析_zhang6622056的专栏-CSDN博客](https://blog.csdn.net/zhang6622056/article/details/87286498)

