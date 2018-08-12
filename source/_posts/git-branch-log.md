title: git查看已合并分支的fork点
tags:
  - git
  - idea
category: git
toc: true
date: 2017-09-12 00:25:40
---


## 一个问题

有些需求有好几期，做后面几期的可能完全不了解前几期做了什么，拿到分支号后，就需要找到最初的commit点。由于这个分支已经merge到了master上，所以找最近的ancestor就不对了。

```bash
git merge-base branch1 branch2 //只能找到最近的祖先
```

那么如何找到这个分支最初的fork点呢，下面给出两种方案，亲测有效。

## 解决方案

### git 别名

```bash
git config --global alias.oldest-ancestor '!zsh -c '\''diff -u <(git rev-list --first-parent "${1:-master}") <(git rev-list --first-parent "${2:-HEAD}") | sed -ne "s/^ //p" | head -1'\'' -'
git config --global alias.branchdiff '!sh -c "git diff `git oldest-ancestor`.."'
git config --global alias.branchlog '!sh -c "git log `git oldest-ancestor`.."'
```

上述三个命令就可以找到最初的commit点，以及这个分支做了什么。参见`stackoverflow`上的回答:  [Finding a branch point with Git? - Stack Overflow](https://stackoverflow.com/questions/1527234/finding-a-branch-point-with-git)

### git分支图

如果你使用`zsh`, 内置的有两个相关的命令`glgg`,`glgga`.

- `glgg`： 显示当前分支的分支图

```bash
➜  ~  alias glgg
glgg='git log --graph'
```

{% asset_img glgg.png %}

- `glgga`: 显示所有分支的分支图 

```bash
➜  ~  alias glgga
glgga='git log --graph --decorate --all'
```
{% asset_img glgga.png %}

从分支图中可以快速的看出当前分支是在哪里fork出来的

#### 分支图的显示方式

- reverse chronological： 默认显示方式，会按照commit的时间，逆序显示

- topo order： 按照commit的拓扑顺序显示，子提交在父提交之前显示

查看fork点的时候，最好是按照拓扑排序显示，这样分支图不会很乱，便于找到。


### 可视化工具

可视化工具和git log的用法是一样的，顺着查找即可。这里我用`idea`为例：

{% asset_img idea.png %}

开启InteliSort后，注意红框勾上。

{% asset_img idea-sorted.png %}

开启后是按照提交排序的，并没有按照插入的时间，这样可以清楚的顺着提交找到最初的fork点。

## 参考

1. [Finding a branch point with Git? - Stack Overflow](https://stackoverflow.com/questions/1527234/finding-a-branch-point-with-git)

2. [git图示所有分支的历史 - ChuckLu - 博客园](http://www.cnblogs.com/chucklu/p/4748394.html)

3. [Git Book 中文版 - 查看历史 －Git日志](http://gitbook.liuhui998.com/3_4.html)
