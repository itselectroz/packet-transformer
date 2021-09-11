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
                        const typeNameNode = <ts.Identifier>(<ts.TypeReferenceNode>typeNode).typeName;
                        const type = typeNameNode.escapedText.toString();
                            
                        if(type == "vector") {

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