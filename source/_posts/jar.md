---
title: jar文件查看
tags: jar
category: java
toc: true
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

在linux下如何查看一个jar文件中有哪些类呢？

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

## grepjar

有些时候，我们需要查看一个jar文件中是否包含了某个方法，这个在linux下可以通过下面的命令来查询

`grepjar methodName class.jar`

```bash
$ grepjar 'getStatus' servlet-api.jar
javax/servlet/http/HttpServletResponse.class:getStatus
javax/servlet/http/HttpServletResponseWrapper.class:getStatus
```

参数：

||option || meaning ||
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


## 参考

[How to read MANIFEST.MF file from JAR using Bash - Stack Overflow](http://stackoverflow.com/questions/7066063/how-to-read-manifest-mf-file-from-jar-using-bash)

[吴峰子 — linux查看jar中的类以及类中方法命令](http://xiaofengwu.tumblr.com/post/63518704051/linux%E6%9F%A5%E7%9C%8Bjar%E4%B8%AD%E7%9A%84%E7%B1%BB%E4%BB%A5%E5%8F%8A%E7%B1%BB%E4%B8%AD%E6%96%B9%E6%B3%95%E5%91%BD%E4%BB%A4)

[grepdiff - Unix, Linux Command](http://www.tutorialspoint.com/unix_commands/grepjar.htm)


