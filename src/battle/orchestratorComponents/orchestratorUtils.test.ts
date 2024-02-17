import {BattleSquaddie, BattleSquaddieService} from "../battleSquaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera} from "../battleCamera";
import {convertMapCoordinatesToScreenCoordinates,} from "../../hexMap/convertCoordinates";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate, SquaddieTemplateService} from "../../campaign/squaddieTemplate";
import {ArmyAttributesService} from "../../squaddie/armyAttributes";
import {SquaddieIdService} from "../../squaddie/id";
import {BattleOrchestratorState, BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {BattleStateService} from "../orchestrator/battleState";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {
    ProcessedActionSquaddieEffect,
    ProcessedActionSquaddieEffectService
} from "../../action/processed/processedActionSquaddieEffect";
import {
    ProcessedActionMovementEffect,
    ProcessedActionMovementEffectService
} from "../../action/processed/processedActionMovementEffect";
import {
    DecidedActionMovementEffect,
    DecidedActionMovementEffectService
} from "../../action/decided/decidedActionMovementEffect";
import {ActionEffectMovementTemplateService} from "../../action/template/actionEffectMovementTemplate";
import {
    ProcessedActionEndTurnEffect,
    ProcessedActionEndTurnEffectService
} from "../../action/processed/processedActionEndTurnEffect";
import {DecidedActionSquaddieEffectService} from "../../action/decided/decidedActionSquaddieEffect";
import {ActionEffectSquaddieTemplateService} from "../../action/template/actionEffectSquaddieTemplate";
import {DecidedActionEndTurnEffectService} from "../../action/decided/decidedActionEndTurnEffect";
import {ActionEffectEndTurnTemplateService} from "../../action/template/actionEffectEndTurnTemplate";
import {ActionsThisRound, ActionsThisRoundService} from "../history/actionsThisRound";
import {ProcessedAction, ProcessedActionService} from "../../action/processed/processedAction";
import {DecidedActionService} from "../../action/decided/decidedAction";
import {BattlePhaseStateService} from "./battlePhaseController";
import {BattlePhase} from "./battlePhaseTracker";
import {SquaddieTurnService} from "../../squaddie/turn";
import {InBattleAttributesHandler} from "../stats/inBattleAttributes";
import {DamageType, SquaddieService} from "../../squaddie/squaddieService";

describe("Orchestration Utils", () => {
    let knightSquaddieStatic: SquaddieTemplate;
    let knightBattleSquaddie: BattleSquaddie;
    let squaddieRepository: ObjectRepository;
    let map: MissionMap;
    let camera: BattleCamera;
    let movementActionEffect: ProcessedActionMovementEffect;
    let squaddieActionEffect: ProcessedActionSquaddieEffect;
    let endTurnActionEffect: ProcessedActionEndTurnEffect;

    beforeEach(() => {
        squaddieRepository = ObjectRepositoryService.new();

        ({
            squaddieTemplate: knightSquaddieStatic,
            battleSquaddie: knightBattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "knight",
            templateId: "knight_static",
            battleId: "knight_dynamic",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
        }));

        map = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 "
                ]
            })
        });
        map.addSquaddie(
            knightSquaddieStatic.squaddieId.templateId,
            knightBattleSquaddie.battleSquaddieId,
            {q: 0, r: 2}
        );

        camera = new BattleCamera();

        movementActionEffect = ProcessedActionMovementEffectService.new({
            decidedActionEffect: DecidedActionMovementEffectService.new({
                destination: {q: 0, r: 2},
                template: ActionEffectMovementTemplateService.new({}),
            })
        });

        squaddieActionEffect = ProcessedActionSquaddieEffectService.new({
            decidedActionEffect: DecidedActionSquaddieEffectService.new({
                target: {q: 0, r: 2},
                template: ActionEffectSquaddieTemplateService.new({}),
            }),
            results: undefined,
        });

        endTurnActionEffect = ProcessedActionEndTurnEffectService.new({
            decidedActionEffect: DecidedActionEndTurnEffectService.new({
                template: ActionEffectEndTurnTemplateService.new({})
            })
        });
    });

    it('can return the squaddie and information at a given location on the screen', () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 2, ...camera.getCoordinates());

        const {
            squaddieTemplate,
            battleSquaddie,
            squaddieMapLocation,
        } = OrchestratorUtilities.getSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            camera,
            map,
            squaddieRepository,
        });

        expect(squaddieTemplate).toStrictEqual(knightSquaddieStatic);
        expect(battleSquaddie).toStrictEqual(knightBattleSquaddie);
        expect(squaddieMapLocation).toStrictEqual({q: 0, r: 2});
    });

    it('can return the squaddie and information at a given map location', () => {
        const {
            squaddieTemplate,
            battleSquaddie,
            squaddieMapLocation,
        } = OrchestratorUtilities.getSquaddieAtMapLocation({
            mapLocation: {q: 0, r: 2},
            map,
            squaddieRepository,
        });

        expect(squaddieTemplate).toStrictEqual(knightSquaddieStatic);
        expect(battleSquaddie).toStrictEqual(knightBattleSquaddie);
        expect(squaddieMapLocation).toStrictEqual({q: 0, r: 2});
    });

    it('returns undefined information if there is no squaddie at the location', () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());

        const {
            squaddieTemplate,
            battleSquaddie,
            squaddieMapLocation,
        } = OrchestratorUtilities.getSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            camera,
            map,
            squaddieRepository,
        });

        expect(squaddieTemplate).toBeUndefined();
        expect(battleSquaddie).toBeUndefined();
        expect(squaddieMapLocation).toBeUndefined();
    });

    it('throws an error if squaddie repository does not have squaddie', () => {
        map.addSquaddie("static does not exist", "dynamic does not exist",
            {q: 0, r: 0}
        );
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());

        const shouldThrowError = () => {
            OrchestratorUtilities.getSquaddieAtScreenLocation({
                mouseX,
                mouseY,
                camera,
                map,
                squaddieRepository,
            });
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
    });

    describe('isSquaddieCurrentlyTakingATurn', () => {
        let repository: ObjectRepository;
        let state: GameEngineState;
        let movementProcessedAction: ProcessedAction;

        beforeEach(() => {
            repository = ObjectRepositoryService.new();
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                SquaddieTemplateService.new({
                    attributes: ArmyAttributesService.default(),
                    squaddieId: SquaddieIdService.new({
                        templateId: "templateId",
                        name: "name",
                        affiliation: SquaddieAffiliation.PLAYER,
                    }),
                })
            )
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                BattleSquaddieService.new({
                    squaddieTemplateId: "templateId",
                    battleSquaddieId: "battle"
                })
            );

            state = GameEngineStateService.new({
                battleOrchestratorState: new BattleOrchestratorState({
                    battleState: BattleStateService.defaultBattleState({
                        missionId: "missionId"
                    }),
                    battleSquaddieSelectedHUD: undefined,
                    numberGenerator: undefined,
                }),
                resourceHandler: undefined,
                repository: repository,
            });

            movementProcessedAction = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    battleSquaddieId: "battle",
                    actionPointCost: 1,
                    actionTemplateName: "Move",
                    actionEffects: [
                        DecidedActionMovementEffectService.new({
                            destination: {q: 0, r: 1},
                            template: ActionEffectMovementTemplateService.new({})
                        })
                    ]
                })
            });
        });

        it('is not if there is no state or battle state', () => {
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(undefined)).toBeFalsy();
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                GameEngineStateService.new({
                    battleOrchestratorState: new BattleOrchestratorState({
                        battleState: undefined,
                        battleSquaddieSelectedHUD: undefined,
                        numberGenerator: undefined,
                    }),
                    resourceHandler: undefined,
                    repository: squaddieRepository,
                }))).toBeFalsy();
        });

        it('is not if there is no squaddie is currently acting', () => {
            state.battleOrchestratorState.battleState.actionsThisRound = undefined;
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeFalsy();
        });

        it('is if the squaddie is previewing a decision', () => {
            state.battleOrchestratorState.battleState.actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battle",
                startingLocation: {q: 0, r: 0},
                processedActions: [],
                previewedActionTemplateId: "maybe use this action?",
            });
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeTruthy();
        });

        it('is if the squaddie already made a decision that does not end the turn', () => {
            state.battleOrchestratorState.battleState.actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battle",
                startingLocation: {q: 0, r: 0},
                processedActions: [movementProcessedAction],
                previewedActionTemplateId: undefined,
            });
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeTruthy();
        });

        it('is not taking a turn if there is no battle squaddie Id', () => {
            state.battleOrchestratorState.battleState.actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "",
                startingLocation: {q: 0, r: 0},
                processedActions: [],
                previewedActionTemplateId: "forgot to set the battle squaddie id",
            });

            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeFalsy();
        });
    });

    describe('getNextModeBasedOnProcessedActionEffect', () => {
        it('will recommend moving a squaddie if the next action effect is movement type', () => {
            expect(OrchestratorUtilities.getNextModeBasedOnProcessedActionEffect(movementActionEffect)).toEqual(BattleOrchestratorMode.SQUADDIE_MOVER);
        });
        it('will recommend using an action effect on a squaddie if the next action effect is squaddie type', () => {
            expect(OrchestratorUtilities.getNextModeBasedOnProcessedActionEffect(squaddieActionEffect)).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);
        });
        it('will recommend acting on the map if the next action effect is end turn', () => {
            expect(OrchestratorUtilities.getNextModeBasedOnProcessedActionEffect(endTurnActionEffect)).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);
        });
        it('will return undefined if there is no action effect', () => {
            expect(OrchestratorUtilities.getNextModeBasedOnProcessedActionEffect(undefined)).toBeUndefined();
        });
    });

    describe('clearActionsThisRoundIfSquaddieCannotAct', () => {
        let repository: ObjectRepository;
        let battleSquaddie: BattleSquaddie;
        let squaddieTemplate: SquaddieTemplate;
        let decidedActionMovementEffect: DecidedActionMovementEffect;
        let gameEngineState: GameEngineState;
        let actionsThisRound: ActionsThisRound;

        beforeEach(() => {
            repository = ObjectRepositoryService.new();
            squaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "squaddieTemplate",
                    name: "Squaddie Template",
                    affiliation: SquaddieAffiliation.PLAYER,
                })
            });
            ObjectRepositoryService.addSquaddieTemplate(repository, squaddieTemplate);

            battleSquaddie = BattleSquaddieService.new({
                squaddieTemplate,
                battleSquaddieId: "battleSquaddieId"
            });
            ObjectRepositoryService.addBattleSquaddie(repository, battleSquaddie);

            decidedActionMovementEffect = DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
                destination: {q: 0, r: 0},
            });

            gameEngineState = GameEngineStateService.new({
                repository,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleState: BattleStateService.new({
                        battlePhaseState: BattlePhaseStateService.new({
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        }),
                        missionId: "mission"
                    })
                })
            });

            actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                startingLocation: {q: 0, r: 0},
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            actionPointCost: 0,
                            actionTemplateName: "Move",
                            actionEffects: [decidedActionMovementEffect],
                            battleSquaddieId: battleSquaddie.battleSquaddieId,
                        }),
                        processedActionEffects: [
                            ProcessedActionMovementEffectService.new({
                                decidedActionEffect: decidedActionMovementEffect
                            })
                        ]
                    })
                ]
            });
        });

        it('will not throw an error if there is no ActionsThisRound', () => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound = undefined;

            expect(() => OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(gameEngineState)).not.toThrow();
        });
        it('will not clear if the squaddie has not acted yet', () => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound = actionsThisRound;

            OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(gameEngineState);
            expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound).toEqual(actionsThisRound);
        });
        it('will not clear if the squaddie has acted and has actions remaining', () => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound = actionsThisRound;
            ActionsThisRoundService.nextProcessedActionEffectToShow(gameEngineState.battleOrchestratorState.battleState.actionsThisRound);
            expect(ActionsThisRoundService.getProcessedActionEffectToShow(gameEngineState.battleOrchestratorState.battleState.actionsThisRound)).toBeUndefined();

            OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(gameEngineState);
            expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound).toEqual(actionsThisRound);
        });
        it('will clear if the squaddie has no actions remaining', () => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound = actionsThisRound;
            SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn);

            OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(gameEngineState);
            expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound).toBeUndefined();
        });
        it('will clear if the squaddie is dead', () => {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound = actionsThisRound;
            InBattleAttributesHandler.takeDamage(battleSquaddie.inBattleAttributes, battleSquaddie.inBattleAttributes.currentHitPoints, DamageType.UNKNOWN);
            const {
                isDead
            } = SquaddieService.canSquaddieActRightNow({
                squaddieTemplate: squaddieTemplate,
                battleSquaddie: battleSquaddie
            })
            expect(isDead).toBeTruthy();

            OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(gameEngineState);
            expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound).toBeUndefined();
        });
    });
});
