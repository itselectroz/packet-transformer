import * as ts from 'typescript';

const factory = ts.factory;

// Full credits to https://ts-ast-viewer.com/ for the majority of this code. Complete lifesaver.

// Writes a field
/*
    buffer.functionName(this.fieldName);
*/
export function createWriteField(fieldName: string, functionName: string) {
    return factory.createExpressionStatement(factory.createCallExpression(
        factory.createPropertyAccessExpression(
            factory.createIdentifier("buffer"),
            factory.createIdentifier(functionName)
        ),
        undefined,
        [factory.createPropertyAccessExpression(
            factory.createThis(),
            factory.createIdentifier(fieldName)
        )]
    ));
}

// Writes a field's length
/*
    buffer.functionName(this.fieldName.length);
*/
export function createWriteFieldLength(fieldName: string, functionName: string) {
    return factory.createExpressionStatement(factory.createCallExpression(
        factory.createPropertyAccessExpression(
            factory.createIdentifier("buffer"),
            factory.createIdentifier(functionName)
        ),
        undefined,
        [factory.createPropertyAccessExpression(
            factory.createPropertyAccessExpression(
                factory.createThis(),
                factory.createIdentifier(fieldName)
            ),
            factory.createIdentifier("length")
        )]
    ));
}


// Writes a vector w/ length lengthField
/*
    for(let i = 0; i < this.lengthField; i++) {
        buffer.functionName(this.vectorName[i]);
    }
*/
export function createWriteVectorDataFieldLength(vectorName: string, lengthField: string, functionName: string) {
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
            factory.createPropertyAccessExpression(
                factory.createThis(),
                factory.createIdentifier(lengthField)
            )
        ),
        factory.createPostfixUnaryExpression(
            factory.createIdentifier("i"),
            ts.SyntaxKind.PlusPlusToken
        ),
        factory.createBlock(
            [factory.createExpressionStatement(factory.createCallExpression(
                factory.createPropertyAccessExpression(
                    factory.createIdentifier("buffer"),
                    factory.createIdentifier(functionName)
                ),
                undefined,
                [factory.createElementAccessExpression(
                    factory.createPropertyAccessExpression(
                        factory.createThis(),
                        factory.createIdentifier(vectorName)
                    ),
                    factory.createIdentifier("i")
                )]
            ))],
            true
        )
    );
}

// Writes a vector
/*
    for(let i = 0; i < this.vectorName.length; i++) {
        buffer.functionName(this.vectorName[i]);
    }
*/
export function createWriteVectorData(vectorName: string, functionName: string) {
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
            factory.createPropertyAccessExpression(
                factory.createPropertyAccessExpression(
                    factory.createThis(),
                    factory.createIdentifier(vectorName)
                ),
                factory.createIdentifier("length")
            )
        ),
        factory.createPostfixUnaryExpression(
            factory.createIdentifier("i"),
            ts.SyntaxKind.PlusPlusToken
        ),
        factory.createBlock(
            [factory.createExpressionStatement(factory.createCallExpression(
                factory.createPropertyAccessExpression(
                    factory.createIdentifier("buffer"),
                    factory.createIdentifier(functionName)
                ),
                undefined,
                [factory.createElementAccessExpression(
                    factory.createPropertyAccessExpression(
                        factory.createThis(),
                        factory.createIdentifier(vectorName)
                    ),
                    factory.createIdentifier("i")
                )]
            ))],
            true
        )
    )
}


// Creates the write method
/*
    write(buffer: any) {
        --- statements ---
    }
*/
export function createWriteFunction(statements: ts.Statement[]) {
    return factory.createMethodDeclaration(
        undefined,
        undefined,
        undefined,
        factory.createIdentifier("write"),
        undefined,
        undefined,
        [factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            factory.createIdentifier("buffer"),
            undefined,
            factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
            undefined
        )],
        undefined,
        factory.createBlock(
            statements,
            true
        )
    )
}