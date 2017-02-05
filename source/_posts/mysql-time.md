---
title: mysql中时间相关的问题
tags: mysql
category: base
toc: true
date: 2016-09-25 00:27:52
---

## 自动更新时间戳

> TIMESTAMP and DATETIME columns can be automatically initializated and updated to the current date and time (that is, the current timestamp).

> For any TIMESTAMP or DATETIME column in a table, you can assign the current timestamp as the default value, the auto-update value, or both:

[mysql官方文档说明](http://dev.mysql.com/doc/refman/5.7/en/timestamp-initialization.html)

代码示例：
```
CREATE TABLE t1 (
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  dt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 多个timestamp

mysql中默认一张表中只能有一个timestamp类型的字段，如果有多个的话创建表的时候就会报错

`Incorrect table definition; there can be only one TIMESTAMP column with CURRENT_TIMESTAMP in DEFAULT or ON UPDATE clause  `

在`5.6.4`之前有这个限制，在之后好像就没有这个限制了。参见<https://segmentfault.com/q/1010000000488523>
