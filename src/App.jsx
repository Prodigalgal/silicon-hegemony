/**
 * @file App.jsx
 * @description 应用的主组件，作为视图的根节点。
 * [重构后] 移除了对已废弃CSS文件的导入，并集成了全局UI反馈组件。
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectGameData } from './store/selectors';
import SetupScreen from './components/SetupScreen';
import GameView from './components/GameView';
import { selectUi, clearGlobalError, closeSnackbar } from './store/uiSlice';
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

/**
 * @description 一个用于显示全局错误的阻塞式对话框组件。
 * 当Redux store中的globalError不为null时，此组件会渲染。
 */
const GlobalErrorDisplay = () => {
    const dispatch = useDispatch();
    const { globalError } = useSelector(selectUi);

    const handleClose = () => {
        console.log("[日志][App] 用户关闭了全局错误对话框。");
        dispatch(clearGlobalError());
    };

    return (
        <Dialog
            open={!!globalError}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">{"发生错误"}</DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {globalError}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} autoFocus>
                    关闭
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/**
 * @description 一个用于显示非阻塞式通知的全局组件。
 * 通过监听Redux store中的snackbar状态来触发。
 */
const GlobalSnackbar = () => {
    const dispatch = useDispatch();
    const { snackbar } = useSelector(selectUi);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        dispatch(closeSnackbar());
    };

    return (
        <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert onClose={handleClose} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled" elevation={6}>
                {snackbar.message}
            </Alert>
        </Snackbar>
    );
};


function App() {
    const gameData = useSelector(selectGameData);

    useEffect(() => {
        console.log("[日志][App] 主应用组件已挂载。");
    }, []);

    return (
        <>
            {/* 放置全局UI反馈组件 */}
            <GlobalErrorDisplay />
            <GlobalSnackbar />

            {/* 根据游戏状态决定渲染哪个主屏幕 */}
            {/* 如果gameData不存在或gameStatus为'setup'，显示设置屏幕 */}
            {!gameData || gameData.gameStatus === 'setup' ? <SetupScreen /> : <GameView />}
        </>
    );
}

export default App;