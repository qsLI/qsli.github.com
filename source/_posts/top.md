title: top用法
tags: top
category: linux
toc: true
date: 2017-09-09 17:31:18
---



# 使用

## 基本用法

top是了解系统状况最常用的命令，从top的输出我们可以很好的掌握系统的CPU, 内存，swap，进程的相关信息。

下面说下top的基本用法：

<BR><BR>

``` bash
[qisheng.li@xxx /home/www/xxx]$ sudo top

top - 15:19:54 up 200 days,  4:06,  1 user,  load average: 5.91, 6.14, 5.57
Tasks: 499 total,   1 running, 498 sleeping,   0 stopped,   0 zombie
Cpu(s): 20.1%us,  1.2%sy,  0.0%ni, 78.4%id,  0.0%wa,  0.0%hi,  0.4%si,  0.0%st
Mem:  65979844k total, 65004736k used,   975108k free,     8108k buffers
Swap: 50331644k total,    29364k used, 50302280k free,  5530672k cached

  PID USER      PR  NI  VIRT  RES  SHR S %CPU %MEM    TIME+  COMMAND                                                                            
 8468 tomcat    20   0 71.2g  55g 6484 S 492.3 87.8  32033:12 java                                                                              
 1256 tomcat    20   0 6055m 251m 2504 S 24.9  0.4  41886:22 java                                                                               
 2446 root      20   0 15304 1568  928 R  0.7  0.0   0:00.11 top                                                                                
30593 root      20   0  526m  31m 3208 S  0.3  0.0   0:15.41 salt-minion                                                                        
    1 root      20   0 19232  632  384 S  0.0  0.0  11:49.23 init                                                                               
    2 root      20   0     0    0    0 S  0.0  0.0   0:00.32 kthreadd                                                                           
    3 root      RT   0     0    0    0 S  0.0  0.0   2:55.22 migration/0                                                                        
    4 root      20   0     0    0    0 S  0.0  0.0   5:49.74 ksoftirqd/0                                                                        
    5 root      RT   0     0    0    0 S  0.0  0.0   0:00.00 stopper/0  
```

### 系统概况

 从输出的第一行来看， 首先是系统的uptime信息(使用`uptime`也可以查看)， 可以看到系统已经运行了200天了，是在`15：19：54`这个时间点启动起来的， `4：06` 是当前的时间， 当前只有一个用户登录(使用`w`也可以查看当前的登录用户)。 还有就是系统的负载——load average，这个有三个值，分别是1分钟的平均负载， 5分钟的， 15分钟的（`uptime`的输出信息中也有这个）。

 第二行包含了系统进程的一些统计信息，Tasks是运行队列中的任务个数（Linux run-queue）， 还有一些其他状态的进程的个数信息

 > - **running**:  CPU 上运行的和将要被调度运行的；

> - **sleeping**: 通常是等待事件(比如 IO 操作)完成的任务，细分可以包括 interruptible 和 uninterruptible 的类型；

> - **stopped**: 是一些被暂停的任务，通常发送 SIGSTOP 或者对一个前台任务操作 Ctrl-Z 可以将其暂停；

> - **zombie**: 僵尸任务，虽然进程终止资源会被自动回收，但是含有退出任务的 task descriptor 需要父进程访问后才能释放，这种进程显示为 `defunct` 状态，无论是因为父进程提前退出还是未 wait 调用，出现这种进程都应该格外注意程序是否设计有误。

### CPU

 第三行是CPU的一些信息，各个部分的占用都很明确。

> - (us) user：CPU 在低 nice 值(高优先级)用户态所占用的时间(nice<=0)。正常情况下只要服务器不是很闲，那么大部分的 CPU 时间应该都在此执行这类程序

> - (sy) system：CPU 处于内核态所占用的时间，操作系统通过系统调用(system call)从用户态陷入内核态，以执行特定的服务；通常情况下该值会比较小，但是当服务器执行的 IO 比较密集的时候，该值会比较大

> - (ni) nice：CPU 在高 nice 值(低优先级)用户态以低优先级运行占用的时间(nice>0)。默认新启动的进程 nice=0，是不会计入这里的，除非手动通过 renice 或者 setpriority() 的方式修改程序的nice值

> - (id) idle：CPU 在空闲状态(执行 kernel idle handler )所占用的时间

> - (wa) iowait：等待 IO 完成做占用的时间

> - (hi) irq：系统处理硬件中断所消耗的时间

> - (si) softirq：系统处理软中断所消耗的时间，记住软中断分为 softirqs、tasklets (其实是前者的特例)、work queues，不知道这里是统计的是哪些的时间，毕竟 work queues 的执行已经不是中断上下文了

> - (st) steal：在虚拟机情况下才有意义，因为虚拟机下 CPU 也是共享物理 CPU 的，所以这段时间表明虚拟机等待 hypervisor 调度 CPU 的时间，也意味着这段时间 hypervisor 将 CPU 调度给别的 CPU 执行，这个时段的 CPU 资源被“stolen”了。这个值在我 KVM 的 VPS 机器上是不为 0 的，但也只有 0.1 这个数量级，是不是可以用来判断 VPS 超售的情况？

iowait所包含的信息其实是非常少的，具体的解释可以看**参考3**中的文章，讲的非常好.

> %iowait 表示在一个采样周期内有百分之几的时间属于以下情况：CPU空闲、并且有仍未完成的I/O请求

### 内存

第四行主要是内存使用的相关信息， 系统的内存总共有`65979844k`， 已经使用` 65004736k`, `975108k`可用， `8108k`缓存, 

65979844k = 65004736k + 975108k

可见缓存的也包含在可用的内存中。

这些信息也可以通过`free -k` （还可以-m, -g 表示展示的单位），`free`的输出如下:

```bash
[qisheng.li@xxx /home/www/xxx]$ free -k
             total       used       free     shared    buffers     cached
Mem:      65979844   64863960    1115884        112       8824    5331160
-/+ buffers/cache:   59523976    6455868 
Swap:     50331644      29364   50302280 
```

`vmstat` 也可以看到系统的内存状况：

```bash
[qisheng.li@xxx /home/www/xxx]$ vmstat 1 3 | column -t
procs  -----------memory----------  ---swap--  -----io----  --system--  -----cpu-----
r      b                            swpd       free         buff        cache          si  so  bi   bo   in     cs     us  sy  id  wa  st
5      1                            29364      2231704      8808        4214104        0   0   124  230  0      0      15  1   84  0   0
6      0                            29364      2219016      8908        4225260        0   0   668  132  47040  68271  25  2   72  0   0
5      0                            29364      2209552      8916        4234020        0   0   512  12   37178  52578  20  2   78  0   0

```

第五行和第四行类似，输出的是swap的使用情况。


### 进程的详细信息

> PID：进程的ID
> USER：进程所有者
> PR：进程的优先级别，越小越优先被执行
> NI：nice值
> VIRT：进程占用的虚拟内存
> RES：进程占用的物理内存
> SHR：进程使用的共享内存
> S：进程的状态。S表示休眠，R表示正在运行，Z表示僵死状态，N表示该进程优先值为负数
> %CPU：进程占用CPU的使用率
> %MEM：进程使用的物理内存和总内存的百分比
> TIME+：该进程启动后占用的总的CPU时间，即占用CPU使用时间的累加值。
> COMMAND：进程启动命令名称

## 高级用法

### 交互命令

- 按照CPU占用排序： 交互模式下输入： `P`

- 按照内存排序： 交互模式下输入： `M`

- 杀死进程： 交互模式下输入: `k`, 然后根据提示输入相应的`pid`

- 更改刷新时间： 交互模式下输入: `d`或者`s`, 然后输入相应的刷新值

- 显示CPU的每个核的使用情况： 交互模式下输入： 键盘上的`1`

top的显示界面会展开：

{% asset_img  cpu.png %}

- 高亮模式： 交互模式下输入: 'z'

{% asset_img  highlight.png %}

- 高亮当前的排序列(需要在z模式下)： 交互模式下输入: 'x'

{% asset_img  highlight-sort.png %}

- 改变排序列： 交互模式下按`shift` + `<`或`>`

- 增加显示的Field： 交互模式下按`f`, 然后选择想要展示的列

{% asset_img  fields.png %}

- 显示到线程级别： 交互模式下按`H`

- 显示完整的命令名称: 交互模式下按`c`

- 分类显示各种系统资源高的进程： 交互模式下按`A`

{% asset_img top-a.png %}

### 命令行参数

- 显示某个进程的线程信息

`top -p <PID> -H`

其中 `-H`是指显示线程的信息，可以看到每个线程的CPU占用情况

{% asset_img top-thread.png %}

- 显示完整的命令： `-c`


# 参考

1. [top实践小技巧 - OPS Notes By 枯木](http://kumu-linux.github.io/blog/2013/06/07/top-hacks/)

2. [Linux服务器的那些性能参数指标](http://mp.weixin.qq.com/s?__biz=MzAxMzQ3NzQ3Nw==&mid=2654249787&idx=2&sn=7aa8e765fda84d5fa26580c210585c53&chksm=8061f031b716792776833370019a9fc4c79fa40ea7db5b4ccb165b90919056acaffd3d971d94&mpshare=1&scene=1&srcid=0801QspCI2Xo04BsZlP6pCVb##)

3. [理解 %iowait (%wio) | Linux Performance](http://linuxperf.com/?p=33)

4. [8. top linux下的任务管理器 — Linux Tools Quick Tutorial](http://linuxtools-rst.readthedocs.io/zh_CN/latest/tool/top.html)
