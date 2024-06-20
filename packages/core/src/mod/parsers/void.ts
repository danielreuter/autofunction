export type ExtensionVoidType = {
  type: "void";
};

export function parseVoidDef(): ExtensionVoidType {
  return {
    type: "void",
  };
}
