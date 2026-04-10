/**
 * @file useGameMapViewModel.js
 * @description (v1.6.3) 移除 thoughtBubble 数据传递。
 */
import { useSelector } from 'react-redux';
import { selectTerritoryVisuals } from '../store/selectors';

export function useGameMapViewModel() {
    const territoryVisuals = useSelector(selectTerritoryVisuals);

    return {
        territoryVisuals,
    };
}
