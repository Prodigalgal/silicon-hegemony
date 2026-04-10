/**
 * @file src/components/InfoPanel.jsx
 * @description (修复) 修正了控制逻辑，使用 togglePause action 来控制游戏。
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectGameData, selectCurrentFaction } from '../store/selectors';
import { togglePause } from '../store/gameSlice'; // [新增]
import { useGameClient } from '../hooks/useGameClient.js';
import { selectHistory } from '../store/historySlice';
import TimelineScrubber from './TimelineScrubber';
import FactionDetails from './FactionDetails';
import PlayerActionPanel from './PlayerActionPanel';
import { Box, Button, ButtonGroup, Divider, FormControl, InputLabel, MenuItem, Select, Typography, Tabs, Tab, Stack, CircularProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

// 懒加载 HistoryChart 组件
const HistoryChart = React.lazy(() => import('./HistoryChart'));

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel" hidden={value !== index}
            id={`info-tabpanel-${index}`} aria-labelledby={`info-tab-${index}`}
            {...other}
            style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            {value === index && (
                <Box sx={{ pt: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 1 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function InfoPanel({ liveGameStatus }) {
    const gameClient = useGameClient();
    const dispatch = useDispatch(); // [新增]
    const { snapshots } = useSelector(selectHistory);
    const { factions, gameStatus } = useSelector(selectGameData);
    const isPaused = useSelector(state => state.game.isPaused); // [新增]
    const currentFaction = useSelector(selectCurrentFaction);

    const [selectedFactionId, setSelectedFactionId] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        const factionList = Object.values(factions || {});
        if (factionList.length > 0 && !selectedFactionId) {
            setSelectedFactionId(factionList[0].id);
        }
    }, [factions, selectedFactionId]);

    // [核心修复] 使用 togglePause 替代 setSimulationSpeed
    const handlePauseToggle = () => {
        console.log("[日志][InfoPanel] 用户切换暂停状态。");
        dispatch(togglePause());
    };

    const handleReset = () => {
        gameClient?.resetGame();
    };

    const handleTabChange = (event, newValue) => setActiveTab(newValue);

    if (gameStatus === 'awaiting_human_input' && currentFaction?.isHuman) {
        return <PlayerActionPanel />;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Tabs value={activeTab} onChange={handleTabChange} aria-label="info panel tabs" variant="fullWidth">
                    <Tab label="全局" id="info-tab-0" />
                    <Tab label="图表" id="info-tab-1" />
                    <Tab label="势力" id="info-tab-2" />
                    <Tab label="百科" id="info-tab-3" disabled />
                </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h6" gutterBottom>游戏控制</Typography>
                        <Stack direction="row" spacing={1} justifyContent="space-between" flexWrap="wrap">
                            {/* [核心修复] 按钮逻辑现在基于 isPaused 状态 */}
                            <Button
                                variant="contained"
                                onClick={handlePauseToggle}
                                color={isPaused ? "success" : "warning"}
                                startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                                disabled={liveGameStatus === 'setup' || liveGameStatus === 'finished'}
                                sx={{ minWidth: '100px' }}
                            >
                                {isPaused ? '继续' : '暂停'}
                            </Button>

                            <Button
                                variant="outlined"
                                color="error"
                                onClick={handleReset}
                                startIcon={<RestartAltIcon />}
                            >
                                重置
                            </Button>
                        </Stack>
                    </Box>
                    <Divider />
                    <Box>
                        <Typography variant="h6" gutterBottom>历史回溯</Typography>
                        <TimelineScrubber />
                    </Box>
                </Stack>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
                <Suspense fallback={<Box sx={{display: 'flex', justifyContent: 'center', p: 4}}><CircularProgress /><Typography sx={{ml: 2}}>加载图表...</Typography></Box>}>
                    <HistoryChart snapshots={snapshots} />
                </Suspense>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
                <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                        <InputLabel>查看势力</InputLabel>
                        <Select
                            value={selectedFactionId}
                            label="查看势力"
                            onChange={(e) => setSelectedFactionId(e.target.value)}
                            disabled={Object.keys(factions || {}).length === 0}
                        >
                            {Object.values(factions || {}).map(f => (
                                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FactionDetails selectedFactionId={selectedFactionId} />
                </Stack>
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
                <Typography sx={{p: 2, textAlign: 'center', color: 'text.secondary'}}>
                    游戏机制、单位和建筑的详细说明将在此处提供。
                </Typography>
            </TabPanel>
        </Box>
    );
}

export default InfoPanel;