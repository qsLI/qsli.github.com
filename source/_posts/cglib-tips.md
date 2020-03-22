---
title: cglib-tips
tags: cglib
category: spring
toc: true
typora-root-url: cglib-tips
typora-copy-images-to: cglib-tips
date: 2020-03-23 01:56:51
---



- 设置debug的环境变量

```java
        /**
         * 该设置用于输出cglib动态代理产生的类
         */
        System.setProperty(DebuggingClassWriter.DEBUG_LOCATION_PROPERTY, "/tmp/");

        /**
         * 该设置用于输出jdk动态代理产生的类
         */
        System.getProperties().put("sun.misc.ProxyGenerator.saveGeneratedFiles", "true");
```

![image-20200322181246078](/image-20200322181246078.png)

- 或者使用 HSDB（Hotspot的debug工具）

```bash
 sudo java -classpath "/Library/Java/JavaVirtualMachines/jdk1.8.0_181.jdk/Contents/Home/lib/sa-jdi.jar"  sun.jvm.hotspot.HSDB
```

attach到指定的进程之后，选择class browser，就可以找到动态生成的类

![image-20200322181636481](/image-20200322181636481.png)

点进去

![image-20200322181729901](/image-20200322181729901.png)

会在当前目录生成对应的class文件：

```bash
➜  /tmp  tree
.
├── com
│   └── air
│       └── mvc
│           └── SampleController$$EnhancerBySpringCGLIB$$d680c039.class
```

对应的class文件就创建了，可以拖到idea或者其他的工具中查看，也可以查看类的继承关系

![image-20200322181908616](/image-20200322181908616.png)