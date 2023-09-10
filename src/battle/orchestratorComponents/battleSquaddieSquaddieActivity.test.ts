import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {BattleSquaddieSquaddieActivity} from "./battleSquaddieSquaddieActivity";
import {SquaddieActivity} from "../../squaddie/activity";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
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
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {Recording} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {DamageType, IsSquaddieAlive} from "../../squaddie/squaddieService";
import {MissionMap} from "../../missionMap/missionMap";
import {ActivityResult} from "../history/activityResult";
import {SquaddieTargetsOtherSquaddiesAnimator} from "../animation/squaddieTargetsOtherSquaddiesAnimatior";
import {SquaddieSkipsAnimationAnimator} from "../animation/squaddieSkipsAnimationAnimator";

describe('BattleSquaddieSquaddieActivity', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let staticSquaddieBase: BattleSquaddieStatic;
    let dynamicSquaddieBase: BattleSquaddieDynamic;
    let targetStatic: BattleSquaddieStatic;
    let targetDynamic: BattleSquaddieDynamic;
    let powerAttackLongswordActivity: SquaddieActivity;
    let monkKoanActivity: SquaddieActivity;
    let monkMeditatesEvent: BattleEvent;
    let monkMeditatesInstruction: SquaddieInstructionInProgress;
    let squaddieSquaddieActivity: BattleSquaddieSquaddieActivity;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let mockedP5 = mocks.mockedP5();
    let battleEventRecording: Recording;

    beforeEach(() => {
        mockedP5 = mocks.mockedP5();
        squaddieRepository = new BattleSquaddieRepository();
        ({
            staticSquaddie: staticSquaddieBase,
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
            staticSquaddie: targetStatic,
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

        powerAttackLongswordActivity = new SquaddieActivity({
            name: "power attack longsword",
            id: "powerAttackLongsword",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 3,
            damageDescriptions: {
                [DamageType.Body]: 9001,
            },
        });

        monkKoanActivity = new SquaddieActivity({
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

        squaddieSquaddieActivity = new BattleSquaddieSquaddieActivity();

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        battleEventRecording = new Recording({});
    });

    function useMonkKoanAndReturnState({missionMap}: { missionMap?: MissionMap }) {
        const instruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        instruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieActivity: monkKoanActivity,
        }))
        monkMeditatesInstruction = new SquaddieInstructionInProgress({
            activitiesForThisRound: instruction,
            currentSquaddieActivity: monkKoanActivity,
        });
        monkMeditatesInstruction.addSelectedActivity(monkKoanActivity);

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
        dynamicSquaddieBase.squaddieTurn.spendActionsOnActivity(powerAttackLongswordActivity);
        return state;
    }

    function usePowerAttackLongswordAndReturnState({missionMap}: { missionMap?: MissionMap }) {
        const wholeTurnInstruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        wholeTurnInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieActivity: powerAttackLongswordActivity,
        }));

        const squaddieInstructionInProgress = new SquaddieInstructionInProgress({
            activitiesForThisRound: wholeTurnInstruction,
            currentSquaddieActivity: powerAttackLongswordActivity,
        });

        const newEvent: BattleEvent = new BattleEvent({
            currentSquaddieInstruction: squaddieInstructionInProgress,
            results: new SquaddieSquaddieResults({
                actingSquaddieDynamicId: dynamicSquaddieBase.dynamicSquaddieId,
                targetedSquaddieDynamicIds: ["target_dynamic_squaddie"],
                resultPerTarget: {["target_dynamic_squaddie"]: new ActivityResult({damageTaken: 9001})}
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
        dynamicSquaddieBase.squaddieTurn.spendActionsOnActivity(powerAttackLongswordActivity);
        return state;
    }

    it('hides dead squaddies after the action animates', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
        })

        const state = usePowerAttackLongswordAndReturnState({missionMap});
        expect(missionMap.isSquaddieHiddenFromDrawing(targetDynamic.dynamicSquaddieId)).toBeFalsy();

        targetDynamic.inBattleAttributes.takeDamage(targetStatic.attributes.maxHitPoints, DamageType.Body);
        expect(IsSquaddieAlive({dynamicSquaddie: targetDynamic, staticSquaddie: targetStatic})).toBeFalsy();

        jest.spyOn(squaddieSquaddieActivity.squaddieTargetsOtherSquaddiesAnimator, "update").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest.spyOn(squaddieSquaddieActivity.squaddieTargetsOtherSquaddiesAnimator, "hasCompleted").mockReturnValue(true);

        squaddieSquaddieActivity.update(state, mockedP5);
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(missionMap.isSquaddieHiddenFromDrawing(targetDynamic.dynamicSquaddieId)).toBeTruthy();
    });

    it('uses the SquaddieTargetsOtherSquaddiesAnimator for appropriate situations and waits after it completes', () => {
        const state = usePowerAttackLongswordAndReturnState({});

        const squaddieTargetsOtherSquaddiesAnimatorUpdateSpy = jest.spyOn(squaddieSquaddieActivity.squaddieTargetsOtherSquaddiesAnimator, "update").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorResetSpy = jest.spyOn(squaddieSquaddieActivity.squaddieTargetsOtherSquaddiesAnimator, "reset").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest.spyOn(squaddieSquaddieActivity.squaddieTargetsOtherSquaddiesAnimator, "hasCompleted").mockReturnValue(false);
        squaddieSquaddieActivity.update(state, mockedP5);

        expect(squaddieSquaddieActivity.squaddieActionAnimator).toBeInstanceOf(SquaddieTargetsOtherSquaddiesAnimator);
        expect(squaddieTargetsOtherSquaddiesAnimatorUpdateSpy).toBeCalled();
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeFalsy();

        squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy.mockReturnValue(true);
        squaddieSquaddieActivity.update(state, mockedP5);
        expect(squaddieTargetsOtherSquaddiesAnimatorUpdateSpy).toBeCalled();
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeTruthy();

        const stateChanges = squaddieSquaddieActivity.recommendStateChanges(state);
        expect(stateChanges.nextMode).toBeUndefined();
        expect(stateChanges.displayMap).toBeTruthy();

        squaddieSquaddieActivity.reset(state);
        expect(squaddieTargetsOtherSquaddiesAnimatorResetSpy).toBeCalled();
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();
    });

    it('uses the SquaddieSkipsAnimationAnimator for activities that lack animation and waits after it completes', () => {
        const state = useMonkKoanAndReturnState({});

        const squaddieSkipsAnimationAnimatorUpdateSpy = jest.spyOn(squaddieSquaddieActivity.squaddieSkipsAnimationAnimator, "update").mockImplementation();
        const squaddieSkipsAnimationAnimatorResetSpy = jest.spyOn(squaddieSquaddieActivity.squaddieSkipsAnimationAnimator, "reset").mockImplementation();
        const squaddieSkipsAnimationAnimatorHasCompletedSpy = jest.spyOn(squaddieSquaddieActivity.squaddieSkipsAnimationAnimator, "hasCompleted").mockReturnValue(false);
        squaddieSquaddieActivity.update(state, mockedP5);

        expect(squaddieSquaddieActivity.squaddieActionAnimator).toBeInstanceOf(SquaddieSkipsAnimationAnimator);
        expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled();
        expect(squaddieSkipsAnimationAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeFalsy();

        squaddieSkipsAnimationAnimatorHasCompletedSpy.mockReturnValue(true);
        squaddieSquaddieActivity.update(state, mockedP5);
        expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled();
        expect(squaddieSkipsAnimationAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeTruthy();

        squaddieSquaddieActivity.reset(state);
        expect(squaddieSkipsAnimationAnimatorResetSpy).toBeCalled();
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();
    });

    it('passes mouse events on to the animator', () => {
        const state = usePowerAttackLongswordAndReturnState({});

        const squaddieTargetsOtherSquaddiesAnimatorMouseEventHappenedSpy = jest.spyOn(squaddieSquaddieActivity.squaddieTargetsOtherSquaddiesAnimator, "mouseEventHappened").mockImplementation();

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
        };

        squaddieSquaddieActivity.mouseEventHappened(state, mouseEvent);
        expect(squaddieTargetsOtherSquaddiesAnimatorMouseEventHappenedSpy).toBeCalled();
    });
});
