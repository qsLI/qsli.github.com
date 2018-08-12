title: dubbo泛化调用原理
tags: generic
category: dubbo
toc: true
date: 2018-05-02 20:50:44
---


## 介绍

>泛接口调用方式主要用于客户端没有API接口及模型类元的情况，参数及返回值中的所有POJO均用Map表示，通常用于框架集成，比如：实现一个通用的服务测试框架，可通过GenericService调用所有服务实现。

截图为qunar的dubbo服务测试框架, 只需将参数按照指定的格式填入, 就可以直接调用相应的dubbo接口.

{%  asset_img   generic.png  通过泛化调用手工发起dubbo请求 %}


## 使用

泛化调用需要接口声明为泛化, 可以在声明接口的时候指定,

```xml
<dubbo:reference id="barService" interface="com.foo.BarService" generic="true" />
```

也可以在代码中进行设置:

```java
            ReferenceConfig<GenericService> reference = new ReferenceConfig<GenericService>();
            reference.setApplication(new ApplicationConfig("generic-consumer"));
            reference.setInterface(DemoService.class);
            reference.setUrl("dubbo://127.0.0.1:29581?scope=remote");
            // 声明为泛化
            reference.setGeneric(true);
            GenericService genericService = reference.get();
```

然后就可以使用泛化调用的方式去调用接口了

```java
                List<Map<String, Object>> users = new ArrayList<Map<String, Object>>();
                Map<String, Object> user = new HashMap<String, Object>();
                user.put("class", "com.alibaba.dubbo.config.api.User");
                user.put("name", "actual.provider");
                users.add(user);
                // 泛化调用
                users = (List<Map<String, Object>>) genericService.$invoke("getUsers", new String[] {List.class.getName()}, new Object[] {users});
                Assert.assertEquals(1, users.size());
                Assert.assertEquals("actual.provider", users.get(0).get("name"));
```


## 实现

泛化调用是通过dubbo的filter机制实现的, 大概流程如下:

```
+-------------------------------------------+               +-------------------------------------------+
|  consumer 端                               |               | provider 端                                |
|                                           |               |                                           |
|                                           |               |                                           |
|                                           |               |                                           |
|                                           |               |                                           |
|                    +------------------+   |               |       +--------------+                    |
|                    |GenericImplFilter |   |  Invocation   |       |GenericFilter |                    |
|             +----> |                  +-------------------------> |              |                    |
|             |      +------------------+   |               |       +--------------+                    |
| +-----------+                             |               |                      |    +-----------+   |
| |           |                             |               |                      |    |           |   |
| |Client     |                             |               |                      +--> | Service   |   |
| |           |                             |               |                           |           |   |
| +-----------+                             |               |                           +-------+---+   |
|                                           |               |                                   |       |
|      ^             +------------------+   |               |       +--------------+            |       |
|      |             |GenericImplFilter |   |               |       |GenericFilter | <----------+       |
|      +-------------+                  | <-------------------------+              |                    |
|                    +------------------+   |               |       +--------------+                    |
|                                           |               |                                           |
|                                           |               |                                           |
|                                           |               |                                           |
|                                           |               |                                           |
+-------------------------------------------+               +-------------------------------------------+
```


###  GenericService

`GenericService`这个接口和java的反射调用非常像, 只需提供调用的方法名称,  参数的类型以及参数的值就可以直接调用对应方法了.

接口的实现如下:

```java
package com.alibaba.dubbo.rpc.service;

/**
 * 通用服务接口
 * 
 * @author william.liangf
 * @export
 */
public interface GenericService {

    /**
     * 泛化调用
     * 
     * @param method 方法名，如：findPerson，如果有重载方法，需带上参数列表，如：findPerson(java.lang.String)
     * @param parameterTypes 参数类型
     * @param args 参数列表
     * @return 返回值
     * @throws Throwable 方法抛出的异常
     */
    Object $invoke(String method, String[] parameterTypes, Object[] args) throws GenericException;

}
```

### PojoUtils

>PojoUtils. Travel object deeply, and convert complex type to simple type.

simple type包含primitive type, String, Number(Integer, Long), Date, Array of Primitive type, collection等

举一个简单的例子, java类User定义如下:

```java
public class User {

    private  int age;
    private  String name;
    private Date birthDay;
    private Address address;
    public User() {
    }

    public User(int age, String name, Date birthDay) {
        this.age = age;
        this.name = name;
        this.birthDay = birthDay;
    }

    public int getAge() {
        return age;
    }

    public String getName() {
        return name;
    }

    public Date getBirthDay() {
        return birthDay;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setBirthDay(Date birthDay) {
        this.birthDay = birthDay;
    }
将hashmap结构的参数转换成对应的pojo
    public Address getAddress() {
        return address;
    }

    public void setAddress(Address address) {
        this.address = address;
    }

    @Override
    public String toString() {
        return ReflectionToStringBuilder.toString(this);
    }
}￼￼ ￼ ￼ ￼ ￼ ￼￼

```

序列化代码:

```java
       final Object generalized = PojoUtils.generalize(user);
        System.out.println("generalized = " + JSON.toJSONString(generalized));
```

generalize之后其实是一个`hashmap`, 写成json字符串之后如下:

```￼￼
{
    "birthDay": 1525258281516,
    "address": {
        "zipCode": 10086,
        "street": "haidian street",
        "class": "com.air.rmi.dubbo.bean.Address"
    },
    "name": "Kevin",
    "class": "com.air.rmi.dubbo.bean.User",
    "age": 26
}
```

### 相关filters

- `GenericFilter`: 负责provider端参数的转换.

1. 调用时,将hashmap结构的参数转换成对应的pojo
2. 返回结果时, 将pojo转换成hashmap

```java
            // 调用时
            args = PojoUtils.realize(args, params, method.getGenericParameterTypes()
            // 返回结果时
            return new RpcResult(PojoUtils.generalize(result.getValue()));
```

- `GenericImplFilter`: 负责consumer端参数的转换, 将POJO转换成hashmap结构

```java
            Object[] args = PojoUtils.generalize(arguments);
```

这样consumer端传过来的只是一个map, 并不要有provider端的jar包, 根据这个就可以实现dubbo接口的测试平台.

## 参考

- [6.16 泛化引用 · GitBook](https://dubbo.incubator.apache.org/books/dubbo-user-book/demos/generic-reference.html)
- [Dubbo高级特性实践-泛化调用 - 简书](https://www.jianshu.com/p/ff0947529de4)
- [dubbo高级用法之泛化与接口自适应](https://zhuanlan.zhihu.com/p/29410596)