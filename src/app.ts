import { wgslToDom } from "./highlight.ts";
import { linkDemoSrc } from "./linkSrc.ts";
import { Drawable, simpleRenderShader } from "./shader.ts";
import { SlIconButton } from "@shoelace-style/shoelace";
import { exampleSrc } from "./srcExampleCode.ts";

/** Wire up the html UI and install the demo WebGPU shader */
export async function startApp(
  canvas: HTMLCanvasElement,
  stopButton: HTMLButtonElement,
  srcPanel: HTMLDivElement
): Promise<void> {
  const linked = linkDemoSrc();
  const drawable = await setupRenderer(canvas, linked);

  srcPanel.innerHTML = makeSrcPanel(exampleSrc(), linked);

  const buttonHandler = playPauseHandler(drawable);
  stopButton.addEventListener("click", buttonHandler);

  drawable.draw();
}

/** @return setup a gpu renderer to run the gpu demo */
async function setupRenderer(
  canvas: HTMLCanvasElement,
  code: string
): Promise<Drawable> {
  const gpu = navigator.gpu;
  if (!gpu) {
    console.error("No GPU found, try chrome, or firefox on windows");
    throw new Error("no GPU");
  }
  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    console.error("No gpu adapter found");
    throw new Error("no GPU adapter");
  }
  const device = await adapter.requestDevice();
  const canvasContext = configureCanvas(device, canvas, true);
  const drawable = await simpleRenderShader(device, canvasContext, code);
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

/** configure the webgpu canvas context for typical webgpu use */
export function configureCanvas(
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  debug = false
): GPUCanvasContext {
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("no WebGPU context available");
  }
  let usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST;
  if (debug) {
    usage |= GPUTextureUsage.COPY_SRC;
  }
  context.configure({
    device,
    alphaMode: "opaque",
    format: navigator.gpu.getPreferredCanvasFormat(),
    usage: usage,
  });

  return context;
}
