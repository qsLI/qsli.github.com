---
title: ssh免密码登录设置
tags: ssh
category: linux
toc: true
abbrlink: 14062
date: 2015-10-08 16:00:08
---

## 应用场景
  现有A和B两台机器，我们要实现A在ssh登录到B的时候不用输入密码，B->A的过程类似
## 具体过程
  1. 在**A机器**上，生成 ssh 公钥密钥对
	``` bash
	$ ssh-keygen -t rsa
	```
  2.  生成的文件存在 ~/.ssh/目录下，windows存在C\Users\your_name\.ssh\ 目录下
	id_rsa是私钥，id_rsa.pub是公钥

  3.  将A中生成的公钥加入到**B机器**的 authorized_keys 这个文件中，默认目录linux下是~/.ssh/ ，没有的话可以自己新建
	拷贝的过程可以使用以下命令
	``` bash
	$ ssh-copy-id -i 公钥文件路径 -p ssh端口  user@server
	```
	>ssh-copy-id  -  install  your  public  key in a remote machine's autho‐rized_keys. 
	>If the  -i  option  is  given  then  the  identity  file  (defaults  to ~/.ssh/id_rsa.pub) is used,
	>regardless of whether there are any keys in your ssh-agent.

此时A机器 ssh 登录B机器是不需要密码的



