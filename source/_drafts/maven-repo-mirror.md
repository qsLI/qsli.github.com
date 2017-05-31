---
title: maven配置中的repo和mirror
toc: true
tags: maven
category: maven
abbrlink: 58607
---

一份maven的配置文件示例：

```xml
<?xml version="1.0"?>
<settings xmlns="http://maven.apache.org/POM/4.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                            http://maven.apache.org/xsd/settings-1.0.0.xsd">
    <servers>
        <server>
            <id>snapshots</id>
            <username>snapshots</username>
            <password>g2Dki6XCfhi48Bnj</password>
            <filePermissions>664</filePermissions>
            <directoryPermissions>775</directoryPermissions>
        </server>
        <server>
            <id>releases</id>
            <username>{username}</username>
            <password>{yourpwd}</password>
            <filePermissions>664</filePermissions>
            <directoryPermissions>775</directoryPermissions>
        </server>
    </servers>

    <profiles>
        <profile>
            <id>Nexus</id>
            <repositories>
                <repository>
                    <id>Nexus</id>
                    <url>http://xxx.com:8081/nexus/content/groups/public</url>
                    <releases>
                        <enabled>true</enabled>
                        <!-- always , daily (default), interval:X (where X is an integer in minutes) or never.-->
                        <updatePolicy>daily</updatePolicy>
                        <checksumPolicy>warn</checksumPolicy>
                    </releases>
                    <snapshots>
                        <updatePolicy>always</updatePolicy>
                    </snapshots>
                </repository>
            </repositories>
            <pluginRepositories>
                <pluginRepository>
                    <id>Nexus</id>
                    <url>http://xxx.com:8081/nexus/content/groups/public</url>
                    <releases>
                        <enabled>true</enabled>
                        <checksumPolicy>warn</checksumPolicy>
                    </releases>
                    <snapshots>
                        <updatePolicy>always</updatePolicy>
                    </snapshots>
                </pluginRepository>
            </pluginRepositories>
        </profile>
    </profiles>

    <activeProfiles>
        <activeProfile>Nexus</activeProfile>
    </activeProfiles>
	
	<mirrors>
	<mirror>
	      <id>z-alimaven</id>
	      <name>aliyun maven</name>
	      <url>http://maven.aliyun.com/nexus/content/groups/public/</url>
	      <mirrorOf>central</mirrorOf>        
	    </mirror>
		
 	   <mirror>
	      <id>other-maven</id>
	      <name>other maven</name>
	      <url>http://xxx.com:8081/nexus/content/groups/public/</url>
	      <mirrorOf>*</mirrorOf>        
	    </mirror>
	  </mirrors>

</settings>

```

配置中配置了一个gg

>这里配置为*（星号）后，会导致所有的仓库都会通过osc的这个源去访问jar，由于osc现在的maven仓库和中央仓库一样，但是不包含第三方的仓库，因而第三方仓库都会出错，都会从osc的主仓库去查找，肯定找不到，因而maven会构建失败或者各种问题。
mirrorOf配置*（星号）的时候，一般都是针对自己私有库的时候（私有库和其他仓库配置）。而且如果存在多个mirror，一定要把*（星号）的放到最下面。

## 参考

1. [Maven – Guide to Mirror Settings](http://maven.apache.org/guides/mini/guide-mirror-settings.html)

2. [Maven：mirror和repository 区别 - 格物致知的个人页面](https://my.oschina.net/sunchp/blog/100634)

3. [通过测试和代码告诉你Maven是如何使用mirror和repository的 - 偶尔记一下 - 博客频道 - CSDN.NET](http://blog.csdn.net/isea533/article/details/22437511)

4. [深入比较几种maven仓库的优先级 | 大染志](http://toozhao.com/2012/07/13/compare-priority-of-maven-repository/)