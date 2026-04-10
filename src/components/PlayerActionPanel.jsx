/**
 * @file PlayerActionPanel.jsx
 * @description (重构 v1.6) 集成赛博行动。
 */
import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { executeFactionTurn } from '../store/gameSlice';
import { showSnackbar } from '../store/uiSlice';
import {
    ACTION_TYPES,
    ACTION_POINT_COSTS,
    RECRUITMENT_POLICIES,
    TAX_RATES,
    ESPIONAGE_SUBTYPES,
    TECH_DOCTRINES,
    COSTS
} from '../game/constants';
import { getAdjacentTerritories } from '../game/mapUtils';
import { actionValidationRules } from '../game/actionValidation.js';
import {
    Box, Button, FormControl, InputLabel, Select, MenuItem, TextField,
    List, ListItem, ListItemText, IconButton, Typography, Paper, Stack, Divider, Tooltip, Chip,
    Alert
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';

const actionGroups = {
    "军事行动": { actions: [ACTION_TYPES.ATTACK, ACTION_TYPES.MOVE, ACTION_TYPES.RECRUIT, ACTION_TYPES.MOVE_SUPPLY], color: "error" },
    "指挥与科技": { actions: [ACTION_TYPES.CHOOSE_DOCTRINE, ACTION_TYPES.RESEARCH_DOCTRINE, ACTION_TYPES.RECRUIT_GENERAL, ACTION_TYPES.MOVE_GENERAL], color: "secondary" },
    "经济与建设": { actions: [ACTION_TYPES.BUILD_FACTORY, ACTION_TYPES.BUILD_CIVILIAN_FACTORY, ACTION_TYPES.BUILD_SUPPLY_DEPOT, ACTION_TYPES.BUILD_FORTIFICATION, ACTION_TYPES.SET_TAX_RATE], color: "success" },
    "赛博战争": { actions: [ACTION_TYPES.CYBER_ATTACK_BLACKOUT, ACTION_TYPES.CYBER_ATTACK_HEIST, ACTION_TYPES.CYBER_ATTACK_DEEPFAKE], color: "primary" }, // [v1.6]
    "内政与宣传": { actions: [ACTION_TYPES.BUILD_PROPAGANDA_TOWER, ACTION_TYPES.PROPAGANDA, ACTION_TYPES.LOBBYING], color: "info" },
    "外交与谍报": { actions: [ACTION_TYPES.PROPOSE_NON_AGGRESSION_PACT, ACTION_TYPES.PROPOSE_TRADE_AGREEMENT, ACTION_TYPES.SCOUT, ACTION_TYPES.ESPIONAGE], color: "warning" },
};

const PlayerActionPanel = () => {
    const dispatch = useDispatch();
    const { factions, territories, activeFactionId, turn } = useSelector(state => state.game.game);

    const activeFaction = factions[activeFactionId];
    const playerTerritories = useMemo(() => Object.values(territories).filter(t => t.owner === activeFactionId), [territories, activeFactionId]);
    const otherFactions = useMemo(() => Object.values(factions).filter(f => f.id !== activeFactionId), [factions, activeFactionId]);

    const [stagedActions, setStagedActions] = useState([]);
    const [currentActionType, setCurrentActionType] = useState(ACTION_TYPES.ATTACK);
    const [currentParams, setCurrentParams] = useState({});

    const selectActionType = (type) => {
        setCurrentActionType(type);
        setCurrentParams({});
    };

    const remainingAP = useMemo(() => {
        return stagedActions.reduce((ap, action) => ap - (ACTION_POINT_COSTS[action.type] || 0), activeFaction?.actionPoints || 0);
    }, [stagedActions, activeFaction]);

    const handleParamChange = (field, value) => {
        setCurrentParams(prev => ({...prev, [field]: value }));
    };

    const handleAddAction = () => {
        const validationRule = actionValidationRules[currentActionType];
        if (validationRule) {
            const errorMessage = validationRule(currentParams, { territories });
            if (errorMessage) {
                dispatch(showSnackbar({ message: `输入无效: ${errorMessage}`, severity: 'warning' }));
                return;
            }
        }

        const cost = ACTION_POINT_COSTS[currentActionType] || 0;
        if (remainingAP < cost) {
            dispatch(showSnackbar({ message: "行动点数不足！", severity: 'error' }));
            return;
        }

        // [v1.6] 检查算力成本 (简单预判，严格检查在后端)
        let cpCost = 0;
        if (currentActionType === ACTION_TYPES.CYBER_ATTACK_BLACKOUT) cpCost = COSTS.CYBER_BLACKOUT;
        if (currentActionType === ACTION_TYPES.CYBER_ATTACK_HEIST) cpCost = COSTS.CYBER_HEIST;
        if (currentActionType === ACTION_TYPES.CYBER_ATTACK_DEEPFAKE) cpCost = COSTS.CYBER_DEEPFAKE;

        if (cpCost > 0 && activeFaction.computing_power < cpCost) {
            dispatch(showSnackbar({ message: `算力不足！需要 ${cpCost} CP。`, severity: 'error' }));
            return;
        }

        const newAction = { type: currentActionType, ...currentParams };
        setStagedActions([...stagedActions, newAction]);
        dispatch(showSnackbar({ message: `行动 ${currentActionType} 已添加`, severity: 'success' }));
        setCurrentParams({});
    };

    const handleRemoveAction = (index) => {
        setStagedActions(stagedActions.filter((_, i) => i !== index));
    };

    const handleEndTurn = () => {
        const payload = {
            factionId: activeFactionId,
            actions: stagedActions,
            justification: "玩家手动操作。",
            diplomatic_responses: [],
            long_term_goal: activeFaction.longTermGoal,
            short_term_objective: "执行玩家的指令。"
        };
        dispatch(executeFactionTurn(payload));
    };

    const formatAction = (action) => {
        let details = [];
        if (action.from_territory_id) details.push(`从 ${action.from_territory_id}`);
        if (action.to_territory_id) details.push(`到 ${action.to_territory_id}`);
        if (action.territory_id) details.push(`在 ${action.territory_id}`);
        if (action.target_territory_id) details.push(`对 ${action.target_territory_id}`);
        if (action.target_faction_id) details.push(`向 ${factions[action.target_faction_id]?.name}`);
        if (action.army_to_send) details.push(`派兵 R:${action.army_to_send.regulars || 0}, M:${action.army_to_send.militia || 0}`);
        if (action.army_amount) details.push(`移动 ${action.army_amount} 正规军`);
        if (action.supply_amount) details.push(`运输 ${action.supply_amount} 补给`);
        if (action.policy) details.push(`政策: ${action.policy}`);
        if (action.rate) details.push(`税率: ${action.rate}`);
        if (action.subtype) details.push(`行动: ${action.subtype}`);
        if (action.doctrine) details.push(`路线: ${TECH_DOCTRINES[action.doctrine]?.name}`);
        if (action.general_id) {
            const gen = activeFaction.generals.find(g => g.id === action.general_id);
            details.push(`将领: ${gen ? gen.name : 'Unknown'}`);
        }

        const groupInfo = Object.values(actionGroups).find(g => g.actions.includes(action.type));

        return (
            <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={action.type} color={groupInfo?.color || "default"} size="small" />
                <Typography variant="body2" sx={{color: 'text.secondary'}} noWrap>{details.join(', ')}</Typography>
            </Stack>
        );
    };

    const renderParamInputs = () => {
        const fromTerritory = territories[currentParams.from_territory_id];
        const adjacentTerritories = fromTerritory ? getAdjacentTerritories(fromTerritory.id) : [];

        switch (currentActionType) {
            // ... (Military, Move, Recruit, Build, Diplo logic is same, omitted for brevity) ...
            case ACTION_TYPES.ATTACK:
                return (
                    <Stack spacing={1.5}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>出发地</InputLabel>
                            <Select value={currentParams.from_territory_id || ''} label="出发地" onChange={e => handleParamChange('from_territory_id', e.target.value)}>
                                {playerTerritories.filter(t => t.army.regulars > 0 || t.army.militia > 0).map(t => <MenuItem key={t.id} value={t.id}>{`${t.id} (R:${t.army.regulars}, M:${t.army.militia})`}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth disabled={!fromTerritory}>
                            <InputLabel>目的地</InputLabel>
                            <Select value={currentParams.to_territory_id || ''} label="目的地" onChange={e => handleParamChange('to_territory_id', e.target.value)}>
                                {adjacentTerritories.filter(id => territories[id]?.owner !== activeFactionId).map(id => <MenuItem key={id} value={id}>{id}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Stack direction="row" spacing={1}>
                            <TextField size="small" type="number" label="正规军" sx={{flexGrow: 1}} value={currentParams.army_to_send?.regulars || ''} onChange={e => handleParamChange('army_to_send', {...currentParams.army_to_send, regulars: parseInt(e.target.value, 10) || 0})} disabled={!fromTerritory} InputProps={{ inputProps: { min: 0, max: fromTerritory?.army.regulars || 0 }}} />
                            <TextField size="small" type="number" label="民兵" sx={{flexGrow: 1}} value={currentParams.army_to_send?.militia || ''} onChange={e => handleParamChange('army_to_send', {...currentParams.army_to_send, militia: parseInt(e.target.value, 10) || 0})} disabled={!fromTerritory} InputProps={{ inputProps: { min: 0, max: fromTerritory?.army.militia || 0 }}} />
                        </Stack>
                    </Stack>
                );
            case ACTION_TYPES.MOVE:
                return (
                    <Stack spacing={1.5}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>出发地</InputLabel>
                            <Select value={currentParams.from_territory_id || ''} label="出发地" onChange={e => handleParamChange('from_territory_id', e.target.value)}>
                                {playerTerritories.filter(t => t.army.regulars > 0).map(t => <MenuItem key={t.id} value={t.id}>{`${t.id} (R:${t.army.regulars})`}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth disabled={!fromTerritory}>
                            <InputLabel>目的地</InputLabel>
                            <Select value={currentParams.to_territory_id || ''} label="目的地" onChange={e => handleParamChange('to_territory_id', e.target.value)}>
                                {adjacentTerritories.filter(id => territories[id]?.owner === activeFactionId).map(id => <MenuItem key={id} value={id}>{id}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" type="number" label="移动数量" value={currentParams.army_amount || ''} onChange={e => handleParamChange('army_amount', parseInt(e.target.value, 10) || 0)} disabled={!fromTerritory} InputProps={{ inputProps: { min: 0, max: fromTerritory?.army.regulars || 0 }}} />
                    </Stack>
                );
            case ACTION_TYPES.MOVE_SUPPLY:
                return (
                    <Stack spacing={1.5}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>出发地</InputLabel>
                            <Select value={currentParams.from_territory_id || ''} label="出发地" onChange={e => handleParamChange('from_territory_id', e.target.value)}>
                                {playerTerritories.filter(t => t.supply > 0).map(t => <MenuItem key={t.id} value={t.id}>{`${t.id} (补给:${t.supply})`}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth disabled={!fromTerritory}>
                            <InputLabel>目的地</InputLabel>
                            <Select value={currentParams.to_territory_id || ''} label="目的地" onChange={e => handleParamChange('to_territory_id', e.target.value)}>
                                {adjacentTerritories.filter(id => territories[id]?.owner === activeFactionId).map(id => <MenuItem key={id} value={id}>{id}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" type="number" label="运输数量" value={currentParams.supply_amount || ''} onChange={e => handleParamChange('supply_amount', parseInt(e.target.value, 10) || 0)} disabled={!fromTerritory} InputProps={{ inputProps: { min: 0, max: fromTerritory?.supply || 0 }}} />
                    </Stack>
                );
            case ACTION_TYPES.RECRUIT:
                return (
                    <Stack spacing={1.5}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>目标领土</InputLabel>
                            <Select value={currentParams.territory_id || ''} label="目标领土" onChange={e => handleParamChange('territory_id', e.target.value)}>
                                {playerTerritories.map(t => <MenuItem key={t.id} value={t.id}>{t.id}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth>
                            <InputLabel>征兵政策</InputLabel>
                            <Select value={currentParams.policy || ''} label="征兵政策" onChange={e => handleParamChange('policy', e.target.value)}>
                                {Object.keys(RECRUITMENT_POLICIES).map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                );
            case ACTION_TYPES.SET_TAX_RATE:
                return (
                    <FormControl size="small" fullWidth>
                        <InputLabel>税率</InputLabel>
                        <Select value={currentParams.rate || ''} label="税率" onChange={e => handleParamChange('rate', e.target.value)}>
                            {Object.keys(TAX_RATES).map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </Select>
                    </FormControl>
                );
            case ACTION_TYPES.PROPOSE_NON_AGGRESSION_PACT:
            case ACTION_TYPES.PROPOSE_TRADE_AGREEMENT:
                return (
                    <FormControl size="small" fullWidth>
                        <InputLabel>目标势力</InputLabel>
                        <Select value={currentParams.to_faction_id || ''} label="目标势力" onChange={e => handleParamChange('to_faction_id', e.target.value)}>
                            {otherFactions.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                );
            case ACTION_TYPES.ESPIONAGE:
                return (
                    <Stack spacing={1.5}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>行动类型</InputLabel>
                            <Select value={currentParams.subtype || ''} label="行动类型" onChange={e => handleParamChange('subtype', e.target.value)}>
                                {Object.values(ESPIONAGE_SUBTYPES).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                        {currentParams.subtype === ESPIONAGE_SUBTYPES.STEAL_FUNDS ? (
                            <FormControl size="small" fullWidth>
                                <InputLabel>目标势力</InputLabel>
                                <Select value={currentParams.target_faction_id || ''} label="目标势力" onChange={e => handleParamChange('target_faction_id', e.target.value)}>
                                    {otherFactions.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        ) : (
                            <FormControl size="small" fullWidth>
                                <InputLabel>目标领土</InputLabel>
                                <Select value={currentParams.target_territory_id || ''} label="目标领土" onChange={e => handleParamChange('target_territory_id', e.target.value)}>
                                    {Object.values(territories).filter(t => t.owner && t.owner !== activeFactionId).map(t => <MenuItem key={t.id} value={t.id}>{t.id}</MenuItem>)}
                                </Select>
                            </FormControl>
                        )}
                    </Stack>
                );
            case ACTION_TYPES.CHOOSE_DOCTRINE:
                if (activeFaction.doctrine) return <Alert severity="info">你已选择了战略路线：{TECH_DOCTRINES[activeFaction.doctrine].name}</Alert>;
                return (
                    <FormControl size="small" fullWidth>
                        <InputLabel>战略路线</InputLabel>
                        <Select value={currentParams.doctrine || ''} label="战略路线" onChange={e => handleParamChange('doctrine', e.target.value)}>
                            {Object.entries(TECH_DOCTRINES).map(([key, doc]) => (
                                <MenuItem key={key} value={key}>
                                    <Box>
                                        <Typography variant="subtitle2">{doc.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{doc.description}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                );
            case ACTION_TYPES.RESEARCH_DOCTRINE: {
                if (!activeFaction.doctrine) return <Alert severity="warning">请先选择战略路线！</Alert>;
                const nextLevel = activeFaction.techLevel + 1;
                const docConfig = TECH_DOCTRINES[activeFaction.doctrine];
                if (nextLevel > docConfig.levels.length) return <Alert severity="success">科技已升至顶级！</Alert>;

                let resCost = COSTS.DOCTRINE_LEVEL_BASE * nextLevel;
                if (activeFaction.doctrine === 'TECHNOCRACY' && activeFaction.techLevel >= 1) resCost = Math.floor(resCost * 0.85);

                return (
                    <Box>
                        <Typography variant="body2" gutterBottom>当前等级: {activeFaction.techLevel} / {docConfig.levels.length}</Typography>
                        <Typography variant="body2" sx={{fontWeight:'bold'}}>下一级: {docConfig.levels[nextLevel-1].name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>效果: {docConfig.levels[nextLevel-1].effect}</Typography>
                        <Chip label={`成本: ${resCost} 金钱`} color={activeFaction.money >= resCost ? "success" : "error"} variant="outlined" size="small" />
                    </Box>
                );
            }
            case ACTION_TYPES.RECRUIT_GENERAL: {
                let genCost = COSTS.RECRUIT_GENERAL;
                if (activeFaction.doctrine === 'TECHNOCRACY' && activeFaction.techLevel >= 1) genCost = Math.floor(genCost * 0.85);
                return (
                    <Stack spacing={2}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>任命领土</InputLabel>
                            <Select value={currentParams.territory_id || ''} label="任命领土" onChange={e => handleParamChange('territory_id', e.target.value)}>
                                {playerTerritories.filter(t => !t.generalId).map(t => <MenuItem key={t.id} value={t.id}>{t.id}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Chip label={`成本: ${genCost} 金钱`} color={activeFaction.money >= genCost ? "success" : "error"} variant="outlined" size="small" />
                    </Stack>
                );
            }
            case ACTION_TYPES.MOVE_GENERAL: {
                const generals = activeFaction.generals || [];
                if (generals.length === 0) return <Alert severity="warning">你还没有将领。</Alert>;
                const selectedGen = generals.find(g => g.id === currentParams.general_id);
                const validDestinations = playerTerritories.filter(t => !t.generalId || t.generalId === selectedGen?.id);
                return (
                    <Stack spacing={2}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>选择将领</InputLabel>
                            <Select value={currentParams.general_id || ''} label="选择将领" onChange={e => handleParamChange('general_id', e.target.value)}>
                                {generals.map(g => <MenuItem key={g.id} value={g.id}>{g.name} @ {g.location}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth disabled={!selectedGen}>
                            <InputLabel>调任至</InputLabel>
                            <Select value={currentParams.to_territory_id || ''} label="调任至" onChange={e => handleParamChange('to_territory_id', e.target.value)}>
                                {validDestinations.map(t => <MenuItem key={t.id} value={t.id}>{t.id}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                );
            }

            // === [v1.6] 赛博行动 ===
            case ACTION_TYPES.CYBER_ATTACK_BLACKOUT:
            case ACTION_TYPES.CYBER_ATTACK_DEEPFAKE:
                return (
                    <Stack spacing={1.5}>
                        <Typography variant="body2" color="text.secondary">
                            {currentActionType === ACTION_TYPES.CYBER_ATTACK_BLACKOUT ? "瘫痪目标领土的防御与移动能力。" : "尝试通过深伪技术引发目标领土的全面暴动。"}
                        </Typography>
                        <FormControl size="small" fullWidth>
                            <InputLabel>目标领土</InputLabel>
                            <Select value={currentParams.target_territory_id || ''} label="目标领土" onChange={e => handleParamChange('target_territory_id', e.target.value)}>
                                {Object.values(territories).filter(t => t.owner && t.owner !== activeFactionId).map(t => <MenuItem key={t.id} value={t.id}>{t.id} ({t.owner})</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Chip
                            label={`成本: ${currentActionType === ACTION_TYPES.CYBER_ATTACK_BLACKOUT ? COSTS.CYBER_BLACKOUT : COSTS.CYBER_DEEPFAKE} CP`}
                            color={activeFaction.computing_power >= (currentActionType === ACTION_TYPES.CYBER_ATTACK_BLACKOUT ? COSTS.CYBER_BLACKOUT : COSTS.CYBER_DEEPFAKE) ? "success" : "error"}
                            variant="outlined"
                            size="small"
                        />
                    </Stack>
                );
            case ACTION_TYPES.CYBER_ATTACK_HEIST:
                return (
                    <Stack spacing={1.5}>
                        <Typography variant="body2" color="text.secondary">窃取敌方资金。</Typography>
                        <FormControl size="small" fullWidth>
                            <InputLabel>目标势力</InputLabel>
                            <Select value={currentParams.target_faction_id || ''} label="目标势力" onChange={e => handleParamChange('target_faction_id', e.target.value)}>
                                {otherFactions.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Chip
                            label={`成本: ${COSTS.CYBER_HEIST} CP`}
                            color={activeFaction.computing_power >= COSTS.CYBER_HEIST ? "success" : "error"}
                            variant="outlined"
                            size="small"
                        />
                    </Stack>
                );

            default:
                return (
                    <FormControl size="small" fullWidth>
                        <InputLabel>目标领土</InputLabel>
                        <Select value={currentParams.territory_id || ''} label="目标领土" onChange={e => handleParamChange('territory_id', e.target.value)}>
                            {playerTerritories.map(t => <MenuItem key={t.id} value={t.id}>{t.id}</MenuItem>)}
                        </Select>
                    </FormControl>
                );
        }
    };

    if (!activeFaction) return null;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1.5, p: 1 }}>
            <Typography variant="h5" component="h3" color="primary" align="center">
                你的回合, {activeFaction.name} (T{turn.number})
            </Typography>
            <Paper elevation={3} sx={{ p: 1.5, flexShrink: 0 }}>
                <Stack direction="row" justifyContent="space-around" divider={<Divider orientation="vertical" flexItem />}>
                    <Typography>💰 {activeFaction.money}</Typography>
                    <Typography color="info.main">🔋 {activeFaction.computing_power}</Typography>
                    <Typography color={remainingAP < 0 ? 'error.main' : 'text.primary'}>⚡️ {remainingAP} / {activeFaction.actionPoints} AP</Typography>
                </Stack>
            </Paper>

            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="h6" gutterBottom>第1步: 选择行动</Typography>
                    {Object.entries(actionGroups).map(([groupName, group]) => (
                        <Box key={groupName} sx={{ mb: 1.5 }}>
                            <Typography sx={{ color: `${group.color}.main`, fontWeight:'bold' }}>{groupName}</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {group.actions.map(actionKey => (
                                    <Chip
                                        key={actionKey}
                                        label={actionKey}
                                        onClick={() => selectActionType(actionKey)}
                                        variant={currentActionType === actionKey ? "filled" : "outlined"}
                                        color={currentActionType === actionKey ? group.color : "default"}
                                        size="small"
                                    />
                                ))}
                            </Box>
                        </Box>
                    ))}
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5, mt: 1.5 }}>
                    <Typography variant="h6" gutterBottom>第2步: 配置参数</Typography>
                    {renderParamInputs()}
                    <Button variant="outlined" startIcon={<AddCircleIcon />} onClick={handleAddAction} sx={{ mt: 2, alignSelf: 'flex-end' }} size="small">
                        添加至计划
                    </Button>
                </Paper>
            </Box>

            <Paper elevation={2} sx={{ p: 1, display: 'flex', flexDirection: 'column', minHeight: 200, maxHeight: '35%', flexShrink: 0 }}>
                <Typography variant="h6" sx={{ px: 1, mb:1 }}>第3步: 审阅计划</Typography>
                <List dense sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: 'background.default', borderRadius: 1, p: 1 }}>
                    {stagedActions.length === 0 && <ListItem><ListItemText primary="暂无行动计划..." sx={{ textAlign: 'center', color: 'text.secondary' }} /></ListItem>}
                    {stagedActions.map((action, index) => (
                        <ListItem
                            key={index}
                            secondaryAction={<IconButton edge="end" aria-label="delete" onClick={() => handleRemoveAction(index)}><DeleteIcon fontSize="small" /></IconButton>}
                            sx={{bgcolor: 'background.paper', mb: 0.5, borderRadius: 1, py: 0.25, px: 1}}
                        >
                            <ListItemText primary={formatAction(action)} />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            <Button variant="contained" color="secondary" size="large" onClick={handleEndTurn} sx={{ flexShrink: 0, fontWeight: 'bold' }}>
                结束回合
            </Button>
        </Box>
    );
};

export default PlayerActionPanel;
