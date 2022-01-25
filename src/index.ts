import * as ts from 'typescript';
import { createReadTypeAssignment, createReadFunction } from './read-statements';
import { createSizeExpression, createSizeFunction } from './size-statements';
import { logNode } from './transformer-logger';
import { ClassData, Constant, Property, TypeData, VectorData } from './transformer-types';
import { createWriteFunction, createWriteStatement } from './write-statements';

export * from './defined-transformer-types';
export * from './packet';

const factory = ts.factory;

let lastUniqueIndex = 0;
export function createUniqueName(name: string): ts.Identifier {
    return factory.createIdentifier(`${name}_${lastUniqueIndex++}`);
}

export function isStatement(node: ts.Node): boolean {
    return ts.isForStatement(node);
}

export function handleTypeNode(typeNode: ts.TypeNode): TypeData | false {
    switch (typeNode.kind) {
        case ts.SyntaxKind.StringKeyword:
            return {
                type: "string"
            };
        case ts.SyntaxKind.BooleanKeyword:
            return {
                type: "boolean"
            };
        case ts.SyntaxKind.LiteralType:
            const literalNode = typeNode as ts.LiteralTypeNode;

            switch (literalNode.literal.kind) {
                case ts.SyntaxKind.NullKeyword:
                    return {
                        type: "null"
                    };
                case ts.SyntaxKind.TrueKeyword:
                    return {
                        type: "constant",
                        data: {
                            type: "boolean",
                            value: true
                        } as Constant
                    };
                case ts.SyntaxKind.FalseKeyword:
                    return {
                        type: "constant",
                        data: {
                            type: "boolean",
                            value: false
                        } as Constant
                    };
                case ts.SyntaxKind.NumericLiteral:
                    return {
                        type: "constant",
                        data: {
                            type: "number",
                            value: Number.parseFloat(literalNode.literal.text)
                        } as Constant
                    };
                case ts.SyntaxKind.StringLiteral:
                    const stringLiteral = literalNode.literal as ts.StringLiteral;
                    return {
                        type: "constant",
                        data: {
                            type: "string",
                            value: stringLiteral.text,
                            singleQuote: stringLiteral.getFullText().startsWith("'")
                        } as Constant
                    };
            }
        case ts.SyntaxKind.TypeReference:
            const typeReferenceNode = <ts.TypeReferenceNode>typeNode;
            const typeNameNode = <ts.Identifier>(typeReferenceNode).typeName;
            const type = typeNameNode.escapedText.toString();

            if (type == "vector") {
                const typeArguments = typeReferenceNode.typeArguments;
                if (!typeArguments || typeArguments.length != 2) {
                    throw SyntaxError(`Not enough arguments for vector type. Expected 2 got ${typeArguments?.length || 0}`);
                }

                const valueType = handleTypeNode(typeArguments[0]);
                const lengthType = handleTypeNode(typeArguments[1]);

                if (!valueType || !lengthType) {
                    throw SyntaxError("Invalid type in vector.");
                }

                if (["constant"].includes(valueType.type)) {
                    throw SyntaxError(`Invalid value type in vector. Got ${valueType.type}`);
                }

                if (["custom", "vector", "boolean", "float"].includes(lengthType.type)) {
                    throw SyntaxError(`Invalid length type in vector. Got ${lengthType.type}`);
                }

                return {
                    type: "vector",
                    data: {
                        valueType,
                        lengthType
                    } as VectorData
                };
            }
            else if (type == "custom") {
                const typeArguments = typeReferenceNode.typeArguments;
                if (!typeArguments || typeArguments.length != 1) {
                    throw SyntaxError(`Not enough arguments for custom type. Expected 1 got ${typeArguments?.length || 0}`);
                }

                const typeArgument = typeArguments[0];

                if (typeArgument.kind != ts.SyntaxKind.TypeReference) {
                    throw SyntaxError(`Expected TypeReference in custom type. Got ${typeArgument.kind}`);
                }

                const customType = typeArgument as ts.TypeReferenceNode;

                return {
                    type,
                    data: (customType.typeName as ts.Identifier).escapedText
                };
            }
            else if (type == "nbits") {
                const typeArguments = typeReferenceNode.typeArguments;
                if (!typeArguments || typeArguments.length != 1) {
                    throw SyntaxError(`Not enough arguments for nbits type. Expected 1 got ${typeArguments?.length || 0}`);
                }

                const typeArgument = typeArguments[0];

                if (typeArgument.kind != ts.SyntaxKind.LiteralType) {
                    throw SyntaxError(`Expected LiteralType in nbits type. Got ${typeArgument.kind}`);
                }

                const literal = (typeArgument as ts.LiteralTypeNode).literal;
                if(literal.kind != ts.SyntaxKind.NumericLiteral) {
                    throw SyntaxError(`Expected NumericLiteral in nbits type. Got ${typeArgument.kind}`);
                }

                return {
                    type,
                    data: Number.parseInt((literal as ts.NumericLiteral).text)
                };
            }
            else {
                return {
                    type
                };
            }
    }
    return false;
}

const transformer: ts.TransformerFactory<ts.SourceFile> = (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {

        if (!sourceFile.fileName.includes("/src/packets/")) {
            return sourceFile;
        }

        let modified = false;

        // Visit class declaration. We're looking for field declarations
        const classVisitor = (classData: ClassData, node: ts.Node): ts.Node => {
            logNode(node, 'class');

            if (ts.isIdentifier(node)) {
                const identifier = <ts.Identifier>node;

                if (!classData.className) {
                    classData.className = identifier.escapedText.toString();
                }
            }
            else if(ts.isHeritageClause(node)) {
                const heritageClause = node as ts.HeritageClause;
                const heritageExpressions = heritageClause.types;
                for(const type of heritageExpressions) {
                    if(ts.isIdentifier(type.expression)) {
                        const identifier = type.expression as ts.Identifier;

                        if(["Packet", "DataStructure"].includes(identifier.escapedText.toString())) {
                            classData.correctHeritage = true;
                            break;
                        }
                    }
                }
            }
            else if (classData.correctHeritage && ts.isPropertyDeclaration(node)) {
                const declaration = node as ts.PropertyDeclaration;
                if(!!declaration.modifiers) {
                    for(const modifier of declaration.modifiers) {
                        if(modifier.kind == ts.SyntaxKind.StaticKeyword) {
                            return node;
                        }
                    }
                }
                const nameNode = <ts.Identifier>declaration.name;
                const name = nameNode.escapedText.toString();
                const typeNode = node.type;

                if (!typeNode)
                    return node;

                logNode(typeNode, 'class.type');

                const type = handleTypeNode(typeNode);

                if (!type) {
                    throw new SyntaxError("Expected type.");
                }

                classData.properties.push({
                    name,
                    type
                })
            }

            return node;
        }

        let skipNextNode = false;
        const rootNodeVisitor = (node: ts.Node): ts.Node => {
            if(skipNextNode) {
                skipNextNode = false;
                return node;
            }

            logNode(node, 'root');
            switch (node.kind) {
                case ts.SyntaxKind.ExpressionStatement:
                    const expressionStatement = node as ts.ExpressionStatement;
                    const expression = expressionStatement.expression;
                    if(!ts.isStringLiteral(expression)) {
                        break;
                    }
                    const stringLiteral = expression as ts.StringLiteral;
                    if(stringLiteral.text == "ignore_packet") {
                        skipNextNode = true;
                    }
                    break;
                case ts.SyntaxKind.ClassDeclaration:

                    const classData: ClassData = {
                        className: "",
                        properties: [],
                        correctHeritage: false
                    };

                    ts.visitEachChild(node, classVisitor.bind(this, classData), context);

                    if(!classData.correctHeritage) {
                        return node;
                    }
                    
                    // Generate expressions for functions

                    const readStatements: ts.Statement[] = classData.properties
                        .map(v => createReadTypeAssignment(v))
                        .reduce((a, b) => [...a, ...b], []);

                    const writeStatements: ts.Statement[] = classData.properties
                        .reduce(
                            (a: ts.Statement[], b: Property) => [
                                ...a,
                                ...createWriteStatement(
                                    b.type,
                                    factory.createPropertyAccessExpression(
                                        factory.createThis(),
                                        b.name
                                    )
                                )
                            ],
                            []
                        );
                    
                    const sizeExpression = classData.properties
                        .reduce(
                            (a: ts.Expression | undefined, b: Property) => {
                                const bSize = createSizeExpression(b.type, factory.createPropertyAccessExpression(
                                    factory.createThis(),
                                    b.name
                                )) || factory.createNumericLiteral(0);
                                if(!!a) {
                                    return factory.createAdd(a, bSize);
                                }
                                return bSize;
                            },
                            undefined
                        ) || factory.createNumericLiteral(0);

                    // Generate read/write functions

                    const readFunction = createReadFunction(classData.className, readStatements);
                    const writeFunction = createWriteFunction(writeStatements);
                    const sizeFunction = createSizeFunction(sizeExpression);

                    const classDeclaration = <ts.ClassDeclaration>node;
                    
                    modified = true;

                    return ts.factory.updateClassDeclaration(classDeclaration, classDeclaration.decorators, classDeclaration.modifiers, classDeclaration.name, classDeclaration.typeParameters, classDeclaration.heritageClauses, [...classDeclaration.members, readFunction, writeFunction, sizeFunction]);
            }

            return node;
        }

        return ts.visitEachChild(sourceFile, rootNodeVisitor, context);
    }
}

export default transformer;