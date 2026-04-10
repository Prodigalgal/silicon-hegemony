/**
 * @file MainMenu.jsx
 * @description 在线游戏的主菜单界面。
 * 提供创建房间和加入现有房间的入口。
 */
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useGameClient } from '../../hooks/useGameClient.js';
import { selectRoom } from '../../store/roomSlice';
import { selectUser, setName } from '../../store/userSlice';
import Lobby from './Lobby';
import RoomList from './RoomList';
import { Box, Button, Container, Paper, Stack, TextField, Typography, Divider, CircularProgress } from '@mui/material';
import { showSnackbar } from '../../store/uiSlice.js';

function MainMenu() {
    const [newRoomName, setNewRoomName] = useState("AI的宏伟竞技场");
    const [isCreating, setIsCreating] = useState(false);
    const gameClient = useGameClient();
    const { roomId } = useSelector(selectRoom);
    const { name: playerName } = useSelector(selectUser);
    const dispatch = useDispatch();

    if (roomId) { return <Lobby />; }

    const handleCreateRoom = async () => {
        if (!newRoomName.trim() || !playerName.trim()) {
            dispatch(showSnackbar({ message: "请输入有效的房间名和昵称！", severity: 'warning' }));
            return;
        }

        console.log(`[日志][MainMenu] 玩家 ${playerName} 尝试创建房间: ${newRoomName}`);
        setIsCreating(true);
        try {
            await gameClient.createRoom(newRoomName, true, 8);
            console.log(`[日志][MainMenu] 房间创建请求已发送。`);
        } catch (error) {
            console.error("[错误][MainMenu] 创建房间失败:", error);
            dispatch(showSnackbar({ message: "创建房间失败，请检查网络或稍后再试。", severity: 'error' }));
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 2 }}>
                <Stack spacing={4}>
                    <Typography variant="h3" component="h1" align="center" gutterBottom>
                        Silicon Hegemony - 在线对战
                    </Typography>

                    <Stack spacing={2} component={Paper} variant="outlined" sx={{ p: 3 }}>
                        <Typography variant="h5" component="h2">开始新的模拟</Typography>
                        <TextField
                            label="你的昵称"
                            variant="outlined"
                            value={playerName}
                            onChange={(e) => dispatch(setName(e.target.value))}
                            fullWidth
                        />
                        <TextField
                            label="新房间名称"
                            variant="outlined"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            fullWidth
                        />
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleCreateRoom}
                            disabled={isCreating}
                            startIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {isCreating ? '创建中...' : '创建并加入房间'}
                        </Button>
                    </Stack>

                    <Divider>
                        <Typography variant="overline">或者</Typography>
                    </Divider>

                    <Box>
                        <Typography variant="h5" component="h2" gutterBottom>加入一个已存在的房间</Typography>
                        <RoomList />
                    </Box>
                </Stack>
            </Paper>
        </Container>
    );
}
export default MainMenu;