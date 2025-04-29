vec3 packPosition(sampler2D positionInt, sampler2D positionFloat, vec2 uv) {
  return (texture(positionInt, uv).xyz + texture(positionFloat, uv).xyz) / 1024.0;
}
