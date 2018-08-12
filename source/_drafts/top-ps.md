title: 找到jvm中占用cpu最高的线程
toc: true
tags:
category:
---


## show-busy-java-threads

ps和pcpu:

```
       %cpu        %CPU      cpu utilization of the process in "##.#" format.  Currently, it is the CPU time used divided by the time the
                             process has been running (cputime/realtime ratio), expressed as a percentage.  It will not add up to 100%
                             unless you are lucky.  (alias pcpu).
```

## qunar内部的slow_stack

top

```
1. %CPU  --  CPU Usage
           The task's share of the elapsed CPU time since the last screen update, expressed as a percentage of total CPU time.

           In a true SMP environment, if a process is multi-threaded and top is not operating in Threads mode, amounts greater than 100% may
           be reported.  You toggle Threads mode with the `H' interactive command.

           Also for multi-processor environments, if Irix mode is Off, top will operate in Solaris mode where a task's  cpu  usage  will  be
           divided by the total number of CPUs.  You toggle Irix/Solaris modes with the `I' interactive command.

```

## greys

```
apt-get source procps
cd procps*/ps
vim HACKING
```

## 参考

- [纠结ps和top的cpu占用率不一致问题 | 峰云就她了](http://xiaorui.cc/2017/04/26/%E7%BA%A0%E7%BB%93ps%E5%92%8Ctop%E7%9A%84cpu%E5%8D%A0%E7%94%A8%E7%8E%87%E4%B8%8D%E4%B8%80%E8%87%B4%E9%97%AE%E9%A2%98/)
- [Top and ps not showing the same cpu result - Unix & Linux Stack Exchange](https://unix.stackexchange.com/questions/58539/top-and-ps-not-showing-the-same-cpu-result)