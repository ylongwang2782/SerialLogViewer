# SerialLog Viewer

SerialLog Viewer 是一个基于 Electron + Vue.js 开发的串口日志查看工具，专门用于查看和分析带格式的串口日志输出。它支持实时日志显示、过滤、搜索和导出功能，特别适合嵌入式开发中的调试场景。

## 功能特点

### 串口连接
- 自动扫描可用串口，显示设备描述信息（如 CP210X、CH340 等）
- 支持多种常用波特率（110-921600）
- 串口连接状态实时显示

### 日志显示
- 支持解析标准格式日志：`[timestamp] [level] [tag] content`
- 日志等级颜色区分（V/D/I/W/E）
- 自动滚动显示最新日志
- 可调整列宽，适应不同长度的内容
- 支持 HEX 格式显示

### 日志过滤
- 支持按日志等级（V/D/I/W/E）过滤
- 支持按 TAG 过滤
- 支持全局文本搜索
- 实时过滤，快速定位关注内容

### 数据导出
- 支持导出为 CSV 格式
- 导出文件自动以时间戳命名
- 保留所有日志字段（时间戳、等级、TAG、内容）
- 支持导出过滤后的日志内容

## 安装说明

1. 确保已安装 Node.js (推荐 v14 或更高版本)
2. 克隆仓库到本地：
   ```bash
   git clone [repository-url]
   ```
3. 安装依赖：
   ```bash
   npm install
   ```
4. 运行开发版本：
   ```bash
   npm run electron:dev
   ```
5. 构建应用：
   ```bash
   npm run build
   npm run electron:build
   ```

## 使用说明

1. 启动应用后，点击"扫描串口"按钮获取可用串口列表
2. 从下拉列表选择目标串口（列表中会显示设备描述信息）
3. 选择合适的波特率
4. 点击"打开串口"按钮开始接收日志
5. 使用顶部的过滤工具进行日志过滤：
   - 使用搜索框进行全局搜索
   - 使用日志等级下拉框按级别过滤
   - 使用 TAG 下拉框按模块过滤
6. 需要导出日志时，点击"导出日志"按钮，选择保存位置

## 日志格式要求

为了正确解析日志，串口输出的日志应符合以下格式：
```
[timestamp] [level] [tag] content
```

示例：
```
[0.0] [D] [BOOT] Slave Firmware v3.3.0
[0.9] [I] [BOOT] System initialized
[1.2] [W] [SENSOR] Temperature high: 85°C
```

## 开发技术

- Electron
- Vue.js 3
- Element Plus
- SerialPort
- Vite

## 许可证

MIT License

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的串口日志查看功能
- 支持日志过滤和导出
- 支持自定义列宽
- 支持设备描述显示 