---
title: Spring中bean name重复的问题
tags: spring-bean
category: spring
toc: true
typora-root-url: Spring中bean name重复的问题
typora-copy-images-to: Spring中bean name重复的问题
date: 2020-04-29 13:10:58
---



## 现象

```bash
org.apache.ibatis.binding.BindingException: Invalid bound statement (not found): com.atour.oss.dao.mapper.OssFileMapper.insert

	at org.apache.ibatis.binding.MapperMethod$SqlCommand.<init>(MapperMethod.java:227)
	at org.apache.ibatis.binding.MapperMethod.<init>(MapperMethod.java:49)
	at org.apache.ibatis.binding.MapperProxy.cachedMapperMethod(MapperProxy.java:65)
	at org.apache.ibatis.binding.MapperProxy.invoke(MapperProxy.java:58)
	at com.sun.proxy.$Proxy188.insert(Unknown Source)
```

一个同事新加了一个数据源，然后老的数据源居然报错了，他说没有改动老的。翻了下代码，最后发现是**不加思索地复制粘贴**埋的坑，老的代码：

```java
@Configuration
@MapperScan(basePackages = MapperConfig.PACKAGE, sqlSessionFactoryRef = "sessionFactory")
public class MapperConfig {

    /**
     * 包目录
     */
    static final String PACKAGE = "com.atour.oss.dao.mapper";

    /**
     * 类目录
     */
    private static final String TYPE_ALIASES_PACKAGE = "com.atour.oss.dao.entity";

    /**
     * mapper所在目录
     */
    private static final String MAPPER_LOCATION = "classpath*:mapper/oss/*.xml";

    /**
     * 参数配置
     *
     * @param dataSource 数据库信息
     * @param resource   配置文件
     * @return SqlSessionFactory
     */
    @Bean(name = "sessionFactory")
    @Primary
    public SqlSessionFactory invitationSessionFactory(@Qualifier("dataSource") DataSource dataSource,
        @Qualifier("mybatisConf") Resource resource) throws Exception {
        final SqlSessionFactoryBean sqlSessionFactoryBean = new SqlSessionFactoryBean();
        sqlSessionFactoryBean.setDataSource(dataSource);
        Resource[] mapperLocations = new PathMatchingResourcePatternResolver().getResources(MAPPER_LOCATION);
        sqlSessionFactoryBean.setMapperLocations(mapperLocations);
        sqlSessionFactoryBean.setConfigLocation(resource);
        sqlSessionFactoryBean.setTypeAliasesPackage(TYPE_ALIASES_PACKAGE);
        return sqlSessionFactoryBean.getObject();
    }
}
```

新加的代码:

```java
@Configuration
@MapperScan(basePackages = NoticeIntelligenceMapperConfig.PACKAGE, sqlSessionFactoryRef = "sessionFactory")
public class NoticeIntelligenceMapperConfig {

    /**
     * 包目录
     */
    static final String PACKAGE = "com.atour.noticeIntelligence.dao.mapper";

    /**
     * 类目录
     */
    private static final String TYPE_ALIASES_PACKAGE = "com.atour.noticeIntelligence.dao.entity";

    /**
     * mapper所在目录
     */
    private static final String MAPPER_LOCATION = "classpath*:mapper/noticeIntelligence/*Mapper.xml";

    /**
     * 参数配置
     *
     * @param dataSource 数据库信息
     * @param resource   配置文件
     * @return SqlSessionFactory
     */
    @Bean(name = "sessionFactory")
    @Primary
    public SqlSessionFactory invitationSessionFactory(@Qualifier("dataSource") DataSource dataSource,
        @Qualifier("mybatisConf") Resource resource) throws Exception {
        final SqlSessionFactoryBean sqlSessionFactoryBean = new SqlSessionFactoryBean();
        sqlSessionFactoryBean.setDataSource(dataSource);
        Resource[] mapperLocations = new PathMatchingResourcePatternResolver().getResources(MAPPER_LOCATION);
        sqlSessionFactoryBean.setMapperLocations(mapperLocations);
        sqlSessionFactoryBean.setConfigLocation(resource);
        sqlSessionFactoryBean.setTypeAliasesPackage(TYPE_ALIASES_PACKAGE);
        return sqlSessionFactoryBean.getObject();
    }

}
```

注意看bean的名字，完全一模一样！！！😂，目测spring在查找引用的时候错乱了。值得注意的是，俩bean还都标记上了`@Primary`。

## @Primary

>  	No matter how you designate a primary bean, the effect is the same. You’re telling
>
> Spring that it should choose the primary bean in the case of ambiguity.
>
> 
>
>  	This works well right up to the point where you designate two or more primary
>
> beans.
>
>  	Now there are two primary Dessert beans: Cake and IceCream. This poses a new ambi
>
> guity issue. Just as Spring couldn’t choose among multiple candidate beans, it can’t
>
> choose among multiple primary beans. Clearly, when more than one bean is desig
>
> nated as primary, there are no primary candidates.
>
> ​																—— 《Spring in action 4th Edition》



**Clearly, when more than one bean is designated as primary, there are no primary candidates **

如果有多个`@Primary`注解的bean，那么就没有`primary`的candidate了；这里说的已经很明确了，但是没有说spring具体怎么处理的。毕竟上面的项目启动的时候也没有报`ambiguity` 相关的异常。



## MapperScan

`MapperScan`是mybatis提供的注解，用来指定扫描dao层接口的目录和mapper文件所在的位置的注解，上面名字冲突的bean是通过下面的形式引入的：

```java
@MapperScan(basePackages = NoticeIntelligenceMapperConfig.PACKAGE, sqlSessionFactoryRef = "sessionFactory")
```

看下源码：

```java
// org.mybatis.spring.annotation.MapperScannerRegistrar#registerBeanDefinitions
/**
   * {@inheritDoc}
   */
  @Override
  public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {

  	// 省略n行
    scanner.setSqlSessionTemplateBeanName(annoAttrs.getString("sqlSessionTemplateRef"));
    // 这里获取注解里对应的属性值
    scanner.setSqlSessionFactoryBeanName(annoAttrs.getString("sqlSessionFactoryRef"));

    List<String> basePackages = new ArrayList<String>();
    for (String pkg : annoAttrs.getStringArray("value")) {
      if (StringUtils.hasText(pkg)) {
        basePackages.add(pkg);
      }
    }
    for (String pkg : annoAttrs.getStringArray("basePackages")) {
      if (StringUtils.hasText(pkg)) {
        basePackages.add(pkg);
      }
    }
    for (Class<?> clazz : annoAttrs.getClassArray("basePackageClasses")) {
      basePackages.add(ClassUtils.getPackageName(clazz));
    }
    scanner.registerFilters();
    scanner.doScan(StringUtils.toStringArray(basePackages));
  }
```

找到对应属性使用的地方：

```java
// org.mybatis.spring.mapper.ClassPathMapperScanner#processBeanDefinitions
private void processBeanDefinitions(Set<BeanDefinitionHolder> beanDefinitions) {
    GenericBeanDefinition definition;
    for (BeanDefinitionHolder holder : beanDefinitions) {
      definition = (GenericBeanDefinition) holder.getBeanDefinition();

      if (logger.isDebugEnabled()) {
        logger.debug("Creating MapperFactoryBean with name '" + holder.getBeanName() 
          + "' and '" + definition.getBeanClassName() + "' mapperInterface");
      }

      // the mapper interface is the original class of the bean
      // but, the actual class of the bean is MapperFactoryBean
      definition.getConstructorArgumentValues().addGenericArgumentValue(definition.getBeanClassName()); // issue #59
      definition.setBeanClass(this.mapperFactoryBean.getClass());

      definition.getPropertyValues().add("addToConfig", this.addToConfig);

      boolean explicitFactoryUsed = false;
      // 这里设置对应依赖的占位
      if (StringUtils.hasText(this.sqlSessionFactoryBeanName)) {
        // 这里的RunTimeBean
        definition.getPropertyValues().add("sqlSessionFactory", new RuntimeBeanReference(this.sqlSessionFactoryBeanName));
        explicitFactoryUsed = true;
      } else if (this.sqlSessionFactory != null) {
        definition.getPropertyValues().add("sqlSessionFactory", this.sqlSessionFactory);
        explicitFactoryUsed = true;
      }

      if (StringUtils.hasText(this.sqlSessionTemplateBeanName)) {
        if (explicitFactoryUsed) {
          logger.warn("Cannot use both: sqlSessionTemplate and sqlSessionFactory together. sqlSessionFactory is ignored.");
        }
        definition.getPropertyValues().add("sqlSessionTemplate", new RuntimeBeanReference(this.sqlSessionTemplateBeanName));
        explicitFactoryUsed = true;
      } else if (this.sqlSessionTemplate != null) {
        if (explicitFactoryUsed) {
          logger.warn("Cannot use both: sqlSessionTemplate and sqlSessionFactory together. sqlSessionFactory is ignored.");
        }
        definition.getPropertyValues().add("sqlSessionTemplate", this.sqlSessionTemplate);
        explicitFactoryUsed = true;
      }

      if (!explicitFactoryUsed) {
        if (logger.isDebugEnabled()) {
          logger.debug("Enabling autowire by type for MapperFactoryBean with name '" + holder.getBeanName() + "'.");
        }
        definition.setAutowireMode(AbstractBeanDefinition.AUTOWIRE_BY_TYPE);
      }
    }
  }
```

最终使用的是`RuntimeBeanReference`。

## RuntimeBeanReference

`@Primary`注解最终转换成了bean的`isPrimary`属性，搜代码可以大概知道是在`DefaultListableBeanFactory`中处理的：

```java
// org.springframework.beans.factory.support.DefaultListableBeanFactory#determinePrimaryCandidate
/**
	 * Determine the primary candidate in the given set of beans.
	 * @param candidates a Map of candidate names and candidate instances
	 * (or candidate classes if not created yet) that match the required type
	 * @param requiredType the target dependency type to match against
	 * @return the name of the primary candidate, or {@code null} if none found
	 * @see #isPrimary(String, Object)
	 */
	@Nullable
	protected String determinePrimaryCandidate(Map<String, Object> candidates, Class<?> requiredType) {
		String primaryBeanName = null;
		for (Map.Entry<String, Object> entry : candidates.entrySet()) {
			String candidateBeanName = entry.getKey();
			Object beanInstance = entry.getValue();
			if (isPrimary(candidateBeanName, beanInstance)) {
				if (primaryBeanName != null) {
					boolean candidateLocal = containsBeanDefinition(candidateBeanName);
					boolean primaryLocal = containsBeanDefinition(primaryBeanName);
					if (candidateLocal && primaryLocal) {
						throw new NoUniqueBeanDefinitionException(requiredType, candidates.size(),
								"more than one 'primary' bean found among candidates: " + candidates.keySet());
					}
					else if (candidateLocal) {
						primaryBeanName = candidateBeanName;
					}
				}
				else {
					primaryBeanName = candidateBeanName;
				}
			}
		}
		return primaryBeanName;
	}
```

但是这里抛异常了，应该不是这里 🙄

> 首先是信息解析，即将属性定义中的值进行解析，如RuntimeBeanReference解析成引用的Bean对象，这里会进行级联获取bean信息，并追加depend信息。这一步只是解析。

原来在这里：

```java
// org.springframework.beans.factory.support.BeanDefinitionValueResolver#resolveValueIfNecessary
/**
	 * Given a PropertyValue, return a value, resolving any references to other
	 * beans in the factory if necessary. The value could be:
	 * <li>A BeanDefinition, which leads to the creation of a corresponding
	 * new bean instance. Singleton flags and names of such "inner beans"
	 * are always ignored: Inner beans are anonymous prototypes.
	 * <li>A RuntimeBeanReference, which must be resolved.
	 * <li>A ManagedList. This is a special collection that may contain
	 * RuntimeBeanReferences or Collections that will need to be resolved.
	 * <li>A ManagedSet. May also contain RuntimeBeanReferences or
	 * Collections that will need to be resolved.
	 * <li>A ManagedMap. In this case the value may be a RuntimeBeanReference
	 * or Collection that will need to be resolved.
	 * <li>An ordinary object or {@code null}, in which case it's left alone.
	 * @param argName the name of the argument that the value is defined for
	 * @param value the value object to resolve
	 * @return the resolved object
	 */
	@Nullable
	public Object resolveValueIfNecessary(Object argName, @Nullable Object value) {
		// We must check each value to see whether it requires a runtime reference
		// to another bean to be resolved.
		if (value instanceof RuntimeBeanReference) {
      // 在这里处理的！！！
			RuntimeBeanReference ref = (RuntimeBeanReference) value;
			return resolveReference(argName, ref);
		}
		else if (value instanceof RuntimeBeanNameReference) {
			String refName = ((RuntimeBeanNameReference) value).getBeanName();
			refName = String.valueOf(doEvaluate(refName));
			if (!this.beanFactory.containsBean(refName)) {
				throw new BeanDefinitionStoreException(
						"Invalid bean name '" + refName + "' in bean reference for " + argName);
			}
			return refName;
		}
		else if (value instanceof BeanDefinitionHolder) {
			// Resolve BeanDefinitionHolder: contains BeanDefinition with name and aliases.
			BeanDefinitionHolder bdHolder = (BeanDefinitionHolder) value;
			return resolveInnerBean(argName, bdHolder.getBeanName(), bdHolder.getBeanDefinition());
		}
		else if (value instanceof BeanDefinition) {
			// Resolve plain BeanDefinition, without contained name: use dummy name.
			BeanDefinition bd = (BeanDefinition) value;
			String innerBeanName = "(inner bean)" + BeanFactoryUtils.GENERATED_BEAN_NAME_SEPARATOR +
					ObjectUtils.getIdentityHexString(bd);
			return resolveInnerBean(argName, innerBeanName, bd);
		}
		else if (value instanceof ManagedArray) {
			// May need to resolve contained runtime references.
			ManagedArray array = (ManagedArray) value;
			Class<?> elementType = array.resolvedElementType;
			if (elementType == null) {
				String elementTypeName = array.getElementTypeName();
				if (StringUtils.hasText(elementTypeName)) {
					try {
						elementType = ClassUtils.forName(elementTypeName, this.beanFactory.getBeanClassLoader());
						array.resolvedElementType = elementType;
					}
					catch (Throwable ex) {
						// Improve the message by showing the context.
						throw new BeanCreationException(
								this.beanDefinition.getResourceDescription(), this.beanName,
								"Error resolving array type for " + argName, ex);
					}
				}
				else {
					elementType = Object.class;
				}
			}
			return resolveManagedArray(argName, (List<?>) value, elementType);
		}
		else if (value instanceof ManagedList) {
			// May need to resolve contained runtime references.
			return resolveManagedList(argName, (List<?>) value);
		}
		else if (value instanceof ManagedSet) {
			// May need to resolve contained runtime references.
			return resolveManagedSet(argName, (Set<?>) value);
		}
		else if (value instanceof ManagedMap) {
			// May need to resolve contained runtime references.
			return resolveManagedMap(argName, (Map<?, ?>) value);
		}
		else if (value instanceof ManagedProperties) {
			Properties original = (Properties) value;
			Properties copy = new Properties();
			original.forEach((propKey, propValue) -> {
				if (propKey instanceof TypedStringValue) {
					propKey = evaluate((TypedStringValue) propKey);
				}
				if (propValue instanceof TypedStringValue) {
					propValue = evaluate((TypedStringValue) propValue);
				}
				if (propKey == null || propValue == null) {
					throw new BeanCreationException(
							this.beanDefinition.getResourceDescription(), this.beanName,
							"Error converting Properties key/value pair for " + argName + ": resolved to null");
				}
				copy.put(propKey, propValue);
			});
			return copy;
		}
		else if (value instanceof TypedStringValue) {
			// Convert value to target type here.
			TypedStringValue typedStringValue = (TypedStringValue) value;
			Object valueObject = evaluate(typedStringValue);
			try {
				Class<?> resolvedTargetType = resolveTargetType(typedStringValue);
				if (resolvedTargetType != null) {
					return this.typeConverter.convertIfNecessary(valueObject, resolvedTargetType);
				}
				else {
					return valueObject;
				}
			}
			catch (Throwable ex) {
				// Improve the message by showing the context.
				throw new BeanCreationException(
						this.beanDefinition.getResourceDescription(), this.beanName,
						"Error converting typed String value for " + argName, ex);
			}
		}
		else if (value instanceof NullBean) {
			return null;
		}
		else {
			return evaluate(value);
		}
	}
```

debug看了下，也确实是对的：

![image-20200429120415453](/image-20200429120415453.png)

跟进去， 发现：

![image-20200429120839555](/image-20200429120839555.png)

老的dao层关联的sessionFactory居然是新的（扫描路径不一样，这里只加载了新的mapper文件）。根据名称获取一把：

![image-20200429121457725](/image-20200429121457725.png)

## bean注册

![image-20200429125600021](/image-20200429125600021.png)

![image-20200429125633517](/image-20200429125633517.png)

```java
//---------------------------------------------------------------------
	// Implementation of BeanDefinitionRegistry interface
	//---------------------------------------------------------------------

	@Override
	public void registerBeanDefinition(String beanName, BeanDefinition beanDefinition)
			throws BeanDefinitionStoreException {

		Assert.hasText(beanName, "Bean name must not be empty");
		Assert.notNull(beanDefinition, "BeanDefinition must not be null");

		if (beanDefinition instanceof AbstractBeanDefinition) {
			try {
				((AbstractBeanDefinition) beanDefinition).validate();
			}
			catch (BeanDefinitionValidationException ex) {
				throw new BeanDefinitionStoreException(beanDefinition.getResourceDescription(), beanName,
						"Validation of bean definition failed", ex);
			}
		}

    // 这里发生了覆盖
		BeanDefinition existingDefinition = this.beanDefinitionMap.get(beanName);
		if (existingDefinition != null) {
			if (!isAllowBeanDefinitionOverriding()) {
				throw new BeanDefinitionStoreException(beanDefinition.getResourceDescription(), beanName,
						"Cannot register bean definition [" + beanDefinition + "] for bean '" + beanName +
						"': There is already [" + existingDefinition + "] bound.");
			}
			else if (existingDefinition.getRole() < beanDefinition.getRole()) {
				// e.g. was ROLE_APPLICATION, now overriding with ROLE_SUPPORT or ROLE_INFRASTRUCTURE
				if (logger.isWarnEnabled()) {
					logger.warn("Overriding user-defined bean definition for bean '" + beanName +
							"' with a framework-generated bean definition: replacing [" +
							existingDefinition + "] with [" + beanDefinition + "]");
				}
			}
			else if (!beanDefinition.equals(existingDefinition)) {
        // 走到了这里，打印了override的日志，不过是info级别的
				if (logger.isInfoEnabled()) {
					logger.info("Overriding bean definition for bean '" + beanName +
							"' with a different definition: replacing [" + existingDefinition +
							"] with [" + beanDefinition + "]");
				}
			}
			else {
				if (logger.isDebugEnabled()) {
					logger.debug("Overriding bean definition for bean '" + beanName +
							"' with an equivalent definition: replacing [" + existingDefinition +
							"] with [" + beanDefinition + "]");
				}
			}
			this.beanDefinitionMap.put(beanName, beanDefinition);
		}
		else {
			if (hasBeanCreationStarted()) {
				// Cannot modify startup-time collection elements anymore (for stable iteration)
				synchronized (this.beanDefinitionMap) {
					this.beanDefinitionMap.put(beanName, beanDefinition);
					List<String> updatedDefinitions = new ArrayList<>(this.beanDefinitionNames.size() + 1);
					updatedDefinitions.addAll(this.beanDefinitionNames);
					updatedDefinitions.add(beanName);
					this.beanDefinitionNames = updatedDefinitions;
					if (this.manualSingletonNames.contains(beanName)) {
						Set<String> updatedSingletons = new LinkedHashSet<>(this.manualSingletonNames);
						updatedSingletons.remove(beanName);
						this.manualSingletonNames = updatedSingletons;
					}
				}
			}
			else {
				// Still in startup registration phase
				this.beanDefinitionMap.put(beanName, beanDefinition);
				this.beanDefinitionNames.add(beanName);
				this.manualSingletonNames.remove(beanName);
			}
			this.frozenBeanDefinitionNames = null;
		}

		if (existingDefinition != null || containsSingleton(beanName)) {
			resetBeanDefinition(beanName);
		}
	}
```

![image-20200429125804639](/image-20200429125804639.png)



## 结论

最终排查下来，发现只是bean的名称重复，导致覆盖；跟`@Primary`没有关系。在成文的过程中又一起**不加思索地复制粘贴**引起的故障

![image-20200429130442650](/image-20200429130442650.png)

```bash
Caused by: org.springframework.beans.factory.NoSuchBeanDefinitionException: No qualifying bean of type 'com.atour.pay.api.remote.statistics.TransStatisticsRemote' available
	at org.springframework.beans.factory.support.DefaultListableBeanFactory.getBean(DefaultListableBeanFactory.java:347)
	at org.springframework.beans.factory.support.DefaultListableBeanFactory.getBean(DefaultListableBeanFactory.java:334)
	at org.springframework.context.support.AbstractApplicationContext.getBean(AbstractApplicationContext.java:1103)
```

还是需要保持敬畏之心，多去了解，不能无脑的粘贴。同时我们的基础建设不够完善，才导致了这么多复制粘贴的代码，道阻且长！

覆盖的规则可以参考， [聊聊Spring的bean覆盖（存在同名name/id问题），介绍Spring名称生成策略接口BeanNameGenerator【享学Spring】_Java_BAT的乌托邦-CSDN博客](https://blog.csdn.net/f641385712/article/details/93777536), 这里简单贴下结论：

> - 同一个配置文件内同名的`Bean`，**以最上面定义的为准**
> - 不同配置文件中存在同名Bean，`后解析`的配置文件会覆盖`先解析`的配置文件（配置文件的先后顺序其实会受到`@Order`来控制）
> - 通过`@ComponentScan`扫描进来的优先级是最低的，原因就是它扫描进来的Bean定义是**最先**被注册的~
> - 在不同容器内，即使`Bean`名称相同，它们也是能够**和谐共存**的（想想父子容器）



## 参考

- [Spring中获取一个bean的流程-2 – i flym](https://www.iflym.com/index.php/code/201208290002.html)
- [聊聊Spring的bean覆盖（存在同名name/id问题），介绍Spring名称生成策略接口BeanNameGenerator【享学Spring】_Java_BAT的乌托邦-CSDN博客](https://blog.csdn.net/f641385712/article/details/93777536)