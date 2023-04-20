import {BattleSquaddieSelector} from "./BattleSquaddieSelector";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattlePhase, BattlePhaseTracker} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieTurn} from "../../squaddie/turn";
import {OrchestratorComponentMouseEventType} from "../orchestrator/orchestratorComponent";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";

describe('BattleSquaddieSelector', () => {
    it('ignores mouse input when the player cannot control the squaddies', () => {
        const selector: BattleSquaddieSelector = new BattleSquaddieSelector();

        const squaddieRepo = new BattleSquaddieRepository();

        const enemyTeam: BattleSquaddieTeam = new BattleSquaddieTeam(
            {
                name: "enemies cannot be controlled by the player",
                affiliation: SquaddieAffiliation.ENEMY,
                squaddieRepo: squaddieRepo,
            }
        );

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    id: "enemy_demon",
                    name: "Slither Demon",
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
            })
        );

        squaddieRepo.addDynamicSquaddie(
            "enemy_demon_0",
            new BattleSquaddieDynamic({
                staticSquaddieId: "enemy_demon",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        const battlePhaseTracker: BattlePhaseTracker = new BattlePhaseTracker(BattlePhase.ENEMY);
        battlePhaseTracker.addTeam(enemyTeam);

        const mockHexMap = new (
            <new (options: any) => TerrainTileMap>TerrainTileMap
        )({
            movementCost: ["1 1 "]
        }) as jest.Mocked<TerrainTileMap>;
        mockHexMap.mouseClicked = jest.fn();

        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            hexMap: mockHexMap,
        })

        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
        });

        expect(mockHexMap.mouseClicked).not.toBeCalled();
    });
});