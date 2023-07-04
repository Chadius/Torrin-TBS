import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../../battle/battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {NullSquaddieResource} from "../../squaddie/resource";
import {NullTraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {NullSquaddieMovement, SquaddieMovement} from "../../squaddie/movement";
import {SquaddieTurn} from "../../squaddie/turn";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import * as mocks from "../../utils/test/mocks";

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
            resources: NullSquaddieResource(),
            traits: NullTraitStatusStorage(),
            affiliation: squaddieAffiliation,
        }),
        attributes: new ArmyAttributes({
            movement: movement ?? NullSquaddieMovement(),
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
