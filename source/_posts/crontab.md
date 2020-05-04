---
title: crontab和邮件
tags: crontab
category: linux
toc: true
typora-root-url: crontab和邮件
typora-copy-images-to: crontab和邮件
date: 2020-05-01 22:15:28
---



# crontab是什么

linux下的定时任务执行

## 语法

```bash
*     *     *   *    *        command to be executed
-     -     -   -    -
|     |     |   |    |
|     |     |   |    +----- day of week (0 - 6) (Sunday=0)
|     |     |   +------- month (1 - 12)
|     |     +--------- day of        month (1 - 31)
|     +----------- hour (0 - 23)
+------------- min (0 - 59)
```

在线`crontab`表达式生成： 

![image-20200501221243150](/image-20200501221243150.png)

# 最佳实践

## 输出

`crontab`的输出分为三种：

- 1 代表标准输出(`stdout`)
- 2代表错误输出(`stderr`)
- **&** 表示等同于的意思，2>&1表示将标准错误输出重定向到标准输出stdout


## 重定向stdout

### 为何重定向

`crontab`的输出如果没有重定向到`/dev/null`**就会发送邮件**, crontab的标准输出一般不太关心，可以重定向。

邮件内容一般存储在 `/var/mail/$user` 中，如果不清理就会打满服务器根分区，最终导致机器无法登陆。

## 如何重定向

```bash
5 0 * * *  sh /home/q/tools/bin/zip_homeq_log_daily.sh 1>/dev/null
```

标准输出流重定向到空设备

```bash
bash test.sh >test.out     				//脚本的标准输出写入到文件test.out ,标准错误输出直接打印在屏幕 等价于：bash test.sh 1>test.out
bash test.sh >test.out 2>&1 			//标准输出和标准错误输出都写入到test.out并且不会互相覆盖，等价于 bash test.sh &>test.out
bash test.sh >test.out 2>test.out //标准输出和标准错误输出都写入到test.out，会出现互相覆盖的问题，正常情况不推荐这样使用
bash test.sh &>test.out 					//等价于第二种方法
```


## 不要重定向stderr

`stderr`可能就是脚本执行过程中发生了错误， 这个是需要关注的， 最好不要重定向到空设备。

```bash
0 7 * * * sh /home/q/tools/bin/carnival/carnival.sh 2>/dev/null
```

**最好不要这样做！**

当`stderr`中有输出时，需要发送邮件，必须指定邮件的接收人。

```bash
[root@yd-dev-api server]# crontab -e -u root
MAILTO="qisheng.li@yaduo.com,fan.zhang@yaduo.com"
*/3 * * * * /bin/sh /datadisk/mv.sh 1>/dev/null
```



当脚本执行发生错误的时候，邮箱里就有一封邮件。

![image-20180813104941719](/image-20180813104941719.png)

  # 参考

- [email - How to send the output from a cronjob to multiple e-mail addresses? - Server Fault](https://serverfault.com/questions/133058/how-to-send-the-output-from-a-cronjob-to-multiple-e-mail-addresses)
- [Linux crontab 输出重定向不生效问题解决 — Mengalong](http://mengalong.github.io/2018/10/31/crontab-redirect/)

