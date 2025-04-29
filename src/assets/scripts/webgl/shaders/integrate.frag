precision highp float;

in vec2 vUv;

out vec4 fragColor;

uniform mat4 customModelMatrix;
uniform sampler2D vertices;
uniform sampler2D prvPositionInt;
uniform sampler2D prvPositionFloat;
uniform sampler2D positionInt;
uniform sampler2D positionFloat;
uniform float delta;
uniform float tension;
uniform float damping;
uniform float mass;
uniform int order;

#include common/packPosition.frag
#include common/unpackPosition.frag

void main() {
  vec3 orgPos = (customModelMatrix * vec4(texture(vertices, vUv).xyz, 1.0)).xyz;
  // vec3 orgPos = texture(vertices, vUv).xyz;
  vec3 prvPos = packPosition(prvPositionInt, prvPositionFloat, vUv);
  vec3 pos = packPosition(positionInt, positionFloat, vUv);

  float dt = delta;

  vec3 vel = pos - prvPos;
  vec3 ten = (orgPos - pos) * tension;
  vec3 dam = vel * damping;
  vec3 final = ten - dam;
  vec3 accel = final / mass;
  vel += accel * dt;
  pos += vel;

  fragColor = vec4(unpackPosition(pos, order), 1.0);
}
