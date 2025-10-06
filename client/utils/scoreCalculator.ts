import { ScoreResult } from "../interfaces/interfaces";
interface ScoreCalculationParams {
    isWinner: boolean;
    moveCount: number;
    reason: 'victory' | 'timeout' | 'draw' | 'player_left';
    gameMode?: 'standard' | 'blitz';
}
export function calculateGameScore(params: ScoreCalculationParams): ScoreResult {
    const { isWinner, moveCount, reason, gameMode = 'standard' } = params;


    if (!isWinner && reason !== 'draw') {
        return {
            score: 0,
            breakdown: 'No points for losing',
        };
    }


    if (reason === 'draw') {
        return {
            score: 1,
            breakdown: 'Draw: 1 point',
        };
    }


    let baseScore = 2;
    let speedBonus = 0;
    let reasonBonus = 0;
    let modeMultiplier = 1;


    if (moveCount <= 5) {
        speedBonus = 6;
    } else if (moveCount < 7) {
        speedBonus = 4;
    } else if (moveCount < 9) {
        speedBonus = 2;
    }

    if (reason === 'timeout') {
        reasonBonus = 2;
    } else if (reason === 'player_left') {
        reasonBonus = 1;
    }


    if (gameMode === 'blitz') {
        modeMultiplier = 1.5;
    }


    const rawScore = baseScore + speedBonus + reasonBonus;
    const finalScore = Math.floor(rawScore * modeMultiplier);

    const breakdown = buildBreakdown(baseScore, speedBonus, reasonBonus, gameMode, moveCount, reason);

    return {
        score: finalScore,
        breakdown,
    };
}

function buildBreakdown(
    baseScore: number,
    speedBonus: number,
    reasonBonus: number,
    gameMode: string,
    moveCount: number,
    reason: string
): string {
    const parts: string[] = [];

    parts.push(`Base: ${baseScore}`);

    if (speedBonus > 0) {
        parts.push(`Speed (${moveCount} moves): +${speedBonus}`);
    }

    if (reasonBonus > 0) {
        const reasonText = reason === 'timeout' ? 'Timeout' : 'Opponent Left';
        parts.push(`${reasonText}: +${reasonBonus}`);
    }

    if (gameMode === 'blitz') {
        parts.push('Blitz Mode: x1.5');
    }

    return parts.join(' | ');
}
