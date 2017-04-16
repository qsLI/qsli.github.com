---
title: windows命令操作剪贴板——CLIP
toc: true
tags: 剪贴板
category: shell
abbrlink: 32267
date: 2017-01-07 20:00:09
---

## 使用说明

> CLIP

> Description:
    Redirects output of command line tools to the Windows clipboard.
    This text output can then be pasted into other programs.

> Parameter List:
    /?                  Displays this help message.

> Examples:
    DIR | CLIP          Places a copy of the current directory
                        listing into the Windows clipboard.

>    CLIP < README.TXT   Places a copy of the text from readme.txt
                        on to the Windows clipboard.

## 简单应用

### 将ip地址拷贝到剪贴板

```bash
ipconfig | find "IPv4" | find /V "自动"  | find /V "Auto" | awk "{ print $(NF);}" | CLIP
```

也可以添加一个alias，这样就不用每次敲`ipconfig`, 然后复制ip了

## 参考

1. [Fastest method to determine my PC's IP address (Windows) - Super User](http://superuser.com/questions/382265/fastest-method-to-determine-my-pcs-ip-address-windows)