---
order: 9
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 终端、shell 与 PATH

「配置写了却不生效」「装了新版本但版本号还是旧的」——这类问题几乎都不是软件坏了，而是不知道 shell 在什么时候读哪个文件、按什么顺序找命令。这篇把这套机制讲清楚，后面几篇都建立在它上面。

## 三个被混为一谈的东西

「终端命令」这个说法把三样东西糊在了一起：

- **终端模拟器**：负责画字符、收键盘输入的那个窗口程序。它自己不执行任何命令。
- **shell**：读你敲的那一行，做解析、展开，然后把活派出去的解释器。zsh、bash、fish、PowerShell 都是 shell。
- **命令**：`git`、`curl` 这些独立的可执行文件，或者由 shell 自己实现的内建命令。

区分它们有实际价值：换一个终端模拟器，你的配置一行都不用改；换 shell 才需要。

macOS 的默认 shell 是 zsh，Apple 的说明是「Starting with macOS 10.15, your Mac uses zsh as the default login shell and interactive shell」。Windows 上对应的是 PowerShell，常用的终端模拟器是 Windows Terminal，具体操作见[基础操作系统的使用技术](/tutorial/manual/os-skills)。

下面讲的启动文件和展开规则以 zsh 为准。bash 和 fish 的机制类似但文件名与语法不同，以各自手册为准。

## shell 怎么找到一个命令

敲下 `git` 之后，shell 依次做两件事：先看这是不是一个内建命令或函数，不是的话，再按 `PATH` 里列出的目录从左到右查找，**用第一个命中的**。

`PATH` 是一串用冒号分隔的目录：

```bash
echo $PATH
command -v git      # 实际会用到的那一个
type -a git         # 列出所有命中，从先到后
```

`type -a` 是排查「装了新版本却没生效」的关键：如果它列出多行，说明 `PATH` 里有多个同名程序，靠前的那个赢了。解决办法是调整 `PATH` 顺序，而不是反复重装。

zsh 还会把找到的路径缓存进一张哈希表。极少数情况下你装了新命令但 shell 还在用旧路径，`rehash` 可以清掉这份缓存。

## 启动文件：为什么配置有时不生效

zsh 的启动文件读取顺序在手册里有完整定义。按实际发生的先后：

1. `/etc/zshenv`，**总是**读，且无法关闭；
2. `~/.zshenv`，总是读；
3. 如果是 **login shell**：`/etc/zprofile`，然后 `~/.zprofile`；
4. 如果是 **interactive shell**：`/etc/zshrc`，然后 `~/.zshrc`；
5. 如果是 login shell：`/etc/zlogin`，然后 `~/.zlogin`。

有两点最容易搞错：

- login 和 interactive 是**两个独立的属性**，不是二选一。一个 shell 可以两者都是、只是其中之一、或者都不是。
- `.zlogin` 排在 `.zshrc` **之后**。名字看起来像是最早执行的，实际是最晚。

对应到日常场景：

| 场景                          | login | interactive | 实际读到       |
| ----------------------------- | ----- | ----------- | -------------- |
| 图形界面里新开一个终端窗口    | 是    | 是          | 全部五步       |
| `ssh` 登录到一台机器          | 是    | 是          | 全部五步       |
| 执行 `zsh script.zsh`         | 否    | 否          | 只有 `.zshenv` |
| 在别的程序里跑 `zsh -c '...'` | 否    | 否          | 只有 `.zshenv` |

所以：包管理器让你把初始化写进 `.zprofile`，交互时才用的东西（别名、函数、提示符）应该写进 `.zshrc`。放错文件的典型症状是「手动 `source` 一下就正常，新开窗口又不行」，或者反过来「脚本里跑就找不到这个命令」。

改完启动文件之后，要么开一个新窗口，要么手动加载一次：

```bash
source ~/.zshrc
```

## 环境变量与继承

shell 里的变量默认只属于当前 shell。`export` 把它变成**环境变量**，此后启动的子进程才会拿到一份副本。

```bash
FOO=bar          # 只有当前 shell 看得见
export FOO=bar   # 之后启动的程序也看得见
env | grep FOO   # 查看当前进程环境
```

三个直接后果：

- 子进程拿到的是**副本**，它改了不影响你；
- 你现在 `export`，对**已经在运行**的程序没有任何影响；
- 关掉窗口，这些变量就没了。

这正是上一篇里代理环境变量那套行为的来源，参见[计算机网络与代理](/tutorial/computer-networking-and-proxies)。

## 路径

- 绝对路径从 `/` 开始，任何时候含义都一样；
- 相对路径相对于当前目录，`pwd` 查看当前在哪；
- `~` 是家目录，`.` 是当前目录，`..` 是上一层。

路径里有空格时必须加引号，否则 shell 会把它拆成两个词：

```bash
cd "My Documents"
```

## 引号决定 shell 会不会动你的字符串

这是新手踩坑最密集的地方。同一个字符串，三种写法的含义完全不同：

| 写法      | 变量展开 | 通配符展开 | 按空格拆词 |
| --------- | -------- | ---------- | ---------- |
| `$file`   | 会       | 会         | 会         |
| `"$file"` | 会       | 不会       | 不会       |
| `'$file'` | 不会     | 不会       | 不会       |

后果是实打实的：如果 `file` 的值是 `my notes.md`，那么 `rm $file` 会被拆成两个参数，删掉 `my` 和 `notes.md` 两个东西；`rm "$file"` 才是你想要的。**给变量加双引号应该是默认习惯。**

## 退出码、管道与重定向

每个命令结束时都会留下一个退出码，`0` 表示成功，非 `0` 表示失败：

```bash
curl -fsS https://example.com > /dev/null
echo $?          # 上一条命令的退出码

cmd1 && cmd2     # cmd1 成功才执行 cmd2
cmd1 || cmd2     # cmd1 失败才执行 cmd2
cmd1 | cmd2      # 把 cmd1 的输出接到 cmd2 的输入
cmd > file       # 覆盖写入
cmd >> file      # 追加
cmd 2> file      # 只重定向错误输出
```

## 常用命令

| 命令            | 作用                                |
| --------------- | ----------------------------------- |
| `pwd`           | 当前在哪个目录                      |
| `ls` / `ls -la` | 列出目录内容 / 含隐藏文件与详情     |
| `cd`            | 切换目录                            |
| `mkdir -p`      | 创建目录，`-p` 会一并创建缺失的上层 |
| `touch`         | 创建空文件                          |
| `cp` / `mv`     | 复制 / 移动或重命名                 |
| `rm` / `rm -r`  | 删除文件 / 递归删除目录             |
| `cat` / `less`  | 打印文件 / 分页查看                 |
| `grep`          | 在文本里找内容                      |
| `open .`        | macOS 用访达打开当前目录            |

`rm` 不进回收站，删掉就是删掉。养成两个习惯：先 `ls` 确认路径，以及永远不在 `rm -r` 后面用变量而不加引号。

## 把代理开关做成可控的

上一篇提到，把代理变量写死进启动文件的代价是代理没开时所有联网命令都会失败。用两个函数代替，需要时才打开：

```bash
# ~/.zshrc
proxyon() {
  export all_proxy=socks5h://127.0.0.1:PORT
  export http_proxy=$all_proxy
  export https_proxy=$all_proxy
}

proxyoff() {
  unset all_proxy http_proxy https_proxy ALL_PROXY HTTP_PROXY HTTPS_PROXY
}
```

`PORT` 换成你本机代理实际监听的端口。写进 `.zshrc` 而不是 `.zprofile`，因为这是交互时才用的东西。`proxyoff` 里把大小写两种都 `unset`，是因为不同程序读取的变量名大小写规则不一致——这一点的依据见上一篇。

## 参考

- [zsh 手册 — Startup/Shutdown Files](https://zsh.sourceforge.io/Doc/Release/Files.html)
- [zsh 手册 — Expansion](https://zsh.sourceforge.io/Doc/Release/Expansion.html)
- [Apple — Use zsh as the default shell on Mac](https://support.apple.com/en-us/102360)
- [POSIX.1-2024 — Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)
