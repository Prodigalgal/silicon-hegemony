/* src/components/GameView.jsx */
import React from 'react';
import { useSelector } from 'react-redux';
import { selectGameData } from '../store/selectors';
import { selectHistory } from '../store/historySlice';
import { useGameSnapshots } from '../hooks/useGameSnapshots';
import GameMap from './GameMap';
import InfoPanel from './InfoPanel';
import EventLogPanel from './EventLogPanel';
import MapControls from './MapControls';
import { Box, Paper, Typography, useTheme, Alert, Fade, LinearProgress } from '@mui/material';

function GameView() {
    useGameSnapshots();
    const theme = useTheme();

    const liveGameData = useSelector(selectGameData);
    const { snapshots, viewingTurn } = useSelector(selectHistory);

    const displayedData = (viewingTurn === -1 || viewingTurn >= snapshots.length)
        ? liveGameData
        : snapshots[viewingTurn];

    if (!displayedData) return (
        <Box sx={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
            <LinearProgress sx={{ width: '20%' }} />
        </Box>
    );

    const { log, factions, turn, winner, gameStatus, activeCrisis } = displayedData;
    const turnNumber = turn?.number || turn || 0;

    // HUD 风格面板
    const hudPanelStyle = {
        position: 'absolute',
        top: 20,
        bottom: 20,
        width: 400, // 稍微加宽以容纳更多信息
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
        backgroundColor: 'rgba(13, 16, 20, 0.85)', // 更深色背景
        // 顶部彩色线条装饰
        borderTop: '2px solid',
        borderColor: 'primary.main',
        borderRadius: 0, // 直角设计更符合科幻感
        // 底部倒角 (使用 clip-path 模拟)
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)',
    };

    return (
        <Box sx={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>

            {/* 1. 底层：全屏地图 */}
            <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <GameMap data={displayedData} />
            </Box>

            {/* 2. 左侧 HUD：通讯/日志 */}
            <Paper sx={{ ...hudPanelStyle, left: 20, borderColor: 'secondary.main' }} elevation={0}>
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <Typography variant="h6" color="secondary.main">COMMS LOG // T{turnNumber}</Typography>
                </Box>
                <Box sx={{ p: 2, flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <EventLogPanel log={log || []} factions={factions || {}} turn={turnNumber} />
                </Box>
            </Paper>

            {/* 3. 右侧 HUD：指挥/情报 */}
            <Paper sx={{ ...hudPanelStyle, right: 20, borderColor: 'primary.main' }} elevation={0}>
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <Typography variant="h6" color="primary.main">COMMAND CENTER</Typography>
                </Box>
                <Box sx={{ p: 2, flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <InfoPanel liveGameStatus={gameStatus} />
                </Box>
            </Paper>

            {/* 4. 底部悬浮栏：地图模式切换 */}
            <Box sx={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 12 }}>
                <MapControls />
            </Box>

            {/* 5. 顶部：危机横幅 */}
            {activeCrisis && (
                <Fade in={true}>
                    <Box sx={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 20, width: '600px' }}>
                        <Alert
                            variant="filled"
                            severity="error"
                            sx={{
                                border: '1px solid #ff1744',
                                bgcolor: 'rgba(213, 0, 0, 0.9)',
                                boxShadow: '0 0 20px rgba(255, 23, 68, 0.5)',
                                '& .MuiAlert-icon': { fontSize: 30 }
                            }}
                        >
                            <Typography variant="h6" fontWeight="bold">⚠ GLOBAL CRISIS: {activeCrisis.name}</Typography>
                            <Typography variant="body2">{activeCrisis.description}</Typography>
                            <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.8 }}>预计持续: {activeCrisis.duration} 回合</Typography>
                        </Alert>
                    </Box>
                </Fade>
            )}

            {/* 6. 胜利弹窗 */}
            {winner && (
                <Box sx={{
                    position: 'absolute', inset: 0, zIndex: 1200,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)'
                }}>
                    <Paper
                        elevation={24}
                        sx={{
                            p: 8, textAlign: 'center',
                            background: 'linear-gradient(180deg, rgba(0,20,30,0.95) 0%, rgba(0,10,15,0.95) 100%)',
                            border: `1px solid ${theme.palette.primary.main}`,
                            boxShadow: `0 0 50px ${theme.palette.primary.main}80`
                        }}
                    >
                        <Typography variant="h1" sx={{ color: 'primary.main', textShadow: '0 0 20px currentColor', mb: 2 }}>VICTORY</Typography>
                        <Typography variant="h4" color="text.primary">{winner.name} 已达成最终霸权</Typography>
                    </Paper>
                </Box>
            )}
        </Box>
    );
}

export default GameView;