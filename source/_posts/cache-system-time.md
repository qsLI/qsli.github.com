title: 缓存System.currentTimeMillis的调用
tags: cache
category: java
toc: true
date: 2017-12-02 22:16:31
---


## 系统时间缓存的必要

{% asset_img time-cache.jpg %}

除了网络服务器，监控系统和日志系统也会频繁的调用`System.currentTimeMillis`。看公
司内部实现的异步日志中就对系统时间进行了缓存。

## 实现

{% gist a42cea0411b2cff131f34d82d030115b %}

## 测试

使用`JMH`做一个`benchmark`压力测试， `JMH`在做测试之前会有预热的过程，以排
除`jit`等因素的影响，在系统达到稳定运行的时候再去对比两个方法的调用。

```java
 public static void main(String[] args) throws RunnerException {
 Options opt = new OptionsBuilder()
                .include(CurrentTimeMillions.class.getSimpleName())
                .mode(Mode.AverageTime)
                .measurementIterations(2000)
                .forks(1)
                .build();

        new Runner(opt).run();
    }
```

结果如下：

```

# Run complete. Total time: 01:07:53

Benchmark                            Mode   Cnt   Score     Error  Units
CurrentTimeMillions.test             avgt  2000  ≈ 10⁻⁸             s/op
CurrentTimeMillions.testSystemTimer  avgt  2000  ≈ 10⁻⁹             s/op
```

可以看到还是差了一个数量级，如果对时间的精度要求没有那么高，还是可以缓存下的。


## 查看调用的系统方法

使用`strace`attach 到当前的进程，查看进程相应的调用

```bash
sudo strace -p  [pid]
```

输出结果如下：

```
➜ sudo strace -p 15588
strace: Process 15588 attached
futex(0x7f8c175f99d0, FUTEX_WAIT, 15589, NULL
```

并没有看到具体的系统调用，查找原因发现：

> 这里使用 ltrace 是因为 linux 支持 VDSO 之后，gettimeofday 属于快速系统调用，使
> 用 strace 是看不到执行结果的。

> What is actually happening here is that we are linking to the vDSO (virtual
> dynamic shared object), which is a small fully relocatable shared library
> pre-mapped into the user address space. The linking happens during the first
> call of gettimeofday, after which the call is resolved, and the first indirect
> jump goes straight into the function.

重新使用`ltrace`查看：

命令：

```bash
➜  ~  sudo ltrace  -c -S  -p 16365
^C% time     seconds  usecs/call     calls      function
------ ----------- ----------- --------- --------------------
 76.73   14.190163        1880      7544 SYS_getegid32
 23.27    4.303741      614820         7 SYS_madvise1
  0.00    0.000197          24         8 SYS_exit
------ ----------- ----------- --------- --------------------
100.00   18.494101                  7559 total
```

然而还是没有看到`gettimeofday`的调用，具体原因不得而知。

## 结论

> premature optimization is the root of all evil 过早优化是万恶之源

如果系统的性能能满足我们的要求，就不要过早的做这些优化 ; 系统优化之前需要先做
profiling，找到真正的瓶颈，在次之前需要保持系统的简单，可靠。

## 参考

1. [SystemTimer CurrentTimeMillis 时间缓存 - CSDN 博客](http://blog.csdn.net/will_awoke/article/details/27084907)

2. 《NIO trick and trap 》

3. [System.nanoTime() 的实现分析 – 陈飞 – 码农](http://feiyang21687.github.io/SystemNano/)

4. [jdk8 中的时间获取](http://blog.caoxudong.info/blog/2017/09/08/currentTimeMillis_in_java)

5. [The slow currentTimeMillis()](http://pzemtsov.github.io/2017/07/23/the-slow-currenttimemillis.html)

6. [Bug ID: JDK-8185891 System.currentTimeMillis() is slow on Linux, especially with the HPET time source](http://bugs.java.com/bugdatabase/view_bug.do?bug_id=JDK-8185891)
