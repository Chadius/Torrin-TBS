import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {BattleSquaddieUsesActionOnSquaddie} from "./battleSquaddieUsesActionOnSquaddie";
import {SquaddieAction} from "../../squaddie/action";
import {SquaddieSquaddieAction} from "../history/squaddieSquaddieAction";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {Label} from "../../ui/label";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as orchestratorUtils from "./orchestratorUtils";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {Recording} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {DamageType, IsSquaddieAlive} from "../../squaddie/squaddieService";
import {MissionMap} from "../../missionMap/missionMap";
import {ActionResultPerSquaddie} from "../history/actionResultPerSquaddie";
import {SquaddieTargetsOtherSquaddiesAnimator} from "../animation/squaddieTargetsOtherSquaddiesAnimatior";
import {SquaddieSkipsAnimationAnimator} from "../animation/squaddieSkipsAnimationAnimator";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

describe('BattleSquaddieUsesActionOnSquaddie', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let squaddietemplateBase: SquaddieTemplate;
    let dynamicSquaddieBase: BattleSquaddie;
    let targetStatic: SquaddieTemplate;
    let targetDynamic: BattleSquaddie;
    let powerAttackLongswordAction: SquaddieAction;
    let monkKoanAction: SquaddieAction;
    let monkMeditatesEvent: BattleEvent;
    let monkMeditatesInstruction: SquaddieInstructionInProgress;
    let squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let battleEventRecording: Recording;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepository = new BattleSquaddieRepository();
        ({
            squaddietemplate: squaddietemplateBase,
            dynamicSquaddie: dynamicSquaddieBase,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Torrin",
            staticId: "static_squaddie",
            dynamicId: "dynamic_squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
            attributes: new ArmyAttributes({
                movement: new SquaddieMovement({
                    movementPerAction: 2,
                    traits: new TraitStatusStorage({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }).filterCategory(TraitCategory.MOVEMENT)
                }),
            }),
        }));

        ({
            squaddietemplate: targetStatic,
            dynamicSquaddie: targetDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Target",
            staticId: "target_static_squaddie",
            dynamicId: "target_dynamic_squaddie",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            attributes: new ArmyAttributes({
                movement: new SquaddieMovement({
                    movementPerAction: 2,
                    traits: new TraitStatusStorage({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }).filterCategory(TraitCategory.MOVEMENT)
                }),
                maxHitPoints: 3,
            }),
        }));

        powerAttackLongswordAction = new SquaddieAction({
            name: "power attack longsword",
            id: "powerAttackLongsword",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 3,
            damageDescriptions: {
                [DamageType.Body]: 9001,
            },
        });

        monkKoanAction = new SquaddieAction({
            id: "koan",
            name: "koan",
            traits: new TraitStatusStorage({
                [Trait.SKIP_ANIMATION]: true
            }),
            maximumRange: 0,
            minimumRange: 0,
        });

        jest.spyOn(Label.prototype, "draw").mockReturnValue(null);
        jest.spyOn(orchestratorUtils, "DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation").mockImplementation(() => {
        });

        squaddieUsesActionOnSquaddie = new BattleSquaddieUsesActionOnSquaddie();

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        battleEventRecording = new Recording({});
    });

    function useMonkKoanAndReturnState({missionMap}: { missionMap?: MissionMap }) {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddietemplateId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        instruction.addAction(new SquaddieSquaddieAction({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieAction: monkKoanAction,
        }))
        monkMeditatesInstruction = new SquaddieInstructionInProgress({
            actionsForThisRound: instruction,
            currentSquaddieAction: monkKoanAction,
        });
        monkMeditatesInstruction.addSelectedAction(monkKoanAction);

        monkMeditatesEvent = new BattleEvent({
            currentSquaddieInstruction: monkMeditatesInstruction,
            results: new SquaddieSquaddieResults({
                actingSquaddieDynamicId: dynamicSquaddieBase.dynamicSquaddieId,
                targetedSquaddieDynamicIds: [],
                resultPerTarget: {},
            })
        });

        battleEventRecording.addEvent(monkMeditatesEvent);

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: monkMeditatesInstruction,
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            missionMap,
            hexMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
            battleEventRecording,
        })

        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicId: dynamicSquaddieBase.dynamicSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        dynamicSquaddieBase.squaddieTurn.spendActionPointsOnAction(powerAttackLongswordAction);
        return state;
    }

    function usePowerAttackLongswordAndReturnState({missionMap}: { missionMap?: MissionMap }) {
        const wholeTurnInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddietemplateId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        wholeTurnInstruction.addAction(new SquaddieSquaddieAction({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieAction: powerAttackLongswordAction,
        }));

        const squaddieInstructionInProgress = new SquaddieInstructionInProgress({
            actionsForThisRound: wholeTurnInstruction,
            currentSquaddieAction: powerAttackLongswordAction,
        });

        const newEvent: BattleEvent = new BattleEvent({
            currentSquaddieInstruction: squaddieInstructionInProgress,
            results: new SquaddieSquaddieResults({
                actingSquaddieDynamicId: dynamicSquaddieBase.dynamicSquaddieId,
                targetedSquaddieDynamicIds: ["target_dynamic_squaddie"],
                resultPerTarget: {["target_dynamic_squaddie"]: new ActionResultPerSquaddie({damageTaken: 9001})}
            })
        });
        battleEventRecording.addEvent(newEvent);

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: squaddieInstructionInProgress,
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            missionMap,
            hexMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
            battleEventRecording,
        })

        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicId: dynamicSquaddieBase.dynamicSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state,
        });
        dynamicSquaddieBase.squaddieTurn.spendActionPointsOnAction(powerAttackLongswordAction);
        return state;
    }

    it('hides dead squaddies after the action animates', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
        })

        const state = usePowerAttackLongswordAndReturnState({missionMap});
        expect(missionMap.isSquaddieHiddenFromDrawing(targetDynamic.dynamicSquaddieId)).toBeFalsy();

        targetDynamic.inBattleAttributes.takeDamage(targetStatic.attributes.maxHitPoints, DamageType.Body);
        expect(IsSquaddieAlive({dynamicSquaddie: targetDynamic, squaddietemplate: targetStatic})).toBeFalsy();

        jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "update").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "hasCompleted").mockReturnValue(true);

        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(missionMap.isSquaddieHiddenFromDrawing(targetDynamic.dynamicSquaddieId)).toBeTruthy();
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
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();
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
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();
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
