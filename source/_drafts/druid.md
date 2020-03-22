---
title: druid
toc: true
typora-root-url: druid
typora-copy-images-to: druid
tags:
category:
---



## jdbc驱动的超时

## druid连接池的超时

默认值

socket超时的影响（1. 网络故障
                2. kill失败
                ）
一直等待，知道socket超时



超时

```xml
        <property name="queryTimeout" />
        <property name="transactionQueryTimeout"/>
        <property name="loginTimeout"/>
        <property name="killWhenSocketReadTimeout" />
```