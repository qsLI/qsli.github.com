---
title: java垃圾回收（GC）总结
toc: true
category: gc
abbrlink: 18158
tags:
---



```bash
#!/bin/sh

export TOMCAT_USER="tomcat"
export JAVA_OPTS="-Xms24g -Xmx24g -Xmn8g -XX:PermSize=512m -XX:MaxPermSize=512M -XX:SurvivorRatio=5 -server -XX:+TieredCompilation -XX:CICompilerCount=12 -XX:+DisableExplicitGC -Dlogs=$CATALINA_BASE/logs -Dcache=$CATALINA_BASE/cache -verbose:gc -XX:+PrintGCDateStamps -XX:+PrintGCDetails -XX:+PrintGCApplicationStoppedTime -XX:+PrintGCApplicationConcurrentTime -XX:+PrintGC -XX:+UseConcMarkSweepGC -XX:CMSFullGCsBeforeCompaction=1 -Xloggc:$CATALINA_BASE/logs/gc.log"
chown -R tomcat:tomcat $CATALINA_BASE/logs
chown -R tomcat:tomcat $CATALINA_BASE/cache
chown -R tomcat:tomcat $CATALINA_BASE/conf
chown -R tomcat:tomcat $CATALINA_BASE/work
chown -R tomcat:tomcat $CATALINA_BASE/temp
```

综合使用，防止同时gc？

### GC 日志

#### "Allocation Failure" 是什么鬼？

"Allocation Failure" is a cause of GC cycle to kick.

"Allocation Failure" means that no more space left in Eden to allocate object. So, it is normal cause of young GC.

Older JVM were not printing GC cause for minor GC cycles.

"Allocation Failure" is almost only possible cause for minor GC. Another reason for minor GC to kick could be CMS remark phase (if +XX:+ScavengeBeforeRemark is enabled).


## 参考

1. [JVM日志和参数的理解 | Sina App Engine Blog](http://blog.sae.sina.com.cn/archives/4141)

2. [garbage collection - Java GC (Allocation Failure) - Stack Overflow](http://stackoverflow.com/questions/28342736/java-gc-allocation-failure)

3. [JVM 垃圾回收器工作原理及使用实例介绍](https://www.ibm.com/developerworks/cn/java/j-lo-JVMGarbageCollection/)



