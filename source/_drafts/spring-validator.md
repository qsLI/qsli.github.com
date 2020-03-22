title: spring-validator源码分析
toc: true
tags: spring-validator

category: spring
---



# JSR-303和JSR-349

`jsr-303`是



## 配置

```java
//javax.validation.Configuration
/**
 * <p/>
 * By default, the configuration information is retrieved from
 * {@code META-INF/validation.xml}.
 * It is possible to override the configuration retrieved from the XML file
 * by using one or more of the {@code Configuration} methods.
 * <p/>
 **/
```

配置示例：

```xml
<validation-config xmlns="http://jboss.org/xml/ns/javax/validation/configuration"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://jboss.org/xml/ns/javax/validation/configuration">
    <default-provider>org.hibernate.validator.HibernateValidator</default-provider>
    <message-interpolator>org.hibernate.validator.engine.ResourceBundleMessageInterpolator</message-interpolator>
    <traversable-resolver>org.hibernate.validator.engine.resolver.DefaultTraversableResolver</traversable-resolver>
    <constraint-validator-factory>org.hibernate.validator.engine.ConstraintValidatorFactoryImpl</constraint-validator-factory>
    <constraint-mapping>/constraints-car.xml</constraint-mapping>
    <property name="prop1">value1</property>
    <property name="prop2">value2</property>
</validation-config>
```

同样的, 这
些配置信息也可以通过编程的方式调用`javax.validation.Configuration`来实现. 另外, 你可以通过
API的方式来重写xml中的配置信息, 也可以通过调用 `Configuration.ignoreXmlConfiguration()`来完
全的忽略掉xml的配置信息. 

## 第一种启动方式：

```java
ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
```

这种情况下， validator的提供是通过：

```
 /**
 * The chosen provider is defined as followed:
 *     <ul>
 *         <li>if the XML configuration defines a provider, this provider is used</li>
 *         <li>if the XML configuration does not define a provider or if no XML
 *         configuration is present the first provider returned by the
 *         {@link ValidationProviderResolver} instance is used.</li>
 *     </ul>
 **/
```



## 第二种启动方式：

```java
Configuration<?> configuration = Validation
                                .byDefaultProvider()
                                .providerResolver( new MyResolverStrategy() )
                                .configure();
ValidatorFactory factory = configuration.buildValidatorFactory();
```

可以配置一个自定义的`provider resolver`

## 第三种启动方式

```java
  ACMEConfiguration configuration = Validation
     .byProvider(ACMEProvider.class)
     .providerResolver( new MyResolverStrategy() )  // optionally set the provider resolver
     .configure();
  ValidatorFactory factory = configuration.buildValidatorFactory();
```



## DefaultValidationProviderResolver

```java
	/**
	 * Finds {@link ValidationProvider} according to the default {@link ValidationProviderResolver} defined in the
	 * Bean Validation specification. This implementation first uses thread's context classloader to locate providers.
	 * If no suitable provider is found using the aforementioned class loader, it uses current class loader.
	 * If it still does not find any suitable provider, it tries to locate the built-in provider using the current
	 * class loader.
	 *
	 * @author Emmanuel Bernard
	 * @author Hardy Ferentschik
	 */
	private static class DefaultValidationProviderResolver implements ValidationProviderResolver {
		public List<ValidationProvider<?>> getValidationProviders() {
			// class loading and ServiceLoader methods should happen in a PrivilegedAction
			return GetValidationProviderListAction.getValidationProviderList();
		}
	}
```

默认的策略是先从thread's context class loader 中加载`SPI`接口`ValidationProvider`对应的实现，如果没有加载到，就从`DefaultValidationProviderResolver`对应的classloader中加载。

> if we cannot find any service files with the context class loader use the current class loader



```java
public List<ValidationProvider<?>> run() {
   // Option #1: try first context class loader
   //从contextClassLoader中加载
   ClassLoader classloader = Thread.currentThread().getContextClassLoader();
   List<ValidationProvider<?>> cachedContextClassLoaderProviderList = getCachedValidationProviders( classloader );
   if ( cachedContextClassLoaderProviderList != null ) {
      // if already processed return the cached provider list
      return cachedContextClassLoaderProviderList;
   }
   List<ValidationProvider<?>> validationProviderList = loadProviders( classloader );

   
   // Option #2: if we cannot find any service files with the context class loader use the current class loader
   //
   //
   //
   //
    if ( validationProviderList.isEmpty() ) {
      // 从当前class的加载器加载
      classloader = DefaultValidationProviderResolver.class.getClassLoader();
      List<ValidationProvider<?>> cachedCurrentClassLoaderProviderList = getCachedValidationProviders(
            classloader
      );
      if ( cachedCurrentClassLoaderProviderList != null ) {
         // if already processed return the cached provider list
         return cachedCurrentClassLoaderProviderList;
      }
      validationProviderList = loadProviders( classloader );
   }

   // cache the detected providers against the classloader in which they were found
   cacheValidationProviders( classloader, validationProviderList );

   return validationProviderList;
}
```

至于`loadProviders`就是加载`SPI`的实现：

```java
private List<ValidationProvider<?>> loadProviders(ClassLoader classloader) {
    ServiceLoader<ValidationProvider> loader = ServiceLoader.load( ValidationProvider.class, classloader );
    Iterator<ValidationProvider> providerIterator = loader.iterator();
    List<ValidationProvider<?>> validationProviderList = new ArrayList<ValidationProvider<?>>();
    while ( providerIterator.hasNext() ) {
        try {
            validationProviderList.add( providerIterator.next() );
        }
        catch ( ServiceConfigurationError e ) {
            // ignore, because it can happen when multiple
            // providers are present and some of them are not class loader
            // compatible with our API.
        }
    }
    return validationProviderList;
}
```



## 校验方法

```java
/**
 * Validates parameters and return values of methods and constructors.
 * Implementations of this interface must be thread-safe.
 *
 * @author Gunnar Morling
 * @since 1.1
 */
public interface ExecutableValidator {
}
```

# Hibernate-Validator

先从`SPI`入手，找到 jar包下的`META-INF/services/javax.validation.spi.ValidationProvider`声明具体的实现类。

```
org.hibernate.validator.HibernateValidator
```



## 版本升级的坑



# Spring集成



org.springframework.boot.autoconfigure.BackgroundPreinitializer



### org.springframework.boot.context.properties.ConfigurationPropertiesBindingPostProcessor

```java
	/**
	 * The bean name of the configuration properties validator.
	 */
	public static final String VALIDATOR_BEAN_NAME = "configurationPropertiesValidator";

	// ******** 实现了BeanPostProcessor接口
	@Override
	public Object postProcessBeforeInitialization(Object bean, String beanName)
			throws BeansException {
		ConfigurationProperties annotation = getAnnotation(bean, beanName,
				ConfigurationProperties.class);
		if (annotation != null) {
			bind(bean, beanName, annotation);
		}
		return bean;
	}

	// ******** 初始化的时候从对应的配置中配置validator
	private void bind(Object bean, String beanName, ConfigurationProperties annotation) {
		ResolvableType type = getBeanType(bean, beanName);
		Validated validated = getAnnotation(bean, beanName, Validated.class);
		Annotation[] annotations = (validated == null ? new Annotation[] { annotation }
				: new Annotation[] { annotation, validated });
		Bindable<?> target = Bindable.of(type).withExistingValue(bean)
				.withAnnotations(annotations);
		try {
			this.configurationPropertiesBinder.bind(target);
		}
		catch (Exception ex) {
            // 校验失败的异常抛出到此处
			throw new ConfigurationPropertiesBindException(beanName, bean, annotation,
					ex);
		}
	}



//org.springframework.boot.context.properties.ConfigurationPropertiesBindingPostProcessor#afterPropertiesSet
@Override
public void afterPropertiesSet() throws Exception {
    // We can't use constructor injection of the application context because
    // it causes eager factory bean initialization
    this.beanFactoryMetadata = this.applicationContext.getBean(
        ConfigurationBeanFactoryMetadata.BEAN_NAME,
        ConfigurationBeanFactoryMetadata.class);
    this.configurationPropertiesBinder = new ConfigurationPropertiesBinder(
        this.applicationContext, VALIDATOR_BEAN_NAME);
}
```



#### org.springframework.boot.context.properties.ConfigurationProperties

> Annotation for externalized configuration. Add this to a class definition or a {@code @Bean} method in a {@code @Configuration} class if you want to bind and validate some external Properties (e.g. from a .properties file). Note that contrary to {@code @Value}, SpEL expressions are not evaluated since property  values are externalized.



#### org.springframework.boot.context.properties.ConfigurationPropertiesBinder

```java
	public void bind(Bindable<?> target) {
		ConfigurationProperties annotation = target
				.getAnnotation(ConfigurationProperties.class);
		Assert.state(annotation != null, "Missing @ConfigurationProperties on " + target);
		List<Validator> validators = getValidators(target);
        // 获取的是ValidationBindHandler
		BindHandler bindHandler = getBindHandler(annotation, validators);
        // bind是有返回值的，这里没有取
		getBinder().bind(annotation.prefix(), target, bindHandler);
	}

private List<Validator> getValidators(Bindable<?> target) {
		List<Validator> validators = new ArrayList<>(3);
		if (this.configurationPropertiesValidator != null) {
			validators.add(this.configurationPropertiesValidator);
		}
		if (this.jsr303Validator != null
				&& target.getAnnotation(Validated.class) != null) {
			validators.add(this.jsr303Validator);
		}
		if (target.getValue() != null && target.getValue().get() instanceof Validator) {
			validators.add((Validator) target.getValue().get());
		}
		return validators;
	}
```





##### org.springframework.boot.context.properties.bind.BindHandler

```java
/**
 * Callback interface that can be used to handle additional logic during element
 * {@link Binder binding}.
 *
 * @author Phillip Webb
 * @author Madhura Bhave
 * @since 2.0.0
 */
public interface BindHandler {
}
```

实现类似回调的东西，定义了下面几个函数

```java
onStart
onSuccess
onFailure
onFinish
DEFAULT
```



##### org.springframework.boot.context.properties.bind.validation.ValidationBindHandler

```java
private void validate(ConfigurationPropertyName name, Object target, Class<?> type) {
		if (target != null) {
			BindingResult errors = new BeanPropertyBindingResult(target, name.toString());
			Arrays.stream(this.validators).filter((validator) -> validator.supports(type))
					.forEach((validator) -> validator.validate(target, errors));
			if (errors.hasErrors()) {
				this.exceptions.push(getBindValidationException(name, errors));
			}
		}
	}

	private BindValidationException getBindValidationException(
			ConfigurationPropertyName name, BindingResult errors) {
		Set<ConfigurationProperty> boundProperties = this.boundProperties.stream()
				.filter((property) -> name.isAncestorOf(property.getName()))
				.collect(Collectors.toCollection(LinkedHashSet::new));
		ValidationErrors validationErrors = new ValidationErrors(name, boundProperties,
				errors.getAllErrors());
		return new BindValidationException(validationErrors);
	}
```

![image-20180929024048202](/image-20180929024048202.png)



##### org.springframework.boot.context.properties.bind.Binder

```java
/**
	 * Bind the specified target {@link Bindable} using this binders
	 * {@link ConfigurationPropertySource property sources}.
	 * @param name the configuration property name to bind
	 * @param target the target bindable
	 * @param handler the bind handler (may be {@code null})
	 * @param <T> the bound type
	 * @return the binding result (never {@code null})
	 */
	public <T> BindResult<T> bind(ConfigurationPropertyName name, Bindable<T> target,
			BindHandler handler) {
		Assert.notNull(name, "Name must not be null");
		Assert.notNull(target, "Target must not be null");
		handler = (handler != null ? handler : BindHandler.DEFAULT);
		Context context = new Context();
		T bound = bind(name, target, handler, context, false);
		return BindResult.of(bound);
	}

	protected final <T> T bind(ConfigurationPropertyName name, Bindable<T> target,
			BindHandler handler, Context context, boolean allowRecursiveBinding) {
		context.clearConfigurationProperty();
		try {
			if (!handler.onStart(name, target, context)) {
				return null;
			}
			Object bound = bindObject(name, target, handler, context,
					allowRecursiveBinding);
			return handleBindResult(name, target, handler, context, bound);
		}
		catch (Exception ex) {
            //校验失败走到这里，
			return handleBindError(name, target, handler, context, ex);
		}
	}

private <T> T handleBindResult(ConfigurationPropertyName name, Bindable<T> target,
			BindHandler handler, Context context, Object result) throws Exception {
		if (result != null) {
			result = handler.onSuccess(name, target, context, result);
			result = context.getConverter().convert(result, target);
		}
    	// *********  validationHandler 调用validator进行校验，如果失败抛出异常
		handler.onFinish(name, target, context, result);
		return context.getConverter().convert(result, target);
	}
```









### org.springframework.validation.beanvalidation.**MethodValidationPostProcessor**

```java
/** 
 * A convenient {@link BeanPostProcessor} implementation that delegates to a
 * JSR-303 provider for performing method-level validation on annotated methods.
 * <p>Target classes with such annotated methods need to be annotated with Spring's
 * {@link Validated} annotation at the type level, for their methods to be searched for
 * inline constraint annotations. Validation groups can be specified through {@code @Validated}
 * as well. By default, JSR-303 will validate against its default group only.
 *
 **/

/**
	 * Set the JSR-303 Validator to delegate to for validating methods.
	 * <p>Default is the default ValidatorFactory's default Validator.
	 */
	public void setValidator(Validator validator) {
		// Unwrap to the native Validator with forExecutables support
		if (validator instanceof LocalValidatorFactoryBean) {
			this.validator = ((LocalValidatorFactoryBean) validator).getValidator();
		}
		else if (validator instanceof SpringValidatorAdapter) {
			this.validator = validator.unwrap(Validator.class);
		}
		else {
			this.validator = validator;
		}
	}

/**
	 * Set the JSR-303 ValidatorFactory to delegate to for validating methods,
	 * using its default Validator.
	 * <p>Default is the default ValidatorFactory's default Validator.
	 * @see javax.validation.ValidatorFactory#getValidator()
	 */
	public void setValidatorFactory(ValidatorFactory validatorFactory) {
		this.validator = validatorFactory.getValidator();
	}


	@Override
	public void afterPropertiesSet() {
		Pointcut pointcut = new AnnotationMatchingPointcut(this.validatedAnnotationType, true);
		// 修改父类的一个属性，并没有重载BeanPostProcessor的方法， 父类自动使用advisor做切面
        this.advisor = new DefaultPointcutAdvisor(pointcut, createMethodValidationAdvice(this.validator));
	}

/**
	 * Create AOP advice for method validation purposes, to be applied
	 * with a pointcut for the specified 'validated' annotation.
	 * @param validator the JSR-303 Validator to delegate to
	 * @return the interceptor to use (typically, but not necessarily,
	 * a {@link MethodValidationInterceptor} or subclass thereof)
	 * @since 4.2
	 */
	protected Advice createMethodValidationAdvice(@Nullable Validator validator) {
        // ******** 创建切面的时候需要validator
		return (validator != null ? new MethodValidationInterceptor(validator) : new MethodValidationInterceptor());
	}

```



> Target classes with such annotated methods **need to be annotated with Spring's{@link Validated} annotation at the type level**, for their methods to be searched for inline constraint annotations. 

#### org.springframework.validation.beanvalidation.SpringValidatorAdapter

```java
// org.springframework.boot.autoconfigure.validation.ValidationAutoConfiguration#methodValidationPostProcessor
	@Bean
	@ConditionalOnMissingBean
	public static MethodValidationPostProcessor methodValidationPostProcessor(
			Environment environment, @Lazy Validator validator) {
		MethodValidationPostProcessor processor = new MethodValidationPostProcessor();
		boolean proxyTargetClass = environment
				.getProperty("spring.aop.proxy-target-class", Boolean.class, true);
		processor.setProxyTargetClass(proxyTargetClass);
		processor.setValidator(validator);
		return processor;
	}
```

#### org.springframework.validation.beanvalidation.MethodValidationInterceptor

```java
public @NotNull Object myValidMethod(@NotNull String arg1, @Max(10) int arg2)
```

`org.springframework.validation.beanvalidation.MethodValidationPostProcessor`是`BeanPostProcessor`， 它会扫描方法上的validation相关的注解，并生成一个切面拦截`MethodValidationInterceptor`，实际的工作都是在`MethodValidationInterceptor`中委托给`JSR-303`的validator的

```java
 public @NotNull Object myValidMethod(@NotNull String arg1, @Max(10) int arg2)
```



```
javax.validation.ConstraintViolationException: issueCouponByDiscountTypeId.arg0[0].operatorId: 无效的操作员Id, issueCouponByDiscountTypeId.arg0[0].couponCode: 无效的券码
	at org.springframework.validation.beanvalidation.MethodValidationInterceptor.invoke(MethodValidationInterceptor.java:109)
	at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:185)
	at org.springframework.aop.framework.CglibAopProxy$DynamicAdvisedInterceptor.intercept(CglibAopProxy.java:689)
	at com.atour.user.web.controller.coupon.CouponController$$EnhancerBySpringCGLIB$$e7856d87.issueCouponByDiscountTypeId(<generated>)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:209)
	at org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:136)
	at org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:102)
	at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod(RequestMappingHandlerAdapter.java:870)
	at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:776)
	at org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:87)
	at org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:991)
	at org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:925)
	at org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:978)
	at org.springframework.web.servlet.FrameworkServlet.doPost(FrameworkServlet.java:881)
	at javax.servlet.http.HttpServlet.service(HttpServlet.java:661)
	at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:855)
	at javax.servlet.http.HttpServlet.service(HttpServlet.java:742)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:231)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:166)
	at org.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:52)
	at org.apache.catalina.core.ApplicationFilterChain.inte
```



### org.springframework.web.method.annotation.**ModelAttributeMethodProcessor**#validateIfApplicable  --> @ModelAttribute

```java
@RequestMapping(value = "/addEmployee", method = RequestMethod.POST)
public String submit(@ModelAttribute("employee") Employee employee) {
    // Code that uses the employee object
 
    return "employeeView";
}
```

也需要bind

org.springframework.web.servlet.mvc.method.annotation.**AbstractMessageConverterMethodArgumentResolver**#validateIfApplicable

```java
//
/**
	 * Validate the binding target if applicable.
	 * <p>The default implementation checks for {@code @javax.validation.Valid},
	 * Spring's {@link org.springframework.validation.annotation.Validated},
	 * and custom annotations whose name starts with "Valid".
	 * @param binder the DataBinder to be used
	 * @param parameter the method parameter descriptor
	 * @since 4.1.5
	 * @see #isBindExceptionRequired
	 */
protected void validateIfApplicable(WebDataBinder binder, MethodParameter parameter) {
		Annotation[] annotations = parameter.getParameterAnnotations();
		for (Annotation ann : annotations) {
			Validated validatedAnn = AnnotationUtils.getAnnotation(ann, Validated.class);
			if (validatedAnn != null || ann.annotationType().getSimpleName().startsWith("Valid")) {
				Object hints = (validatedAnn != null ? validatedAnn.value() : AnnotationUtils.getValue(ann));
				Object[] validationHints = (hints instanceof Object[] ? (Object[]) hints : new Object[] {hints});
				binder.validate(validationHints);
				break;
			}
		}
	}
```

**org.springframework.validation.beanvalidation.LocalValidatorFactoryBean**

负责初始化工作



在spring的controller中可以初始化validator，这个**应该只能用于当前的controller**

```java
@InitBinder
protected void initBinder(WebDataBinder binder) {
    final LocalValidatorFactoryBean localValidatorFactoryBean = new LocalValidatorFactoryBean();
    localValidatorFactoryBean.setProviderClass(HibernateValidator.class);
    binder.setValidator(localValidatorFactoryBean);
}
```

也可以在`org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport`，这个配置是**全局**的。

```java
// org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport#mvcValidator
/**
* Return a global {@link Validator} instance for example for validating
* {@code @ModelAttribute} and {@code @RequestBody} method arguments.
* Delegates to {@link #getValidator()} first and if that returns {@code null}
* checks the classpath for the presence of a JSR-303 implementations
* before creating a {@code OptionalValidatorFactoryBean}.If a JSR-303
* implementation is not available, a no-op {@link Validator} is returned.
*/
@Bean
public Validator mvcValidator() {
    Validator validator = getValidator();
    if (validator == null) {
        if (ClassUtils.isPresent("javax.validation.Validator", getClass().getClassLoader())) {
            Class<?> clazz;
            try {
                String className = "org.springframework.validation.beanvalidation.OptionalValidatorFactoryBean";
                clazz = ClassUtils.forName(className, WebMvcConfigurationSupport.class.getClassLoader());
            }
            catch (ClassNotFoundException | LinkageError ex) {
                throw new BeanInitializationException("Failed to resolve default validator class", ex);
            }
            validator = (Validator) BeanUtils.instantiateClass(clazz);
        }
        else {
            validator = new NoOpValidator();
        }
    }
    return validator;
}

/**
	 * Override this method to provide a custom {@link Validator}.
	 */
@Nullable
protected Validator getValidator() {
    return null;
}
```

子类可以继承`WebMvcConfigurationSupport`并覆写`getValidator`方法

```java
@Override
protected Validator getValidator() {
    LocalValidatorFactoryBean localValidatorFactoryBean = new LocalValidatorFactoryBean();
    localValidatorFactoryBean.setProviderClass(HibernateValidator.class);
    MessageInterpolatorFactory interpolatorFactory = new MessageInterpolatorFactory();
    localValidatorFactoryBean.setMessageInterpolator(interpolatorFactory.getObject());
    return localValidatorFactoryBean;
}
```






# 参考

- [详解Bean Validation - 阅读的伟哥的个人空间 - 开源中国](https://my.oschina.net/u/3211616/blog/821343)
- [JSR303、349 -Bean Validation 数据校验规范使用说明和验证流程源码分析 - zzuqiang的个人空间 - 开源中国](https://my.oschina.net/zzuqiang/blog/761862)
- [Hibernate Validator](http://docs.jboss.org/hibernate/validator/4.2/reference/zh-CN/html_single/)
- [java - Tomcat classloading doesn't seem to behave as documented - Stack Overflow](https://stackoverflow.com/questions/7337046/tomcat-classloading-doesnt-seem-to-behave-as-documented)

