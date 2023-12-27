import {MissionFileFormat, MissionFileFormatHelper} from "./missionLoader";
import {SquaddieDeploymentHelper} from "../missionMap/squaddieDeployment";

describe('missionLoader', () => {
    describe('sanitization', () => {
        let validMission: MissionFileFormat;
        beforeEach(() => {
            validMission = MissionFileFormatHelper.new({
                id: "mission id",
                player: {
                    teamId: "player team",
                    teamName: "playaz",
                    deployment: SquaddieDeploymentHelper.default(),
                }
            });
        });
        it('throws an error if id is missing', () => {
            const throwErrorBecauseOfNoId = () => {
                delete validMission["id"]
                MissionFileFormatHelper.sanitize(validMission);
            };

            expect(throwErrorBecauseOfNoId).toThrowError('cannot sanitize');
        });
        it('creates a default terrain if it is missing', () => {
            MissionFileFormatHelper.sanitize(validMission);
            expect(validMission.terrain).toEqual(["1 "]);
        });
        it('makes empty objectives if it is missing', () => {
            MissionFileFormatHelper.sanitize(validMission);
            expect(validMission.objectives).toHaveLength(0);
        });
        it('throws an error if the player section is missing', () => {
            const throwErrorBecauseOfNoPlayer = () => {
                delete validMission["player"]
                MissionFileFormatHelper.sanitize(validMission);
            };

            expect(throwErrorBecauseOfNoPlayer).toThrowError('cannot sanitize');
        });
        it('throws an error if the player section is missing team id', () => {
            const throwErrorBecauseOfPlayerIsMissingTeamId = () => {
                delete validMission.player.teamId
                MissionFileFormatHelper.sanitize(validMission);
            };

            expect(throwErrorBecauseOfPlayerIsMissingTeamId).toThrowError('cannot sanitize');
        });
        it('throws an error if the player section is missing team name', () => {
            const throwErrorBecauseOfPlayerIsMissingTeamName = () => {
                delete validMission.player.teamName
                MissionFileFormatHelper.sanitize(validMission);
            };

            expect(throwErrorBecauseOfPlayerIsMissingTeamName).toThrowError('cannot sanitize');
        });
        it('makes empty player deployment if it is missing', () => {
            delete validMission.player.deployment
            MissionFileFormatHelper.sanitize(validMission);

            expect(validMission.player.deployment).toEqual(SquaddieDeploymentHelper.default());
        });
        it('makes empty enemy section if it is missing', () => {
            MissionFileFormatHelper.sanitize(validMission);
            expect(validMission.enemy).toEqual({
                templateIds: [],
                mapPlacements: [],
                teams: [],
            });
        });
    });
});
