---
title: inode
toc: true
tags: inode
category: linux
abbrlink: 6042
---


## TODO

- 进程何时释放File Descriptor？可共享？
- Dentry是如何构建的？
- linux VFS
- debug fs

[Linux VFS分析(二) - 北落不吉 - 博客园](http://www.cnblogs.com/hzl6255/archive/2012/12/31/2840854.html)



cat /dev/null > catalina.out


这是一般记日志的框架不会考虑的，但是确实会遇到。例如文件被误删，或者因为长时间没写日志，文件被清理脚本删掉了（Linux 可以删，但是进程还持有文件 fd，文件 inode 在进程 close 的时候才释放，还可以“正常”读写；对于 Windows，一般锁住删不掉，但是如果用 Unlocker 一类软件是可以解锁句柄的）。出现了这种情况，除非把应用重启，否则只能干瞪眼了。因此，EagleEye 在后台线程还会监视日志文件是否被删除，如果删除了就滚动日志，重建文件。


空间局部性(spatial locality)

如果一个存储器的位置被引用，那么将来他附近的位置也会被引用。

## Unix 文件系统

{% asset_image unix-file-structure.jpg %}

- *Active Inode Table* (one, belongs to OS)

    Lists all active inodes (*file descriptors*)

- *Open File Table* (one, belongs to OS)

    Each entry contains:
        1. Pointer to entry in active inode table
        2. Current position (offset) in file

- *Per-process file table* (many)
    
     Each entry contains:
        1. Pointer to entry in open file table


### 文件描述符(File Descriptor)

A file descriptor (inode) represents a file

All inodes are stored on the disk in a
fixed-size array called the ilist
     The size of the ilist array is determined
            when the disk is initialized
    The index of a file descriptor in the array is
            called its inode number, or inumber
    Inodes for active files are also cached in
            memory in the active inode table

### Dentry

文件夹是一种特殊的文件，存储inumber和文件名的映射关系

>To facilitate this, the VFS employs the concept of a directory entry (dentry). A dentry is a specific component in a path. Using the previous example, /, bin, and vi are all dentry objects. The first two are directories and the last is a regular file. This is an important point: dentry objects are all components in a path, including files. Resolving a path and walking its components is a nontrivial exercise, time-consuming and rife with string comparisons. The dentry object makes the whole process easier

>Dentry 是将 Inode 和 文件联系在一起的”粘合剂”，它将 Inode number 和文件名联系起来。Dentry 也在目录缓存中扮演了一定的角色，它缓存最常使用的文件以便于更快速的访问。Dentry 还保存了目录及其子对象的关系，用于文件系统的遍历。

Dentry objects are represented by struct dentry and defined in <linux/dcache.h>. Here is the structure, with comments describing each member:

```c
struct dentry {
        atomic_t                 d_count;      /* usage count */
        unsigned long            d_vfs_flags;  /* dentry cache flags */
        spinlock_t               d_lock;       /* per-dentry lock */
        struct inode             *d_inode;     /* associated inode */
        struct list_head         d_lru;        /* unused list */
        struct list_head         d_child;      /* list of dentries within */
        struct list_head         d_subdirs;    /* subdirectories */
        struct list_head         d_alias;      /* list of alias inodes */
        unsigned long            d_time;       /* revalidate time */
        struct dentry_operations *d_op;        /* dentry operations table */
        struct super_block       *d_sb;        /* superblock of file */
        unsigned int             d_flags;      /* dentry flags */
        int                      d_mounted;    /* is this a mount point? */
        void                     *d_fsdata;    /* filesystem-specific data */
        struct rcu_head          d_rcu;        /* RCU locking */
        struct dcookie_struct    *d_cookie;    /* cookie */
        struct dentry            *d_parent;    /* dentry object of parent */
        struct qstr              d_name;       /* dentry name */
        struct hlist_node        d_hash;       /* list of hash table entries */
        struct hlist_head        *d_bucket;    /* hash bucket */
        unsigned char            d_iname[DNAME_INLINE_LEN_MIN]; /* short name */
};
```

### 磁盘存储的内容的

{% asset_image high-level.jpg %}

{% asset_image low-level.jpg %}

Blocks for storing directories and files

Blocks for storing the ilist

    Inodes corresponding to files
    Some special inodes
        – Boot block — code for booting the system
        – Super block — size of disk, number of free
        blocks, list of free blocks, size of ilist,
        number of free inodes in ilist, etc.

### 文件查找示例

{% asset_image example.jpg %}

## 参考

1. [File System Implementation.ppt](http://www.cs.kent.edu/~walker/classes/os.f07/lectures/Walker-11.pdf)

2. [理解inode - 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2011/12/inode.html)

3. [局部性原理浅析——良好代码的基本素质 - Geek_Ling - 博客园](http://www.cnblogs.com/yanlingyin/archive/2012/02/11/2347116.html)

4. [Linux文件系统十问，你知道吗？-腾讯大讲堂](http://djt.qq.com/article/view/620)

5. [Linux文件系统基础之inode和dentry](http://codefine.co/2593.html)

6. [关于 Linux 文件系统的 Superblock, Inode, Dentry 和 File – ElmerZhang's Blog](http://www.elmerzhang.com/2012/12/25/suerblock-inode-dentry-file-of-filesystem/)

7. [The Dentry Object](http://www.makelinux.net/books/lkd2/ch12lev1sec7)

8. [files - How to see information inside inode data structure - Unix & Linux Stack Exchange](https://unix.stackexchange.com/questions/279729/how-to-see-information-inside-inode-data-structure)

9. [Linux内核中从inode结构得到文件路径名](http://terenceli.github.io/%E6%8A%80%E6%9C%AF/2014/08/31/get-the-full-pathname-from-inode)

