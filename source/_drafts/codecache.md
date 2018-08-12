title: codecache
toc: true
tags:
category:
---

JVM会将频繁调用的方法通过JIT编译器编译成本地的代码, 编译的结果存储在一个叫做`code cache`的区域.
当codecache不足时, jdk8会打印出warning信息:

```
CodeCache: size=2496Kb used=1966Kb max_used=1976Kb free=529Kb
 bounds [0x00007f06501b6000, 0x00007f0650426000, 0x00007f0650426000]
 total_blobs=889 nmethods=499 adapters=296
 compilation: disabled (not enough contiguous free space left)
CodeCache: size=2496Kb used=1965Kb max_used=1976Kb free=530Kb
CodeCache: size=2496Kb used=1965Kb max_used=1976Kb free=530Kb
Java HotSpot(TM) 64-Bit Server VM warning: CodeCache is full. Compiler has been disabled.
Java HotSpot(TM) 64-Bit Server VM warning: Try increasing the code cache size using -XX:ReservedCodeCacheSize=
```

```
-XX:+TraceClassLoading -XX:NativeMemoryTracking=detail -XX:+TraceClassUnloading -XX:ReservedCodeCacheSize=2496k -XX:+PrintCodeCache \
-XX:+PrintCodeCacheOnCompilation
```


jvm启动参数中要加入:  `-XX:NativeMemoryTracking=detail`
```
jcmd <PID>  VM.native_memory
```

```
➜  /  jcmd 13009 help
13009:
The following commands are available:
JFR.stop
JFR.start
JFR.dump
JFR.check
VM.native_memory
VM.check_commercial_features
VM.unlock_commercial_features
ManagementAgent.stop
ManagementAgent.start_local
ManagementAgent.start
GC.rotate_log
Thread.print
GC.class_stats
GC.class_histogram
GC.heap_dump
GC.run_finalization
GC.run
VM.uptime
VM.flags
VM.system_properties
VM.command_line
VM.version
help
```


```
jcmd 15227  VM.native_memory
15227:

Native Memory Tracking:

Total: reserved=4313017KB, committed=696329KB
-                 Java Heap (reserved=3053568KB, committed=490496KB)
                            (mmap: reserved=3053568KB, committed=490496KB) 
 
-                     Class (reserved=1080988KB, committed=36124KB)
                            (classes #5580)
                            (malloc=5788KB #4445) 
                            (mmap: reserved=1075200KB, committed=30336KB) 
 
-                    Thread (reserved=41361KB, committed=41361KB)
                            (thread #41)
                            (stack: reserved=41120KB, committed=41120KB)
                            (malloc=130KB #206) 
                            (arena=111KB #80)
 
-                      Code (reserved=2669KB, committed=2669KB)
                            (malloc=133KB #712) 
                            (mmap: reserved=2536KB, committed=2536KB) 
 
-                        GC (reserved=117342KB, committed=108590KB)
                            (malloc=5774KB #190) 
                            (mmap: reserved=111568KB, committed=102816KB) 
 
-                  Compiler (reserved=151KB, committed=151KB)
                            (malloc=21KB #84) 
                            (arena=131KB #3)
 
-                  Internal (reserved=6790KB, committed=6790KB)
                            (malloc=6758KB #7487) 
                            (mmap: reserved=32KB, committed=32KB) 
 
-                    Symbol (reserved=8902KB, committed=8902KB)
                            (malloc=5474KB #44532) 
                            (arena=3428KB #1)
 
-    Native Memory Tracking (reserved=1056KB, committed=1056KB)
                            (malloc=122KB #1926) 
                            (tracking overhead=934KB)
 
-               Arena Chunk (reserved=188KB, committed=188KB)
                            (malloc=188KB) 

```

```
-                      Code (reserved=2669KB, committed=2669KB)
                            (malloc=133KB #712) 
                            (mmap: reserved=2536KB, committed=2536KB) 
```

# heap


# noheap


## 参考

- [[技巧] [Java]如何检查CodeCache空间使用情况 - Akira的技术说明](http://luozengbin.github.io/blog/2015-09-01-%5Btips%5D%5Bjava%5Dcodecache%E9%A0%98%E5%9F%9F%E4%BD%BF%E7%94%A8%E7%8A%B6%E6%B3%81%E3%81%AE%E7%A2%BA%E8%AA%8D%E6%96%B9%E6%B3%95.html)