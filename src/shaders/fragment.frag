precision mediump float;
uniform vec2 u_resolution;

void main() {
  vec2 coord = ((gl_FragCoord.xy - vec2(u_resolution.x / 1.7, 0.0)) / u_resolution.y - vec2(0.0, 0.5)) * 2.5;
  float color = 0.0;
  vec2 z = vec2(0.0, 0.0);
  for (int i = 0; i < 1000; i++) {
    if (length(z) > 2.0) {
      color = float(i) / 1000.0;
      break;
    }
    float xtemp = z.x * z.x - z.y * z.y + coord.x;
    z.y = 2.0 * z.x * z.y + coord.y;
    z.x = xtemp;
  }
  gl_FragColor = vec4(color, color, color, 1.0);
}
