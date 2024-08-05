import {
    ArmyAttributes,
    DefaultArmyAttributes,
} from "../../squaddie/armyAttributes"
import { DamageType } from "../../squaddie/squaddieService"

export interface InBattleAttributes {
    armyAttributes: ArmyAttributes
    currentHitPoints: number
}

export const InBattleAttributesService = {
    new: (statBlock?: ArmyAttributes): InBattleAttributes => {
        statBlock = statBlock || DefaultArmyAttributes()
        return {
            armyAttributes: statBlock,
            currentHitPoints: statBlock.maxHitPoints,
        }
    },
    takeDamage(
        data: InBattleAttributes,
        damageToTake: number,
        damageType: DamageType
    ): number {
        const startingHitPoints = data.currentHitPoints

        data.currentHitPoints -= damageToTake
        if (data.currentHitPoints < 0) {
            data.currentHitPoints = 0
        }

        return startingHitPoints - data.currentHitPoints
    },
    receiveHealing(data: InBattleAttributes, amountHealed: number): number {
        const startingHitPoints = data.currentHitPoints

        data.currentHitPoints += amountHealed
        if (data.currentHitPoints > data.armyAttributes.maxHitPoints) {
            data.currentHitPoints = data.armyAttributes.maxHitPoints
        }

        return data.currentHitPoints - startingHitPoints
    },
    clone: (inBattleAttributes: InBattleAttributes): InBattleAttributes => {
        return { ...inBattleAttributes }
    },
}
