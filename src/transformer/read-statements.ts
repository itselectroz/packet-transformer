import * as ts from 'typescript';

const factory = ts.factory;

// Full credits to https://ts-ast-viewer.com/ for the majority of this code. Complete lifesaver.

// Sets a packet field to the result of a function call
/*
    packet.fieldName = data.functionName()
*/
export function createReadPacketField(fieldName: string, functionName: string): ts.ExpressionStatement {
    return factory.createExpressionStatement(
        factory.createBinaryExpression(
            factory.createPropertyAccessExpression(
                factory.createIdentifier("packet"),
                factory.createIdentifier(fieldName)
            ),
            factory.createToken(ts.SyntaxKind.EqualsToken),
            factory.createCallExpression(
                factory.createPropertyAccessExpression(
                    factory.createIdentifier("data"),
                    factory.createIdentifier(functionName)
                ),
                undefined,
                []
            )
        )
    )
}

// Creates a new array in variableName
/*
    const variableName = [];
*/
export function createInitialiseArray(variableName: string): ts.VariableStatement {
    return factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(
                factory.createIdentifier(variableName),
                undefined,
                undefined,
                factory.createArrayLiteralExpression(
                    [],
                    false
                )
            )],
            ts.NodeFlags.Const
        )
    )
}

// Sets a variable to the result of a function call
/*
    variableName = data.functionName();
*/
export function createReadVariable(variableName: string, functionName: string): ts.VariableStatement {
    return factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(
                factory.createIdentifier(variableName),
                undefined,
                undefined,
                factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                        factory.createIdentifier("data"),
                        factory.createIdentifier(functionName)
                    ),
                    undefined,
                    []
                )
            )],
            ts.NodeFlags.Const
        )
    )
}

// Sets a variable to a field value
/*
    const variableName = packet.fieldName;
*/
export function createVariableFromField(variableName: string, fieldName: string) {
    return factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(
                factory.createIdentifier(variableName),
                undefined,
                undefined,
                factory.createPropertyAccessExpression(
                    factory.createIdentifier("packet"),
                    factory.createIdentifier(fieldName)
                )
            )],
            ts.NodeFlags.Const
        )
    )
}

// Creates a for loop that reads data and pushes it to an array
// ASSUMPTION: listVariable is an array
// ASSUMPTION: lengthVariable is a number
/*
    for(let i = 0; i < lengthVariable; i++) {
        listVariable.push(data.functionName());
    }
*/
export function createReadForLoop(listVariable: string, functionName: string, lengthVariable: string): ts.ForStatement {
    return factory.createForStatement(
        factory.createVariableDeclarationList(
            [factory.createVariableDeclaration(
                factory.createIdentifier("i"),
                undefined,
                undefined,
                factory.createNumericLiteral("0")
            )],
            ts.NodeFlags.Let
        ),
        factory.createBinaryExpression(
            factory.createIdentifier("i"),
            factory.createToken(ts.SyntaxKind.LessThanToken),
            factory.createIdentifier(lengthVariable)
        ),
        factory.createPostfixUnaryExpression(
            factory.createIdentifier("i"),
            ts.SyntaxKind.PlusPlusToken
        ),
        factory.createBlock(
            [factory.createExpressionStatement(factory.createCallExpression(
                factory.createPropertyAccessExpression(
                    factory.createIdentifier(listVariable),
                    factory.createIdentifier("push")
                ),
                undefined,
                [factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                        factory.createIdentifier("data"),
                        factory.createIdentifier(functionName)
                    ),
                    undefined,
                    []
                )]
            ))],
            true
        )
    )
}

// Sets a packet field to a variable
/*
    packet.fieldName = variableName;
*/
export function createReadPacketFieldFromVariable(fieldName: string, variableName: string) {
    return factory.createExpressionStatement(factory.createBinaryExpression(
        factory.createPropertyAccessExpression(
            factory.createIdentifier("packet"),
            factory.createIdentifier(fieldName)
        ),
        factory.createToken(ts.SyntaxKind.EqualsToken),
        factory.createIdentifier(variableName)
    ))
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
        [factory.createModifier(ts.SyntaxKind.StaticKeyword)],
        undefined,
        factory.createIdentifier("read"),
        undefined,
        undefined,
        [factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            factory.createIdentifier("data"),
            undefined,
            factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
            undefined
        )],
        undefined,
        factory.createBlock(
            [
                factory.createVariableStatement(
                    undefined,
                    factory.createVariableDeclarationList(
                        [factory.createVariableDeclaration(
                            factory.createIdentifier("packet"),
                            undefined,
                            undefined,
                            factory.createNewExpression(
                                factory.createIdentifier(className),
                                undefined,
                                []
                            )
                        )],
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