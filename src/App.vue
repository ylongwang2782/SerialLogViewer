<template>
    <div class="serial-port-assistant">
        <el-container>
            <el-header>
                <el-row :gutter="20" class="mb-20">
                    <el-col :span="8">
                        <el-select v-model="selectedPort" placeholder="选择串口" style="width: 100%">
                            <el-option v-for="port in ports" :key="port.path"
                                :label="port.path + (port.description ? ` (${port.description})` : '')"
                                :value="port.path" />
                        </el-select>
                    </el-col>
                    <el-col :span="4">
                        <el-button type="primary" @click="scanPorts">扫描串口</el-button>
                    </el-col>
                    <el-col :span="4">
                        <el-select v-model="baudRate" placeholder="波特率">
                            <el-option v-for="rate in baudRates" :key="rate" :label="rate" :value="rate" />
                        </el-select>
                    </el-col>
                    <el-col :span="4">
                        <el-button :type="isConnected ? 'danger' : 'success'" @click="toggleConnection">
                            {{ isConnected ? '关闭串口' : '打开串口' }}
                        </el-button>
                    </el-col>
                    <el-col :span="4">
                        <el-button type="primary" @click="exportLogs">导出日志</el-button>
                    </el-col>
                </el-row>
                <el-row :gutter="20">
                    <el-col :span="24">
                        <div class="filter-bar">
                            <el-input v-model="searchText" placeholder="搜索日志" prefix-icon="el-icon-search" clearable
                                @clear="filterLogs" @input="filterLogs" style="width: 200px" />
                            <el-select v-model="selectedLogLevel" placeholder="日志等级" clearable @change="filterLogs"
                                style="width: 120px">
                                <el-option v-for="level in logLevels" :key="level" :label="level" :value="level" />
                            </el-select>
                            <el-select v-model="selectedTag" placeholder="TAG" clearable @change="filterLogs"
                                style="width: 150px">
                                <el-option v-for="tag in availableTags" :key="tag" :label="tag" :value="tag" />
                            </el-select>
                            <el-checkbox v-model="showHexOutput">HEX显示</el-checkbox>
                            <el-button size="small" @click="clearOutput">清空</el-button>
                        </div>
                    </el-col>
                </el-row>
            </el-header>

            <el-main>
                <div class="serial-content">
                    <div class="output-window">
                        <div class="log-table-container" ref="logContainer">
                            <el-table :data="filteredLogs" style="width: 100%" size="small" height="100%" border>
                                <el-table-column prop="timestamp" label="时间戳" min-width="100" resizable />
                                <el-table-column prop="level" label="等级" min-width="80" resizable>
                                    <template #default="{ row }">
                                        <span :class="'log-level-' + row.level.toLowerCase()">{{ row.level }}</span>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="tag" label="TAG" min-width="150" resizable />
                                <el-table-column prop="content" label="内容" min-width="300" resizable />
                            </el-table>
                        </div>
                    </div>
                </div>
            </el-main>
        </el-container>
    </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { ElMessage } from 'element-plus';

export default {
    name: 'SerialPortAssistant',
    setup() {
        const ports = ref([]);
        const selectedPort = ref('');
        const baudRate = ref('115200');
        const isConnected = ref(false);
        const inputText = ref('');
        const showHexOutput = ref(false);
        const sendHex = ref(false);
        const logContainer = ref(null);
        const searchText = ref('');
        const selectedLogLevel = ref('');
        const selectedTag = ref('');
        const dataBuffer = ref('');

        // 日志相关
        const logs = ref([]);
        const logLevels = ['V', 'D', 'I', 'W', 'E'];
        const availableTags = computed(() => {
            const tags = new Set();
            logs.value.forEach(log => tags.add(log.tag));
            return Array.from(tags);
        });

        const parseLog = (text) => {
            // 匹配格式：[timestamp] [level] [tag] content
            const match = text.match(/^\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.+)$/);
            if (match) {
                return {
                    timestamp: match[1].trim(),  // 去除可能的空格
                    level: match[2].trim(),      // 去除可能的空格
                    tag: match[3].trim(),        // 去除可能的空格
                    content: match[4].trim()     // 去除可能的空格
                };
            }
            return null;
        };

        const filteredLogs = computed(() => {
            return logs.value.filter(log => {
                if (selectedLogLevel.value && log.level !== selectedLogLevel.value) {
                    return false;
                }
                if (selectedTag.value && log.tag !== selectedTag.value) {
                    return false;
                }
                if (searchText.value) {
                    const searchLower = searchText.value.toLowerCase();
                    return (
                        log.content.toLowerCase().includes(searchLower) ||
                        log.tag.toLowerCase().includes(searchLower)
                    );
                }
                return true;
            });
        });

        const filterLogs = () => {
            // 过滤后自动滚动到底部
            setTimeout(() => {
                if (logContainer.value) {
                    const table = logContainer.value.querySelector('.el-table__body-wrapper');
                    if (table) {
                        table.scrollTop = table.scrollHeight;
                    }
                }
            }, 100);
        };

        const baudRates = [
            '110', '300', '600', '1200', '2400', '4800', '9600',
            '14400', '19200', '38400', '57600', '115200', '128000', '256000', '460800', '500000', '512000', '600000', '750000', '921600', '1500000', '2000000'
        ];

        const scanPorts = async () => {
            try {
                ports.value = await window.electronAPI.listPorts();
            } catch (error) {
                ElMessage.error('扫描串口失败：' + error.message);
            }
        };

        const toggleConnection = async () => {
            if (!isConnected.value) {
                if (!selectedPort.value) {
                    ElMessage.warning('请选择串口');
                    return;
                }

                const result = await window.electronAPI.openPort({
                    path: selectedPort.value,
                    baudRate: baudRate.value
                });

                if (result.success) {
                    isConnected.value = true;
                    ElMessage.success('串口已打开');
                } else {
                    ElMessage.error('打开串口失败：' + result.error);
                }
            } else {
                const result = await window.electronAPI.closePort();
                if (result.success) {
                    isConnected.value = false;
                    ElMessage.success('串口已关闭');
                } else {
                    ElMessage.error('关闭串口失败：' + result.error);
                }
            }
        };

        const sendData = async () => {
            if (!inputText.value.trim()) {
                ElMessage.warning('请输入要发送的数据');
                return;
            }

            const result = await window.electronAPI.sendData({
                data: inputText.value,
                isHex: sendHex.value
            });

            if (!result.success) {
                ElMessage.error('发送数据失败：' + result.error);
            }
        };

        const clearOutput = () => {
            logs.value = [];
        };

        const processBuffer = () => {
            const lines = dataBuffer.value.split('\n');
            // 保留最后一个可能不完整的行
            dataBuffer.value = lines[lines.length - 1];

            // 处理完整的行
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line) {
                    if (showHexOutput.value) {
                        const hexData = Array.from(Buffer.from(line)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
                        logs.value.push({
                            timestamp: new Date().getTime() / 1000,
                            level: 'D',
                            tag: 'HEX',
                            content: hexData
                        });
                    } else {
                        const parsedLog = parseLog(line);
                        if (parsedLog) {
                            logs.value.push(parsedLog);
                        } else {
                            logs.value.push({
                                timestamp: new Date().getTime() / 1000,
                                level: 'I',
                                tag: 'TEXT',
                                content: line
                            });
                        }
                    }
                }
            }

            // 自动滚动到底部
            setTimeout(() => {
                if (logContainer.value) {
                    const table = logContainer.value.querySelector('.el-table__body-wrapper');
                    if (table) {
                        table.scrollTop = table.scrollHeight;
                    }
                }
            }, 100);
        };

        const handleSerialData = (event, data) => {
            const text = new TextDecoder().decode(data);
            dataBuffer.value += text;
            processBuffer();
        };

        const exportLogs = () => {
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const csvContent = filteredLogs.value.map(log =>
                `${log.timestamp},${log.level},${log.tag},"${log.content.replace(/"/g, '""')}"`
            ).join('\n');

            const header = 'Timestamp,Level,Tag,Content\n';
            const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `logs_${timestamp}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
        };

        onMounted(() => {
            scanPorts();
            window.electronAPI.onSerialData(handleSerialData);
        });

        onUnmounted(() => {
            window.electronAPI.removeSerialDataListener();
        });

        return {
            ports,
            selectedPort,
            baudRate,
            baudRates,
            isConnected,
            inputText,
            showHexOutput,
            sendHex,
            scanPorts,
            toggleConnection,
            sendData,
            clearOutput,
            logContainer,
            filteredLogs,
            searchText,
            selectedLogLevel,
            selectedTag,
            logLevels,
            availableTags,
            filterLogs,
            exportLogs
        };
    }
};
</script>

<style>
.serial-port-assistant {
    padding: 20px;
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.el-container {
    height: 100%;
}

.el-header {
    padding: 20px 0;
    height: auto !important;
}

.mb-20 {
    margin-bottom: 20px;
}

.serial-content {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.output-window {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.filter-bar {
    display: flex;
    gap: 10px;
    align-items: center;
}

.log-table-container {
    flex: 1;
    overflow: hidden;
}

.el-textarea {
    margin-bottom: 10px;
}

/* 日志等级颜色 */
.log-level-v {
    color: #909399;
}

.log-level-d {
    color: #409EFF;
}

.log-level-i {
    color: #67C23A;
}

.log-level-w {
    color: #E6A23C;
}

.log-level-e {
    color: #F56C6C;
}

/* 表格样式优化 */
.el-table {
    font-family: monospace;
}

.el-table .el-table__body-wrapper {
    overflow-y: auto;
}

.el-table__column-resize-proxy {
    background-color: #409EFF;
}
</style>