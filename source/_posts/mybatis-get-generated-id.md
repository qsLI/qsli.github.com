---
title: mybatis-get-generated-id
tags: 自增主键
category: mybatis
toc: true
typora-root-url: mybatis-get-generated-id
typora-copy-images-to: mybatis-get-generated-id
date: 2019-01-06 17:41:12
---



## mybatis获取自增主键



### 使用useGeneratedKeys

```xml
<insert id="add" parameterType="Staff" useGeneratedKeys="true" keyProperty="id">
  insert into Staff(name, age) values(#{name}, #{age})
</insert>
```

`useGeneratedKeys`既可以用于单条插入语句中获取自增主键，也可以用于多条语句中获取自增主键。



### 使用@@IDENTITY  

```xml
<insert id="add" parameterType="Staff" keyProperty="id">
    <selectKey keyProperty="id" order="AFTER" resultType="java.lang.Integer">
			select @@IDENTITY
    </selectKey>
    insert into Staff(name, age) values(#{name}, #{age})
</insert>
```

只支持一条插入时获取自增主键，而且跟数据库的支持有关.

## 参考

1. [MyBatis魔法堂：Insert操作详解（返回主键、批量插入） - ^_^肥仔John - 博客园](https://www.cnblogs.com/fsjohnhuang/p/4078659.html)
2. [Mybatis Auto Generate Key | buptubuntu的博客](https://buptubuntu.github.io/2017/07/16/Mybatis-Auto-Generate-Key/)
3. [MyBatis Generator Core – The <generatedKey> Element](http://www.mybatis.org/generator/configreference/generatedKey.html)

