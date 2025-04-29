precision highp float;

in vec2 vUv;

out vec4 fragColor;

uniform sampler2D positionInt;
uniform sampler2D positionFloat;
uniform sampler2D vertices;
uniform float index;
uniform float resolutionXY;
uniform float cursorSize;
uniform vec3 worldCoordinates;
uniform int order;

#include common/packPosition.frag
#include common/getUV.frag
#include common/unpackPosition.frag

void main() {
  // 処理中の頂点の現在の位置(pos)、初期位置(orgPos)
  vec3 pos = packPosition(positionInt, positionFloat, vUv);
  vec3 orgPos = texture(vertices, vUv).xyz;

  // 掴んでいる頂点の初期位置
  vec3 grabOrgPos = texture(vertices, getUV(index, resolutionXY)).xyz;
  
  float dist = distance(grabOrgPos, orgPos);

  if(dist <= cursorSize) {
    vec3 offset = worldCoordinates - grabOrgPos;
    // 丸み
    orgPos.z += pow(smoothstep(cursorSize, 0.0, dist), 0.1) * 0.1;
    // 向き
    vec3 proj = dot(grabOrgPos - orgPos, offset) * orgPos;
    pos = orgPos + proj + offset;
  }

  pos = unpackPosition(pos, order);

  fragColor = vec4(pos, 1.0);
}
