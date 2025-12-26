precision mediump float;
uniform vec2 u_resolution;
uniform vec3 u_position;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

vec2 map(vec2 value, vec2 min1, vec2 max1, vec2 min2, vec2 max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

void main() {
  float ratio = u_resolution.x / u_resolution.y;
  vec2 coord = map(gl_FragCoord.xy, 
                  vec2(0.0, 0.0), 
                  u_resolution, 
                  u_position.xy - u_position.z, 
                  u_position.xy + u_position.z);
  coord.y /= ratio;
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
