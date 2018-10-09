---
title: sudo命令的环境路径
tags: sudo
category: linux
toc: true
typora-root-url: sudo命令的环境路径
typora-copy-images-to: sudo命令的环境路径
date: 2018-10-07 21:27:58
---



运行sudo命令时，有时会提示：

```bash
[qisheng.li@yd_app_api_02 ~]$ sudo -u tomcat jstack 123
sudo: jstack: command not found
```

但是查看`/etc/profile`可以看到:

```bash
export JAVA_HOME=/usr/local/jdk/default
export PATH=$JAVA_HOME/bin:$PATH
export CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar
```

确实导出了环境变量，那么为什么运行的时候不成功呢？

换成如下的命令，可以找到:

```bash
[qisheng.li@yd_app_api_02 ~]$ sudo -i  -u tomcat jstack 123
123: No such process
```

这次成功的找到了命令，区别在哪儿？

可以通过下面的命令查看环境变量：

```bash
[qisheng.li@yd_app_api_02 ~]$ sudo -i -u tomcat env
HOSTNAME=yd_app_api_02
SHELL=/bin/bash
TERM=xterm-256color
HISTSIZE=1000
USER=tomcat
LS_COLORS=rs=0:di=38;5;27:ln=38;5;51:mh=44;38;5;15:pi=40;38;5;11:so=38;5;13:do=38;5;5:bd=48;5;232;38;5;11:cd=48;5;232;38;5;3:or=48;5;232;38;5;9:mi=05;48;5;232;38;5;15:su=48;5;196;38;5;15:sg=48;5;11;38;5;16:ca=48;5;196;38;5;226:tw=48;5;10;38;5;16:ow=48;5;10;38;5;21:st=48;5;21;38;5;15:ex=38;5;34:*.tar=38;5;9:*.tgz=38;5;9:*.arc=38;5;9:*.arj=38;5;9:*.taz=38;5;9:*.lha=38;5;9:*.lz4=38;5;9:*.lzh=38;5;9:*.lzma=38;5;9:*.tlz=38;5;9:*.txz=38;5;9:*.tzo=38;5;9:*.t7z=38;5;9:*.zip=38;5;9:*.z=38;5;9:*.Z=38;5;9:*.dz=38;5;9:*.gz=38;5;9:*.lrz=38;5;9:*.lz=38;5;9:*.lzo=38;5;9:*.xz=38;5;9:*.bz2=38;5;9:*.bz=38;5;9:*.tbz=38;5;9:*.tbz2=38;5;9:*.tz=38;5;9:*.deb=38;5;9:*.rpm=38;5;9:*.jar=38;5;9:*.war=38;5;9:*.ear=38;5;9:*.sar=38;5;9:*.rar=38;5;9:*.alz=38;5;9:*.ace=38;5;9:*.zoo=38;5;9:*.cpio=38;5;9:*.7z=38;5;9:*.rz=38;5;9:*.cab=38;5;9:*.jpg=38;5;13:*.jpeg=38;5;13:*.gif=38;5;13:*.bmp=38;5;13:*.pbm=38;5;13:*.pgm=38;5;13:*.ppm=38;5;13:*.tga=38;5;13:*.xbm=38;5;13:*.xpm=38;5;13:*.tif=38;5;13:*.tiff=38;5;13:*.png=38;5;13:*.svg=38;5;13:*.svgz=38;5;13:*.mng=38;5;13:*.pcx=38;5;13:*.mov=38;5;13:*.mpg=38;5;13:*.mpeg=38;5;13:*.m2v=38;5;13:*.mkv=38;5;13:*.webm=38;5;13:*.ogm=38;5;13:*.mp4=38;5;13:*.m4v=38;5;13:*.mp4v=38;5;13:*.vob=38;5;13:*.qt=38;5;13:*.nuv=38;5;13:*.wmv=38;5;13:*.asf=38;5;13:*.rm=38;5;13:*.rmvb=38;5;13:*.flc=38;5;13:*.avi=38;5;13:*.fli=38;5;13:*.flv=38;5;13:*.gl=38;5;13:*.dl=38;5;13:*.xcf=38;5;13:*.xwd=38;5;13:*.yuv=38;5;13:*.cgm=38;5;13:*.emf=38;5;13:*.axv=38;5;13:*.anx=38;5;13:*.ogv=38;5;13:*.ogx=38;5;13:*.aac=38;5;45:*.au=38;5;45:*.flac=38;5;45:*.mid=38;5;45:*.midi=38;5;45:*.mka=38;5;45:*.mp3=38;5;45:*.mpc=38;5;45:*.ogg=38;5;45:*.ra=38;5;45:*.wav=38;5;45:*.axa=38;5;45:*.oga=38;5;45:*.spx=38;5;45:*.xspf=38;5;45:
SUDO_USER=qisheng.li
SUDO_UID=1024
USERNAME=tomcat
PATH=/usr/local/jdk/default/bin:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:/home/tomcat/.local/bin:/home/tomcat/bin
MAIL=/var/spool/mail/tomcat
PWD=/home/tomcat
JAVA_HOME=/usr/local/jdk/default
LANG=en_US.UTF-8
HISTCONTROL=ignoredups
SHLVL=1
SUDO_COMMAND=/bin/bash -c env
HOME=/home/tomcat
LOGNAME=tomcat
CLASSPATH=.:/usr/local/jdk/default/lib/dt.jar:/usr/local/jdk/default/lib/tools.jar
LESSOPEN=||/usr/bin/lesspipe.sh %s
SUDO_GID=1024
_=/bin/env
```

可以看到`PATH`中包含了`/usr/local/jdk/default/bin`，这个是jdk的`bin`目录，所以`jstack`命令可以找到

```bash
[qisheng.li@yd_app_api_02 ~]$ sudo  -u tomcat env
HOSTNAME=yd_app_api_02
TERM=xterm-256color
HISTSIZE=1000
LS_COLORS=rs=0:di=38;5;27:ln=38;5;51:mh=44;38;5;15:pi=40;38;5;11:so=38;5;13:do=38;5;5:bd=48;5;232;38;5;11:cd=48;5;232;38;5;3:or=48;5;232;38;5;9:mi=05;48;5;232;38;5;15:su=48;5;196;38;5;15:sg=48;5;11;38;5;16:ca=48;5;196;38;5;226:tw=48;5;10;38;5;16:ow=48;5;10;38;5;21:st=48;5;21;38;5;15:ex=38;5;34:*.tar=38;5;9:*.tgz=38;5;9:*.arc=38;5;9:*.arj=38;5;9:*.taz=38;5;9:*.lha=38;5;9:*.lz4=38;5;9:*.lzh=38;5;9:*.lzma=38;5;9:*.tlz=38;5;9:*.txz=38;5;9:*.tzo=38;5;9:*.t7z=38;5;9:*.zip=38;5;9:*.z=38;5;9:*.Z=38;5;9:*.dz=38;5;9:*.gz=38;5;9:*.lrz=38;5;9:*.lz=38;5;9:*.lzo=38;5;9:*.xz=38;5;9:*.bz2=38;5;9:*.bz=38;5;9:*.tbz=38;5;9:*.tbz2=38;5;9:*.tz=38;5;9:*.deb=38;5;9:*.rpm=38;5;9:*.jar=38;5;9:*.war=38;5;9:*.ear=38;5;9:*.sar=38;5;9:*.rar=38;5;9:*.alz=38;5;9:*.ace=38;5;9:*.zoo=38;5;9:*.cpio=38;5;9:*.7z=38;5;9:*.rz=38;5;9:*.cab=38;5;9:*.jpg=38;5;13:*.jpeg=38;5;13:*.gif=38;5;13:*.bmp=38;5;13:*.pbm=38;5;13:*.pgm=38;5;13:*.ppm=38;5;13:*.tga=38;5;13:*.xbm=38;5;13:*.xpm=38;5;13:*.tif=38;5;13:*.tiff=38;5;13:*.png=38;5;13:*.svg=38;5;13:*.svgz=38;5;13:*.mng=38;5;13:*.pcx=38;5;13:*.mov=38;5;13:*.mpg=38;5;13:*.mpeg=38;5;13:*.m2v=38;5;13:*.mkv=38;5;13:*.webm=38;5;13:*.ogm=38;5;13:*.mp4=38;5;13:*.m4v=38;5;13:*.mp4v=38;5;13:*.vob=38;5;13:*.qt=38;5;13:*.nuv=38;5;13:*.wmv=38;5;13:*.asf=38;5;13:*.rm=38;5;13:*.rmvb=38;5;13:*.flc=38;5;13:*.avi=38;5;13:*.fli=38;5;13:*.flv=38;5;13:*.gl=38;5;13:*.dl=38;5;13:*.xcf=38;5;13:*.xwd=38;5;13:*.yuv=38;5;13:*.cgm=38;5;13:*.emf=38;5;13:*.axv=38;5;13:*.anx=38;5;13:*.ogv=38;5;13:*.ogx=38;5;13:*.aac=38;5;45:*.au=38;5;45:*.flac=38;5;45:*.mid=38;5;45:*.midi=38;5;45:*.mka=38;5;45:*.mp3=38;5;45:*.mpc=38;5;45:*.ogg=38;5;45:*.ra=38;5;45:*.wav=38;5;45:*.axa=38;5;45:*.oga=38;5;45:*.spx=38;5;45:*.xspf=38;5;45:
MAIL=/var/spool/mail/qisheng.li
LANG=en_US.UTF-8
SHELL=/bin/bash
PATH=/sbin:/bin:/usr/sbin:/usr/bin
LOGNAME=tomcat
USER=tomcat
USERNAME=tomcat
HOME=/home/tomcat
SUDO_COMMAND=/bin/env
SUDO_USER=qisheng.li
SUDO_UID=1024
SUDO_GID=1024
```

没有`-i`的环境变量就没有`JDK`的路径。

看下`sudo`的man：

> -i [command]
> ​                The -i (simulate initial login) option runs the shell specified by the password database entry of the target user as a login shell.  This means that
> ​                login-specific resource files such as .profile or .login will be read by the shell.  If a command is specified, it is passed to the shell for execution
> ​                via the shell's -c option.  If no command is specified, an interactive shell is executed.  sudo attempts to change to that user's home directory before
> ​                running the shell.  The security policy shall initialize the environment to a minimal set of variables, similar to what is present when a user logs in.
> ​                The Command Environment section in the sudoers(5) manual documents how the -i option affects the environment in which a command is run when the sudoers
> ​                policy is in use.

`/etc/profile`的配置确实是全局的配置，但是这个只有在`login shell`的时候才会去`source`，才会生效。

关于集中类型的shell，可以查阅最后的参考链接，这里简单列出下：

{%  asset_img BashStartupFiles1-8918135.png %}

- **login** shell: A login shell logs you into the system as a spiecified user, necessary for this is a username and password. When you hit ctrl+alt+F1 to login into a virtual terminal you get after successful login: a login shell (that is interactive). Sourced files:
  - `/etc/profile` and `~/.profile` for Bourne compatible shells (and `/etc/profile.d/*`)
  - `~/.bash_profile` for bash
  - `/etc/zprofile` and `~/.zprofile` for zsh
  - `/etc/csh.login` and `~/.login` for csh
- **non-login** shell: A shell that is executed without logging in, necessary for this is a current logged in user. When you open a graphic terminal in gnome it is a non-login (interactive) shell. Sourced files:
  - `/etc/bashrc` and `~/.bashrc` for bash
- **interactive** shell: A shell (login or non-login) where you can interactively type or interrupt commands. For example a gnome terminal (non-login) or a virtual terminal (login). In an interactive shell the prompt variable must be set (`$PS1`). Sourced files:
  - `/etc/profile` and `~/.profile`
  - `/etc/bashrc` or `/etc/bash.bashrc` for bash
- **non-interactive** shell: A (sub)shell that is probably run from an automated process you will see neither input nor outputm when the calling process don't handle it. That shell is normally a non-login shell, because the calling user has logged in already. A shell running a script is always a non-interactive shell, but the script can emulate an interactive shell by prompting the user to input values. Sourced files:
  - `/etc/bashrc` or `/etc/bash.bashrc` for bash (but, mostly you see this at the beginning of the script: `[ -z "$PS1" ] && return`. That means don't do anything if it's a non-interactive shell)
  - depending on shell; some of them read the file in the `$ENV` variable

####  用`sudo -i`就好了？

用`sudo -i`的问题是当前目录被更改了

```bash
[qisheng.li@yd_app_api_02 ~]$ sudo -i -u tomcat env | grep PWD --color
PWD=/home/tomcat
```

不注意的话就掉坑里了，明明当前目录有脚本却执行不了。



#### 更好的解决办法

执行sudo命令时，`PATH`之所以会改变，起始是一种安全策略，防止用户的路径污染sudo的路径

```
secure_path   Path used for every command run from sudo.  If you don't
               trust the people running sudo to have a sane PATH environ‐
               ment variable you may want to use this.  Another use is if
               you want to have the “root path” be separate from the “user
               path”.  Users in the group specified by the exempt_group
               option are not affected by secure_path.  This option is not
               set by default.
```

看下我们线上机器的配置：

```bash
[qisheng.li@yd_app_api_02 ~]$ sudo visudo

Defaults    env_reset
Defaults    env_keep =  "COLORS DISPLAY HOSTNAME HISTSIZE INPUTRC KDEDIR LS_COLORS"
Defaults    env_keep += "MAIL PS1 PS2 QTDIR USERNAME LANG LC_ADDRESS LC_CTYPE"
Defaults    env_keep += "LC_COLLATE LC_IDENTIFICATION LC_MEASUREMENT LC_MESSAGES"
Defaults    env_keep += "LC_MONETARY LC_NAME LC_NUMERIC LC_PAPER LC_TELEPHONE"
Defaults    env_keep += "LC_TIME LC_ALL LANGUAGE LINGUAS _XKB_CHARSET XAUTHORITY"

#
# Adding HOME to env_keep may enable a user to run unrestricted
# commands via sudo.
#
# Defaults   env_keep += "HOME"

Defaults    secure_path = /sbin:/bin:/usr/sbin:/usr/bin
```

`secure_path = /sbin:/bin:/usr/sbin:/usr/bin`只设置了这些路径， 和我们在上面看到的输出一致。`JDK`的bin目录没有加入查找路径，所以找不到命令也就不奇怪了。

当然`env_keep`可以保留一些环境变量到sudo命令的环境中，但是无法保留`PATH`，做如下修改，就可以不重置环境变量：

```bash
######## 第一处修改，这里取反，表示不重置环境变量
Defaults    !env_reset
Defaults    env_keep =  "COLORS DISPLAY HOSTNAME HISTSIZE INPUTRC KDEDIR LS_COLORS"
Defaults    env_keep += "MAIL PS1 PS2 QTDIR USERNAME LANG LC_ADDRESS LC_CTYPE"
Defaults    env_keep += "LC_COLLATE LC_IDENTIFICATION LC_MEASUREMENT LC_MESSAGES"
Defaults    env_keep += "LC_MONETARY LC_NAME LC_NUMERIC LC_PAPER LC_TELEPHONE"
Defaults    env_keep += "LC_TIME LC_ALL LANGUAGE LINGUAS _XKB_CHARSET XAUTHORITY"

#
# Adding HOME to env_keep may enable a user to run unrestricted
# commands via sudo.
#
# Defaults   env_keep += "HOME"

######## 第二处修改
#Defaults    secure_path = /sbin:/bin:/usr/sbin:/usr/bin
```

修改之后我们看看对应的环境变量：

```bash
[qisheng.li@yd_app_api_01 ~]$ sudo -u tomcat env
XDG_SESSION_ID=111674
HOSTNAME=yd_app_api_01
TERM=xterm-256color
SHELL=/bin/bash
HISTSIZE=1000
SSH_CLIENT=47.97.217.12 35698 22
SSH_TTY=/dev/pts/5
USER=tomcat
LS_COLORS=rs=0:di=38;5;27:ln=38;5;51:mh=44;38;5;15:pi=40;38;5;11:so=38;5;13:do=38;5;5:bd=48;5;232;38;5;11:cd=48;5;232;38;5;3:or=48;5;232;38;5;9:mi=05;48;5;232;38;5;15:su=48;5;196;38;5;15:sg=48;5;11;38;5;16:ca=48;5;196;38;5;226:tw=48;5;10;38;5;16:ow=48;5;10;38;5;21:st=48;5;21;38;5;15:ex=38;5;34:*.tar=38;5;9:*.tgz=38;5;9:*.arc=38;5;9:*.arj=38;5;9:*.taz=38;5;9:*.lha=38;5;9:*.lz4=38;5;9:*.lzh=38;5;9:*.lzma=38;5;9:*.tlz=38;5;9:*.txz=38;5;9:*.tzo=38;5;9:*.t7z=38;5;9:*.zip=38;5;9:*.z=38;5;9:*.Z=38;5;9:*.dz=38;5;9:*.gz=38;5;9:*.lrz=38;5;9:*.lz=38;5;9:*.lzo=38;5;9:*.xz=38;5;9:*.bz2=38;5;9:*.bz=38;5;9:*.tbz=38;5;9:*.tbz2=38;5;9:*.tz=38;5;9:*.deb=38;5;9:*.rpm=38;5;9:*.jar=38;5;9:*.war=38;5;9:*.ear=38;5;9:*.sar=38;5;9:*.rar=38;5;9:*.alz=38;5;9:*.ace=38;5;9:*.zoo=38;5;9:*.cpio=38;5;9:*.7z=38;5;9:*.rz=38;5;9:*.cab=38;5;9:*.jpg=38;5;13:*.jpeg=38;5;13:*.gif=38;5;13:*.bmp=38;5;13:*.pbm=38;5;13:*.pgm=38;5;13:*.ppm=38;5;13:*.tga=38;5;13:*.xbm=38;5;13:*.xpm=38;5;13:*.tif=38;5;13:*.tiff=38;5;13:*.png=38;5;13:*.svg=38;5;13:*.svgz=38;5;13:*.mng=38;5;13:*.pcx=38;5;13:*.mov=38;5;13:*.mpg=38;5;13:*.mpeg=38;5;13:*.m2v=38;5;13:*.mkv=38;5;13:*.webm=38;5;13:*.ogm=38;5;13:*.mp4=38;5;13:*.m4v=38;5;13:*.mp4v=38;5;13:*.vob=38;5;13:*.qt=38;5;13:*.nuv=38;5;13:*.wmv=38;5;13:*.asf=38;5;13:*.rm=38;5;13:*.rmvb=38;5;13:*.flc=38;5;13:*.avi=38;5;13:*.fli=38;5;13:*.flv=38;5;13:*.gl=38;5;13:*.dl=38;5;13:*.xcf=38;5;13:*.xwd=38;5;13:*.yuv=38;5;13:*.cgm=38;5;13:*.emf=38;5;13:*.axv=38;5;13:*.anx=38;5;13:*.ogv=38;5;13:*.ogx=38;5;13:*.aac=38;5;45:*.au=38;5;45:*.flac=38;5;45:*.mid=38;5;45:*.midi=38;5;45:*.mka=38;5;45:*.mp3=38;5;45:*.mpc=38;5;45:*.ogg=38;5;45:*.ra=38;5;45:*.wav=38;5;45:*.axa=38;5;45:*.oga=38;5;45:*.spx=38;5;45:*.xspf=38;5;45:
MAIL=/var/spool/mail/qisheng.li
PATH=/usr/local/jdk/default/bin:/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/home/qisheng.li/.local/bin:/home/qisheng.li/bin
PWD=/home/qisheng.li
JAVA_HOME=/usr/local/jdk/default
LANG=en_US.UTF-8
HISTCONTROL=ignoredups
SHLVL=1
HOME=/home/tomcat
LOGNAME=tomcat
CLASSPATH=.:/usr/local/jdk/default/lib/dt.jar:/usr/local/jdk/default/lib/tools.jar
SSH_CONNECTION=47.97.217.12 35698 192.168.2.11 22
LESSOPEN=||/usr/bin/lesspipe.sh %s
XDG_RUNTIME_DIR=/run/user/1025
_=/usr/bin/sudo
USERNAME=tomcat
SUDO_COMMAND=/usr/bin/env
SUDO_USER=qisheng.li
SUDO_UID=1025
SUDO_GID=1025
```

可以看到`JAVA_HOME`和`PATH`都有了，这个和`qisheng.li`的环境变量是一致的，限于篇幅，这里就不贴出来了。

# 参考

1. [ssh连接远程主机执行脚本的环境变量问题](http://feihu.me/blog/2014/env-problem-when-ssh-executing-command-on-remote/)
2. [bash - login/non-login and interactive/non-interactive shells - Unix & Linux Stack Exchange](https://unix.stackexchange.com/questions/170493/login-non-login-and-interactive-non-interactive-shells)
3. [shell - How does lookup in $PATH work under the hood? - Unix & Linux Stack Exchange](https://unix.stackexchange.com/questions/332948/how-does-lookup-in-path-work-under-the-hood)
4. [linux - How to set path for sudo commands - Super User](https://superuser.com/questions/927512/how-to-set-path-for-sudo-commands)
5. http://perlchina.github.io/advent.perlchina.org/2009/SSHBatch.html)

