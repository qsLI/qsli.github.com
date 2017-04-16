---
title: Intellij Idea中临时文件功能
category: idea
toc: true
abbrlink: 15997
date: 2017-02-15 01:10:09
tags:
---


## 缘起

Intellij中默认新建文件必须指定存储的位置，但是有的时候我们可能只是想创建一个临时的文件顺手记录一些东西。这个功能类似`NotePad++`或者`sublime text`中的新建tab，这个tab默认是不落地到文件的，但是其中的内容会以临时文件存储起来。
    
在Google上搜索了大半天，也没有找到类似的功能（主要是关键词提炼的不行）。后来阴差阳错地搜到了scratches file, 翻译了一下，正是我要找的功能！ (英语差真是害死人啊！)

> scratch file 过期文件；临时文件

### scratches优势

>1. The scratch code in scripting languages is *executable*.

>2. you can run and *debug* it.

>3. *Local history* for scratches is supported.

>4. It is possible to perform *clipboard operations* with scratches.

>5. The scratches are *stored*, depending on your operating system,
Under IntelliJ IDEA home, in the directory config/scratches (on Windows/*NIX)
~ Library->Preferences-><IntelliJ IDEA>XX->scratches(on OS X)
You can undo or redo changes in scratches.

### 使用

以下功能基于Intellij Idea 2016.3.4

`Ctrl + Shift + A`在搜索框中输入 `scratch`，可以看到如下的两个功能：

{%  asset_img   search.jpg  %}

这里会出现两个scratch 相关的选项， 一个是scratch buffer， 一个是scratch file。
scratch buffer不用选择语法，scratch file则会让你选择对应的语法

{%  asset_img   new.jpg  %}

创建之后，可以在下面的位置查看:

{%  asset_img   menu.jpg  %}

{%  asset_img   scratches.jpg  %}

### 其他

快捷键需要按的键比较多，可以自己定制下，比如使用先后按键的那种。

{%  asset_img   keymap.jpg  %}

## 参考

1. [IntelliJ IDEA 2016.3 Help :: Scratches](https://www.jetbrains.com/help/idea/2016.3/scratches.html)

2. [Sessions And Projects - Notepad++ Wiki](http://docs.notepad-plus-plus.org/index.php/Sessions_And_Projects)
