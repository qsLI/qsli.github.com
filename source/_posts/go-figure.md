title: Let's go!(Go语言学习)
tags: go学习资料
category: go
toc: true
date: 2018-01-20 21:42:33
---



## go学习资料

### go tutorial

[A Tour of Go](https://tour.golang.org/list)

简单的语法介绍, 可以在线编译/运行

{% asset_image go-tour.png %}

### 环境搭建

#### go get访问被墙网站

有些包只有墙外才能访问到, 因此第一步必须翻墙.

> 另一个方法是实用 cow, 这是shadowsocks-go作者的另一个开发项目，根据项目介绍很容易的配置,可以在本机启动一个http代理，以shadowsocks为二级代理。

补充一点, 用alias的方式, 可以只指定go使用代理

```bash
$ alias go='http_proxy=127.0.0.1:8080  https_proxy=127.0.0.1:8080 go'
```


## 参考

1. [如何在长城后面go get一些库 | 鸟窝](http://colobu.com/2017/01/26/how-to-go-get-behind-GFW/)

2. [A Tour of Go](https://tour.golang.org/list)

3. [How do I configure Go to use a proxy? - Stack Overflow](https://stackoverflow.com/questions/10383299/how-do-i-configure-go-to-use-a-proxy)