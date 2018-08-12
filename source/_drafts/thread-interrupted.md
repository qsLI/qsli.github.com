title: thread-interrupted
toc: true
tags:
category:
---



```java
 private void put(E eventObject) {
        if (neverBlock) {
            blockingQueue.offer(eventObject);
        } else {
            try {
                blockingQueue.put(eventObject);
            } catch (InterruptedException e) {
                // Interruption of current thread when in doAppend method should not be consumed
                // by AsyncAppender
                Thread.currentThread().interrupt();
            }
        }
    }
```