import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {ActionResultPerSquaddie} from "../history/actionResultPerSquaddie";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {MissionMap} from "../../missionMap/missionMap";
import {SquaddieAction} from "../../squaddie/action";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {FormatIntent, FormatResult} from "./actionResultTextWriter";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

describe('Action Result Text Writer', () => {
    let squaddieRepository: BattleSquaddieRepository = new BattleSquaddieRepository();
    let knightStatic: SquaddieTemplate;
    let knightDynamic: BattleSquaddie;
    let citizenStatic: SquaddieTemplate;
    let citizenDynamic: BattleSquaddie;
    let thiefStatic: SquaddieTemplate;
    let thiefDynamic: BattleSquaddie;
    let rogueStatic: SquaddieTemplate;
    let rogueDynamic: BattleSquaddie;
    let battleMap: MissionMap;
    let longswordSweepAction: SquaddieAction;
    let bandageWoundsAction: SquaddieAction;

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

        longswordSweepAction = new SquaddieAction({
            name: "Longsword Sweep",
            id: "longsword",
            traits: new TraitStatusStorage({
                initialTraitValues: {
                    [Trait.ATTACK]: true,
                    [Trait.TARGET_ARMOR]: true,
                }
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 1,
        });

        bandageWoundsAction = new SquaddieAction({
            name: "Bandage Wounds",
            id: "Bandages",
            traits: new TraitStatusStorage({
                initialTraitValues: {
                    [Trait.HEALING]: true,
                    [Trait.TARGETS_ALLIES]: true,
                }
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 2,
        });

        ({
            squaddieTemplate: knightStatic,
            battleSquaddie: knightDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Knight",
            templateId: "Knight",
            battleId: "Knight 0",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepository,
            actions: [longswordSweepAction, bandageWoundsAction],
        }));

        battleMap.addSquaddie(knightStatic.templateId, knightDynamic.battleSquaddieId, new HexCoordinate({q: 1, r: 1}));

        ({
            squaddieTemplate: citizenStatic,
            battleSquaddie: citizenDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Citizen",
            templateId: "Citizen",
            battleId: "Citizen 0",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository: squaddieRepository,
            actions: [],
        }));

        ({
            squaddieTemplate: thiefStatic,
            battleSquaddie: thiefDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Thief",
            templateId: "Thief",
            battleId: "Thief 0",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepository,
            actions: [],
        }));

        battleMap.addSquaddie(thiefStatic.templateId, thiefDynamic.battleSquaddieId, new HexCoordinate({q: 1, r: 2}));

        ({
            squaddieTemplate: rogueStatic,
            battleSquaddie: rogueDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Rogue",
            templateId: "Rogue",
            battleId: "Rogue 1",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepository,
            actions: [],
        }));

        battleMap.addSquaddie(rogueStatic.templateId, rogueDynamic.battleSquaddieId, new HexCoordinate({q: 1, r: 2}));
    });

    it('Explains how much damage occurred', () => {
        const damagingResult = new SquaddieSquaddieResults({
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            targetedBattleSquaddieIds: [thiefDynamic.battleSquaddieId, rogueDynamic.battleSquaddieId],
            resultPerTarget: {
                [thiefDynamic.battleSquaddieId]: new ActionResultPerSquaddie({
                    damageTaken: 1
                }),
                [rogueDynamic.battleSquaddieId]: new ActionResultPerSquaddie({
                    damageTaken: 1
                })
            }
        });

        const outputStrings: string[] = FormatResult({
            currentAction: longswordSweepAction,
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
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            targetedBattleSquaddieIds: [knightDynamic.battleSquaddieId, citizenDynamic.battleSquaddieId],
            resultPerTarget: {
                [knightDynamic.battleSquaddieId]: new ActionResultPerSquaddie({
                    healingReceived: 1
                }),
                [citizenDynamic.battleSquaddieId]: new ActionResultPerSquaddie({
                    healingReceived: 2
                })
            }
        });

        const outputStrings: string[] = FormatResult({
            currentAction: bandageWoundsAction,
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
            currentAction: longswordSweepAction,
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(1);
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
    });
});
