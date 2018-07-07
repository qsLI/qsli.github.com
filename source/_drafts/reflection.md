title: reflection
toc: true
tags:
category:
---


>The approach with dynamic bytecode generation is much faster since it

does not suffer from JNI overhead;
does not need to parse method signature each time, because each method invoked via Reflection has its own unique MethodAccessor;
can be further optimized, e.g. these MethodAccessors can benefit from all regular JIT optimizations like inlining, constant propagation, autoboxing elimination etc.
Note, that this optimization is implemented mostly in Java code without JVM assistance. The only thing HotSpot VM does to make this optimization possible - is skipping bytecode verification for such generated MethodAccessors. Otherwise the verifier would not allow, for example, to call private methods.

## 参考

- [关于反射调用方法的一个log - Script Ahead, Code Behind - ITeye博客](http://rednaxelafx.iteye.com/blog/548536)
- [java - What is a de-reflection optimization in HotSpot JIT and how does it implemented? - Stack Overflow](https://stackoverflow.com/questions/28793118/what-is-a-de-reflection-optimization-in-hotspot-jit-and-how-does-it-implemented)
- [Java 反射到底慢在哪里？ - 知乎](https://www.zhihu.com/question/19826278/answer/44331421)
- [Java反射原理简析 | Yilun Fan's Blog](http://www.fanyilun.me/2015/10/29/Java%E5%8F%8D%E5%B0%84%E5%8E%9F%E7%90%86/)