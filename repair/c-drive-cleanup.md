---
maintainers:
  - user: OrangeLee03
    since: 2022-03
---

# C 盘清理

C 盘通常最先变满。Windows 默认把用户资料（桌面、下载、文档）、休眠文件、虚拟内存文件和更新缓存都放在系统盘。多数软件和微信、QQ 的聊天记录也默认放在 C 盘。

清理分三个阶段，风险从低到高：

1. 清除缓存。这一步见效快，没有风险。
2. 把数据和软件移到其他分区。这一步能解决根本问题。
3. 调整分区。这一步有风险，只在前两步不够时做。

<FigureGrid>
  <Figure src="./assets/ca-lecture-c-drive.webp" alt="讲座投影上写着“分区C满了该咋办”，正解释“盘”指硬盘、而 C 盘只是硬盘上人为划出的一个分区；讲台右侧挂着协会队旗" caption="给同学解释时，先说清硬盘和分区不是一回事。" source="协会照片档案" />
  <Figure src="./assets/ca-lecture-partition.webp" alt="讲座投影上是分区示意图，标题为“如何将分区D（或后面空间）移 50GB 给分区C”" caption="所谓扩容，就是把旁边分区的空间划给 C 盘。" source="协会照片档案" />
</FigureGrid>

[CA101](/concepts/ca101) 讲座也讲过这个题目。向机主解释时，按上面的顺序说明。

## 开始前

- [ ] 备份重要数据。
- [ ] 关闭所有正在运行的程序。
- [ ] 记下 C 盘当前的可用空间。

## 工具

- [Dism++](https://github.com/Chuyu-Team/Dism-Multi-language)：清理系统，包括 Windows 更新文件和 AppX 文件。
- [WizTree](https://wiztreefree.com/)：显示每个文件和文件夹占用的空间。
- [DiskGenius](https://www.diskgenius.com/)：调整分区大小。

协会内部的下载地址见[软件仓库索引](/repair/tools)。你也可以联系维修队成员。

## 清除缓存

### 用系统工具清理

1. 在文件资源管理器中右键单击 C 盘，选择“属性”。
2. 单击“磁盘清理”。
3. 单击“清理系统文件”。不单击这个按钮，只能清除用户临时文件。单击后，才会出现“Windows 更新清理”等系统项目。
4. 选择要清理的项目，单击“确定”。
5. 打开“设置 → 系统 → 存储”，开启“存储感知”，或者手动清除临时文件。

### 用 Dism++ 清理

Dism++ 能清除系统工具清不掉的更新备份和组件存储（WinSxS）。这两项通常占用十几 GB。

1. 以管理员身份运行 Dism++。
2. 单击“空间回收”。
3. 选择要清理的项目。
4. 单击“清理”。

### 用 WizTree 找出大文件

WizTree 直接读取 NTFS 的主文件表（MFT），不逐个读取文件，所以几秒就能扫描完整个硬盘。先找出占用空间的文件，再决定删除什么。

1. 运行 WizTree，扫描 C 盘。
2. 找出占用空间最大的文件和文件夹。
3. 确认每个文件的用途后，再删除它。

### 软件缓存

- 浏览器缓存
- 微信、QQ 的缓存文件
- 软件的临时文件

### 系统文件

- Windows 更新缓存
- 系统还原点
- 休眠文件 `hiberfil.sys`

::: warning 注意
删除系统还原点后，你不能再把系统恢复到这些还原点。删除前，问机主是否需要它们。
:::

休眠文件的大小约等于内存容量。如果机主不用休眠功能，按下面的步骤关闭它：

1. 以管理员身份打开终端。
2. 运行 `powercfg /h off`。

::: info 注
关闭休眠后，“快速启动”也不能再使用，因为快速启动也使用休眠文件。
:::

## 移动用户数据

### 移动系统文件夹

用这种方法移动桌面、下载和文档文件夹。这种方法的兼容性最好。

1. 在文件资源管理器中右键单击“桌面”，选择“属性”。
2. 选择“位置”选项卡。
3. 单击“移动”，选择 D 盘上的一个文件夹。
4. 对“下载”和“文档”重复第 1 步到第 3 步。

### 用目录联接移动其他文件夹

用目录联接（junction）移动已安装的程序和其他文件夹。下面的命令都在以管理员身份运行的 PowerShell 中执行。把 `C:\Source\Folder` 和 `D:\Target\Folder` 换成实际路径。

::: warning 注意
创建联接前，原路径 `C:\Source\Folder` 必须不存在。如果原路径存在，`mklink` 会失败。第 3 步把原文件夹改名，使原路径不再存在。
:::

1. 创建目标文件夹：

   ```powershell
   New-Item -ItemType Directory -Path "D:\Target\Folder" -Force
   ```

2. 复制文件：

   ```powershell
   robocopy "C:\Source\Folder" "D:\Target\Folder" /E /COPYALL /XJ /R:2 /W:2
   ```

3. 确认复制完成后，把原文件夹改名，作为备份：

   ```powershell
   Rename-Item "C:\Source\Folder" "Folder_backup"
   ```

4. 创建目录联接。`mklink` 是 `cmd` 的内置命令，所以要用 `cmd /c` 调用：

   ```powershell
   cmd /c mklink /J "C:\Source\Folder" "D:\Target\Folder"
   ```

5. 检查联接。输出中的 `LinkType` 应为 `Junction`：

   ```powershell
   Get-Item "C:\Source\Folder" | Format-List FullName,LinkType,Target
   ```

6. 打开使用这个文件夹的程序，确认它工作正常。
7. 删除备份：

   ```powershell
   Remove-Item "C:\Source\Folder_backup" -Recurse -Force
   ```

## 调整分区

系统自带的“磁盘管理”通常不能给 C 盘扩容。扩容要求未分配空间紧邻 C 盘右侧，而压缩 D 盘得到的空间在 D 盘内部，不与 C 盘相邻。DiskGenius 能移动分区而不丢失数据，把空间移到 C 盘旁边再合并。

::: warning 注意
调整分区前，必须备份重要数据。调整分区时断电或出错，会使整个分区的数据丢失。在 [PE 系统](/concepts/winpe)中做这项操作。
:::

把 D 盘的多余空间移给 C 盘：

1. 从 U 盘启动 PE 系统，运行 DiskGenius。
2. 右键单击 D 盘，选择“调整分区大小”。
3. 在对话框中，把要移给 C 盘的空间设在 D 盘前部，并选择把这部分空间合并到 C 盘。
4. 单击“开始”，等待操作完成。
5. 重启电脑，检查 C 盘的容量。
