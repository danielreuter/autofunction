import { ZodStringDef } from "zod";
import { ErrorMessages, setResponseValueAndErrors } from "../errorMessages";
import { Refs } from "../Refs";

/**
 * Generated from the .source property of regular expressins found here:
 * https://github.com/colinhacks/zod/blob/master/src/types.ts.
 *
 * Escapes have been doubled, and expressions with /i flag have been changed accordingly
 */
export const zodPatterns = {
  /**
   * `c` was changed to `[cC]` to replicate /i flag
   */
  cuid: "^[cC][^\\s-]{8,}$",
  cuid2: "^[a-z][a-z0-9]*$",
  ulid: "^[0-9A-HJKMNP-TV-Z]{26}$",
  /**
   * `a-z` was added to replicate /i flag
   */
  email:
    "^(?!\\.)(?!.*\\.\\.)([a-zA-Z0-9_+-\\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\\-]*\\.)+[a-zA-Z]{2,}$",
  emoji: "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$",
  /**
   * Unused
   */
  uuid: "^[0-9a-fA-F]{8}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{12}$",
  /**
   * Unused
   */
  ipv4: "^(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))$",
  /**
   * Unused
   */
  ipv6: "^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$",
  base64: "^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$",
  nanoid: "^[a-zA-Z0-9_-]{21}$",
} as const;

export type JsonSchema7StringType = {
  type: "string";
  minLength?: number;
  maxLength?: number;
  format?:
    | "email"
    | "idn-email"
    | "uri"
    | "uuid"
    | "date-time"
    | "ipv4"
    | "ipv6"
    | "date"
    | "time"
    | "duration";
  pattern?: string;
  allOf?: {
    pattern: string;
    errorMessage?: ErrorMessages<{ pattern: string }>;
  }[];
  anyOf?: {
    format: string;
    errorMessage?: ErrorMessages<{ format: string }>;
  }[];
  errorMessage?: ErrorMessages<JsonSchema7StringType>;
  contentEncoding?: string;
};

export function parseStringDef(
  def: ZodStringDef,
  refs: Refs,
): JsonSchema7StringType {
  const res: JsonSchema7StringType = {
    type: "string",
  };

  function processPattern(value: string): string {
    return refs.patternStrategy === "escape"
      ? escapeNonAlphaNumeric(value)
      : value;
  }

  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          setResponseValueAndErrors(
            res,
            "minLength",
            typeof res.minLength === "number"
              ? Math.max(res.minLength, check.value)
              : check.value,
            check.message,
            refs,
          );
          break;
        case "max":
          setResponseValueAndErrors(
            res,
            "maxLength",
            typeof res.maxLength === "number"
              ? Math.min(res.maxLength, check.value)
              : check.value,
            check.message,
            refs,
          );

          break;
        case "email":
          switch (refs.emailStrategy) {
            case "format:email":
              addFormat(res, "email", check.message, refs);
              break;
            case "format:idn-email":
              addFormat(res, "idn-email", check.message, refs);
              break;
            case "pattern:zod":
              addPattern(res, zodPatterns.email, check.message, refs);
              break;
          }

          break;
        case "url":
          addFormat(res, "uri", check.message, refs);
          break;
        case "uuid":
          addFormat(res, "uuid", check.message, refs);
          break;
        case "regex":
          addPattern(res, check.regex.source, check.message, refs);
          break;
        case "cuid":
          addPattern(res, zodPatterns.cuid, check.message, refs);
          break;
        case "cuid2":
          addPattern(res, zodPatterns.cuid2, check.message, refs);
          break;
        case "startsWith":
          addPattern(
            res,
            "^" + processPattern(check.value),
            check.message,
            refs,
          );
          break;
        case "endsWith":
          addPattern(
            res,
            processPattern(check.value) + "$",
            check.message,
            refs,
          );
          break;

        case "datetime":
          addFormat(res, "date-time", check.message, refs);
          break;
        case "date":
          addFormat(res, "date", check.message, refs);
          break;
        case "time":
          addFormat(res, "time", check.message, refs);
          break;
        case "duration":
          addFormat(res, "duration", check.message, refs);
          break;
        case "length":
          setResponseValueAndErrors(
            res,
            "minLength",
            typeof res.minLength === "number"
              ? Math.max(res.minLength, check.value)
              : check.value,
            check.message,
            refs,
          );
          setResponseValueAndErrors(
            res,
            "maxLength",
            typeof res.maxLength === "number"
              ? Math.min(res.maxLength, check.value)
              : check.value,
            check.message,
            refs,
          );
          break;
        case "includes": {
          addPattern(res, processPattern(check.value), check.message, refs);
          break;
        }
        case "ip": {
          if (check.version !== "v6") {
            addFormat(res, "ipv4", check.message, refs);
          }
          if (check.version !== "v4") {
            addFormat(res, "ipv6", check.message, refs);
          }
          break;
        }
        case "emoji":
          addPattern(res, zodPatterns.emoji, check.message, refs);
          break;
        case "ulid": {
          addPattern(res, zodPatterns.ulid, check.message, refs);
          break;
        }
        case "base64": {
          switch (refs.base64Strategy) {
            case "format:binary": {
              addFormat(res, "binary" as any, check.message, refs);
              break;
            }

            case "contentEncoding:base64": {
              setResponseValueAndErrors(
                res,
                "contentEncoding",
                "base64",
                check.message,
                refs,
              );
              break;
            }

            case "pattern:zod": {
              addPattern(res, zodPatterns.base64, check.message, refs);
              break;
            }
          }
          break;
        }
        case "nanoid": {
          addPattern(res, zodPatterns.nanoid, check.message, refs);
        }
        case "toLowerCase":
        case "toUpperCase":
        case "trim":
          break;
        default:
          ((_: never) => {})(check);
      }
    }
  }

  return res;
}

const escapeNonAlphaNumeric = (value: string) =>
  Array.from(value)
    .map((c) => (/[a-zA-Z0-9]/.test(c) ? c : `\\${c}`))
    .join("");

const addFormat = (
  schema: JsonSchema7StringType,
  value: Required<JsonSchema7StringType>["format"],
  message: string | undefined,
  refs: Refs,
) => {
  if (schema.format || schema.anyOf?.some((x) => x.format)) {
    if (!schema.anyOf) {
      schema.anyOf = [];
    }

    if (schema.format) {
      schema.anyOf!.push({
        format: schema.format,
        ...(schema.errorMessage &&
          refs.errorMessages && {
            errorMessage: { format: schema.errorMessage.format },
          }),
      });
      delete schema.format;
      if (schema.errorMessage) {
        delete schema.errorMessage.format;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }

    schema.anyOf!.push({
      format: value,
      ...(message &&
        refs.errorMessages && { errorMessage: { format: message } }),
    });
  } else {
    setResponseValueAndErrors(schema, "format", value, message, refs);
  }
};

const addPattern = (
  schema: JsonSchema7StringType,
  value: string,
  message: string | undefined,
  refs: Refs,
) => {
  if (schema.pattern || schema.allOf?.some((x) => x.pattern)) {
    if (!schema.allOf) {
      schema.allOf = [];
    }

    if (schema.pattern) {
      schema.allOf!.push({
        pattern: schema.pattern,
        ...(schema.errorMessage &&
          refs.errorMessages && {
            errorMessage: { pattern: schema.errorMessage.pattern },
          }),
      });
      delete schema.pattern;
      if (schema.errorMessage) {
        delete schema.errorMessage.pattern;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }

    schema.allOf!.push({
      pattern: value,
      ...(message &&
        refs.errorMessages && { errorMessage: { pattern: message } }),
    });
  } else {
    setResponseValueAndErrors(schema, "pattern", value, message, refs);
  }
};
