import { performance } from "perf_hooks";
import { Loggers } from "./LoggerFactory";

const logger = Loggers.getLogger("timer");

export function timer() {

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: any, ...args: any[]): any {
      let timer = -performance.now();
      return originalMethod.apply(this, args).then((result: any) => {
        timer += performance.now();
        logger.info(`[${target.constructor.name} - ${propertyKey}] time : ${(timer / 1000).toFixed(3)} sec.`);
        return result;
      }).catch((error: any) => {
        logger.error(error);
        return Promise.reject(error);
      });
    }
  }
}