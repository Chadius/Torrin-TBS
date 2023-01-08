type RequiredOptions = {
  mapIcon: string;
};

export class SquaddieResource {
  mapIcon: string;

  constructor(options: RequiredOptions) {
    this.mapIcon = options.mapIcon;
  }
};
