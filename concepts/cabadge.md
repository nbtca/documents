---
maintainers:
  - user: m1ngsama
    since: 2026-09
---

# CABadge

CABadge（计协电子吧唧）是 NBTCA 自己设计的电子徽章：一块直径 50 毫米的圆形电路板，正面是 360×360 的圆形触摸屏，可以显示壁纸、切换图案，也能展示计协风格的名片。硬件设计、固件源码和配套电脑工具全部开源，供复刻、改进和协作开发。

<FactStrip :facts="[
  { label: '主控', value: 'ESP32-S3' },
  { label: '固件', value: 'ESP-IDF · LVGL' },
  { label: '始于', value: '2026 年' },
  { label: '维护', value: 'Egger0' },
]" />

<FigureGrid>
  <Figure src="./assets/project-cabadge-control.webp" alt="手指捏着一块圆形屏幕的电路板，屏幕上是“控制中心”页面：顶部显示电池电压 3.77 V，下面是 Wi-Fi 开、蓝牙开两个按钮、一条预览亮度滑条，以及手机管理和息屏两个按钮" caption="控制中心：无线开关、亮度与手机管理入口都在这一页。" date="2026-09" source="CABadge 仓库" />
  <Figure src="./assets/project-cabadge-card.webp" alt="同一块电路板显示协会名片页：深蓝色卡片上写着 NBTCA / MEMBER、成员昵称 Egger 和“计算机协会”，右侧印着协会圆徽" caption="名片页，卡片上是佩戴者的昵称。" date="2026-09" source="CABadge 仓库" />
</FigureGrid>

## 现状

2026 年 9 月发布了 [v1.0](https://github.com/nbtca/CABadge/releases/tag/v1.0)，固件版本 7.3.7-mem，已在首块样板上运行，基本功能可以使用，但仍有较多 Bug 待修。

- **已有**：壁纸浏览、切换与保存，协会名片页，Wi-Fi 与蓝牙连接管理，通过 USB 或手机网页上传壁纸，触摸操作，息屏后摇晃唤醒；
- **尚未提供**：GIF 动图、蓝牙传图和无线升级（OTA）；
- **固件里的保护性限制**：实体背光被限制在约 5% 的占空比，开机状态下不给电池充电，都要等测完 LED 电流和完整充电过程后再放开。

## 硬件

项目的出发点写在[开发计划书](https://github.com/nbtca/CABadge/blob/main/%E8%AE%A1%E5%8D%8F%E7%94%B5%E5%AD%90%E5%90%A7%E5%94%A7%E5%BC%80%E5%8F%91%E8%AE%A1%E5%88%92%E4%B9%A6.md)里：体积小、结构简单、可以单面贴装，成本约 100 元。功能架构参考了立创开源平台上的[《基于 ESP32-S3 的电子吧唧》](https://oshwhub.com/loudlin/dzbj)，原理图、PCB 和视觉设计都重新做过。扬声器、麦克风、振动马达、存储卡这些会增加面积和成本的部件一律不放。

| 部分       | 方案                                                           |
| ---------- | -------------------------------------------------------------- |
| 主控       | ESP32-S3R8，带 8 MB PSRAM，外挂 16 MB Flash                    |
| 显示与输入 | ST77916 驱动的 1.8 英寸圆形屏幕，电容触摸                      |
| 传感器     | SC7A20 三轴加速度计，用于摇晃唤醒                              |
| 电源       | 单节锂电池，USB-C 负责供电、烧录和调试                         |
| PCB        | 四层板，板厚 1.6 毫米，用 [KiCad](https://www.kicad.org/) 设计 |

首板踩过一个值得记住的坑：原本选的屏幕排线座是下接触的，按实际插法装上后脚序整个反了，板上的 I²C 数据线接到了屏幕的地，结果黑屏、总线被拉低。换成抽屉式上接触的座子后才点亮。采购规格已经更正，但 PCB 封装还没改，复刻时以仓库里的 [J1 连接器更正](https://github.com/nbtca/CABadge/blob/main/docs/J1-CONNECTOR.md)为准。另外屏幕的 TE 同步脚没有接出，动态画面可能撕裂，只能靠固件尽量缓解。

## 固件

固件基于 [LVGL](https://lvgl.io/) 9.4 图形库，板端用 ESP-IDF 构建，同一份界面代码也能在电脑上用 SDL2 模拟器运行。壁纸固定为 360×360 的 RGB565 格式，存放在 Flash 的专用分区里。上传有三条路：USB 帧协议、板载网页（在徽章上开启手机管理后，5 分钟内可用），以及只做控制、不传图的蓝牙 GATT 服务。

配套的 NBTCA Badge TOOL 是 Windows 上的工作台，负责烧录固件和联调设备。首次点亮直接用 Release 里编译好的固件，不需要搭编译环境。

## 参与开发

复刻需要自己采购元件、打样 PCB、焊接和调试。板上有 QFN 封装的主控和细间距的屏幕排线座，适合有贴片焊接经验、手边有万用表和放大工具的同学。完整流程写在仓库 README 里：下载同一版本的资料、核对元件、打样、分阶段焊接上电、烧录固件、逐项检查。

仓库分为 `firmware-v7/`（固件、界面与测试）、`hardware/`（KiCad 工程、BOM 与生产文件）、`tools/`（烧录工具）和 `docs/`（构建、发布与已知问题）。开发的来龙去脉记在根目录的[首板测试记录](https://github.com/nbtca/CABadge/blob/main/%E9%A6%96%E6%9D%BF%E6%B5%8B%E8%AF%95%E8%AE%B0%E5%BD%95.md)里，每一轮改动、实测结果和没能验证的项目都分开写明，动手前值得通读。

不需要硬件就能做的：

- **跨平台构建**：构建脚本目前绑定 Windows 和固定的盘符路径，还没有一键构建流程和 CI；
- **界面**：在电脑上的 SDL2 模拟器里改界面和交互；
- **文档**：修正 v1.0 旧源码里的过时链接和说明。

需要一块板子的：

- **修 Bug**：[已知问题](https://github.com/nbtca/CABadge/blob/main/docs/KNOWN_ISSUES.md)列出了待验证的项目，复现后按固件版本、触发步骤、现象附上照片或串口日志提交 issue；
- **下一版硬件**：接出 TE 同步脚、改正 J1 封装、验证充电电路；
- **新功能**：GIF、蓝牙传图和 OTA。

〔以上为**最后核对 2026-09** 时的状态。〕

维护者是 [Egger0](https://github.com/Egger0)。仓库地址：[github.com/nbtca/CABadge](https://github.com/nbtca/CABadge)。

## 沿革

- **2026 年 9 月 8 日**：写成开发计划书；
- **9 月 9 日**：导出首版 PCB 生产文件；
- **9 月 19 日至 21 日**：首板上电，排查黑屏后换座点亮，固件迭代到 7.3.7；
- **9 月 21 日**：仓库转入 nbtca 组织，发布 v1.0。

## 相关

其他项目见[基础设施与项目](/about/infrastructure)。
