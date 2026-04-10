/**
 * @file GameContext.jsx
 * @description 定义一个React Context，用于在组件树中传递GameClient实例。
 */

import { createContext } from 'react';

// 创建一个初始值为null的Context
export const GameContext = createContext(null);