/**
 * @file engineInstance.js
 * @description 提供一个单例模式来管理GameEngine的逻辑实例。
 * 核心目的：
 * 1. 确保在应用的任何地方都能访问到同一个GameEngine实例。
 * 2. 解耦Redux Thunks与GameEngine的直接创建。
 * [注] 尽管引擎已无状态，但保留此模式以管理包含所有游戏逻辑方法的单一实例。
 */

let engineInstance = null;

/**
 * 设置或销毁当前的引擎实例。
 * @param {GameEngine | null} engine - 要设置的引擎实例，或传入null来销毁。
 */
export const setEngineInstance = (engine) => {
    engineInstance = engine;
};

/**
 * 获取当前的引擎实例。
 * @returns {GameEngine} 当前的游戏引擎实例。
 * @throws {Error} 如果引擎尚未初始化，则抛出错误。
 */
export const getEngineInstance = () => {
    if (!engineInstance) {
        throw new Error("游戏引擎尚未初始化。请先开始一个游戏。");
    }
    return engineInstance;
};