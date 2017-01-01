title: Hexo中使用markdown来绘制脑图（mind map）
tags: mindmap
category: hexo
toc: true
date: 2017-01-01 22:45:33
---


# 脑图是什么？

脑图英文叫做`mind mmap`, 是一种帮助发散思维的工具。将读过的书、看过的源码等总结成脑图，等下次需要复习的时候

顺着脑图去看，效率非常高。

{% asset_img  sample.jpg %}

## 用makrdown来画脑图

`markdown`是一种非常方便的标记性语言，使用`markdown`记录可以忽略格式带来的困扰，让我们更加的专注于内容。

脑图的结构也不复杂，就是一级一级的分支。使用markdown完全可以表达出来，关键是怎么渲染出来。

## kityminder

经多番查找，最终锁定了百度前端团队开源的——`kityminder`, [百度脑图](http://naotu.baidu.com/)也是使用这个构建的。

`kityminder`分成了两部分，一部分是[kityminder-core](https://github.com/fex-team/kityminder-core),一个是[kityminder-editor](https://github.com/fex-team/kityminder-editor).


{% asset_img relations.png %}

### kityminder-core

kityminder-core是百度脑图最核心部分的实现，主要包括了:

- 包括脑图数据的可视化展示（Json 格式）

- 包括简单的编辑功能（节点创建、编辑、删除）。更加强大编辑功能的 KityMinder 编辑器请移步 kityminder-editor

- 不包含第三方格式（FreeMind、XMind、MindManager）的支持，可以加载 kityminder-protocol 来扩展第三方格式支持。

- 不包含文件存储的支持，需要自行实现存储。可参照百度脑图中的开源的 fio + 百度网盘方案进行实现。

### kityminder-editor

> KityMinder Editor 是一款强大、简洁、体验优秀的脑图编辑工具，适合用于编辑树/图/网等结构的数据。

> 编辑器由百度 FEX 基于 kityminder-core 搭建，并且在百度脑图中使用。

## 让hexo支持kityminder

这个主要是客户端渲染的。

### 引入依赖

引入`kityminder-core`的js和css，以及`kityminder-core`的依赖kity到相应的主题下面

```
//core压缩后的
kityminder.core.min.js
//kity的cdn地址
https://cdn.rawgit.com/fex-team/kity/dev/dist/kity.min.js
```

### 为`mind map`找到一个标签

渲染需要*数据*和*容器*节点。数据的标记应该越简单越好。

查阅hexo的官方文档，发现了几个支持设置class属性的标签，以及raw标签。

先来看看`raw`标签：

```
{% raw %}
content
{% endraw %}
```

`raw`标签里面是可以写html的，渲染的时候不会加以改变，但是写起了比较麻烦，失去了标记性语言简单的特性。

`pull quote`标签：

```
{% pullquote [class] %}
content
{% endpullquote %}
```

`pull quote` 标签支持设置class属性，使用这个标签，然后设置一个我们自己的class，比如`mindmap`

### 渲染数据

```javascript
setTimeout(function() {
        var minder = new kityminder.Minder({
            renderTo: '.mindmap'
        });
        var markdownText = $('.mindmap').text().trim();
        $('.mindmap p').each(function(index, element) {
            element.style.display = 'none';
        });
        minder.importData('markdown', markdownText);
        minder.disable();
        minder.execCommand('hand');
    },
    3000
)
```

使用markdown写mind map示例:

```
{% pullquote mindmap %}
#主题
##一级分支
###二级分支
##一级分支
##一级分支
###二级分支
####三级分支
{% endpullquote %}
```

渲染的效果

{% pullquote mindmap %}
#主题
##一级分支
###二级分支
##一级分支
##一级分支
###二级分支
####三级分支
{% endpullquote %}

# 参考

1. [标签插件（Tag Plugins） | Hexo](https://hexo.io/zh-cn/docs/tag-plugins.html)