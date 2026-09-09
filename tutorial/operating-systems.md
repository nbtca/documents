---
order: 1
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# 操作系统

弄清今天主流系统的来路，以及它们之间那些至今还在给协作添麻烦的分歧。

## 概览

你在社团里会遇到三种机器：macOS、Windows、某个 Linux 发行版。它们看起来各不相同，但按血缘只分两支。

**Unix 一支**包括 Linux 和 macOS。两者的命令、路径写法、权限模型高度相似，因为它们共同遵循同一套接口规范。

**Windows NT 一支**只有 Windows。它独立发展出自己的一整套约定，和上面那支在很多地方不兼容。

本站文档里凡是要分平台写的地方，分歧几乎都能追到这条分界线上。知道这条线在哪，你就不必逐条去记差异。

## Unix 这一支

Unix 由贝尔实验室在 1970 年前后开发。它此后分成学术界的 BSD 和商业界的 System V 两条路线，各自繁衍出一大批系统。

分支太多带来了兼容性问题，于是有了标准。今天这套接口由 [The Open Group](https://www.opengroup.org/membership/forums/platform/unix) 维护，正式名称是 Single UNIX Specification，与 IEEE 的 POSIX 合并为同一份文本，也就是本站多处引用的 [POSIX.1-2024](https://pubs.opengroup.org/onlinepubs/9799919799/)。UNIX 是注册商标，只有通过认证的系统才能这样称呼自己。

### Linux

Linux 是 1991 年由 Linus Torvalds 发起的内核项目，源码在 [kernel.org](https://www.kernel.org/)。严格说 Linux 只是内核，你装到机器上的是**发行版**：内核加上一整套用户空间程序、包管理器和默认配置。

发行版之间的差别主要在包管理器和默认组件，这就是本站命令为什么常要按发行版分开写：

| 发行版系   | 代表                | 包管理器 |
| ---------- | ------------------- | -------- |
| Debian 系  | Debian、Ubuntu      | `apt`    |
| Red Hat 系 | Fedora、RHEL、Rocky | `dnf`    |
| Arch 系    | Arch、Manjaro       | `pacman` |

内核相同，所以 `PATH`、权限、路径写法这些底层规则在各发行版之间是一致的。

### macOS

macOS 的内核与底层系统是 Darwin，Apple 以开源形式发布，[XNU 内核的源码](https://github.com/apple-oss-distributions/xnu)在 GitHub 上。Darwin 融合了 Mach 微内核与 BSD 的用户空间，因此 macOS 的终端行为更接近 BSD 而非 Linux。

这带来一个实际后果：**同名命令在 macOS 和 Linux 上参数未必相同**。`sed`、`date`、`stat` 这几个尤其常见。网上给的命令在 Linux 上能跑而你的 Mac 报错，多半是这个原因，不是你敲错了。

iOS、iPadOS、watchOS 与 macOS 共用 Darwin 基础，这是 Apple 各平台开发工具能大量复用的原因。

## Windows 这一支

早期的 MS-DOS 与建立在其上的 Windows 9x 是一条线，Windows NT 是另起炉灶的一条。今天你用的所有 Windows 都属于 NT 这条线，MS-DOS 那条早已终止。

NT 独立设计了自己的文件系统、路径语法、权限模型和 API，与 Unix 那支不共享祖先。本站里 Windows 命令要单独写，根源在此，不是微软刻意与众不同。

### WSL

[适用于 Linux 的 Windows 子系统](https://learn.microsoft.com/en-us/windows/wsl/about)让你在 Windows 上直接跑一个真正的 Linux 环境。开发场景下它很常用：你在 WSL 里按 Linux 的方式操作，本站所有标着 Linux 的命令都适用。

有一处要留意：WSL 里的文件系统和 Windows 的是两套。跨着边界读写文件会慢，而且会碰上下一节说的换行符与大小写问题。把项目放在 WSL 自己的文件系统里通常更省事。

## 分歧一：路径怎么写

Unix 一支用正斜杠 `/` 分隔路径，从根目录 `/` 开始。

Windows 用反斜杠 `\`，并且路径前面有盘符。[微软的文件命名文档](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)写明反斜杠用于分隔路径各部分，同时列出了一批不能用在文件名里的保留字符：

```text
< > : " / \ | ? *
```

注意 `:` 和 `?` 在这份名单里。Unix 系统允许它们出现在文件名中，所以一个在 Linux 上合法的文件名，同步到 Windows 可能根本创建不出来。

多数程序在 Windows 上也接受正斜杠，写跨平台的脚本时用 `/` 通常更稳妥。

## 分歧二：换行符

文本文件的换行，Unix 一支用一个 `LF` 字符，Windows 传统上用 `CR` 加 `LF` 两个字符。

这件事会实实在在地影响协作：同一个文件，Windows 成员改一行提交上来，Git 可能显示整个文件都变了，因为每一行的结尾都不同。

Git 提供了 `core.autocrlf` 和 `.gitattributes` 来处理，具体做法见 [Git 的理念与模型](/tutorial/git-concepts)。本仓库的处理方式以仓库根目录的配置为准。

## 分歧三：大小写敏不敏感

Unix 一支的文件系统区分大小写，`README.md` 和 `readme.md` 是两个不同的文件。

Windows 默认不区分。微软的文档直接写着：

> Do not assume case sensitivity.

同一份文档补充说，NTFS 本身支持 POSIX 的大小写语义，但这不是默认行为。macOS 的默认文件系统同样不区分大小写，尽管它属于 Unix 一支。

这条最容易在 Git 里出事故。你在 Mac 上把 `Readme.md` 改名为 `readme.md`，Git 可能认为什么都没变；而 Linux 上的 CI 会因为找不到文件而失败。改名要用 `git mv`，不要在访达或资源管理器里直接改。

## 分歧四：权限与可执行

Unix 一支给每个文件记录读、写、执行三类权限，一个文件能不能执行由权限位决定。

Windows 用另一套访问控制机制，一个文件能不能执行主要看扩展名（`.exe`、`.ps1` 等），而不是权限位。

后果之一是脚本的可执行位在跨平台协作中容易丢。Git 会记录这一位，但从 Windows 提交时它未必被正确保留。

另一个后果见[终端、shell 与 PATH](/tutorial/terminal-shell-and-path#windows-上脚本跑不起来)：Windows 默认不允许运行 PowerShell 脚本，那是执行策略在管，与文件权限无关。

## 这些差异在本站文档里的体现

| 你会看到的写法                      | 原因                                 |
| ----------------------------------- | ------------------------------------ |
| 命令分 macOS / Linux / Windows 三栏 | 两支血脉的命令集不同                 |
| Linux 再按 apt / dnf / pacman 分    | 发行版的包管理器不同                 |
| macOS 单列而不与 Linux 合并         | macOS 沿袭 BSD，同名命令参数常有出入 |
| 文件名一律小写、用连字符            | 绕开大小写与保留字符两处分歧         |

## 延伸阅读

- [The Open Group 的 UNIX 页面](https://www.opengroup.org/membership/forums/platform/unix)，UNIX 标准与认证的归口
- [POSIX.1-2024](https://pubs.opengroup.org/onlinepubs/9799919799/)，本站多处引用的接口规范
- [kernel.org](https://www.kernel.org/)，Linux 内核官方站点
- [Apple 开源的 XNU 内核](https://github.com/apple-oss-distributions/xnu)
- [WSL 官方文档](https://learn.microsoft.com/en-us/windows/wsl/about)
- [微软的文件命名规则](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)
