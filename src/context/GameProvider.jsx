/**
 * @file GameProvider.jsx
 * @description (重构) 应用的顶层提供者，现已集成新的TerritoryGeometryProvider。
 */
import React, { useEffect, useState } from "react";
import { useStore, useDispatch } from "react-redux";
import { LocalGameClient } from "../services/client/LocalGameClient.js";
import { OnlineGameClient } from "../services/client/OnlineGameClient.js";
import GameLoopController from "../services/GameLoopController.js";
import AppRouter from "./AppRouter.jsx";
import { GameContext } from "./GameContext.jsx";
import { TerritoryGeometryProvider } from "./TerritoryGeometryContext.jsx";
import { Box, Button, CircularProgress, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import GroupsIcon from '@mui/icons-material/Groups';
import { showSnackbar } from '../store/uiSlice.js';

// 模式选择UI组件
const ModeSelectionScreen = ({ onSetMode, isConnecting }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', p: 2 }}>
        <Container maxWidth="md">
            <Paper elevation={6} sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
                <Typography variant="h2" component="h1" gutterBottom color="primary.main">欢迎来到 Silicon Hegemony</Typography>
                <Typography variant="h5" color="text.secondary" sx={{ mb: 5 }}>选择你的体验:</Typography>
                {/* [MUI v2 Grid Fix] 使用 size */}
                <Grid container spacing={4} justifyContent="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Button fullWidth variant="outlined" color="primary" onClick={() => onSetMode('local')} sx={{ p: 3, height: '100%', flexDirection: 'column' }}>
                            <Stack spacing={1} alignItems="center">
                                <ComputerIcon sx={{ fontSize: 40 }} />
                                <Typography variant="h4">本地游玩</Typography>
                                <Typography variant="body1" color="text.secondary">与可完全自定义的AI进行快速、离线的个人推演。</Typography>
                            </Stack>
                        </Button>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Button fullWidth variant="outlined" color="secondary" onClick={() => onSetMode('online')} disabled={isConnecting} sx={{ p: 3, height: '100%', flexDirection: 'column' }}>
                            <Stack spacing={1} alignItems="center">
                                <GroupsIcon sx={{ fontSize: 40 }} />
                                <Typography variant="h4">{isConnecting ? '连接中' : '联机游玩'}</Typography>
                                {isConnecting && <CircularProgress size={24} sx={{ mt: 1 }} color="inherit" />}
                                <Typography variant="body1" color="text.secondary">与朋友共同进入一个共享的虚拟世界，见证一场史诗博弈。</Typography>
                            </Stack>
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    </Box>
);

export function GameProvider() {
    const [gameMode, setGameMode] = useState(null); // 'local' or 'online'
    const [isConnecting, setIsConnecting] = useState(false);
    const [client, setClient] = useState(null);
    const store = useStore();
    const dispatch = useDispatch();

    useEffect(() => {
        let newClient = null;
        if (gameMode === 'local') {
            newClient = new LocalGameClient(store.dispatch, store.getState);
            setClient(newClient);
        } else if (gameMode === 'online') {
            setIsConnecting(true);
            newClient = OnlineGameClient.getInstance(store.dispatch, store.getState);
            newClient.connect()
                .then(() => {
                    setClient(newClient);
                })
                .catch(err => {
                    console.error("在线模式连接失败", err);
                    dispatch(showSnackbar({ message: '连接在线服务器失败。', severity: 'error' }));
                    setGameMode(null); // 连接失败则退回模式选择
                })
                .finally(() => {
                    setIsConnecting(false);
                });
        }

    }, [gameMode, store, dispatch]);

    const AppContent = () => (
        client ? (
            <TerritoryGeometryProvider>
                <AppRouter />
            </TerritoryGeometryProvider>
        ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Stack alignItems="center" spacing={2}><CircularProgress /><Typography>正在初始化游戏客户端...</Typography></Stack>
            </Box>
        )
    );

    return (
        <GameContext.Provider value={client}>
            {client && <GameLoopController />}
            {!gameMode ? <ModeSelectionScreen onSetMode={setGameMode} isConnecting={isConnecting} /> : <AppContent />}
        </GameContext.Provider>
    );
}
