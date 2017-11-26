title: java8 Stream使用不当，导致文件没有关闭
tags: java
category: java
toc: true
date: 2017-11-04 20:24:31
---


## 现象

线上巡查的时候，检查了线上机器的`tomcat`打开的文件列表，发现了一些问题。
一般来说，tomcat打开的文件就是一些`jar`包，日志文件, 动态库，socket等。因此用下面的命令查看下tomcat打开的文件

```bash
lsof -p $pid | grep / | grep -v ".jar" | grep -v ".so"
```
结果如下:

```
COMMAND   PID   USER   FD   TYPE             DEVICE  SIZE/OFF      NODE NAME

java    25516 tomcat  cwd    DIR              252,2      4096    136416 /tmp/hsperfdata_tomcat

java    25516 tomcat  rtd    DIR              252,2      4096         2 /

java    25516 tomcat  mem    REG              252,2  99158576     19559 /usr/lib/locale/locale-archive

java    25516 tomcat  mem    REG              252,2     32768    131740 /tmp/hsperfdata_tomcat/25516

java    25516 tomcat    0r   CHR                1,3       0t0      3674 /dev/null

java    25516 tomcat    1w   REG              252,7  16965016   1836324 /logs/catalina.out

java    25516 tomcat    2w   REG              252,7  16965016   1836324 /logs/catalina.out

java    25516 tomcat    3w   REG              252,7   7839644   1836499 /logs/gc-201710181632.log

java    25516 tomcat   10w   REG              252,7   2741011   1835201 /logs/catalina.2017-10-18.log (deleted)

java    25516 tomcat   11w   REG              252,7      1494   1835054 /logs/localhost.2017-10-18.log (deleted)

java    25516 tomcat   40r   CHR                1,8       0t0      3678 /dev/random

java    25516 tomcat   41r   CHR                1,9       0t0      3679 /dev/urandom

java    25516 tomcat   42r   CHR                1,8       0t0      3678 /dev/random

java    25516 tomcat   43r   CHR                1,8       0t0      3678 /dev/random

java    25516 tomcat   44r   CHR                1,9       0t0      3679 /dev/urandom

java    25516 tomcat   45r   CHR                1,9       0t0      3679 /dev/urandom

java    25516 tomcat   52w   REG              252,7   7409504   1836890 /logs/access.2017-10-19.log

java    25516 tomcat   65r   REG              252,7   5665798   1836099 /cache/file_cache/fileA

java    25516 tomcat   68r   REG              252,7  67531699   1835818 /cache/file_cache/fileB

java    25516 tomcat   72r   REG              252,7   5665798   1836099 /cache/file_cache/fileA

java    25516 tomcat   82r   REG              252,7  67531699   1835818 /cache/file_cache/fileB

java    25516 tomcat  180r   REG              252,7  67531699   1835818 /cache/file_cache/fileB

java    25516 tomcat  193r   REG              252,7   5665798   1836099 /cache/file_cache/fileA

java    25516 tomcat  197r   REG              252,7   5665798   1836099 /cache/file_cache/fileA

java    25516 tomcat  200r   REG              252,7  44315261   1836448 /logs/dubbo-access-provider.2017-10-19-13.log

java    25516 tomcat  204r   REG              252,7 181402005   1836417 /logs/dubbo-access-consumer.2017-10-19-13.log

java    25516 tomcat  224r   REG              252,7  67531699   1835818 /cache/file_cache/fileB

java    25516 tomcat  363r   REG              252,7  67531699   1835818 /cache/file_cache/fileB

java    25516 tomcat  365r   REG              252,7   5665798   1836099 /cache/file_cache/fileA

java    25516 tomcat  573r   CHR                1,8       0t0      3678 /dev/random
```

从文件列表中可以看出日志文件是一直打开的，这个是正常的，因为需要写入日志。
但是还有一些其他的文件，不需要写入，也一直打开，而且有的打开了好几次，这个就看起来有问题了。


翻代码， 发现这个文件是定时拉取的逻辑，每次从数据源拉一份文件到本地， 然后用java8的`Files.lines`和lambda进行处理。
下面大概复现了相关的逻辑。

## 复现

```java
package com.air.collection.java8.stream.file;

import com.google.common.collect.Lists;
import com.google.common.io.Resources;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import static java.util.stream.Collectors.toList;

/**
 * @author qisheng.li
 * @email qisheng.li@qunar.com
 * @date 17-11-4 下午5:07
 */
public class FilesTest {

    private static ScheduledExecutorService executor = Executors.newScheduledThreadPool(1);

    public static void main(String[] args) throws IOException, URISyntaxException, InterruptedException {
        executor.scheduleAtFixedRate(FilesTest::reloadFile, 100, 1000, TimeUnit.MILLISECONDS);
    }

    public static void reloadFile() {
        System.out.println("reload file");
        List<Integer> collect = Lists.newArrayList();
        try {
            collect = Files.lines(Paths.get(Resources.getResource("test.json").toURI()))
                    .map(String::length)
                    .collect(toList());
        } catch (Exception e) {
            e.printStackTrace();
        }
            System.out.println(collect.get(0));
        }
}

```

查看进程打开的文件，可以发现有一堆的`test.json`

```bash
java    23757 qishengli 8822r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8823r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8824r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8825r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8826r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8827r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8828r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8829r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8830r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8831r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8832r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8833r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8834r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
java    23757 qishengli 8835r   REG                8,6   257120 2229528 /Java_Tutorial/java-tutorial/src/main/target/classes/test.json
```

完美复现！

## 原因

>Streams have a BaseStream.close() method and implement AutoCloseable, but nearly all stream instances do not actually need to be closed after use. 

一般来说，并不需要手动调用`Stream`的`close`方法， 只有背后是I/O相关的流才需要手动关闭。

>Generally, only streams whose source is an IO channel (such as those returned by Files.lines(Path, Charset)) will require closing. Most streams are backed by collections, arrays, or generating functions, which require no special resource management. (If a stream does require closing, it can be declared as a resource in a try-with-resources statement.)

查找到打开相应文件的代码，发现使用的正是java8的`Files.lines`方法，这个方法并不会自动的将文件关闭，所以就会看到，tomcat进程多次打开了同一个文件。

`Files.lines`方法的函数说明如下：

```java
/**
     * Read all lines from a file as a {@code Stream}. Unlike {@link
     * #readAllLines(Path, Charset) readAllLines}, this method does not read
     * all lines into a {@code List}, but instead populates lazily as the stream
     * is consumed.
     *
     * <p> Bytes from the file are decoded into characters using the specified
     * charset and the same line terminators as specified by {@code
     * readAllLines} are supported.
     *
     * <p> After this method returns, then any subsequent I/O exception that
     * occurs while reading from the file or when a malformed or unmappable byte
     * sequence is read, is wrapped in an {@link UncheckedIOException} that will
     * be thrown from the
     * {@link java.util.stream.Stream} method that caused the read to take
     * place. In case an {@code IOException} is thrown when closing the file,
     * it is also wrapped as an {@code UncheckedIOException}.
     *
     * <p> The returned stream encapsulates a {@link Reader}.  If timely
     * disposal of file system resources is required, the try-with-resources
     * construct should be used to ensure that the stream's
     * {@link Stream#close close} method is invoked after the stream operations
     * are completed.
     *
     *
     * @param   path
     *          the path to the file
     * @param   cs
     *          the charset to use for decoding
     *
     * @return  the lines from the file as a {@code Stream}
     *
     * @throws  IOException
     *          if an I/O error occurs opening the file
     * @throws  SecurityException
     *          In the case of the default provider, and a security manager is
     *          installed, the {@link SecurityManager#checkRead(String) checkRead}
     *          method is invoked to check read access to the file.
     *
     * @see     #readAllLines(Path, Charset)
     * @see     #newBufferedReader(Path, Charset)
     * @see     java.io.BufferedReader#lines()
     * @since   1.8
     */
    public static Stream<String> lines(Path path, Charset cs) throws IOException {
        BufferedReader br = Files.newBufferedReader(path, cs);
        try {
            return br.lines().onClose(asUncheckedRunnable(br));
        } catch (Error|RuntimeException e) {
            try {
                br.close();
            } catch (IOException ex) {
                try {
                    e.addSuppressed(ex);
                } catch (Throwable ignore) {}
            }
            throw e;
        }
    }

```

重点看这几句， 

>The returned stream encapsulates a Reader.  If timely disposal of file system resources is required, the try-with-resources construct should be used to ensure that the stream's `Stream#close` method is invoked  after the stream operations are completed.

如果需要及时地清理系统的资源， 可以使用java7中引入的`try-with-resources`, 来确保`Stream`的`close`方法在使用完后被调用。

`Files.lines`是惰性的， 当你使用的时候才去读取， 所以需要手动的关闭流， `Files.readAllLines`这个方法则是一次把文件
中的所有行读取到内存中去，并且会自动的关闭文件。

`Files.readAllLines`的函数说明中就保证了底层的文件一定会被关闭。

```java
 /**
     * Read all lines from a file. This method ensures that the file is
     * closed when all bytes have been read or an I/O error, or other runtime
     * exception, is thrown. Bytes from the file are decoded into characters
     * using the specified charset.
     **/
```

## 解决方案

使用java7中引入的`try-with-resoucres`, 实现了`AutoCloseable`接口的都会被自动的关闭

```java
try ( Stream<String> stream = Files.lines(path, charset) ) {
    // do something
}
```

## 参考

1. [Close Java 8 Stream - Stack Overflow](https://stackoverflow.com/questions/38698182/close-java-8-stream)

2. [java - Do I have to close terminated, streamed query results in a try-with-resources-block? - Stack Overflow](https://stackoverflow.com/questions/37659872/do-i-have-to-close-terminated-streamed-query-results-in-a-try-with-resources-bl)

3. [在你的代码之外，服务时延过长的三个追查方向(下) | 江南白衣](http://calvin1978.blogcn.com/articles/latency2.html)