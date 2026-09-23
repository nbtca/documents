---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# CABadge

CABadge（计协电子吧唧）是 NBTCA 自己设计的电子徽章：一块直径 50 毫米的圆形电路板，正面是 360×360 的圆形触摸屏，可以显示壁纸、切换图案，也能展示计协风格的名片。硬件设计、固件源码和配套电脑工具全部开源，供复刻、改进和协作开发。

## 现状

2026 年 9 月发布了 [v1.0](https://github.com/nbtca/CABadge/releases/tag/v1.0)，固件版本 7.3.7-mem，已经上板使用，基本功能可以正常工作，但仍有较多 Bug 待修。

- **已有**：壁纸浏览、切换与保存，协会名片页，Wi-Fi 与蓝牙连接管理，通过 USB 或局域网 HTTP 上传壁纸，触摸操作，亮度调节，息屏后摇晃唤醒；
- **尚未提供**：GIF 动图、蓝牙传图和无线升级（OTA）。

## 硬件

- **主控**：ESP32-S3R8，带 8 MB PSRAM，外挂 16 MB Flash；
- **显示与输入**：ST77916 驱动的圆形屏幕，电容触摸；
- **传感器**：SC7A20 三轴加速度计，用于摇晃唤醒等交互；
- **电源**：锂电池供电，USB-C 同时负责充电、烧录和调试；
- **PCB**：四层板，板厚 1.6 毫米，用 [KiCad](https://www.kicad.org/) 10 设计。

## 参与开发

复刻需要自己采购元件、打样 PCB、焊接和调试。板上有 QFN 封装的主控和细间距的屏幕排线座，适合有贴片焊接经验、手边有万用表和放大工具的同学。完整流程写在仓库 README 里：下载同一版本的资料、核对元件、打样、分阶段焊接上电、烧录固件、逐项检查。首次点亮直接用 Release 里编译好的固件，不需要先搭编译环境。

固件基于 [LVGL](https://lvgl.io/) 9.4 图形库，板端用 ESP-IDF 和 PlatformIO 构建，电脑上可以用 SDL2 预览界面。仓库分为 `firmware-v7/`（固件、界面与测试）、`hardware/`（KiCad 工程、BOM 与生产文件）、`tools/`（烧录工具）和 `docs/`（构建、发布与已知问题）。

几个现成的切入点：

- **修 Bug**：仓库的[已知问题](https://github.com/nbtca/CABadge/blob/main/docs/KNOWN_ISSUES.md)列出了待验证的项目，复现后按固件版本、触发步骤、现象附上照片或串口日志提交 issue；
- **跨平台构建**：构建脚本目前绑定 Windows 和固定盘符路径，还没有一键构建流程；
- **新功能**：GIF、蓝牙传图和 OTA 都在待办之列。

维护者是 [Egger0](https://github.com/Egger0)。仓库地址：[github.com/nbtca/CABadge](https://github.com/nbtca/CABadge)。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
