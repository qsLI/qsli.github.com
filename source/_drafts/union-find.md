title: 并查集总结
toc: true
tags: union-find
category: algorithm
---

# 什么是并查集

用来表示不相交集合的数据结构

代表:

## 可以解决的问题

### 无向图的连通分量



## 支持的操作

### 创建

MAKE-SET(x) : 建立一个新的集合，它的唯一成员是x

### 查找

FIND-SET(x) : 返回包含x的唯一集合的代表

### 合并

UNION(x, y) : 合并两个集合成一个新的集合

## 存储用的数据结构

### 链表

### 有根树

树中每个结点包含一个成员， 每颗树代表一个集合， 最终构成一个不相交集合森里（disjoint-set forest)。
每个成员仅指向它的的父结点。


# 并查集优化

加权合并启发式策略（weighted-union heuristic）



## 按秩合并（union by rank）

x.rank : x高度的上界（从x到某一后代叶结点的最长简单路径上边的数目）

策略： 让较大秩的根成为较小秩的根的父结点

## 路径压缩（path compression）


# 练习


# 参考

