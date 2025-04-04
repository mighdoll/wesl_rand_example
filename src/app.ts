/// <reference types="wesl-plugin/suffixes" />
import { wgslToDom } from "./highlight.ts";
import { simpleRenderShader } from "./shader.ts";
import { SlIconButton } from "@shoelace-style/shoelace";
import { link } from "wesl";
import rand from "random_wgsl";
import main from "../shaders/main.wgsl?link";
import { configureCanvas, gpuDevice } from "./gpuUtil.ts";
import { Loopable } from "./drawable.ts";
import { mapKeys } from "./util.ts";

/** Wire up the html UI and install the demo WebGPU shader */
export async function startApp(
  canvas: HTMLCanvasElement,
  stopButton: HTMLButtonElement,
  srcPanel: HTMLDivElement
): Promise<void> {
  const device = await gpuDevice();
  const linked = await link(main);
  const shaderModule = linked.createShaderModule(device, {});
  const animation = await setupRenderer(device, canvas, shaderModule);

  const randFiles = mapKeys(rand.modules, (s) => "random_wgsl/" + s);
  const srcs = { ...main.weslSrc, ...randFiles };
  srcPanel.innerHTML = makeSrcPanel(srcs, linked.dest);

  const buttonHandler = playPauseHandler(animation);
  stopButton.addEventListener("click", buttonHandler);
}

/** @return setup a gpu renderer to run the gpu demo */
async function setupRenderer(
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  shaderModule: GPUShaderModule
): Promise<Loopable> {
  const canvasContext = configureCanvas(device, canvas, true);
  const drawable = await simpleRenderShader(
    device,
    canvasContext,
    shaderModule
  );
  return new Loopable(drawable, false);
}

/** @return html for the tabs that display the source code */
function makeSrcPanel(modules: Record<string, string>, linked: string): string {
  const moduleEntries = Object.entries(modules);
  const srcEntries = [...moduleEntries, ["linked", linked]];
  const srcTabs = srcEntries
    .map(([name]) => `<sl-tab slot="nav" panel="${name}">${name}</sl-tab>`)
    .join("\n");
  const srcPanels = srcEntries
    .map(
      ([name, src]) => `
      <sl-tab-panel name="${name}">
        <pre>
${wgslToDom(src)}
        </pre>
      </sl-tab-panel>`
    )
    .join("\n");

  const html = `
    <sl-tab-group placement="top">
      ${srcTabs}
      ${srcPanels}
    </sl-tab-group>`;

  return html;
}

type ButtonClickListener = (this: HTMLButtonElement, evt: MouseEvent) => void;

function playPauseHandler(loopable: Loopable): ButtonClickListener {
  return function buttonHandler(e: MouseEvent): void {
    const running = !loopable.running; // get the current looping state
    loopable.run(running);
    const button = e.target as SlIconButton;
    button.name = running ? "pause" : "play";
  };
}
