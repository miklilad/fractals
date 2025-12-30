import { useEffect, useMemo, useRef, useState } from "react";
import vertexShaderSource from "./shaders/vertex.vert?raw";
import mandelbrotShaderSource from "./shaders/mandelbrot.frag?raw";
import mandelbrot2ShaderSource from "./shaders/mandelbrot2.frag?raw";
import mandelbrot3ShaderSource from "./shaders/mandelbrot3.frag?raw";
import juliaShaderSource from "./shaders/julia.frag?raw";
import { useMouseMovement } from "./hooks/useMouseMovement";
import { useFPS } from "./hooks/useFPS";
import { Tooltip } from "react-tooltip";

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

const FRAGMENT_SHADER_SOURCES = [
  mandelbrotShaderSource,
  mandelbrot2ShaderSource,
  mandelbrot3ShaderSource,
  juliaShaderSource,
] as const;

// Initialize WebGL with shaders and buffers
const initWebGL = (
  canvas: HTMLCanvasElement,
  fragmentShaderIndex: number,
  calculateColorValue: 0 | 1
) => {
  const gl = canvas.getContext("webgl");
  if (!gl) {
    console.error("WebGL not supported");
    return;
  }

  const fragmentShaderSource = FRAGMENT_SHADER_SOURCES[fragmentShaderIndex];
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

const POSITIONS = [
  {
    x: -0.5,
    y: 0,
    z: 2,
  },
  {
    x: -1.253488,
    y: -0.3846224,
    z: 0.000042,
  },
  {
    x: -1.25344342,
    y: -0.38461364,
    z: 0.00000356,
  },
  {
    x: -0.114961,
    y: -0.043555,
    z: 0.000567,
  },
];

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<ReturnType<typeof initWebGL>>(null);
  const [fragmentShaderIndex, setFragmentShaderIndex] = useState(3);
  const [calculateColorValue, setCalculateColorValue] = useState<0 | 1>(0);
  const [positionIndex, setPositionIndex] = useState(0);
  const [position, setPosition] = useState(POSITIONS[positionIndex]);
  useEffect(() => {
    setPosition(POSITIONS[positionIndex]);
  }, [positionIndex]);
  const fps = useFPS();

  // const strNum1 =
  //   "11111111.000002440000000000000000000000000000000000000222222";
  // const strNum2 =
  //   "11111112.0000035600000000000000000000000000000000000002222222";

  // const decimal1 = new Decimal(strNum1);
  // const decimal2 = new Decimal(strNum2);
  // const number1 = Number(strNum1);
  // const number2 = Number(strNum2);
  // console.log({
  //   decimal1: decimal1.toString(),
  //   decimal2: decimal2.toString(),
  //   sum: decimal1.plus(decimal2),
  //   number1: number1,
  //   number2: number2,
  //   sum2: number1 + number2,
  // });

  // Initialize WebGL only once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    contextRef.current = initWebGL(
      canvas,
      fragmentShaderIndex,
      calculateColorValue
    );
    if (!contextRef.current) return;
    render({
      context: contextRef.current,
      position,
      width: canvas.width,
      height: canvas.height,
    });
  }, [fragmentShaderIndex, calculateColorValue, positionIndex]);

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
      FRAGMENT_SHADER_SOURCES[fragmentShaderIndex].includes(
        "{{{calculateColorValue}}}"
      ),
    [fragmentShaderIndex]
  );

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
            onClick={() =>
              setPositionIndex((positionIndex + 1) % POSITIONS.length)
            }
          >
            {`Position ${positionIndex + 1}`}
          </button>
        </p>
        <p>
          <button
            className="my-1 rounded-md bg-gray-800 p-1 text-white"
            onClick={() =>
              setFragmentShaderIndex(
                (fragmentShaderIndex + 1) % FRAGMENT_SHADER_SOURCES.length
              )
            }
          >
            {`Fragment Shader ${fragmentShaderIndex + 1}`}
          </button>
        </p>
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
