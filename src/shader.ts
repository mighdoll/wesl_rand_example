import { makeWeslDevice, WeslDevice } from "wesl";

export interface Drawable {
  draw(): void;
  stopped: boolean;
}

/** @return a GPUDevice with a WESL wrapper for error reporting */
export async function gpuDevice(): Promise<WeslDevice> {
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
  return makeWeslDevice(device);
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

/**
 * Create a simple rendering shader
 *
 * @param code should have two entry points: vertexMain and fragmentMain
 *   The uniform buffer will be passed a single u32 containging the frame number
 * @param canvasContext the shader will render to the provided output texture
 *
 * @returns an object containing a draw() function to trigger gpu rendering.
 */
export async function simpleRenderShader(
  device: GPUDevice,
  canvasContext: GPUCanvasContext,
  shaderModule: GPUShaderModule
): Promise<Drawable> {
  let frameNumber = 0;

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });

  const uniformBufferSize = 1 * 4; // .frame
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      topology: "triangle-strip",
    },
  });

  const uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  const uniformData = new ArrayBuffer(uniformBufferSize);

  function draw(): void {
    const view = new DataView(uniformData);
    view.setUint32(0, frameNumber++, true);

    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const commandEncoder = device.createCommandEncoder();
    const textureView = canvasContext.getCurrentTexture().createView();

    const renderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(4, 1);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  }
  return { draw, stopped: true };
}
