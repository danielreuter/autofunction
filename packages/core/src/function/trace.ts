import { DefaultLog } from "../shared/types";

export class Trace {
  logs: DefaultLog[];

  constructor(logs: DefaultLog[] = []) {
    this.logs = logs;
  }

  message(message: string) {
    this.logs.push({ type: "message", message });
  }

  info(message: string) {
    this.logs.push({ type: "info", message });
  }

  error(message: string) {
    this.logs.push({ type: "error", message });
  }

  data(label: string, data: any) {
    this.logs.push({
      type: "data",
      message: `${label}: ${JSON.stringify(data, null, 2)}`,
    });
  }

  toString() {
    return this.logs
      .map((log) => {
        switch (log.type) {
          case "message":
            return `[MESSAGE]: ${log.message}`;
          case "info":
            return `[INFO]: ${log.message}`;
          case "error":
            return `[ERROR]: ${log.message}`;
          case "data":
            return `[DATA]: ${log.message}`;
        }
      })
      .join("\n");
  }
}
