title: openjdk源码阅读指南
toc: true
tags:
category: jdk
---

# 小tips

## globals.hpp

这个文件定义了各种jvm的启动参数, 比如`CMS`收集器的一个参数.

```cpp
  product(bool, UseCMSInitiatingOccupancyOnly, false,                       \
          "Only use occupancy as a criterion for starting a CMS collection")\
```
# 参考

- [[HotSpot VM] JVM调优的"标准参数"的各种陷阱 - 讨论 - 高级语言虚拟机 - ITeye群组](http://hllvm.group.iteye.com/group/topic/27945)
