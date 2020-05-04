---
title: 配置sudo.log
tags: sudo-log
category: linux
toc: true
typora-root-url: 配置sudo.log
typora-copy-images-to: 配置sudo.log
date: 2020-05-01 16:50:02
---



# 日志

## 配置 sudo.log

```bash
[root@yd-test-01-pms log]# touch /var/log/sudo.log
[root@yd-test-01-pms log]# visudo
```

`visudo`有语法检查，比直接修改 `/etc/sudoers`要安全些， 在末尾加入：

```bash
Defaults logfile=/var/log/sudo.log    #增加日志输出地址
```

可以测试下是否生效:

```bash
[root@yd-test-01-pms log]# sudo yum install -y sl
```

然后查看sudo.log

```bash
[root@yd-test-01-pms log]# cat sudo.log
Aug 21 10:54:05 : root : TTY=pts/0 ; PWD=/var/log ; USER=root ; COMMAND=/bin/yum
    install -y sl
Aug 21 10:54:25 : root : TTY=pts/0 ; PWD=/var/log ; USER=root ;
    COMMAND=/bin/less sudo.log
```



## 参考

- [Centos 6.4 sudo 日志文件配置方法 | Byrd's Weblog](https://note.t4x.org/system/sudo-log-config/)