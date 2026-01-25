# 搭建属于自己的Minecraft服务器

  |                    维护人                     |       时间       |
  | :-------------------------------------------: | :--------------: |
  | [@YunaCelisse](mailto:29951517@qq.com) | 2026.1.25 - now |

## 前言

在部署属于自己的服务器前,请确保你的部署设备已经安装好了所需运行环境(如对应的Java版本).可以在此处检索你需要的Java版本.本教程由简单至进阶,可以根据自身需求选择方案部署.

## 部署服务端(forge/fabric)

### Windows

#### 整合包作者提供了服务器版本

此处以curseforge平台的ATM9 to the sky整合包(1.20.1 forge 47.4.0 JDK21)为例.可以在此处下载包括服务器版本的游戏包.

游戏包解压后的整个文件夹为服务端的所有文件,运行run.bat可以开始自动化部署.在部署过程中,如遇文件下载失败,请切换至代理网络下载,或请有代理服务的朋友下载好后将游戏包发送给你.

在下载好后,命令行窗口会显示需要同意eula用户协议,然后每过10s尝试启动服务端.此时输入ctrl+c终止命令或直接关闭命令行.进入eula.txt将false改为true.然后启动startserver.bat即可成功启动服务端.

还有另一种的部署方式以FTB Team的FTB下载器为例.

### Ubuntu(Linux)

首先确保系统已安装所需的Java版本。可以使用以下命令检查Java版本:

```bash
java -version
```

如果未安装或版本不符,可以使用以下命令安装(以OpenJDK 21为例):

```bash
sudo apt update
sudo apt install openjdk-21-jdk
```

下载并解压服务器整合包后,给启动脚本添加执行权限:

```bash
chmod +x run.sh
chmod +x start.sh
```

运行部署脚本:

```bash
./run.sh
```

等待文件下载完成后,需要同意EULA协议。编辑eula.txt文件:

```bash
nano eula.txt
```

将`eula=false`改为`eula=true`,保存后退出(Ctrl+X, 然后按Y确认)。

最后启动服务器:

```bash
./start.sh
```

为了让服务器在终端关闭后继续运行,建议使用screen:

```bash
sudo apt install screen
screen -S minecraft
./start.sh
```

按下`Ctrl+A`然后按`D`即可退出screen会话但保持服务器运行。重新连接使用:

```bash
screen -r minecraft
```

### MacOS

MacOS的部署流程与Linux类似。首先确保已安装Java环境。

推荐使用Homebrew安装Java:

```bash
brew install openjdk@21
```

安装后需要链接Java:

```bash
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

验证安装:

```bash
java -version
```

下载并解压服务器整合包后,打开终端进入服务器目录,给启动脚本添加执行权限:

```bash
chmod +x run.sh
chmod +x start.sh
```

运行部署脚本:

```bash
./run.sh
```

同意EULA协议,编辑eula.txt:

```bash
nano eula.txt
```

将`eula=false`改为`eula=true`,保存退出。

启动服务器:

```bash
./start.sh
```

### Docker

使用Docker部署Minecraft服务器是最便捷和可移植的方案。这里介绍使用[itzg/minecraft-server](https://github.com/itzg/docker-minecraft-server)镜像部署。

#### 前置要求

确保已安装Docker。访问[Docker官网](https://www.docker.com/)下载安装对应平台的Docker Desktop。

#### 部署原版服务器

创建一个目录存放服务器数据:

```bash
mkdir minecraft-server
cd minecraft-server
```

运行Docker容器:

```bash
docker run -d -it -p 25565:25565 \
  --name minecraft-server \
  -e EULA=TRUE \
  -e VERSION=1.20.1 \
  -v $(pwd)/data:/data \
  itzg/minecraft-server
```

#### 部署Forge/Fabric服务器

部署Forge服务器:

```bash
docker run -d -it -p 25565:25565 \
  --name minecraft-forge \
  -e EULA=TRUE \
  -e TYPE=FORGE \
  -e VERSION=1.20.1 \
  -e FORGE_VERSION=47.4.0 \
  -v $(pwd)/data:/data \
  itzg/minecraft-server
```

部署Fabric服务器:

```bash
docker run -d -it -p 25565:25565 \
  --name minecraft-fabric \
  -e EULA=TRUE \
  -e TYPE=FABRIC \
  -e VERSION=1.20.1 \
  -v $(pwd)/data:/data \
  itzg/minecraft-server
```

#### 常用Docker命令

查看容器日志:

```bash
docker logs -f minecraft-server
```

停止服务器:

```bash
docker stop minecraft-server
```

启动服务器:

```bash
docker start minecraft-server
```

进入容器终端:

```bash
docker exec -it minecraft-server rcon-cli
```

删除容器:

```bash
docker rm -f minecraft-server
```

#### 使用Docker Compose

创建`docker-compose.yml`文件:

```yaml
version: '3.8'
services:
  minecraft:
    image: itzg/minecraft-server
    container_name: minecraft-server
    ports:
      - "25565:25565"
    environment:
      EULA: "TRUE"
      VERSION: "1.20.1"
      TYPE: "FORGE"
      FORGE_VERSION: "47.4.0"
      MEMORY: "4G"
    volumes:
      - ./data:/data
    restart: unless-stopped
```

启动服务器:

```bash
docker-compose up -d
```

## 部署后的管理操作

### 隐藏ui窗口

右键startserver.bat在记事本中编辑,在启动命令的后段加上 -nogui.这样在启动的时候仅显示命令行窗口而不会有ui窗口.

## NBTCA提供的公益服务器方案
