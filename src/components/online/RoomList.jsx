/**
 * @file RoomList.jsx
 * @description 从服务器获取并显示可用房间列表的组件。
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useGameClient } from '../../hooks/useGameClient.js';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '../../store/userSlice';
import { showSnackbar } from '../../store/uiSlice';
import { SERVER_URL } from '../../game/constants';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Box, Typography, IconButton, Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

function RoomList() {
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const gameClient = useGameClient();
    const { name: playerName } = useSelector(selectUser);
    const dispatch = useDispatch();

    const fetchRooms = useCallback(async () => {
        console.log("[日志][RoomList] 开始获取房间列表...");
        setIsLoading(true);
        try {
            const response = await fetch(`${SERVER_URL}/api/rooms`);
            if (response.ok) {
                const roomData = await response.json();
                setRooms(roomData);
                console.log(`[日志][RoomList] 成功获取到 ${roomData.length} 个房间。`);
            } else {
                throw new Error(`服务器响应错误: ${response.status}`);
            }
        } catch (error) {
            console.error("[错误][RoomList] 获取房间列表失败:", error);
            dispatch(showSnackbar({ message: "无法获取房间列表，请检查网络连接。", severity: 'error' }));
        } finally {
            setIsLoading(false);
        }
    }, [dispatch]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const handleJoin = (roomId) => {
        if (playerName.trim()) {
            console.log(`[日志][RoomList] 玩家 ${playerName} 尝试加入房间 ${roomId}`);
            gameClient.joinRoom(roomId);
        } else {
            dispatch(showSnackbar({ message: "无法加入房间。请先在上方设置一个昵称。", severity: 'warning' }));
        }
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>正在加载房间列表...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Tooltip title="刷新列表">
                    <IconButton onClick={fetchRooms} disabled={isLoading}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>
            {rooms.length === 0 ? (
                <Typography sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>未找到可用房间。您可以创建一个新房间！</Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table aria-label="available rooms table">
                        <TableHead>
                            <TableRow>
                                <TableCell>房间名称</TableCell>
                                <TableCell align="right">玩家</TableCell>
                                <TableCell align="center">操作</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rooms.map((room) => (
                                <TableRow key={room.roomId} hover>
                                    <TableCell component="th" scope="row">{room.roomName}</TableCell>
                                    <TableCell align="right">{`${room.currentPlayerCount}/${room.maxPlayers}`}</TableCell>
                                    <TableCell align="center">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => handleJoin(room.roomId)}
                                            disabled={room.currentPlayerCount >= room.maxPlayers}
                                        >
                                            加入
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
export default RoomList;