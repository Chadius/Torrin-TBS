import {SquaddieAction} from "../../squaddie/action";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {DamageType} from "../../squaddie/squaddieService";

export const longswordAction = new SquaddieAction({
    name: "longsword",
    id: "longsword",
    traits: new TraitStatusStorage({
        [Trait.ATTACK]: true,
        [Trait.TARGET_ARMOR]: true,
        [Trait.TARGETS_FOE]: true,
    }).filterCategory(TraitCategory.ACTION),
    minimumRange: 1,
    maximumRange: 1,
    actionPointCost: 1,
    damageDescriptions: {
        [DamageType.Body]: 2,
    },
});
