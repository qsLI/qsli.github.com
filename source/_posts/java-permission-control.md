---
title: java 访问权限区别
tags: 访问权限
category: java
toc: true
abbrlink: 50465
date: 2015-10-20 09:57:22
---

## 类成员的访问权限
<!-- more -->

|  Modifier |  Class  | Package      | Subclass  |  World       |   
| ----------| --------| -------------| --------- | ------------- 
|  public   |   √     |   √           |  √         |   √           |   
|  protect  |   √     |   √           |   √        |    x          |  
|  no modifier |   √  |   √            |  x         |    x          |   
|  private  |   √     |     x        |     x      |       x       |   

没有修饰符的话就相当于package可见，如果子类不在同一个package则也不能访问相应的方法。

## 参考

 > [Controlling Access to Members of a Class](https://docs.oracle.com/javase/tutorial/java/javaOO/accesscontrol.html)
 > [JAVA修饰符类型](http://blog.csdn.net/johnstrive/article/details/5880357)