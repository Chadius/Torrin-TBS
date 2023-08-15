import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieResource} from "../../squaddie/resource";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieId} from "../../squaddie/id";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../../battle/battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {SquaddieActivity} from "../../squaddie/activity";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import * as mocks from "./mocks";

export const NewDummySquaddieID: (id: string, affiliation: SquaddieAffiliation) => SquaddieId = (id: string, affiliation: SquaddieAffiliation) => {
    return new SquaddieId({
        staticId: id,
        name: id,
        resources: new SquaddieResource({}),
        traits: new TraitStatusStorage(),
        affiliation
    });
}

export const CreateNewSquaddieAndAddToRepository: (
    params: {
        name: string,
        staticId: string,
        dynamicId: string,
        affiliation: SquaddieAffiliation,
        squaddieRepository: BattleSquaddieRepository,
        activities?: SquaddieActivity[],
        attributes?: ArmyAttributes,
    }
) => {
    dynamicSquaddie: BattleSquaddieDynamic,
    staticSquaddie: BattleSquaddieStatic
} = ({
         name,
         staticId,
         dynamicId,
         affiliation,
         squaddieRepository,
         activities,
         attributes,
     }: {
         name: string,
         staticId: string,
         dynamicId: string,
         affiliation: SquaddieAffiliation,
         squaddieRepository: BattleSquaddieRepository,
         activities?: SquaddieActivity[],
         attributes?: ArmyAttributes,
     }
) => {
    const staticSquaddie = new BattleSquaddieStatic({
        squaddieId: new SquaddieId({
            staticId,
            name,
            resources: new SquaddieResource({}),
            traits: new TraitStatusStorage(),
            affiliation
        }),
        activities,
        attributes,
    });
    const dynamicSquaddie = new BattleSquaddieDynamic({
        staticSquaddieId: staticId,
        dynamicSquaddieId: dynamicId,
        squaddieTurn: new SquaddieTurn(),
        mapIcon: mocks.mockImageUI(),
    });
    squaddieRepository.addSquaddie(staticSquaddie, dynamicSquaddie);

    return {
        staticSquaddie,
        dynamicSquaddie,
    }
}
