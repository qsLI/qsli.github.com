title: cygwin执行命令非常慢
tags: cygwin
category: linux
toc: true
date: 2017-02-20 00:30:03
---


cygwin在windows上提供了一套类似linux的开发环境，用起来还是挺爽的。

但是一直困扰我的一个问题是，太慢！具体现象就是使用`ls`都得等半天才出结果。

看网上的资料说cygwin确实慢，再加上我用了`oh-my-zsh`，更是慢上加慢。

## 可能的原因

貌似360对这些工具程序的调用都会做一个拦截，判断下是否有风险。

于是干脆把360给卸载了，终于`ls`的速度变得可以接受。。。。


## 参考

1. [为什么Cygwin的执行shell命令很慢？ - IT屋-程序员软件开发技术分享社区](http://www.it1352.com/321952.html)

