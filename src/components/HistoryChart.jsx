/**
 * @file HistoryChart.jsx
 * @description 使用react-chartjs-2显示历史数据图表。
 * [重构后] 使用MUI组件美化了交互控件。
 */

import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Box, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'top', labels: { color: '#f8f9fa' } },
        title: { display: true, text: '帝国历史曲线', color: '#f8f9fa', font: { size: 16 } },
    },
    scales: {
        x: { ticks: { color: '#adb5bd' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
        y: { ticks: { color: '#adb5bd' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
    }
};

function HistoryChart({ snapshots }) {
    const [metric, setMetric] = useState('totalArmy');

    const handleMetricChange = (event, newMetric) => {
        if (newMetric !== null) {
            console.log(`[日志][HistoryChart] 切换图表指标为: ${newMetric}`);
            setMetric(newMetric);
        }
    };

    const chartData = useMemo(() => {
        if (!snapshots || snapshots.length === 0) {
            return { labels: [], datasets: [] };
        }
        console.log(`[日志][HistoryChart] 正在为指标 "${metric}" 重新计算图表数据...`);

        const allFactionsInfo = {};
        snapshots.forEach(snapshot => {
            Object.values(snapshot.factions).forEach(faction => {
                if (!allFactionsInfo[faction.id]) {
                    allFactionsInfo[faction.id] = { name: faction.name, color: faction.color };
                }
            });
        });

        const labels = snapshots.map(s => `T${s.turn.number}`);

        const datasets = Object.keys(allFactionsInfo).map(factionId => {
            const info = allFactionsInfo[factionId];
            const data = snapshots.map(snapshot => {
                const factionInSnapshot = snapshot.factions[factionId];
                if (!factionInSnapshot) return null;

                switch (metric) {
                    case 'territory_count':
                        return Object.values(snapshot.territories).filter(t => t.owner === factionId).length;
                    case 'totalArmy':
                        return (factionInSnapshot.totalArmy?.regulars || 0) + (factionInSnapshot.totalArmy?.militia || 0);
                    default:
                        return factionInSnapshot[metric];
                }
            });

            return {
                label: info.name,
                data: data,
                borderColor: info.color,
                backgroundColor: `${info.color}80`,
                tension: 0.1,
                pointRadius: 2,
                spanGaps: true,
            };
        });
        console.log(`[日志][HistoryChart] 图表数据计算完毕。`);
        return { labels, datasets };
    }, [snapshots, metric]);

    if (snapshots.length < 2) {
        return <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>暂无足够历史数据生成图表。</Typography>;
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <ToggleButtonGroup
                    color="primary"
                    value={metric}
                    exclusive
                    onChange={handleMetricChange}
                    aria-label="Metric selection"
                    size="small"
                >
                    <ToggleButton value="totalArmy">兵力</ToggleButton>
                    <ToggleButton value="money">金钱</ToggleButton>
                    <ToggleButton value="territory_count">领土</ToggleButton>
                </ToggleButtonGroup>
            </Box>
            <Box sx={{ position: 'relative', height: '300px', width: '100%' }}>
                <Line options={chartOptions} data={chartData} />
            </Box>
        </Box>
    );
}

export default HistoryChart;