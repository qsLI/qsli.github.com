title: 使用google perf工具来排查堆外内存占用
tags: google-perf
category: perf
toc: true
date: 2017-12-02 19:24:38
---


## 现象

线上机器内存不足，经常被系统`oom killer`干掉。

如果`tomcat`运行的好好的，突然被干掉了，没有任何线索，那么就可以使用下面的命令看看是不是`oom killer`搞的鬼

```bash
sudo dmesg | grep -i kill | less

Out of memory: Kill process 23195 (java) score 558 or sacrifice child
Killed process 23195, UID 40001, (java) total-vm:81176732kB, anon-rss:64507900kB, file-rss:2604kB
```

其中`anon-rss`是程序占用的物理内存，  64507900kB = 61.519527435302734 GB
系统总的内存也才`62GB`，linux发现没有可分配的内存，就会启用`oom killer`的机制，根据`oom_score_adj`的值去干掉相应的进程了。

系统上`oom_score_adj`的值

```
43722 total pagecache pages
4335 pages in swap cache
Swap cache stats: add 1009840, delete 1005505, find 76432470/76485037
Free swap  = 49990420kB
Total swap = 50331644kB
16777215 pages RAM
282254 pages reserved
36481 pages shared
16386140 pages non-shared
[ pid ]   uid  tgid total_vm      rss cpu oom_adj oom_score_adj name
[ 1419]     0  1419     2883       94  18     -17         -1000 udevd
[ 2894]     0  2894     2660      105   6     -17         -1000 udevd
[ 2895]     0  2895     2882       43   2     -17         -1000 udevd
[  388]     0   388    16557       63  12     -17         -1000 sshd
[ 1340]     0  1340   152806     9114   6       0             0 salt-minion
[ 1341]     0  1341   110173     5224  22       0             0 salt-minion
[14168]     0 14168     6899      149   6     -17         -1000 auditd
```

`tomcat`的进程占用内存最多，得分也最高 —— 558

### tomcat的配置


```bash
 -Xms44g -Xmx44g -server \
-XX:+UseG1GC -XX:MaxGCPauseMillis=200 \
-XX:InitiatingHeapOccupancyPercent=65 -XX:SurvivorRatio=8 \
-XX:MaxTenuringThreshold=15 \
-verbosegc -XX:+PrintGCDetails -XX:+PrintGCTimeStamps -XX:+PrintGCDateStamps \
-XX:+PrintTenuringDistribution -XX:+PrintAdaptiveSizePolicy \
-XX:-TraceClassUnloading \
-XX:+DisableExplicitGC 
```

jvm最大的堆只有44GB， 但是从上面的日志中看到实际占用的内存达到了62GB，几乎把整个系统的内存都吃掉了。
既然堆内没有问题，问题自然应该出在堆外内存的占用上。

## java 堆外内存

[JVM源码分析之堆外内存完全解读 - 你假笨](http://lovestblog.cn/blog/2015/05/12/direct-buffer/) 中说道：

>对于System.gc的实现，之前写了一篇文章来重点介绍，JVM源码分析之SystemGC完全解读，它会对新生代的老生代都会进行内存回收，这样会比较彻底地回收DirectByteBuffer对象以及他们关联的堆外内存，我们dump内存发现DirectByteBuffer对象本身其实是很小的，但是它后面可能关联了一个非常大的堆外内存，因此我们通常称之为『冰山对象』，我们做ygc的时候会将新生代里的不可达的DirectByteBuffer对象及其堆外内存回收了，但是无法对old里的DirectByteBuffer对象及其堆外内存进行回收，这也是我们通常碰到的最大的问题，如果有大量的DirectByteBuffer对象移到了old，但是又一直没有做cms gc或者full gc，而只进行ygc，那么我们的物理内存可能被慢慢耗光，但是我们还不知道发生了什么，因为heap明明剩余的内存还很多(前提是我们禁用了System.gc)。

白衣大侠也建议：

>这时，就只能靠前面提到的申请额度超限时触发的system.gc()来救场了。但这道最后的保险其实也不很好，首先它会中断整个进程，然后它让当前线程睡了整整一百毫秒，而且如果gc没在一百毫秒内完成，它仍然会无情的抛出OOM异常。还有，万一，万一大家迷信某个调优指南设置了-DisableExplicitGC禁止了system.gc()，那就不好玩了。
>所以，堆外内存还是自己主动点回收更好，比如Netty就是这么做的。


### 限制堆外内存的大小

加上`-XX:MaxDirectMemorySize=4g`， 去除`-XX:+DisableExplicitG`观察了几天，发现并不能解决问题，于是继续使用`google perf tools`去观察下堆外内存的使用

## google perf tools

[下载地址](https://github.com/gperftools/gperftools/tree/master)

### 原理

> 该工具主要利用了unix的一个环境变量LD_PRELOAD，它允许你要加载的动态库优先加载起来，相当于一个Hook了，
> 于是可以针对同一个函数可以选择不同的动态库里的实现了，比如googleperftools就是将malloc方法替换成了tcmalloc的实现，这样就可以跟踪内存分配路径了

### 使用

`tomcat`的启动变量中加入下面的配置
```bash
export LD_PRELOAD=/usr/local/lib/libtcmalloc.so
export HEAPPROFILE=/home/q/perf-result/
export HEAP_PROFILE_ALLOCATION_INTERVAL=2000000000
```
HEAPPROFILE是存放结果的地址

>HEAP_PROFILE_ALLOCATION_INTERVAL	default: 1073741824 (1 Gb)	Dump heap profiling information once every specified number of bytes has been allocated by the program.

查看运行中的日志:
```
Dumping heap profile to /home/q/perf-result/_23207.0927.heap (1755151 MB allocated cumulatively, 1267 MB currently in use) 
```

日志中会显示累计的对外内存的分配和当前使用的堆外内存的大小。

### 分析结果

#### 文本形式的

命令：
```bash
/usr/local/bin/pprof --text /home/q/java/default/bin/java _23207.0035.heap
```

输出结果如下：

```
Using local file /home/q/java/default/bin/java.
Using local file _23207.1012.heap.
Total: 1283.1 MB

     0.0   0.0% 100.0%     39.5   3.1% PtrQueue::enqueue_known_active
     0.0   0.0% 100.0%     39.5   3.1% PtrQueueSet::allocate_buffer
     0.0   0.0% 100.0%     42.2   3.3% G1ParTask::work
     0.0   0.0% 100.0%     42.2   3.3% GangWorker::loop
     0.0   0.0% 100.0%     75.6   5.9% ObjArrayKlass::oop_oop_iterate_nv_m@8fbe80
     0.0   0.0% 100.0%    146.2  11.4% 0x00007f63bf0e5825
     0.0   0.0% 100.0%    146.2  11.4% JVM_InternString
     0.0   0.0% 100.0%    146.2  11.4% StringTable::intern@a24ca0
     0.0   0.0% 100.0%    147.2  11.5% StringTable::basic_add
     0.0   0.0% 100.0%    147.3  11.5% StringTable::intern@a24780
     0.0   0.0% 100.0%    152.4  11.9% Hashtable::new_entry
     0.0   0.0% 100.0%    170.5  13.3% AllocateHeap
     0.0   0.0% 100.0%    256.0  20.0% ConcurrentMark::ConcurrentMark
     0.0   0.0% 100.0%    265.5  20.7% InstanceKlass::oop_oop_iterate_nv
     0.0   0.0% 100.0%    287.2  22.4% G1CollectedHeap::initialize
     0.0   0.0% 100.0%    305.4  23.8% Universe::initialize_heap
     0.0   0.0% 100.0%    306.3  23.9% universe_init
     0.0   0.0% 100.0%    307.0  23.9% init_globals
     0.0   0.0% 100.0%    307.1  23.9% JNI_CreateJavaVM
     0.0   0.0% 100.0%    307.1  23.9% Threads::create_vm
     0.0   0.0% 100.0%    307.2  23.9% JavaMain
     0.0   0.0% 100.0%    326.5  25.4% ConcurrentG1RefineThread::run
     0.0   0.0% 100.0%    326.5  25.4% RefineCardTableEntryClosure::do_card_ptr
     0.0   0.0% 100.0%    329.8  25.7% 0x00007f63bfae74a7
     0.0   0.0% 100.0%    348.5  27.2% DirtyCardQueueSet::apply_closure_to_completed_buffer
     0.0   0.0% 100.0%    349.7  27.3% G1RemSet::refine_card
     0.0   0.0% 100.0%    349.7  27.3% HeapRegion::oops_on_card_seq_iterate_careful
     0.0   0.0% 100.0%    349.7  27.3% OtherRegionsTable::add_reference
     0.0   0.0% 100.0%    351.0  27.4% os::malloc@913e80
     0.0   0.0% 100.0%    351.0  27.4% Unsafe_AllocateMemory
     0.0   0.0% 100.0%    408.4  31.8% java_start
     0.0   0.0% 100.0%    562.6  43.8% BitMap::resize
     0.0   0.0% 100.0%    598.5  46.6% ArrayAllocator::allocate
     0.0   0.0% 100.0%    715.5  55.8% __clone
     0.0   0.0% 100.0%    715.5  55.8% start_thread
  1277.3  99.5%  99.5%   1277.3  99.5% os::malloc@9137e0
```

结果代表的含义:

```
Analyzing Text Output

Text mode has lines of output that look like this:

       14   2.1%  17.2%       58   8.7% std::_Rb_tree::find
Here is how to interpret the columns:

1. Number of profiling samples in this function
2. Percentage of profiling samples in this function
3. Percentage of profiling samples in the functions printed so far
4. Number of profiling samples in this function and its callees
5. Percentage of profiling samples in this function and its callees
6. Function name
```

[Gperftools CPU Profiler](https://gperftools.github.io/gperftools/cpuprofile.html)中有更加详细的说明

#### pdf形式的结果

相比文字的结果，图片形式的调用关系，更加清楚和直观。

命令如下:

```bash
sudo yum install ghostscript
sudo yum install dot
sudo yum install graphviz -y
sudo pprof --pdf  /home/q/java/default/bin/java _19877.19793.heap > result.pdf
```

结果：

{% pdf  result.pdf %}

## 可能的原因

从google perf tools的结果来看主要的堆外内存来自

```
0x00007f52e05126a5
0.0 (0.0%)
of 7089.3 (82.5%)
```

这个再往上就没有地址了。

### heap 占用

查看出问题机器的`heap`占用情况如下

```
jmap -histo:live `pgrep -f 'tomcat'`

 num     #instances         #bytes  class name

----------------------------------------------

   1:      15272979      940261992  [C

   2:      19182959      767318360  java.util.ArrayList

   3:      15397474      739078752  qunar.tc.plato.zeno.util.collections.offheap.map.OffHeapHashMap

   4:      13281544      637514112  java.util.concurrent.ConcurrentHashMap$Node

   5:      10136730      612997544  [Ljava.lang.Object;

   6:      15265576      488498432  java.lang.String

   7:       4694324      413100512  _plato.com.qunar.hotel.price.data.center.plato.beans.shotel.IMetaSHotelBizInfo

   8:           854      379525944  [Ljava.util.concurrent.ConcurrentHashMap$Node;

   9:      15397474      369539376  qunar.tc.plato.zeno.util.collections.offheap.set.OffHeapHashSet

  10:       4694324      337991328  _plato.com.qunar.hotel.price.data.center.plato.beans.shotel.IMetaContactConfig
```

前面的都是去哪儿自己开发的堆外缓存占用的对象，缓存的内容也多是酒店相关的元数据。结合工具的结果，推测问题出在堆外缓存。
堆外缓存采用的是内存映射的方式，大量使用了`DirectByteBuffer`这种冰山对象。

### 疑点

这个系统目前处于重构阶段，之前也是使用的堆外缓存，并没有出现问题。不过，目前在逐渐下掉堆外缓存的使用，到时候可以再看看是否出问题。

## 杂谈

### 使用pmap查看进程的内存映射

```
sudo -u tomcat pmap -x  25147 | less

Address           Kbytes     RSS   Dirty Mode   Mapping
0000000000400000       4       0       0 r-x--  java
0000000000600000       4       4       4 rw---  java
0000000001d3f000    1484    1224    1224 rw---    [ anon ]
0000003e0a400000     128     112       0 r-x--  ld-2.12.so
0000003e0a61f000       4       4       4 r----  ld-2.12.so
0000003e0a620000       4       4       4 rw---  ld-2.12.so
0000003e0a621000       4       4       4 rw---    [ anon ]
0000003e0a800000       8       8       0 r-x--  libdl-2.12.so
0000003e0a802000    2048       0       0 -----  libdl-2.12.so
0000003e0aa02000       4       4       4 r----  libdl-2.12.so
0000003e0aa03000       4       4       4 rw---  libdl-2.12.so
0000003e0ac00000    1576     680       0 r-x--  libc-2.12.so
0000003e0ad8a000    2048       0       0 -----  libc-2.12.so
0000003e0af8a000      16      16       8 r----  libc-2.12.so
0000003e0af8e000       4       4       4 rw---  libc-2.12.so
0000003e0af8f000      20      20      20 rw---    [ anon ]
0000003e0b000000      92      72       0 r-x--  libpthread-2.12.so
0000003e0b017000    2048       0       0 -----  libpthread-2.12.so
0000003e0b217000       4       4       4 r----  libpthread-2.12.so
0000003e0b218000       4       4       4 rw---  libpthread-2.12.so
0000003e0b219000      16       4       4 rw---    [ anon ]
```

将内存块的内容dump成文件（慎重，会影响服务）
```
sudo  gdb --batch --pid 25147 -ex " dump memory /home/qisheng.li/c.dump 0x00007eefcc000000 0x00007eefcf000000"
```

查看文件的内容：

```
[qisheng.li@xxx.h.cn2 ~]$ view c.dump
```

{% asset_image  '2017年 09月 05日 星期二 01:34:24 CST.png' %}

这个dump是我在`2017年 09月 05日 星期二 01:34:24 CST`做的，但是内容看起来是tomcat respone的内容，奇怪的是内容的时间是`2017 17:38:18 GMT`，不知道是什么原因导致的，如果你知道，烦请告知。

直接查看堆外的内存块，无疑是最快排查堆外占用的方法，但是内存块的选择非常依赖经验， 我尝试了下，并没有找到问题。

`参考5`中的大神，通过dump内存块，发现是netty使用的`directBuffer`分配的大量64M的内存块。


#### JDK8中的 Native Memory Tracker

在启动参数中开启：
```
-XX:NativeMemoryTracking=[off | summary | detail]
```
也可以在jvm退出的时候，打印相关的统计信息
>NMT at VM Exit
>Use the following VM diagnostic command line option to obtain last memory usage data at VM exit when Native Memory Tracking is enabled. The level of detail is based on tracking level.
```
-XX:+UnlockDiagnosticVMOptions -XX:+PrintNMTStatistics
```
在程序运行时可以使用`jcmd`查看内存的分配情况
```
jcmd <pid> VM.native_memory [summary | detail | baseline | summary.diff | detail.diff | shutdown] [scale= KB | MB | GB]
```

输出的结果:

```

sudo -u tomcat jcmd `pgrep -f tomcat` VM.native_memory detail
31549:

Native Memory Tracking:

Total: reserved=50215227KB, committed=49947839KB
-                 Java Heap (reserved=46137344KB, committed=46137344KB)
                            (mmap: reserved=46137344KB, committed=46137344KB) 
 
-                     Class (reserved=92639KB, committed=91707KB)
                            (classes #14958)
                            (malloc=2527KB #50184) 
                            (mmap: reserved=90112KB, committed=89180KB) 
 
-                    Thread (reserved=914804KB, committed=914804KB)
                            (thread #883)
                            (stack: reserved=906696KB, committed=906696KB)
                            (malloc=2904KB #4435) 
                            (arena=5203KB #1764)
 
-                      Code (reserved=263567KB, committed=87223KB)
                            (malloc=13967KB #19565) 
                            (mmap: reserved=249600KB, committed=73256KB) 
 
-                        GC (reserved=1849937KB, committed=1849937KB)
                            (malloc=105041KB #121050) 
                            (mmap: reserved=1744896KB, committed=1744896KB) 
 
-                  Compiler (reserved=13354KB, committed=13354KB)
                            (malloc=3061KB #3484) 
                            (arena=10292KB #13)
 
-                  Internal (reserved=813935KB, committed=813935KB)
                            (malloc=813903KB #102254) 
                            (mmap: reserved=32KB, committed=32KB) 
 
-                    Symbol (reserved=18071KB, committed=18071KB)
                            (malloc=14355KB #138545) 
                            (arena=3716KB #1)
 
-    Native Memory Tracking (reserved=7274KB, committed=7274KB)
                            (malloc=298KB #4295) 
                            (tracking overhead=6976KB)
 
-               Arena Chunk (reserved=14191KB, committed=14191KB)
                            (malloc=14191KB) 
 
-                   Unknown (reserved=90112KB, committed=0KB)
                            (mmap: reserved=90112KB, committed=0KB) 
 
Virtual memory map:
 
[0x00007ef481693000 - 0x00007ef481794000] reserved and committed 1028KB for Thread Stack from
    [0x00007f0486546f74] JavaThread::run()+0x24
    [0x00007f04863fab88] java_start(Thread*)+0x108
 
[0x00007ef481794000 - 0x00007ef481895000] reserved and committed 1028KB for Thread Stack from
    [0x00007f0486546f74] JavaThread::run()+0x24
    [0x00007f04863fab88] java_start(Thread*)+0x108
 
[0x00007ef48224d000 - 0x00007ef48244d000] reserved 2048KB for Class from
    [0x00007f0486593c66] ReservedSpace::initialize(unsigned long, unsigned long, bool, char*, unsigned long, bool)+0x256
    [0x00007f0486593d0b] ReservedSpace::ReservedSpace(unsigned long, unsigned long, bool, char*, unsigned long)+0x1b
    [0x00007f0486379cda] VirtualSpaceNode::VirtualSpaceNode(unsigned long)+0x17a
    [0x00007f048637a59a] VirtualSpaceList::create_new_virtual_space(unsigned long)+0x5a

	[0x00007ef48228d000 - 0x00007ef4823cd000] committed 1280KB from
            [0x00007f0486593549] VirtualSpace::expand_by(unsigned long, bool)+0x199
            [0x00007f0486377936] VirtualSpaceList::expand_node_by(VirtualSpaceNode*, unsigned long, unsigned long)+0x76
            [0x00007f048637a750] VirtualSpaceList::expand_by(unsigned long, unsigned long)+0xf0
            [0x00007f048637a8e3] VirtualSpaceList::get_new_chunk(unsigned long, unsigned long, unsigned long)+0xb3

	[0x00007ef48224d000 - 0x00007ef48228d000] committed 256KB from
            [0x00007f0486593549] VirtualSpace::expand_by(unsigned long, bool)+0x199
            [0x00007f0486377936] VirtualSpaceList::expand_node_by(VirtualSpaceNode*, unsigned long, unsigned long)+0x76
            [0x00007f048637a8e3] VirtualSpaceList::get_new_chunk(unsigned long, unsigned long, unsigned long)+0xb3
            [0x00007f048637c432] SpaceManager::grow_and_allocate(unsigned long)+0x2d2

```

{% asset_image memory-mapping.jpg %}

如果通过上述的映射关系能直接找到系统的`StringTable`等对应的分区，dump内存下来应该能很快的发现问题，不知道行不行得通。




## 参考

1. [进程物理内存远大于Xmx的问题分析 - 你假笨](http://lovestblog.cn/blog/2015/08/21/rssxmx/)

2. [JVM源码分析之堆外内存完全解读 - 你假笨](http://lovestblog.cn/blog/2015/05/12/direct-buffer/)

3. [Netty之Java堆外内存扫盲贴 | 江南白衣](http://calvin1978.blogcn.com/articles/directbytebuffer.html)

4. [Java内存之本地内存分析神器： NMT 和 pmap - CSDN博客](http://blog.csdn.net/jicahoo/article/details/50933469)

5. [Java堆外内存排查小结](http://mp.weixin.qq.com/s?__biz=MzA4MTc4NTUxNQ==&mid=2650518452&idx=1&sn=c196bba265f888ed086b7059ca5d3fd2&chksm=8780b470b0f73d66c79b7df96435d48caa8c49a9a6b696e543c0df24e3356202ccde69f2f671&mpshare=1&scene=1&srcid=0831YG589PwShEgNLJ8CKQOp#rd)

6. [Native Memory Tracking](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/nmt-8.html)

7. [Gperftools CPU Profiler](https://gperftools.github.io/gperftools/cpuprofile.html)

8. [Google Perftools Mac OS 安装与使用 | Whosemario的家](http://whosemario.github.io/2016/09/27/google-preftool-1/index.html)