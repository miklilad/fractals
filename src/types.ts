export type Fractals = "mandelbrot" | "julia";

export type Position = { x: number; y: number; z: number };

export type FractalConfig = {
  positions: Position[];
  fragmentShaders: string[];
  defaultFragmentShaderIndex: number;
};

export type Config = {
  [key in Fractals]: FractalConfig;
};
