title: ParNew和Parallel Scavenge的对比
toc: true
tags: young-gc
category: gc
---
# 垃圾收集器

{%  asset_img   garbage-collector.gif  %}

>HotSpot VM的young gen GC全都使用copying算法，*差别只是串行还是并行而已*。
>Copying GC算法的特征之一就是它的开销只跟*活对象的多少（live data set）有关系*，而跟它所管理的堆空间的大小没关系。

## Serial收集器

> 　单线程收集器，收集时会暂停所有工作线程（我们将这件事情称之为Stop The World，下称STW），使用复制收集算法，虚拟机运行在Client模式时的默认新生代收集器。 


## ParNew 

>　*ParNew收集器就是Serial的多线程版本*，除了使用多条收集线程外，其余行为包括算法、STW、对象分配规则、回收策略等都与Serial收集器一摸一样。在单CPU的环境中，ParNew收集器并不会比Serial收集器有更好的效果。 

## Parallel Scavenge

> Parallel Scavenge收集器（下称PS收集器）也是一个多线程收集器，也是使用复制算法，但它的对象分配规则与回收策略都与ParNew收集器有所不同，它是以吞吐量最大化（即GC时间占总运行时间最小）为目标的收集器实现，它允许较长时间的STW换取总吞吐量最大化。对应的这种收集器是虚拟机运行在Server模式的默认新生代收集器(JDK1.8)。

## 参考

- [java - Difference between -XX:UseParallelGC and -XX:+UseParNewGC - Stack Overflow](https://stackoverflow.com/questions/2101518/difference-between-xxuseparallelgc-and-xxuseparnewgc)

- [JVM内存管理：深入垃圾收集器与内存分配策略 - 高级语言虚拟机 - ITeye知识库频道](http://hllvm.group.iteye.com/group/wiki/2859-JVM)

- [JVM GC遍历一次新生代所有对象是否可达需要多久？ - 知乎](https://www.zhihu.com/question/33210180/answer/56348818)
