title: Hexo搭建博客
date: 2015-10-08 10:30:14
categories: hexo
tags: hexo install
---
Welcome to [Hexo](http://hexo.io/)! This is your very first post. Check [documentation](http://hexo.io/docs/) for more info. If you get any problems when using Hexo, you can find the answer in [troubleshooting](http://hexo.io/docs/troubleshooting.html) or you can ask me on [GitHub](https://github.com/hexojs/hexo/issues).

## Quick Start

### Create a new post

``` bash
$ hexo new "My New Post"
```

More info: [Writing](http://hexo.io/docs/writing.html)

### Run server

``` bash
$ hexo server
```

More info: [Server](http://hexo.io/docs/server.html)

### Generate static files

``` bash
$ hexo generate
```

More info: [Generating](http://hexo.io/docs/generating.html)

### Deploy to remote sites

``` bash
$ hexo deploy
```

More info: [Deployment](http://hexo.io/docs/deployment.html)

### hexo 草稿

``` bash
$ hexo new draft <title>
$ hexo server --draft
$ hexo publish <filename>
```

### 静态资源

对于那些想要更有规律地提供图片和其他资源以及想要将他们的资源分布在各个文章上的人来说，Hexo也提供了更组织化的方式来管理资源。这个稍微有些复杂但是管理资源非常方便的功能可以通过将 config.yml 文件中的 post_asset_folder 选项设为 true 来打开。
```
_config.yml
post_asset_folder: true
```

当资源文件管理功能打开后，Hexo将会在你每一次通过 hexo new [layout] <title> 命令创建新文章时自动创建一个文件夹。这个资源文件夹将会有与这个 markdown 文件一样的名字。将所有与你的文章有关的资源放在这个关联文件夹中之后，你可以通过相对路径来引用它们，这样你就得到了一个更简单而且方便得多的工作流。

### 内链

[Hexo使用内链及文章中加入图片的方法](http://marshal.ohtly.com/2015/09/12/internal-link-and-image-for-hexo/)

### seo

[Hexo Seo优化让你的博客在google搜索排名第一](http://www.jianshu.com/p/86557c34b671)

## Markdown 语法简介
```

1、分段： 两个回车

2、换行 两个空格 + 回车

3、标题 #~###### 井号的个数表示几级标题，即Markdown可以表示一级标题到六级标题

4、引用 >

5、列表 *，+，-，1.，选其中之一，注意后面有个空格

6、代码区块 四个空格开头

7、链接 [文字](链接地址)

8、图片 {% 图片地址 图片说明 %}
，图片地址可以是本地路劲，也可以是网络地址

9、强调 **文字**，__文字__，_文字_，*文字*

10、代码 ```

 >[Markdown——入门指南](http://www.jianshu.com/p/1e402922ee32/)

 ## 在Hexo中插入gist

 ```
 {% gist 1f10fa5b8b76f3b5efaf74ad3d6da413  %}
 ```
 其中一长串是gist生成的id
