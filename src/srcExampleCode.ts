import src from "./main.wgsl?raw";
import utilWgsl from "./util.wgsl?raw";

/** collect src code for demo display */
export function exampleSrc(): Record<string, string> {
  return { main: src, util: utilWgsl };
}
