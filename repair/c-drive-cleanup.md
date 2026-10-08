---
maintainers:
  - user: OrangeLee03
    since: 2022-03
---

# C 盘清理

C 盘之所以总是最先满：Windows 默认把用户资料（桌面、下载、文档）、休眠与虚拟内存文件、更新缓存都放在系统盘，多数软件和微信 / QQ 的聊天记录也默认落在 C 盘。

因此清理按三层递进，**风险由低到高**：先清各类缓存（见效快、无风险），再把数据和软件迁走（治本），实在不够才动分区（有风险，放最后）。

<FigureGrid>
  <Figure src="./assets/ca-lecture-c-drive.webp" alt="讲座投影上写着“分区C满了该咋办”，正解释“盘”指硬盘、而 C 盘只是硬盘上人为划出的一个分区；讲台右侧挂着协会队旗" caption="给同学解释时，先说清硬盘和分区不是一回事。" source="协会照片档案" />
  <Figure src="./assets/ca-lecture-partition.webp" alt="讲座投影上是分区示意图，标题为“如何将分区D（或后面空间）移 50GB 给分区C”" caption="所谓扩容，就是把旁边分区的空间划给 C 盘。" source="协会照片档案" />
</FigureGrid>

这也是 [CA101](/concepts/ca101) 讲座上讲过的题目，给机主解释时可以照这个顺序说。

## 事前确认

- [ ] 已备份重要数据
- [ ] 已关闭正在运行的程序
- [ ] 已确认当前 C 盘可用空间

## 推荐工具

- [Dism++](https://github.com/Chuyu-Team/Dism-Multi-language) —— 系统优化与清理，支持 Windows 更新清理、AppX 清理等
- [WizTree](https://wiztreefree.com/) —— 磁盘空间分析，直观查看文件占用
- [DiskGenius](https://www.diskgenius.com/) —— 分区管理，用于调整分区大小

> 社团内部下载地址详见[软件仓库索引](/repair/tools)，或联系维修部成员。

## 基础清理流程

1. **系统自带工具**
   - 右键 C 盘 → 属性 → 磁盘清理 → 清理系统文件
   - 设置 → 系统 → 存储 → 开启存储感知 或 手动清理临时文件
   - 必须点“清理系统文件”：不点它只能清用户级临时文件，点了才会出现 Windows 更新清理这类系统级大项
2. **Dism++**：以管理员身份运行 → 空间回收 → 勾选项目 → 清理
   - 能安全清掉系统自带工具清不干净的更新备份与组件存储（WinSxS），这两处常年吃掉十几 GB
3. **WizTree**：扫描 C 盘 → 定位大文件 → 确认后清理
   - 它不逐个遍历文件，而是直接读 NTFS 的主文件表（MFT），几秒扫完整个盘。**先分析、后清理**——搞清楚空间被谁占了，比对着猜测瞎删靠谱得多

## 常见清理项目

### 用户数据迁移

- **系统文件夹**（推荐）：桌面/下载/文档文件夹移至 D 盘（右键属性 → 位置 → 移动），兼容性最好
- **已安装程序或其他目录**：使用目录联接（junction），需以管理员身份运行 PowerShell

创建目标文件夹：

```powershell
New-Item -ItemType Directory -Path "D:\Target\Folder" -Force
```

复制文件：

```powershell
robocopy "C:\Source\Folder" "D:\Target\Folder" /E /COPYALL /XJ /R:2 /W:2
```

确认复制完成后，将原文件夹重命名作为备份：

```powershell
Rename-Item "C:\Source\Folder" "Folder_backup"
```

创建目录联接（`mklink` 是 `cmd` 内置命令，须通过 `cmd /c` 调用）：

```powershell
cmd /c mklink /J "C:\Source\Folder" "D:\Target\Folder"
```

检查联接：

```powershell
Get-Item "C:\Source\Folder" | Format-List FullName,LinkType,Target
```

确认一切正常后删除备份：

```powershell
Remove-Item "C:\Source\Folder_backup" -Recurse -Force
```

> 创建联接前，原路径 `C:\Source\Folder` 必须不存在（改名步骤已确保这一点）。

### 软件缓存清理

- 浏览器缓存
- 微信/QQ 缓存文件
- 软件临时文件

### 系统文件清理

- Windows 更新缓存
- 系统还原点（谨慎操作）
- 休眠文件（如不需要休眠功能）：`hiberfil.sys` 的大小约等于内存容量，在管理员终端执行 `powercfg /h off` 可关闭。注意“快速启动”也依赖它，关闭后会一并失效

## 分区调整（高风险）

系统自带的“磁盘管理”通常做不到这件事：给 C 盘扩容要求未分配空间**紧邻 C 盘右侧**，而压缩 D 盘腾出的空间夹在 D 盘内部、与 C 盘不相邻。DiskGenius 这类分区工具能无损移动分区，把空间挪到 C 盘旁边再合并。

> ⚠ 操作前务必提前备份重要数据！建议在 [PE 环境](/concepts/winpe) 下操作。

将 D 盘多余空间分配给 C 盘：

1. 运行 DiskGenius
2. 选择 D 盘 → 调整分区大小
3. 将多余空间分配给 C 盘
4. 应用更改并重启
