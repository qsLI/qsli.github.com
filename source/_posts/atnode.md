title: atnode——在集群上批量执行命令
tags: shell
category: linux
toc: true

date: 2016-12-13 00:07:02
---


## atnodes

atnode是一个用perl写成的工具，它可以方便的在集群上执行命令

[官网链接](http://search.cpan.org/~agent/SSH-Batch-0.029/bin/atnodes)


```bash
atnodes "echo alias grep=\'grep -n --color\' >> ~/.bashrc "  xxx.xx[1-10].com  yyy.yy[1-10].com
```

上述的命令就会在后面两个列表的主机上都执行一遍了。


## tonodes

与atnodes类似，tonodes 可以将文件传输到集群上的没一个文件

## 其他

fornodes: Expand patterns to machine host list

key2nodes: Push SSH public keys to remote clusters 

## 作者博客

[agentzh的微博](http://weibo.com/u/1834459124?topnav=1&wvr=6&topsug=1&is_all=1)