---
order: 10
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 终端、shell 与 PATH

弄清你敲下一行命令之后，shell 到底做了哪几件事。

## 概览

“终端命令”这个说法把三样东西混在了一起。

- **终端模拟器**是那个窗口程序，负责画字符、收键盘。它不执行任何命令。macOS 上是 Terminal 或 iTerm，Windows 上是 Windows Terminal，Linux 上各桌面环境自带一个。
- **shell** 是读你那一行输入、解析并派活的解释器。zsh、bash、fish、PowerShell 都是 shell。
- **命令**是 `git`、`curl` 这些独立的可执行文件，或者由 shell 自己实现的内建命令。

换终端模拟器，你的配置一行都不用改。换 shell 才需要改。

macOS 的默认 shell 是 zsh，[Apple 的说明](https://support.apple.com/en-us/102360)是“Starting with macOS 10.15, your Mac uses zsh as the default login shell and interactive shell”。多数 Linux 发行版默认 bash。Windows 上是 PowerShell。

先确认你在用哪个：

::: code-group

```bash [macOS / Linux]
echo $SHELL
```

```powershell [Windows]
$PSVersionTable.PSVersion
```

:::

Windows 上还要分清两代。系统自带的是 **Windows PowerShell 5.1**，版本号以 `5.1` 开头；另外单独安装的 **PowerShell 7** 以 `7.` 开头。两者在若干处行为不同，下面会分别标出。

## shell 怎么找到一个命令

你敲 `git`，shell 并不是直接去磁盘上找。它按一个固定的优先级依次查，用第一个命中的。

**zsh 与 bash** 先看是不是内建命令或函数，不是的话按 `PATH` 里的目录从左到右查找。这套次序由 POSIX 的 [Command Search and Execution](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html#tag_19_09_01_04) 规定。

**PowerShell** 的顺序不一样。[官方文档](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_command_precedence)写明是：

> Alias → Function → Cmdlet → External executable files

别名排在最前面。这解释了为什么在 Windows PowerShell 5.1 里敲 `curl` 跑的不是 curl，而是 `Invoke-WebRequest` 的别名，参数完全对不上。相关细节见[计算机网络与代理](/tutorial/computer-networking-and-proxies#powershell-用户要多注意两点)。

查一个名字实际会跑什么：

::: code-group

```bash [macOS / Linux]
command -v git      # 实际会执行的那一个
type -a git         # 列出所有命中，按优先级排列
echo $PATH
```

```powershell [Windows]
Get-Command git                 # 实际会执行的那一个
Get-Command git -All            # 列出所有命中，按优先级排列
Get-Alias curl -ErrorAction SilentlyContinue   # 这个名字是不是别名
$env:PATH -split [IO.Path]::PathSeparator
```

:::

`PATH` 里的目录用什么分隔，两边不同：macOS 与 Linux 用冒号，Windows 用分号。上面那条 PowerShell 命令用 `[IO.Path]::PathSeparator` 取当前平台的分隔符，不用你记。

## 装了新版本却没生效

`type -a` 或 `Get-Command -All` 列出多行，说明 `PATH` 里有多个同名程序，排在前面的赢。一台装过 Homebrew 的 Mac 上，输出可能是这样：

```text
Application  git  /opt/homebrew/bin/git
Application  git  /usr/bin/git
```

Homebrew 装的那个排在系统自带的前面，`git --version` 报的就是它的版本。要换成另一个，你调整 `PATH` 的顺序，而不是反复重装。

zsh 还会把查找结果缓存进一张哈希表。你装了新命令而 shell 仍指向旧路径时，用 [`rehash`](https://zsh.sourceforge.io/Doc/Release/Shell-Builtin-Commands.html) 清掉这份缓存。

## 配置写了却不生效

原因几乎总是同一个：你把配置写进了这次没有被读到的那个文件。三种 shell 读哪些文件、什么时候读，规则差别很大。

### zsh

[zsh 手册](https://zsh.sourceforge.io/Doc/Release/Files.html#Startup_002fShutdown-Files)定义的顺序是**全部依次读**，不是选一个：

1. `/etc/zshenv`，总是读，手册写明 this cannot be overridden；
2. `~/.zshenv`，总是读；
3. 是 login shell 时：`/etc/zprofile`，然后 `~/.zprofile`；
4. 是 interactive shell 时：`/etc/zshrc`，然后 `~/.zshrc`；
5. 是 login shell 时：`/etc/zlogin`，然后 `~/.zlogin`。

两处容易搞错。login 和 interactive 是两个独立属性，可以同时成立、只成立一个、或者都不成立。`.zlogin` 排在 `.zshrc` **之后**，名字看着像最先执行，实际最后。

手册还说明，上面的 `~` 实为 `$ZDOTDIR`，你没设置它时才回退到 `$HOME`。

### bash

[GNU Bash 手册](https://www.gnu.org/software/bash/manual/bash.html#Bash-Startup-Files)的规则和 zsh 不同，是**三选一**：

作为 interactive login shell 启动时，先读 `/etc/profile`，然后在 `~/.bash_profile`、`~/.bash_login`、`~/.profile` 三者中读**第一个存在且可读的**，读到就不再看后面两个。

作为 interactive 非 login shell 启动时，只读 `~/.bashrc`。

这就是为什么手册建议你在 `~/.bash_profile` 里写上这一行：

```bash
if [ -f ~/.bashrc ]; then . ~/.bashrc; fi
```

否则你写在 `.bashrc` 里的东西，在 login shell 里不会被读到。

### PowerShell

PowerShell 有[四个 profile 文件](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles)，按作用范围区分。看你这台机器上它们各自在哪：

```powershell
$PROFILE | Get-Member -MemberType NoteProperty | ForEach-Object { $_.Name; $PROFILE.($_.Name) }
```

日常改的是 `CurrentUserCurrentHost`，也就是 `$PROFILE` 本身指向的那个。文件默认不存在，你需要先建：

```powershell
if (-not (Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force }
notepad $PROFILE
```

### 三者对照

| 场景             | zsh          | bash                      | PowerShell   |
| ---------------- | ------------ | ------------------------- | ------------ |
| 图形界面新开窗口 | 全部五步     | 三选一 + `.bashrc`        | `$PROFILE`   |
| `ssh` 登录       | 全部五步     | 三选一                    | `$PROFILE`   |
| 跑一个脚本       | 仅 `.zshenv` | 仅 `$BASH_ENV` 指向的文件 | 不读 profile |

放错文件的典型症状：手动 `source` 一次就正常、新开窗口又失效，或者反过来，脚本里找不到某个命令。

改完之后开一个新窗口，或者手动加载一次：

::: code-group

```bash [macOS / Linux]
source ~/.zshrc     # bash 换成 ~/.bashrc
```

```powershell [Windows]
. $PROFILE
```

:::

## 环境变量为什么只对新开的程序生效

shell 里的变量默认只属于当前 shell。你把它变成[环境变量](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap08.html#tag_08_01)之后，此后启动的子进程会拿到一份副本。

::: code-group

```bash [macOS / Linux]
FOO=bar          # 仅当前 shell 可见
export FOO=bar   # 此后启动的程序可见
env | grep FOO
```

```powershell [Windows]
$FOO = "bar"          # 仅当前 PowerShell 可见
$env:FOO = "bar"      # 此后启动的程序可见
Get-ChildItem Env:FOO
```

:::

三个结果由此而来：子进程拿到的是副本，它改了不影响你；你现在设置，对**已经在运行**的程序没有任何影响；关掉窗口，这些变量就没了。

代理环境变量的行为就是这条规则的直接后果，见[计算机网络与代理](/tutorial/computer-networking-and-proxies#为什么浏览器能通而终端不通)。

## 引号决定 shell 会不会动你的字符串

命令行在执行前会被展开。zsh 的展开种类见[手册的 Expansion 一章](https://zsh.sourceforge.io/Doc/Release/Expansion.html)，对应 POSIX 的 [Word Expansions](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html#tag_19_06)；其中[引号](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html#tag_19_02)决定哪些字符失去特殊含义，[字段拆分](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html#tag_19_06_05)决定展开结果按什么拆成多个参数，[模式匹配](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html#tag_19_14)定义 `*` `?` `[...]` 的含义。

在 zsh 与 bash 里，同一个字符串三种写法的处理不同：

| 写法      | 变量展开 | 通配符展开 | 按空格拆词 |
| --------- | -------- | ---------- | ---------- |
| `$file`   | 会       | 会         | 会         |
| `"$file"` | 会       | 不会       | 不会       |
| `'$file'` | 不会     | 不会       | 不会       |

假设 `file` 的值是 `my notes.md`，那么 `rm $file` 会被拆成两个参数，删掉 `my` 和 `notes.md` 两样东西。`rm "$file"` 才是你想要的。**给变量加双引号，当成默认习惯。**

PowerShell 的规则不同，见 [about_quoting_rules](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules)：双引号内变量会展开，单引号内不会，但 PowerShell **不做按空格拆词**，所以上面那个删错文件的问题在 PowerShell 里不会发生。

## Windows 上脚本跑不起来

Windows 默认不允许运行 PowerShell 脚本，你会看到一句包含 `cannot be loaded because running scripts is disabled` 的报错。这是[执行策略](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies)在起作用，不是你装错了东西。

```powershell
Get-ExecutionPolicy -List                                  # 先看当前设置
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

`RemoteSigned` 允许你本地写的脚本运行，从网上下载的则要求带签名。`-Scope CurrentUser` 只改你自己的账户，不需要管理员权限。

## 退出码、管道与重定向

命令结束时留下[退出码](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html#tag_19_08_02)，`0` 表示成功，非 `0` 表示失败。[管道](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html#tag_19_09_02)与[重定向](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html#tag_19_07)的语法同样由 POSIX 规定。

::: code-group

```bash [macOS / Linux]
echo $?          # 上一条命令的退出码
cmd1 && cmd2     # cmd1 成功才执行 cmd2
cmd1 || cmd2     # cmd1 失败才执行 cmd2
cmd1 | cmd2      # cmd1 的输出接入 cmd2 的输入
cmd > file       # 覆盖写入
cmd >> file      # 追加
cmd 2> file      # 只重定向错误输出
```

```powershell [Windows]
$LASTEXITCODE    # 上一个外部程序的退出码
$?               # 上一条命令是否成功，布尔值
cmd1 -and cmd2   # 条件用 -and / -or，不是 && / ||（PowerShell 7 起也支持 && ||）
cmd1 | cmd2      # 管道传的是对象，不是文本
cmd > file       # 覆盖写入
cmd >> file      # 追加
cmd 2> file      # 只重定向错误输出
```

:::

PowerShell 的管道传递的是**对象**而不是文本流，这是它与 zsh、bash 最根本的差别。`Get-Process | Where-Object CPU -gt 100` 里传过去的是进程对象，不是一段需要再解析的文字。

## 按需开关代理

把代理变量写死进启动文件，代理没运行时你所有的联网命令都会失败。定义两个开关，需要时才打开：

::: code-group

```bash [macOS / Linux]
# 写进 ~/.zshrc 或 ~/.bashrc
proxyon() {
  export all_proxy=socks5h://127.0.0.1:PORT
  export http_proxy=$all_proxy
  export https_proxy=$all_proxy
}

proxyoff() {
  unset all_proxy http_proxy https_proxy ALL_PROXY HTTP_PROXY HTTPS_PROXY
}
```

```powershell [Windows]
# 写进 $PROFILE
function proxyon {
  $env:http_proxy  = "http://127.0.0.1:PORT"
  $env:https_proxy = $env:http_proxy
}

function proxyoff {
  Remove-Item Env:http_proxy, Env:https_proxy -ErrorAction SilentlyContinue
}
```

:::

把 `PORT` 换成你本机代理实际监听的端口。写进交互时才读的那个文件（`.zshrc` / `.bashrc` / `$PROFILE`），不要写进 `.zprofile`。`proxyoff` 里把大小写两种都清掉，原因见[计算机网络与代理](/tutorial/computer-networking-and-proxies#同一个变量-不同程序读法不同)。

## 常用命令对照

| 做什么                   | macOS / Linux           | Windows                                  |
| ------------------------ | ----------------------- | ---------------------------------------- |
| 当前在哪个目录           | `pwd`                   | `Get-Location`                           |
| 列出目录内容             | `ls` / `ls -la`         | `Get-ChildItem` / `Get-ChildItem -Force` |
| 切换目录                 | `cd`                    | `Set-Location`                           |
| 创建目录                 | `mkdir -p`              | `New-Item -ItemType Directory -Force`    |
| 创建空文件               | `touch`                 | `New-Item -ItemType File`                |
| 复制                     | `cp`                    | `Copy-Item`                              |
| 移动或重命名             | `mv`                    | `Move-Item`                              |
| 删除                     | `rm` / `rm -r`          | `Remove-Item` / `Remove-Item -Recurse`   |
| 打印文件                 | `cat`                   | `Get-Content`                            |
| 在文本中查找             | `grep`                  | `Select-String`                          |
| 用文件管理器打开当前目录 | `open .` / `xdg-open .` | `explorer .`                             |

PowerShell 为其中多数命令预设了 `ls`、`cd`、`cat` 这类别名，你按 Unix 习惯敲通常也能用。别名的具体指向仍以 `Get-Alias` 为准。

删除操作不进回收站。执行前先用列目录的命令确认路径，删目录时尤其如此。

## 延伸阅读

- [zsh 手册](https://zsh.sourceforge.io/Doc/Release/index.html)
- [GNU Bash 手册](https://www.gnu.org/software/bash/manual/bash.html)
- [PowerShell 文档](https://learn.microsoft.com/en-us/powershell/)
- [POSIX.1-2024 Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)，三种 shell 共同的底线行为
