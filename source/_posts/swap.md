title: swappiness
tags: swap
category: linux
toc: true
date: 2018-07-08 15:56:57
---



## sysctl中和swap相关的参数

```
➜  ~  sudo sysctl -a  | grep swap
vm.swappiness = 0
```
>Swappiness is a Linux kernel parameter that controls the relative weight given to swapping out of runtime memory, as opposed to dropping pages from the system page cache. Swappiness can be set to values between 0 and 100 inclusive. A low value causes the kernel to avoid swapping; a higher value causes the kernel to try to use swap space.
取值说明:

```
vm.swappiness = 0，表示只有在避免OOM的时候才进行swap操作；(并不是关闭swap)
vm.swappiness = 60，系统默认值；
vm.swappiness = 100，系统主动的进行swap操作。
```

## 关闭swap

```
cat /proc/sys/vm/swappiness
sudo echo 0 | sudo tee /proc/sys/vm/swappiness
sudo swapoff/swapon -a
```

## 参考

- [Qunar技术沙龙](https://mp.weixin.qq.com/s?__biz=MzA3NDcyMTQyNQ==&mid=206046053&idx=1&sn=76f7a31003d80c3089c3a266e4b139e0&3rd=MzA3MDU4NTYzMw==&scene=6#rd)
