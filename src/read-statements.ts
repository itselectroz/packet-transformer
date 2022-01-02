import * as ts from 'typescript';
import { createUniqueName } from '.';
import { TypeData, VectorStatement, Constant, VectorData, Property } from './transformer-types';

const factory = ts.factory;

// Credits to https://ts-ast-viewer.com/ for the help with this code. Complete lifesaver.

export function getReadFunctionName(type: string): string | false {
    switch (type) {
        case "string":
            return "readUTFString";
        case "byte":
            return "readByte";
        case "int16":
            return "readInt16";
        case "uint16":
            return "readUInt16";
        case "int32":
            return "readInt32";
        case "uint32":
            return "readUInt32";
        case "cint":
            return "readCompressedInt";
        case "cuint":
            return "readCompressedUInt";
        case "cint3":
            return "read3bitCompressedInt";
        case "cuint3":
            return "read3bitCompressedUInt";
        case "float":
            return "readFloat";
        case "boolean":
            return "readBoolean"
        default:
            return false;
    }
}

const createReadType = (typeData: TypeData): ts.Expression | VectorStatement => {
    const type = typeData.type;

    switch (type) {
        case "null": {
            return factory.createNull();
        }
        case "constant": {
            const constant = typeData.data as Constant;
            switch (constant.type) {
                case "boolean": {
                    return constant.value
                        ? factory.createTrue()
                        : factory.createFalse();
                }
                case "string": {
                    return factory.createStringLiteral(
                        constant.value,
                        constant.singleQuote
                    )
                }
                case "number": {
                    return factory.createNumericLiteral(constant.value)
                }
            }
        }
        case "vector": {
            const vectorValuesIdentifier = createUniqueName("vectorValues");

            const statements: ts.Statement[] = [
                factory.createVariableStatement(
                    undefined,
                    factory.createVariableDeclarationList(
                        [
                            factory.createVariableDeclaration(
                                vectorValuesIdentifier,
                                undefined,
                                undefined,
                                factory.createArrayLiteralExpression(
                                    [],
                                    false
                                )
                            )
                        ],
                        ts.NodeFlags.Const
                    )
                )
            ];

            const vectorData: VectorData = typeData.data;

            const lengthType = vectorData.lengthType;
            const valueType = vectorData.valueType;

            let lessThanExpression: ts.Expression;

            if (lengthType.type == "constant") {
                // Length is built into the for loop
                const constant = lengthType.data as Constant;

                if (constant.type == "string") {
                    lessThanExpression = factory.createPropertyAccessExpression(
                        factory.createIdentifier("packet"),
                        constant.value
                    );
                }
                else if (constant.type == "number") {
                    lessThanExpression = factory.createNumericLiteral(constant.value)
                }
                else {
                    throw new SyntaxError(`Expected string or number constant in vector length, got '${constant.type}'`);
                }
            }
            else {
                // Length is a variable
                const vectorLengthIdentifier = createUniqueName("vectorLength");

                statements.push(
                    factory.createVariableStatement(
                        undefined,
                        factory.createVariableDeclarationList(
                            [
                                factory.createVariableDeclaration(
                                    vectorLengthIdentifier,
                                    undefined,
                                    undefined,
                                    createReadType(lengthType) as ts.Expression
                                )
                            ],
                            ts.NodeFlags.Const
                        )
                    )
                )

                lessThanExpression = vectorLengthIdentifier;
            }

            const uniqueIndexName = createUniqueName("i");

            const valueStatements: ts.Statement[] = [];

            if (["vector"].includes(valueType.type)) {
                const vectorStatement = createReadType(valueType) as VectorStatement;

                valueStatements.push(
                    ...vectorStatement.statements,
                    factory.createExpressionStatement(
                        factory.createBinaryExpression(
                            factory.createElementAccessExpression(
                                vectorValuesIdentifier,
                                uniqueIndexName
                            ),
                            factory.createToken(ts.SyntaxKind.EqualsToken),
                            vectorStatement.vectorIdentifier
                        )
                    )
                )
            }
            else {
                valueStatements.push(
                    factory.createExpressionStatement(
                        factory.createBinaryExpression(
                            factory.createElementAccessExpression(
                                vectorValuesIdentifier,
                                uniqueIndexName
                            ),
                            factory.createToken(ts.SyntaxKind.EqualsToken),
                            createReadType(valueType) as ts.Expression
                        )
                    )
                );
            }

            statements.push(
                factory.createForStatement(
                    factory.createVariableDeclarationList([
                        factory.createVariableDeclaration(
                            uniqueIndexName,
                            undefined,
                            undefined,
                            factory.createNumericLiteral(0)
                        )
                    ]),
                    factory.createBinaryExpression(
                        uniqueIndexName,
                        factory.createToken(ts.SyntaxKind.LessThanToken),
                        lessThanExpression
                    ),
                    factory.createPostfixIncrement(
                        uniqueIndexName
                    ),
                    factory.createBlock(valueStatements)
                )
            )

            return {
                statements,
                vectorIdentifier: vectorValuesIdentifier
            };
        }
        case "custom": {
            const className: string = typeData.data;

            if (typeof className != "string") {
                throw new Error(`Something went wrong. Expected className to be type 'string' got '${typeof className}'`);
            }

            return factory.createCallExpression(
                factory.createPropertyAccessExpression(
                    factory.createIdentifier(className),
                    factory.createIdentifier("read")
                ),
                undefined,
                [
                    factory.createIdentifier("buffer")
                ]
            );
        }
        case "nbits": {
            const numBits: number = typeData.data;

            if(typeof numBits != "number") {
                throw new Error(`Something went wrong. Expected className to be type 'number' got '${typeof numBits}'`);
            }

            return factory.createCallExpression(
                factory.createPropertyAccessExpression(
                    factory.createIdentifier("buffer"),
                    factory.createIdentifier("readBits")
                ),
                undefined,
                [
                    factory.createNumericLiteral(numBits)
                ]
            );
        }
        default: {
            const functionName = getReadFunctionName(type);

            if (!functionName) {
                throw new Error(`Cannot get function name for type ${type}`);
            }

            return factory.createCallExpression(
                factory.createPropertyAccessExpression(
                    factory.createIdentifier("buffer"),
                    factory.createIdentifier(functionName)
                ),
                undefined,
                []
            )
        }
    }
}

export function createReadTypeAssignment(property: Property): ts.Statement[] {
    const typeData = property.type;

    if (typeData.type == "vector") {
        const vectorStatement = createReadType(typeData) as VectorStatement;

        return [
            ...vectorStatement.statements,
            factory.createExpressionStatement(
                factory.createBinaryExpression(
                    factory.createPropertyAccessExpression(
                        factory.createIdentifier("packet"),
                        factory.createIdentifier(property.name)
                    ),
                    factory.createToken(ts.SyntaxKind.EqualsToken),
                    vectorStatement.vectorIdentifier
                )
            )
        ];
    }
    else {
        return [
            factory.createExpressionStatement(
                factory.createBinaryExpression(
                    factory.createPropertyAccessExpression(
                        factory.createIdentifier("packet"),
                        factory.createIdentifier(property.name)
                    ),
                    factory.createToken(ts.SyntaxKind.EqualsToken),
                    createReadType(typeData) as ts.Expression
                )
            )
        ];
    }
}

// Generates a read function
/*
    static read(data: any) {
        const packet = new className();

        - expressions here -

        return packet;
    }
*/
export function createReadFunction(className: string, expressions: ts.Statement[]): ts.MethodDeclaration {
    return factory.createMethodDeclaration(
        undefined,
        [
            factory.createModifier(ts.SyntaxKind.StaticKeyword)
        ],
        undefined,
        factory.createIdentifier("read"),
        undefined,
        undefined,
        [
            factory.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                factory.createIdentifier("buffer"),
                undefined,
                factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                undefined
            )
        ],
        undefined,
        factory.createBlock(
            [
                factory.createVariableStatement(
                    undefined,
                    factory.createVariableDeclarationList(
                        [
                            factory.createVariableDeclaration(
                                factory.createIdentifier("packet"),
                                undefined,
                                undefined,
                                factory.createNewExpression(
                                    factory.createIdentifier(className),
                                    undefined,
                                    []
                                )
                            )
                        ],
                        ts.NodeFlags.Const
                    )
                ),
                ...expressions,
                factory.createReturnStatement(
                    factory.createIdentifier("packet")
                )
            ],
            true
        )
    )
}