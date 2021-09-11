import * as ts from 'typescript';

const logSettings: any = {
    all: true,
    root: true,
    expression: false,
    class: true
}

function logNode(node: ts.Node, origin: string) {
    const logOrigin = origin;
    if(origin.indexOf('.') !== -1) {
        origin = origin.substr(0, origin.indexOf('.'));
    }
    if(logSettings.all && logSettings[origin]) {
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

const transformer: ts.TransformerFactory<ts.SourceFile> = (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {

        if(!sourceFile.fileName.includes("/src/packets/")) {
            return sourceFile;
        }

        // Visit expression nodes. We're looking for the RegisterPacket call here.
        const expressionVisitor = (node: ts.Node) : ts.Node => {
            logNode(node, 'expression');
            if(ts.isCallExpression(node)) {
                const expression = <ts.Identifier>node.expression;
                const args = node.arguments;

                switch(expression.escapedText) {
                    case "RegisterPacket": {
                        if(args.length !== 1)
                            break;

                        const nameArg = <ts.LiteralToken>args[0];
                        
                        console.log(`Registering ${nameArg.text}`);
                            
                        return node;
                    }
                }
            }
            return ts.visitEachChild(node, expressionVisitor, context);
        }

        // Visit class declaration. We're looking for field declarations
        const classVisitor = (classData: ClassData, node: ts.Node) : ts.Node => {
            logNode(node, 'class');

            if(ts.isIdentifier(node)) {
                const identifier = <ts.Identifier>node;

                if(!classData.className) {
                    classData.className = identifier.escapedText.toString();
                }
            }
            else if(ts.isPropertyDeclaration(node)) {
                const nameNode = <ts.Identifier>node.name;
                const name = nameNode.escapedText.toString();
                const typeNode = node.type;

                if(!typeNode)
                    return node;

                logNode(typeNode, 'class.type');

                switch(typeNode.kind) {
                    case ts.SyntaxKind.StringKeyword:
                        classData.properties.push({
                            name,
                            type: 'string'
                        });
                        break;
                    case ts.SyntaxKind.TypeReference:
                        const typeReferenceNode = <ts.TypeReferenceNode>typeNode;
                        const typeNameNode = <ts.Identifier>(typeReferenceNode).typeName;
                        const type = typeNameNode.escapedText.toString();
                            
                        if(type == "vector") {
                            const typeArguments = typeReferenceNode.typeArguments;
                            if(!typeArguments || typeArguments.length != 2) {
                                break;
                            }

                            const vectorData: VectorData = {
                                valueType: "",
                                lengthField: false,
                                lengthType: ""
                            };

                            // First type is value type, only accept typereference or string
                            const valueType = typeArguments[0];
                            if(valueType.kind == ts.SyntaxKind.StringKeyword) {
                                vectorData.valueType = "string";
                            }
                            else if(valueType.kind == ts.SyntaxKind.TypeReference) {
                                const typeIdentifier = <ts.Identifier>(<ts.TypeReferenceNode>valueType).typeName;
                                vectorData.valueType = typeIdentifier.escapedText.toString();
                            }
                            else {
                                throw new SyntaxError(`Expected StringKeyword or TypeReference, got SyntaxKind.${ts.SyntaxKind[valueType.kind]}`);
                            }

                            // Second type is length type/field
                            const lengthType = typeArguments[1];
                            if(lengthType.kind == ts.SyntaxKind.StringKeyword) {
                                vectorData.lengthField = false;
                                vectorData.lengthType = "string";
                            }
                            else if(lengthType.kind == ts.SyntaxKind.TypeReference) {
                                const typeIdentifier = <ts.Identifier>(<ts.TypeReferenceNode>lengthType).typeName;
                                vectorData.lengthType = typeIdentifier.escapedText.toString();
                                vectorData.lengthField = false;
                            }
                            else if(lengthType.kind == ts.SyntaxKind.LiteralType) {
                                const literalNode = <ts.LiteralTypeNode>lengthType;
                                const literal = literalNode.literal;
                                if(literal.kind != ts.SyntaxKind.StringLiteral) {
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

        const rootNodeVisitor = (node: ts.Node) : ts.Node => {
            logNode(node, 'root');
            switch(node.kind) {
                case ts.SyntaxKind.ExpressionStatement:
                    ts.visitNode(node, expressionVisitor);
                    break;

                case ts.SyntaxKind.ClassDeclaration:

                    const classData: ClassData = {
                        className: "",
                        properties: []
                    };

                    ts.visitEachChild(node, classVisitor.bind(this, classData), context);

                    console.log(classData);

                    break;
            }

            return node;
        }

        return ts.visitEachChild(sourceFile, rootNodeVisitor, context);
    }
}

export default transformer;