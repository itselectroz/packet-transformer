import * as ts from "typescript";
import { Constant, TypeData, VectorData } from "./transformer-types";

const factory = ts.factory;

const sizes: {
  [key: string]: number;
} = {
  byte: 8,
  int16: 16,
  uint16: 16,
  int32: 32,
  uint32: 32,
  float: 32,
  boolean: 1,
};

export function createSizeExpression(
  type: TypeData,
  propAccess: ts.Expression | undefined
): ts.Expression | false {
  if (type.type in sizes) {
    return factory.createNumericLiteral(sizes[type.type]);
  }

  switch (type.type) {
    case "string": {
      if (!propAccess) {
        throw new Error("No property to get the size of for type " + type);
      }
      return factory.createParenthesizedExpression(
        factory.createAdd(
          factory.createNumericLiteral(sizes["uint16"]),
          factory.createMultiply(
            factory.createPropertyAccessExpression(propAccess, "length"),
            factory.createNumericLiteral(sizes["byte"])
          )
        )
      );
    }

    case "custom": {
      if (!propAccess) {
        throw new Error("No property to get the size of for type " + type);
      }
      return factory.createPropertyAccessExpression(propAccess, "size");
    }

    case "cint":
    case "cuint":
    case "cint3":
    case "cuint3": {
      if (!propAccess) {
        throw new Error("No property to get the size of for type " + type);
      }
      return factory.createParenthesizedExpression(
        factory.createAdd(
          factory.createNumericLiteral(type.type.includes("3") ? 3 : 4),
          factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createThis(),
              "getBitSize"
            ),
            undefined,
            [propAccess]
          )
        )
      );
    }

    case "vector": {
      const typeData = type.data as VectorData;

      let lengthExpression;

      if (typeData.lengthType.type == "constant") {
        const constant = typeData.lengthType.data as Constant;
        if (constant.type == "string") {
          lengthExpression = factory.createNumericLiteral(0);
        } else if (constant.type == "number") {
          lengthExpression = factory.createNumericLiteral(0);
        } else {
          throw new SyntaxError(
            `Expected string or number constant in vector length, got '${constant.type}'`
          );
        }
      } else {
        if (!propAccess) {
          throw new Error("No property to get the size of for type " + type);
        }
        lengthExpression = createSizeExpression(
          typeData.lengthType,
          factory.createPropertyAccessExpression(propAccess, "length")
        );
      }

      if (!lengthExpression) {
        throw new Error(`Length expression is null.`);
      }

      let valueExpression: ts.Expression = factory.createNumericLiteral(0);
      switch (typeData.valueType.type) {
        case "vector":
        case "custom":
        case "string":
        case "cint":
        case "cuint":
        case "cint3":
        case "cuint3":
          if (!propAccess) {
            throw new Error("No property to get the size of for type " + type);
          }

          valueExpression = factory.createCallExpression(
            factory.createPropertyAccessExpression(
              propAccess,
              factory.createIdentifier("reduce")
            ),
            undefined,
            [
              factory.createArrowFunction(
                undefined,
                undefined,
                [
                  factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    undefined,
                    factory.createIdentifier("a"),
                    undefined,
                    factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                    undefined
                  ),
                  factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    undefined,
                    factory.createIdentifier("b"),
                    undefined,
                    factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                    undefined
                  ),
                ],
                undefined,
                factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                factory.createBinaryExpression(
                  factory.createIdentifier("a"),
                  factory.createToken(ts.SyntaxKind.PlusToken),
                  createSizeExpression(
                    typeData.valueType,
                    factory.createIdentifier("b")
                  ) || factory.createNumericLiteral(0)
                )
              ),
              factory.createNumericLiteral("0"),
            ]
          );
          break;

        default:
          if (!propAccess) {
            throw new Error("No property to get the size of for type " + type);
          }
          if (!(typeData.valueType.type in sizes)) {
            throw new Error(
              `Type ${typeData.valueType.type} does not have an assigned size!`
            );
          }

          valueExpression = factory.createMultiply(
            factory.createPropertyAccessExpression(propAccess, "length"),
            factory.createNumericLiteral(sizes[typeData.valueType.type])
          );
          break;
      }

      return factory.createAdd(
        factory.createParenthesizedExpression(lengthExpression),
        factory.createParenthesizedExpression(valueExpression)
      );
    }
  }

  return false;
}

export function createSizeFunction(expression: ts.Expression) {
  return factory.createGetAccessorDeclaration(
    undefined,
    undefined,
    factory.createIdentifier("size"),
    [],
    undefined,
    factory.createBlock([factory.createReturnStatement(expression)], false)
  );
}
