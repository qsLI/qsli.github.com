---
title: jackson对guava新增集合的支持
tags: jackson
category: spring
toc: true
abbrlink: 45407
date: 2016-11-16 00:10:21
---



## 问题

Guava中新增了不少好用的集合比如`MultiMap`、`MultiSet`、`Table`等，当使用jackson进行序列化的时候

这些集合并不能正确的序列化，出现下面的情况：

正常序列化应该为：
```json
{
  "fields":{
    "Field1":[
      {
        "index":0,
        "header":"Field1",
        "fieldType":"fieldtype",
        "description":null,
        "cleanHeader":null
      }
    ],
    "Field2":[
      {
        "index":1,
        "header":"Field2",
        "fieldType":"fieldtype",
        "description":null,
        "cleanHeader":null
      }
    ]
  }
}
```

使用默认的spring出现的是：

```json
{
  "fields":{
    "empty": false
  }
}
```

## 解决方案

要解决这个问题就要手动向jackson的ObjectMapper中注册一个Module

```java
Table study = getTable();

ObjectMapper mapper = new ObjectMapper();
mapper.registerModule(new GuavaModule());

String tableString = mapper.writeValueAsString(table);
```



这个`GuavaModule`是jackson对Guava集合支持的包，它的maven依赖如下：

```xml
<dependency>
  <groupId>com.fasterxml.jackson.datatype</groupId>
  <artifactId>jackson-datatype-guava</artifactId>
  <version>2.2.0</version>
</dependency>
```

也可以使用基于xml配置的方式将这个Module导入
```xml
<!-- JSON parser configuration-->
<bean id="guavaObjectMapper" class="com.fasterxml.jackson.databind.ObjectMapper"/>

<bean class="org.springframework.beans.factory.config.MethodInvokingFactoryBean">
    <property name="targetObject"><ref local="guavaObjectMapper" /></property>
    <property name="targetMethod"><value>registerModule</value></property>
    <property name="arguments">
        <list>
            <bean id="guavaModule" class="com.fasterxml.jackson.datatype.guava.GuavaModule"/>
        </list>
    </property>
</bean>


<mvc:annotation-driven>
    <mvc:message-converters register-defaults="true">
        <bean class="org.springframework.http.converter.json.MappingJackson2HttpMessageConverter">
            <property name="objectMapper">
                <ref  local="guavaObjectMapper"/>
            </property>
        </bean>
    </mvc:message-converters>
</mvc:annotation-driven>
```

## 支持的类型

{%  asset_img   jar.png  %}




## 参考

1. [Spring MVC configuration + Jackson + Guava multimap](http://stackoverflow.com/questions/26979120/spring-mvc-configuration-jackson-guava-multimap)

2. [Json to guava multimap](http://www.leveluplunch.com/java/examples/convert-json-to-guava-multimap-with-jackson/)
