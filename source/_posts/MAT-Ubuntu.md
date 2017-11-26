title: MAT-Ubuntu无法打开Report
tags: mat
category: java
toc: true
date: 2017-11-12 18:57:04
---


## 现象

可以运行`Leak Suspects`，可以看到报告文件确实生成了，但是无法打开，看error log如下:

```
Unhandled event loop exception

org.eclipse.swt.SWTException: Failed to execute runnable (org.eclipse.swt.SWTError: No more handles [Browser style SWT.MOZILLA and Java system property org.eclipse.swt.browser.DefaultType=mozilla are not supported with GTK 3 as XULRunner is not ported for GTK 3 yet])
	at org.eclipse.swt.SWT.error(SWT.java:4491)
	at org.eclipse.swt.SWT.error(SWT.java:4406)
	at org.eclipse.swt.widgets.Synchronizer.runAsyncMessages(Synchronizer.java:138)
	at org.eclipse.swt.widgets.Display.runAsyncMessages(Display.java:3794)
	at org.eclipse.swt.widgets.Display.readAndDispatch(Display.java:3433)
	at org.eclipse.e4.ui.internal.workbench.swt.PartRenderingEngine$4.run(PartRenderingEngine.java:1127)
	at org.eclipse.core.databinding.observable.Realm.runWithDefault(Realm.java:337)
	at org.eclipse.e4.ui.internal.workbench.swt.PartRenderingEngine.run(PartRenderingEngine.java:1018)
	at org.eclipse.e4.ui.internal.workbench.E4Workbench.createAndRunUI(E4Workbench.java:156)
	at org.eclipse.ui.internal.Workbench$5.run(Workbench.java:694)
	at org.eclipse.core.databinding.observable.Realm.runWithDefault(Realm.java:337)
	at org.eclipse.ui.internal.Workbench.createAndRunWorkbench(Workbench.java:606)
	at org.eclipse.ui.PlatformUI.createAndRunWorkbench(PlatformUI.java:150)
	at org.eclipse.mat.ui.rcp.Application.start(Application.java:26)
	at org.eclipse.equinox.internal.app.EclipseAppHandle.run(EclipseAppHandle.java:196)
	at org.eclipse.core.runtime.internal.adaptor.EclipseAppLauncher.runApplication(EclipseAppLauncher.java:134)
	at org.eclipse.core.runtime.internal.adaptor.EclipseAppLauncher.start(EclipseAppLauncher.java:104)
	at org.eclipse.core.runtime.adaptor.EclipseStarter.run(EclipseStarter.java:380)
	at org.eclipse.core.runtime.adaptor.EclipseStarter.run(EclipseStarter.java:235)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at org.eclipse.equinox.launcher.Main.invokeFramework(Main.java:669)
	at org.eclipse.equinox.launcher.Main.basicRun(Main.java:608)
	at org.eclipse.equinox.launcher.Main.run(Main.java:1515)
	at org.eclipse.equinox.launcher.Main.main(Main.java:1488)
Caused by: org.eclipse.swt.SWTError: No more handles [Browser style SWT.MOZILLA and Java system property org.eclipse.swt.browser.DefaultType=mozilla are not supported with GTK 3 as XULRunner is not ported for GTK 3 yet]
	at org.eclipse.swt.SWT.error(SWT.java:4517)
	at org.eclipse.swt.browser.MozillaDelegate.<init>(MozillaDelegate.java:57)
	at org.eclipse.swt.browser.Mozilla.create(Mozilla.java:663)
	at org.eclipse.swt.browser.Browser.<init>(Browser.java:99)
	at org.eclipse.mat.ui.internal.panes.QueryTextResultPane.createPartControl(QueryTextResultPane.java:72)
	at org.eclipse.mat.ui.editor.MultiPaneEditor.addPage(MultiPaneEditor.java:585)
	at org.eclipse.mat.ui.editor.MultiPaneEditor.addPage(MultiPaneEditor.java:574)
	at org.eclipse.mat.ui.editor.MultiPaneEditor.addNewPage(MultiPaneEditor.java:496)
	at org.eclipse.mat.ui.QueryExecution.doDisplayResult(QueryExecution.java:300)
	at org.eclipse.mat.ui.QueryExecution.access$0(QueryExecution.java:240)
	at org.eclipse.mat.ui.QueryExecution$1.run(QueryExecution.java:144)
	at org.eclipse.swt.widgets.RunnableLock.run(RunnableLock.java:35)
	at org.eclipse.swt.widgets.Synchronizer.runAsyncMessages(Synchronizer.java:135)
	... 24 more
```

## 解决方案

这个是`gtk`的问题。

添加`--launcher.GTK_version`和`2`到`MemoryAnalyzer.ini`文件中

```
-startup
plugins/org.eclipse.equinox.launcher_1.3.100.v20150511-1540.jar
--launcher.library
plugins/org.eclipse.equinox.launcher.gtk.linux.x86_64_1.1.300.v20150602-1417
--launcher.GTK_version
2
-vmargs
-Xmx1024m
```

## 参考

1. [Eclipse not working in 16.04 - Ask Ubuntu](https://askubuntu.com/questions/761604/eclipse-not-working-in-16-04)