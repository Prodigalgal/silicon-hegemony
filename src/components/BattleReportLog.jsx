/**
 * @file BattleReportLog.jsx
 * @description 一个专门用于渲染结构化战斗报告的UI组件。
 * 它清晰地展示了战斗双方的兵力、战斗力计算过程、运气以及最终结果。
 */
import React from 'react';
import { Box, Typography, Paper, Divider, Stack } from '@mui/material';

/**
 * @description 单个战斗方的详细信息面板。
 * @param {{combatant: object, color: string}} props
 */
const CombatantInfo = ({ combatant, color }) => (
    <Stack spacing={1} sx={{ flex: 1, p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="h6" component="strong" sx={{ color, mb: 1 }}>{combatant.name}</Typography>
        <Typography variant="caption" color="text.secondary">
            {combatant.from ? `从: ${combatant.from}` : `于: ${combatant.at}`}
        </Typography>
        <Typography variant="body2">
            投入: {combatant.army.total} (正规军: {combatant.army.regulars}, 民兵: {combatant.army.militia})
        </Typography>

        <Box component="ul" sx={{ listStyle: 'none', p: 1.5, pl: 2, m: '8px 0', fontSize: '0.85em', color: 'text.secondary', borderLeft: 2, borderColor: 'divider' }}>
            {combatant.powerCalcs.map((calc, i) => <li key={i} style={{ padding: '2px 0' }}>{calc}</li>)}
        </Box>

        <Paper variant="outlined" sx={{ p: '6px 10px', mt: 1, textAlign: 'center', fontSize: '0.9em', borderStyle: 'dashed' }}>
            战场运气 (掷出 {combatant.rng.roll}): <Typography component="span" sx={{ color, fontWeight: 'bold', fontSize: '1.1em' }}>x{combatant.rng.mod}</Typography>
        </Paper>

        <Box sx={{ mt: 'auto', pt: 1.5, borderTop: 2, borderColor: 'divider', fontWeight: 'bold', fontSize: '1.1em', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            最终战斗力:
            <Typography component="span" sx={{ color, fontSize: '1.4em', fontWeight: 'bold' }}>{combatant.finalPower.toFixed(0)}</Typography>
        </Box>
    </Stack>
);

/**
 * @description 完整的战斗报告组件。
 * @param {{report: object, factions: object}} props
 */
const BattleReportLog = ({ report, factions }) => {
    const attackerColor = factions[report.attacker.id]?.color || '#ff8a8a';
    const defenderColor = factions[report.defender.id]?.color || '#8a8aff';

    return (
        <Paper elevation={2} sx={{ p: 2, mb: 1.5, fontSize: '0.9em', border: 1, borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.2)' }}>
            <Typography variant="h6" component="h4" sx={{ pb: 1, mb: 2, textAlign: 'center', color: 'text.primary', borderBottom: 2, borderColor: attackerColor }}>
                {report.title}
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <CombatantInfo combatant={report.attacker} color={attackerColor} />
                <Typography variant="h5" sx={{ fontWeight: 'bold', my: { xs: 2, md: 0 } }}>VS</Typography>
                <CombatantInfo combatant={report.defender} color={defenderColor} />
            </Stack>

            <Paper variant="outlined" sx={{ p: 1.5, mt: 1, textAlign: 'center' }}>
                <Typography component="p" sx={{ mb: 0.5 }}>
                    <strong>战损:</strong>
                    <Typography component="span" sx={{ color: attackerColor, mx: 1 }}>攻击方损失 {report.outcome.losses.attacker}</Typography>,
                    <Typography component="span" sx={{ color: defenderColor }}>防御方损失 {report.outcome.losses.defender}</Typography>
                </Typography>
                <Divider sx={{ my: 1 }}/>
                <Typography component="p"><strong>结果: {report.outcome.summary}</strong></Typography>
            </Paper>
        </Paper>
    );
};

export default BattleReportLog;