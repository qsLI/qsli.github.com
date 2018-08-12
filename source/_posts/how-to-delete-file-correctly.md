title: Linux下删除文件
tags: lsof
category: linux
toc: true
abbrlink: 10191
date: 2017-09-10 12:20:09
---


# 文件存储

{%  asset_img   inode.png  linux文件的存储 %}

## 软链接和硬链接

软链接(Symbolic Link):

硬链接(Hard Link):

> 硬链接就是在Directory中加入一条filename和Inode的对应关系，所以如果你删除了原来的文件，是不对硬链接文件有任何影响的，因为删除文件就是将link count 减少，当发现指向Inode为filename数量0的时候，系统会回收相应的Inode和Block空间。但是软链接就不同了，在Linux下所有的都是文件，所以软链接也有自己的Inode和block ，但是创建软链接不会在增加原文件Inode-Index，当删除原文件的时候，相应的Index不再能找到，所以导致软链接不能用。但是软链接有自身的优势，可以跨分区，这样就可以解决当前Inode数据区不足够写入，可以使用软链接指向空间充足的空间。

### 区别

软链接  硬链接 区别

{%  asset_img   links.png  软链接和硬链接的区别 %}


## 文件是否被占用

一切皆文件，所以lsof（list open file）就很重要

lsof -i ：8080 查看端口占用

socket 也是文件


```
sudo lsof  catalina.out

COMMAND   PID   USER   FD   TYPE DEVICE SIZE/OFF     NODE NAME
java    40916 tomcat    1w   REG    8,7   933679 27656540 catalina.out
java    40916 tomcat    2w   REG    8,7   933679 27656540 catalina.out
```

>‘‘REG’’ for a regular file
> FD         is the File Descriptor number of the file or:

                       cwd  current working directory;
                       Lnn  library references (AIX);
                       err  FD information error (see NAME column);
                       jld  jail directory (FreeBSD);
                       ltx  shared library text (code and data);
                       Mxx  hex memory-mapped type number xx.
                       m86  DOS Merge mapped file;
                       mem  memory-mapped file;
                       mmap memory-mapped device;
                       pd   parent directory;
                       rtd  root directory;
                       tr   kernel trace file (OpenBSD);
                       txt  program text (code and data);
                       v86  VP/ix mapped file;

                  FD is followed by one of these characters, describing the mode under which the file is open:

                       r for read access;
                       w for write access;
                       u for read and write access;
                       space if mode unknown and no lock
                            character follows;
                       ‘-’ if mode unknown and lock
                            character follows.


可以看出上面的文件的fd是1, w权限



系统，每个进程，文件描述符。

```bash
sudo ls /proc/40916/fd
```

下面的两个命令是等价的：

```bash
sudo cat /proc/40916/fd/2

sudo cat catalina.out
```
## 删除文件

删除文件之前应该先看下文件的占用情况，`lsof`可以查看到文件被哪个进程占用。

如果被占用，直接使用`rm`删除相当于只是删除了文件名和inode的关联, 但是文件占用的空间还在(block), 应该使用下面的命令进行删除：


> You misunderstand: deletion will be complete only after all processes using the file at the time of deletion have reached completion: only then the deleted inode will be returned to the pool of available inodes, and the content of the file may begin to be corrupted by over-writing. Until then, the inode is alive and well, and is pointing to the area of the disk containing the file in question. As soon as less completes, the soft link will disappear, and so will the file testing.txt.

> 	当我们使用rm命令的时候，系统并不会真正删除这个资料。除非有档案非要将资料存储在原来档案的这些block中。这样原来的block就会被新档案给覆盖掉。 


```bash
cat /dev/null > filename
或者
truncate -s 0 filename
```

### stat 命令

```bash
sudo stat /proc/40916/fd/2

File: `/proc/40916/fd/2' -> `/home/q/www/qta.open.coupon.provider/logs/catalina.out'
  Size: 64        	Blocks: 0          IO Block: 1024   symbolic link
Device: 3h/3d	Inode: 3017464897  Links: 1
Access: (0300/l-wx------)  Uid: (40001/  tomcat)   Gid: (40001/  tomcat)
Access: 2017-07-05 05:05:06.318550652 +0800
Modify: 2017-06-15 12:35:24.590599522 +0800
Change: 2017-06-15 12:35:24.590599522 +0800


sudo stat catalina.out

File: `catalina.out'
  Size: 962851    	Blocks: 1896       IO Block: 4096   regular file
Device: 807h/2055d	Inode: 27656540    Links: 1
Access: (0644/-rw-r--r--)  Uid: (40001/  tomcat)   Gid: (40001/  tomcat)
Access: 2017-07-06 00:51:44.243427414 +0800
Modify: 2017-07-06 00:52:27.096557541 +0800
Change: 2017-07-06 00:52:27.096557541 +0800

sudo ls -i /proc/40916/fd/2

3017464897 /proc/40916/fd/2
```

可以看出, 文件描述符是一个软链接.

### 目录下的文件占用空间很小, 但是目录占用空间很大

这种情况, 最常见的就是文件被删除了, 但是还有进程占用它. 于是这个文件占用的block就没有释放掉.

```bash
sudo lsof | grep deleted
```

使用上面的命令就可以看到,那些文件被删除了, 但是还在被占用.  kill掉相应的进程, 空间就自己回来了.



## 参考

1. [3. lsof 一切皆文件 — Linux Tools Quick Tutorial](http://linuxtools-rst.readthedocs.io/zh_CN/latest/tool/lsof.html)

2. [How to clean log file? - Unix & Linux Stack Exchange](https://unix.stackexchange.com/questions/92384/how-to-clean-log-file)

3. [shell script - Empty the contents of a file - Unix & Linux Stack Exchange](https://unix.stackexchange.com/questions/88808/empty-the-contents-of-a-file)

4. [通过Inode原理分析Linux中ln命令 - Michael Chu - ITeye技术网站](http://himichaelchu.iteye.com/blog/2116023)

5. [理解 Linux 的硬链接与软链接](https://www.ibm.com/developerworks/cn/linux/l-cn-hardandsymb-links/index.html)

6. [linux - why do symbolic links in /prox/$PID/fd/ act as hard links? - Super User](https://superuser.com/questions/1112781/why-do-symbolic-links-in-prox-pid-fd-act-as-hard-links)