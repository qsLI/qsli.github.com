---
title: Spring中的bean属性编辑器——BeanWrapper
tags: PropertyEditor
category: spring
toc: true
---

## 源起

最近在翻阅Spring MVC的源码的时候看到了这么一段

```java
try {
        PropertyValues pvs = new ServletConfigPropertyValues(getServletConfig(), this.requiredProperties);
        BeanWrapper bw = PropertyAccessorFactory.forBeanPropertyAccess(this);
        ResourceLoader resourceLoader = new ServletContextResourceLoader(getServletContext());
        bw.registerCustomEditor(Resource.class, new ResourceEditor(resourceLoader, getEnvironment()));
        initBeanWrapper(bw);
        bw.setPropertyValues(pvs, true);
    }
    catch (xx){
        ...
    }
```
这段代码是在`DispatcherServlet`的父类`HttpServletBean`初始化的时候使用的。
`bw.setPropertyValues(pvs, true);` 这一句直接操作了`Bean`的属性，将Servlet启动文件中
指定的初始化信息加载过来。

## JavaBeans规范

1. 所有的属性都是private的

2. 有一个公有的无参构造函数

3. 可序列化（实现`Serializable`接口）


## Apache Commons

Unsafe 类

## 参考

1. [What is a JavaBean exactly?](http://stackoverflow.com/questions/3295496/what-is-a-javabean-exactly)