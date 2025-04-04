/// <reference types="wesl-plugin/suffixes" />
import { wgslToDom } from "./highlight.ts";
import { configureCanvas, Drawable, gpuDevice, simpleRenderShader } from "./shader.ts";
import { SlIconButton } from "@shoelace-style/shoelace";
import { link } from "wesl";
import main from "../shaders/main.wgsl?link";

/** Wire up the html UI and install the demo WebGPU shader */
export async function startApp(
  canvas: HTMLCanvasElement,
  stopButton: HTMLButtonElement,
  srcPanel: HTMLDivElement
): Promise<void> {
  const device = await gpuDevice();
  const linked = await link(main);
  const shaderModule = linked.createShaderModule(device, {})
  const drawable = await setupRenderer(device, canvas, shaderModule);

  srcPanel.innerHTML = makeSrcPanel(main.weslSrc, linked.dest);

  const buttonHandler = playPauseHandler(drawable);
  stopButton.addEventListener("click", buttonHandler);

  drawable.draw();
}

/** @return setup a gpu renderer to run the gpu demo */
async function setupRenderer(
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  shaderModule: GPUShaderModule
): Promise<Drawable> {
  const canvasContext = configureCanvas(device, canvas, true);
  const drawable = await simpleRenderShader(device, canvasContext, shaderModule);
  return drawable;
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

function playPauseHandler(drawable: Drawable): ButtonClickListener {
  return function buttonHandler(e: MouseEvent): void {
    const stopped = !drawable.stopped;
    drawable.stopped = stopped;
    const button = e.target as SlIconButton;
    button.name = stopped ? "play" : "pause";
    if (!stopped) drawLoop(drawable);
  };
}

function drawLoop(drawable: Drawable): void {
  drawRepeat();

  function drawRepeat(): void {
    if (drawable.stopped) return;
    drawable.draw();
    requestAnimationFrame(drawRepeat);
  }
}