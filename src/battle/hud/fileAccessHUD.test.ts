import {ButtonStatus} from "../../ui/button";
import {RectAreaService} from "../../ui/rectArea";
import {BattleHUDState, BattleHUDStateService} from "./battleHUDState";
import {SaveSaveStateService} from "../../dataLoader/saveSaveState";
import {LoadSaveStateService} from "../../dataLoader/loadSaveState";
import {BattleSaveStateService} from "../history/battleSaveState";
import {SAVE_VERSION} from "../../utils/fileHandling/saveFile";
import {FileAccessHUD, FileAccessHUDDesign, FileAccessHUDMessage, FileAccessHUDService} from "./fileAccessHUD";
import {MouseButton} from "../../utils/mouseConfig";
import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleStateService} from "../orchestrator/battleState";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {MissionMap, MissionMapService} from "../../missionMap/missionMap";
import {TerrainTileMap, TerrainTileMapService} from "../../hexMap/terrainTileMap";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {BattleCamera} from "../battleCamera";
import {CampaignService} from "../../campaign/campaign";
import {ResourceHandler} from "../../resource/resourceHandler";
import {OrchestratorUtilities} from "../orchestratorComponents/orchestratorUtils";

describe('File Access HUD', () => {
    let fileAccessHUD: FileAccessHUD;
    let battleHUDState: BattleHUDState;
    let dateSpy: jest.SpyInstance;

    beforeEach(() => {
        fileAccessHUD = FileAccessHUDService.new({});
        battleHUDState = BattleHUDStateService.new({});
    });

    describe('has buttons during turn', () => {
        it('Has a save button', () => {
            expect(fileAccessHUD.saveButton).not.toBeUndefined();
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(ButtonStatus.READY);
        });
        it('Save button changes to hovered state when hovered over', () => {
            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseX: RectAreaService.centerX(fileAccessHUD.saveButton.readyLabel.rectangle.area),
                mouseY: RectAreaService.centerY(fileAccessHUD.saveButton.readyLabel.rectangle.area),
            });
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(ButtonStatus.HOVER);

            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseX: RectAreaService.left(fileAccessHUD.saveButton.readyLabel.rectangle.area) - 1,
                mouseY: RectAreaService.top(fileAccessHUD.saveButton.readyLabel.rectangle.area) - 1,
            });
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(ButtonStatus.READY);
        });
        it('Has a load button', () => {
            expect(fileAccessHUD.loadButton).not.toBeUndefined();
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(ButtonStatus.READY);
        });
        it('Load button changes to hovered state when hovered over', () => {
            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseX: RectAreaService.centerX(fileAccessHUD.loadButton.readyLabel.rectangle.area),
                mouseY: RectAreaService.centerY(fileAccessHUD.loadButton.readyLabel.rectangle.area),
            });
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(ButtonStatus.HOVER);

            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseX: RectAreaService.left(fileAccessHUD.loadButton.readyLabel.rectangle.area) - 1,
                mouseY: RectAreaService.top(fileAccessHUD.loadButton.readyLabel.rectangle.area) - 1,
            });
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(ButtonStatus.READY);
        });
    });

    describe('enable and disable buttons based on gameEngineState', () => {
        let objectRepository: ObjectRepository;
        let missionMap: MissionMap;
        let resourceHandler: ResourceHandler;

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                })
            });

            objectRepository = ObjectRepositoryService.new();
        });

        const createGameEngineStateWithBattlePhase = (battlePhaseAffiliation: BattlePhase): GameEngineState => {
            return GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({

                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                        battlePhaseState: {
                            currentAffiliation: battlePhaseAffiliation,
                            turnCount: 0,
                        },
                    }),
                }),
                repository: objectRepository,
                campaign: CampaignService.default({}),
            });
        }

        it('should enable the save and load buttons during the player phase', () => {
            const gameEngineState: GameEngineState = createGameEngineStateWithBattlePhase(BattlePhase.PLAYER);
            FileAccessHUDService.updateBasedOnGameEngineState(fileAccessHUD, gameEngineState);
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(ButtonStatus.READY);
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(ButtonStatus.READY);
        });

        it('should disable the save and load buttons during the player phase if a squaddie is taking a turn', () => {
            const takingATurnSpy: jest.SpyInstance = jest.spyOn(OrchestratorUtilities, "isSquaddieCurrentlyTakingATurn").mockReturnValue(true);
            const gameEngineState: GameEngineState = createGameEngineStateWithBattlePhase(BattlePhase.PLAYER);
            FileAccessHUDService.updateBasedOnGameEngineState(fileAccessHUD, gameEngineState);
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(ButtonStatus.DISABLED);
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(ButtonStatus.DISABLED);
            expect(takingATurnSpy).toBeCalled();
        });

        it('should disable the save and load buttons during other phases', () => {
            const gameEngineState: GameEngineState = createGameEngineStateWithBattlePhase(BattlePhase.ENEMY);
            FileAccessHUDService.updateBasedOnGameEngineState(fileAccessHUD, gameEngineState);
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(ButtonStatus.DISABLED);
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(ButtonStatus.DISABLED);
        });
    });

    describe('clicking on Save Game', () => {
        beforeEach(() => {
            FileAccessHUDService.mouseClicked({
                fileAccessHUD,
                mouseButton: MouseButton.LEFT,
                mouseX: RectAreaService.centerX(fileAccessHUD.saveButton.readyLabel.rectangle.area),
                mouseY: RectAreaService.centerY(fileAccessHUD.saveButton.readyLabel.rectangle.area),
                battleHUDState,
            });
        });
        it('tells HUD user has requested a save', () => {
            expect(battleHUDState.saveSaveState.userRequestedSave).toBeTruthy();
            expect(battleHUDState.saveSaveState.savingInProgress).toBeTruthy();
        });
        it('changes save and load button to disabled', () => {
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(ButtonStatus.DISABLED);
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(ButtonStatus.DISABLED);
        });
        describe('save is completed successfully', () => {
            beforeEach(() => {
                SaveSaveStateService.savingAttemptIsComplete(battleHUDState.saveSaveState);
                FileAccessHUDService.updateButtonStatus(fileAccessHUD, battleHUDState);
                dateSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
            });
            it('tells the user the save is complete', () => {
                const initialMessage: string = FileAccessHUDService.updateStatusMessage(fileAccessHUD, battleHUDState);
                expect(initialMessage).toEqual(FileAccessHUDMessage.SAVE_SUCCESS);
                expect(fileAccessHUD.messageDisplayStartTime).toEqual(0);
                expectNoMessageAfterDisplayDuration(dateSpy, battleHUDState, fileAccessHUD);
            });
            it('clears user request from the save state after the duration passes', () => {
                FileAccessHUDService.updateStatusMessage(fileAccessHUD, battleHUDState);
                expectNoMessageAfterDisplayDuration(dateSpy, battleHUDState, fileAccessHUD);
                expect(battleHUDState.saveSaveState.userRequestedSave).toBeFalsy();
            });
        });
        describe('save has an error during saving', () => {
            beforeEach(() => {
                SaveSaveStateService.foundErrorDuringSaving(battleHUDState.saveSaveState);
                FileAccessHUDService.updateButtonStatus(fileAccessHUD, battleHUDState);
                dateSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
            });
            it('generates a message indicating the Save failed for a period of time', () => {
                const initialMessage: string = FileAccessHUDService.updateStatusMessage(fileAccessHUD, battleHUDState);
                expect(initialMessage).toEqual(FileAccessHUDMessage.SAVE_FAILED);
                expect(fileAccessHUD.messageDisplayStartTime).toEqual(0);
                expectNoMessageAfterDisplayDuration(dateSpy, battleHUDState, fileAccessHUD);
            });
        });

    });

    it('disables buttons if there is a message present', () => {
        fileAccessHUD.message = "Oh hai";
        FileAccessHUDService.updateButtonStatus(fileAccessHUD, battleHUDState);
        expect(fileAccessHUD.loadButton.buttonStatus).toEqual(ButtonStatus.DISABLED);
        expect(fileAccessHUD.saveButton.buttonStatus).toEqual(ButtonStatus.DISABLED);

        fileAccessHUD.message = undefined;
        FileAccessHUDService.updateButtonStatus(fileAccessHUD, battleHUDState);
        expect(fileAccessHUD.loadButton.buttonStatus).toEqual(ButtonStatus.READY);
        expect(fileAccessHUD.saveButton.buttonStatus).toEqual(ButtonStatus.READY);
        expect(dateSpy).toBeCalled();
    });

    describe('clicking on Load Game', () => {
        beforeEach(() => {
            FileAccessHUDService.mouseClicked({
                fileAccessHUD,
                mouseButton: MouseButton.LEFT,
                mouseX: RectAreaService.centerX(fileAccessHUD.loadButton.readyLabel.rectangle.area),
                mouseY: RectAreaService.centerY(fileAccessHUD.loadButton.readyLabel.rectangle.area),
                battleHUDState,
            });
        });
        it('tells HUD user has requested a load', () => {
            expect(battleHUDState.loadSaveState.userRequestedLoad).toBeTruthy();
        });
        it('changes save and load button to disabled', () => {
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(ButtonStatus.DISABLED);
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(ButtonStatus.DISABLED);
        });
        describe('load is completed successfully', () => {
            beforeEach(() => {
                LoadSaveStateService.applicationCompletesLoad(
                    battleHUDState.loadSaveState,
                    BattleSaveStateService.newUsingBattleOrchestratorState({
                        missionId: "test",
                        saveVersion: SAVE_VERSION,
                        battleOrchestratorState: BattleOrchestratorStateService.new({
                            battleState: BattleStateService.new({
                                missionId: "missionId",
                                battlePhaseState: {
                                    currentAffiliation: BattlePhase.PLAYER,
                                    turnCount: 0,
                                },
                                missionMap: MissionMapService.new({
                                    terrainTileMap: TerrainTileMapService.new({
                                        movementCost: ["1 "]
                                    })
                                })
                            })
                        }),
                        repository: ObjectRepositoryService.new(),
                    })
                );
                FileAccessHUDService.updateButtonStatus(fileAccessHUD, battleHUDState);
                dateSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
            });
            it('tells the user the load is complete', () => {
                const initialMessage: string = FileAccessHUDService.updateStatusMessage(fileAccessHUD, battleHUDState);
                expect(initialMessage).toEqual(FileAccessHUDMessage.LOAD_SUCCESS);
                expect(fileAccessHUD.messageDisplayStartTime).toEqual(0);
                expectNoMessageAfterDisplayDuration(dateSpy, battleHUDState, fileAccessHUD);
            });
        });
        describe('loading has an error', () => {
            beforeEach(() => {
                LoadSaveStateService.applicationErrorsWhileLoading(battleHUDState.loadSaveState);
                FileAccessHUDService.updateButtonStatus(fileAccessHUD, battleHUDState);
                dateSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
            });
            it('tells the user the load encountered an error', () => {
                const initialMessage: string = FileAccessHUDService.updateStatusMessage(fileAccessHUD, battleHUDState);
                expect(initialMessage).toEqual(FileAccessHUDMessage.LOAD_FAILED);
                expect(fileAccessHUD.messageDisplayStartTime).toEqual(0);
                expectNoMessageAfterDisplayDuration(dateSpy, battleHUDState, fileAccessHUD);
            });
        });
    });
});

const expectNoMessageAfterDisplayDuration = (dateSpy: jest.SpyInstance<any, any>, battleHUDState: BattleHUDState, fileAccessHUD: FileAccessHUD) => {
    dateSpy = jest.spyOn(Date, 'now').mockReturnValue(FileAccessHUDDesign.MESSAGE_DISPLAY_DURATION + 1);
    const noMessage: string = FileAccessHUDService.updateStatusMessage(fileAccessHUD, battleHUDState);
    expect(noMessage).toBeUndefined();
    expect(fileAccessHUD.messageDisplayStartTime).toBeUndefined();
    expect(dateSpy).toBeCalled();
};
