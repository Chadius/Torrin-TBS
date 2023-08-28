import {SquaddieActivity} from "../../squaddie/activity";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {DamageType} from "../../squaddie/squaddieService";

export const squaddieActivityLongsword = new SquaddieActivity({
    name: "longsword",
    id: "longsword",
    traits: new TraitStatusStorage({
        [Trait.ATTACK]: true,
        [Trait.TARGET_ARMOR]: true,
    }).filterCategory(TraitCategory.ACTIVITY),
    minimumRange: 1,
    maximumRange: 1,
    actionsToSpend: 1,
    damageDescriptions: {
        [DamageType.Body]: 2,
    },
});
