title: shell命令长度限制
tags: limit
category: shell
toc: true
date: 2017-02-06 01:08:23
---


## 两个命令

### ARG_MAX

>The limit for the length of a command line is not imposed by the shell, but by the operating system. This limit is usually in the range of hundred kilobytes. POSIX denotes this limit ARG_MAX and on POSIX conformant systems you can query it with

```bash
$ getconf ARG_MAX    # Get argument limit in bytes
```
在我的cygwin上的结果:

```
➜  getconf ARG_MAX
32000
```


### xargs --show-limits

我的Cygwin上的结果

```
➜   xargs --show-limits
您的环境变量占有 7787 个字节
此系统的参数长度 POSIX 上限: 22165
所有系统中所允许的最小参数长度 POSIX 上限: 4096
我们实际能用的最大命令长度: 14378
我们实际能用的命令缓冲区的大小: 22165
Maximum parallelism (--max-procs must be no greater): 2147483647

xargs 中的命令现在将继续执行，并且它会尝试读取输入并运行命令；如果您不想它发生，请按下“文件结束”按键(ctrl-D)。
警告: echo 将至少运行一次。如果您不想它发生，请按下中断按键。(ctrl-C)
```

## 绕过限制

使用脚本编写。

## 参考

1. [shell - Bash command line and input limit - Stack Overflow](http://stackoverflow.com/questions/19354870/bash-command-line-and-input-limit)

2. [Maximum length of command line argument that can be passed to SQL*Plus (from Linux C Shell)? - Stack Overflow](http://stackoverflow.com/questions/6846263/maximum-length-of-command-line-argument-that-can-be-passed-to-sqlplus-from-lin)