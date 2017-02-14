title: CMS （ Concurrent Mark Sweep）垃圾收集器
toc: true
tags:
category: gc
---

hotspot g1 收集器

主要是针对老年代

{%  asset_img   cms.jpg  cms示意图 %}


the following collectors operate on the young generation:
-XX:+UseSerialGC
-XX:+UseParallelGC
-XX:+UseParNewGC
 
the following collectors operate on the old generation:
-XX:+UseParallelOldGC
-XX:+UseConcMarkSweepGC


### 参考

1. [blog/2012-12-07-understanding-cms-log.md at master · ivanzhangwb/blog](https://github.com/ivanzhangwb/blog/blob/master/posts/2012-12-07-understanding-cms-log.md)

2. [Understanding CMS GC Logs (Poonam Bajaj Parhar)](https://blogs.oracle.com/poonam/entry/understanding_cms_gc_logs)

3. [Concurrent Mark Sweep (CMS) Collector](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/cms.html)

4. [Garbage Collection: Serial vs. Parallel vs. Concurrent-Mark-Sweep](http://www.tikalk.com/java/garbage-collection-serial-vs-parallel-vs-concurrent-mark-sweep/)

