precision highp float;

in vec2 vUv;

out vec4 fragColor;

uniform sampler2D positionInt;
uniform sampler2D positionFloat;
uniform sampler2D adjacentIndices0;
uniform sampler2D adjacentIndices1;
uniform float resolutionXY;

#include common/packPosition.frag
#include common/getUV.frag

vec3 getPosition(vec2 uv) {
  return packPosition(positionInt, positionFloat, uv);
}

vec3 getIndexPosition(float index) {
  if(index < 0.0) return vec3(0);

  return getPosition(getUV(index, resolutionXY));
}

void main() {
  vec3 p0 = getPosition(vUv);

  vec4 ai0 = texture(adjacentIndices0, vUv);
  vec4 ai1 = texture(adjacentIndices1, vUv);

  // number of adjacent indices -> min: 4, max: 8
  vec3 p1 = getIndexPosition(ai0.x);
  vec3 p2 = getIndexPosition(ai0.y);
  vec3 p3 = getIndexPosition(ai0.z);
  vec3 p4 = getIndexPosition(ai0.w);
  vec3 p5 = getIndexPosition(ai1.x);
  vec3 p6 = getIndexPosition(ai1.y);
  vec3 p7 = getIndexPosition(ai1.z);
  vec3 p8 = getIndexPosition(ai1.w);

  vec3 normal;
  normal += cross(p1 - p0, p2 - p0);
  normal += cross(p2 - p0, p3 - p0);
  normal += cross(p3 - p0, p4 - p0);

  if(ai1.x < 0.0) {
    normal += cross(p4 - p0, p1 - p0);
  } else {
    normal += cross(p4 - p0, p5 - p0);

    if(ai1.y < 0.0) {
      normal += cross(p5 - p0, p1 - p0);
    } else {
      normal += cross(p5 - p0, p6 - p0);

      if(ai1.z < 0.0) {
        normal += cross(p6 - p0, p1 - p0);
      } else {
        normal += cross(p6 - p0, p7 - p0);

        if(ai1.w < 0.0) {
          normal += cross(p7 - p0, p1 - p0);
        } else {
          normal += cross(p7 - p0, p8 - p0);
          normal += cross(p8 - p0, p1 - p0);
        }
      }
    }
  }

  fragColor = vec4(normalize(normal), 1.0);
}
