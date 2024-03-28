import {BattleSquaddieSelectedHUD} from "./battleSquaddieSelectedHUD";
import {FileAccessHUD, FileAccessHUDService} from "./fileAccessHUD";
import {getValidValueOrDefault} from "../../utils/validityCheck";

export interface BattleHUD {
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    fileAccessHUD: FileAccessHUD;
}

export const BattleHUDService = {
    new: ({
              fileAccessHUD,
              battleSquaddieSelectedHUD,
          }: {
        fileAccessHUD?: FileAccessHUD,
        battleSquaddieSelectedHUD?: BattleSquaddieSelectedHUD
    }): BattleHUD => {
        return {
            fileAccessHUD: getValidValueOrDefault(fileAccessHUD, FileAccessHUDService.new({})),
            battleSquaddieSelectedHUD,
        }
    }
}
