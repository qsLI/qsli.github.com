title: 将其他日志框架桥接到slf4j
tags: logback
category: java
toc: true
date: 2018-05-05 16:14:59
---


## SLF4J

java世界的日志框架太多了, `Jakarta Commons Logging (JCL)`,  java.util.logging (jul), Log4j, Logback等等. 其中 log4j和logback是同一个作者写的, 这个作者为了统一日志的API, 又创作了SLF4J, SLF4J采用门面模式定义了日志操作的API, 但是并没有提供实现, 
具体的实现由用户引入的jar包决定, 比如Log4j或者Logback等.

为了能让之前的项目, 比如一个比较古老的项目使用了 JCL, 也能使用`SLF4J`带来的好处(接口和实现分离), 就出现了桥接的需求.

 ![](https://www.slf4j.org/images/legacy.png)

 一旦桥接到了`SLF4J`, 底层的日志实现就可以随便选了.


 ## 使用

 这里拿`JCL`为例, 介绍下如何使用桥接包.

1. exclude掉`JCL`对应的jar包
2. 引入`jcl-over-slf4j`

比如拿`spring mvc`为例, 他内部使用的是`JCL`作为日志实现, 我们需要做的就是:

```xml
        <!--exclude-->
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-webmvc</artifactId>
            <version>${spring.version}</version>
            <exclusions>
                <exclusion>
                    <groupId>commons-logging</groupId>
                    <artifactId>commons-logging</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
            <version>${sl4j.version}</version>
        </dependency>

        <!-- https://mvnrepository.com/artifact/org.slf4j/jcl-over-slf4j -->
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>jcl-over-slf4j</artifactId>
            <version>1.7.25</version>
        </dependency>     
```

## 实现原理

桥接的实现原理就是不引入`JCL`等之前包的实现, 在桥接的jar包中实现一套相同的api.

```
➜  jcl-over-slf4j-1.7.25-sources  tree
.
├── META-INF
│   ├── MANIFEST.MF
│   └── services
│       └── org.apache.commons.logging.LogFactory
└── org
    └── apache
        └── commons
            └── logging
                ├── impl
                │   ├── NoOpLog.java
                │   ├── package.html
                │   ├── SimpleLog.java
                │   ├── SLF4JLocationAwareLog.java
                │   ├── SLF4JLogFactory.java
                │   └── SLF4JLog.java
                ├── LogConfigurationException.java
                ├── LogFactory.java
                ├── Log.java
                └── package.html
```

在`LogFactory`中使用的是`SLF4JLogFactory`来获取`Logger`, 最终用到的是`slf4j-api`中定义的方法.

```java
// org.apache.commons.logging.LogFactory
static LogFactory logFactory = new SLF4JLogFactory();

// org.apache.commons.logging.impl.SLF4JLogFactory#getInstance(java.lang.String)
 public Log getInstance(String name) throws LogConfigurationException {
        Log instance = loggerMap.get(name);
        if (instance != null) {
            return instance;
        } else {
            Log newInstance;
            Logger slf4jLogger = LoggerFactory.getLogger(name);
            if (slf4jLogger instanceof LocationAwareLogger) {
                newInstance = new SLF4JLocationAwareLog((LocationAwareLogger) slf4jLogger);
            } else {
                newInstance = new SLF4JLog(slf4jLogger);
            }
            Log oldInstance = loggerMap.putIfAbsent(name, newInstance);
            return oldInstance == null ? newInstance : oldInstance;
        }
    }
```
 
## 参考

- [Log4j Bridge](https://www.slf4j.org/legacy.html)
- [Java 日志框架解析(上) - 历史演进](https://zhuanlan.zhihu.com/p/24272450)
- [Java 日志框架解析(下) - 最佳实践](https://zhuanlan.zhihu.com/p/24275518)
- [日志工具现状调研 | 网易乐得技术团队](http://tech.lede.com/2017/02/06/rd/server/log4jSearch/index.html)
