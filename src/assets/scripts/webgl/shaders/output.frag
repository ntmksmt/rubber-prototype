precision highp float;

in vec3 vPosition;
in vec3 vViewPosition;
in vec2 vUv;
in vec3 vNormal;

out vec4 fragColor;

uniform sampler2D normalMap;
uniform float normalScale;
uniform sampler2D roughnessMap;
uniform float roughness;
uniform vec3 baseColor;
uniform float metalness;
uniform float IOR;
uniform float diffuseDecay;
uniform float ambMinIntensity;
uniform float ambMaxIntensity;
uniform vec3 bgTopCol;
uniform vec3 bgBottomCol;
uniform float ambBrightness;
uniform float ambMixCoef;
uniform samplerCube envMap;
uniform float envLod;
uniform float envIntensity;

#define PI 3.141592653589793
#define GAMMA 2.2

struct Light {
  vec3 position;
  float intensity;
  vec3 color;
};
uniform Light lights[LIGHTS_NUMBER];

const float minDot = 1e-3;
float dot_c(vec3 a, vec3 b) {
	return max(dot(a, b), minDot);
}

mat3 getTangentFrame(vec3 eye_pos, vec3 surf_norm, vec2 uv) {
	vec3 q0 = dFdx(eye_pos.xyz);
	vec3 q1 = dFdy(eye_pos.xyz);
	vec2 st0 = dFdx(uv.st);
	vec2 st1 = dFdy(uv.st);
	vec3 N = surf_norm;
	vec3 q1perp = cross(q1, N);
	vec3 q0perp = cross(N, q0);
	vec3 T = q1perp * st0.x + q0perp * st1.x;
	vec3 B = q1perp * st0.y + q0perp * st1.y;
	float det = max(dot(T, T), dot(B, B));
	float scale = (det == 0.0) ? 0.0 : inversesqrt(det);
	return mat3(T * scale, B * scale, N);
}

// cosTheta1〜0でF0〜1-roughnessを返す
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}

// Trowbridge-Reitz
float distribution(vec3 nor, vec3 h, float roughness) {
  // dot_c(nor, h)が1、roughnessが小さいほど大きな値を返すが、
  // dot_c(nor, h)が小さくなってもroughnessが大きければそこそこ大きな値を返す
  // (表面がゴワゴワだと広範囲で反射するイメージ)
  float a_2 = roughness * roughness;
	return a_2 / (PI * pow(pow(dot_c(nor, h), 2.0) * (a_2 - 1.0) + 1.0, 2.0));
}

// GGX and Schlick-Beckmann
// cosTheta1〜0で1〜0を返す(ただしkが小さいほど大きな値を返す)
float geometry(float cosTheta, float k) {
  return cosTheta / (cosTheta * (1.0 - k) + k);
}

float smiths(float NdotL, float NdotV, float roughness) {
  // roughness0〜1の時、0.125〜0.5
  float k = pow(roughness + 1.0, 2.0) / 8.0;
  return geometry(NdotL, k) * geometry(NdotV, k);
}

float specularBRDF(vec3 nor, vec3 viewDir, vec3 lightDir, vec3 h, float roughness) {
  float NdotL = dot_c(nor, lightDir);
  float NdotV = dot_c(nor, viewDir);

  // Normal distribution(微小面法線分布関数)
	// 物体表面のミクロレベルの各微小平面の法線がどれくらい指定の方向を向いているか
  float D = distribution(nor, h, roughness);

  // マイクロファセット同士が反射経路を遮蔽することによる減衰
  float G = smiths(NdotL, NdotV, roughness);

  // 明るい部分は減衰、暗い部分は増幅
  float V = G / max(0.0001, (4.0 * NdotL * NdotV));

  // 程よい直射と照り返し
  return D * V;
}

vec3 getEnvironment(vec3 dir){
  return mix(0.5 * bgBottomCol, 0.5 * bgTopCol, 0.5 + 0.5 * dir.y);
}

vec3 getAmbientLight(vec3 nor) {
  vec3 gradient = mix(vec3(ambMinIntensity), vec3(ambMaxIntensity), 0.5 + 0.5 * nor.y);
  return mix(gradient, getEnvironment(nor) * ambBrightness, ambMixCoef);
}

vec3 getIrradiance(vec3 pos, vec3 rd, vec3 nor, float rough, vec3 baseCol) {
  float roughness = rough;
  float metalness = metalness;
  float IOR = IOR;
  // 入射光の速さ/屈折光の速さ
  // IOR1.5の時 0.25 / 6.25 = 0.04
  vec3 F0 = vec3(pow(IOR - 1.0, 2.0) / pow(IOR + 1.0, 2.0));

  vec3 directDiffuse = vec3(0.0);
  vec3 directSpecular = vec3(0.0);
  for(int i = 0; i < LIGHTS_NUMBER; i++) {
    // light
    vec3 lightDir = normalize(lights[i].position - pos);
    vec3 lightRadiance = lights[i].color * lights[i].intensity;

    // directDiffuse
    float NdotL = dot(nor, lightDir) * 0.5 + 0.5; // 0〜1
    NdotL = pow(NdotL, diffuseDecay);
    directDiffuse += baseCol * NdotL * lightRadiance;

    // directSpecular
    vec3 h = normalize(- rd + lightDir);
    // 現在の角度から見たマイクロファセットの反射率
    vec3 F = fresnelSchlickRoughness(dot_c(h, - rd), F0, roughness);
    vec3 specular = F * specularBRDF(nor, - rd, lightDir, h, roughness);
    directSpecular += specular * lightRadiance * dot_c(nor, lightDir);
  }

  // 縁
	vec3 F = fresnelSchlickRoughness(dot_c(nor, - rd), F0, roughness);

  // Fの逆
  vec3 kD = (1.0 - F) * (1.0 - metalness);

  vec3 ambientLight = getAmbientLight(nor);
  vec3 ambientDiffuse = ambientLight * kD * baseCol / PI;
  ambientDiffuse += F * 0.6 * getEnvironment(nor);

  vec3 env = textureLod(envMap, normalize(reflect(rd, nor)), envLod).rgb * envIntensity;
  vec3 ambientSpecular = env * F;

  vec3 diffuse = directDiffuse + ambientDiffuse;
  
  vec3 irradiance = diffuse + directSpecular + ambientSpecular;
  
  return irradiance;
}

// https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
vec3 ACESFilm(vec3 x) {
	return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 pos = vPosition;
  vec3 rd = normalize(- vViewPosition);

  vec3 nor = vNormal;

  mat3 tbn = getTangentFrame(- vViewPosition, nor, vUv);
  // マップサイズ、位置調整(仮)
  vec3 mapN = textureLod(normalMap, vUv * vec2(2.0) + vec2(0.4, 0.3), 1.0).xyz * 2.0 - 1.0; // 0.5〜1 -> 0〜1
  mapN.xy *= normalScale;
  nor = normalize(tbn * mapN);

  float rough = texture(roughnessMap, vUv * vec2(2.0)).r;
  rough *= roughness;

  vec3 baseCol = baseColor;

  vec3 col = getIrradiance(pos, rd, nor, rough, baseCol);

  col = ACESFilm(col);
	col = pow(col, vec3(1.0 / GAMMA));

  fragColor = vec4(col, 1.0);
}
