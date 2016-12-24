title: 正则总结
tags: re
category: base
date: 2016-12-14 23:48:12
---


# 测试

推荐使用`RegexBudy`

![RegexBuddy](https://www.regexbuddy.com/img/icon.png)

界面如下:

![regexbuddy](https://www.regexbuddy.com/screens/regexbuddy.png)

推荐python的 `VerbalExpressions` [PythonVerbalExpressions ](https://github.com/VerbalExpressions/PythonVerbalExpressions)

# 使用心得

## 匹配多个单词

`\b`可以匹配一个单词的开头或者结尾

匹配单个单词： `\bfoo\b` 可以匹配单个单测 foo

匹配多个单词： `\b(foo|bar)\b` 可以匹配foo 或者 bar

## 匹配开头和结尾

`^`可以匹配字符串的开头

`$`可以匹配字符串的结尾

## 零宽断言

| 分类  | 代码/语法   |说明|
|------|---|------------------|
| 捕获 | (exp)   |匹配exp,并捕获文本到自动命名的组里|
| |(?<name>exp)    | 匹配exp,并捕获文本到名称为name的组里，也可以写成(?'name'exp)|
| |(?:exp) |匹配exp,不捕获匹配的文本，也不给此分组分配组号|
| 零宽断言  |  (?=exp) 匹配exp前面的位置|
| |(?<=exp)    |匹配exp后面的位置|
| |(?!exp) |匹配后面跟的不是exp的位置|
| |(?<!exp)    |匹配前面不是exp的位置|
| 注释  (?#comment) |这种类型的分组不对正则表达式的处理产生任何影响，用于提供注释让人阅读|


### 先行断言

语法格式


`[a-z]*(?=ing)`

可匹配 cooking singing 中的cook 与 sing

### 后发断言

语法格式

`(?<=abc)[a-z]*`


可匹配 abcdefg 中的defg

### 负向零宽断言

语法格式

`(?!exp)`

断言此位置的后面不能匹配表达式`exp`

`\b\w*q(?!u)\w*\b` 匹配q后面不出现u（可以以q结尾）

# 参考

1. [RegexBuddy官网](https://www.regexbuddy.com/)

2. [正则表达式30分钟入门教程](https://luke0922.gitbooks.io/learnregularexpressionin30minutes/content/)

3. [正则表达式怎样匹配多个单词](http://www.biliyu.com/article/1321.html)

