import { ZodFunctionDef, ZodTypeAny } from "zod";
import { Refs } from "../Refs";
import { JsonSchema7Type, parseDef } from "../parseDef";

export type ExtensionFunctionType = {
  type: "function";
  takes: Record<string, any>; // arg0, arg1, etc
  returns: any; // any json schema type
};

export function parseFunctionDef(
  def: ZodFunctionDef,
  refs: Refs,
): ExtensionFunctionType {
  const items = def.args._def.items as ZodTypeAny[];
  return {
    type: "function",
    takes: items.reduce(
      (acc, item, index) => {
        return {
          ...acc,
          [`arg${index}`]: parseDef(item._def, {
            ...refs,
            currentPath: [...refs.currentPath, "takes", `arg${index}`],
          }),
        };
      },
      {} as Record<string, any>,
    ),
    returns: parseDef(def.returns._def, {
      ...refs,
      currentPath: [...refs.currentPath, "returns"],
    }),
  };
}
