/// <reference types="@webgpu/types" />
import { WebGPUSpriteMetadata } from './WebGPUAssetManager';

export interface CardInstance {
  id: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  state: number; // 0 = default, 1 = faceDown, etc
  uvBuffer: [number, number, number, number]; // [u0, v0, u1, v1]
}

const shaderCode = `
struct Camera {
  projection: mat4x4<f32>,
}
@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var s: sampler;
@group(0) @binding(2) var t: texture_2d<f32>;

struct InstanceInput {
  @location(0) transform0: vec4<f32>,
  @location(1) transform1: vec4<f32>,
  @location(2) transform2: vec4<f32>,
  @location(3) transform3: vec4<f32>,
  @location(4) uvBox: vec4<f32>, // u0, v0, u1, v1
  @location(5) opacity: f32,
  @location(6) state: f32, // placeholder for hover/states
};

struct VertexOutput {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) opacity: f32,
};

@vertex
fn vs(
  @builtin(vertex_index) vertexIndex: u32,
  instance: InstanceInput
) -> VertexOutput {
  // Simple quad
  var positions = array<vec2<f32>, 6>(
    vec2<f32>(-0.5, -0.5), vec2<f32>( 0.5, -0.5), vec2<f32>(-0.5,  0.5),
    vec2<f32>(-0.5,  0.5), vec2<f32>( 0.5, -0.5), vec2<f32>( 0.5,  0.5)
  );
  
  let p = positions[vertexIndex];
  
  // Instance matrix construction
  let instanceMatrix = mat4x4<f32>(
    instance.transform0,
    instance.transform1,
    instance.transform2,
    instance.transform3
  );

  let worldPos = instanceMatrix * vec4<f32>(p.x, p.y, 0.0, 1.0);
  
  var out: VertexOutput;
  out.pos = camera.projection * worldPos;

  // UV Mapping based on Atlas uvBox
  let u0 = instance.uvBox.x;
  let v0 = instance.uvBox.y;
  let u1 = instance.uvBox.z;
  let v1 = instance.uvBox.w;

  var mappedUV = vec2<f32>(
    select(u0, u1, p.x > 0.0),
    select(v0, v1, p.y < 0.0) // Flip Y for WebGPU target
  );

  out.uv = mappedUV;
  out.opacity = instance.opacity;
  return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4<f32> {
  var color = textureSample(t, s, in.uv);
  return color * in.opacity;
}
`;

export class WebGPUCardRenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  
  private cameraBuffer!: GPUBuffer;
  private instanceBuffer!: GPUBuffer;
  
  private atlasTexture!: GPUTexture;
  private projectionMatrix!: Float32Array;
  
  private capacity = 1000;
  
  async init(canvas: HTMLCanvasElement, atlas: ImageBitmap) {
    if (!navigator.gpu) throw new Error("WebGPU not supported");
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No WebGPU adapter");
    this.device = await adapter.requestDevice();
    
    this.context = canvas.getContext('webgpu') as GPUCanvasContext;
    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format,
      alphaMode: 'premultiplied',
    });

    // 1. Shaders
    const module = this.device.createShaderModule({ code: shaderCode });

    // 2. Camera Buffer
    this.cameraBuffer = this.device.createBuffer({
      size: 64, // mat4x4
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.projectionMatrix = new Float32Array(16);
    this.updateProjection(canvas.width, canvas.height);

    // 3. Atlas Texture
    this.atlasTexture = this.device.createTexture({
      size: [atlas.width, atlas.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture(
      { source: atlas },
      { texture: this.atlasTexture },
      [atlas.width, atlas.height]
    );

    const sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    // 4. Instance Buffer
    // Float32 attributes: 16 (mat4) + 4 (uvBox) + 1 (opacity) + 1 (state) = 22 floats per instance
    const bytesPerInstance = 22 * 4;
    this.instanceBuffer = this.device.createBuffer({
      size: this.capacity * bytesPerInstance,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // 5. Render Pipeline
    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module,
        entryPoint: 'vs',
        buffers: [
          {
            arrayStride: bytesPerInstance,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x4' },
              { shaderLocation: 1, offset: 16, format: 'float32x4' },
              { shaderLocation: 2, offset: 32, format: 'float32x4' },
              { shaderLocation: 3, offset: 48, format: 'float32x4' },
              { shaderLocation: 4, offset: 64, format: 'float32x4' },
              { shaderLocation: 5, offset: 80, format: 'float32' },
              { shaderLocation: 6, offset: 84, format: 'float32' },
            ]
          }
        ]
      },
      fragment: {
        module,
        entryPoint: 'fs',
        targets: [ { format, blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
        }} ]
      },
      primitive: { topology: 'triangle-list' }
    });

    // 6. Bind Group
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: sampler },
        { binding: 2, resource: this.atlasTexture.createView() }
      ]
    });
  }

  updateProjection(width: number, height: number) {
    // Orthographic Matrix
    const w = width, h = height;
    this.projectionMatrix.set([
      2/w, 0, 0, 0,
      0, -2/h, 0, 0,
      0, 0, 1, 0,
      -1, 1, 0, 1,
    ]);
    if (this.device) {
      this.device.queue.writeBuffer(this.cameraBuffer, 0, this.projectionMatrix);
    }
  }

  render(cards: CardInstance[]) {
    if (!this.device || !this.context) return;
    
    // Update Instance Buffer
    const instanceData = new Float32Array(cards.length * 22);
    cards.forEach((c, i) => {
      const idx = i * 22;
      
      const cosR = Math.cos(c.rotation);
      const sinR = Math.sin(c.rotation);
      
      // M = translation * rotation * scale
      instanceData[idx+0]  = c.scaleX * cosR;
      instanceData[idx+1]  = c.scaleX * sinR;
      instanceData[idx+2]  = 0;
      instanceData[idx+3]  = 0;
      
      instanceData[idx+4]  = c.scaleY * -sinR;
      instanceData[idx+5]  = c.scaleY * cosR;
      instanceData[idx+6]  = 0;
      instanceData[idx+7]  = 0;
      
      instanceData[idx+8]  = 0;
      instanceData[idx+9]  = 0;
      instanceData[idx+10] = 1;
      instanceData[idx+11] = 0;
      
      instanceData[idx+12] = c.x;
      instanceData[idx+13] = c.y;
      instanceData[idx+14] = 0;
      instanceData[idx+15] = 1;

      instanceData[idx+16] = c.uvBuffer[0];
      instanceData[idx+17] = c.uvBuffer[1];
      instanceData[idx+18] = c.uvBuffer[2];
      instanceData[idx+19] = c.uvBuffer[3];
      
      instanceData[idx+20] = c.opacity;
      instanceData[idx+21] = c.state;
    });

    this.device.queue.writeBuffer(this.instanceBuffer, 0, instanceData);

    // Draw Call
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        loadOp: 'clear',
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        storeOp: 'store',
      }]
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.instanceBuffer);
    pass.draw(6, cards.length, 0, 0);
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }
}

export const webGPUCardRenderer = new WebGPUCardRenderer();
