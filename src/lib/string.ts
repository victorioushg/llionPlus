interface String {
  toProperCase(): string;
  capitalize(): string;
  bool(): boolean;
}

String.prototype.toProperCase = function (): string {
  return this.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
};

String.prototype.bool = function (): boolean {
  return this.toLowerCase() == 'true';
};

String.prototype.capitalize = function (): string {
  return this.charAt(0).toUpperCase() + this.slice(1);
};
