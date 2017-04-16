---
title: dubbo
toc: true
category: dubbo
abbrlink: 22179
tags:
---

## 测试



telnet 操作

nc 操作

### invoke

invokewithouttoken
invoke

语法  

invoke object.methodname(argsInJson)

编码问题

过长参数问题

{% post_link shell-input-limit shell输入长度限制 %}

### 查看服务地址

```bash
#!/bin/sh

arg=`cat $1`
echo $arg
(
echo open localhost 20085
sleep 2
echo -ne  '\n'
echo "ls"
sleep 2
echo "invokewithouttoken $arg"
sleep 60
echo "exit"
) | telnet
```