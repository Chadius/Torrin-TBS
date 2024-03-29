import {BattleOrchestratorState, BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {BattleSquaddieUsesActionOnSquaddie} from "./battleSquaddieUsesActionOnSquaddie";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {LabelHelper} from "../../ui/label";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {Recording, RecordingService} from "../history/recording";
import {BattleEvent, BattleEventService} from "../history/battleEvent";
import {DamageType, IsSquaddieAlive} from "../../squaddie/squaddieService";
import {MissionMap, MissionMapService} from "../../missionMap/missionMap";
import {SquaddieTargetsOtherSquaddiesAnimator} from "../animation/squaddieTargetsOtherSquaddiesAnimatior";
import {SquaddieSkipsAnimationAnimator} from "../animation/squaddieSkipsAnimationAnimator";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {InBattleAttributesHandler} from "../stats/inBattleAttributes";
import {SquaddieTurnService} from "../../squaddie/turn";
import {BattleStateService} from "../orchestrator/battleState";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {ActionTemplate, ActionTemplateService} from "../../action/template/actionTemplate";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../action/template/actionEffectSquaddieTemplate";
import {ActionsThisRoundService} from "../history/actionsThisRound";
import {ProcessedActionService} from "../../action/processed/processedAction";
import {ProcessedActionSquaddieEffectService} from "../../action/processed/processedActionSquaddieEffect";
import {DecidedActionSquaddieEffectService} from "../../action/decided/decidedActionSquaddieEffect";
import {SquaddieSquaddieResults, SquaddieSquaddieResultsService} from "../history/squaddieSquaddieResults";
import {DegreeOfSuccess} from "../actionCalculator/degreeOfSuccess";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {isValidValue} from "../../utils/validityCheck";
import {CampaignService} from "../../campaign/campaign";

describe('BattleSquaddieUsesActionOnSquaddie', () => {
    let squaddieRepository: ObjectRepository;
    let squaddieTemplateBase: SquaddieTemplate;
    let battleSquaddieBase: BattleSquaddie;
    let targetStatic: SquaddieTemplate;
    let targetDynamic: BattleSquaddie;
    let powerAttackLongswordAction: ActionTemplate;
    let monkKoanAction: ActionTemplate;
    let squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let battleEventRecording: Recording;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepository = ObjectRepositoryService.new();
        ({
            squaddieTemplate: squaddieTemplateBase,
            battleSquaddie: battleSquaddieBase,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Torrin",
            templateId: "static_squaddie",
            battleId: "dynamic_squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
            attributes: {
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                }),
                maxHitPoints: 1,
                armorClass: 0,
            },
        }));

        ({
            squaddieTemplate: targetStatic,
            battleSquaddie: targetDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Target",
            templateId: "target_static_squaddie",
            battleId: "target_dynamic_squaddie",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            attributes: {
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                }),
                maxHitPoints: 3,
                armorClass: 0,
            },
        }));

        powerAttackLongswordAction = ActionTemplateService.new({
            name: "power attack longsword",
            id: "powerAttackLongsword",
            actionPoints: 3,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: 9001,
                    },
                })
            ]
        });

        monkKoanAction = ActionTemplateService.new({
            id: "koan",
            name: "koan",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.SKIP_ANIMATION]: true
                    }),
                    maximumRange: 0,
                    minimumRange: 0,
                })
            ]
        });

        jest.spyOn(LabelHelper, "draw").mockReturnValue(null);
        jest.spyOn(OrchestratorUtilities, "drawSquaddieReachBasedOnSquaddieTurnAndAffiliation").mockImplementation(() => {
        });

        squaddieUsesActionOnSquaddie = new BattleSquaddieUsesActionOnSquaddie();

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        battleEventRecording = {history: []};
    });

    const useMonkKoanAndReturnState = ({missionMap}: {
        missionMap?: MissionMap
    }): GameEngineState => {
        const processedAction = ProcessedActionService.new({
            decidedAction: undefined,
            processedActionEffects: [
                ProcessedActionSquaddieEffectService.new({
                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                        template: monkKoanAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                        target: {q: 0, r: 0},
                    }),
                }),
            ]
        });

        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: battleSquaddieBase.battleSquaddieId,
            startingLocation: {q: 0, r: 0},
            previewedActionTemplateId: monkKoanAction.name,
            processedActions: [
                processedAction,
            ],
        });

        const newEvent: BattleEvent = BattleEventService.new({
            processedAction,
            results: {
                resultPerTarget: {},
                actingSquaddieRoll: {
                    occurred: false,
                    rolls: [],
                },
                actingBattleSquaddieId: battleSquaddieBase.battleSquaddieId,
                actingSquaddieModifiers: {},
                targetedBattleSquaddieIds: [],
            },
        });
        RecordingService.addEvent(battleEventRecording, newEvent);

        const battleOrchestratorState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                missionMap,
                recording: battleEventRecording,
                actionsThisRound,
            }),
        })

        const gameEngineState = GameEngineStateService.new({
            battleOrchestratorState,
            repository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            campaign: CampaignService.default({}),
        });

        battleOrchestratorState.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            battleId: battleSquaddieBase.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state: gameEngineState,
        });
        SquaddieTurnService.spendActionPoints(battleSquaddieBase.squaddieTurn, powerAttackLongswordAction.actionPoints);
        return gameEngineState;
    };

    function usePowerAttackLongswordAndReturnState({missionMap}: {
        missionMap?: MissionMap
    }): GameEngineState {
        const results: SquaddieSquaddieResults = SquaddieSquaddieResultsService.sanitize({
            actingBattleSquaddieId: battleSquaddieBase.battleSquaddieId,
            actingSquaddieModifiers: {},
            targetedBattleSquaddieIds: ["target_dynamic_squaddie"],
            actingSquaddieRoll: {
                occurred: false,
                rolls: [],
            },
            resultPerTarget: {
                ["target_dynamic_squaddie"]: {
                    damageTaken: 9001,
                    healingReceived: 0,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS
                }
            },
        });
        const processedAction = ProcessedActionService.new({
            decidedAction: undefined,
            processedActionEffects: [
                ProcessedActionSquaddieEffectService.new({
                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                        template: powerAttackLongswordAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                        target: {q: 0, r: 0},
                    }),
                    results,
                }),
            ]
        });

        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: battleSquaddieBase.battleSquaddieId,
            startingLocation: {q: 0, r: 0},
            previewedActionTemplateId: powerAttackLongswordAction.name,
            processedActions: [
                processedAction,
            ],
        });

        const newEvent: BattleEvent = BattleEventService.new({
            processedAction,
            results,
        });
        RecordingService.addEvent(battleEventRecording, newEvent);

        if (isValidValue(missionMap)) {
            MissionMapService.addSquaddie(missionMap, squaddieTemplateBase.squaddieId.templateId, battleSquaddieBase.battleSquaddieId, {
                q: 0,
                r: 0
            });
        }

        const battleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                missionMap,
                actionsThisRound,
                recording: battleEventRecording,
            })
        });

        const gameEngineState = GameEngineStateService.new({
            battleOrchestratorState,
            repository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            campaign: CampaignService.default({}),
        });

        battleOrchestratorState.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            battleId: battleSquaddieBase.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state: gameEngineState,
        });

        SquaddieTurnService.spendActionPoints(battleSquaddieBase.squaddieTurn, powerAttackLongswordAction.actionPoints);
        return gameEngineState;
    }

    it('hides dead squaddies after the action animates', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
        })

        const state = usePowerAttackLongswordAndReturnState({missionMap});
        expect(missionMap.isSquaddieHiddenFromDrawing(targetDynamic.battleSquaddieId)).toBeFalsy();

        InBattleAttributesHandler.takeDamage(
            targetDynamic.inBattleAttributes,
            targetStatic.attributes.maxHitPoints, DamageType.BODY
        );
        expect(IsSquaddieAlive({battleSquaddie: targetDynamic, squaddieTemplate: targetStatic})).toBeFalsy();

        jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "update").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "hasCompleted").mockReturnValue(true);

        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(missionMap.isSquaddieHiddenFromDrawing(targetDynamic.battleSquaddieId)).toBeTruthy();
    });

    it('resets squaddie currently acting when it runs out of actions and finishes acting', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
        })

        const state = usePowerAttackLongswordAndReturnState({missionMap});
        battleSquaddieBase.squaddieTurn.remainingActionPoints = 0;

        jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "update").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "hasCompleted").mockReturnValue(true);

        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeTruthy();

        squaddieUsesActionOnSquaddie.recommendStateChanges(state);
        expect(state.battleOrchestratorState.battleState.actionsThisRound).toBeUndefined();
    });

    it('reopens HUD on squaddie when it finishes animating and can still act', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
        })

        const state = usePowerAttackLongswordAndReturnState({missionMap});
        battleSquaddieBase.squaddieTurn.remainingActionPoints = 1;

        jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "update").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "hasCompleted").mockReturnValue(true);

        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeTruthy();

        squaddieUsesActionOnSquaddie.recommendStateChanges(state);
        squaddieUsesActionOnSquaddie.reset(state);
        expect(state.battleOrchestratorState.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeTruthy();
        expect(state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId).not.toBeUndefined();
    });

    it('uses the SquaddieTargetsOtherSquaddiesAnimator for appropriate situations and waits after it completes', () => {
        const state = usePowerAttackLongswordAndReturnState({});

        const squaddieTargetsOtherSquaddiesAnimatorUpdateSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "update").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorResetSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "reset").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "hasCompleted").mockReturnValue(false);
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);

        expect(squaddieUsesActionOnSquaddie.squaddieActionAnimator).toBeInstanceOf(SquaddieTargetsOtherSquaddiesAnimator);
        expect(squaddieTargetsOtherSquaddiesAnimatorUpdateSpy).toBeCalled();
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeFalsy();

        squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy.mockReturnValue(true);
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);
        expect(squaddieTargetsOtherSquaddiesAnimatorUpdateSpy).toBeCalled();
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeTruthy();

        const stateChanges = squaddieUsesActionOnSquaddie.recommendStateChanges(state);
        expect(stateChanges.nextMode).toBeUndefined();
        expect(stateChanges.displayMap).toBeTruthy();

        squaddieUsesActionOnSquaddie.reset(state);
        expect(squaddieTargetsOtherSquaddiesAnimatorResetSpy).toBeCalled();
    });

    it('uses the SquaddieSkipsAnimationAnimator for actions that lack animation and waits after it completes', () => {
        const state = useMonkKoanAndReturnState({});

        const squaddieSkipsAnimationAnimatorUpdateSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator, "update").mockImplementation();
        const squaddieSkipsAnimationAnimatorResetSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator, "reset").mockImplementation();
        const squaddieSkipsAnimationAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator, "hasCompleted").mockReturnValue(false);
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);

        expect(squaddieUsesActionOnSquaddie.squaddieActionAnimator).toBeInstanceOf(SquaddieSkipsAnimationAnimator);
        expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled();
        expect(squaddieSkipsAnimationAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeFalsy();

        squaddieSkipsAnimationAnimatorHasCompletedSpy.mockReturnValue(true);
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);
        expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled();
        expect(squaddieSkipsAnimationAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeTruthy();

        squaddieUsesActionOnSquaddie.reset(state);
        expect(squaddieSkipsAnimationAnimatorResetSpy).toBeCalled();
    });

    it('passes mouse events on to the animator', () => {
        const state = usePowerAttackLongswordAndReturnState({});

        const squaddieTargetsOtherSquaddiesAnimatorMouseEventHappenedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "mouseEventHappened").mockImplementation();

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
        };

        squaddieUsesActionOnSquaddie.mouseEventHappened(state, mouseEvent);
        expect(squaddieTargetsOtherSquaddiesAnimatorMouseEventHappenedSpy).toBeCalled();
    });
});
