---
title: Spring自定义标签，使用和源码
tags: 自定义标签
category: spring
toc: true
abbrlink: 46833
date: 2016-10-23 19:43:57
---


## 自定义标签

Spring中的标签具有很强的扩展性，我们可以很方便的扩展出自己的标签，做出类似下面的标签
```xml
<dubbo:service interface="com.foo.BarService" ref="barService" />
<dubbo:reference id="barService" interface="com.foo.BarService" />
```

### 1. Authoring the schema
定义标签的xml描述：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xsd:schema xmlns="http://www.mycompany.com/schema/myns"
        xmlns:xsd="http://www.w3.org/2001/XMLSchema"
        xmlns:beans="http://www.springframework.org/schema/beans"
        targetNamespace="http://www.mycompany.com/schema/myns"
        elementFormDefault="qualified"
        attributeFormDefault="unqualified">

    <xsd:import namespace="http://www.springframework.org/schema/beans"/>

    <xsd:element name="dateformat">
        <xsd:complexType>
            <xsd:complexContent>
                <xsd:extension base="beans:identifiedType">
                    <xsd:attribute name="lenient" type="xsd:boolean"/>
                    <xsd:attribute name="pattern" type="xsd:string" use="required"/>
                </xsd:extension>
            </xsd:complexContent>
        </xsd:complexType>
    </xsd:element>
</xsd:schema>
```
定义了标签里面的属性和属性的类型， 在解析xml的时候spring会进行校验

### 2. Coding a NamespaceHandler

```java
package org.springframework.samples.xml;

import org.springframework.beans.factory.xml.NamespaceHandlerSupport;

public class MyNamespaceHandler extends NamespaceHandlerSupport {

    public void init() {
        registerBeanDefinitionParser("dateformat", new SimpleDateFormatBeanDefinitionParser());
    }

}
```
主要是定义标签的处理类，这里是`SimpleDateFormatBeanDefinitionParser`

### 3. BeanDefinitionParser
```java
package org.springframework.samples.xml;

import org.springframework.beans.factory.support.BeanDefinitionBuilder;
import org.springframework.beans.factory.xml.AbstractSingleBeanDefinitionParser;
import org.springframework.util.StringUtils;
import org.w3c.dom.Element;

import java.text.SimpleDateFormat;

public class SimpleDateFormatBeanDefinitionParser extends AbstractSingleBeanDefinitionParser {

    protected Class getBeanClass(Element element) {
        return SimpleDateFormat.class;
    }

    protected void doParse(Element element, BeanDefinitionBuilder bean) {
        // this will never be null since the schema explicitly requires that a value be supplied
        String pattern = element.getAttribute("pattern");
        bean.addConstructorArg(pattern);

        // this however is an optional property
        String lenient = element.getAttribute("lenient");
        if (StringUtils.hasText(lenient)) {
            bean.addPropertyValue("lenient", Boolean.valueOf(lenient));
        }
    }

}
```

该类继承自spring提供的抽象类`AbstractSingleBeanDefinitionParser`，提供了许多基本的功能，解析标签的方法在`doParse`中，spring会传入一个标签元素`Element`和`BeanDefinitionBuilder`的上下文。

### 4. Registering the handler and the schema
```
└─META-INF
        spring.handlers
        spring.schemas
```
`spring.handlers`中的内容如下：

```xml
http\://www.mycompany.com/schema/myns=org.springframework.samples.xml.MyNamespaceHandler
```
`spring.schemas`中内容如下：

```xml
http\://www.mycompany.com/schema/myns/myns.xsd=org/springframework/samples/xml/myns.xsd
```

spring在加载这个jar包的时候会自动的从这些文件中解析到我们的配置，当解析到相应的标签的时候就会交给我们定义的解析类来处理。
```xml
<myns:dateformat id="dateFormat"
pattern="yyyy-MM-dd HH:mm"
lenient="true"/>
```

## Custom attributes on 'normal' elements

除了自定义标签外，还可以为已有标签装饰一个新的属性

```xml
<bean id="checkingAccountService" class="com.foo.DefaultCheckingAccountService"
        jcache:cache-name="checking.account">
    <!-- other dependencies here... -->
</bean>
```
spring可以让我们单独处理这个`jcache:cache-name`这个属性。

### 定义schema

```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>

<xsd:schema xmlns="http://www.foo.com/schema/jcache"
        xmlns:xsd="http://www.w3.org/2001/XMLSchema"
        targetNamespace="http://www.foo.com/schema/jcache"
        elementFormDefault="qualified">

    <xsd:attribute name="cache-name" type="xsd:string"/>

</xsd:schema>
```

### NamespaceHandler

```java
public class JCacheNamespaceHandler extends NamespaceHandlerSupport {

    public void init() {
        super.registerBeanDefinitionDecoratorForAttribute("cache-name",
            new JCacheInitializingBeanDefinitionDecorator());
    }

}
```

实际的调用行为已经被抽象到`NamespaceHandlerSupport`中

```java
/**
 * Decorates the supplied {@link Node} by delegating to the {@link BeanDefinitionDecorator} that
 * is registered to handle that {@link Node}.
 */
@Override
public BeanDefinitionHolder decorate(
    Node node, BeanDefinitionHolder definition, ParserContext parserContext) {

  return findDecoratorForNode(node, parserContext).decorate(node, definition, parserContext);
}
```

### BeanDefinitionDecorator

```java
public class JCacheInitializingBeanDefinitionDecorator implements BeanDefinitionDecorator {

    private static final String[] EMPTY_STRING_ARRAY = new String[0];

    public BeanDefinitionHolder decorate(Node source, BeanDefinitionHolder holder,
            ParserContext ctx) {
        String initializerBeanName = registerJCacheInitializer(source, ctx);
        createDependencyOnJCacheInitializer(holder, initializerBeanName);
        return holder;
    }

    private void createDependencyOnJCacheInitializer(BeanDefinitionHolder holder,
            String initializerBeanName) {
        AbstractBeanDefinition definition = ((AbstractBeanDefinition) holder.getBeanDefinition());
        String[] dependsOn = definition.getDependsOn();
        if (dependsOn == null) {
            dependsOn = new String[]{initializerBeanName};
        } else {
            List dependencies = new ArrayList(Arrays.asList(dependsOn));
            dependencies.add(initializerBeanName);
            dependsOn = (String[]) dependencies.toArray(EMPTY_STRING_ARRAY);
        }
        definition.setDependsOn(dependsOn);
    }

    private String registerJCacheInitializer(Node source, ParserContext ctx) {
        String cacheName = ((Attr) source).getValue();
        String beanName = cacheName + "-initializer";
        if (!ctx.getRegistry().containsBeanDefinition(beanName)) {
            BeanDefinitionBuilder initializer = BeanDefinitionBuilder.rootBeanDefinition(JCacheInitializer.class);
            initializer.addConstructorArg(cacheName);
            ctx.getRegistry().registerBeanDefinition(beanName, initializer.getBeanDefinition());
        }
        return beanName;
    }

}

```

### META-INF
```xml
# in 'META-INF/spring.handlers'
http\://www.foo.com/schema/jcache=com.foo.JCacheNamespaceHandler
# in 'META-INF/spring.schemas'
http\://www.foo.com/schema/jcache/jcache.xsd=com/foo/jcache.xsd

```

## 参考

1. [spring-framework-reference](http://docs.spring.io/spring/docs/current/spring-framework-reference/htmlsingle/)
