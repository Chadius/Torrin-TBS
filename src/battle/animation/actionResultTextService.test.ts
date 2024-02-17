import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieSquaddieResults, SquaddieSquaddieResultsService} from "../history/squaddieSquaddieResults";
import {ATTACK_MODIFIER} from "../modifierConstants";
import {DegreeOfSuccess} from "../actionCalculator/degreeOfSuccess";
import {ActionResultTextService} from "./actionResultTextService";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../action/template/actionEffectSquaddieTemplate";
import {ActionTemplate, ActionTemplateService} from "../../action/template/actionTemplate";

describe('Action Result Text Writer', () => {
    let squaddieRepository: ObjectRepository = ObjectRepositoryService.new();
    let knightStatic: SquaddieTemplate;
    let knightDynamic: BattleSquaddie;
    let citizenStatic: SquaddieTemplate;
    let citizenDynamic: BattleSquaddie;
    let thiefStatic: SquaddieTemplate;
    let thiefDynamic: BattleSquaddie;
    let rogueStatic: SquaddieTemplate;
    let rogueDynamic: BattleSquaddie;
    let battleMap: MissionMap;
    let longswordSweepAction: ActionTemplate;
    let bandageWoundsAction: ActionTemplate;

    beforeEach(() => {
        squaddieRepository = ObjectRepositoryService.new();
        battleMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 ",
                    "  1 1 1 ",
                ]
            })
        });

        longswordSweepAction = ActionTemplateService.new({
            id: "longsword",
            name: "Longsword Sweep",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                })
            ],
        })


        bandageWoundsAction = ActionTemplateService.new({
            id: "Bandages",
            name: "Bandage Wounds",
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.HEALING]: true,
                        [Trait.TARGETS_ALLIES]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                })
            ]
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
            actionTemplates: [longswordSweepAction, bandageWoundsAction],
        }));

        battleMap.addSquaddie(knightStatic.squaddieId.templateId, knightDynamic.battleSquaddieId, {q: 1, r: 1});

        ({
            squaddieTemplate: citizenStatic,
            battleSquaddie: citizenDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Citizen",
            templateId: "Citizen",
            battleId: "Citizen 0",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository: squaddieRepository,
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
        }));

        battleMap.addSquaddie(thiefStatic.squaddieId.templateId, thiefDynamic.battleSquaddieId, {q: 1, r: 2});

        ({
            squaddieTemplate: rogueStatic,
            battleSquaddie: rogueDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Rogue",
            templateId: "Rogue",
            battleId: "Rogue 1",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepository,
        }));

        battleMap.addSquaddie(rogueStatic.squaddieId.templateId, rogueDynamic.battleSquaddieId, {q: 1, r: 2});
    });

    it('Explains how much damage occurred', () => {
        const damagingResult: SquaddieSquaddieResults = SquaddieSquaddieResultsService.sanitize({
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            targetedBattleSquaddieIds: [thiefDynamic.battleSquaddieId, rogueDynamic.battleSquaddieId],
            resultPerTarget: {
                [thiefDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 1,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                },
                [rogueDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 1,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                }
            },
            actingSquaddieRoll: {
                occurred: true,
                rolls: [2, 6],
            },
            actingSquaddieModifiers: {},
        });

        const outputStrings: string[] = ActionResultTextService.outputResultForTextOnly({
            actionTemplateName: longswordSweepAction.name,
            currentActionEffectSquaddieTemplate: longswordSweepAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            result: damagingResult,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(5);
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
        expect(outputStrings[1]).toBe("   rolls (2, 6)")
        expect(outputStrings[2]).toBe(" Total 8");
        expect(outputStrings[3]).toBe("Thief takes 1 damage")
        expect(outputStrings[4]).toBe("Rogue takes 1 damage")
    });

    it('Explains how much healing was received', () => {
        const healingResult: SquaddieSquaddieResults = SquaddieSquaddieResultsService.sanitize({
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            targetedBattleSquaddieIds: [knightDynamic.battleSquaddieId, citizenDynamic.battleSquaddieId],
            resultPerTarget: {
                [knightDynamic.battleSquaddieId]: {
                    damageTaken: 0,
                    healingReceived: 1,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                },
                [citizenDynamic.battleSquaddieId]: {
                    damageTaken: 0,
                    healingReceived: 2,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                },
            },
            actingSquaddieRoll: {
                occurred: false,
                rolls: [],
            },
            actingSquaddieModifiers: {},
        });

        const outputStrings: string[] = ActionResultTextService.outputResultForTextOnly({
            actionTemplateName: bandageWoundsAction.name,
            currentActionEffectSquaddieTemplate: bandageWoundsAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            result: healingResult,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(3);
        expect(outputStrings[0]).toBe("Knight uses Bandage Wounds")
        expect(outputStrings[1]).toBe("Knight receives 1 healing")
        expect(outputStrings[2]).toBe("Citizen receives 2 healing")
    });

    it('Explains intent to use a power', () => {
        const outputStrings: string[] = ActionResultTextService.outputIntentForTextOnly({
            actionTemplate: longswordSweepAction,
            currentActionEffectSquaddieTemplate: longswordSweepAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            squaddieRepository,
            actingSquaddieModifiers: {},
        });

        expect(outputStrings).toHaveLength(1);
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
    });

    it('Explains attack modifiers with intent', () => {
        const outputStrings: string[] = ActionResultTextService.outputIntentForTextOnly({
            actionTemplate: longswordSweepAction,
            currentActionEffectSquaddieTemplate: longswordSweepAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            squaddieRepository,
            actingSquaddieModifiers: {
                [ATTACK_MODIFIER.MULTIPLE_ATTACK_PENALTY]: -6,
            },
        });

        expect(outputStrings).toHaveLength(2);
        expect(outputStrings[1]).toBe("   -6: Multiple Attack")
    });

    it('Explains action but does not show attack modifiers if the action always succeeds', () => {
        const outputStrings: string[] = ActionResultTextService.outputIntentForTextOnly({
            actionTemplate: bandageWoundsAction,
            currentActionEffectSquaddieTemplate: bandageWoundsAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            squaddieRepository,
            actingSquaddieModifiers: {
                [ATTACK_MODIFIER.MULTIPLE_ATTACK_PENALTY]: -6,
            },
        });

        expect(outputStrings).toHaveLength(1);
        expect(outputStrings[0]).toBe("Knight uses Bandage Wounds");
    });

    it('Will mention the actor roll, if the actor rolled', () => {
        const damagingResult: SquaddieSquaddieResults = SquaddieSquaddieResultsService.sanitize({
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            targetedBattleSquaddieIds: [thiefDynamic.battleSquaddieId, rogueDynamic.battleSquaddieId],
            resultPerTarget: {
                [thiefDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 1,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                },
                [rogueDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 1,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                }
            },
            actingSquaddieRoll: {
                occurred: true,
                rolls: [2, 6],
            },
            actingSquaddieModifiers: {},
        });

        const outputStrings: string[] = ActionResultTextService.outputResultForTextOnly({
            actionTemplateName: longswordSweepAction.name,
            currentActionEffectSquaddieTemplate: longswordSweepAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            result: damagingResult,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(5);
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep");
        expect(outputStrings[1]).toBe("   rolls (2, 6)");
        expect(outputStrings[2]).toBe(" Total 8");
        expect(outputStrings[3]).toBe("Thief takes 1 damage");
        expect(outputStrings[4]).toBe("Rogue takes 1 damage");
    });

    it('Will mention if the attacker missed or did no damage', () => {
        const damagingResult: SquaddieSquaddieResults = SquaddieSquaddieResultsService.sanitize({
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            targetedBattleSquaddieIds: [thiefDynamic.battleSquaddieId, rogueDynamic.battleSquaddieId],
            resultPerTarget: {
                [thiefDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 0,
                    actorDegreeOfSuccess: DegreeOfSuccess.FAILURE,
                },
                [rogueDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 0,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                }
            },
            actingSquaddieRoll: {
                occurred: true,
                rolls: [1, 2],
            },
            actingSquaddieModifiers: {},
        });

        const outputStrings: string[] = ActionResultTextService.outputResultForTextOnly({
            actionTemplateName: longswordSweepAction.name,
            currentActionEffectSquaddieTemplate: longswordSweepAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            result: damagingResult,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(5);
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep");
        expect(outputStrings[1]).toBe("   rolls (1, 2)");
        expect(outputStrings[2]).toBe(" Total 3");
        expect(outputStrings[3]).toBe("Thief: MISS!");
        expect(outputStrings[4]).toBe("Rogue: NO DAMAGE");
    });

    it('will mention if the attack was a critical hit and dealt double damage', () => {
        const damagingResult: SquaddieSquaddieResults = SquaddieSquaddieResultsService.sanitize({
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            targetedBattleSquaddieIds: [thiefDynamic.battleSquaddieId],
            resultPerTarget: {
                [thiefDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 4,
                    actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
                }
            },
            actingSquaddieRoll: {
                occurred: true,
                rolls: [6, 6],
            },
            actingSquaddieModifiers: {},
        });

        const outputStrings: string[] = ActionResultTextService.outputResultForTextOnly({
            actionTemplateName: longswordSweepAction.name,
            currentActionEffectSquaddieTemplate: longswordSweepAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            result: damagingResult,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(4);
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep");
        expect(outputStrings[1]).toBe("   rolls (6, 6)");
        expect(outputStrings[2]).toBe(" Total 12");
        expect(outputStrings[3]).toBe("Thief: CRITICAL HIT! 4 damage");
    });

    it('will mention if the attack was a critical miss', () => {
        const damagingResult: SquaddieSquaddieResults = SquaddieSquaddieResultsService.sanitize({
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            targetedBattleSquaddieIds: [thiefDynamic.battleSquaddieId],
            resultPerTarget: {
                [thiefDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 0,
                    actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
                }
            },
            actingSquaddieRoll: {
                occurred: true,
                rolls: [1, 1],
            },
            actingSquaddieModifiers: {},
        });

        const outputStrings: string[] = ActionResultTextService.outputResultForTextOnly({
            actionTemplateName: longswordSweepAction.name,
            currentActionEffectSquaddieTemplate: longswordSweepAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            result: damagingResult,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(4);
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep");
        expect(outputStrings[1]).toBe("   rolls (1, 1)");
        expect(outputStrings[2]).toBe(" Total 2");
        expect(outputStrings[3]).toBe("Thief: CRITICAL MISS!!");
    });

    it('will show the total attack roll and multiple attack penalty', () => {
        const damagingResult: SquaddieSquaddieResults = SquaddieSquaddieResultsService.sanitize({
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            targetedBattleSquaddieIds: [thiefDynamic.battleSquaddieId, rogueDynamic.battleSquaddieId],
            resultPerTarget: {
                [thiefDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 1,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                },
                [rogueDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 1,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                }
            },
            actingSquaddieRoll: {
                occurred: true,
                rolls: [2, 6],
            },
            actingSquaddieModifiers: {
                [ATTACK_MODIFIER.MULTIPLE_ATTACK_PENALTY]: -3,
            },
        });

        const outputStrings: string[] = ActionResultTextService.outputResultForTextOnly({
            actionTemplateName: longswordSweepAction.name,
            currentActionEffectSquaddieTemplate: longswordSweepAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            result: damagingResult,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(6);
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep");
        expect(outputStrings[1]).toBe("   rolls (2, 6)");
        expect(outputStrings[2]).toBe("   -3: Multiple Attack");
        expect(outputStrings[3]).toBe(" Total 5");
        expect(outputStrings[4]).toBe("Thief takes 1 damage");
        expect(outputStrings[5]).toBe("Rogue takes 1 damage");
    });

    it('will hide the total and attack penalties if no roll was used', () => {
        const damagingResult: SquaddieSquaddieResults = SquaddieSquaddieResultsService.sanitize({
            actingBattleSquaddieId: knightDynamic.battleSquaddieId,
            targetedBattleSquaddieIds: [thiefDynamic.battleSquaddieId, rogueDynamic.battleSquaddieId],
            resultPerTarget: {
                [thiefDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 1,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                },
                [rogueDynamic.battleSquaddieId]: {
                    healingReceived: 0,
                    damageTaken: 1,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                }
            },
            actingSquaddieRoll: {
                occurred: false,
                rolls: [],
            },
            actingSquaddieModifiers: {
                [ATTACK_MODIFIER.MULTIPLE_ATTACK_PENALTY]: -3,
            },
        });

        const outputStrings: string[] = ActionResultTextService.outputResultForTextOnly({
            actionTemplateName: longswordSweepAction.name,
            currentActionEffectSquaddieTemplate: longswordSweepAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            result: damagingResult,
            squaddieRepository,
        });

        expect(outputStrings).toHaveLength(3);
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep");
        expect(outputStrings[1]).toBe("Thief takes 1 damage");
        expect(outputStrings[2]).toBe("Rogue takes 1 damage");
    });
});
