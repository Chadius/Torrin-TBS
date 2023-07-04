import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../../battle/battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {SquaddieTurn} from "../../squaddie/turn";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import * as mocks from "../../utils/test/mocks";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieResource} from "../../squaddie/resource";

export function addSquaddieToSquaddieRepository(
    staticSquaddieId: string,
    dynamicSquaddieId: string,
    squaddieName: string,
    squaddieAffiliation: SquaddieAffiliation,
    squaddieRepository: BattleSquaddieRepository,
    movement?: SquaddieMovement,
) {
    const staticSquaddie = new BattleSquaddieStatic({
        squaddieId: new SquaddieId({
            staticId: staticSquaddieId,
            name: squaddieName,
            resources: new SquaddieResource(),
            traits: new TraitStatusStorage(),
            affiliation: squaddieAffiliation,
        }),
        attributes: new ArmyAttributes({
            movement: movement ?? new SquaddieMovement(),
        }),
        activities: [],
    });
    const dynamicSquaddie =
        new BattleSquaddieDynamic({
            dynamicSquaddieId: dynamicSquaddieId,
            staticSquaddieId: staticSquaddieId,
            squaddieTurn: new SquaddieTurn(),
            mapIcon: mocks.mockImageUI(),
        });
    squaddieRepository.addSquaddie(
        staticSquaddie,
        dynamicSquaddie
    );

    return {
        staticSquaddie,
        dynamicSquaddie
    }
}
