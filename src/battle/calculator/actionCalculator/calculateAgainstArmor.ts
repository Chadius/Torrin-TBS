import { BattleSquaddie } from "../../battleSquaddie"
import {
    AttributeType,
    AttributeTypeAndAmount,
} from "../../../squaddie/attributeModifier"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"

export const CalculateAgainstArmor = {
    getTargetSquaddieModifierTotal: (
        targetedBattleSquaddie: BattleSquaddie
    ): AttributeTypeAndAmount[] =>
        getTargetSquaddieModifierTotal(targetedBattleSquaddie),
}

const getTargetSquaddieModifierTotal = (
    targetedBattleSquaddie: BattleSquaddie
): AttributeTypeAndAmount[] =>
    InBattleAttributesService.calculateCurrentAttributeModifiers(
        targetedBattleSquaddie.inBattleAttributes
    ).filter(
        (attributeTypeAndAmount) =>
            attributeTypeAndAmount.type === AttributeType.ARMOR
    )
