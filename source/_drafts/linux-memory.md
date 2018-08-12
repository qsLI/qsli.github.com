title: linux-memory
toc: true
tags: memory
category: linux
---


```
➜  qsli.github.com (hexo|✚1…) sysctl -a
abi.vsyscall32 = 1
debug.exception-trace = 1
debug.kprobes-optimization = 1
dev.cdrom.autoclose = 1
dev.cdrom.autoeject = 0
dev.cdrom.check_media = 0
dev.cdrom.debug = 0
dev.cdrom.info = CD-ROM information, Id: cdrom.c 3.20 2003/12/17
dev.cdrom.info = 
dev.cdrom.info = drive name:	
dev.cdrom.info = drive speed:	
dev.cdrom.info = drive # of slots:
...
...
...

vm.overcommit_kbytes = 0
vm.overcommit_memory = 1
vm.overcommit_ratio = 20

vm.oom_dump_tasks = 1
vm.oom_kill_allocating_task = 1
vm.panic_on_oom = 0

vm.swappiness = 30
vm.page-cluster = 3
vm.percpu_pagelist_fraction = 0
vm.stat_interval = 1
```

oom_dump_tasks
> 如果启用，在内核执行OOM-killing时会打印系统内进程的信息（不包括内核线程），信息包括pid、uid、tgid、vm size、rss、nr_ptes，swapents，oom_score_adj和进程名称。这些信息可以帮助找出为什么OOM killer被执行，找到导致OOM的进程，以及了解为什么进程会被选中。
>如果将参数置为0，不会打印系统内进程的信息。对于有数千个进程的大型系统来说，打印每个进程的内存状态信息并不可行。这些信息可能并不需要，因此不应该在OOM的情况下牺牲性能来打印这些信息。
> 如果设置为非零值，任何时候只要发生OOM killer，都会打印系统内进程的信息。默认值是1（启用）。


内核参数 vm.overcommit_memory 接受三种取值：

- 0 – Heuristic overcommit handling. 这是缺省值，它允许overcommit，但过于明目张胆的overcommit会被拒绝，比如malloc一次性申请的内存大小就超过了系统总内存。Heuristic的意思是“试探式的”，内核利用某种算法（对该算法的详细解释请看文末）猜测你的内存申请是否合理，它认为不合理就会拒绝overcommit。
- 1 – Always overcommit. 允许overcommit，对内存申请来者不拒。
- 2 – Don’t overcommit. 禁止overcommit。


vm.panic_on_oom 使得发生OOM时自动重启系统。


oom_kill_allocating_task
> 控制在OOM时是否杀死触发OOM的进程。
>  如果设置为0，OOM killer会扫描进程列表，选择一个进程来杀死。通常都会选择消耗内存内存最多的进程，杀死这样的进程后可以释放大量的内存。
>  如果设置为非零值，OOM killer只会简单地将触发OOM的进程杀死，避免遍历进程列表（代价比较大）。
>  如果panic_on_oom被设置，则会忽略oom_kill_allocating_task的值。
>  默认值是0。



vm.overcommit_kbytes间接设置的，公式如下：
【CommitLimit = (Physical RAM * vm.overcommit_ratio / 100) + Swap】

vm.overcommit_ratio 是内核参数，缺省值是50，表示物理内存的50%。如果你不想使用比率，也可以直接指定内存的字节数大小，通过另一个内核参数 vm.overcommit_kbytes 即可；

换页:

- 文件系统换页

脏的(主存中修改过)  --> 回写磁盘
干净的(没有修改过)  --> 因为磁盘已经存在副本, 页面换出仅仅释放这些内存

- 匿名换页

匿名内存: 无文件系统位置或路径名的内存. 它包括进程地址空间的工作数据, 称作堆.

匿名页面换出要求迁移数据到物理交换设备或者交换文件. Linux用交换(swapping)来命名这种类型的换页.

轻微缺页(min_flt):  该任务不需要从硬盘拷数据而发生的缺页（次缺页）。

严重缺页(maj_flt):  该任务需要从硬盘拷数据而发生的缺页（主缺页）, 需要访问存储设备。

映射的状态:

A. 未分配
B. 已分配, 未映射(未填充并且未发生缺页)
            |               轻微缺页
            |             /
            |缺页  磁盘读写 
            |             \
            |               严重缺页
            v
C. 已分配, 已映射到主存(RAM)
D. 系统压力  --->  已分配, 已映射到物理交换空间(磁盘)

RSS: Resident Set Size 常驻集合大小: 已分配的内存页(C)大小
VIRT:虚拟内存大小, 所有已分配的区域(B+C+D)

交换出一个进程, 要求进程的所有私有数据被写入交换设备, 包括线程结构和进程堆(匿名数据).
进程的一小部分元数据总是常驻于内核内存中, 内核仍能知道已交换出的进程.

页面换出

kswapd()

```
➜  ~ sudo sysctl -a | grep vm.min_free_kbytes
vm.min_free_kbytes = 67584
```



文件系统缓存占用

内部碎片
外部碎片


## 参考

- [learning-kernel/mem-management.rst at master · datawolf/learning-kernel](https://github.com/datawolf/learning-kernel/blob/master/source/mem-management.rst)
- [理解Linux的memory overcommit | Linux Performance](http://linuxperf.com/?p=102)
- [Linux虚拟内存系统常用参数说明 - CSDN博客](https://blog.csdn.net/justlinux2010/article/details/19482359)
- [Linux的OOM killer简单测试 - carlosfu--专注于java服务端开发 - ITeye博客](http://carlosfu.iteye.com/blog/2276955)
- [Linux内核之旅](https://mp.weixin.qq.com/s?__biz=MzI3NzA5MzUxNA==&mid=2664602848&idx=1&sn=8ffebce2c02ed92e7ec5ab309eba0368&mpshare=1&scene=1&srcid=0716mGuzyYJyZs2S1k8FgYD2#rd)
- [Linux Used内存到底哪里去了？ | 系统技术非业余研究](http://blog.yufeng.info/archives/2456)