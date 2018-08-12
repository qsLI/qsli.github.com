title: map
toc: true
tags:
category:
---


>加载因子存在的原因，还是因为减缓哈希冲突，如果初始桶为16，等到满16个元素才扩容，某些桶里可能就有不止一个元素了。
>所以加载因子默认为0.75，也就是说大小为16的HashMap，到了第13个元素，就会扩容成32。


```java
 /**
   * Creates a {@code HashMap} instance, with a high enough "initial capacity"
   * that it <i>should</i> hold {@code expectedSize} elements without growth.
   * This behavior cannot be broadly guaranteed, but it is observed to be true
   * for OpenJDK 1.7. It also can't be guaranteed that the method isn't
   * inadvertently <i>oversizing</i> the returned map.
   *
   * @param expectedSize the number of entries you expect to add to the
   *        returned map
   * @return a new, empty {@code HashMap} with enough capacity to hold {@code
   *         expectedSize} entries without resizing
   * @throws IllegalArgumentException if {@code expectedSize} is negative
   */
  public static <K, V> HashMap<K, V> newHashMapWithExpectedSize(int expectedSize) {
    return new HashMap<K, V>(capacity(expectedSize));
  }

  /**
   * Returns a capacity that is sufficient to keep the map from being resized as
   * long as it grows no larger than expectedSize and the load factor is >= its
   * default (0.75).
   */
  static int capacity(int expectedSize) {
    if (expectedSize < 3) {
      checkNonnegative(expectedSize, "expectedSize");
      return expectedSize + 1;
    }
    if (expectedSize < Ints.MAX_POWER_OF_TWO) {
      // This is the calculation used in JDK8 to resize when a putAll
      // happens; it seems to be the most conservative calculation we
      // can make.  0.75 is the default load factor.
      return (int) ((float) expectedSize / 0.75F + 1.0F);
    }
    return Integer.MAX_VALUE; // any large value
  }
```

## 参考

1. [高性能场景下，Map家族的优化使用建议 | 江南白衣](http://calvin1978.blogcn.com/articles/hashmap.html)