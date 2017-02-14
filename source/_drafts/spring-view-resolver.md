title: Spring视图的那些事儿
toc: true
tags: view-resolver
category: spring
---

## Internal

/* 会拦截返回的jsp视图

> 在多数项目中，InternalResourceViewResolver 是最常用的，该解析器可以返回指定目录下指定后缀的文件，它支持 JSP 及 JSTL 等视图技术，但是用该视图解析器时，需要注意设置好正确的优先级，因为该视图解析器即使没有找到正确的文件，也会返回一个视图，而不是返回 null，这样优先级比该视图解析器低的解析器，将不会被执行。

## Thymeleaf

web.xml 中配置 

```xml
    <servlet-mapping>
        <servlet-name>dispatcherServlet</servlet-name>
        <url-pattern>/*</url-pattern>
    </servlet-mapping>
```

不会影响返回视图

## 参考

1. [spring MVC 拦截了jsp视图导致404 - 求索路](http://www.qiusuolu.com/archives/314)

2. [Spring中拦截/和拦截/*的区别 - 不能访问到返回的JSP - 访问静态资源(jpg,js等) - Josh_Persistence - ITeye技术网站](http://josh-persistence.iteye.com/blog/1922311)

3. [开发 Spring 自定义视图和视图解析器](http://www.ibm.com/developerworks/cn/java/j-lo-springview/)

