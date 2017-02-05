---
title: plantuml——用编码的方式画UML
tags: uml
category: hexo
toc: true
date: 2016-10-16 00:56:07
---
## 是什么？

>PlantUML is a component that allows to quickly write :

> * Sequence diagram,

> * Usecase diagram,

> * Class diagram,

> * Activity diagram, (here is the new syntax),

> * Component diagram,

> * State diagram,

> * Deployment diagram,

> * Object diagram.

> * wireframe graphical interface

> Diagrams are defined using a simple and intuitive  language. ( see PlantUML Language Reference Guide).

## 例子

```
{% plantuml %}
skinparam backgroundColor #EEEBDC
skinparam handwritten true

skinparam sequence {
	ArrowColor DeepSkyBlue
	ActorBorderColor DeepSkyBlue
	LifeLineBorderColor blue
	LifeLineBackgroundColor #A9DCDF

	ParticipantBorderColor DeepSkyBlue
	ParticipantBackgroundColor DodgerBlue
	ParticipantFontName Impact
	ParticipantFontSize 17
	ParticipantFontColor #A9DCDF

	ActorBackgroundColor aqua
	ActorFontColor DeepSkyBlue
	ActorFontSize 17
	ActorFontName Aapex
}

actor User
participant "First Class" as A
participant "Second Class" as B
participant "Last Class" as C

User -> A: DoWork
activate A

A -> B: Create Request
activate B

B -> C: DoWork
activate C
C --> B: WorkDone
destroy C

B --> A: Request Created
deactivate B

A --> User: Done
deactivate A

{% endplantuml %}
```

上述代码的效果如下：

{% plantuml %}

skinparam backgroundColor #EEEBDC
skinparam handwritten true

skinparam sequence {
	ArrowColor DeepSkyBlue
	ActorBorderColor DeepSkyBlue
	LifeLineBorderColor blue
	LifeLineBackgroundColor #A9DCDF

	ParticipantBorderColor DeepSkyBlue
	ParticipantBackgroundColor DodgerBlue
	ParticipantFontName Impact
	ParticipantFontSize 17
	ParticipantFontColor #A9DCDF

	ActorBackgroundColor aqua
	ActorFontColor DeepSkyBlue
	ActorFontSize 17
	ActorFontName Aapex
}

actor User
participant "First Class" as A
participant "Second Class" as B
participant "Last Class" as C

User -> A: DoWork
activate A

A -> B: Create Request
activate B

B -> C: DoWork
activate C
C --> B: WorkDone
destroy C

B --> A: Request Created
deactivate B

A --> User: Done
deactivate A

{% endplantuml %}

## 平台

可以在chromeapp中找到： [链接](https://chrome.google.com/webstore/detail/uml-diagram-editor/hoepdgfgogmeofkgkpapbdpdjkplcode?utm_source=chrome-ntp-icon), 开箱即用

另可以和idea和eclipse、atom等编辑器集成，hexo中也有相应的插件，具体可看下面的教程

## 参考

1. [(记录)plantuml安装配置](http://skyao.github.io/2014/12/05/plantuml-installation/index.html)

2. [Hexo博客中的绘图](http://keyun.ml/2016/07/25/2016-07-25-hexo-uml.html)

3. [官网](http://plantuml.com/)
