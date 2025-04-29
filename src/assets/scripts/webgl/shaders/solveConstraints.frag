precision highp float;

in vec2 vUv;

out vec4 fragColor;

uniform sampler2D positionInt;
uniform sampler2D positionFloat;
uniform sampler2D adjacentIndices0;
uniform sampler2D adjacentIndices1;
uniform sampler2D adjacentDistances0;
uniform sampler2D adjacentDistances1;
uniform float resolutionXY;
uniform int order;

#include common/packPosition.frag
#include common/getUV.frag
#include common/unpackPosition.frag

vec3 getPosition(vec2 uv) {
  return packPosition(positionInt, positionFloat, uv);
}

vec3 getIndexPosition(float index) {
  if(index < 0.0) return vec3(0);

  return getPosition(getUV(index, resolutionXY));
}

// p0 - 処理中の中心頂点
// p1 - 隣接頂点
// restDistance - 隣接頂点との本来の距離
vec3 getDisplacement(float index, inout float count, vec3 p0, vec3 p1, float restDistance) {
  if(index < 0.0) return vec3(0);

  count++;
  float curDistance = distance(p0, p1);
  return (curDistance - restDistance) * 1.0 * (p1 - p0) / curDistance;
}

void main() {
  vec3 p0 = packPosition(positionInt, positionFloat, vUv);

  vec4 ai0 = texture(adjacentIndices0, vUv);
  vec4 ai1 = texture(adjacentIndices1, vUv);

  vec4 ad0 = texture(adjacentDistances0, vUv);
  vec4 ad1 = texture(adjacentDistances1, vUv);

  // number of adjacent indices -> min: 4, max: 8
  vec3 p1 = getIndexPosition(ai0.x);
  vec3 p2 = getIndexPosition(ai0.y);
  vec3 p3 = getIndexPosition(ai0.z);
  vec3 p4 = getIndexPosition(ai0.w);
  vec3 p5 = getIndexPosition(ai1.x);
  vec3 p6 = getIndexPosition(ai1.y);
  vec3 p7 = getIndexPosition(ai1.z);
  vec3 p8 = getIndexPosition(ai1.w);

  vec3 displacement;
  float count = 0.0;
  displacement += getDisplacement(ai0.x, count, p0, p1, ad0.x);
  displacement += getDisplacement(ai0.y, count, p0, p2, ad0.y);
  displacement += getDisplacement(ai0.z, count, p0, p3, ad0.z);
  displacement += getDisplacement(ai0.w, count, p0, p4, ad0.w);
  displacement += getDisplacement(ai1.x, count, p0, p5, ad1.x);
  displacement += getDisplacement(ai1.y, count, p0, p6, ad1.y);
  displacement += getDisplacement(ai1.z, count, p0, p7, ad1.z);
  displacement += getDisplacement(ai1.w, count, p0, p8, ad1.w);

  p0 += displacement / count;

  fragColor = vec4(unpackPosition(p0, order), 1.0);
}
