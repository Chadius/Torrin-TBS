import {OrchestratorState} from "../orchestrator/orchestratorState";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {ACTIVITY_COMPLETED_WAIT_TIME_MS, BattleSquaddieSquaddieActivity} from "./battleSquaddieSquaddieActivity";
import {SquaddieActivity} from "../../squaddie/activity";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/orchestratorComponent";
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

describe('BattleSquaddieSquaddieActivity', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let staticSquaddieBase: BattleSquaddieStatic;
    let dynamicSquaddieBase: BattleSquaddieDynamic;
    let longswordActivity: SquaddieActivity;
    let powerAttackLongswordActivity: SquaddieActivity;
    let squaddieSquaddieActivity: BattleSquaddieSquaddieActivity;
    let oneActionInstruction: SquaddieInstruction;
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

        longswordActivity = new SquaddieActivity({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 1,
        });

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
        });

        jest.spyOn(Label.prototype, "draw").mockReturnValue(null);
        jest.spyOn(orchestratorUtils, "DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation").mockImplementation(() => {
        });

        squaddieSquaddieActivity = new BattleSquaddieSquaddieActivity();

        oneActionInstruction = new SquaddieInstruction({
            staticSquaddieId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        oneActionInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieActivity: longswordActivity,
        }));

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        const wholeTurnInstruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        wholeTurnInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieActivity: powerAttackLongswordActivity,
        }));

        battleEventRecording = new Recording({});
        battleEventRecording.addEvent(new BattleEvent({
            currentSquaddieInstruction: new SquaddieInstructionInProgress({
                instruction: wholeTurnInstruction,
                currentSquaddieActivity: powerAttackLongswordActivity,
            }),
            results: new SquaddieSquaddieResults({
                actingSquaddieDynamicId: dynamicSquaddieBase.dynamicSquaddieId,
                targetedSquaddieDynamicIds: [],
            })
        }));
    });

    it('can wait half a second before ending turn', () => {
        const wholeTurnInstruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        wholeTurnInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieActivity: powerAttackLongswordActivity,
        }));

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: OrchestratorState = new OrchestratorState({
            squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                instruction: wholeTurnInstruction,
                currentSquaddieActivity: powerAttackLongswordActivity,
            }),
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            hexMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
            battleEventRecording,
        })

        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicID: dynamicSquaddieBase.dynamicSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
        });
        dynamicSquaddieBase.squaddieTurn.spendActionsOnActivity(powerAttackLongswordActivity);
        squaddieSquaddieActivity.update(state, mockedP5);
        expect(squaddieSquaddieActivity.animationCompleteStartTime).not.toBeUndefined();
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeFalsy();
        jest.spyOn(Date, 'now').mockImplementation(() => ACTIVITY_COMPLETED_WAIT_TIME_MS);

        squaddieSquaddieActivity.update(state, mockedP5);
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeTruthy();

        const stateChanges = squaddieSquaddieActivity.recommendStateChanges(state);
        expect(stateChanges.nextMode).toBeUndefined();
        expect(stateChanges.displayMap).toBeTruthy();

        squaddieSquaddieActivity.reset(state);
        expect(squaddieSquaddieActivity.animationCompleteStartTime).toBeUndefined();
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie()).toBeTruthy();
    });

    it('can wait half a second after activity completes', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: OrchestratorState = new OrchestratorState({
            squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                instruction: oneActionInstruction,
                currentSquaddieActivity: powerAttackLongswordActivity,
            }),
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            hexMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
            battleEventRecording,
        })

        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicID: dynamicSquaddieBase.dynamicSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
        });

        squaddieSquaddieActivity.update(state, mockedP5);
        jest.spyOn(Date, 'now').mockImplementation(() => ACTIVITY_COMPLETED_WAIT_TIME_MS);

        squaddieSquaddieActivity.update(state, mockedP5);

        const stateChanges = squaddieSquaddieActivity.recommendStateChanges(state);
        expect(stateChanges.nextMode).toBeUndefined();
        expect(stateChanges.displayMap).toBeTruthy();

        squaddieSquaddieActivity.reset(state);
        expect(squaddieSquaddieActivity.animationCompleteStartTime).toBeUndefined();
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie()).toBeFalsy();
        expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeTruthy();
    });

    it('will skip displaying the results if the user clicks', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: OrchestratorState = new OrchestratorState({
            squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                instruction: oneActionInstruction,
                currentSquaddieActivity: powerAttackLongswordActivity,
            }),
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            hexMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
            battleEventRecording,
        })

        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicID: dynamicSquaddieBase.dynamicSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
        });

        squaddieSquaddieActivity.update(state, mockedP5);
        jest.spyOn(Date, 'now').mockImplementation(() => ACTIVITY_COMPLETED_WAIT_TIME_MS / 2);

        squaddieSquaddieActivity.update(state, mockedP5);
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeFalsy();

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
        };

        squaddieSquaddieActivity.mouseEventHappened(state, mouseEvent);
        squaddieSquaddieActivity.update(state, mockedP5);
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeTruthy();
        expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeTruthy();
    });
});
