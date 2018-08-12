title: java中的引用
tags: reference
category: java
toc: true
date: 2018-07-08 02:03:55
---


## jvm中的`Reference Handler`线程

经常看`jstack`的输出就会发现一个常见的线程 -- `Reference Handler`, 堆栈如下:

```
"Reference Handler" #2 daemon prio=10 os_prio=0 tid=0x00007f873013e000 nid=0x18d7 in Object.wait() [0x00007f873443b000]
   java.lang.Thread.State: WAITING (on object monitor)
	at java.lang.Object.wait(Native Method)
	at java.lang.Object.wait(Object.java:502)
	at java.lang.ref.Reference.tryHandlePending(Reference.java:191)
	- locked <0x00000000e0e1e9b8> (a java.lang.ref.Reference$Lock)
	at java.lang.ref.Reference$ReferenceHandler.run(Reference.java:153)

"VM Thread" os_prio=0 tid=0x00007f8730136800 nid=0x18d6 runnable 
```

看线程栈, 执行到`Reference`下的`tryHandlePending`方法就成了`WAIT`状态, 带着好奇心去翻翻源码.

### 何时启动?

```java
// Reference类中的静态代码块

 static {
        ThreadGroup tg = Thread.currentThread().getThreadGroup();
        for (ThreadGroup tgn = tg;
             tgn != null;
             tg = tgn, tgn = tg.getParent());
        // 这里创建线程, 传入线程group和线程的名称, 堆栈中的名称就来自于此
        Thread handler = new ReferenceHandler(tg, "Reference Handler");
        /* If there were a special system-only priority greater than
         * MAX_PRIORITY, it would be used here
         */
        handler.setPriority(Thread.MAX_PRIORITY);
        handler.setDaemon(true);
        handler.start();

        // provide access in SharedSecrets
        SharedSecrets.setJavaLangRefAccess(new JavaLangRefAccess() {
            @Override
            public boolean tryHandlePendingReference() {
                return tryHandlePending(false);
            }
        });
    }
```

`Reference`在被加载的时候就会触发`static`里的代码执行, 就会创建`Reference Handler`线程并启动.
至于`SharedSecrets`, 这个类类似一个Holder, 保存了一些对象的引用, 并提供了一些get/set方法.

```java
public class SharedSecrets {
    private static final Unsafe unsafe = Unsafe.getUnsafe();
    private static JavaUtilJarAccess javaUtilJarAccess;
    private static JavaLangAccess javaLangAccess;
    private static JavaLangRefAccess javaLangRefAccess;
    private static JavaIOAccess javaIOAccess;
    private static JavaNetAccess javaNetAccess;
    private static JavaNetHttpCookieAccess javaNetHttpCookieAccess;
    private static JavaNioAccess javaNioAccess;
    private static JavaIOFileDescriptorAccess javaIOFileDescriptorAccess;
    private static JavaSecurityProtectionDomainAccess javaSecurityProtectionDomainAccess;
    private static JavaSecurityAccess javaSecurityAccess;
    private static JavaUtilZipFileAccess javaUtilZipFileAccess;
    private static JavaAWTAccess javaAWTAccess;
    private static JavaObjectInputStreamAccess javaObjectInputStreamAccess;

    public SharedSecrets() {
    }

    // getter和setter方法省略
}
```

### 这个线程做了什么?

```java
// java.lang.ref.Reference.ReferenceHandler
  /* High-priority thread to enqueue pending References
     */
    private static class ReferenceHandler extends Thread {

        // 采用反射的方式触发类的加载
        private static void ensureClassInitialized(Class<?> clazz) {
            try {
                Class.forName(clazz.getName(), true, clazz.getClassLoader());
            } catch (ClassNotFoundException e) {
                throw (Error) new NoClassDefFoundError(e.getMessage()).initCause(e);
            }
        }

        static {
            // pre-load and initialize InterruptedException and Cleaner classes
            // so that we don't get into trouble later in the run loop if there's
            // memory shortage while loading/initializing them lazily.
            ensureClassInitialized(InterruptedException.class);
            // 和DirectMemory相关的Cleaner类
            ensureClassInitialized(Cleaner.class);
        }

        ReferenceHandler(ThreadGroup g, String name) {
            super(g, name);
        }

        public void run() {
            while (true) {
                // 调用Reference类的方法
                tryHandlePending(true);
            }
        }
    }
```

这个线程其实只是在死循环中调用了`Reference`的`tryHandlePending`来清理无效的`Reference`.

## Reference

Java中有四种引用, `StrongReference`, `SoftReference`, `WeakReference`, `PhantomReference`, 除了`StrongReference`其他的三种都有对应的类:

{%  asset_img   reference.jpg  Reference %}

### 引用的状态

- `Active`: Newly-created instances are Active.
- `Pending`: An element of the pending-Reference list, waiting to be enqueued by the Reference-handler thread.  Unregistered instances are never in this state.(没有注册ReferenceQueue的不会有这个状态)
- `Enqueued`: An element of the queue with which the instance was registered when it was created.  When an instance is removed from its ReferenceQueue, it is made Inactive. Unregistered instances are never in this state.(没有注册ReferenceQueue的不会有这个状态)
- `Inactive`: Nothing more to do.  Once an instance becomes Inactive its state will never change again.(终态)

### 引用链表

`Reference`中有五个关键的变量:

```java
 private T referent;         /* Treated specially by GC */

    volatile ReferenceQueue<? super T> queue;

    /* When active:   NULL
     *     pending:   this
     *    Enqueued:   next reference in queue (or this if last)
     *    Inactive:   this
     */
    @SuppressWarnings("rawtypes")
    Reference next;

    /* When active:   next element in a discovered reference list maintained by GC (or this if last)
     *     pending:   next element in the pending list (or null if last)
     *   otherwise:   NULL
     */
    transient private Reference<T> discovered;  /* used by VM */

    /* List of References waiting to be enqueued.  The collector adds
     * References to this list, while the Reference-handler thread removes
     * them.  This list is protected by the above lock object. The
     * list uses the discovered field to link its elements.
     */
    private static Reference<Object> pending = null;
```

- `referent`

 代表当前持有的引用. 

- `queue`

 是初始化的时候传入的, 可以为null, 如果传入了`ReferenceQueue`, 会有入队列和出队列的操作

- `next`

 代表`ReferenceQueue`中的下一个, `Active`状态下是null, 
 `Pending`和`Inactive`状态下指向自己, 
 ```
   +-------+
   |       |
   v       |
           |
+-----+    |
|     |    |
|  1  +----+
|     |
+-----+

 ```
 `Enqueued`状态下指向`queue`中的下一个元素

```
                         +-------+
                         |       |
                         v       |
                                 |
+-----+    +-----+    +-----+    |
|     |    |     |    |     |    |
|  1  +--> |  2  +--> |  3  +----+
|     |    |     |    |     |
+-----+    +-----+    +-----+

```
- `discovered`

 `Active`状态下指向`discovered reference list`中的下一个元素, 
 `Pending`状态下指向`pending list`中的下一个元素,
 其他状态下是null, 相关的链表是JVM维护的

- `pending`

`pending`指向的是`pending list`链表的head

### tryHandlePending

处理引用的代码:

```java
/**
     * Try handle pending {@link Reference} if there is one.<p>
     * Return {@code true} as a hint that there might be another
     * {@link Reference} pending or {@code false} when there are no more pending
     * {@link Reference}s at the moment and the program can do some other
     * useful work instead of looping.
     *
     * @param waitForNotify if {@code true} and there was no pending
     *                      {@link Reference}, wait until notified from VM
     *                      or interrupted; if {@code false}, return immediately
     *                      when there is no pending {@link Reference}.
     * @return {@code true} if there was a {@link Reference} pending and it
     *         was processed, or we waited for notification and either got it
     *         or thread was interrupted before being notified;
     *         {@code false} otherwise.
     */
    static boolean tryHandlePending(boolean waitForNotify) {
        Reference<Object> r;
        Cleaner c;
        try {
            synchronized (lock) {
                // pending list不为null, 说明有需要处理的引用
                if (pending != null) {
                    r = pending;
                    // 'instanceof' might throw OutOfMemoryError sometimes
                    // so do this before un-linking 'r' from the 'pending' chain...
                    c = r instanceof Cleaner ? (Cleaner) r : null;
                    // unlink 'r' from 'pending' chain
                    // 从pending list中删除r
                    pending = r.discovered;
                    r.discovered = null;
                } else {
                    // The waiting on the lock may cause an OutOfMemoryError
                    // because it may try to allocate exception objects.
                    if (waitForNotify) {
                        // 没有需要处理的引用, 就wait, 这个应该会被JVM给notify
                        lock.wait();
                    }
                    // retry if waited
                    return waitForNotify;
                }
            }
        } catch (OutOfMemoryError x) {
            // Give other threads CPU time so they hopefully drop some live references
            // and GC reclaims some space.
            // Also prevent CPU intensive spinning in case 'r instanceof Cleaner' above
            // persistently throws OOME for some time...
            Thread.yield();
            // retry
            return true;
        } catch (InterruptedException x) {
            // retry
            return true;
        }

        // Fast path for cleaners
        if (c != null) {
            c.clean();
            return true;
        }

        ReferenceQueue<? super Object> q = r.queue;
        // 如果关联了ReferenceQueue, 就加入到ReferenceQueue中
        if (q != ReferenceQueue.NULL) q.enqueue(r);
        return true;
    }
```

## ReferenceQueue

`ReferenceQueue`用一个链表来维护队列里的`Reference`

入队列相关的操作:

```java
 boolean enqueue(Reference<? extends T> r) { /* Called only by Reference class */
        synchronized (lock) { // 和队列相关的锁
            // Check that since getting the lock this reference hasn't already been
            // enqueued (and even then removed)
            // 校验下r带的队列是自己, 并且已经enqueue的不会重复enqueue
            ReferenceQueue<?> queue = r.queue;
            if ((queue == NULL) || (queue == ENQUEUED)) {
                return false;
            }
            assert queue == this;

            // 修改Reference的queue为ENQUEUED, 代表已经入队了
            r.queue = ENQUEUED;
            // 链表的头插发, 将当前的引用入队, 并更新head的值和队列的长度
            r.next = (head == null) ? r : head;
            head = r;
            queueLength++;
            if (r instanceof FinalReference) {
                sun.misc.VM.addFinalRefCount(1);
            }
            lock.notifyAll();
            return true;
        }
    }
```

出队列相关的操作:

```java
 @SuppressWarnings("unchecked")
    private Reference<? extends T> reallyPoll() {       /* Must hold lock */
        Reference<? extends T> r = head;
        if (r != null) {
            // 因为这个队列的尾节点的next总是指向自己, 这里判断如果是尾节点出队列, head置为null
            head = (r.next == r) ?
                null :
                r.next; // Unchecked due to the next field having a raw type in Reference
            // 修改对应queue的状态, 代表已经出队列
            r.queue = NULL;
            // 对于出队列的引用, 他的next也是指向自己的
            r.next = r;
            queueLength--;
            if (r instanceof FinalReference) {
                sun.misc.VM.addFinalRefCount(-1);
            }
            return r;
        }
        return null;
    }
```

## openjdk

> 上面两个变量对应在VM中的调用，可以参考openjdk中的hotspot源码，在hotspot/src/share/vm/memory/referenceProcessor.cpp 的ReferenceProcessor::discover_reference 方法。(根据此方法的注释由了解到虚拟机在对Reference的处理有ReferenceBasedDiscovery和RefeferentBasedDiscovery两种策略)

```cpp
void ReferenceProcessor::enqueue_discovered_reflist(DiscoveredList& refs_list,
                                                    HeapWord* pending_list_addr) {
  // Given a list of refs linked through the "discovered" field
  // (java.lang.ref.Reference.discovered), self-loop their "next" field
  // thus distinguishing them from active References, then
  // prepend them to the pending list.
  // BKWRD COMPATIBILITY NOTE: For older JDKs (prior to the fix for 4956777),
  // the "next" field is used to chain the pending list, not the discovered
  // field.
  ...
                                                    }
```

## GC日志

在jvm的启动参数中加入下面的flag, 可以打开处理引用用掉的时间:

```
-XX:+PrintGCDetails -XX:+PrintReferenceGC
```

测试代码:

```java
 @Test
    public void testGc() {
        Object reference = new Object();
        final WeakReference<Object> weakReference = new WeakReference<>(reference);

        Assert.assertEquals(reference, weakReference.get());

        reference = null;
        System.gc();

        /**
         * 当所引用的对象在 JVM 内不再有强引用时, GC 后 weak reference 将会被自动回收
         */
        Assert.assertNull(weakReference.get());
    }
```

日志输出:

```
[GC (System.gc()) [SoftReference, 0 refs, 0.0000616 secs][WeakReference, 34 refs, 0.0000273 secs][FinalReference, 654 refs, 0.0003785 secs][PhantomReference, 0 refs, 0 refs, 0.0000060 secs][JNI Weak Reference, 0.0000023 secs][PSYoungGen: 10708K->1566K(56320K)] 10708K->1574K(184832K), 0.0083391 secs] [Times: user=0.01 sys=0.00, real=0.00 secs] 
[Full GC (System.gc()) [SoftReference, 0 refs, 0.0000153 secs][WeakReference, 1 refs, 0.0000035 secs][FinalReference, 85 refs, 0.0000111 secs][PhantomReference, 0 refs, 0 refs, 0.0000037 secs][JNI Weak Reference, 0.0000020 secs][PSYoungGen: 1566K->0K(56320K)] [ParOldGen: 8K->1438K(128512K)] 1574K->1438K(184832K), [Metaspace: 4770K->4770K(1056768K)], 0.0319906 secs] [Times: user=0.03 sys=0.00, real=0.04 secs] 
Heap
 PSYoungGen      total 56320K, used 972K [0x0000000781e00000, 0x0000000785c80000, 0x00000007c0000000)
  eden space 48640K, 2% used [0x0000000781e00000,0x0000000781ef3358,0x0000000784d80000)
  from space 7680K, 0% used [0x0000000784d80000,0x0000000784d80000,0x0000000785500000)
  to   space 7680K, 0% used [0x0000000785500000,0x0000000785500000,0x0000000785c80000)
 ParOldGen       total 128512K, used 1438K [0x0000000705a00000, 0x000000070d780000, 0x0000000781e00000)
  object space 128512K, 1% used [0x0000000705a00000,0x0000000705b679e0,0x000000070d780000)
 Metaspace       used 4784K, capacity 5158K, committed 5248K, reserved 1056768K
  class space    used 564K, capacity 593K, committed 640K, reserved 1048576K
```

## 参考

1. [话说ReferenceQueue | 写点什么](http://hongjiang.info/java-referencequeue/#comment-4504)
2. [SharedSecrets深入理解 | 柳絮纷飞](https://cordate.github.io/2018/03/06/java/SharedSecrets%E6%B7%B1%E5%85%A5%E7%90%86%E8%A7%A3/)
3. [理解 Java 的 GC 与 幽灵引用 - Java - ITeye论坛](http://www.iteye.com/topic/401478)