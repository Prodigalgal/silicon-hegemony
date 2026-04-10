/**
 * @file useGameClient.js
 * @description 提供一个简单的自定义Hook，用于方便地从组件中访问GameClient实例。
 */
import { useContext } from "react";
import { GameContext } from "../context/GameContext";

/**
 * @returns {GameClient} 当前的GameClient实例 (Local或Online)。
 */
export function useGameClient() {
    return useContext(GameContext);
}