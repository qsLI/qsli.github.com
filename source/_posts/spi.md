title: Java SPI 总结
tags: spi
category: java
toc: true

date: 2016-12-17 21:39:32
---


## SPI ABC

SPI 代表`Service Provider Interfaces`, 是一种服务提供发现的机制。JDK中为其提供了`ServiceLoader`用来加载接口对应的实现。

## 使用约定

{%  asset_img  usage.jpg  使用约定  %}




```

└── src
├── com
│   └── ivanzhang
│       └── spi
│           ├── HelloInterface.java
│           ├── impl
│           │   ├── ImageHello.java
│           │   └── TextHello.java
│           └── SPIMain.java
└── META-INF
    └── services
        └── com.ivanzhang.spi.HelloInterface

```

## 使用例子

- common-logging

> common-logging，apache最早提供的日志的门面接口。只有接口，没有实现。具体方案由各提供商实现，发现日志提供商是通过扫描 META-INF/services/org.apache.commons.logging.LogFactory配置文件，通过读取该文件的内容找到日志提工商实现类。只要我们的日志实现里包含了这个文件，并在文件里制定 LogFactory工厂接口的实现类即可。

- jdbc

> jdbc4.0以前，开发还需要基于Class.forName("xxx")的方式来装载驱动，jdbc4也基于spi的机制来发现驱动提供商了，可以通过META-INF/services/java.sql.Driver文件里指定实现类的方式来暴露驱动提供者。

*其他用途：*

* Java Database Connectivity
* Java Cryptography Extension
* Java Naming and Directory Interface
* Java API for XML Processing
* Java Business Integration
* Java Sound
* Java Image I/O
* Java File Systems

## 参考

1. [Java的SPI机制与简单示例](http://www.solinx.co/archives/142)

2. [Java SPI机制简介 - oschina](https://my.oschina.net/u/1034176/blog/659445)

3. [Java SPI机制简介 - 技术宅](http://ivanzhangwb.github.io/blog/2012/06/01/java-spi/)

4. [Introduction to the Service Provider Interfaces](https://docs.oracle.com/javase/tutorial/sound/SPI-intro.html)

5. [谈java SPI机制、spring-mvc启动及servlet3.0](http://www.jianshu.com/p/bd36c023ddf0)

6. [Service Provider Interface](https://en.wikipedia.org/wiki/Service_provider_interface)

7. [Replaceable Components and the Service Provider Interface ](http://resources.sei.cmu.edu/asset_files/TechnicalNote/2002_004_001_13958.pdf)