---
title: java线程栈的打印
toc: true
tags: jstack
category: java
abbrlink: 61487
---

## 原理

kill -3 直接打印在catalina.out

jstack -l lock信息（开销比较大） 

jcmd

sudo -u tomcat jcmd  25423 Thread.print

PerfCounter.print

### native 线程栈

pstack

pidstat

### 线程栈 + CPU占用
slow stack

greys

网上的脚本

### 文件存储位置

/tmp/hsperfdata_$USER/$PID

###


## 参考

1. [java - jstack - well-known file is not secure - Stack Overflow](https://stackoverflow.com/questions/9100149/jstack-well-known-file-is-not-secure)

2. [jcmd命令使用 - CSDN博客](http://blog.csdn.net/winwill2012/article/details/46364849)
