precision highp float;
uniform vec2 u_resolution;
uniform vec3 u_position;
uniform vec2 u_scalingFactor;
uniform vec2 u_min2;

#define CALCULATE_COLOR_VALUE {{{calculateColorValue}}}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}


#if CALCULATE_COLOR_VALUE == 0
vec3 calculateColor(int i) {
  float scaledI = float(i) / 100.0;
  return hsv2rgb(vec3(
    scaledI, 
    1.0, 
    float(((mod(scaledI, 200.0)) >= 100.0 ? 100.0 - mod(scaledI, 100.0) : mod(scaledI, 100.0)))
    )
  );
}
#else 
const float VALUE_DROP_OFF = 50.0;
vec3 calculateColor(int i) {
  float scaledI = float(i) / 100.0;
  return hsv2rgb(vec3(
    scaledI,
    1.0, 
    float(i) < VALUE_DROP_OFF ? (float(i) / VALUE_DROP_OFF) * 0.9 : 0.9
    )
  );
}
#endif

void main() {
  vec2 coord = u_min2 + gl_FragCoord.xy * u_scalingFactor;

  vec3 color = vec3(0.0);
  float zx = 0.0, zy = 0.0;
  for (int i = 0; i < 1000; i++) {
    float zxSquared = zx * zx;
    float zySquared = zy * zy;
    if (zxSquared + zySquared > 4.0) {
      color = calculateColor(i);
      break;
    }
    float xtemp = zxSquared - zySquared + coord.x;
    zy *= zx;
    zy += zy + coord.y;
    zx = xtemp;
  }
  gl_FragColor = vec4(color, 1.0);
}
