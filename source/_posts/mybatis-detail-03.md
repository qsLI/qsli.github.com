---
title: mybatis源码解析（三）—— Spring集成
tags: mybatis
category: mybatis
toc: true
typora-root-url: mybatis-detail-03
typora-copy-images-to: mybatis-detail-03
date: 2021-03-23 08:08:22
---



## 使用

依赖包地址：

```xml
<dependency>
  <groupId>org.mybatis</groupId>
  <artifactId>mybatis-spring</artifactId>
  <version>1.3.0</version>
</dependency>
```

使用配置：
```xml
 <!--    扫描mapper-->
<bean id="mindSqlSessionFactory" class="org.mybatis.spring.SqlSessionFactoryBean">
  <property name="dataSource" ref="mindDataSource"/>
  <property name="configLocation" value="classpath:mybatis-config.xml"/>
  <property name="mapperLocations" value="classpath*:mapper/minder/*Mapper.xml"/>
  <property name="plugins">
    <array>
      <ref bean="sqlInterceptor"/>
    </array>
  </property>
</bean>

<!--    生成Dao代理类-->
<bean class="org.mybatis.spring.mapper.MapperScannerConfigurer">
  <property name="sqlSessionFactoryBeanName" value="mindSqlSessionFactory" />
  <property name="basePackage" value="com.air.persistence.minder.dao"/>
</bean>
```

接口类也要交给spring管理：

```java
@Repository
public interface MinderDao {

    MindEntity selectOne(@Param("id") int id);
}
```

经过上面的配置，`MinderDao`就交给spring容器管理了，使用的时候直接注入就行：

```java
@Service
@Slf4j
public class TransactionService {

    @Resource
    private MinderDao minderDao;
  
    public MindEntity query() {
        final MindEntity mindEntity = minderDao.selectOne(1);
        return mindEntity;
    }
```

## 源码分析

### SqlSessionFactoryBean

> FactoryBean that creates an MyBatis SqlSessionFactory.
> This is the usual way to set up a shared MyBatis {@code SqlSessionFactory} in a Spring > >application context;
> the SqlSessionFactory can then be passed to MyBatis-based DAOs via dependency injection.


```java
/**
   * {@inheritDoc}
   */
@Override
public SqlSessionFactory getObject() throws Exception {
  if (this.sqlSessionFactory == null) {
    afterPropertiesSet();
  }

  return this.sqlSessionFactory;
}

/**
   * {@inheritDoc}
   */
@Override
public void afterPropertiesSet() throws Exception {
  notNull(dataSource, "Property 'dataSource' is required");
  notNull(sqlSessionFactoryBuilder, "Property 'sqlSessionFactoryBuilder' is required");
  state((configuration == null && configLocation == null) || !(configuration != null && configLocation != null),
        "Property 'configuration' and 'configLocation' can not specified with together");

  this.sqlSessionFactory = buildSqlSessionFactory();
}

// 配置Configuration并且生成SQLSessionFactory
protected SqlSessionFactory buildSqlSessionFactory() throws IOException {

  Configuration configuration;

  XMLConfigBuilder xmlConfigBuilder = null;
  if (this.configuration != null) {
    // 指定了Configuration
    configuration = this.configuration;
    if (configuration.getVariables() == null) {
      configuration.setVariables(this.configurationProperties);
    } else if (this.configurationProperties != null) {
      configuration.getVariables().putAll(this.configurationProperties);
    }
  } else if (this.configLocation != null) {
    // 指定单个xml文件的位置
    xmlConfigBuilder = new XMLConfigBuilder(this.configLocation.getInputStream(), null, this.configurationProperties);
    configuration = xmlConfigBuilder.getConfiguration();
  } else {
    if (LOGGER.isDebugEnabled()) {
      LOGGER.debug("Property `configuration` or 'configLocation' not specified, using default MyBatis Configuration");
    }
    configuration = new Configuration();
    configuration.setVariables(this.configurationProperties);
  }

  if (this.objectFactory != null) {
    configuration.setObjectFactory(this.objectFactory);
  }

  if (this.objectWrapperFactory != null) {
    configuration.setObjectWrapperFactory(this.objectWrapperFactory);
  }

  if (this.vfs != null) {
    configuration.setVfsImpl(this.vfs);
  }

  if (hasLength(this.typeAliasesPackage)) {
    String[] typeAliasPackageArray = tokenizeToStringArray(this.typeAliasesPackage,
                                                           ConfigurableApplicationContext.CONFIG_LOCATION_DELIMITERS);
    for (String packageToScan : typeAliasPackageArray) {
      configuration.getTypeAliasRegistry().registerAliases(packageToScan,
                                                           typeAliasesSuperType == null ? Object.class : typeAliasesSuperType);
      if (LOGGER.isDebugEnabled()) {
        LOGGER.debug("Scanned package: '" + packageToScan + "' for aliases");
      }
    }
  }

  if (!isEmpty(this.typeAliases)) {
    for (Class<?> typeAlias : this.typeAliases) {
      configuration.getTypeAliasRegistry().registerAlias(typeAlias);
      if (LOGGER.isDebugEnabled()) {
        LOGGER.debug("Registered type alias: '" + typeAlias + "'");
      }
    }
  }

  // 加载Mybatis的插件
  if (!isEmpty(this.plugins)) {
    for (Interceptor plugin : this.plugins) {
      configuration.addInterceptor(plugin);
      if (LOGGER.isDebugEnabled()) {
        LOGGER.debug("Registered plugin: '" + plugin + "'");
      }
    }
  }

  // TypeHandler
  if (hasLength(this.typeHandlersPackage)) {
    String[] typeHandlersPackageArray = tokenizeToStringArray(this.typeHandlersPackage,
                                                              ConfigurableApplicationContext.CONFIG_LOCATION_DELIMITERS);
    for (String packageToScan : typeHandlersPackageArray) {
      configuration.getTypeHandlerRegistry().register(packageToScan);
      if (LOGGER.isDebugEnabled()) {
        LOGGER.debug("Scanned package: '" + packageToScan + "' for type handlers");
      }
    }
  }

  if (!isEmpty(this.typeHandlers)) {
    for (TypeHandler<?> typeHandler : this.typeHandlers) {
      configuration.getTypeHandlerRegistry().register(typeHandler);
      if (LOGGER.isDebugEnabled()) {
        LOGGER.debug("Registered type handler: '" + typeHandler + "'");
      }
    }
  }

  if (this.databaseIdProvider != null) {//fix #64 set databaseId before parse mapper xmls
    try {
      configuration.setDatabaseId(this.databaseIdProvider.getDatabaseId(this.dataSource));
    } catch (SQLException e) {
      throw new NestedIOException("Failed getting a databaseId", e);
    }
  }

  if (this.cache != null) {
    configuration.addCache(this.cache);
  }

  if (xmlConfigBuilder != null) {
    try {
      xmlConfigBuilder.parse();

      if (LOGGER.isDebugEnabled()) {
        LOGGER.debug("Parsed configuration file: '" + this.configLocation + "'");
      }
    } catch (Exception ex) {
      throw new NestedIOException("Failed to parse config resource: " + this.configLocation, ex);
    } finally {
      ErrorContext.instance().reset();
    }
  }

  // Transaction
  if (this.transactionFactory == null) {
    // 注意默认用的是SpringManagedTransactionFactory
    this.transactionFactory = new SpringManagedTransactionFactory();
  }

  configuration.setEnvironment(new Environment(this.environment, this.transactionFactory, this.dataSource));

  // mapper的位置
  if (!isEmpty(this.mapperLocations)) {
    for (Resource mapperLocation : this.mapperLocations) {
      if (mapperLocation == null) {
        continue;
      }

      try {
        XMLMapperBuilder xmlMapperBuilder = new XMLMapperBuilder(mapperLocation.getInputStream(),
                                                                 configuration, mapperLocation.toString(), configuration.getSqlFragments());
        xmlMapperBuilder.parse();
      } catch (Exception e) {
        throw new NestedIOException("Failed to parse mapping resource: '" + mapperLocation + "'", e);
      } finally {
        ErrorContext.instance().reset();
      }

      if (LOGGER.isDebugEnabled()) {
        LOGGER.debug("Parsed mapper file: '" + mapperLocation + "'");
      }
    }
  } else {
    if (LOGGER.isDebugEnabled()) {
      LOGGER.debug("Property 'mapperLocations' was not specified or no matching resources found");
    }
  }
	
  // 生成SqlSessionFactory
  return this.sqlSessionFactoryBuilder.build(configuration);
}
```



### MapperScannerConfigurer

>  BeanDefinitionRegistryPostProcessor that searches recursively starting from a base package for
>   interfaces and **registers them as  MapperFactoryBean **. Note that only interfaces with at
>   least one method will be registered; concrete classes will be ignored.

这个类的作用是，扫描配置的接口，生成代理的Dao对象，这里扫描完之后，注册的是`MapperFactoryBean`。对象生成过程如下：


```java
// org.mybatis.spring.mapper.MapperFactoryBean#getObject
/**
   * {@inheritDoc}
   */
public class MapperFactoryBean<T> extends SqlSessionDaoSupport implements FactoryBean<T> {
  @Override
  public T getObject() throws Exception {
    // 通过sqlSession的getMapper方法生成代理类对象MapperProxy，Dao对象就跟这个sqlSession关联了
    return getSqlSession().getMapper(this.mapperInterface);
  }
  
  public void setSqlSessionFactory(SqlSessionFactory sqlSessionFactory) {
    if (!this.externalSqlSession) {
      // 这里用的是SqlSessionTemplate，他也实现了SqlSession相关的接口
      this.sqlSession = new SqlSessionTemplate(sqlSessionFactory);
    }
  }
}
```

简单看下扫描过程：

```java
public class MapperScannerConfigurer implements BeanDefinitionRegistryPostProcessor, InitializingBean, ApplicationContextAware, BeanNameAware {
  
  @Override
  public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
    if (this.processPropertyPlaceHolders) {
      processPropertyPlaceHolders();
    }

    ClassPathMapperScanner scanner = new ClassPathMapperScanner(registry);
    scanner.setAddToConfig(this.addToConfig);
    scanner.setAnnotationClass(this.annotationClass);
    scanner.setMarkerInterface(this.markerInterface);
    scanner.setSqlSessionFactory(this.sqlSessionFactory);
    scanner.setSqlSessionTemplate(this.sqlSessionTemplate);
    scanner.setSqlSessionFactoryBeanName(this.sqlSessionFactoryBeanName);
    scanner.setSqlSessionTemplateBeanName(this.sqlSessionTemplateBeanName);
    scanner.setResourceLoader(this.applicationContext);
    scanner.setBeanNameGenerator(this.nameGenerator);
    scanner.registerFilters();
    // 开始从指定的位置扫描类
    scanner.scan(StringUtils.tokenizeToStringArray(this.basePackage, ConfigurableApplicationContext.CONFIG_LOCATION_DELIMITERS));
  }
}

// org.mybatis.spring.mapper.ClassPathMapperScanner#processBeanDefinitions
// 注册bean过程：
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
    // 注册的是MapperFactoryBean， 构造参数第一个字段是接口类型
    definition.getConstructorArgumentValues().addGenericArgumentValue(definition.getBeanClassName()); // issue #59
    definition.setBeanClass(this.mapperFactoryBean.getClass());

    definition.getPropertyValues().add("addToConfig", this.addToConfig);

    // 添加sqlSessionFactory属性
    boolean explicitFactoryUsed = false;
    if (StringUtils.hasText(this.sqlSessionFactoryBeanName)) {
      definition.getPropertyValues().add("sqlSessionFactory", new RuntimeBeanReference(this.sqlSessionFactoryBeanName));
      explicitFactoryUsed = true;
    } else if (this.sqlSessionFactory != null) {
      definition.getPropertyValues().add("sqlSessionFactory", this.sqlSessionFactory);
      explicitFactoryUsed = true;
    }

    // 添加sqlSessionTemplate属性
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

### SqlSessionTemplate

从上面的代码分析可以看出来，拿到的代理类，底层的SqlSession实际上是`SqlSessionTemplate`，`SqlSessionTemplate`内部采用了JDK的代理，将实际的请求代理给了`SqlSessionInterceptor`：

```java
// org.mybatis.spring.SqlSessionTemplate
public class SqlSessionTemplate implements SqlSession, DisposableBean {

  private final SqlSessionFactory sqlSessionFactory;

  private final ExecutorType executorType;

  private final SqlSession sqlSessionProxy;

  private final PersistenceExceptionTranslator exceptionTranslator;
  
  /**
   * Constructs a Spring managed {@code SqlSession} with the given
   * {@code SqlSessionFactory} and {@code ExecutorType}.
   * A custom {@code SQLExceptionTranslator} can be provided as an
   * argument so any {@code PersistenceException} thrown by MyBatis
   * can be custom translated to a {@code RuntimeException}
   * The {@code SQLExceptionTranslator} can also be null and thus no
   * exception translation will be done and MyBatis exceptions will be
   * thrown
   *
   * @param sqlSessionFactory
   * @param executorType
   * @param exceptionTranslator
   */
  public SqlSessionTemplate(SqlSessionFactory sqlSessionFactory, ExecutorType executorType,
      PersistenceExceptionTranslator exceptionTranslator) {

    notNull(sqlSessionFactory, "Property 'sqlSessionFactory' is required");
    notNull(executorType, "Property 'executorType' is required");

    this.sqlSessionFactory = sqlSessionFactory;
    this.executorType = executorType;
    this.exceptionTranslator = exceptionTranslator;
    // 这里生成了JDK的代理类，实际调用请求被转发给了SqlSessionInterceptor
    this.sqlSessionProxy = (SqlSession) newProxyInstance(
        SqlSessionFactory.class.getClassLoader(),
        new Class[] { SqlSession.class },
        new SqlSessionInterceptor());
  }
  
  
    /**
   * {@inheritDoc}
   */
  @Override
  public <T> T selectOne(String statement) {
    // 接口的相关方法都转发给代理类
    return this.sqlSessionProxy.<T> selectOne(statement);
  }
}

// org.mybatis.spring.SqlSessionTemplate.SqlSessionInterceptor
/**
   * Proxy needed to route MyBatis method calls to the proper SqlSession got
   * from Spring's Transaction Manager
   * It also unwraps exceptions thrown by {@code Method#invoke(Object, Object...)} to
   * pass a {@code PersistenceException} to the {@code PersistenceExceptionTranslator}.
   */
private class SqlSessionInterceptor implements InvocationHandler {
  @Override
  public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    // 这一步是关键，获取sqlSession
    SqlSession sqlSession = getSqlSession(
      SqlSessionTemplate.this.sqlSessionFactory,
      SqlSessionTemplate.this.executorType,
      SqlSessionTemplate.this.exceptionTranslator);
    try {
      // 反射调用delegate对应的方法
      Object result = method.invoke(sqlSession, args);
      if (!isSqlSessionTransactional(sqlSession, SqlSessionTemplate.this.sqlSessionFactory)) {
        // force commit even on non-dirty sessions because some databases require
        // a commit/rollback before calling close()
        // 非spring管理的，强制commit
        sqlSession.commit(true);
      }
      return result;
    } catch (Throwable t) {
      Throwable unwrapped = unwrapThrowable(t);
      if (SqlSessionTemplate.this.exceptionTranslator != null && unwrapped instanceof PersistenceException) {
        // release the connection to avoid a deadlock if the translator is no loaded. See issue #22
    		// 异常时要确保sqlSession被关闭
        closeSqlSession(sqlSession, SqlSessionTemplate.this.sqlSessionFactory);
        sqlSession = null;
        // 翻译成spring定义的标准异常
        Throwable translated = SqlSessionTemplate.this.exceptionTranslator.translateExceptionIfPossible((PersistenceException) unwrapped);
        if (translated != null) {
          unwrapped = translated;
        }
      }
      throw unwrapped;
    } finally {
      if (sqlSession != null) {
        closeSqlSession(sqlSession, SqlSessionTemplate.this.sqlSessionFactory);
      }
    }
  }
}
```
#### SqlSessionUtils

`SqlSessionUtils`是mybatis提供的工具类，处理了SqlSession的`ThreadLocal`绑定和事务结束后的释放：

```java
// org.mybatis.spring.SqlSessionUtils#getSqlSession(org.apache.ibatis.session.SqlSessionFactory, org.apache.ibatis.session.ExecutorType, org.springframework.dao.support.PersistenceExceptionTranslator)
public static SqlSession getSqlSession(SqlSessionFactory sessionFactory, ExecutorType executorType, PersistenceExceptionTranslator exceptionTranslator) {

  notNull(sessionFactory, NO_SQL_SESSION_FACTORY_SPECIFIED);
  notNull(executorType, NO_EXECUTOR_TYPE_SPECIFIED);

  SqlSessionHolder holder = (SqlSessionHolder) TransactionSynchronizationManager.getResource(sessionFactory);

  SqlSession session = sessionHolder(executorType, holder);
  if (session != null) {
    return session;
  }

  if (LOGGER.isDebugEnabled()) {
    LOGGER.debug("Creating a new SqlSession");
  }
	
  // ThreadLocal中为空，就open一个新的session
  session = sessionFactory.openSession(executorType);
	// 将新open的session，交给spring来管理
  // 会通过TransactionSynchronizationManager，绑定到当前线程的ThreadLocal
  registerSessionHolder(sessionFactory, executorType, exceptionTranslator, session);

  return session;
}

// org.mybatis.spring.SqlSessionUtils#closeSqlSession
/**
   * Checks if {@code SqlSession} passed as an argument is managed by Spring {@code TransactionSynchronizationManager}
   * If it is not, it closes it, otherwise it just updates the reference counter and
   * lets Spring call the close callback when the managed transaction ends
   *
   * @param session
   * @param sessionFactory
   */
public static void closeSqlSession(SqlSession session, SqlSessionFactory sessionFactory) {
  notNull(session, NO_SQL_SESSION_SPECIFIED);
  notNull(sessionFactory, NO_SQL_SESSION_FACTORY_SPECIFIED);

  // ThreadLocal中取
  SqlSessionHolder holder = (SqlSessionHolder) TransactionSynchronizationManager.getResource(sessionFactory);
  if ((holder != null) && (holder.getSqlSession() == session)) {
    // spring管理的
    if (LOGGER.isDebugEnabled()) {
      LOGGER.debug("Releasing transactional SqlSession [" + session + "]");
    }
    // 只用减少引用计数(referenceCount--)就行了，其他的交给spring来做，
    // 在getSqlSession的时候注册了SqlSessionSynchronization，在事务完成的时候，会负责做关闭的工作
    holder.released();
  } else {
    // 非spring管理的
    if (LOGGER.isDebugEnabled()) {
      LOGGER.debug("Closing non transactional SqlSession [" + session + "]");
    }
    // 需要手动关闭
    session.close();
  }
}

```

{%plantuml%}

actor client

participant SqlSessionTemplate

participant SqlSessionInterceptor

participant SqlSession

participant SqlSessionUtils

participant TransactionSynchronizationManager

participant SqlSessionFactory





==  获取SqlSession过程 ==

client -> SqlSessionTemplate: selectOne

activate SqlSessionTemplate

SqlSessionTemplate -> SqlSessionInterceptor: invoke

SqlSessionInterceptor -> SqlSessionUtils: getSqlSession

activate SqlSessionUtils

SqlSessionUtils -> TransactionSynchronizationManager: 

TransactionSynchronizationManager --> SqlSessionUtils: SqlSessionHolder

SqlSessionUtils --> SqlSessionInterceptor: sqlSession

activate SqlSessionUtils #00FF00

SqlSessionUtils -> SqlSessionFactory: openSession

SqlSessionFactory --> SqlSessionUtils: sqlSession

SqlSessionUtils -> TransactionSynchronizationManager: registerSessionHolder

SqlSessionUtils --> SqlSessionInterceptor: sqlSession

deactivate SqlSessionUtils

deactivate SqlSessionUtils

SqlSessionInterceptor -> SqlSession: selectOne

deactivate SqlSessionTemplate

{% endplantuml%}

#### 线程安全问题

`SqlSession`不是线程安全的，多线程环境下必然有竞争问题。众所周知，spring是通过给每个Thread做绑定来解决竞争问题的。
`SqlSessionTemplate`中的sqlSession实际上是个代理对象，他是**没有状态**的，每次执行的时候，再通过工具类类创建或者复用**`ThreadLocal`**中的session，从而避免了多线程的问题。

![spring-tx-Page-7](/spring-tx-Page-7.png)

#### SqlSessionSynchronization

事务状态变化的时候，这个回调会得到通知，在通知里做了一些清理的工作：

```java
  /**
   * Callback for cleaning up resources. It cleans TransactionSynchronizationManager and
   * also commits and closes the {@code SqlSession}.
   * It assumes that {@code Connection} life cycle will be managed by
   * {@code DataSourceTransactionManager} or {@code JtaTransactionManager}
   */
  private static final class SqlSessionSynchronization extends TransactionSynchronizationAdapter {
    
    /**
     * {@inheritDoc}
     */
    @Override
    public void suspend() {
      if (this.holderActive) {
        if (LOGGER.isDebugEnabled()) {
          LOGGER.debug("Transaction synchronization suspending SqlSession [" + this.holder.getSqlSession() + "]");
        }
        // 清空ThreadLocal，为新事务做准备
        TransactionSynchronizationManager.unbindResource(this.sessionFactory);
      }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void resume() {
      if (this.holderActive) {
        if (LOGGER.isDebugEnabled()) {
          LOGGER.debug("Transaction synchronization resuming SqlSession [" + this.holder.getSqlSession() + "]");
        }
        TransactionSynchronizationManager.bindResource(this.sessionFactory, this.holder);
      }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void beforeCommit(boolean readOnly) {
      // Connection commit or rollback will be handled by ConnectionSynchronization or
      // DataSourceTransactionManager.
      // But, do cleanup the SqlSession / Executor, including flushing BATCH statements so
      // they are actually executed.
      // SpringManagedTransaction will no-op the commit over the jdbc connection
      // TODO This updates 2nd level caches but the tx may be rolledback later on! 
      if (TransactionSynchronizationManager.isActualTransactionActive()) {
        try {
          if (LOGGER.isDebugEnabled()) {
            LOGGER.debug("Transaction synchronization committing SqlSession [" + this.holder.getSqlSession() + "]");
          }
          this.holder.getSqlSession().commit();
        } catch (PersistenceException p) {
          if (this.holder.getPersistenceExceptionTranslator() != null) {
            DataAccessException translated = this.holder
              .getPersistenceExceptionTranslator()
              .translateExceptionIfPossible(p);
            if (translated != null) {
              throw translated;
            }
          }
          throw p;
        }
      }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void beforeCompletion() {
      // Issue #18 Close SqlSession and deregister it now
      // because afterCompletion may be called from a different thread
      if (!this.holder.isOpen()) {
        if (LOGGER.isDebugEnabled()) {
          LOGGER.debug("Transaction synchronization deregistering SqlSession [" + this.holder.getSqlSession() + "]");
        }
        TransactionSynchronizationManager.unbindResource(sessionFactory);
        this.holderActive = false;
        if (LOGGER.isDebugEnabled()) {
          LOGGER.debug("Transaction synchronization closing SqlSession [" + this.holder.getSqlSession() + "]");
        }
        this.holder.getSqlSession().close();
      }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void afterCompletion(int status) {
      if (this.holderActive) {
        // afterCompletion may have been called from a different thread
        // so avoid failing if there is nothing in this one
        if (LOGGER.isDebugEnabled()) {
          LOGGER.debug("Transaction synchronization deregistering SqlSession [" + this.holder.getSqlSession() + "]");
        }
        TransactionSynchronizationManager.unbindResourceIfPossible(sessionFactory);
        this.holderActive = false;
        if (LOGGER.isDebugEnabled()) {
          LOGGER.debug("Transaction synchronization closing SqlSession [" + this.holder.getSqlSession() + "]");
        }
        this.holder.getSqlSession().close();
      }
      this.holder.reset();
    }
  }
}
```



### SpringManagedTransaction

> SpringManagedTransaction handles the lifecycle of a JDBC connection.
> **It retrieves a connection from Spring's transaction manager and returns it back to it
> when it is no longer needed.**
> If Spring's transaction handling is active it will no-op all commit/rollback/close calls
> assuming that the Spring transaction manager will do the job.
> If it is not it will behave like JdbcTransaction.

这个Transaction也是mybatis为了适配spring的体系定制的，获取连接和释放连接都委托给了spring提供的工具类`DataSourceUtil`

```java
public class SpringManagedTransaction implements Transaction {
    /**
   * {@inheritDoc}
   */
  @Override
  public Connection getConnection() throws SQLException {
    if (this.connection == null) {
      openConnection();
    }
    return this.connection;
  }
  
  /**
   * Gets a connection from Spring transaction manager and discovers if this
   * {@code Transaction} should manage connection or let it to Spring.
   * <p>
   * It also reads autocommit setting because when using Spring Transaction MyBatis
   * thinks that autocommit is always false and will always call commit/rollback
   * so we need to no-op that calls.
   */
  private void openConnection() throws SQLException {
    // 委托给了spring的工具类来获取连接
    this.connection = DataSourceUtils.getConnection(this.dataSource);
    this.autoCommit = this.connection.getAutoCommit();
    this.isConnectionTransactional = DataSourceUtils.isConnectionTransactional(this.connection, this.dataSource);

    if (LOGGER.isDebugEnabled()) {
      LOGGER.debug(
          "JDBC Connection ["
              + this.connection
              + "] will"
              + (this.isConnectionTransactional ? " " : " not ")
              + "be managed by Spring");
    }
  }
  
    /**
   * {@inheritDoc}
   */
  @Override
  public void close() throws SQLException {
    // 委托给了spring的工具类类关闭连接
    DataSourceUtils.releaseConnection(this.connection, this.dataSource);
  }
  
}
```

除了连接的获取和释放，这个类的commit和rollback也做了特殊处理：

```java
/**
   * {@inheritDoc}
   */
@Override
public void commit() throws SQLException {
  // 事务连接，这里直接跳过了commit，最终的commit由spring框架处理
  if (this.connection != null && !this.isConnectionTransactional && !this.autoCommit) {
    if (LOGGER.isDebugEnabled()) {
      LOGGER.debug("Committing JDBC Connection [" + this.connection + "]");
    }
    this.connection.commit();
  }
}

/**
   * {@inheritDoc}
   */
@Override
public void rollback() throws SQLException {
   // 事务连接，这里直接跳过了rollback，最终的rollback由spring框架处理
  if (this.connection != null && !this.isConnectionTransactional && !this.autoCommit) {
    if (LOGGER.isDebugEnabled()) {
      LOGGER.debug("Rolling back JDBC Connection [" + this.connection + "]");
    }
    this.connection.rollback();
  }
}
```



#### DataSourceUtil

`DataSourceUtils`是spring提供的工具类，主要是加了一层ThreadLocal缓存的管理：

```java
// org.springframework.jdbc.datasource.DataSourceUtils#getConnection	
public static Connection getConnection(DataSource dataSource) throws CannotGetJdbcConnectionException {
  try {
    return doGetConnection(dataSource);
  }
  catch (SQLException ex) {
    throw new CannotGetJdbcConnectionException("Could not get JDBC Connection", ex);
  }
}

/**
	 * Actually obtain a JDBC Connection from the given DataSource.
	 * Same as {@link #getConnection}, but throwing the original SQLException.
	 * <p>Is aware of a corresponding Connection bound to the current thread, for example
	 * when using {@link DataSourceTransactionManager}. Will bind a Connection to the thread
	 * if transaction synchronization is active (e.g. if in a JTA transaction).
	 * <p>Directly accessed by {@link TransactionAwareDataSourceProxy}.
	 * @param dataSource the DataSource to obtain Connections from
	 * @return a JDBC Connection from the given DataSource
	 * @throws SQLException if thrown by JDBC methods
	 * @see #doReleaseConnection
	 */
	public static Connection doGetConnection(DataSource dataSource) throws SQLException {
		Assert.notNull(dataSource, "No DataSource specified");
		
    // 从ThreadLocal中去获取ConnectionHolder
		ConnectionHolder conHolder = (ConnectionHolder) TransactionSynchronizationManager.getResource(dataSource);
		if (conHolder != null && (conHolder.hasConnection() || conHolder.isSynchronizedWithTransaction())) {
			// 引用计数+1
      conHolder.requested();
			if (!conHolder.hasConnection()) {
				logger.debug("Fetching resumed JDBC Connection from DataSource");
				conHolder.setConnection(dataSource.getConnection());
			}
			return conHolder.getConnection();
		}
		// Else we either got no holder or an empty thread-bound holder here.
		// 获取连接
		logger.debug("Fetching JDBC Connection from DataSource");
		Connection con = dataSource.getConnection();
		// 事务的场景下，才会复用连接
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
      // 第一次进来的时候ThreadLocal里是没有ConnectionHolder的，这里需要获取连接，然后注册给spring管理
			logger.debug("Registering transaction synchronization for JDBC Connection");
			// Use same Connection for further JDBC actions within the transaction.
			// Thread-bound object will get removed by synchronization at transaction completion.
			ConnectionHolder holderToUse = conHolder;
			if (holderToUse == null) {
				holderToUse = new ConnectionHolder(con);
			}
			else {
				holderToUse.setConnection(con);
			}
      // 引用计数+1
      // referenceCount++
			holderToUse.requested();
      // 注册回调处理函数，事务状态发生变化时，会处理connHolder
			TransactionSynchronizationManager.registerSynchronization(
					new ConnectionSynchronization(holderToUse, dataSource));
			holderToUse.setSynchronizedWithTransaction(true);
			if (holderToUse != conHolder) {
        // 绑定到ThreadLocal
				TransactionSynchronizationManager.bindResource(dataSource, holderToUse);
			}
		}
		
		return con;
	}

// org.springframework.jdbc.datasource.DataSourceUtils#releaseConnection
/**
	 * Close the given Connection, obtained from the given DataSource,
	 * if it is not managed externally (that is, not bound to the thread).
	 * @param con the Connection to close if necessary
	 * (if this is {@code null}, the call will be ignored)
	 * @param dataSource the DataSource that the Connection was obtained from
	 * (may be {@code null})
	 * @see #getConnection
	 */
public static void releaseConnection(Connection con, DataSource dataSource) {
  try {
    doReleaseConnection(con, dataSource);
  }
  catch (SQLException ex) {
    logger.debug("Could not close JDBC Connection", ex);
  }
  catch (Throwable ex) {
    logger.debug("Unexpected exception on closing JDBC Connection", ex);
  }
}


public static void doReleaseConnection(Connection con, DataSource dataSource) throws SQLException {
  if (con == null) {
    return;
  }
  if (dataSource != null) {
    ConnectionHolder conHolder = (ConnectionHolder) TransactionSynchronizationManager.getResource(dataSource);
    if (conHolder != null && connectionEquals(conHolder, con)) {
      // It's the transactional Connection: Don't close it.
      // 事务连接，这里只是减少计数，实际的释放在事务完成之后，在ConnectionSynchronization中处理的
      // referenceCount--
      conHolder.released();
      return;
    }
  }
  logger.debug("Returning JDBC Connection to DataSource");
  // 非事务连接，直接关闭
  doCloseConnection(con, dataSource);
}
```

#### ConnectionSynchronization

最终实现了`TransactionSynchronization`接口，`AbstractPlatformTransactionManager`接口会在当前事务状态发生变化（比如挂起，完成等）通知`TransactionSynchronization`。对于事务连接的关闭就是在`ConnectionSynchronization`接口中

```java
// org.springframework.jdbc.datasource.DataSourceUtils.ConnectionSynchronization
/**
	 * Callback for resource cleanup at the end of a non-native JDBC transaction
	 * (e.g. when participating in a JtaTransactionManager transaction).
	 * @see org.springframework.transaction.jta.JtaTransactionManager
	 */
	private static class ConnectionSynchronization extends TransactionSynchronizationAdapter {

		private final ConnectionHolder connectionHolder;

		private final DataSource dataSource;

		private int order;

		private boolean holderActive = true;

		public ConnectionSynchronization(ConnectionHolder connectionHolder, DataSource dataSource) {
			this.connectionHolder = connectionHolder;
			this.dataSource = dataSource;
			this.order = getConnectionSynchronizationOrder(dataSource);
		}

		@Override
		public int getOrder() {
			return this.order;
		}

		@Override
		public void suspend() {
      // 比如事务的传播行为是REQUEST_NEW，每次都会创建一个新连接，
      // 会挂起当前的事务，当事务挂起的时候，就会回调到这里
      // conn在ThreadLocal中的缓存形式是  dataSource -> conn
      // 所以这里要先把之前的conn给unbind掉，新的连接才能正常的工作
			if (this.holderActive) {
        // dataSource -> conn 清除上一个事务对应的连接
				TransactionSynchronizationManager.unbindResource(this.dataSource);
        // isOpen就是看引用技术是否大于0，如果大于0标识还有人在用，这里不会关闭
				if (this.connectionHolder.hasConnection() && !this.connectionHolder.isOpen()) {
					// Release Connection on suspend if the application doesn't keep
					// a handle to it anymore. We will fetch a fresh Connection if the
					// application accesses the ConnectionHolder again after resume,
					// assuming that it will participate in the same transaction.
					releaseConnection(this.connectionHolder.getConnection(), this.dataSource);
					this.connectionHolder.setConnection(null);
				}
			}
		}

		@Override
		public void resume() {
			if (this.holderActive) {
        // 恢复当前事务时，要把当前事务的connHolder恢复
				TransactionSynchronizationManager.bindResource(this.dataSource, this.connectionHolder);
			}
		}

		@Override
		public void beforeCompletion() {
			// Release Connection early if the holder is not open anymore
			// (that is, not used by another resource like a Hibernate Session
			// that has its own cleanup via transaction synchronization),
			// to avoid issues with strict JTA implementations that expect
			// the close call before transaction completion.
      // 事务完成之前
      // 这个阶段如果conn已经没有引用了，就直接关闭
			if (!this.connectionHolder.isOpen()) {
				TransactionSynchronizationManager.unbindResource(this.dataSource);
				this.holderActive = false;
				if (this.connectionHolder.hasConnection()) {
					releaseConnection(this.connectionHolder.getConnection(), this.dataSource);
				}
			}
		}

		@Override
		public void afterCompletion(int status) {
			// If we haven't closed the Connection in beforeCompletion,
			// close it now. The holder might have been used for other
			// cleanup in the meantime, for example by a Hibernate Session.
			if (this.holderActive) {
				// The thread-bound ConnectionHolder might not be available anymore,
				// since afterCompletion might get called from a different thread.
				TransactionSynchronizationManager.unbindResourceIfPossible(this.dataSource);
        // 置为非活跃
				this.holderActive = false;
				if (this.connectionHolder.hasConnection()) {
					releaseConnection(this.connectionHolder.getConnection(), this.dataSource);
					// Reset the ConnectionHolder: It might remain bound to the thread.
					this.connectionHolder.setConnection(null);
				}
			}
      // 清空当前holder的状态
			this.connectionHolder.reset();
		}
	}
```

