title: 数据库分页
date: 2016-09-30 00:19:07
tags: mysql
category: base
toc: true

---

## 逻辑分页

就是将所有的结果集拿出来，然后在程序中进行截取，由于所有的数据都是在内存中的，占用内存比较大

## 物理分页

物理分页是指基于数据库提供的类似 `limit offset,rows`这样的语法。

但是，比如`limit 10000,20`,  就会读取10020条数据，但是只会返回后面20条数据。

## 手工计算

如果id是有序的，可以做一个简单的转换，比如使用  `where id between 10000 and 10020`, 这样的效率就会相对的高些

## 附件
 [PPC2009_mysql_pagination.pdf](PPC2009_mysql_pagination.pdf)
