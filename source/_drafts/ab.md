title: 用ab进行压力测试
toc: true
tags: ab
category: linux
---

## 安装



## 简单使用

```
$ ab -n 10000 -c 200 http://localhost:8080/async
```

上述命令是说, 按照并发200的方式,总共请求1w次.

### 指定keep-alive模式

压力测试要尽量满足和线上环境一样, 线上大部分都开启了keep-alive, 因此需要保持一致.

```
-k              Use HTTP KeepAlive feature
```

## 参考
