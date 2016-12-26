title: web.xml
toc: true
tags: servlet
category:　web
--- 

## load-on-startup标签

> Servlets are initialized either lazily at request processing time or eagerly during
deployment. In the latter case, they are initialized in the order indicated by
their load-on-startup elements.

在web容器启动的时候，可以采用`lazily`加载的方式和`eagerly`的方式。

`load-on-startup`中的值决定了进行哪种方式。

> If the value is a negative integer, or the element is not present, the
container is free to load the servlet whenever it chooses. If the value is a positive
integer or 0, the container must load and initialize the servlet as the application is
deployed.

如果<load-on-startup>这个元素没有出现，或者出现了但是里面的值是负的，容器可以按照自己的需要选择加载Servlet的时机。

如果里面的值是正数或者0，容器必须保证在容器启动的时候加载和初始化这个servlet

>  The container must guarantee that servlets marked with lower integers
are loaded before servlets marked with higher integers.

这个值越小，优先级越高，容器优先加载。

> The container may choose
the order of loading of servlets with the same load-on-startup value.

如果里面的值是一样的，那么加载的顺序由容器来决定（不同实现可能不同）


# 参考

1. Java Servlet Specification 3.0