title: jvm-shutdown-hook
toc: true
tags: shutdown-hook
category: jvm
---


```java
static {
    Runtime.getRuntime().addShutdownHook(new Thread(new Runnable() {
        public void run() {
            if (logger.isInfoEnabled()) {
                logger.info("Run shutdown hook now.");
            }
            ProtocolConfig.destroyAll();
        }
    }, "DubboShutdownHook"));
}
```


```java

    final void addDelayedShutdownHook(
        final ExecutorService service, final long terminationTimeout, final TimeUnit timeUnit) {
      checkNotNull(service);
      checkNotNull(timeUnit);
      addShutdownHook(MoreExecutors.newThread("DelayedShutdownHook-for-" + service, new Runnable() {
        @Override
        public void run() {
          try {
            // We'd like to log progress and failures that may arise in the
            // following code, but unfortunately the behavior of logging
            // is undefined in shutdown hooks.
            // This is because the logging code installs a shutdown hook of its
            // own. See Cleaner class inside {@link LogManager}.
            service.shutdown();
            service.awaitTermination(terminationTimeout, timeUnit);
          } catch (InterruptedException ignored) {
            // We're shutting down anyway, so just ignore.
          }
        }
      }));
    }
```



JVM退出时调用Hook线程

```java
 /* Iterates over all application hooks creating a new thread for each
     * to run in. Hooks are run concurrently and this method waits for
     * them to finish.
     */
    static void runHooks() {
        Collection<Thread> threads;
        synchronized(ApplicationShutdownHooks.class) {
            threads = hooks.keySet();
            hooks = null;
        }

        for (Thread hook : threads) {
            hook.start();
        }
        for (Thread hook : threads) {
            try {
                hook.join();
            } catch (InterruptedException x) { }
        }
    }
```