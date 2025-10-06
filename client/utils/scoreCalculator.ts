import { ScoreResult } from "../interfaces/interfaces";
interface ScoreCalculationParams {
    currPlayerResult: 'winner' | 'loser' | 'draw';
    moveCount: number;
    reason: 'victory' | 'timeout' | 'draw' | 'player_left';
    gameMode?: 'standard' | 'blitz';
}



export function calculateGameScore(params: ScoreCalculationParams): ScoreResult {
    const { currPlayerResult, moveCount, reason, gameMode = 'standard' } = params;

    if (currPlayerResult == 'loser' && reason !== 'draw') {
        if (reason === 'player_left') {
            // Player who left gets nothing
            return {
                score: 0,
                breakdown: 'Left game: 0 points',
            };
        }

        // Lost but participated fully
        return {
            score: 1,
            breakdown: 'Participation: 1 point',
        };
    }

    // Draw - both players get 1 point
    if (reason === 'draw') {
        return {
            score: 1,
            breakdown: 'Draw: 1 point',
        };
    }

    // Win scoring
    let baseScore = 2; // Base win points
    let speedBonus = 0;
    let reasonBonus = 0;
    let modeMultiplier = 1;

    // Speed bonus based on move count
    if (moveCount <= 5) {
        speedBonus = 6; // Lightning fast win (5 moves or less) = +6
    } else if (moveCount < 7) {
        speedBonus = 4; // Quick win (6 moves) = +4
    } else if (moveCount < 9) {
        speedBonus = 2; // Fast win (7-8 moves) = +2
    }

    if ( reason === 'timeout') {
        reasonBonus = 2; 
    } else if (reason === 'player_left') {
        reasonBonus = 3;
    }

    // Game mode multiplier
    if (gameMode === 'blitz') {
        modeMultiplier = 1.5; // Blitz mode worth 50% more
    }

    // Calculate total
    const rawScore = baseScore + speedBonus + reasonBonus;
    const finalScore = Math.floor(rawScore * modeMultiplier);

    // Build breakdown string
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
