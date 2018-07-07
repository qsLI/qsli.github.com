---
title: Future和Callable
toc: true
tags: async
category: java
---

## Future

> A Future represents the result of an asynchronous computation. 

>一是简单并行，把所有可并行的服务一下子都撒出去，然后等待所有的异步调用返回，简单的Future.get()就够用。

```
                                      do something else
                                             +
                                             |
                                             |
                                             |
                                             |
                    submit async task        |         get async result
                                             v

main thread   +------------+--------------------------------+------------------------->
                           |                                |
                           |                                |
                           |                                |
                           |                                |
                           |                                |
                           +--------------------------------+

                                   async thread

```

代码示例:

```java
interface ArchiveSearcher { String search(String target); }
 class App {
   ExecutorService executor = ...
   ArchiveSearcher searcher = ...
   void showSearch(final String target)
       throws InterruptedException {
     // time consuming operation in another thread
     Future<String> future
       = executor.submit(new Callable<String>() {
         public String call() {
             return searcher.search(target);
         }});
     // do other things while searching
     displayOtherThings();
     try {
       // get async result
       displayText(future.get()); // use future
     } catch (ExecutionException ex) { cleanup(); return; }
   }
 }
```

节省的时间就是`displayOtherThings`消耗的时间.

`future.get()`是很危险的, 因为他没有超时, 没有超时就没有自我保护, 就有可能一直阻塞在这里. JDK中还提供了一个带超时的版本:

```java
/**
     * Waits if necessary for at most the given time for the computation
     * to complete, and then retrieves its result, if available.
     *
     * @param timeout the maximum time to wait
     * @param unit the time unit of the timeout argument
     * @return the computed result
     * @throws CancellationException if the computation was cancelled
     * @throws ExecutionException if the computation threw an
     * exception
     * @throws InterruptedException if the current thread was interrupted
     * while waiting
     * @throws TimeoutException if the wait timed out
     */
    V get(long timeout, TimeUnit unit)
        throws InterruptedException, ExecutionException, TimeoutException;
```
可能抛出的异常有三个`InterruptedException`, `ExecutionException`, `TimeoutException`

- `InterruptedException`: 线程中断异常, get的时候会检查线程的状态, 如果线程是中断状态就会抛出这个异常.

```java

/**
 * Thrown when a thread is waiting, sleeping, or otherwise occupied,
 * and the thread is interrupted, either before or during the activity.
 * Occasionally a method may wish to test whether the current
 * thread has been interrupted, and if so, to immediately throw
 * this exception.  The following code can be used to achieve
 * this effect:
 * <pre>
 *  if (Thread.interrupted())  // Clears interrupted status!
 *      throw new InterruptedException();
 * </pre>
 *
 * @author  Frank Yellin
 * @see     java.lang.Object#wait()
 * @see     java.lang.Object#wait(long)
 * @see     java.lang.Object#wait(long, int)
 * @see     java.lang.Thread#sleep(long)
 * @see     java.lang.Thread#interrupt()
 * @see     java.lang.Thread#interrupted()
 * @since   JDK1.0
 */
public
class InterruptedException extends Exception {}

// java.util.concurrent.FutureTask#awaitDone
 for (;;) {
            // 获取并清除线程的中断状态
            if (Thread.interrupted()) {
                removeWaiter(q);
                throw new InterruptedException();
            }
            // ... 
 }
```

- `ExecutionException`: 执行过程中的异常会被包装成`ExecutionException`

```java
/**
 * Exception thrown when attempting to retrieve the result of a task
 * that aborted by throwing an exception. This exception can be
 * inspected using the {@link #getCause()} method.
 *
 * @see Future
 * @since 1.5
 * @author Doug Lea
 */
public class ExecutionException extends Exception {}
```

见白衣大侠的`springside`中的`ExceptionUtil`:

```java
/**
	 * 如果是著名的包裹类，从cause中获得真正异常. 其他异常则不变.
	 * 
	 * Future中使用的ExecutionException 与 反射时定义的InvocationTargetException， 真正的异常都封装在Cause中
	 * 
	 * 前面 unchecked() 使用的UncheckedException同理.
	 */
	public static Throwable unwrap(@Nullable Throwable t) {
		if (t instanceof UncheckedException || t instanceof java.util.concurrent.ExecutionException
				|| t instanceof java.lang.reflect.InvocationTargetException
				|| t instanceof UndeclaredThrowableException) {
			return t.getCause();
		}

		return t;
	}
```

- `TimeoutException`: 超时的时候会抛出这个异常, 这个异常不会被`ExecutionException`包装

```java
/**
 * Exception thrown when a blocking operation times out.  Blocking
 * operations for which a timeout is specified need a means to
 * indicate that the timeout has occurred. For many such operations it
 * is possible to return a value that indicates timeout; when that is
 * not possible or desirable then {@code TimeoutException} should be
 * declared and thrown.
 *
 * @since 1.5
 * @author Doug Lea
 */
public class TimeoutException extends Exception {}

// java.util.concurrent.FutureTask#get(long, java.util.concurrent.TimeUnit)
 /**
     * @throws CancellationException {@inheritDoc}
     */
    public V get(long timeout, TimeUnit unit)
        throws InterruptedException, ExecutionException, TimeoutException {
        if (unit == null)
            throw new NullPointerException();
        int s = state;
        if (s <= COMPLETING &&
            (s = awaitDone(true, unit.toNanos(timeout))) <= COMPLETING)
            throw new TimeoutException();
        return report(s);
    }

    /**
     * Returns result or throws exception for completed task.
     *
     * @param s completed state value
     */
    @SuppressWarnings("unchecked")
    private V report(int s) throws ExecutionException {
        Object x = outcome;
        if (s == NORMAL)
            return (V)x;
        if (s >= CANCELLED)
            throw new CancellationException();
        throw new ExecutionException((Throwable)x);
    }
```

### `CompletionService`和`CompleteFuture`

### `ListenableFuture`

>Concurrency is a hard problem, but it is significantly simplified by working with powerful and simple abstractions. To simplify matters, Guava extends the Future interface of the JDK with ListenableFuture.


### `SettableFuture`

### 


## java8 中的改进 -- CompletableFuture

>二是调用编排，比如一开始并行A、B、C、D服务，一旦A与B返回则根据结果调用E，一旦C返回则调用F，最后组装D、E、F的结果返回给客户端。

## `Future`和`Promise`?

## 参考

- [Future (Java Platform SE 7 )](https://docs.oracle.com/javase/7/docs/api/java/util/concurrent/Future.html)
- [谈谈服务化体系中的异步（上）花钱的年华 | 江南白衣](http://calvin1978.blogcn.com/articles/async.html)
- [ListenableFutureExplained · google/guava Wiki](https://github.com/google/guava/wiki/ListenableFutureExplained)
- [Futures and Promises](http://dist-prog-book.com/chapter/2/futures.html)