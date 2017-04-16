---
title: classloader
tags: classloader
category: java
toc: true
abbrlink: 37818
---

### URLClassLoader

>This class loader is used to load classes and resources from a search
 path of URLs referring to both JAR files and directories. Any URL that
 ends with a '/' is assumed to refer to a directory. Otherwise, the URL
 is assumed to refer to a JAR file which will be opened as needed.
 <p>
 The AccessControlContext of the thread that created the instance of
 URLClassLoader will be used when subsequently loading classes and
 resources.
 <p>
 The classes that are loaded are by default granted permission only to
 access the URLs specified when the URLClassLoader was created. 
 @author  David Connelly
 @since   1.2

