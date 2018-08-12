---
title: java-object-diff
toc: true
abbrlink: 39546
tags:
category:
---


存在的问题：

1. 为什么不使用json diff？

json的数据结构比较简单，Java中的Set、List、Array到json中都变成了Json Array

这样，List就没有办法做diff了（涉及到顺序和重复插入）

2. Java Object Diff

- 要解决 List的重复插入，顺序问题

- 


DiffNode：代表了对象的一部分。可以是对象本身，也可以是对象的一个属性，集合的一个元素或者是Map的一个entry。一个DiffNode可以拥有任意数量的子node，但最多只有一个父node。
DiffNode.State:ADDED,CHANGED,REMOVED,UNTOUCHED,CIRCULAR,IGNORED,INACCESSIBLE.
DiffNode.Visitor:一个用于遍历diff树的接口。
Instances：这个类有几个属性：sourceAccessor，working，base，以及fresh。其中fresh是用反射从working类型创建的一个对象。
Accessor：一个通用的访问接口，实现类有：CollectionItemAccessor，MapEntryAccessor，PropertyAccessor，PropertyAwareAccessor，RootAccessor，TypeAwareAccessor。
Differ:接口，根据数据类型，有几个实现类：BeanDiffer，CollectionDiffer，MapDiffer以及PrimitiveDiffer。
ComparisonStrategy接口：比较的策略定义。实现类有ComparableComparisonStrategy和EqualsOnlyComparisonStrategy，从命名就可以知道前者是通过Comparable接口比较，而后者是通过equals方法比较。

对list的支持不是很好

https://github.com/SQiShER/java-object-diff/issues/143

No item is expected to be present more than once and if it is, it’s not handled specially.
Order doesn’t matter and is expected to be handled by the underlying collection.


[Diff Examples — JaVers Documentation](http://javers.org/documentation/diff-examples/)

[SQiShER/java-object-diff: Library to diff and merge Java objects with ease](https://github.com/SQiShER/java-object-diff)

[java-object-diff Documentation](http://java-object-diff.readthedocs.io/en/latest/)