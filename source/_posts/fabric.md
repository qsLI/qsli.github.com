title: fabric 分布式部署
date: 2015-11-03 23:55:34
tags: fabric  运维
category: python linux
---

## 前言
   在一台linux主机上执行命令，如果太繁琐可以写成 Shell 脚本；如果在一个集群上批量执行命令呢？
一台一台的ssh登录去执行当然是可以的，如果集群太大，就太繁琐了。下面介绍一些在集群上执行命令的方法。

## ssh 远程执行命令
	通过 ssh 可以按照下面的方式远程执行命令
``` bash
 ssh user@host 'command1;command2;command3'
```
或者使用管道
``` bash
 ssh user@host 'command1|command2|command3'
```
或者使用如下的
``` bash
	$ ssh [user]@[server] << EOF
	command 1
	command 2
	command 3
	EOF
```
或者将要执行的命令写入 Shell 脚本
``` bash
	$ ssh user@host 'bash -s' < local_script.sh
```

可以通过指定ssh 参数 `-o StrictHostKeyChecking=no` 来省去下面的交互过程 
 
![](http://farm8.staticflickr.com/7399/8778510478_4a428cc5f4.jpg)

**但是上面的方法执行 sudo 命令的时候会出错**
此时需要加上 ssh 的 `-t` 参数
man 一下 ssh 查找 -t 参数可以看到如下的解释

> -t      
> Force pseudo-tty allocation.  This can be used to execute arbi‐
             trary screen-based programs on a remote machine, which can be
             very useful, e.g. when implementing menu services.  Multiple -t
             options force tty allocation, even if ssh has no local tty.

具体的意思就是强制提供一个远程服务器的虚拟tty终端
``` bash
	ssh -t -p port user@host 'cmd'
```
即可执行sudo命令，但是自己还要手工输入远程服务器的密码
---
要想写在脚本中自动执行还需要使用 expect
expect是 linux下的一个命令用来处理执行命令中的交互，python 也有相应的库 pexpect
> Expect  is a program that "talks" to other interactive programs accord‐
       ing to a script. 

下面是参考的一些文章
 > [Send Remote Commands Via SSH](http://malcontentcomics.com/systemsboy/2006/07/send-remote-commands-via-ssh.html)
 > [Running Commands on a Remote Linux Server over SSH](http://www.shellhacks.com/en/Running-Commands-on-a-Remote-Linux-Server-over-SSH)

## 其他集群管理命令

如 pssh mussh

> [linux集群管理工具mussh和pssh](http://xiaorui.cc/2014/07/09/linux%E9%9B%86%E7%BE%A4%E7%AE%A1%E7%90%86%E5%B7%A5%E5%85%B7mussh%E5%92%8Cpssh/)

## fabric 

fabric 是基于 ssh 的一个python库，主要用来做运维或者批量部署
[fabric官网](http://www.fabfile.org/)
* 安装 fabric
``` bash
	pip install fabric
```

安装完成即可使用 fabric，fabric上手简单，功能强大

``` bash
	fab -f xxx.py command
```
fab 默认在当前目录下寻找 fabfiles，如果你的文件是其他的名字，使用 `-f`指定即可

脚本的编写
``` python
	from fabric.api import run

	def host_type():
		run('uname -s')
```
运行
``` bash
	$ fab -H localhost,linuxbox host_type
		[localhost] run: uname -s
		[localhost] out: Darwin
		[linuxbox] run: uname -s
		[linuxbox] out: Linux
		
		Done.
		Disconnecting from localhost... done.
		Disconnecting from linuxbox... done.
```
使用 `-H`可以指定运行的host， 也可以在代码中指定。
用户名和密码都是存在 env 环境变量中，也可在脚本中更改
[The environment dictionary](http://docs.fabfile.org/en/1.10/usage/env.html?highlight=env)

同时 fabric 还提供了一些装饰器，具体的可以查文档
``` python
	@parralel
	@task
	@role()
	@host()
```
详细讲解可以参考这篇文章 [Python fabric实现远程操作和部署 ](http://wklken.me/posts/2013/03/25/python-tool-fabric.html)
