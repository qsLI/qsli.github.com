---
title: jar文件查看
tags: jar
category: java
toc: true
typora-root-url: jar
typora-copy-images-to: jar
abbrlink: 15538
date: 2017-01-27 17:03:36
---


查看jar包内容

```bash
unzip -q -c myarchive.jar META-INF/MANIFEST.MF
```
> `-q` will suppress verbose output from the unzip program

> `-c` will extract to stdout

```
unzip -q -c servlet-api.jar META-INF/MANIFEST.MF
Manifest-Version: 1.0
Ant-Version: Apache Ant 1.8.1
Created-By: 1.6.0_45-b06 (Sun Microsystems Inc.)
X-Compile-Source-JDK: 1.6
X-Compile-Target-JDK: 1.6

Name: javax/servlet/
Specification-Title: Java API for Servlets
Specification-Version: 3.0
Specification-Vendor: Sun Microsystems, Inc.
Implementation-Title: javax.servlet
Implementation-Version: 3.0.FR
Implementation-Vendor: Apache Software Foundation

```

## jar命令

### 在linux下如何查看一个jar文件中有哪些类呢？

`jar tf test.jar`

```bash
META-INF/
META-INF/MANIFEST.MF
javax/
javax/servlet/
javax/servlet/annotation/
javax/servlet/descriptor/
javax/servlet/http/
...
javax/servlet/resources/xml.xsd
META-INF/NOTICE
META-INF/LICENSE
```

### 提取指定的文件

```bash
➜  1.6  jar -tvf commons-text-1.6.jar
  1555 Fri Oct 12 19:42:36 CST 2018 META-INF/MANIFEST.MF
     0 Fri Oct 12 19:42:36 CST 2018 META-INF/
     0 Fri Oct 12 19:41:18 CST 2018 org/
     0 Fri Oct 12 19:41:18 CST 2018 org/apache/
     0 Fri Oct 12 19:41:18 CST 2018 org/apache/commons/
     0 Fri Oct 12 19:42:34 CST 2018 org/apache/commons/text/
     0 Fri Oct 12 19:42:34 CST 2018 org/apache/commons/text/translate/
     0 Fri Oct 12 19:42:34 CST 2018 org/apache/commons/text/similarity/
     0 Fri Oct 12 19:42:34 CST 2018 org/apache/commons/text/lookup/
     0 Fri Oct 12 19:42:34 CST 2018 org/apache/commons/text/diff/
     0 Fri Oct 12 19:42:34 CST 2018 org/apache/commons/text/matcher/
     0 Fri Oct 12 19:42:36 CST 2018 META-INF/maven/
     
➜  1.6  jar xvf commons-text-1.6.jar  META-INF/MANIFEST.MF
 inflated: META-INF/MANIFEST.MF
 
➜  1.6  head -n10 META-INF/MANIFEST.MF
Manifest-Version: 1.0
Created-By: Apache Maven Bundle Plugin
Built-By: chtompki
Build-Jdk: 11
Specification-Title: Apache Commons Text
Specification-Version: 1.6
Specification-Vendor: The Apache Software Foundation
Implementation-Title: Apache Commons Text
Implementation-Version: 1.6
Implementation-Vendor-Id: org.apache.commons
```

## vim

vim也可以查看和修改jar包的，这个很少有人知道。在线上服务器上也可以紧急查看下jar包内容，而且不用解压。

![image-20220710001819800](/image-20220710001819800.png)

光标上下移动，选中你要查看的文件，直接enter，就可以查看具体的内容。比如我选中META-INF/MANIFEST.MF之后，就可以直接查看文件内容了。

![image-20220710001844132](/image-20220710001844132.png)

除了查看，也可以**直接编辑jar文件**的，跟文本文件一样的。比如spring boot的jar包，如果修改配置，重新打包就很慢，直接修改jar就会快很多。

## grepjar

有些时候，我们需要查看一个jar文件中是否包含了某个方法，这个在linux下可以通过下面的命令来查询

`grepjar methodName class.jar`

```bash
$ grepjar 'getStatus' servlet-api.jar
javax/servlet/http/HttpServletResponse.class:getStatus
javax/servlet/http/HttpServletResponseWrapper.class:getStatus
```

参数：

|option | meaning |
|--|--|
|-b |  Print byte offset of match.|
|--|---------------|
|-c |  Print number of matches.|
|-i |  Compare case-insensitively.|
|-n |  Print line number of each match.|
|-s |  Suppress error messages.|
|-w |  Force PATTERN to match only whole words.|
|-e | PATTERN  Use PATTERN as regular expression.|
|--help |  Print help, then exit.|
|-V |  |
|--version |   Print version number, then exit.|

## grep

grep直接一把梭：

![image-20220710002433363](/image-20220710002433363.png)

有些乱码，grep内容还是有点问题。

## 参考

[How to read MANIFEST.MF file from JAR using Bash - Stack Overflow](http://stackoverflow.com/questions/7066063/how-to-read-manifest-mf-file-from-jar-using-bash)

[吴峰子 — linux查看jar中的类以及类中方法命令](http://xiaofengwu.tumblr.com/post/63518704051/linux%E6%9F%A5%E7%9C%8Bjar%E4%B8%AD%E7%9A%84%E7%B1%BB%E4%BB%A5%E5%8F%8A%E7%B1%BB%E4%B8%AD%E6%96%B9%E6%B3%95%E5%91%BD%E4%BB%A4)

[grepdiff - Unix, Linux Command](http://www.tutorialspoint.com/unix_commands/grepjar.htm)

