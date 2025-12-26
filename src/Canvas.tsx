import { useEffect, useRef, useState } from "react";
import vertexShaderSource from "./shaders/vertex.vert?raw";
import fragmentShaderSource from "./shaders/fragment.frag?raw";
import { useMouseDragMovement } from "./hooks/useMouseMovement";
import { useFPS } from "./hooks/useFPS";

// Pure function to create and compile a shader
const createShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
};

// Pure function to create a program from shaders
const createProgram = (
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null => {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.error("Program linking error:", gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
};

// Initialize WebGL with shaders and buffers
const initWebGL = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext("webgl");
  if (!gl) {
    console.error("WebGL not supported");
    return;
  }

  // Create shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );

  if (!vertexShader || !fragmentShader) return;

  // Create program
  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) return;

  // Triangle vertices (x, y) in clip space
  const positions = new Float32Array([
    0.0,
    3.0, // top vertex
    -3.0,
    -3.0, // bottom left vertex
    3.0,
    -3.0, // bottom right vertex
  ]);

  // // Triangle vertices (x, y) in clip space
  // const positions = new Float32Array([
  //   0.0,
  //   1.0, // top vertex
  //   -1.0,
  //   -1.0, // bottom left vertex
  //   1.0,
  //   -1.0, // bottom right vertex
  // ]);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  gl.useProgram(program);
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  // Return WebGL context and program info for later use
  return {
    gl,
    program,
  };
};

const render = ({
  context,
  position,
  width,
  height,
}: {
  context: {
    gl: WebGLRenderingContext;
    program: WebGLProgram;
  };
  position: { x: number; y: number; z: number };
  width: number;
  height: number;
}) => {
  const { gl, program } = context;

  gl.useProgram(program);
  // Update viewport and resolution
  gl.viewport(0, 0, width, height);
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  gl.uniform2fv(resolutionLocation, [width, height]);

  const positionLocation = gl.getUniformLocation(program, "u_position");
  gl.uniform3fv(positionLocation, [position.x, position.y, position.z]);

  // Clear and draw
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<ReturnType<typeof initWebGL>>(null);

  const [position, setPosition] = useState({ x: -0.5, y: 0, z: 2 });
  const fps = useFPS();

  // Initialize WebGL only once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    contextRef.current = initWebGL(canvas);
  }, []);

  useMouseDragMovement({ setPosition, canvasRef });

  // Handle resize and render
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        canvas.width = width;
        canvas.height = height;
        render({ context, position, width, height });
      }
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [position]);

  const majorDigits =
    (/^0*/.exec(String(position.z).replace(".", ""))?.[0] || "").length + 2;

  return (
    <div className="relative h-screen w-screen">
      <canvas id="canvas" className="h-full w-full" ref={canvasRef} />
      <div className="bg-black-100/10 absolute top-0 left-0 p-4 text-white">
        <p>FPS: {fps}</p>
        <p>x: {position.x.toFixed(majorDigits)}</p>
        <p>y: {position.y.toFixed(majorDigits)}</p>
        <p>z: {position.z.toFixed(majorDigits)}</p>
      </div>
    </div>
  );
};
