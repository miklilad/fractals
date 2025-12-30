import type { Config } from "./types";
import mandelbrotShaderSource from "./shaders/mandelbrot.frag?raw";
import mandelbrot2ShaderSource from "./shaders/mandelbrot2.frag?raw";
import mandelbrot3ShaderSource from "./shaders/mandelbrot3.frag?raw";
import juliaShaderSource from "./shaders/julia.frag?raw";

export const CONFIG: Config = {
  julia: {
    positions: [
      {
        x: 0,
        y: 0,
        z: 2,
      },
    ],
    fragmentShaders: [juliaShaderSource],
  },
  mandelbrot: {
    positions: [
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
    ],
    fragmentShaders: [
      mandelbrotShaderSource,
      mandelbrot2ShaderSource,
      mandelbrot3ShaderSource,
    ],
  },
};
