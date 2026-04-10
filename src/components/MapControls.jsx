/**
 * @file MapControls.jsx
 * @description [v1.6] 增加赛博视图。
 */
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setMapMode } from '../store/gameSlice';
import { selectMapMode } from '../store/selectors';
import { Paper, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import CellTowerIcon from '@mui/icons-material/CellTower'; // Cyber icon

function MapControls() {
    const dispatch = useDispatch();
    const mapMode = useSelector(selectMapMode);

    const handleFormat = (event, newMode) => {
        if (newMode !== null) {
            dispatch(setMapMode(newMode));
        }
    };

    return (
        <Paper
            elevation={4}
            sx={{
                display: 'flex',
                border: (theme) => `1px solid ${theme.palette.divider}`,
                backgroundColor: 'rgba(26, 28, 32, 0.9)',
                backdropFilter: 'blur(4px)',
                borderRadius: 10,
            }}
        >
            <ToggleButtonGroup
                value={mapMode}
                exclusive
                onChange={handleFormat}
                aria-label="map mode"
                size="small"
                sx={{ p: 0.5 }}
            >
                <Tooltip title="政治视图">
                    <ToggleButton value="POLITICAL" aria-label="political"><PublicIcon /></ToggleButton>
                </Tooltip>
                <Tooltip title="补给网络">
                    <ToggleButton value="SUPPLY" aria-label="supply"><LocalShippingIcon /></ToggleButton>
                </Tooltip>
                <Tooltip title="经济热力图">
                    <ToggleButton value="ECONOMIC" aria-label="economic"><MonetizationOnIcon /></ToggleButton>
                </Tooltip>
                <Tooltip title="军事部署">
                    <ToggleButton value="MILITARY" aria-label="military"><MilitaryTechIcon /></ToggleButton>
                </Tooltip>
                {/* [v1.6] */}
                <Tooltip title="赛博网络">
                    <ToggleButton value="CYBER" aria-label="cyber"><CellTowerIcon /></ToggleButton>
                </Tooltip>
            </ToggleButtonGroup>
        </Paper>
    );
}

export default MapControls;