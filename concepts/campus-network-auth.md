# 校园网认证

:::info 维护信息

| 维护人                                   | 时间          |
| ---------------------------------------- | ------------- |
| [@m1ngsama](https://github.com/m1ngsama) | 2026.07 - Now |

:::

校园网认证是接入学校校园网前的身份认证——浙大宁波理工学院使用卓智网络的接入门户，连上网络后还需在浏览器或客户端用学号登录，才能真正上网。

## 怎么连

有线插好网线、无线连上校园 Wi-Fi 后，打开浏览器访问任意网页，通常会自动跳转到认证页，输入学号和密码登录即可。注意校园网账号一般有**设备数量限制**，超出时要先下线其他设备。

## NBTCA 的自建工具

NBTCA 做了适配校园网认证的开源工具，方便路由器等设备接入：[nbtverify](https://github.com/nbtca/nbtverify) 与 [luci-app-nbtverify](https://github.com/nbtca/luci-app-nbtverify)（用于 OpenWrt 路由器）。更多见[基础设施与项目](/about/infrastructure)。
