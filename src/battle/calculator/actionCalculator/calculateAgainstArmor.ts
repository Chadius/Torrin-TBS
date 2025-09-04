import { BattleSquaddie } from "../../battleSquaddie"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import {
    Attribute,
    AttributeTypeAndAmount,
} from "../../../squaddie/attribute/attribute"

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
            attributeTypeAndAmount.type === Attribute.ARMOR
    )
