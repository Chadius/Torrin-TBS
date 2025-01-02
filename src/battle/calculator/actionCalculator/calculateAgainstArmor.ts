import { BattleSquaddie } from "../../battleSquaddie"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import {
    AttributeType,
    AttributeTypeAndAmount,
} from "../../../squaddie/attribute/attributeType"

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
