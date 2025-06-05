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
                            <el-select v-model="pageSize" placeholder="每页显示" style="width: 120px" @change="handlePageSizeChange">
                                <el-option v-for="size in pageSizes" :key="size" :label="`${size}条/页`" :value="size" />
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
                            <el-table :data="paginatedLogs" style="width: 100%" size="small" height="100%" border>
                                <el-table-column prop="timestamp" label="时间戳" min-width="100" resizable />
                                <el-table-column prop="level" label="等级" min-width="80" resizable>
                                    <template #default="{ row }">
                                        <span :class="'log-level-' + row.level.toLowerCase()">{{ row.level }}</span>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="tag" label="TAG" min-width="150" resizable />
                                <el-table-column prop="content" label="内容" min-width="300" resizable />
                            </el-table>
                            <div class="pagination-container">
                                <el-pagination
                                    v-model:current-page="currentPage"
                                    v-model:page-size="pageSize"
                                    :page-sizes="pageSizes"
                                    :total="filteredLogs.length"
                                    layout="total, sizes, prev, pager, next, jumper"
                                    @size-change="handlePageSizeChange"
                                    @current-change="handleCurrentPageChange"
                                />
                            </div>
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

        const clearOutput = () => {
            logs.value = [];
            currentPage.value = 1;  // 清空日志时重置页码
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
                            timestamp: new Date().toLocaleTimeString(),
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
                                timestamp: new Date().toLocaleTimeString(),
                                level: 'I',
                                tag: 'TEXT',
                                content: line
                            });
                        }
                    }
                }
            }

            // 如果在最后一页，自动跳转到新的最后一页
            const maxPage = Math.ceil(filteredLogs.value.length / pageSize.value);
            if (currentPage.value === maxPage || currentPage.value === maxPage - 1) {
                currentPage.value = Math.ceil(logs.value.length / pageSize.value);
            }
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

        const pageSize = ref(50);  // 默认每页显示50条
        const currentPage = ref(1);
        const pageSizes = [20, 50, 100, 200, 500];  // 可选的每页显示数量

        const paginatedLogs = computed(() => {
            const start = (currentPage.value - 1) * pageSize.value;
            const end = start + pageSize.value;
            return filteredLogs.value.slice(start, end);
        });

        const handlePageSizeChange = (newSize) => {
            pageSize.value = newSize;
            // 当页大小改变时，可能需要调整当前页码以确保数据正确显示
            const maxPage = Math.ceil(filteredLogs.value.length / newSize);
            if (currentPage.value > maxPage) {
                currentPage.value = maxPage;
            }
        };

        const handleCurrentPageChange = (newPage) => {
            currentPage.value = newPage;
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
            clearOutput,
            logContainer,
            filteredLogs,
            searchText,
            selectedLogLevel,
            selectedTag,
            logLevels,
            availableTags,
            filterLogs,
            exportLogs,
            pageSize,
            currentPage,
            pageSizes,
            paginatedLogs,
            handlePageSizeChange,
            handleCurrentPageChange
        };
    }
};
</script>

<style>
.serial-port-assistant {
    position: fixed;  /* 使用固定定位铺满整个窗口 */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.el-container {
    height: 100%;
    padding: 20px;
}

/* 添加全局样式 */
:deep(html),
:deep(body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
}

:deep(#app) {
    height: 100%;
    overflow: hidden;
}

.el-header {
    padding: 0 0 20px 0 !important;
    height: auto !important;
    flex-shrink: 0;
}

.el-main {
    padding: 0 !important;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.mb-20 {
    margin-bottom: 20px;
}

.serial-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; /* 重要：允许flex子项收缩 */
}

.output-window {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; /* 重要：允许flex子项收缩 */
}

.filter-bar {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
}

.log-table-container {
    flex: 1;
    overflow: hidden;
    min-height: 0; /* 重要：允许flex子项收缩 */
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
    height: 100% !important;
}

.el-table .el-table__body-wrapper {
    overflow-y: auto;
}

.el-table__column-resize-proxy {
    background-color: #409EFF;
}

.pagination-container {
    padding: 10px;
    background: #fff;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid #EBEEF5;
}

.log-table-container {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.el-table {
    flex: 1;
    overflow: hidden;
}

/* 确保分页控件不会被表格遮挡 */
.el-pagination {
    margin-top: 10px;
    padding: 0;
    z-index: 1;
}
</style>