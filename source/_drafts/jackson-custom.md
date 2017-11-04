---
title: jackson_custom
tags: jackson
category: jackson
toc: true
abbrlink: 18103
---

## 模块

jackson主要有三个模块： `jackson-core`, `jackson-databind`, `jackson-annotation`.

- `jackson-core`

- `jackson-databind`

- `jackson-annotation`

Module

## 使用

### maven 依赖

jackson有两个包名，一个是1.x之前使用的，一个是2.x之后使用的

> org.codehaus.jackson is an older version of Jackson.

> com.fasterxml.jackson represents the new project and package.

> The reason is, Jackson has moved from Codehaus to Github when releasing Jackson 2.

maven依赖：

```xml
<properties>
  ...
  <!-- Use the latest version whenever possible. -->
  <jackson.version>2.9.0</jackson.version>
  ...
</properties>

<dependencies>
  ...
  <dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>${jackson.version}</version>
  </dependency>
  ...
</dependencies>
```
默认解析公有的字段，和带有getter和setter的字段
`@JsonAutoDetect`

Changing property auto-detection

The default Jackson property detection rules will find:

All ''public'' fields
All ''public'' getters ('getXxx()' methods)
All setters ('setXxx(value)' methods), ''regardless of visibility'')

```java
@JsonAutoDetect(fieldVisibility=JsonAutoDetect.Visibility.NONE)
public class POJOWithNoFields {
  // will NOT be included, unless there is access 'getValue()'
  public int value;
}
```

### 忽略属性

@JsonIgnore
忽略一些属性
@JsonIgnoreProperties({"ignored1", "ignored2"})
ignoreUnknown=true


@JsonProperty
指定输出的key

@JsonFilter

@JsonGetter

定制

@JsonDeserialize
@JsonSerialize

默认使用无参的构造函数来构造，但是可以使用@JsonCreator去指定构造函数

使用@JsonProperty去指定参数

```java
public class CtorPOJO {
   private final int _x, _y;

   @JsonCreator
   public CtorPOJO(@JsonProperty("x") int x, @JsonProperty("y") int y) {
      _x = x;
      _y = y;
   }
}
```

jackson-annotations  定义一些注解




定义解析

多态支持

@JsonTypeInfo

```java
// Include Java class name ("com.myempl.ImplClass") as JSON property "class"
@JsonTypeInfo(use=Id.CLASS, include=As.PROPERTY, property="class")
public abstract class BaseClass {
}

public class Impl1 extends BaseClass {
  public int x;
}
public class Impl2 extends BaseClass {
  public String name;
}

public class PojoWithTypedObjects {
  public List<BaseClass> items;
}
```

空字段

各种配置

Map的Key Deserializer 构造函数

@JsonDeserialize(keyUsing = ShortDateKeyDeserializer.class)

com.fasterxml.jackson.databind.JsonMappingException: Can not find a (Map) Key deserializer for type [simple type, class com.qunar.hotel.price.root.beans.time.ShortDate]

## 参考

1. [FasterXML/jackson-annotations: Core annotations (annotations that only depend on jackson-core) for Jackson data processor](https://github.com/FasterXML/jackson-annotations)

2. [Jackson fasterxml和codehaus的区别 （fasterxml vs. codehaus） - Clement-Xu的专栏 - CSDN博客](http://blog.csdn.net/clementad/article/details/46416647)

3. [java - org.codehaus.jackson versus com.fasterxml.jackson.core - Stack Overflow](https://stackoverflow.com/questions/30782706/org-codehaus-jackson-versus-com-fasterxml-jackson-core)

4. [Jackson data binding - 知乎专栏](https://zhuanlan.zhihu.com/p/23392268)


注入的message-converters优先级高于默认注入的json转换器