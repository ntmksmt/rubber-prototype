precision highp float;

in vec3 vPosition;

out vec4 fragColor;

uniform float sphereRad;
uniform float gradStrength;
uniform float gradPos;
uniform vec3 topColor;
uniform vec3 bottomColor;

#define GAMMA 2.2
#define PI 3.14159265359

float rand(const vec2 uv) {
  const float a = 12.9898, b = 78.233, c = 43758.5453;
  float dt = dot(uv.xy, vec2(a, b)), sn = mod(dt, PI);
  return fract(sin(sn) * c);
}

vec3 dithering(vec3 color) {
  float grid_position = rand(gl_FragCoord.xy);
  vec3 dither_shift_RGB = vec3(0.25 / 255.0, - 0.25 / 255.0, 0.25 / 255.0);
  dither_shift_RGB = mix(2.0 * dither_shift_RGB, - 2.0 * dither_shift_RGB, grid_position);
  return color + dither_shift_RGB;
}

void main() {
  float y = vPosition.y / sphereRad;
  y *= gradStrength;
  y += gradPos;
  y = clamp(y, 0.0, 1.0);

  vec3 col = mix(bottomColor, topColor, y);

  col = pow(col, vec3(1.0 / GAMMA));
  col = dithering(col);

  fragColor = vec4(vec3(col), 1.0);
}
