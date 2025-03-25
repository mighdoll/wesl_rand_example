/// <reference types="wesl-plugin/suffixes" />
import { link } from "wesl";
import main from "../shaders/main.wgsl?link";

/** Link demo wgsl src
 *
 * @return linked code
 */
export async function linkDemoSrc(): Promise<string> {
  const linked = await link(main);
  return linked.dest;
}
