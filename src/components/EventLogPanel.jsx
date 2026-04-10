/**
 * @file EventLogPanel.jsx
 * @description 显示事件日志的面板。
 * [最终修复] 增强了对不同日志条目格式的兼容性，确保UI稳定。
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import BattleReportLog from './BattleReportLog';

function EventLogPanel({ log, factions, turn }) {
    console.log("[日志][EventLogPanel] 开始渲染事件日志，当前回合:", turn);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h6" component="h2" gutterBottom>
                回合: {turn} - 事件日志
            </Typography>
            <Box sx={{
                flexGrow: 1,
                overflowY: 'auto',
                bgcolor: 'background.default',
                p: {xs: 1, md: 2},
                fontSize: '0.9em',
                borderRadius: 2,
            }}>
                {(!log || log.length === 0) && (
                    <Typography sx={{ color: 'text.secondary', textAlign: 'center', p: 2 }}>
                        暂无事件。
                    </Typography>
                )}
                {log.map((entry, index) => {
                    // [核心修复] 健壮地处理 entry.turn 可能是数字或对象的情况
                    const turnNumber = entry.turn?.number || entry.turn;
                    const uniqueKey = `${turnNumber}-${index}`;

                    // 根据日志类型进行条件渲染
                    if (entry.type === 'BATTLE_REPORT' && entry.message) {
                        console.log(`[日志][EventLogPanel] 渲染战斗报告: ${entry.message.title}`);
                        const reportWithFactionIds = {
                            ...entry.message,
                            attacker: { ...entry.message.attacker, id: entry.factionId },
                            defender: { ...entry.message.defender, id: entry.message.defender.factionId || null }
                        };
                        return <BattleReportLog key={uniqueKey} report={reportWithFactionIds} factions={factions} />;
                    }

                    // 默认渲染普通文本日志
                    const factionColor = (entry.factionId && factions[entry.factionId])
                        ? factions[entry.factionId].color
                        : '#ccc';

                    const factionName = (entry.factionId && factions[entry.factionId])
                        ? factions[entry.factionId].name
                        : '系统';

                    const messagePrefix = entry.factionId ? `[${factionName}]` : '';

                    return (
                        <Typography key={uniqueKey} component="p" sx={{ color: factionColor, mb: 1, lineHeight: 1.4, wordBreak: 'break-word', borderLeft: 3, borderColor: factionColor, pl: 1.5 }}>
                            <Typography component="span" sx={{ fontWeight: 'bold', color: 'text.secondary', mr: 1 }}>
                                T{turnNumber}
                            </Typography>
                            {messagePrefix && <Typography component="strong" sx={{ mr: 0.5 }}>{messagePrefix}</Typography>}
                            {String(entry.message)}
                        </Typography>
                    );
                })}
            </Box>
        </Box>
    );
}

export default EventLogPanel;