---
title: pip使用
tags: pip
category: python
toc: true
date: 2017-01-08 18:30:03
---


## 使用

### 安装

下载安装文件, [](https://bootstrap.pypa.io/get-pip.py)

```bash
python get-pip.py
```

### 从列表文件安装

导出文件列表(一般配合virtualenv适应)

```bash
$ pip freeze                               
backports-abc==0.4                         
backports.shutil-get-terminal-size==1.0.0  
backports.ssl-match-hostname==3.5.0.1      
beautifulsoup4==4.5.1                      
bs4==0.0.1                                 
...
```
可以重定向到一个文件中，一般叫做requirements.txt

然后安装的时候，可以使用下面的命令

```bash
pip install -r requirements.txt
```


### 安装VCS上的软件

> pip currently supports cloning over git, git+http, git+https, git+ssh, git+git and git+file:

```
[-e] git://git.myproject.org/MyProject#egg=MyProject
[-e] git+http://git.myproject.org/MyProject#egg=MyProject
[-e] git+https://git.myproject.org/MyProject#egg=MyProject
[-e] git+ssh://git.myproject.org/MyProject#egg=MyProject
[-e] git+git://git.myproject.org/MyProject#egg=MyProject
[-e] git+file://git.myproject.org/MyProject#egg=MyProject
-e git+git@git.myproject.org:MyProject#egg=MyProject
```

## 参考

1. [pip install — pip 9.0.1 documentation](https://pip.pypa.io/en/stable/reference/pip_install/#vcs-support)

2. [Django | requirement.txt 生成 - 黑月亮 - SegmentFault](https://segmentfault.com/a/1190000003050954)