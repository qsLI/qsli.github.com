title: Spring中的factory-bean和FactoryBean
tags: beanfactory
category: spring
toc: true
date: 2017-02-14 00:50:40
---



### factory-bean

spring的bean标签的一个属性，用来指定创建实例的方法

```java
public class ClientService {
    private static ClientService clientService = new ClientService();
    private ClientService() {}

    public static ClientService createInstance() {
        return clientService;
    }
}

public class DefaultServiceLocator {

    private static ClientService clientService = new ClientServiceImpl();
    private static AccountService accountService = new AccountServiceImpl();

    private DefaultServiceLocator() {}

    public ClientService createClientServiceInstance() {
        return clientService;
    }

    public AccountService createAccountServiceInstance() {
        return accountService;
    }

}

```
#### 第一种写法

```xml
<bean id="clientService"
    class="examples.ClientService"
    factory-method="createInstance"/>
```
这种写法要求`factory-method`必须是`static`的

#### 第二种写法

```xml
<bean id="serviceLocator" class="examples.DefaultServiceLocator">
    <!-- inject any dependencies required by this locator bean -->
</bean>

<bean id="clientService"
    factory-bean="serviceLocator"
    factory-method="createClientServiceInstance"/>

<bean id="accountService"
    factory-bean="serviceLocator"
    factory-method="createAccountServiceInstance"/>
```

这种写法多了一个`factory-bean`，指定了使用哪个类的哪个方法去创建，不要求这个方法是`static`，但是`factory-bean`对应的类必须交由spring管理。

一个类中可以包含多个创建的方法。


### FactoryBean

是Spring提供的一个接口，用来定制Bean的初始化逻辑。

> If you have complex initialization code that is better expressed in Java as opposed to a (potentially) verbose amount of XML, you can create your own FactoryBean

>   Interface to be implemented by objects used within a {@link BeanFactory} which
    are themselves factories for individual objects. If a bean implements this
    interface, it is used as a factory for an object to expose, not directly as a
    bean instance that will be exposed itself.

这个接口有三个方法：

- Object getObject()

获取创建的对象

- boolean isSingleton()

返回的对象是否是单例的

- Class getObjectType()

获取返回的对象的类型

`GsonFactoryBean`就实现了`FactoryBean`接口，是一个不错的例子，大概代码如下：

```java
public class GsonFactoryBean implements FactoryBean<Gson>, InitializingBean {

    private boolean base64EncodeByteArrays = false;

    private boolean serializeNulls = false;

    private boolean prettyPrinting = false;

    private boolean disableHtmlEscaping = false;

    private String dateFormatPattern;

    private Gson gson;

    public void setBase64EncodeByteArrays(boolean base64EncodeByteArrays) {
        this.base64EncodeByteArrays = base64EncodeByteArrays;
    }

    public void setSerializeNulls(boolean serializeNulls) {
        this.serializeNulls = serializeNulls;
    }

    public void setPrettyPrinting(boolean prettyPrinting) {
        this.prettyPrinting = prettyPrinting;
    }

    public void setDisableHtmlEscaping(boolean disableHtmlEscaping) {
        this.disableHtmlEscaping = disableHtmlEscaping;
    }

    public void setDateFormatPattern(String dateFormatPattern) {
        this.dateFormatPattern = dateFormatPattern;
    }


    @Override
    public void afterPropertiesSet() {
        GsonBuilder builder = (this.base64EncodeByteArrays ?
                GsonBuilderUtils.gsonBuilderWithBase64EncodedByteArrays() : new GsonBuilder());
        if (this.serializeNulls) {
            builder.serializeNulls();
        }
        if (this.prettyPrinting) {
            builder.setPrettyPrinting();
        }
        if (this.disableHtmlEscaping) {
            builder.disableHtmlEscaping();
        }
        if (this.dateFormatPattern != null) {
            builder.setDateFormat(this.dateFormatPattern);
        }
        this.gson = builder.create();
    }

    @Override
    public Gson getObject() {
        return this.gson;
    }

    @Override
    public Class<?> getObjectType() {
        return Gson.class;
    }

    @Override
    public boolean isSingleton() {
        return true;
    }

}
```
`GsonFactoryBean`除了实现了`FactoryBean`接口，还实现了`InitializingBean`接口，这个接口只有一个方法

`afterPropertiesSet`。这个方法会在bean的所有提供的属性被设置之后，被BeanFactory调用，是spring保留的一个扩展点。

`GsonFactoryBean`在这个方法中将收集到的配置信息传给builder，构建出一个`Gson`对象（这种一般是大对象，一个容器中有一个就够了）。

```xml
  <bean id="gsonFactoryBean" class="org.springframework.http.converter.json.GsonFactoryBean">
    <property name="dateFormatPattern" value="yyyy-MM-dd"/>
    <property name="disableHtmlEscaping" value="true"/>
    <property name="prettyPrinting" value="true"/>
</bean>
```

### 参考

1. [7. The IoC container](https://docs.spring.io/spring/docs/current/spring-framework-reference/html/beans.html)


