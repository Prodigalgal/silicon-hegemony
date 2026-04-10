/**
 * @file AppRouter.jsx
 * @description 应用的顶层路由组件。
 * 负责根据当前的游戏模式和状态，决定渲染哪个主界面（在线主菜单 vs 游戏视图）。
 */
import React from 'react';
import { useSelector } from 'react-redux';
import { selectGameData } from '../store/selectors';
import { useGameClient } from '../hooks/useGameClient.js';
import { OnlineGameClient } from '../services/client/OnlineGameClient';
import App from '../App';
import MainMenu from '../components/online/MainMenu';

const AppRouter = () => {
    const gameData = useSelector(selectGameData);
    const gameClient = useGameClient();

    // 如果是在线模式，并且游戏尚未开始（即没有gameData或状态为setup），则显示在线主菜单
    if (gameClient instanceof OnlineGameClient && (!gameData || gameData.gameStatus === 'setup')) {
        return <MainMenu />;
    }

    // 对于本地模式，或者在线模式游戏已经开始后，则显示标准的游戏App（SetupScreen或GameView）
    return <App />;
};

export default AppRouter;