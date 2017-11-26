title: more-executors
toc: true
tags:
category:
---


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
