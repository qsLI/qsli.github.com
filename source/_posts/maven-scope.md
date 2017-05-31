title: maven-scope
tags: maven
category: java
toc: true
abbrlink: 24920
date: 2017-06-01 00:42:54
---


## scope 作用

> Dependency scope is used to limit the transitivity of a dependency, and also to affect the classpath used for various build tasks.

主要是限制依赖的传递性，比如有些jar包只会在测试的时候才会有效，部署的时候不会生效。

scope的分类：


| scope | 生效时机 | 举例 |
|--|---------|--- |
| compiled | 编译/测试/运行 | 默认 |
| provided | 编译/测试 | servlet-api 由tomcat等容器提供 | 
| runtime | 运行 | 编译的时候只需要，JDBC API， 运行的时候必须要有JDBC驱动实现 |
| test | 测试的时候才引入 | junit 只在测试的时候生效 |
|system |编译/测试 | 必须显式的提供jar的本地文件系统路径 |
|import | 只支持`dependencyManagement`元素下的type是pom的节点| only available in Maven 2.0.9 or later |

### import scope

使用方

```xml
   <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>com.air</groupId>
                <artifactId>haha</artifactId>
                <version>${com.air.haha.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
    </dependencyManagement>
```

com.air.haha的声明

```xml
<project>
 <modelVersion>4.0.0</modelVersion>
 <groupId>com.air</groupId>
 <artifactId>haha</artifactId>
 <packaging>pom</packaging>
 <name>haha</name>
 <version>1.0</version>
 <dependencyManagement>
   <dependencies>
     <dependency>
       <groupId>test</groupId>
       <artifactId>a</artifactId>
       <version>1.2</version>
     </dependency>
     <dependency>
       <groupId>test</groupId>
       <artifactId>b</artifactId>
       <version>1.0</version>
       <scope>compile</scope>
     </dependency>
   </dependencies>
 </dependencyManagement>
</project>
```

使用方在使用的时候就可以不用指定，haha中包含的依赖的版本，默认就会使用haha中声明的版本。这样在升级的时候，可以保证依赖一同的升级。

## 参考

1. [Maven – Introduction to the Dependency Mechanism](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)

2. 《Maven权威指南》—— 9.4 （项目依赖）

