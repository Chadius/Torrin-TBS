import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {BattlePlayerSquaddieTarget} from "./battlePlayerSquaddieTarget";
import {BattleSquaddie} from "../battleSquaddie";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../../squaddie/action";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionMap} from "../../missionMap/missionMap";
import {HexCoordinateToKey} from "../../hexMap/hexCoordinate/hexCoordinate";
import {BattleOrchestratorStateHelper} from "../orchestrator/battleOrchestratorState";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {SquaddieSquaddieActionData} from "../history/squaddieSquaddieAction";
import {
    SquaddieInstructionInProgress,
    SquaddieInstructionInProgressHandler
} from "../history/squaddieInstructionInProgress";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {DamageType, GetHitPoints, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {BattleEvent} from "../history/battleEvent";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {BattleStateHelper} from "../orchestrator/battleState";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {GameEngineState, GameEngineStateHelper} from "../../gameEngine/gameEngine";

describe('BattleSquaddieTarget', () => {
    let squaddieRepo: ObjectRepository = ObjectRepositoryHelper.new();
    let targetComponent: BattlePlayerSquaddieTarget;
    let knightStatic: SquaddieTemplate;
    let knightDynamic: BattleSquaddie;
    let citizenStatic: SquaddieTemplate;
    let citizenDynamic: BattleSquaddie;
    let thiefStatic: SquaddieTemplate;
    let thiefDynamic: BattleSquaddie;
    let battleMap: MissionMap;
    let longswordAction: SquaddieSquaddieAction;
    let longswordActionId: string = "longsword";
    let bandageWoundsAction: SquaddieSquaddieAction;
    let bandageWoundsActionId: string = "bandage wounds";
    let state: GameEngineState;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        targetComponent = new BattlePlayerSquaddieTarget();
        squaddieRepo = ObjectRepositoryHelper.new();
        battleMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 ",
                    "  1 1 1 ",
                ]
            })
        });

        longswordAction = SquaddieSquaddieActionService.new({
            name: "longsword",
            id: longswordActionId,
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
                [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
            }),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 1,
            damageDescriptions: {
                [DamageType.BODY]: 2,
            },
        });

        bandageWoundsAction = SquaddieSquaddieActionService.new({
            name: "Bandage Wounds",
            id: bandageWoundsActionId,
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.HEALING]: true,
                [Trait.TARGETS_ALLIES]: true,
            }),
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
            squaddieRepository: squaddieRepo,
            actions: [longswordAction, bandageWoundsAction],
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
            squaddieRepository: squaddieRepo,
            actions: [],
        }));
        battleMap.addSquaddie(citizenStatic.squaddieId.templateId, citizenDynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });

        ({
            squaddieTemplate: thiefStatic,
            battleSquaddie: thiefDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Thief",
            templateId: "Thief",
            battleId: "Thief 0",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
            actions: [longswordAction],
            attributes: {
                maxHitPoints: 5,
                movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                armorClass: 0,
            }
        }));
        battleMap.addSquaddie(thiefStatic.squaddieId.templateId, thiefDynamic.battleSquaddieId, {q: 1, r: 2});

        const currentInstruction: SquaddieInstructionInProgress = {
            movingBattleSquaddieIds: [],
            squaddieActionsForThisRound: {
                battleSquaddieId: knightDynamic.battleSquaddieId,
                squaddieTemplateId: knightStatic.squaddieId.templateId,
                startingLocation: {q: 1, r: 1},
                actions: [],
            },
            currentlySelectedAction: longswordAction,
        };

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        state = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                battleState: BattleStateHelper.newBattleState({
                    missionId: "test mission",
                    missionMap: battleMap,
                    squaddieCurrentlyActing: currentInstruction,
                    recording: {history: []},
                }),
                squaddieRepository: squaddieRepo,
                resourceHandler: mockResourceHandler,
            })
        });
    });

    function clickOnThief() {
        const {mapLocation} = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(thiefDynamic.battleSquaddieId);
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            mapLocation.q,
            mapLocation.r,
            ...state.battleOrchestratorState.battleState.camera.getCoordinates()
        );
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
        };

        targetComponent.mouseEventHappened(state, mouseEvent);
    }

    function clickOnCitizen() {
        const {mapLocation} = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(citizenDynamic.battleSquaddieId);
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            mapLocation.q,
            mapLocation.r,
            ...state.battleOrchestratorState.battleState.camera.getCoordinates()
        );
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
        };

        targetComponent.mouseEventHappened(state, mouseEvent);
    }

    function clickOnConfirmTarget() {
        const confirmSelectionClick: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
        };

        targetComponent.mouseEventHappened(state, confirmSelectionClick);
    }


    it('should highlight the map with the ability range', () => {
        targetComponent.update(state, mockedP5GraphicsContext);

        expect(targetComponent.hasCompleted(state)).toBeFalsy();

        const highlightedTileDescription = {
            pulseColor: HighlightPulseRedColor,
            name: "map icon attack 1 action",
        };

        expect(battleMap.terrainTileMap.highlightedTiles).toStrictEqual({
            [HexCoordinateToKey({q: 1, r: 0})]: highlightedTileDescription,
            [HexCoordinateToKey({q: 1, r: 2})]: highlightedTileDescription,
            [HexCoordinateToKey({q: 0, r: 1})]: highlightedTileDescription,
            [HexCoordinateToKey({q: 2, r: 1})]: highlightedTileDescription,
            [HexCoordinateToKey({q: 2, r: 0})]: highlightedTileDescription,
            [HexCoordinateToKey({q: 0, r: 2})]: highlightedTileDescription,
        });
    });

    describe('canceling after selecting action but before selecting target', () => {
        const tests = [
            {
                mouseX: 0,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            },
            {
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            },
        ];
        it.each(tests)('should cancel if the user clicks on the cancel button', ({
                                                                                     mouseX,
                                                                                     mouseY,
                                                                                 }) => {
            const mouseEvent: OrchestratorComponentMouseEvent = {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
            };

            targetComponent.mouseEventHappened(state, mouseEvent);

            expect(targetComponent.hasCompleted(state)).toBeTruthy();
            const recommendedInfo = targetComponent.recommendStateChanges(state);
            expect(recommendedInfo.nextMode).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
            expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedAction).toBeUndefined();
        });
    });

    it('should clear whoever is acting if they cancel at the start of the turn', () => {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
        };

        state.battleOrchestratorState.battleState.squaddieCurrentlyActing = {
            movingBattleSquaddieIds: [],
            squaddieActionsForThisRound: {
                battleSquaddieId: knightDynamic.battleSquaddieId,
                squaddieTemplateId: knightStatic.squaddieId.templateId,
                startingLocation: {q: 1, r: 1},
                actions: [],
            },
            currentlySelectedAction: undefined,
        };

        SquaddieInstructionInProgressHandler.addSelectedAction(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, longswordAction);

        targetComponent.mouseEventHappened(state, mouseEvent);
        expect(SquaddieInstructionInProgressHandler.squaddieHasActedThisTurn(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBeFalsy();
        expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBeTruthy();
    });

    it('should remember the squaddie is still acting if they cancel midway through their turn', () => {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
        };

        state.battleOrchestratorState.battleState.squaddieCurrentlyActing = {
            movingBattleSquaddieIds: [],
            squaddieActionsForThisRound: {
                battleSquaddieId: knightDynamic.battleSquaddieId,
                squaddieTemplateId: knightStatic.squaddieId.templateId,
                startingLocation: {q: 1, r: 1},
                actions: [],
            },
            currentlySelectedAction: undefined,
        };

        SquaddieActionsForThisRoundHandler.addAction(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound, {
            type: SquaddieActionType.MOVEMENT,
            destination: {q: 0, r: 1},
            numberOfActionPointsSpent: 1,
        });
        SquaddieInstructionInProgressHandler.addSelectedAction(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, longswordAction);

        targetComponent.mouseEventHappened(state, mouseEvent);
        expect(SquaddieInstructionInProgressHandler.squaddieHasActedThisTurn(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBeTruthy();
        expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBeFalsy();
    });

    it('should ignore if the user does not click off of the map', () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(battleMap.terrainTileMap.getDimensions().numberOfRows + 1, 0, ...state.battleOrchestratorState.battleState.camera.getCoordinates());
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
        };

        targetComponent.mouseEventHappened(state, mouseEvent);
        expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
        expect(targetComponent.hasCompleted(state)).toBeFalsy();
    });

    it('should ignore if the target is out of range', () => {
        state.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(thiefDynamic.battleSquaddieId, {
            q: 0,
            r: 0
        });
        targetComponent.update(state, mockedP5GraphicsContext);
        clickOnThief();
        expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
        expect(targetComponent.hasCompleted(state)).toBeFalsy();
    });

    describe('user clicks on target with attack', () => {
        beforeEach(() => {
            targetComponent.update(state, mockedP5GraphicsContext);
            clickOnThief();
        });

        it('should show the confirm window', () => {
            expect(targetComponent.shouldDrawConfirmWindow()).toBeTruthy();
            expect(targetComponent.hasCompleted(state)).toBeFalsy();
        });

        it('should unset the target location if the user cancels', () => {
            const cancelTargetClick: OrchestratorComponentMouseEvent = {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            };

            targetComponent.mouseEventHappened(state, cancelTargetClick);

            expect(targetComponent.hasCompleted(state)).toBeFalsy();
            expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
            expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedAction).toEqual(longswordAction);
        });
    });

    describe('user clicks on target with heal', () => {
        beforeEach(() => {
            const currentInstruction: SquaddieInstructionInProgress = {
                squaddieActionsForThisRound: {
                    battleSquaddieId: knightDynamic.battleSquaddieId,
                    squaddieTemplateId: knightStatic.squaddieId.templateId,
                    startingLocation: {q: 1, r: 1},
                    actions: [],
                },
                currentlySelectedAction: bandageWoundsAction,
                movingBattleSquaddieIds: [],
            };

            state = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                    battleState: BattleStateHelper.newBattleState({
                        missionId: "test mission",
                        missionMap: battleMap,
                        squaddieCurrentlyActing: currentInstruction,
                        recording: {history: []}
                    }),
                    resourceHandler: mockResourceHandler,
                    squaddieRepository: squaddieRepo,
                })
            });

            targetComponent.update(state, mockedP5GraphicsContext);
            clickOnCitizen();
        });

        it('should show the confirm window', () => {
            expect(targetComponent.shouldDrawConfirmWindow()).toBeTruthy();
            expect(targetComponent.hasCompleted(state)).toBeFalsy();
        });
    });

    describe('user confirms the target', () => {
        beforeEach(() => {
            targetComponent.update(state, mockedP5GraphicsContext);
            clickOnThief();
            clickOnConfirmTarget();
        });

        it('should create a squaddie instruction', () => {
            const expectedInstruction: SquaddieActionsForThisRound = {
                squaddieTemplateId: knightStatic.squaddieId.templateId,
                battleSquaddieId: knightDynamic.battleSquaddieId,
                startingLocation: {q: 1, r: 1},
                actions: [],
            };
            SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
                type: SquaddieActionType.SQUADDIE,
                targetLocation: {q: 1, r: 2},
                squaddieAction: longswordAction,
                numberOfActionPointsSpent: 1,
            });

            expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound).toStrictEqual(expectedInstruction);
        });

        it('should be completed', () => {
            expect(targetComponent.hasCompleted(state)).toBeTruthy();
        });

        it('should change the state to Squaddie Uses Action On Squaddie', () => {
            const recommendedInfo = targetComponent.recommendStateChanges(state);
            expect(recommendedInfo.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);
        });

        it('should consume the squaddie action points', () => {
            const {actionPointsRemaining} = GetNumberOfActionPoints({
                squaddieTemplate: knightStatic,
                battleSquaddie: knightDynamic
            });
            expect(actionPointsRemaining).toBe(2);
        });
    });

    describe('confirming an action mid turn', () => {
        beforeEach(() => {
            state.battleOrchestratorState.battleState.squaddieCurrentlyActing = {
                movingBattleSquaddieIds: [],
                squaddieActionsForThisRound: {
                    squaddieTemplateId: knightStatic.squaddieId.templateId,
                    battleSquaddieId: knightDynamic.battleSquaddieId,
                    startingLocation: {q: 1, r: 1},
                    actions: [],
                },
                currentlySelectedAction: longswordAction,
            };

            expect(targetComponent.hasCompleted(state)).toBeFalsy();
            targetComponent.update(state, mockedP5GraphicsContext);
            clickOnThief();
            clickOnConfirmTarget();
            expect(targetComponent.hasCompleted(state)).toBeTruthy();
        });

        it('should add to existing instruction when confirmed mid turn', () => {
            const expectedInstruction: SquaddieActionsForThisRound = {
                squaddieTemplateId: knightStatic.squaddieId.templateId,
                battleSquaddieId: knightDynamic.battleSquaddieId,
                startingLocation: {q: 1, r: 1},
                actions: [],
            };
            SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
                type: SquaddieActionType.SQUADDIE,
                targetLocation: {q: 1, r: 2},
                squaddieAction: longswordAction,
                numberOfActionPointsSpent: 1,
            });

            expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound).toStrictEqual(expectedInstruction);
        });

        it('should spend the action resource cost after confirming but before showing results', () => {
            const {actionPointsRemaining} = GetNumberOfActionPoints({
                squaddieTemplate: knightStatic,
                battleSquaddie: knightDynamic
            });
            expect(actionPointsRemaining).toBe(3 - longswordAction.actionPointCost);
        });

        it('should add the results to the history', () => {
            expect(state.battleOrchestratorState.battleState.recording.history).toHaveLength(1);
            const mostRecentEvent: BattleEvent = state.battleOrchestratorState.battleState.recording.history[0];
            expect(mostRecentEvent.instruction.squaddieActionsForThisRound.actions).toHaveLength(1);
            expect((
                mostRecentEvent.instruction.squaddieActionsForThisRound.actions[0] as SquaddieSquaddieActionData
            ).squaddieAction.id).toBe(longswordAction.id);
            const results = mostRecentEvent.results;
            expect(results.actingBattleSquaddieId).toBe(knightDynamic.battleSquaddieId);
            expect(results.targetedBattleSquaddieIds).toHaveLength(1);
            expect(results.targetedBattleSquaddieIds[0]).toBe(thiefDynamic.battleSquaddieId);
            expect(results.resultPerTarget[thiefDynamic.battleSquaddieId]).toBeTruthy();
        });

        it('should store the calculated results', () => {
            const mostRecentEvent: BattleEvent = state.battleOrchestratorState.battleState.recording.history[0];
            const knightUsesLongswordOnThiefResults = mostRecentEvent.results.resultPerTarget[thiefDynamic.battleSquaddieId];
            expect(knightUsesLongswordOnThiefResults.damageTaken).toBe(longswordAction.damageDescriptions[DamageType.BODY]);

            const {maxHitPoints, currentHitPoints} = GetHitPoints({
                squaddieTemplate: thiefStatic,
                battleSquaddie: thiefDynamic
            });
            expect(currentHitPoints).toBe(maxHitPoints - longswordAction.damageDescriptions[DamageType.BODY]);
        });
    });

    describe('invalid target based on affiliation', () => {
        const tests = [
            {
                name: 'target foe tries to attack an ally',
                actionTraits: [Trait.ATTACK, Trait.TARGETS_FOE],
                invalidTargetClicker: clickOnCitizen,
            },
            {
                name: 'heal ally tries to heal a foe',
                actionTraits: [Trait.HEALING, Trait.TARGETS_ALLIES],
                invalidTargetClicker: clickOnThief,
            }
        ]
        it.each(tests)(`$name do not show a confirm window`, ({
                                                                  name,
                                                                  actionTraits,
                                                                  invalidTargetClicker,
                                                              }) => {
            const traits: { [key in Trait]?: boolean } = Object.fromEntries(
                actionTraits.map(e => [e, true])
            );
            const action = SquaddieSquaddieActionService.new({
                id: name,
                name,
                traits: TraitStatusStorageHelper.newUsingTraitValues(traits),
                minimumRange: 0,
                maximumRange: 9001,
            });
            const currentInstruction: SquaddieInstructionInProgress = {
                squaddieActionsForThisRound: {
                    battleSquaddieId: knightDynamic.battleSquaddieId,
                    squaddieTemplateId: knightStatic.squaddieId.templateId,
                    startingLocation: {q: 1, r: 1},
                    actions: [],
                },
                currentlySelectedAction: action,
                movingBattleSquaddieIds: [],
            };

            state = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateHelper.newOrchestratorState({
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                    resourceHandler: mockResourceHandler,
                    squaddieRepository: squaddieRepo,
                    battleState: BattleStateHelper.newBattleState({
                        missionId: "test mission",
                        squaddieCurrentlyActing: currentInstruction,
                        missionMap: battleMap,
                    }),
                })
            });

            targetComponent.update(state, mockedP5GraphicsContext);
            invalidTargetClicker();

            expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
            expect(targetComponent.hasCompleted(state)).toBeFalsy();
        });
    })
});
