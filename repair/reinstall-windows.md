---
maintainers:
  - user: OrangeLee03
    since: 2022-03
---

# 重新安装 Windows

完整的装机步骤，包括版本选择、镜像校验、分区和驱动，见[从零开始安装 Windows](/tutorial/manual/windows-from-scratch)。本页只列出维修现场最常用的两种方法。

::: warning 注意
重装系统前，必须备份机主的数据。重装会清除系统分区上的所有数据。
:::

## 下载 Windows 镜像

- [Windows 10](https://www.microsoft.com/zh-cn/software-download/windows10)
- [Windows 11](https://www.microsoft.com/zh-cn/software-download/windows11)

## 方法一：用 Windows 安装 U 盘

1. 在另一台电脑上运行微软的媒体创建工具（Media Creation Tool）。
2. 选择“为另一台电脑创建安装介质”。
3. 选择“U 盘”，把安装程序写入 U 盘。
4. 把 U 盘插入要重装的电脑。
5. 重启电脑，进入启动菜单或 BIOS（按键见 [BIOS 与一键恢复入口](/repair/bios-keys)）。
6. 选择从 U 盘启动。
7. 按安装程序的提示安装。要求输入产品密钥时，选择“我没有产品密钥”。

## 方法二：用 PE 系统 U 盘

1. 在 U 盘上安装 PE 系统。
2. 运行媒体创建工具，选择“ISO 文件”，下载 ISO 文件。
3. 把 ISO 文件复制到这个 U 盘。
4. 把 U 盘插入要重装的电脑。
5. 重启电脑，进入启动菜单或 BIOS。
6. 选择从 U 盘启动，进入 PE 系统。
7. 在 PE 系统中打开 ISO 文件，运行其中的 `setup.exe`。
8. 按安装程序的提示安装。

## 跳过 Windows 11 的联网要求

::: info 注
较新的 Windows 11 镜像已经开始移除 `bypassnro` 命令。如果系统提示命令不存在，查找当前版本可用的其他方法。部分机型重装后没有网卡驱动，所以不能联网。
:::

1. 在要求联网的界面，按 `Shift + F10` 打开命令提示符。
2. 输入下面的命令，按 Enter：

   ```cmd
   oobe\bypassnro
   ```

3. 电脑重启后，在联网界面选择“我没有 Internet 连接”。

[视频教程](https://www.bilibili.com/video/BV1Vd4y1C7dR)
