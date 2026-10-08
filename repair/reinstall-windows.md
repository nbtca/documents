---
maintainers:
  - user: OrangeLee03
    since: 2022-03
---

# 重新安装 Windows

更完整的从零装机流程，见教程栏的[从零开始安装 Windows](/tutorial/manual/windows-from-scratch)。

## Windows 镜像下载

- [Win10](https://www.microsoft.com/zh-cn/software-download/windows10)
- [Win11](https://www.microsoft.com/zh-cn/software-download/windows11)

下载后打开文件，并选择对其他电脑安装，有两种方法：

1. 直接安装到 U 盘，重启后进入启动菜单或 BIOS，选择 U 盘启动进行安装（选择“我没有密钥”）。
2. U 盘安装 PE 系统，并存 Windows 安装镜像：创建 ISO 文件，完成后将其移动到 U 盘，重启后进入启动菜单或 BIOS，选择 U 盘启动，进入 PE 操作系统，找到 Windows 安装镜像位置并打开 setup 进行安装。

## Windows 11 跳过联网激活步骤

调出 cmd 界面（Shift+F10），输入：

```cmd
oobe\bypassnro
```

[视频教程](https://www.bilibili.com/video/BV1Vd4y1C7dR)（部分机型重装后无网卡驱动，无法联网）。

> 注：较新的 Windows 11 镜像已开始移除 `bypassnro` 命令；若提示命令不存在，需查询当前版本可用的替代方法。
