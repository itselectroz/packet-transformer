import * as ts from "typescript";

export type StringConstant = {
  type: "string";
  value: string;
  singleQuote: boolean;
};

export type NumberConstant = {
  type: "number";
  value: number;
};

export type BooleanConstant = {
  type: "boolean";
  value: boolean;
};

export type Constant = StringConstant | NumberConstant | BooleanConstant;

export type TypeData = {
  type: string;
  data?: any;
};

export type VectorData = {
  valueType: TypeData;
  lengthType: TypeData;
};

export type Property = {
  name: string;
  type: TypeData;
};

export type ClassData = {
  className: string;
  properties: Property[];
  correctHeritage: boolean;
};

export type VectorStatement = {
  statements: ts.Statement[];
  vectorIdentifier: ts.Identifier;
};
