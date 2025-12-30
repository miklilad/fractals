import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import vertexShaderSource from "./shaders/vertex.vert?raw";
import { useMouseMovement } from "./hooks/useMouseMovement";
import { useFPS } from "./hooks/useFPS";
import { Tooltip } from "react-tooltip";
import type { Fractals } from "./types";
import { CONFIG } from "./config";

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
const initWebGL = (
  canvas: HTMLCanvasElement,
  fragmentShaderSource: string,
  calculateColorValue: 0 | 1
) => {
  const gl = canvas.getContext("webgl");
  if (!gl) {
    console.error("WebGL not supported");
    return;
  }

  const fragmentShaderSourcePreprocessed = fragmentShaderSource.replace(
    "{{{calculateColorValue}}}",
    calculateColorValue.toString()
  );

  // Create shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSourcePreprocessed
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

  const ratio = width / height;
  const min2x = position.x - position.z;
  const min2y = position.y - position.z / ratio;
  const max2x = position.x + position.z;
  const max2y = position.y + position.z / ratio;
  const scalingFactorX = (max2x - min2x) / width;
  const scalingFactorY = (max2y - min2y) / height;

  const scalingFactorLocation = gl.getUniformLocation(
    program,
    "u_scalingFactor"
  );
  gl.uniform2fv(scalingFactorLocation, [scalingFactorX, scalingFactorY]);

  const min2Location = gl.getUniformLocation(program, "u_min2");
  gl.uniform2fv(min2Location, [min2x, min2y]);

  // Clear and draw
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<ReturnType<typeof initWebGL>>(null);
  const [fractal, setFractal] = useState<Fractals>("mandelbrot");
  const [fragmentShaderIndex, setFragmentShaderIndex] = useState(
    CONFIG[fractal].defaultFragmentShaderIndex
  );
  const [calculateColorValue, setCalculateColorValue] = useState<0 | 1>(0);
  const [positionIndex, setPositionIndex] = useState(0);
  const [position, setPosition] = useState(
    CONFIG[fractal].positions[positionIndex]
  );
  useEffect(() => {
    setPosition(CONFIG[fractal].positions[positionIndex]);
  }, [positionIndex, fractal]);
  const fps = useFPS();

  // Initialize WebGL only once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    contextRef.current = initWebGL(
      canvas,
      CONFIG[fractal].fragmentShaders[fragmentShaderIndex],
      calculateColorValue
    );
    if (!contextRef.current) return;
    render({
      context: contextRef.current,
      position,
      width: canvas.width,
      height: canvas.height,
    });
  }, [fragmentShaderIndex, calculateColorValue, positionIndex, fractal]);

  useMouseMovement({ setPosition, canvasRef });

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
    (/^0*/.exec(String(position.z.toFixed(100)).replace(".", ""))?.[0] || "")
      .length + 2;

  const hasCalculateColorValue = useMemo(
    () =>
      CONFIG[fractal].fragmentShaders[fragmentShaderIndex].includes(
        "{{{calculateColorValue}}}"
      ),
    [fragmentShaderIndex, fractal]
  );

  const handleFractalChange = useCallback(() => {
    const newFractal = fractal === "mandelbrot" ? "julia" : "mandelbrot";
    setFractal(newFractal);
    setFragmentShaderIndex(CONFIG[newFractal].defaultFragmentShaderIndex);
    setPositionIndex(0);
  }, [fractal, setFractal, setFragmentShaderIndex]);

  return (
    <div className="relative h-screen w-screen">
      <canvas id="canvas" className="h-full w-full" ref={canvasRef} />
      <div className="absolute top-0 left-0 bg-black/50 p-4 text-white">
        <p>FPS: {fps}</p>
        <p>x: {position.x.toFixed(majorDigits)}</p>
        <p>y: {position.y.toFixed(majorDigits)}</p>
        <p
          data-tooltip-id="z-tooltip"
          data-tooltip-content="The z-axis is the depth of the scene. Twice the z value is how much your screen covers on x-axis"
        >
          z: {position.z.toFixed(majorDigits)}
        </p>
        <Tooltip id="z-tooltip" />
      </div>
      <div className="absolute top-0 right-0 flex flex-col items-end bg-black/50 p-4 text-white">
        <p>
          <button
            className="my-1 rounded-md bg-gray-800 p-1 text-white"
            onClick={handleFractalChange}
          >
            {`${fractal === "mandelbrot" ? "Mandelbrot" : "Julia"}`}
          </button>
        </p>
        {CONFIG[fractal].positions.length > 1 && (
          <p>
            <button
              className="my-1 rounded-md bg-gray-800 p-1 text-white"
              onClick={() =>
                setPositionIndex(
                  (positionIndex + 1) % CONFIG[fractal].positions.length
                )
              }
            >
              {`Position ${positionIndex + 1}`}
            </button>
          </p>
        )}
        {CONFIG[fractal].fragmentShaders.length > 1 && (
          <p>
            <button
              className="my-1 rounded-md bg-gray-800 p-1 text-white"
              onClick={() =>
                setFragmentShaderIndex(
                  (fragmentShaderIndex + 1) %
                    CONFIG[fractal].fragmentShaders.length
                )
              }
            >
              {`Fragment Shader ${fragmentShaderIndex + 1}`}
            </button>
          </p>
        )}
        {hasCalculateColorValue && (
          <p>
            <button
              className="my-1 rounded-md bg-gray-800 p-1 text-white"
              onClick={() =>
                setCalculateColorValue(calculateColorValue === 0 ? 1 : 0)
              }
            >
              {calculateColorValue === 0
                ? "Legacy color value"
                : "Color value with drop off"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};
