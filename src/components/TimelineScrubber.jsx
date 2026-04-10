/**
 * @file TimelineScrubber.jsx
 * @description 历史回溯滑块组件。
 * [重构后] 修复了显示逻辑，并使用MUI组件进行了美化。
 */
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setViewingTurn, selectHistory } from '../store/historySlice';
import { Box, Typography, Slider, Button } from '@mui/material';

function TimelineScrubber() {
    const dispatch = useDispatch();
    const { snapshots, viewingTurn } = useSelector(selectHistory);

    if (snapshots.length < 2) {
        return null;
    }

    const maxTurnIndex = snapshots.length - 1;
    const sliderValue = viewingTurn === -1 ? maxTurnIndex : viewingTurn;

    const handleSliderChange = (e, newValue) => {
        console.log(`[日志][TimelineScrubber] 滑块值改变，正在查看回合索引: ${newValue}`);
        dispatch(setViewingTurn(newValue));
    };

    const handleLiveClick = () => {
        console.log("[日志][TimelineScrubber] 用户点击返回实时视图。");
        dispatch(setViewingTurn(-1));
    };

    // [核心修复] 健壮地获取要显示的回合数
    const getTurnNumber = (index) => snapshots[index]?.turn?.number ?? snapshots[index]?.turn ?? 0;

    const displayedTurnNumber = viewingTurn === -1
        ? getTurnNumber(maxTurnIndex)
        : getTurnNumber(viewingTurn);

    const label = viewingTurn === -1 ? `实时 (T${displayedTurnNumber})` : `回溯 (T${displayedTurnNumber})`;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
            <Typography variant="body2" sx={{ minWidth: '120px' }}>{label}</Typography>
            <Slider
                aria-label="Turn Scrubber"
                value={sliderValue}
                onChange={handleSliderChange}
                min={0}
                max={maxTurnIndex}
                step={1}
                marks
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `T${getTurnNumber(value)}`}
                disabled={snapshots.length === 0}
            />
            <Button
                variant="outlined"
                size="small"
                onClick={handleLiveClick}
                disabled={viewingTurn === -1}
                sx={{ ml: 2 }}
            >
                返回实时
            </Button>
        </Box>
    );
}

export default TimelineScrubber;