import {Integer} from "../hexMap/hexGrid";
import {assertsInteger} from "../utils/math";
import {TraitStatusStorage} from "../trait/traitStatusStorage";

type RequiredOptions = {
  name: string;
  id: string;
  traits: TraitStatusStorage;
}

export type ActivityRange = {
  minimumRange: Integer | undefined;
  maximumRange: Integer | undefined;
}

type Options = ActivityRange & {
  actionsToSpend: Integer;
}

export class SquaddieActivity {
  name: string;
  id: string;
  minimumRange: Integer;
  maximumRange: Integer;
  actionsToSpend: Integer;
  traits: TraitStatusStorage;

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

    if (options.actionsToSpend) {
      assertsInteger(options.actionsToSpend);
      this.actionsToSpend = options.actionsToSpend;
    }
    else {
      this.actionsToSpend = 1 as Integer;
    }

    this.traits = options.traits;
  }
}
