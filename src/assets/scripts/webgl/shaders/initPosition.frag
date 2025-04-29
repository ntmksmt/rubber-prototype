precision highp float;

in vec2 vUv;

out vec4 fragColor;

uniform sampler2D vertices;
uniform int order;

#include common/unpackPosition.frag

void main() {
  fragColor = vec4(unpackPosition(texture(vertices, vUv).xyz, order), 1.0);
}
