precision highp float;

in vec3 position;
in vec2 uv;

out vec3 vPosition;
out vec3 vViewPosition;
out vec2 vUv;
out vec3 vNormal;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform sampler2D positionInt;
uniform sampler2D positionFloat;
uniform sampler2D normal;

#include common/packPosition.frag

void main() {
  vec3 pos = packPosition(positionInt, positionFloat, position.xy);
  vec4 mPosition = modelMatrix * vec4(pos, 1.0);
  vPosition = mPosition.xyz;
  vec4 mvPosition = viewMatrix * mPosition;
  vViewPosition = - mvPosition.xyz;

  vUv = uv;

  vNormal = normalize(normalMatrix * texture(normal, position.xy).xyz);

  gl_Position = projectionMatrix * mvPosition;
}
