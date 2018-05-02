---
title: java GC基础知识
toc: true
category: gc
abbrlink: 38885
tags:
---

## GC的三个要素

{%  asset_img   gc.jpg  gc三要素 %}

java eden s1， s2 old


## GC调优准则

>1. Try to maximize objects reclaimed in young gen.
>2. Set -Xms和-Xmx to 3x or 4x LDS(live data size)
>3. Young gen should be around 1x to 1.5x LDS
>4. Old gen should be around 2x to 3x LDS


Threshold 调优， 如何调优， 停留在young区还是old区

手工触发gc

```
jmap -histo:live `pgrep -f 'tomcat'`
```

JConsole或者VisualVM, Perform GC


设置young区大小， `-Xmn`或者

```
-XX:NewSize= -XX:MaxNewSize=
```

-client -server

### 引用类型

####　强引用(Strong Reference)

#### 软引用(Soft Reference)

Used for cache

-XX:SoftRefLRUPolicyMSPerMB=0

#### 弱引用(Weak Reference)

Used for cache

#### 虚引用（Phantom Reference)

used for housekeeping



### Throughput

least overall GC overhead

#### Parallel Scavenge Collector

```
-XX:+UseParallelGC
-XX:ParallelGCThreads=7
```

### latency

more overall gc overhead 

#### CMS

```
-XX:+UseConcMarkSweepGC
-XX:+UseParNewGC
-XX:ParallelGCThreads=7
```

堆碎片化

GC参数， 标准参数和其他参数 -XX和



### Parallel

### Concurrent


## G1收集器


{%  asset_img   g1.jpg  G1收集器 %}

8GB or larger heaps

## 日志输出

```
-XX:+PrintGC
-XX:+PrintGCDetails
-XX:+PrintGCTimeStamps
```

暂停时间

```

```

安全区暂停



jmap -> jcmd

jmap -permstat [pid]

## 堆外内存

### nio

```
-XX:+MaxDirect
```

### 永久代和元空间


如果不限制大小，上限就是系统可用内存大小
```

```

gc信息： 

```
sudo -u tomcat jstat -gc `pgrep -f 'tomcat'` 1000
sudo -u tomcat jstat -gcutil `pgrep -f 'tomcat'` 1000
jstat -class [pid]
```

well known xxx


### JMX  性能影响

sudo -u tomcat jmap -dump:format=b,file=/home/q/dump/heap.hprof `pgrep -f 'tomcat'`

sudo -u tomcat jmap -clstats `pgrep -f 'tomcat'`

jmap -histo:live `pgrep -f 'tomcat'`

jmap -histo `pgrep -f 'tomcat'`