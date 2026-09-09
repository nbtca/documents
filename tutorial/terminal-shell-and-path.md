---
order: 9
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 终端、shell 与 PATH

本文讲 shell 的工作机制：终端模拟器与 shell 的分工、命令查找顺序、启动文件的读取时机、环境变量的继承、引号与展开规则。启动文件与展开规则以 zsh 为准，bash 与 fish 机制相近但文件名与语法不同，以各自手册为准。文中结论均链到 zsh 官方手册或对应规范。

## 三个不同的东西

- **终端模拟器**：绘制字符、接收键盘输入的窗口程序，本身不执行命令；
- **shell**：解析并执行你输入那一行的解释器，如 zsh、bash、fish、PowerShell；
- **命令**：`git`、`curl` 等独立可执行文件，或由 shell 自身实现的内建命令。

换终端模拟器不影响配置，换 shell 才需要改配置。

macOS 的默认 shell 是 zsh，[Apple 的说明](https://support.apple.com/en-us/102360)是“Starting with macOS 10.15, your Mac uses zsh as the default login shell and interactive shell”。Windows 上对应 PowerShell，终端模拟器为 Windows Terminal，操作见[基础操作系统的使用技术](/tutorial/manual/os-skills)。

## 命令查找顺序

shell 先判断是否为内建命令或函数，否则按 `PATH` 中的目录从左到右查找，取第一个命中的。这套查找次序由 [POSIX 的 Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) 规定。

```bash
echo $PATH
command -v git      # 实际会执行的那一个
type -a git         # 列出所有命中，按优先级排列
```

`type -a` 列出多行时，说明 `PATH` 中存在多个同名程序，靠前者生效——这是装了新版本而版本号不变的原因，解决办法是调整 `PATH` 顺序。

zsh 会把查找结果缓存进哈希表，装入新命令后 shell 仍指向旧路径时，用 [`rehash`](https://zsh.sourceforge.io/Doc/Release/Shell-Builtin-Commands.html) 清除。

## 启动文件的读取顺序

[zsh 手册的 Startup/Shutdown Files](https://zsh.sourceforge.io/Doc/Release/Files.html#Startup_002fShutdown-Files) 定义的顺序：

1. `/etc/zshenv`，总是读取，手册明确写着 this cannot be overridden；
2. `~/.zshenv`，总是读取；
3. login shell：`/etc/zprofile`，然后 `~/.zprofile`；
4. interactive shell：`/etc/zshrc`，然后 `~/.zshrc`；
5. login shell：`/etc/zlogin`，然后 `~/.zlogin`。

两处容易搞错：login 与 interactive 是两个独立属性，可同时成立、只成立其一或都不成立；`.zlogin` 排在 `.zshrc` 之后，不是之前。

| 场景                 | login | interactive | 读取         |
| -------------------- | ----- | ----------- | ------------ |
| 图形界面新开终端窗口 | 是    | 是          | 全部五步     |
| `ssh` 登录           | 是    | 是          | 全部五步     |
| `zsh script.zsh`     | 否    | 否          | 仅 `.zshenv` |
| `zsh -c '...'`       | 否    | 否          | 仅 `.zshenv` |

包管理器的初始化写进 `.zprofile`，交互时才用的别名、函数、提示符写进 `.zshrc`。放错文件的症状是 source 一次就正常、新开窗口又失效，或者脚本里找不到该命令。

同一节还说明，路径中的 `~` 实为 `$ZDOTDIR`，未设置时才回退到 `$HOME`。

修改后开新窗口，或手动加载：

```bash
source ~/.zshrc
```

## 环境变量与继承

shell 变量默认只属于当前 shell，`export` 将其变为环境变量，此后启动的子进程获得一份副本。

```bash
FOO=bar          # 仅当前 shell 可见
export FOO=bar   # 此后启动的程序可见
env | grep FOO   # 查看当前进程环境
```

由此：子进程拿到的是副本，它的修改不影响父进程；`export` 对已在运行的程序无效；关闭窗口后变量消失。代理环境变量的行为即源于此，见[计算机网络与代理](/tutorial/computer-networking-and-proxies#代理相关的环境变量)。

## 路径

绝对路径从 `/` 开始，含义不随当前目录变化；相对路径相对于当前目录，`pwd` 查看当前位置；`~` 是家目录，`.` 是当前目录，`..` 是上一层。

路径含空格时须加引号，否则会被拆成两个词：

```bash
cd "My Documents"
```

## 引号与展开

[zsh 手册的 Expansion 一章](https://zsh.sourceforge.io/Doc/Release/Expansion.html)列出了 shell 在执行前对命令行做的各类展开。落到日常，同一字符串在三种写法下的处理不同：

| 写法      | 变量展开 | 通配符展开 | 按空格拆词 |
| --------- | -------- | ---------- | ---------- |
| `$file`   | 会       | 会         | 会         |
| `"$file"` | 会       | 不会       | 不会       |
| `'$file'` | 不会     | 不会       | 不会       |

若 `file` 的值为 `my notes.md`，`rm $file` 会拆成两个参数，删掉 `my` 和 `notes.md`；`rm "$file"` 才是预期行为。变量默认加双引号。

## 退出码、管道与重定向

命令结束时留下退出码，`0` 为成功，非 `0` 为失败。

```bash
curl -fsS https://example.com > /dev/null
echo $?          # 上一条命令的退出码

cmd1 && cmd2     # cmd1 成功才执行 cmd2
cmd1 || cmd2     # cmd1 失败才执行 cmd2
cmd1 | cmd2      # cmd1 的输出接入 cmd2 的输入
cmd > file       # 覆盖写入
cmd >> file      # 追加
cmd 2> file      # 只重定向错误输出
```

## 常用命令

| 命令            | 作用                              |
| --------------- | --------------------------------- |
| `pwd`           | 当前目录                          |
| `ls` / `ls -la` | 列出目录内容 / 含隐藏文件与详情   |
| `cd`            | 切换目录                          |
| `mkdir -p`      | 创建目录，`-p` 一并创建缺失的上层 |
| `touch`         | 创建空文件                        |
| `cp` / `mv`     | 复制 / 移动或重命名               |
| `rm` / `rm -r`  | 删除文件 / 递归删除目录           |
| `cat` / `less`  | 打印文件 / 分页查看               |
| `grep`          | 在文本中查找                      |
| `open .`        | macOS 用访达打开当前目录          |

这些命令的行为以 [POSIX 的 Shell & Utilities](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/contents.html) 为准，各系统的实现会有扩展。`rm` 不进回收站，执行前先用 `ls` 确认路径，`rm -r` 后的变量务必加引号。

## 按需开关代理

把代理变量写死进启动文件，代理未运行时所有联网命令都会失败。改用两个函数：

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

`PORT` 换成本机代理实际监听的端口。写进 `.zshrc` 而非 `.zprofile`，因为这是交互时才用的。`proxyoff` 大小写两种都 `unset`，原因见[计算机网络与代理](/tutorial/computer-networking-and-proxies#代理相关的环境变量)。

## 延伸阅读

- [zsh 手册](https://zsh.sourceforge.io/Doc/Release/index.html)——上面引用的 Files、Expansion 两章都在这里
- [POSIX.1-2024 Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)——各 shell 共同遵循的底线行为
- [GNU Bash 手册](https://www.gnu.org/software/bash/manual/bash.html)——用 bash 的话对照这份
