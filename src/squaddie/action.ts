import {Integer} from "../hexMap/hexGrid";
import {assertsInteger} from "../utils/math";

type RequiredOptions = {
  name: string;
  id: string;
}

export type ActionRange = {
  minimumRange: Integer | undefined;
  maximumRange: Integer | undefined;
}

type Options = ActionRange & {
}

export class SquaddieAction {
  name: string;
  id: string;
  minimumRange: Integer;
  maximumRange: Integer;

  constructor(options: RequiredOptions & Partial<Options>) {
    this.name = options.name;
    this.id = options.id;

    if (this.minimumRange !== undefined) {
      assertsInteger(this.minimumRange);
    }
    if (this.maximumRange !== undefined) {
      assertsInteger(this.maximumRange);
    }
    this.minimumRange = options.minimumRange;
    this.maximumRange = options.maximumRange;
  }
}
