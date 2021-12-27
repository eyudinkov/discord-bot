import {
  Expression,
  ArgsRulesFunction,
  ExpressionFunction
} from "../..";

export function Rule(expr?: Expression, ...add: (string | RegExp)[]) {
  return new RuleBuilder(expr, ...add);
}

export class RuleBuilder {
  static readonly start = "^";
  static readonly end = "$";
  static readonly caseInsensitiveFlag = "i";
  static readonly space = "\\s";
  static readonly atLeastOne = "{1,}";
  static readonly atLeastOneSpace = RuleBuilder.space + RuleBuilder.atLeastOne;
  static readonly atLeastOneSpaceOrEnd = "(\\s{1,}|$)";

  private _source?: string = "";
  private _flags: string = "i";
  private _from?: typeof String | typeof RegExp | typeof RuleBuilder;

  get from() {
    return this._from;
  }
  set from(value) {
    this._from = value;
  }

  get source() {
    return this._source;
  }

  get flags() {
    return this._flags;
  }

  get regex() {
    return new RegExp(this._source, this._flags);
  }

  constructor(expr?: Expression, ...add: (string | RegExp)[]) {
    this.fromExpression(expr);
    if (add.length > 0) {
      this.add(...add);
    }
  }

  static validate(text: string, rules: ArgsRulesFunction[]) {
    console.log(text, rules);
    return true;
  }

  static fromArray(exprs: Expression[]): RuleBuilder[] {
    return exprs.map((expr) => Rule(expr));
  }

  static fromArgsRuleArray<Type extends Expression = Expression>(argsRules: ArgsRulesFunction<Type>[]): ArgsRulesFunction<RuleBuilder>[] {
    return [];
  }

  static joinSources(joinChar: Expression, ...exprs: Expression[]) {
    return RuleBuilder.fromArray(exprs).map(rb => rb.source).join(Rule(joinChar).source);
  }

  static joinFlags(...exprs: Expression[]) {
    const flags = RuleBuilder.fromArray(exprs).map(rb => rb.flags);
    return flags.filter((f, i) => flags.indexOf(f) === i).join("");
  }

  static join(joinChar: RuleBuilder, ...exprs: Expression[]) {
    const source = this.joinSources(joinChar, ...exprs);
    let flags = this.joinFlags(...exprs);

    exprs.map((expr) => {
      const rule = Rule(expr);
      if (!rule.flags.includes(flags)) {
        flags = rule.flags.replace(RegExp(flags, "g"), "");
      }
    });

    return Rule(source).setFlags(flags);
  }

  static escape(text: Expression) {
    if (typeof text === "string") {
      return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    }
    return text;
  }

  static isExpression(obj: any) {
    const exprType = this.typeOfExpression(obj);
    return [String, RuleBuilder, RegExp].includes(exprType as any);
  }

  static typeOfExpression(expr: Expression | ExpressionFunction) {
    if (typeof expr === "string") {
      return String;
    }
    if (typeof expr === "function") {
      return Function;
    }
    if (expr instanceof RegExp) {
      return RegExp;
    }
    if (expr instanceof RuleBuilder) {
      return RuleBuilder;
    }
  }

  static or(...exprs: Expression[]) {
    let source = "(";

    exprs.map((expr, index) => {
      source += Rule(expr).source;
      if (index < exprs.length - 1) {
        source += "|";
      }
      return expr;
    });

    source += ")";

    return source;
  }

  copy() {
    const copy = new RuleBuilder();
    copy._source = this.source;
    copy._from = this._from;
    copy._flags = this._flags;
    return copy;
  }

  addParam(name: string) {
    return this.add();
  }

  add(...exprs: Expression[]) {
    const source = RuleBuilder.joinSources("", ...exprs);
    this.setFlags(RuleBuilder.joinFlags(this, ...exprs));
    this._source += source;
    return this;
  }

  addFlags(...flags: string[]) {
    this._flags += flags.join("");
    return this;
  }

  setFlags(...flags: string[]) {
    this._flags = flags.join("");
    return this;
  }

  space(exprToAdd?: Expression) {
    return this.add(RuleBuilder.atLeastOneSpace, exprToAdd);
  }

  strictSpace(exprToAdd?: Expression) {
    return this.add(RuleBuilder.space, exprToAdd);
  }

  setSource(source: string) {
    this._source = source;
    return this;
  }

  haveSpaceAfter() {
    this._source += RuleBuilder.atLeastOneSpace;
    return this;
  }

  start() {
    this.addBefore("^");
    return this;
  }

  startWith(prefix: Expression) {
    this.addBefore(`^${Rule(prefix).source}`);
    return this;
  }

  end() {
    this.add("$");
    return this;
  }

  before(...exprs: Expression[]) {
    this.addBefore(RuleBuilder.joinSources("", ...exprs));
    this.setFlags(RuleBuilder.joinFlags(this, ...exprs));
    return this;
  }

  spaceOrEnd() {
    return this.addOr(
      RuleBuilder.atLeastOneSpace,
      RuleBuilder.end
    );
  }

  addOr(...exprs: Expression[]) {
    this.add(RuleBuilder.or(...exprs));
    return this;
  }

  addBefore(...exprs: Expression[]) {
    const source = RuleBuilder.joinSources("", ...exprs);
    this._source = `${source}${this._source}`;
    return this;
  }

  if(cond: (ruleBuilder: RuleBuilder) => boolean, then: (ruleBuilder: RuleBuilder) => void) {
    if (cond(this.copy())) {
      then(this);
    }
    return this;
  }

  caseSensitive() {
    this._flags = this._flags.replace(/i/g, "");
    return this;
  }

  fromRegex(regex: RegExp) {
    this._source = regex.source;
    this._flags = regex.flags;
    this._from = RegExp;
    return this;
  }

  fromString(str: string) {
    this._source = str;
    this._from = String;
    return this;
  }

  fromRule(rule: RuleBuilder) {
    this._source = rule._source;
    this._flags = rule._flags;
    this._from = RuleBuilder;
    return this;
  }

  fromExpression(expr?: Expression) {
    if (expr) {
      switch (RuleBuilder.typeOfExpression(expr)) {
        case String:
          return this.fromString(expr as string);
        case RegExp:
          return this.fromRegex(expr as RegExp);
        case RuleBuilder:
          return this.fromRule(expr as RuleBuilder);
      }
    }
    return this;
  }
}
