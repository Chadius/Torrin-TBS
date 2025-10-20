export interface BattleUISettings {
    displayPlayerHUD: boolean | undefined
    letMouseScrollCamera: boolean | undefined
    displayBattleMap: boolean | undefined
    pauseTimer: boolean | undefined
}

export const BattleUISettingsService = {
    new: ({
        letMouseScrollCamera,
        displayBattleMap,
        pauseTimer,
        displayPlayerHUD,
    }: Partial<BattleUISettings>) => {
        return newUiSettings({
            letMouseScrollCamera,
            displayBattleMap,
            pauseTimer,
            displayPlayerHUD,
        })
    },
    combine: (
        a: BattleUISettings | undefined,
        b: BattleUISettings | undefined
    ): BattleUISettings => {
        if (a == undefined && b == undefined) {
            return newUiSettings({})
        }
        return {
            letMouseScrollCamera:
                b?.letMouseScrollCamera ?? a?.letMouseScrollCamera,
            displayBattleMap: b?.displayBattleMap ?? a?.displayBattleMap,
            pauseTimer: b?.pauseTimer ?? a?.pauseTimer,
            displayPlayerHUD: b?.displayPlayerHUD ?? a?.displayPlayerHUD,
        }
    },
}

const newUiSettings = ({
    letMouseScrollCamera,
    displayBattleMap,
    pauseTimer,
    displayPlayerHUD,
}: Partial<BattleUISettings>) => {
    return {
        letMouseScrollCamera,
        displayBattleMap,
        pauseTimer,
        displayPlayerHUD,
    }
}
