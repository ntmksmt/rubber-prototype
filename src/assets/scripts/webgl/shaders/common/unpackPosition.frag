vec3 unpackPosition(vec3 position, int order) {
  position *= 1024.0;
  return order > 0 ? floor(position) : fract(position);
}
