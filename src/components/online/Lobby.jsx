/**
 * @file Lobby.jsx
 * @description 在线游戏的房间大厅组件。
 */
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectRoom } from '../../store/roomSlice';
import { selectUser } from '../../store/userSlice';
import { useGameClient } from '../../hooks/useGameClient';
import { showSnackbar } from '../../store/uiSlice';
import SetupScreen from '../SetupScreen';
import { Box, Button, Chip, Container, Grid, List, ListItem, ListItemIcon, ListItemText, Paper, Stack, Typography, Tooltip, IconButton, CircularProgress } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';

function Lobby() {
    const gameClient = useGameClient();
    const dispatch = useDispatch();
    const { roomId, roomName, hostPlayerId, players, factionsConfig } = useSelector(selectRoom);
    const { id: myId } = useSelector(selectUser);
    const myPlayerInfo = players.find(p => p.id === myId);
    const isHost = myId === hostPlayerId;
    const allReady = players.length > 1 && players.every(p => p.isReady);

    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [copied, setCopied] = useState(false);

    const claimedFactions = players.map(p => p.factionId).filter(Boolean);
    const availableFactions = Array.from({length: 8}, (_, i) => `faction_${i+1}`)
        .filter(fid => !claimedFactions.includes(fid));

    const handleStartGame = () => {
        console.log("[日志][Lobby] 主机尝试开始游戏。");
        if (isHost && allReady) {
            gameClient.startGame();
            console.log("[日志][Lobby] 开始游戏指令已发送。");
        } else {
            const errorMsg = '需要至少2名玩家且所有玩家都已准备！';
            dispatch(showSnackbar({ message: errorMsg, severity: 'warning' }));
            console.warn(`[日志][Lobby] 开始游戏失败: ${errorMsg}`);
        }
    };

    const handleCopyRoomId = () => {
        navigator.clipboard.writeText(roomId).then(() => {
            console.log("[日志][Lobby] 房间ID已复制到剪贴板。");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleEnterConfig = () => {
        console.log(`[日志][Lobby] 玩家 ${myId} 进入AI配置界面。`);
        setIsConfiguring(true);
        gameClient.setPlayerStatus('configuring_ai');
    };

    const handleExitConfig = () => {
        console.log(`[日志][Lobby] 玩家 ${myId} 取消或退出AI配置。`);
        setIsConfiguring(false);
        gameClient.setPlayerStatus('idle');
    };

    const handleSaveConfig = (config) => {
        console.log(`[日志][Lobby] 玩家 ${myId} 尝试保存AI配置:`, config);
        setIsSavingConfig(true);
        gameClient.sendFactionConfig(myPlayerInfo.factionId, config);
        // 服务器会通过状态更新来确认，UI在此处立即反馈，并在配置模式退出时重置状态
        setTimeout(() => {
            handleExitConfig();
            setIsSavingConfig(false);
            console.log(`[日志][Lobby] AI配置已发送，UI状态重置。`);
        }, 1000); // 模拟网络延迟和处理时间
    };

    if (isConfiguring && myPlayerInfo?.factionId) {
        return (
            <div className="app-container">
                <SetupScreen
                    isSingleFactionMode={true}
                    factionIdToConfigure={myPlayerInfo.factionId}
                    initialConfig={factionsConfig[myPlayerInfo.factionId]}
                    onConfigSave={handleSaveConfig}
                    onCancel={handleExitConfig}
                    isSaving={isSavingConfig}
                />
            </div>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">{roomName}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 4 }}>
                    <Typography variant="subtitle1" color="text.secondary">房间ID:</Typography>
                    <Chip label={roomId} variant="outlined" sx={{ mx: 1, fontSize: '1.1rem', borderColor: 'primary.main' }} />
                    <Tooltip title={copied ? "已复制!" : "复制ID"}>
                        <IconButton onClick={handleCopyRoomId} size="small">
                            <ContentCopyIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Grid container spacing={4}>
                    {/* [MUI v2 Grid Fix] 使用 size */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Typography variant="h6" gutterBottom>玩家列表 ({players.length}/8)</Typography>
                        <List component={Paper} variant="outlined" sx={{ bgcolor: 'background.default' }}>
                            {players.map(p => {
                                let statusIcon, statusChip;
                                if (p.status === 'configuring_ai') {
                                    statusIcon = <EditIcon color="warning" />;
                                    statusChip = <Chip label='配置中...' color='warning' size="small" />;
                                } else {
                                    statusIcon = p.isReady ? <CheckCircleIcon color="success" /> : <CancelIcon color="disabled" />;
                                    statusChip = <Chip label={p.isReady ? '已准备' : '未准备'} color={p.isReady ? 'success' : 'default'} size="small" />;
                                }

                                return (
                                    <ListItem key={p.id} divider sx={{ bgcolor: p.id === myId ? 'rgba(255, 255, 255, 0.08)' : 'transparent' }}>
                                        <ListItemIcon>{statusIcon}</ListItemIcon>
                                        <ListItemText
                                            primary={`${p.name} ${p.id === hostPlayerId ? '👑' : ''}`}
                                            secondary={p.factionId ? (factionsConfig[p.factionId]?.name || p.factionId) : '观战'}
                                            primaryTypographyProps={{ fontWeight: 'bold' }}
                                            secondaryTypographyProps={{ color: factionsConfig[p.factionId]?.color || 'text.secondary' }}
                                        />
                                        {statusChip}
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="h6" gutterBottom>
                            {myPlayerInfo?.factionId ? `你已认领: ${factionsConfig[myPlayerInfo.factionId]?.name}` : "认领你的势力"}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {!myPlayerInfo?.factionId && availableFactions.map(fid => (
                                <Button key={fid} variant="outlined" onClick={() => {
                                    console.log(`[日志][Lobby] 玩家 ${myId} 认领势力 ${fid}`);
                                    gameClient.claimFaction(fid);
                                }}
                                        sx={{ borderColor: factionsConfig[fid]?.color, color: factionsConfig[fid]?.color }}>
                                    {factionsConfig[fid]?.name || fid}
                                </Button>
                            ))}
                        </Box>
                    </Grid>
                </Grid>

                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                    <Button variant="outlined" onClick={handleEnterConfig} disabled={!myPlayerInfo?.factionId || isConfiguring}>
                        配置AI策略
                    </Button>
                    <Button variant="contained" onClick={() => {
                        const nextReadyState = !myPlayerInfo?.isReady;
                        console.log(`[日志][Lobby] 玩家 ${myId} 设置准备状态为: ${nextReadyState}`);
                        gameClient.setReady(nextReadyState);
                    }} color={myPlayerInfo?.isReady ? 'secondary' : 'primary'}>
                        {myPlayerInfo?.isReady ? '取消准备' : '准备就绪'}
                    </Button>
                    {isHost && (
                        <Button variant="contained" color="success" onClick={handleStartGame} disabled={!allReady} sx={{ fontWeight: 'bold' }}>
                            开始游戏
                        </Button>
                    )}
                </Stack>
            </Paper>
        </Container>
    );
}
export default Lobby;