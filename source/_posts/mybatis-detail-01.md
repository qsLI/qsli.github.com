---
title: mybatis源码解析（一）
tags: mybatis
category: mybatis
toc: true
typora-root-url: mybatis-detail-01
typora-copy-images-to: mybatis-detail-01
date: 2021-03-18 20:31:01
---



# 基础组件

![image-20210318200117139](/image-20210318200117139.png)

## SqlSession

SqlSession是mybatis面向用户的一个类，使用如下：

```java
@Test
@SneakyThrows
public void testSelect() {
  try (Reader reader = Resources.getResourceAsReader("mybatis-config.xml")) {
    //创建SqlSessionFactory
    SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(reader);
    //获取SqlSession
    SqlSession sqlSession = sqlSessionFactory.openSession();
    //执行Sql
    final List<Object> selectAll = sqlSession.selectList("selectAll", null, new RowBounds(10,20));
    System.out.println("selectAll = " + selectAll);
  }
}
```
`SqlSession`创建过程:

![spring-tx-SqlSession](/spring-tx-SqlSession.jpg)

执行过程：

![spring-tx-selectList](/spring-tx-selectList-6069717.jpg)

## Executor

这一层提供的接口主要是针对`MappedStatement`的:

```java
/**
 * @author Clinton Begin
 */
public interface Executor {

  ResultHandler NO_RESULT_HANDLER = null;

  int update(MappedStatement ms, Object parameter) throws SQLException;

  <E> List<E> query(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, CacheKey cacheKey, BoundSql boundSql) throws SQLException;

  <E> List<E> query(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler) throws SQLException;

  <E> Cursor<E> queryCursor(MappedStatement ms, Object parameter, RowBounds rowBounds) throws SQLException;

  List<BatchResult> flushStatements() throws SQLException;

  void commit(boolean required) throws SQLException;

  void rollback(boolean required) throws SQLException;

  CacheKey createCacheKey(MappedStatement ms, Object parameterObject, RowBounds rowBounds, BoundSql boundSql);

  boolean isCached(MappedStatement ms, CacheKey key);

  void clearLocalCache();

  void deferLoad(MappedStatement ms, MetaObject resultObject, String property, CacheKey key, Class<?> targetType);

  Transaction getTransaction();

  void close(boolean forceRollback);

  boolean isClosed();

  void setExecutorWrapper(Executor executor);

}
```



![image-20210318154049840](/image-20210318154049840.png)

### 结果缓存

![img](/20141123125616381.png)

在创建Session的时候，可以指定使用哪种executor

```java
// org.apache.ibatis.session.Configuration#newExecutor(org.apache.ibatis.transaction.Transaction, org.apache.ibatis.session.ExecutorType)
public Executor newExecutor(Transaction transaction, ExecutorType executorType) {
  executorType = executorType == null ? defaultExecutorType : executorType;
  executorType = executorType == null ? ExecutorType.SIMPLE : executorType;
  Executor executor;
  if (ExecutorType.BATCH == executorType) {
    executor = new BatchExecutor(this, transaction);
  } else if (ExecutorType.REUSE == executorType) {
    // 缓存PreparedStatement
    executor = new ReuseExecutor(this, transaction);
  } else {
    executor = new SimpleExecutor(this, transaction);
  }
  // 如果开启了二级缓存，就用CachingExecutor装饰下
  if (cacheEnabled) {
    executor = new CachingExecutor(executor);
  }
  // 插件机制，后面会详细讲
  executor = (Executor) interceptorChain.pluginAll(executor);
  return executor;
}
```



#### Session级别的缓存（一级缓存）

**一级缓存默认打开**

> MyBatis的一级缓存最大范围是SqlSession内部，有多个SqlSession或者分布式的环境下，**数据库写操作会引起脏数据**，建议设定缓存级别为Statement。

```java
configuration.setLocalCacheScope(LocalCacheScope.valueOf(props.getProperty("localCacheScope", "SESSION")));
```

没有配置默认就是session级别的，配置示例：

```xml
<setting name="localCacheScope" value="SESSION"/>
```

Executor是跟session绑定的，所以这个缓存是session级别的，也就是连接级别的。连接关闭之后，这个缓存也就消失了。

```java
// org.apache.ibatis.executor.BaseExecutor#query(org.apache.ibatis.mapping.MappedStatement, java.lang.Object, org.apache.ibatis.session.RowBounds, org.apache.ibatis.session.ResultHandler)
@Override
public <E> List<E> query(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler) throws SQLException {
  BoundSql boundSql = ms.getBoundSql(parameter);
  CacheKey key = createCacheKey(ms, parameter, rowBounds, boundSql);
  return query(ms, parameter, rowBounds, resultHandler, key, boundSql);
}


// org.apache.ibatis.executor.BaseExecutor#query(org.apache.ibatis.mapping.MappedStatement, java.lang.Object, org.apache.ibatis.session.RowBounds, org.apache.ibatis.session.ResultHandler, org.apache.ibatis.cache.CacheKey, org.apache.ibatis.mapping.BoundSql)
@Override
public <E> List<E> query(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, CacheKey key, BoundSql boundSql) throws SQLException {
  ErrorContext.instance().resource(ms.getResource()).activity("executing a query").object(ms.getId());
  if (closed) {
    throw new ExecutorException("Executor was closed.");
  }
  if (queryStack == 0 && ms.isFlushCacheRequired()) {
    clearLocalCache();
  }
  List<E> list;
  try {
    queryStack++;
    // 从缓存中取
    list = resultHandler == null ? (List<E>) localCache.getObject(key) : null;
    if (list != null) {
      // 处理缓存的结果
      handleLocallyCachedOutputParameters(ms, key, parameter, boundSql);
    } else {
      list = queryFromDatabase(ms, parameter, rowBounds, resultHandler, key, boundSql);
    }
  } finally {
    queryStack--;
  }
  if (queryStack == 0) {
    for (DeferredLoad deferredLoad : deferredLoads) {
      deferredLoad.load();
    }
    // issue #601
    deferredLoads.clear();
    if (configuration.getLocalCacheScope() == LocalCacheScope.STATEMENT) {
      // issue #482
      clearLocalCache();
    }
  }
  return list;
}

// org.apache.ibatis.executor.BaseExecutor#queryFromDatabase
private <E> List<E> queryFromDatabase(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, CacheKey key, BoundSql boundSql) throws SQLException {
  List<E> list;
  // 占位
  localCache.putObject(key, EXECUTION_PLACEHOLDER);
  try {
    list = doQuery(ms, parameter, rowBounds, resultHandler, boundSql);
  } finally {
    // 清空缓存
    localCache.removeObject(key);
  }
  // 更新缓存
  localCache.putObject(key, list);
  if (ms.getStatementType() == StatementType.CALLABLE) {
    localOutputParameterCache.putObject(key, parameter);
  }
  return list;
}
```

#### Statement级别的缓存（二级缓存）

`CachingExecutor`加了一层`Statement`级别的缓存，其他的逻辑都是委托给其他的Executor来实现的。

```java
// org.apache.ibatis.executor.CachingExecutor#query(org.apache.ibatis.mapping.MappedStatement, java.lang.Object, org.apache.ibatis.session.RowBounds, org.apache.ibatis.session.ResultHandler, org.apache.ibatis.cache.CacheKey, org.apache.ibatis.mapping.BoundSql)
@Override
public <E> List<E> query(MappedStatement ms, Object parameterObject, RowBounds rowBounds, ResultHandler resultHandler, CacheKey key, BoundSql boundSql)
  throws SQLException {
  // statement 级别的cache，可以在配置文件中开启
  Cache cache = ms.getCache();
  if (cache != null) {
    flushCacheIfRequired(ms);
    if (ms.isUseCache() && resultHandler == null) {
      ensureNoOutParams(ms, boundSql);
      @SuppressWarnings("unchecked")
      List<E> list = (List<E>) tcm.getObject(cache, key);
      // 缓存未命中
      if (list == null) {
        // 委托给底层进行查询
        list = delegate.query(ms, parameterObject, rowBounds, resultHandler, key, boundSql);
        // 加入缓存
        tcm.putObject(cache, key, list); // issue #578 and #116
      }
      return list;
    }
  }
  // 未开启缓存，直接委托给底层的实现
  return delegate.query(ms, parameterObject, rowBounds, resultHandler, key, boundSql);
}
```

实际处理类的逻辑:

```java
// org.apache.ibatis.executor.SimpleExecutor#doQuery
@Override
public <E> List<E> doQuery(MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, BoundSql boundSql) throws SQLException {
  Statement stmt = null;
  try {
    Configuration configuration = ms.getConfiguration();
    // 创建StatementHandler
    StatementHandler handler = configuration.newStatementHandler(wrapper, ms, parameter, rowBounds, resultHandler, boundSql);
    // 把配置的一些属性，传递个对应的Statement, 比如fetchSize， timeout等
    stmt = prepareStatement(handler, ms.getStatementLog());
    // 委托StatementHandler查询
    return handler.query(stmt, resultHandler);
  } finally {
    closeStatement(stmt);
  }
}
```

Cache的实现使用了装饰者模式：

> SynchronizedCache -> LoggingCache -> SerializedCache -> LruCache -> PerpetualCache
>
> 以下是具体这些Cache实现类的介绍，他们的组合为Cache赋予了不同的能力。
>
> - `SynchronizedCache`：同步Cache，实现比较简单，直接使用synchronized修饰方法。
> - `LoggingCache`：日志功能，装饰类，用于记录缓存的命中率，如果开启了DEBUG模式，则会输出命中率日志。
> - `SerializedCache`：序列化功能，将值序列化后存到缓存中。该功能用于缓存返回一份实例的Copy，用于保存线程安全。
> - `LruCache`：采用了Lru算法的Cache实现，移除最近最少使用的Key/Value。
> - `PerpetualCache`： 作为为最基础的缓存类，底层实现比较简单，直接使用了HashMap。

二级缓存跨session存在，有很大的风险会读到错误的数据。而且大部分的互联网应用都是分布式的，一般不共享状态，可以水平扩展；但是本地缓存打破了无状态下，很有可能会读到错误的数据，应该慎重使用。

### PreparedStatement缓存（PSCache）

又叫`PSCache`，这里对应的是`ReuseExecutor`，这个缓存也是Session级别的。除了在Mybatis这一层做缓存，还可以在MySQL驱动和MysqlServer做缓存，参见[jdbc预编译缓存加速sql执行 | KL's blog](https://qsli.github.io/2020/05/05/cache-prep-stmts/#cachePrepStmts%E5%92%8CuseServerPrepStmts%E5%90%8C%E6%97%B6%E6%89%93%E5%BC%80)

```java
// org.apache.ibatis.executor.ReuseExecutor#prepareStatement
private Statement prepareStatement(StatementHandler handler, Log statementLog) throws SQLException {
  Statement stmt;
  BoundSql boundSql = handler.getBoundSql();
  String sql = boundSql.getSql();
  if (hasStatementFor(sql)) {
    // 从缓存中取
    stmt = getStatement(sql);
    applyTransactionTimeout(stmt);
  } else {
    Connection connection = getConnection(statementLog);
    stmt = handler.prepare(connection, transaction.getTimeout());
    putStatement(sql, stmt);
  }
  handler.parameterize(stmt);
  return stmt;
}

// private final Map<String, Statement> statementMap = new HashMap<String, Statement>();
private boolean hasStatementFor(String sql) {
  try {
    return statementMap.keySet().contains(sql) && !statementMap.get(sql).getConnection().isClosed();
  } catch (SQLException e) {
    return false;
  }
}

private Statement getStatement(String s) {
  return statementMap.get(s);
}

private void putStatement(String sql, Statement stmt) {
  statementMap.put(sql, stmt);
}
```

## StatementHandler

`StatementHandler`主要是跟`javax`里`的Statement`打交道的，相当于对`Statement`的操作进行了一层封装，也是`mybatis`和`jdbc`的一个隔离层。

接口：

```java
/**
 * @author Clinton Begin
 */
public interface StatementHandler {

  Statement prepare(Connection connection, Integer transactionTimeout)
      throws SQLException;

  void parameterize(Statement statement)
      throws SQLException;

  void batch(Statement statement)
      throws SQLException;

  int update(Statement statement)
      throws SQLException;

  <E> List<E> query(Statement statement, ResultHandler resultHandler)
      throws SQLException;

  <E> Cursor<E> queryCursor(Statement statement)
      throws SQLException;

  BoundSql getBoundSql();

  ParameterHandler getParameterHandler();

}
```

可以看出，接口中的参数，都是`Statement`而不是`mybatis`自己的`MappedStatement`

继承关系：

![image-20210318153611468](/image-20210318153611468.png)

其中`RoutingStatementHandler`就是用来路由的，根据查询的类型路由到`SimpleStatementHandler`、`CallableStatementHandler`、`PreparedStatementHandler`

```java
public RoutingStatementHandler(Executor executor, MappedStatement ms, Object parameter, RowBounds rowBounds, ResultHandler resultHandler, BoundSql boundSql) {

  switch (ms.getStatementType()) {
    case STATEMENT:
      delegate = new SimpleStatementHandler(executor, ms, parameter, rowBounds, resultHandler, boundSql);
      break;
    case PREPARED:
      delegate = new PreparedStatementHandler(executor, ms, parameter, rowBounds, resultHandler, boundSql);
      break;
    case CALLABLE:
      delegate = new CallableStatementHandler(executor, ms, parameter, rowBounds, resultHandler, boundSql);
      break;
    default:
      throw new ExecutorException("Unknown statement type: " + ms.getStatementType());
  }
}
```



## TypeHandler

`TypeHandler`主要负责类型转换，类似spring的`ConversionService`, 主要用于两个地方，一个是设置`PrepareStatement`，占位符对应的参数；一个是将ResultSet返回的结果集转换成对象。

```java
/**
 * @author Clinton Begin
 */
public interface TypeHandler<T> {

  void setParameter(PreparedStatement ps, int i, T parameter, JdbcType jdbcType) throws SQLException;

  T getResult(ResultSet rs, String columnName) throws SQLException;

  T getResult(ResultSet rs, int columnIndex) throws SQLException;

  T getResult(CallableStatement cs, int columnIndex) throws SQLException;

}
```

#### ParameterHandler

比如数据库里面存的是`VARCHAR`，传给mybatis的是一个`Bean`对象，就可以在这一层做一个转换：

```java
@Override
public void setNonNullParameter(PreparedStatement ps, int i, T parameter, JdbcType jdbcType) throws SQLException {

  try {
    // Bean -> json string
    ps.setString(i, ObjectUtil.toJson(parameter));
  } catch (JsonProcessingException e) {
    throw new RuntimeException(e);
  }
}
```

默认实现`org.apache.ibatis.scripting.defaults.DefaultParameterHandler`

```java
// org.apache.ibatis.scripting.defaults.DefaultParameterHandler#setParameters
@Override
public void setParameters(PreparedStatement ps) {
  ErrorContext.instance().activity("setting parameters").object(mappedStatement.getParameterMap().getId());
  List<ParameterMapping> parameterMappings = boundSql.getParameterMappings();
  if (parameterMappings != null) {
    for (int i = 0; i < parameterMappings.size(); i++) {
      ParameterMapping parameterMapping = parameterMappings.get(i);
      if (parameterMapping.getMode() != ParameterMode.OUT) {
        Object value;
        String propertyName = parameterMapping.getProperty();
        if (boundSql.hasAdditionalParameter(propertyName)) { // issue #448 ask first for additional params
          value = boundSql.getAdditionalParameter(propertyName);
        } else if (parameterObject == null) {
          value = null;
        } else if (typeHandlerRegistry.hasTypeHandler(parameterObject.getClass())) {
          value = parameterObject;
        } else {
          MetaObject metaObject = configuration.newMetaObject(parameterObject);
          value = metaObject.getValue(propertyName);
        }
        // 拿到参数对应的TypeHandler，通过<JavaType, JDBC Type> --> TypeHandler， 解析的时候就确定了
        TypeHandler typeHandler = parameterMapping.getTypeHandler();
        JdbcType jdbcType = parameterMapping.getJdbcType();
        if (value == null && jdbcType == null) {
          jdbcType = configuration.getJdbcTypeForNull();
        }
        try {
          // 使用typeHandler做类型转换
          typeHandler.setParameter(ps, i + 1, value, jdbcType);
        } catch (TypeException e) {
          throw new TypeException("Could not set parameters for mapping: " + parameterMapping + ". Cause: " + e, e);
        } catch (SQLException e) {
          throw new TypeException("Could not set parameters for mapping: " + parameterMapping + ". Cause: " + e, e);
        }
      }
    }
  }
}
```

#### ResultSetHandler

用于转换`JDBC`返回的`ResultSet`对象为`Statement`中定义的返回值类型。

```java
/**
 * @author Clinton Begin
 */
// 处理批量
public interface ResultSetHandler {

  <E> List<E> handleResultSets(Statement stmt) throws SQLException;

  <E> Cursor<E> handleCursorResultSets(Statement stmt) throws SQLException;

  void handleOutputParameters(CallableStatement cs) throws SQLException;

}

/**
 * @author Clinton Begin
 */
// 处理单个
public interface ResultHandler<T> {

  void handleResult(ResultContext<? extends T> resultContext);

}
```

默认实现：

```java
// org.apache.ibatis.executor.resultset.DefaultResultSetHandler#handleResultSet
// for循环中调用
private void handleResultSet(ResultSetWrapper rsw, ResultMap resultMap, List<Object> multipleResults, ResultMapping parentMapping) throws SQLException {
  try {
    if (parentMapping != null) {
      handleRowValues(rsw, resultMap, null, RowBounds.DEFAULT, parentMapping);
    } else {
      if (resultHandler == null) {
        // 默认的ResultHandler
        DefaultResultHandler defaultResultHandler = new DefaultResultHandler(objectFactory);
        handleRowValues(rsw, resultMap, defaultResultHandler, rowBounds, null);
        multipleResults.add(defaultResultHandler.getResultList());
      } else {
        handleRowValues(rsw, resultMap, resultHandler, rowBounds, null);
      }
    }
  } finally {
    // issue #228 (close resultsets)
    closeResultSet(rsw.getResultSet());
  }
}

// org.apache.ibatis.executor.resultset.DefaultResultSetHandler#createUsingConstructor
private Object createUsingConstructor(ResultSetWrapper rsw, Class<?> resultType, List<Class<?>> constructorArgTypes, List<Object> constructorArgs, Constructor<?> constructor) throws SQLException {
  boolean foundValues = false;
  for (int i = 0; i < constructor.getParameterTypes().length; i++) {
    Class<?> parameterType = constructor.getParameterTypes()[i];
    String columnName = rsw.getColumnNames().get(i);
    // 获取对应的TypeHandler
    TypeHandler<?> typeHandler = rsw.getTypeHandler(parameterType, columnName);
    // 转换类型
    Object value = typeHandler.getResult(rsw.getResultSet(), columnName);
    constructorArgTypes.add(parameterType);
    constructorArgs.add(value);
    foundValues = value != null || foundValues;
  }
  return foundValues ? objectFactory.create(resultType, constructorArgTypes, constructorArgs) : null;
}
```



# 参考

- [《深入理解mybatis原理》 MyBatis的二级缓存的设计原理_我的程序人生(亦山札记)-CSDN博客_mybatis二级缓存原理](https://blog.csdn.net/luanlouis/article/details/41408341)
- [你真的懂Mybatis缓存机制吗-云栖社区-阿里云](https://yq.aliyun.com/articles/608941)
- [聊聊MyBatis缓存机制 - 美团技术团队](https://tech.meituan.com/2018/01/19/mybatis-cache.html)
- [面试官问: MyBatis SQL是如何执行的？把这篇文章甩给他](https://mp.weixin.qq.com/s/Rac7SPZnujq73lb0tcQULA)
- [MyBatis 的秘密（二）Executor – 邓承超的个人日志](http://dengchengchao.com/?p=1190)

