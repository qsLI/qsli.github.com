---
title: tomcat-stringcache
tags: tomcat
category: tomcat
toc: true
typora-root-url: tomcat-stringcache
typora-copy-images-to: tomcat-stringcache
date: 2022-08-07 19:08:35
---



## StringCache是啥？

​		众所周知，http协议是文本协议，因此传输过程中的ByteChunk和CharChunk最终都会转为String。tomcat为了减少内存占用，减少对GC的影响，提出了StringCache的解决方案。

​		先看下StringCache的实现：

```java
// org.apache.tomcat.util.buf.StringCache
/**
 * This class implements a String cache for ByteChunk and CharChunk.
 *
 * @author Remy Maucherat
 */
public class StringCache {
  /**
     * Statistics hash map for byte chunk.
     */
    protected static final HashMap<ByteEntry,int[]> bcStats =
            new HashMap<>(cacheSize);


    /**
     * toString count for byte chunk.
     */
    protected static int bcCount = 0;


    /**
     * Cache for byte chunk.
     */
    protected static ByteEntry[] bcCache = null;


    /**
     * Statistics hash map for char chunk.
     */
    protected static final HashMap<CharEntry,int[]> ccStats =
            new HashMap<>(cacheSize);


    /**
     * toString count for char chunk.
     */
    protected static int ccCount = 0;


    /**
     * Cache for char chunk.
     */
    protected static CharEntry[] ccCache = null;


    /**
     * Access count.
     */
    protected static int accessCount = 0;


    /**
     * Hit count.
     */
    protected static int hitCount = 0;


    // ------------------------------------------------------------ Properties
}
```

StringCache包含两类，一类是ByteChunk转过来的，一类是CharChunk转过来的。底层的缓存逻辑是一致的，只是类型不同，我们只需关注一种即可。缓存使用数组实现，以ByteChunk为例，数组的类型是ByteEntry:

```java
//org.apache.tomcat.util.buf.StringCache.ByteEntry
   // -------------------------------------------------- ByteEntry Inner Class
private static class ByteEntry {

  // 底层的byte数组
  private byte[] name = null;
  // String的字符集
  private Charset charset = null;
  // 对应的String实现
  private String value = null;

  @Override
  public String toString() {
    return value;
  }
  @Override
  public int hashCode() {
    return value.hashCode();
  }
  @Override
  public boolean equals(Object obj) {
    if (obj instanceof ByteEntry) {
      return value.equals(((ByteEntry) obj).value);
    }
    return false;
  }
}
```

这个类一目了然，这里不再赘述。当调用StringCache的toString方法时，会优先从cache中取。

```java
// org.apache.tomcat.util.buf.StringCache#toString(org.apache.tomcat.util.buf.ByteChunk)
if (bcCache == null) {
  // 缓存维护逻辑，此处省略，后面会讲
} else {
  // 调用计数
  accessCount++;
  // Find the corresponding String
  // 二分查找
  String result = find(bc);
  if (result == null) {
    // 没有命中，直接走原来的逻辑
    return bc.toStringInternal();
  }
  // Note: We don't care about safety for the stats
  // 命中计数
  hitCount++;
  return result;
}
```

cache的查找使用的是二分法：

```java
//org.apache.tomcat.util.buf.StringCache#findClosest(org.apache.tomcat.util.buf.ByteChunk, org.apache.tomcat.util.buf.StringCache.ByteEntry[], int)
/**
     * Find an entry given its name in a sorted array of map elements.
     * This will return the index for the closest inferior or equal item in the
     * given array.
     * @param name The name to find
     * @param array The array in which to look
     * @param len The effective length of the array
     * @return the position of the best match
     */
protected static final int findClosest(ByteChunk name, ByteEntry[] array,
                                       int len) {

  // 二分查找的low和high
  int a = 0;
  int b = len - 1;

  // Special cases: -1 and 0
  if (b == -1) {
    return -1;
  }

  if (compare(name, array[0].name) < 0) {
    return -1;
  }
  if (b == 0) {
    return 0;
  }
	// 以上是特殊的case
  int i = 0;
  while (true) {
    // 取中间坐标，用位运算避免溢出风险
    i = (b + a) >>> 1;
    // compare的结果， -1, 0, 1
    int result = compare(name, array[i].name);
    // 在右侧，更新low
    if (result == 1) {
      a = i;
    } else if (result == 0) {
      // 正好查找到
      return i;
    } else {
      // 在左侧，缩减high
      b = i;
    }
    // 特殊情况
    if ((b - a) == 1) {
      int result2 = compare(name, array[b].name);
      if (result2 < 0) {
        return a;
      } else {
        return b;
      }
    }
  }

}
```

## 缓存维护

缓存的核心是缓存的维护。StringCache更像一个半成品，采用固定长度的缓存。

在启动初期，有一个训练的阈值，调用次数没有达到阈值之前，只会做stat；超过阈值之后，才会根据前面统计到的stat来构建cache。

```java
// org.apache.tomcat.util.buf.StringCache#toString(org.apache.tomcat.util.buf.ByteChunk)
// If the cache is null, then either caching is disabled, or we're
// still training
if (bcCache == null) {
  // bcCache为空，1.在training阶段，2. cache被禁用了
  // 所以这里直接调用了对应的toString方法
  String value = bc.toStringInternal();
  // 缓存开关打开了，开始构建缓存的统计信息
  // 这里有个String上线的限制，有相应的bug：https://bz.apache.org/bugzilla/show_bug.cgi?id=41057
  if (byteEnabled && (value.length() < maxStringSize)) {
    // If training, everything is synced
    synchronized (bcStats) {
      // If the cache has been generated on a previous invocation
      // while waiting for the lock, just return the toString
      // value we just calculated
      // double checked lock, 在同步代码块中再次check
      if (bcCache != null) {
        return value;
      }
      // Two cases: either we just exceeded the train count, in
      // which case the cache must be created, or we just update
      // the count for the string
      // 超过训练阈值，构建cache逻辑
      if (bcCount > trainThreshold) {
        long t1 = System.currentTimeMillis();
        // Sort the entries according to occurrence
        // stats中每个item的出现次数
        TreeMap<Integer,ArrayList<ByteEntry>> tempMap =
          new TreeMap<>();
        for (Entry<ByteEntry,int[]> item : bcStats.entrySet()) {
          ByteEntry entry = item.getKey();
          int[] countA = item.getValue();
          Integer count = Integer.valueOf(countA[0]);
          // Add to the list for that count
          ArrayList<ByteEntry> list = tempMap.get(count);
          if (list == null) {
            // Create list
            list = new ArrayList<>();
            tempMap.put(count, list);
          }
          list.add(entry);
        }
        // Allocate array of the right size
        // 不能超过缓存的上限
        int size = bcStats.size();
        if (size > cacheSize) {
          size = cacheSize;
        }
        ByteEntry[] tempbcCache = new ByteEntry[size];
        // Fill it up using an alphabetical order
        // and a dumb insert sort
        ByteChunk tempChunk = new ByteChunk();
        int n = 0;
        while (n < size) {
          // TreeMap，这里取lastKey就是出现次数最多的
          Object key = tempMap.lastKey();
          ArrayList<ByteEntry> list = tempMap.get(key);
          // 出现次数并列的情况
          for (int i = 0; i < list.size() && n < size; i++) {
            ByteEntry entry = list.get(i);
            tempChunk.setBytes(entry.name, 0,
                               entry.name.length);
            // 二分查找，找到插入位置
            int insertPos = findClosest(tempChunk,
                                        tempbcCache, n);
            if (insertPos == n) {
              tempbcCache[n + 1] = entry;
            } else {
              System.arraycopy(tempbcCache, insertPos + 1,
                               tempbcCache, insertPos + 2,
                               n - insertPos - 1);
              tempbcCache[insertPos + 1] = entry;
            }
            n++;
          }
          // 删除掉已经处理的
          tempMap.remove(key);
        } // while loop
        bcCount = 0;
        // 构建完成，清理掉stat数据
        bcStats.clear();
        bcCache = tempbcCache;
        if (log.isDebugEnabled()) {
          long t2 = System.currentTimeMillis();
          log.debug("ByteCache generation time: " +
                    (t2 - t1) + "ms");
        }
      } else {
        // ----------------- 以下是收集训练数据的过程 -----------------
        bcCount++;
        // Allocate new ByteEntry for the lookup
        ByteEntry entry = new ByteEntry();
        entry.value = value;
        int[] count = bcStats.get(entry);
        if (count == null) {
          int end = bc.getEnd();
          int start = bc.getStart();
          // Create byte array and copy bytes
          entry.name = new byte[bc.getLength()];
          System.arraycopy(bc.getBuffer(), start, entry.name,
                           0, end - start);
          // Set encoding
          entry.charset = bc.getCharset();
          // Initialize occurrence count to one
          count = new int[1];
          count[0] = 1;
          // Set in the stats hash map
          bcStats.put(entry, count);
        } else {
          // 更新出现的次数
          count[0] = count[0] + 1;
        }
      }
    }
  }
  return value;
} else {
  // 走缓存的逻辑，这里忽略
}
```

## tomcat相关开关

- tomcat.util.buf.StringCache.cacheSize 

- - 缓存大小
  - 默认200个entry

- tomcat.util.buf.StringCache.byte.enabled

- - ByteChunk缓存开关
  - 默认开启

- tomcat.util.buf.StringCache.char.enabled

- - CharChunk缓存开关
  - 默认关闭

- tomcat.util.buf.StringCache.trainThreshold

- - 采样次数的阈值
  - 默认20000

- tomcat.util.buf.StringCache.maxStringSize

- - 缓存的String最大长度
  - 这个是有人反馈之后才加上的，参加这个bug [41057 – Tomcat leaks memory on every request](https://bz.apache.org/bugzilla/show_bug.cgi?id=41057)

## 性能影响

从源码角度看，这个缓存的开销主要有两部分：

- 缓存生成的开销（前期统计和缓存生成）
- 缓存使用的开销（底层是有序数组，使用二分法查找）

tomcat默认的缓存大小是200，但是这个ByteChunk非常底层，uri中的参数、postbody中的内容、header中的内容等都会使用到，很容易被污染。而且缓存的效果取决于启动初期的流量，如果是预热请求，收集到的采样数据可能不准确。



生产环境，通过观测，有些场景下，cpu开销约为1%，主要花费在二分查找上：

![image-20220807185524674](/image-20220807185524674.png)

## 看看是啥？

- dump出来内存，直接看StringCache存了什么：

![image-20220807185329232](/image-20220807185329232.png)

![image-20220807185405006](/image-20220807185405006.png)

- 使用arthas查看tomcat暴露出来的mbean信息

  ```bash
  [arthas@96]$ mbean | grep -i StringCache
  Catalina:type=StringCache
  [arthas@96]$ mbean Catalina:type=StringCache
   OBJECT_NAME     Catalina:type=StringCache                                                                                                               
  --------------------------------------------------------                                                                                                 
   NAME            VALUE                                                                                                                                   
  --------------------------------------------------------                                                                                                 
   accessCount     2120845422                                                                                                                              
   modelerType     org.apache.tomcat.util.buf.StringCache                                                                                                  
   hitCount        1218278493                                                                                                                              
   cacheSize       200                                                                                                                                     
   trainThreshold  20000                                                                                                                                   
   charEnabled     false                                                                                                                                   
   byteEnabled     true 
  ```

  注意，计数存在溢出的情况。

## 参考

- ['stringcache' in tomcat-dev - MARC](https://marc.info/?l=tomcat-dev&w=2&r=1&s=StringCache&q=b)
- [41057 – Tomcat leaks memory on every request](https://bz.apache.org/bugzilla/show_bug.cgi?id=41057)
