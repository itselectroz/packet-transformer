import * as ts from 'typescript';
import { createInitialiseArray, createReadForLoop, createReadFunction, createReadPacketField, createReadPacketFieldFromVariable, createReadVariable, createVariableFromField } from './read-statements';
import { createWriteField, createWriteFieldLength, createWriteFunction, createWriteVectorData, createWriteVectorDataFieldLength } from './write-statements';

const logSettings: any = {
    all: true,
    root: true,
    expression: false,
    class: true
}

function logNode(node: ts.Node, origin: string) {
    const logOrigin = origin;
    if (origin.indexOf('.') !== -1) {
        origin = origin.substr(0, origin.indexOf('.'));
    }
    if (logSettings.all && logSettings[origin]) {
        console.log(`[${logOrigin}]`, node.kind, `\t# ts.SyntaxKind.${ts.SyntaxKind[node.kind]}`);
    }
}

type VectorData = {
    valueType: string;
    lengthType: string;
    lengthField: boolean;
}

type Property = {
    name: string;
    type: string;
    extraData?: any;
}

type ClassData = {
    className: string;
    properties: Property[];
}

function getWriteFunctionName(type: string) : string {
    switch (type) {
        case "string":
            return "writeUTFString";
        case "int16":
            return "writeInt16";
        case "uint16":
            return "writeUInt16";
        case "int32":
            return "writeInt32";
        case "uint32":
            return "writeUInt32";
        case "cint":
            return "writeCompressedInt";
        case "cuint":
            return "writeCompressedUInt";
        case "cint3":
            return "write3bitCompressedInt";
        case "cuint3":
            return "write3bitCompressedUInt";
        case "float":
            return "writeFloat";
        case "boolean":
            return "writeBoolean"
        default:
            throw new Error(`Cannot get function name for type ${type}`);
    }
}

function getReadFunctionName(type: string) : string {
    switch (type) {
        case "string":
            return "readUTFString";
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
            throw new Error(`Cannot get function name for type ${type}`);
    }
}

const transformer: ts.TransformerFactory<ts.SourceFile> = (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {

        if (!sourceFile.fileName.includes("/src/packets/")) {
            return sourceFile;
        }

        // Visit class declaration. We're looking for field declarations
        const classVisitor = (classData: ClassData, node: ts.Node): ts.Node => {
            logNode(node, 'class');

            if (ts.isIdentifier(node)) {
                const identifier = <ts.Identifier>node;

                if (!classData.className) {
                    classData.className = identifier.escapedText.toString();
                }
            }
            else if (ts.isPropertyDeclaration(node)) {
                const nameNode = <ts.Identifier>node.name;
                const name = nameNode.escapedText.toString();
                const typeNode = node.type;

                if (!typeNode)
                    return node;

                logNode(typeNode, 'class.type');

                switch (typeNode.kind) {
                    case ts.SyntaxKind.StringKeyword:
                        classData.properties.push({
                            name,
                            type: 'string'
                        });
                        break;
                    case ts.SyntaxKind.BooleanKeyword:
                        classData.properties.push({
                            name,
                            type: 'boolean'
                        });
                        break;
                    case ts.SyntaxKind.TypeReference:
                        const typeReferenceNode = <ts.TypeReferenceNode>typeNode;
                        const typeNameNode = <ts.Identifier>(typeReferenceNode).typeName;
                        const type = typeNameNode.escapedText.toString();

                        if (type == "vector") {
                            const typeArguments = typeReferenceNode.typeArguments;
                            if (!typeArguments || typeArguments.length != 2) {
                                break;
                            }

                            const vectorData: VectorData = {
                                valueType: "",
                                lengthField: false,
                                lengthType: ""
                            };

                            // First type is value type, only accept typereference or string
                            const valueType = typeArguments[0];
                            if (valueType.kind == ts.SyntaxKind.StringKeyword) {
                                vectorData.valueType = "string";
                            }
                            else if(valueType.kind == ts.SyntaxKind.BooleanKeyword) {
                                vectorData.valueType = "boolean";
                            }
                            else if (valueType.kind == ts.SyntaxKind.TypeReference) {
                                const typeIdentifier = <ts.Identifier>(<ts.TypeReferenceNode>valueType).typeName;
                                vectorData.valueType = typeIdentifier.escapedText.toString();
                            }
                            else {
                                throw new SyntaxError(`Expected StringKeyword or TypeReference, got SyntaxKind.${ts.SyntaxKind[valueType.kind]}`);
                            }

                            // Second type is length type/field
                            const lengthType = typeArguments[1];
                            if (lengthType.kind == ts.SyntaxKind.StringKeyword) {
                                vectorData.lengthField = false;
                                vectorData.lengthType = "string";
                            }
                            else if (lengthType.kind == ts.SyntaxKind.TypeReference) {
                                const typeIdentifier = <ts.Identifier>(<ts.TypeReferenceNode>lengthType).typeName;
                                vectorData.lengthType = typeIdentifier.escapedText.toString();
                                vectorData.lengthField = false;
                            }
                            else if (lengthType.kind == ts.SyntaxKind.LiteralType) {
                                const literalNode = <ts.LiteralTypeNode>lengthType;
                                const literal = literalNode.literal;
                                if (literal.kind != ts.SyntaxKind.StringLiteral) {
                                    throw new SyntaxError(`Expected StringKeyword, TypeReference or StringLiteral, got SyntaxKind.${ts.SyntaxKind[valueType.kind]}`);
                                }

                                vectorData.lengthField = true;
                                vectorData.lengthType = literal.text;
                            }
                            else {
                                throw new SyntaxError(`Expected StringKeyword, TypeReference or StringLiteral, got SyntaxKind.${ts.SyntaxKind[valueType.kind]}`);
                            }

                            classData.properties.push({
                                name,
                                type,
                                extraData: vectorData
                            });
                        }
                        else {
                            classData.properties.push({
                                name,
                                type
                            });
                        }

                        break;
                }
            }

            return node;
        }

        const rootNodeVisitor = (node: ts.Node): ts.Node => {
            logNode(node, 'root');
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:

                    const classData: ClassData = {
                        className: "",
                        properties: []
                    };

                    ts.visitEachChild(node, classVisitor.bind(this, classData), context);

                    // Generate expressions for functions

                    const readStatements: ts.Statement[] = [];
                    const writeStatements: ts.Statement[] = [];

                    for (const property of classData.properties) {
                        switch (property.type) {
                            case "vector": {
                                const vectorData: VectorData = property.extraData;

                                // Create read statements
                                readStatements.push(createInitialiseArray(property.name));

                                const lengthVariable = `${property.name}Length`;

                                if (vectorData.lengthField) {
                                    readStatements.push(createVariableFromField(lengthVariable, vectorData.lengthType));
                                }
                                else {
                                    readStatements.push(createReadVariable(lengthVariable, getReadFunctionName(vectorData.lengthType)));
                                }

                                readStatements.push(createReadForLoop(property.name, getReadFunctionName(vectorData.valueType), lengthVariable));

                                readStatements.push(createReadPacketFieldFromVariable(property.name, property.name));

                                // Create write statements
                                if(vectorData.lengthField) {
                                    writeStatements.push(createWriteVectorDataFieldLength(property.name, vectorData.lengthType, getWriteFunctionName(vectorData.valueType)));
                                }
                                else {
                                    writeStatements.push(createWriteFieldLength(property.name, getWriteFunctionName(vectorData.lengthType)));
                                    writeStatements.push(createWriteVectorData(property.name, getWriteFunctionName(vectorData.valueType)));
                                }

                                break;
                            }
                            default:
                                writeStatements.push(createWriteField(property.name, getWriteFunctionName(property.type)));
                                break;
                        }
                    }

                    // Generate read/write functions

                    const readFunction = createReadFunction(classData.className, readStatements);
                    const writeFunction = createWriteFunction(writeStatements);

                    const classDeclaration = <ts.ClassDeclaration>node;
                    return ts.factory.updateClassDeclaration(classDeclaration, classDeclaration.decorators, classDeclaration.modifiers, classDeclaration.name, classDeclaration.typeParameters, classDeclaration.heritageClauses, [...classDeclaration.members, readFunction, writeFunction]);
            }

            return node;
        }

        return ts.visitEachChild(sourceFile, rootNodeVisitor, context);
    }
}

export default transformer;