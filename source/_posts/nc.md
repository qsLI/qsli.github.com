---
title: netcat(nc) —— 使用小结
tags: netcat
category: shell
toc: true
abbrlink: 1919
date: 2016-12-18 11:29:28
---


nc的全称是netcat，提供了许多关于网络操作的功能，号称网络工具中的瑞士军刀。

nc也有windows的移植版本：[](https://eternallybored.org/misc/netcat/)

>   Netcat is a featured networking utility which reads and writes data across network connections, using the TCP/IP protocol.
It is designed to be a reliable "back-end" tool that can be used directly or easily driven by other programs and scripts. At the same time, it is a feature-rich network debugging and exploration tool, since it can create almost any kind of connection you would need and has several interesting built-in capabilities.

## 常见用途
### nc 传输文件：

- 传送文件

发送端：`nc -l 6666 < file`
接收端: `nc host 6666 | pv -L 30m > wrapper`

其中pv是一个限流的工具。

- 压缩传输一个文件夹

`tar zcvf folder.tar.gz folder | nc -l 6666`


## 参考链接

1. [The GNU Netcat](http://netcat.sourceforge.net/)
2. [Linux Netcat 命令——网络工具中的瑞士军刀](https://www.oschina.net/translate/linux-netcat-command)