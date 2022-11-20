import * as ts from "typescript";

const logSettings: any = {
  all: true,
  root: false,
  expression: false,
  class: false,
  wow: true,
};

export function logNode(node: ts.Node, origin: string) {
  const logOrigin = origin;
  if (origin.indexOf(".") !== -1) {
    origin = origin.substr(0, origin.indexOf("."));
  }
  if (logSettings.all && logSettings[origin]) {
    console.log(
      `[${logOrigin}]`,
      node.kind,
      `\t# ts.SyntaxKind.${ts.SyntaxKind[node.kind]}`
    );
  }
}
