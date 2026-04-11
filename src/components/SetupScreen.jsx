/* src/components/SetupScreen.jsx */
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useGameClient } from '../hooks/useGameClient.js';
import { COMMANDER_ARCHETYPES } from '../store/prompt';
import { showSnackbar } from '../store/uiSlice';
import { testAIConnection } from '../services/llmService';
import {
    getProviderById,
    getProviderLabel,
    normalizeAiConfig,
} from '../services/aiProviders';
import {
    Container, Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Button,
    Grid, Paper, Checkbox, FormControlLabel, Stack, Tooltip, Stepper, Step, StepLabel,
    StepContent, Chip, CircularProgress, IconButton, Alert
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SaveIcon from '@mui/icons-material/Save';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

const STORAGE_KEY = 'SILICON_HEGEMONY_CONFIG_V1'; // 本地存储Key

const commanderOptions = [{ name: "Custom", description: "AI的行为将完全由下方的'补充策略'文本框定义。" }, ...Object.values(COMMANDER_ARCHETYPES)];

const createInitialFactionConfig = (index, isHuman = false) => {
    const commander = commanderOptions[(index + 1) % commanderOptions.length] || commanderOptions[1];
    return normalizeAiConfig({
        name: `Faction ${index + 1}`,
        isHuman,
        commanderName: commander.name,
        supplementalStrategy: "",
        providerId: 'openai_compatible',
        apiKey: '',
    });
};

const normalizeConfigMap = (configs = {}) => Object.fromEntries(
    Object.entries(configs).map(([id, config]) => [id, normalizeAiConfig(config)])
);

function FactionConfigCard({ config, onConfigChange }) {
    // ... (保持不变，省略以节省篇幅，实际代码中请保留原样)
    const selectedCommander = commanderOptions.find(c => c.name === config.commanderName) || commanderOptions[0];
    const isCustom = config.commanderName === 'Custom';

    return (
        <Stack spacing={2}>
            <FormControlLabel
                control={<Checkbox checked={config.isHuman} onChange={(e) => onConfigChange('isHuman', e.target.checked)} />}
                label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {config.isHuman ? <PersonIcon sx={{ mr: 1 }} /> : <SmartToyIcon sx={{ mr: 1 }} />}
                        {config.isHuman ? "由玩家控制" : "由AI控制"}
                    </Box>
                }
            />
            <TextField label="势力名称" value={config.name} onChange={(e) => onConfigChange('name', e.target.value)} size="small" />
            {!config.isHuman && (
                <>
                    <FormControl fullWidth size="small">
                        <InputLabel>指挥官原型</InputLabel>
                        <Select value={config.commanderName} label="指挥官原型" onChange={(e) => onConfigChange('commanderName', e.target.value)}>
                            {commanderOptions.map(cmd => <MenuItem key={cmd.name} value={cmd.name}>{cmd.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Tooltip title={selectedCommander.description} placement="top-start">
                        <TextField
                            label="补充策略 (可选)"
                            multiline
                            rows={4}
                            value={config.supplementalStrategy}
                            onChange={(e) => onConfigChange('supplementalStrategy', e.target.value)}
                            placeholder={isCustom ? "为你的自定义指挥官编写核心策略..." : "在此处为AI追加额外指令或目标..."}
                            helperText={`基础策略: ${selectedCommander.description.substring(0, 50)}...`}
                        />
                    </Tooltip>
                </>
            )}
        </Stack>
    );
}

function AIServiceConfig({ factionsConfig, onConfigChange }) {
    const dispatch = useDispatch();
    const aiFactions = Object.entries(factionsConfig).filter(([, config]) => !config.isHuman);
    const [testingById, setTestingById] = useState({});
    const [testResultById, setTestResultById] = useState({});

    if (aiFactions.length === 0) {
        return <Typography sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>没有需要配置AI服务的势力。</Typography>;
    }

    const handleTestConnection = async (id) => {
        const config = normalizeAiConfig(factionsConfig[id]);
        const provider = getProviderById();

        if (!config.apiKey.trim()) {
            dispatch(showSnackbar({ message: `请先为 "${config.name}" 填写 ${provider.apiKeyLabel}。`, severity: 'warning' }));
            return;
        }

        if (!config.model.trim()) {
            dispatch(showSnackbar({ message: `请先为 "${config.name}" 填写模型名称。`, severity: 'warning' }));
            return;
        }

        if (provider.supportsCustomBaseUrl && !config.baseUrl.trim()) {
            dispatch(showSnackbar({ message: `请先为 "${config.name}" 填写服务端点。`, severity: 'warning' }));
            return;
        }

        setTestingById(prev => ({ ...prev, [id]: true }));
        setTestResultById(prev => ({ ...prev, [id]: null }));

        try {
            const result = await testAIConnection(config);
            const successMessage = `${config.name} 连接成功：${result.providerLabel} / ${result.model}`;
            setTestResultById(prev => ({
                ...prev,
                [id]: {
                    severity: 'success',
                    message: successMessage,
                    detail: result.preview,
                }
            }));
            dispatch(showSnackbar({ message: successMessage, severity: 'success' }));
        } catch (error) {
            setTestResultById(prev => ({
                ...prev,
                [id]: {
                    severity: 'error',
                    message: error.message,
                }
            }));
            dispatch(showSnackbar({ message: error.message, severity: 'error' }));
        } finally {
            setTestingById(prev => ({ ...prev, [id]: false }));
        }
    };

    return (
        <Stack spacing={3}>
            {aiFactions.map(([id, config]) => (
                <Paper key={id} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>{config.name} - OpenAI-Compatible 配置</Typography>
                    {(() => {
                        const provider = getProviderById();
                        const testResult = testResultById[id];
                        const isTesting = !!testingById[id];

                        return (
                            <Stack spacing={2}>
                                <TextField
                                    label="模型名称"
                                    value={config.model}
                                    onChange={(e) => onConfigChange(id, 'model', e.target.value)}
                                    size="small"
                                    helperText={provider.placeholder}
                                />

                                <TextField
                                    label="服务端点 (Base URL)"
                                    value={config.baseUrl}
                                    onChange={(e) => onConfigChange(id, 'baseUrl', e.target.value)}
                                    size="small"
                                    placeholder={provider.baseUrlPlaceholder}
                                    helperText={provider.baseUrlHelperText}
                                />

                                <TextField
                                    required
                                    label={provider.apiKeyLabel}
                                    type="password"
                                    value={config.apiKey}
                                    onChange={(e) => onConfigChange(id, 'apiKey', e.target.value)}
                                    size="small"
                                    helperText="如果接的是 ai-gateway，这里直接填写 gateway client token。"
                                />

                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Button
                                        variant="outlined"
                                        onClick={() => handleTestConnection(id)}
                                        disabled={isTesting}
                                        startIcon={isTesting ? <CircularProgress size={18} color="inherit" /> : null}
                                    >
                                        {isTesting ? '测试中...' : '测试连接'}
                                    </Button>
                                </Stack>

                                {testResult && (
                                    <Alert severity={testResult.severity}>
                                        <Typography variant="body2">{testResult.message}</Typography>
                                        {testResult.detail && (
                                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.85 }}>
                                                返回片段: {testResult.detail}
                                            </Typography>
                                        )}
                                    </Alert>
                                )}
                            </Stack>
                        );
                    })()}
                </Paper>
            ))}
        </Stack>
    );
}

function ReviewStep({ factionsConfig }) {
    // ... (保持不变，请保留原样)
    return (
        <Stack spacing={2}>
            <Typography variant="h6">配置总览</Typography>
            {Object.values(factionsConfig).map(config => (
                <Paper key={config.name} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }} component="div">
                        {config.name}
                        <Chip
                            label={config.isHuman ? "玩家" : "AI"}
                            color={config.isHuman ? "success" : "info"}
                            size="small"
                            sx={{ ml: 1 }}
                        />
                    </Typography>
                    {!config.isHuman && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            指挥官: {config.commanderName} | 服务: {getProviderLabel(config)} ({config.model})
                        </Typography>
                    )}
                </Paper>
            ))}
            <Typography sx={{ pt: 2, color: 'text.secondary' }}>
                请审阅您的配置。一切就绪后，即可开始模拟。
            </Typography>
        </Stack>
    );
}

function SetupScreen({ isSingleFactionMode = false, factionIdToConfigure, initialConfig, onConfigSave, onCancel, isSaving = false }) {
    const gameClient = useGameClient();
    const dispatch = useDispatch();
    const [activeStep, setActiveStep] = useState(0);
    const [factionCount, setFactionCount] = useState(2);
    const [factionsConfig, setFactionsConfig] = useState({});
    const [loadStatus, setLoadStatus] = useState(''); // 'Loaded' or ''

    const steps = ['全局设定', '势力配置', 'AI服务配置', '审阅与开始'];

    // [Feature 1] 初始化与本地读取
    // 这里只在挂载或模式切换时初始化，避免在用户编辑过程中重复覆盖配置。
    useEffect(() => {
        if (isSingleFactionMode) {
            if (factionIdToConfigure && initialConfig) {
                setFactionsConfig({ [factionIdToConfigure]: normalizeAiConfig(initialConfig) });
            }
            return;
        }

        // 尝试从本地存储读取
        const savedConfigStr = localStorage.getItem(STORAGE_KEY);
        let initialConfigs = {};
        let initialCount = 2;

        if (savedConfigStr) {
            try {
                const savedData = JSON.parse(savedConfigStr);
                // 如果保存的数据是对象形式
                if (savedData && typeof savedData === 'object') {
                    console.log("[日志][SetupScreen] 从本地存储加载配置。");
                    // 恢复势力数量
                    const savedCount = Object.keys(savedData).length;
                    if (savedCount >= 2) {
                        initialCount = savedCount;
                        setFactionCount(savedCount);
                    }
                    initialConfigs = normalizeConfigMap(savedData);
                    setLoadStatus('配置已恢复');
                }
            } catch (e) {
                console.error("Failed to parse saved config", e);
            }
        }

        // 如果没有存档或存档不完整，补全默认配置
        for (let i = 0; i < initialCount; i++) {
            const id = `faction_${i + 1}`;
            if (!initialConfigs[id]) {
                initialConfigs[id] = createInitialFactionConfig(i, i === 0);
            }
        }

        setFactionsConfig(normalizeConfigMap(initialConfigs));
    }, [isSingleFactionMode, factionIdToConfigure, initialConfig]); // 仅在挂载或模式切换时运行一次

    // 当 factionCount 变化时，动态增删配置
    useEffect(() => {
        if (!isSingleFactionMode) {
            setFactionsConfig(prev => {
                const newConfigs = {};
                for (let i = 0; i < factionCount; i++) {
                    const id = `faction_${i + 1}`;
                    // 保留已有的，新建缺失的
                    newConfigs[id] = normalizeAiConfig(prev[id] || createInitialFactionConfig(i, i === 0));
                }
                return newConfigs;
            });
        }
    }, [factionCount, isSingleFactionMode]);

    const handleConfigChange = (id, fieldOrConfig, value) => {
        setFactionsConfig(prev => {
            if (typeof fieldOrConfig === 'object' && fieldOrConfig !== null) {
                return { ...prev, [id]: normalizeAiConfig(fieldOrConfig) };
            }

            return { ...prev, [id]: normalizeAiConfig({ ...prev[id], [fieldOrConfig]: value }) };
        });
    };

    // 清除缓存
    const handleClearCache = () => {
        localStorage.removeItem(STORAGE_KEY);
        setLoadStatus('缓存已清除');
        // 重置为默认
        const defaults = {};
        for (let i = 0; i < factionCount; i++) {
            defaults[`faction_${i + 1}`] = createInitialFactionConfig(i, i === 0);
        }
        setFactionsConfig(defaults);
        dispatch(showSnackbar({ message: "本地配置已清除，重置为默认。", severity: 'info' }));
    };

    const handleNext = () => setActiveStep((prev) => prev + 1);
    const handleBack = () => setActiveStep((prev) => prev - 1);

    const handleStartGame = () => {
        const finalConfigsArray = Object.values(factionsConfig);

        // 验证
        for (const config of finalConfigsArray) {
            if (config.isHuman) continue;
            const normalizedConfig = normalizeAiConfig(config);
            const provider = getProviderById();

            if (!normalizedConfig.apiKey.trim()) {
                dispatch(showSnackbar({ message: `请为AI势力 "${config.name}" 输入 ${provider.apiKeyLabel}。`, severity: 'error' }));
                setActiveStep(2); return;
            }

            if (!normalizedConfig.model.trim()) {
                dispatch(showSnackbar({ message: `请为AI势力 "${config.name}" 填写模型名称。`, severity: 'error' }));
                setActiveStep(2); return;
            }

            if (provider.supportsCustomBaseUrl && !normalizedConfig.baseUrl.trim()) {
                dispatch(showSnackbar({ message: `请为AI势力 "${config.name}" 填写服务端点。`, severity: 'error' }));
                setActiveStep(2); return;
            }
        }

        // [Feature 1] 保存配置到本地
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(factionsConfig));
            console.log("[日志][SetupScreen] 配置已保存到本地。");
        } catch (e) {
            console.warn("无法保存配置到本地存储", e);
        }

        console.log("[日志][SetupScreen] 开始游戏，提交最终配置:", finalConfigsArray);
        gameClient.setAiConfigurations(factionsConfig);
        gameClient.startGame({ factionsConfig: finalConfigsArray });
    };

    if (isSingleFactionMode) {
        // 单人配置模式代码保持不变...
        const config = factionsConfig[factionIdToConfigure];
        if (!config) return <Container sx={{py: 4}}><Typography>正在加载配置...</Typography></Container>;
        return (
            <Container maxWidth="sm" sx={{ py: 4 }}>
                <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
                    <Typography variant="h5" component="h1" gutterBottom align="center">
                        配置AI策略: {config.name}
                    </Typography>
                    <FactionConfigCard
                        config={config}
                        onConfigChange={(field, value) => handleConfigChange(factionIdToConfigure, field, value)}
                    />
                    <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                        <Button variant="outlined" color="secondary" onClick={onCancel} disabled={isSaving}>取消</Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => onConfigSave(config)}
                            disabled={isSaving}
                            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {isSaving ? "保存中..." : "保存并返回"}
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Box>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <TextField
                                label="势力数量 (2-8)" type="number" value={factionCount}
                                onChange={(e) => {
                                    const count = parseInt(e.target.value, 10);
                                    if (!isNaN(count) && count >= 2 && count <= 8) setFactionCount(count);
                                }}
                                inputProps={{ min: 2, max: 8 }} fullWidth
                            />
                            <Tooltip title="清除本地保存的配置">
                                <IconButton onClick={handleClearCache} color="warning">
                                    <DeleteForeverIcon />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                        {loadStatus && <Typography variant="caption" color="success.main" sx={{mt:1, display:'block'}}>{loadStatus}</Typography>}
                    </Box>
                );
            // Case 1, 2, 3 保持不变
            case 1:
                return (
                    <Grid container spacing={3}>
                        {Object.entries(factionsConfig).map(([id, config], index) => (
                            <Grid size={{ xs: 12, md: 6 }} key={id}>
                                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                                    <Typography variant="h6" gutterBottom>势力 {index + 1}</Typography>
                                    <FactionConfigCard config={config} onConfigChange={(field, value) => handleConfigChange(id, field, value)} />
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                );
            case 2:
                return <AIServiceConfig factionsConfig={factionsConfig} onConfigChange={handleConfigChange} />;
            case 3:
                return <ReviewStep factionsConfig={factionsConfig} />;
            default:
                return '未知步骤';
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">游戏设定</Typography>
                <Stepper activeStep={activeStep} orientation="vertical">
                    {steps.map((label, index) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                            <StepContent>
                                <Box sx={{ my: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>{getStepContent(index)}</Box>
                                <Box sx={{ mb: 2 }}>
                                    <div>
                                        <Button
                                            variant="contained"
                                            onClick={index === steps.length - 1 ? handleStartGame : handleNext}
                                            sx={{ mt: 1, mr: 1 }}
                                            startIcon={index === steps.length - 1 ? <SaveIcon/> : null}
                                        >
                                            {index === steps.length - 1 ? '保存配置并开始' : '下一步'}
                                        </Button>
                                        <Button disabled={index === 0} onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                                            上一步
                                        </Button>
                                    </div>
                                </Box>
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>
            </Paper>
        </Container>
    );
}

export default SetupScreen;
