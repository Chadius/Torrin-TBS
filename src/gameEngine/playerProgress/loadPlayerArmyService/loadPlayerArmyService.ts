import { PlayerArmy, PlayerArmyService } from "../../../campaign/playerArmy"
import { LoadFileIntoFormat } from "../../../dataLoader/dataLoader"

export const LoadPlayerArmyService = {
    loadPlayerArmy: async () => {
        try {
            const army: PlayerArmy = await LoadFileIntoFormat<PlayerArmy>(
                `assets/playerArmy/playerArmy.json`
            )
            return PlayerArmyService.sanitize(army)
        } catch (e) {
            console.error("Error while loading player army from file")
            console.error(e)
            throw e
        }
    },
}
