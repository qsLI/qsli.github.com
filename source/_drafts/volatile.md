title: volatile
toc: true
tags:
category:
---


>Every thread is defined to have a working memory (an abstraction of caches and registers) in which to store values. 
线程的工作内存, 理解为cpu的cache或者register就行了. 


volatile的作用
1.保证多个线程"同时"修改"共享"变量时不会因为cpu cache等原因而造成不一致,  
2.另外的作用就是防止指令重排

## 参考

- [Synchronization and the Java Memory Model](http://gee.cs.oswego.edu/dl/cpj/jmm.html)
- 