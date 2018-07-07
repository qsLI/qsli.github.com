title: swap
toc: true
tags:
category:
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


vm.swappiness = 0，表示只有在避免OOM的时候才进行swap操作；(*并不是关闭swap*)
vm.swappiness = 60，系统默认值；
vm.swappiness = 100，系统主动的进行swap操作。

关闭swap

```
cat /proc/sys/vm/swappiness
sudo echo 0 > /proc/sys/vm/swappiness
sudo echo 0 | sudo tee /proc/sys/vm/swappiness
sudo swapoff/swapon -a
```

## 参考

- [Linux的OOM killer简单测试 - carlosfu--专注于java服务端开发 - ITeye博客](http://carlosfu.iteye.com/blog/2276955)
- [Qunar技术沙龙](https://mp.weixin.qq.com/s?__biz=MzA3NDcyMTQyNQ==&mid=206046053&idx=1&sn=76f7a31003d80c3089c3a266e4b139e0&3rd=MzA3MDU4NTYzMw==&scene=6#rd)
- [learning-kernel/mem-management.rst at master · datawolf/learning-kernel](https://github.com/datawolf/learning-kernel/blob/master/source/mem-management.rst)
- [理解Linux的memory overcommit | Linux Performance](http://linuxperf.com/?p=102)
- [Linux虚拟内存系统常用参数说明 - CSDN博客](https://blog.csdn.net/justlinux2010/article/details/19482359)