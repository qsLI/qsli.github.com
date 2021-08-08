---
title: mybatis源码解析（二）—— 代理类生成分析
tags: mybatis
category: mybatis
toc: true
typora-root-url: mybatis-detail-02
typora-copy-images-to: mybatis-detail-02
date: 2021-03-19 17:09:51
---



mybatis虽然支持直接使用SqlSession来操作db，

```java
final List<Object> selectAll = sqlSession.selectList("selectAll", null, new RowBounds(10, 20));
```

但是这种方式缺乏**类型安全**，参数传递的过程容易出错。

## 使用代理类

mybatis还支持生成代理类的方式来使用：

```xml
<mapper namespace="com.air.mybatis.sqlsession.WordsDao">
    <select id="selectAll" fetchSize="3" resultSetType="SCROLL_INSENSITIVE" resultType="com.air.mybatis.sqlsession.WordEntity">
       select * from words
    </select>
</mapper>
```

注意，namespace必须是`WordsDao`

```java
package com.air.mybatis.sqlsession;

import org.apache.ibatis.session.RowBounds;

import java.util.List;

/**
 * @author 代故
 * @date 2021/3/19 2:36 PM
 */
public interface WordsDao {

    List<WordEntity> selectAll(RowBounds rowBounds);
}
```

测试代码：

```java
// com.air.mybatis.sqlsession.SqlSessionTest#testProxy
@Test
@SneakyThrows
public void testProxy() {
  try (Reader reader = Resources.getResourceAsReader("mybatis-config.xml")) {
    //创建SqlSessionFactory
    SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(reader);
    //获取SqlSession
    try (SqlSession sqlSession = sqlSessionFactory.openSession()) {
      final WordsDao mapper = sqlSession.getMapper(WordsDao.class);
      final List<WordEntity> wordEntities = mapper.selectAll(new RowBounds(1, 10));
      System.out.println("words = " + wordEntities);
    }
  }
}
```

## 源码分析

### 代理类生成过程

{% plantuml %}

@startuml



actor client

participant SqlSession

participant Configuration

participant MapperRegistry

participant MapperProxyFactory

participant MapperProxy

participant Proxy





==  代理类生成过程 ==

client -> SqlSession: getMapper(WordsDao.class)

SqlSession -> Configuration: getMapper(WordsDao.class)

Configuration -> MapperRegistry: getMapper(WordsDao.class, sqlSession)

MapperRegistry -> MapperProxyFactory: newInstance()

MapperProxyFactory -> MapperProxy: new

MapperProxyFactory -> Proxy: newProxyInstance()



Proxy --> MapperProxyFactory: WordsDao

MapperProxyFactory --> MapperRegistry: WordsDao

MapperRegistry --> Configuration: WordsDao

Configuration --> SqlSession: WordsDao

SqlSession --> client: WordsDao

@enduml

{% endplantuml %}

先从`sqlSession.getMapper(WordsDao.class);`入手，看看大概：

```java
// org.apache.ibatis.session.defaults.DefaultSqlSession#getMapper
@Override
public <T> T getMapper(Class<T> type) {
  return configuration.getMapper(type, this);
}

// org.apache.ibatis.session.Configuration#getMapper
public <T> T getMapper(Class<T> type, SqlSession sqlSession) {
  return mapperRegistry.getMapper(type, sqlSession);
}

// org.apache.ibatis.binding.MapperRegistry#getMapper
private final Map<Class<?>, MapperProxyFactory<?>> knownMappers = new HashMap<>();
@SuppressWarnings("unchecked")
public <T> T getMapper(Class<T> type, SqlSession sqlSession) {
  // 拿到类型对应的工厂类
  final MapperProxyFactory<T> mapperProxyFactory = (MapperProxyFactory<T>) knownMappers.get(type);
  if (mapperProxyFactory == null) {
    throw new BindingException("Type " + type + " is not known to the MapperRegistry.");
  }
  try {
    // 生成代理类
    return mapperProxyFactory.newInstance(sqlSession);
  } catch (Exception e) {
    throw new BindingException("Error getting mapper instance. Cause: " + e, e);
  }
}

// org.apache.ibatis.binding.MapperProxyFactory
/**
 * @author Lasse Voss
 */
public class MapperProxyFactory<T> {

  private final Class<T> mapperInterface;
  private final Map<Method, MapperMethodInvoker> methodCache = new ConcurrentHashMap<>();

  public MapperProxyFactory(Class<T> mapperInterface) {
    this.mapperInterface = mapperInterface;
  }

  public Class<T> getMapperInterface() {
    return mapperInterface;
  }

  public Map<Method, MapperMethodInvoker> getMethodCache() {
    return methodCache;
  }

  // 创建JDK代理对象，实际的调用委托给mapperProxy
  @SuppressWarnings("unchecked")
  protected T newInstance(MapperProxy<T> mapperProxy) {
    return (T) Proxy.newProxyInstance(mapperInterface.getClassLoader(), new Class[] { mapperInterface }, mapperProxy);
  }

  // 这里是入口
  public T newInstance(SqlSession sqlSession) {
    final MapperProxy<T> mapperProxy = new MapperProxy<>(sqlSession, mapperInterface, methodCache);
    // 创建JDK代理对象，实际的调用委托给mapperProxy
    return newInstance(mapperProxy);
  }
}
```

客户端最终拿到的是一个`MapperProxy`的代理对象（`com.sun.proxy.$Proxy6`），下面看看调用过程的逻辑：

{% plantuml%}

actor client

participant WordsDao

participant MapperProxy

participant MapperMethodInvoker

participant MapperMethod

participant SqlSession





==  代理逻辑过程 ==

client -> WordsDao: selectAll()

WordsDao -> MapperProxy: invoke()

MapperProxy -> MapperMethodInvoker: invoke()

MapperMethodInvoker -> MapperMethod: new

activate MapperMethod

MapperMethod -> SqlCommand: new

activate SqlCommand

SqlCommand -> SqlCommand: resolveMappedStatement

SqlCommand -> Configuration: getMappedStatement(mapperInterface.getName() + "." + methodName;) 

Configuration --> SqlCommand: MappedStatement

deactivate SqlCommand

SqlCommand --> MapperMethod: SqlCommand

MapperMethod --> MapperMethodInvoker

MapperMethodInvoker -> MapperMethod: execute()

MapperMethod -> ParamNameResolver: convertArgsToSqlCommandParam

ParamNameResolver --> MapperMethod: param

MapperMethod -> SqlSession: insert | update | delete | select

deactivate MapperMethod

{% endplantuml%}

```java
// org.apache.ibatis.binding.MapperProxy#invoke
@Override
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
  try {
    if (Object.class.equals(method.getDeclaringClass())) {
      return method.invoke(this, args);
    } else {
      // 调用对应Invoker的invoke方法
      // public abstract java.util.List com.air.mybatis.sqlsession.WordsDao.selectAll(org.apache.ibatis.session.RowBounds)
      return cachedInvoker(method).invoke(proxy, method, args, sqlSession);
    }
  } catch (Throwable t) {
    throw ExceptionUtil.unwrapThrowable(t);
  }
}

private MapperMethodInvoker cachedInvoker(Method method) throws Throwable {
  try {
    // 首次调用会生成一个MethodInvoker
    return methodCache.computeIfAbsent(method, m -> {
      if (m.isDefault()) {
        try {
          if (privateLookupInMethod == null) {
            return new DefaultMethodInvoker(getMethodHandleJava8(method));
          } else {
            return new DefaultMethodInvoker(getMethodHandleJava9(method));
          }
        } catch (IllegalAccessException | InstantiationException | InvocationTargetException
                 | NoSuchMethodException e) {
          throw new RuntimeException(e);
        }
      } else {
        // 逻辑都在MapperMethod中
        return new PlainMethodInvoker(new MapperMethod(mapperInterface, method, sqlSession.getConfiguration()));
      }
    });
  } catch (RuntimeException re) {
    Throwable cause = re.getCause();
    throw cause == null ? re : cause;
  }
}


// org.apache.ibatis.binding.MapperMethod#execute

  public Object execute(SqlSession sqlSession, Object[] args) {
    Object result;
    switch (command.getType()) {
      case INSERT: {
        // 转换成sqlSession需要的采纳数
        Object param = method.convertArgsToSqlCommandParam(args);
        // 调用底层sqlSession的insert方法，并包装返回结果
        result = rowCountResult(sqlSession.insert(command.getName(), param));
        break;
      }
      case UPDATE: {
        Object param = method.convertArgsToSqlCommandParam(args);
        result = rowCountResult(sqlSession.update(command.getName(), param));
        break;
      }
      case DELETE: {
        Object param = method.convertArgsToSqlCommandParam(args);
        result = rowCountResult(sqlSession.delete(command.getName(), param));
        break;
      }
      case SELECT:
        if (method.returnsVoid() && method.hasResultHandler()) {
          executeWithResultHandler(sqlSession, args);
          result = null;
        } else if (method.returnsMany()) {
          result = executeForMany(sqlSession, args);
        } else if (method.returnsMap()) {
          result = executeForMap(sqlSession, args);
        } else if (method.returnsCursor()) {
          result = executeForCursor(sqlSession, args);
        } else {
          Object param = method.convertArgsToSqlCommandParam(args);
          result = sqlSession.selectOne(command.getName(), param);
          if (method.returnsOptional()
              && (result == null || !method.getReturnType().equals(result.getClass()))) {
            result = Optional.ofNullable(result);
          }
        }
        break;
      case FLUSH:
        result = sqlSession.flushStatements();
        break;
      default:
        throw new BindingException("Unknown execution method for: " + command.getName());
    }
    if (result == null && method.getReturnType().isPrimitive() && !method.returnsVoid()) {
      throw new BindingException("Mapper method '" + command.getName()
          + " attempted to return null from a method with a primitive return type (" + method.getReturnType() + ").");
    }
    return result;
  }

// 增删改的返回结果， rowCount就是SqlSession返回的影响的行数
// org.apache.ibatis.binding.MapperMethod#rowCountResult
private Object rowCountResult(int rowCount) {
  final Object result;
  if (method.returnsVoid()) {
    result = null;
  } else if (Integer.class.equals(method.getReturnType()) || Integer.TYPE.equals(method.getReturnType())) {
    result = rowCount;
  } else if (Long.class.equals(method.getReturnType()) || Long.TYPE.equals(method.getReturnType())) {
    result = (long)rowCount;
  } else if (Boolean.class.equals(method.getReturnType()) || Boolean.TYPE.equals(method.getReturnType())) {
    // 可以转成boolean类型的
    result = rowCount > 0;
  } else {
    throw new BindingException("Mapper method '" + command.getName() + "' has an unsupported return type: " + method.getReturnType());
  }
  return result;
}
```

### 注册代理类

{% plantuml %}

actor client

participant SqlSessionFactoryBuilder

participant XMLConfigBuilder

participant XMLMapperBuilder

participant Configuration

participant Configuration

participant MapperRegistry





==  代理类注册过程 ==

client -> SqlSessionFactoryBuilder: build()

SqlSessionFactoryBuilder -> XMLConfigBuilder: parse()

XMLConfigBuilder -> XMLMapperBuilder: parse()

activate XMLMapperBuilder

XMLMapperBuilder -> XMLMapperBuilder: bindMapperForNamespace()

XMLMapperBuilder -> Configuration: addMapper()

deactivate XMLMapperBuilder

Configuration -> MapperRegistry: addMapper()

activate MapperRegistry

MapperRegistry -> MapperProxyFactory: new MapperProxyFactory<>(WordsDao.class)

MapperRegistry -> MapperRegistry: put into knownMappers

deactivate MapperRegistry

{% endplantuml%}

```java
// org.apache.ibatis.builder.xml.XMLMapperBuilder#bindMapperForNamespace
private void bindMapperForNamespace() {
  String namespace = builderAssistant.getCurrentNamespace();
  if (namespace != null) {
    Class<?> boundType = null;
    try {
      boundType = Resources.classForName(namespace);
    } catch (ClassNotFoundException e) {
      //ignore, bound type is not required
    }
    // 如果namespace是一个类，比如WordsDao，就加到Mapper的Registry中
    if (boundType != null) {
      if (!configuration.hasMapper(boundType)) {
        // Spring may not know the real resource name so we set a flag
        // to prevent loading again this resource from the mapper interface
        // look at MapperAnnotationBuilder#loadXmlResource
        configuration.addLoadedResource("namespace:" + namespace);
        configuration.addMapper(boundType);
      }
    }
  }
}

// org.apache.ibatis.binding.MapperRegistry#addMapper
public <T> void addMapper(Class<T> type) {
  if (type.isInterface()) {
    if (hasMapper(type)) {
      throw new BindingException("Type " + type + " is already known to the MapperRegistry.");
    }
    boolean loadCompleted = false;
    try {
      knownMappers.put(type, new MapperProxyFactory<>(type));
      // It's important that the type is added before the parser is run
      // otherwise the binding may automatically be attempted by the
      // mapper parser. If the type is already known, it won't try.
      MapperAnnotationBuilder parser = new MapperAnnotationBuilder(config, type);
      parser.parse();
      loadCompleted = true;
    } finally {
      if (!loadCompleted) {
        knownMappers.remove(type);
      }
    }
  }
}
```



## 参考

- [浅析MyBatis的动态代理原理](https://juejin.cn/post/6844903841163378701)

