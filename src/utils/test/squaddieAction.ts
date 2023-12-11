import {SquaddieActionHandler} from "../../squaddie/action";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {DamageType} from "../../squaddie/squaddieService";

export const longswordAction = SquaddieActionHandler.new({
    name: "longsword",
    id: "longsword",
    traits: TraitStatusStorageHelper.newUsingTraitValues({
        [Trait.ATTACK]: true,
        [Trait.TARGET_ARMOR]: true,
        [Trait.TARGETS_FOE]: true,
    }),
    minimumRange: 1,
    maximumRange: 1,
    actionPointCost: 1,
    damageDescriptions: {
        [DamageType.BODY]: 2,
    },
});
