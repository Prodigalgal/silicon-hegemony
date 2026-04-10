/**
 * @file FactionDetails.jsx
 * @description 显示选定势力详细信息的UI组件。
 */

import React from 'react';
import { useFactionDetailsViewModel } from '../hooks/useFactionDetailsViewModel';
import { Box, Chip, Grid, List, ListItem, Stack, Typography, Paper, Tooltip, CircularProgress } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';

// [修复] 移除硬编码的 height: '100%'，改为接受 sx 属性进行覆盖
const StatItem = ({ label, value, sx = {} }) => (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', ...sx }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h6" sx={{ textAlign: 'right', fontWeight: 'bold', fontSize: '0.9rem' }}>{value}</Typography>
    </Paper>
);

function FactionDetails({ selectedFactionId }) {
    const viewModel = useFactionDetailsViewModel(selectedFactionId);

    if (!selectedFactionId) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary', bgcolor: 'background.default' }}>
                请从上方选择一个势力以查看详情。
            </Paper>
        );
    }

    if (!viewModel) {
        return <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}><CircularProgress /><Typography sx={{ml: 2}}>加载势力数据...</Typography></Box>;
    }

    const { name, color, commanderName, stats, armyBreakdown, controlledTerritories, generals } = viewModel;

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h5" component="h2" sx={{ color: color, borderBottom: `2px solid ${color}`, pb: 1, mb: 0.5 }}>
                    {name}
                </Typography>
                <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                    指挥官: {commanderName}
                </Typography>
            </Box>

            {/* [MUI v2 Grid Fix] 移除 item 属性，使用 size 对象属性 */}
            <Grid container spacing={1.5}>
                {stats.map(stat => (
                    <Grid size={{ xs: 6, sm: 4, md: 6 }} key={stat.label}>
                        {/* [修复] 在 Grid 中显式设置高度为 100% 以保持对齐 */}
                        <StatItem label={stat.label} value={stat.value} sx={{ height: '100%' }} />
                    </Grid>
                ))}
            </Grid>

            <Box>
                <Typography variant="h6" gutterBottom>高级指挥部</Typography>
                {generals.length > 0 ? (
                    <List dense sx={{ bgcolor: 'background.default', borderRadius: 1, p:1 }}>
                        {generals.map(gen => (
                            <ListItem key={gen.id} sx={{ bgcolor: 'background.paper', mb: 0.5, borderRadius: 1 }}>
                                <Stack direction="row" alignItems="center" spacing={1} width="100%">
                                    <StarIcon color="warning" fontSize="small"/>
                                    <Box flexGrow={1}>
                                        <Typography variant="body2" fontWeight="bold">{gen.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">驻扎: {gen.location}</Typography>
                                    </Box>
                                    <Tooltip title={gen.traitDesc}>
                                        <Chip label={gen.traitName} size="small" color="secondary" variant="outlined" />
                                    </Tooltip>
                                </Stack>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{fontStyle: 'italic'}}>暂无将领</Typography>
                )}
            </Box>

            {/* [修复] 为包含 StatItem 和进度条的容器添加 Flex 布局，确保高度正确计算 */}
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {/* 这里不传 height，让其自适应内容高度 */}
                <StatItem label="⚔️ 总兵力" value={armyBreakdown.total.toLocaleString()} />

                {armyBreakdown.total > 0 && (
                    <Tooltip title={`正规军: ${armyBreakdown.regulars.toLocaleString()} (${armyBreakdown.regularPercent.toFixed(1)}%) | 民兵: ${armyBreakdown.militia.toLocaleString()} (${armyBreakdown.militiaPercent.toFixed(1)}%)`}>
                        <Box sx={{ mt: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, px: 0.5 }}>
                                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 'bold' }}>正规军</Typography>
                                <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 'bold' }}>民兵</Typography>
                            </Box>
                            <Box sx={{ height: 12, width: '100%', bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 6, display: 'flex', overflow: 'hidden' }}>
                                <Box sx={{ width: `${armyBreakdown.regularPercent}%`, bgcolor: 'error.main', height: '100%', transition: 'width 0.5s ease', borderRight: armyBreakdown.militiaPercent > 0 ? '1px solid rgba(0,0,0,0.5)' : 'none' }} />
                                <Box sx={{ width: `${armyBreakdown.militiaPercent}%`, bgcolor: 'info.main', height: '100%', transition: 'width 0.5s ease' }} />
                            </Box>
                        </Box>
                    </Tooltip>
                )}
            </Box>

            <Box>
                <Typography variant="h6">控制的领土 ({controlledTerritories.length})</Typography>
                <List sx={{ maxHeight: 300, overflowY: 'auto', bgcolor: 'background.default', p: 1, borderRadius: 1 }}>
                    {controlledTerritories.length > 0 ? (
                        controlledTerritories.map(t => (
                            <ListItem key={t.id} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', p: 1.5 }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                    {t.name} {t.isCapital && '👑'} {t.hasGeneral && '⭐'}
                                </Typography>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                    {t.chips.map(chip => (
                                        <Chip key={chip.title} size="small" label={chip.label} title={chip.title} color={chip.color} variant={chip.variant || 'filled'} />
                                    ))}
                                </Stack>
                            </ListItem>
                        ))
                    ) : (
                        <ListItem><Typography color="text.secondary">无</Typography></ListItem>
                    )}
                </List>
            </Box>
        </Stack>
    );
}

export default FactionDetails;