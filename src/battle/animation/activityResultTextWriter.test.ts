import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {ActivityResultOnSquaddie} from "../history/activityResultOnSquaddie";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {MissionMap} from "../../missionMap/missionMap";
import {SquaddieActivity} from "../../squaddie/activity";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {FormatIntent, FormatResult} from "./activityResultTextWriter";

describe('Activity Result Text Writer', () => {
    let squaddieRepository: BattleSquaddieRepository = new BattleSquaddieRepository();
    let knightStatic: BattleSquaddieStatic;
    let knightDynamic: BattleSquaddieDynamic;
    let citizenStatic: BattleSquaddieStatic;
    let citizenDynamic: BattleSquaddieDynamic;
    let thiefStatic: BattleSquaddieStatic;
    let thiefDynamic: BattleSquaddieDynamic;
    let rogueStatic: BattleSquaddieStatic;
    let rogueDynamic: BattleSquaddieDynamic;
    let battleMap: MissionMap;
    let longswordSweepActivity: SquaddieActivity;
    let bandageWoundsActivity: SquaddieActivity;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
        battleMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 ",
                    "  1 1 1 ",
                ]
            })
        });

        longswordSweepActivity = new SquaddieActivity({
            name: "Longsword Sweep",
            id: "longsword",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 1,
        });

        bandageWoundsActivity = new SquaddieActivity({
            name: "Bandage Wounds",
            id: "Bandages",
            traits: new TraitStatusStorage({
                [Trait.HEALING]: true,
                [Trait.TARGETS_ALLIES]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 2,
        });

        ({
            staticSquaddie: knightStatic,
            dynamicSquaddie: knightDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Knight",
            staticId: "Knight",
            dynamicId: "Knight 0",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepository,
            activities: [longswordSweepActivity, bandageWoundsActivity],
        }));

        battleMap.addSquaddie(knightStatic.staticId, knightDynamic.dynamicSquaddieId, new HexCoordinate({q: 1, r: 1}));

        ({
            staticSquaddie: citizenStatic,
            dynamicSquaddie: citizenDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Citizen",
            staticId: "Citizen",
            dynamicId: "Citizen 0",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository: squaddieRepository,
            activities: [],
        }));

        ({
            staticSquaddie: thiefStatic,
            dynamicSquaddie: thiefDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Thief",
            staticId: "Thief",
            dynamicId: "Thief 0",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepository,
            activities: [],
        }));

        battleMap.addSquaddie(thiefStatic.staticId, thiefDynamic.dynamicSquaddieId, new HexCoordinate({q: 1, r: 2}));

        ({
            staticSquaddie: rogueStatic,
            dynamicSquaddie: rogueDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Rogue",
            staticId: "Rogue",
            dynamicId: "Rogue 1",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepository,
            activities: [],
        }));

        battleMap.addSquaddie(rogueStatic.staticId, rogueDynamic.dynamicSquaddieId, new HexCoordinate({q: 1, r: 2}));
    });

    it('Explains how much damage occurred', () => {
        const damagingResult = new SquaddieSquaddieResults({
            actingSquaddieDynamicId: knightDynamic.dynamicSquaddieId,
            targetedSquaddieDynamicIds: [thiefDynamic.dynamicSquaddieId, rogueDynamic.dynamicSquaddieId],
            resultPerTarget: {
                [thiefDynamic.dynamicSquaddieId]: new ActivityResultOnSquaddie({
                    damageTaken: 1
                }),
                [rogueDynamic.dynamicSquaddieId]: new ActivityResultOnSquaddie({
                    damageTaken: 1
                })
            }
        });

        const outputStrings: string[] = FormatResult({
            currentActivity: longswordSweepActivity,
            result: damagingResult,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(3);
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
        expect(outputStrings[1]).toBe("Thief takes 1 damage")
        expect(outputStrings[2]).toBe("Rogue takes 1 damage")
    });

    it('Explains how much healing was received', () => {
        const healingResult = new SquaddieSquaddieResults({
            actingSquaddieDynamicId: knightDynamic.dynamicSquaddieId,
            targetedSquaddieDynamicIds: [knightDynamic.dynamicSquaddieId, citizenDynamic.dynamicSquaddieId],
            resultPerTarget: {
                [knightDynamic.dynamicSquaddieId]: new ActivityResultOnSquaddie({
                    healingReceived: 1
                }),
                [citizenDynamic.dynamicSquaddieId]: new ActivityResultOnSquaddie({
                    healingReceived: 2
                })
            }
        });

        const outputStrings: string[] = FormatResult({
            currentActivity: bandageWoundsActivity,
            result: healingResult,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(3);
        expect(outputStrings[0]).toBe("Knight uses Bandage Wounds")
        expect(outputStrings[1]).toBe("Knight receives 1 healing")
        expect(outputStrings[2]).toBe("Citizen receives 2 healing")
    });

    it('Explains intent to use a power', () => {
        const outputStrings: string[] = FormatIntent({
            currentActivity: longswordSweepActivity,
            actingDynamicId: knightDynamic.dynamicSquaddieId,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(1);
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
    });
});
