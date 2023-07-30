import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieActivity} from "../../squaddie/activity";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";

describe('target a squaddie within reach of activities', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;
    let enemyBanditStatic: BattleSquaddieStatic;
    let enemyBanditDynamic: BattleSquaddieDynamic;
    let playerKnightStatic: BattleSquaddieStatic;
    let playerKnightDynamic: BattleSquaddieDynamic;
    let allyClericStatic: BattleSquaddieStatic;
    let allyClericDynamic: BattleSquaddieDynamic;
    let shortBowActivity: SquaddieActivity;
    let enemyTeam: BattleSquaddieTeam;
    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();

        shortBowActivity = new SquaddieActivity({
            name: "short bow",
            id: "short_bow",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 2,
        });

        ({
            staticSquaddie: enemyBanditStatic,
            dynamicSquaddie: enemyBanditDynamic
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "enemy_bandit",
            dynamicId: "enemy_bandit_0",
            name: "Bandit",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            activities: [shortBowActivity],
        }));

        ({
            staticSquaddie: playerKnightStatic,
            dynamicSquaddie: playerKnightDynamic
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "player_knight",
            dynamicId: "player_knight_0",
            name: "Knight",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
        }));

        ({
            staticSquaddie: allyClericStatic,
            dynamicSquaddie: allyClericDynamic
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "ally_cleric",
            dynamicId: "ally_cleric_0",
            name: "Cleric",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository,
        }));

        // TODO make 1x6 map
        // TODO put enemy bandit at (0,0)
    });

    it('will pass if desired squaddies are out of range', () => {
        // TODO put knight at (0,3)
        // TODO make strategy
        //// TODO strategy targets ANY player squaddie
        // TODO strategy should be undefined
    });

    it('will raise an error if there is no target squaddie or affiliation with a given id', () => {
        // TODO put knight at (0,1)
        // TODO make strategy (forget to set target id or affiliation)
        // TODO strategy should raise an error
    });

    it('will target squaddie by dynamic id', () => {
        // TODO put knight at (0,1)
        // TODO put cleric at (0,2)
        // TODO make strategy
        //// TODO strategy targets knight ID
        // TODO strategy should be attack knight
    });

    it('will target squaddie by affiliation', () => {
        // TODO put knight at (0,1)
        // TODO put cleric at (0,2)
        // TODO make strategy
        //// TODO strategy targets ALLY squaddies
        // TODO strategy should be attack cleric
    });

    it('will pass if there are no squaddies of the correct affiliation', () => {
        // TODO put knight at (0,1)
        // TODO make strategy
        //// TODO strategy targets any ALLY squaddie
        // TODO strategy should be undefined
    });
})
