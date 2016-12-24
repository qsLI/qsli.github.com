title: linux 下使用 shadowsocks
date: 2015-10-09 19:44:14
tags: shadowsocks
category: linux
---
## 安装shadowsocks
shadowsocks 是使用 python 编写的，用 python 的包管理软件 pip 安装即可
1.首先安装 pip
``` bash
  $ apt-get install python-pip
```
2.安装 shadowsocks
``` bash
  $ pip install shadowsocks
```

## shadowsocks 使用
shadowsocks 分为两部分，一个 server 名字叫 ssserver ，一个 client 名字叫 sslocal
默认都安装在  /usr/local/bin/ 目录下

### **server 端**
server端主要搭建在自己购买的vps上面
如下代码可使其在后台运行：
``` bash
  $ sudo ssserver -p 443 -k password -m rc4-md5 --user nobody -d start
```
具体可参见 [shadowsocks wiki](https://github.com/shadowsocks/shadowsocks/wiki/Shadowsocks-%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E)

### **client 端**
client 端是运行在需要科学上网的机器上的
``` bash
  $ sslocal -s server_ip -p 443 -l 1080 -k "passwd" -t 600 -m aes-256-cfb &
```
& 是为了让其在后台运行
查看后台运行的程序 
``` bash
 $ jobs -l
```
``` bash
[1]-  3918 Running                 hexo s &
[2]+  4110 Stopped                 ping www.baidu.com
```
将后台的程序提到前端  %1   %后面的数字代表了要提到前台的任务
``` bash
$ %2
ping www.baidu.com
64 bytes from 180.97.33.107: icmp_req=3 ttl=52 time=14.2 ms
64 bytes from 180.97.33.107: icmp_req=4 ttl=52 time=12.7 ms
```
上述命令将 Ctrl + Z 挂起的任务，提到前台去了
Ctrl + C 是终止程序
Ctrl + Z 是挂起到后台

至于浏览器端的代理插件，将代理地址配置成 127.0.0.1 端口 1080 （要与前面设置的端口一致）
配置相应的代理规则即可科学上网

至于开机自动启动，可以自己摸索





