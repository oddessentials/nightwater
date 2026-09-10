export const noiseGLSL = /* glsl */ `
float hash21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y); }
float fbm(vec2 p) { float a=.5, n=0.; for(int i=0;i<4;i++){ n+=a*noise(p);p=mat2(.8,.6,-.6,.8)*p*2.03+12.7;a*=.5;}return n; }
float caustic(vec2 p, float t) {
  vec2 q=p+vec2(sin(p.y*1.5+t*.8),cos(p.x*1.4-t*.7))*.38;
  float a=sin(q.x*3.1+q.y*1.8+t*.9), b=sin(q.x*-1.6+q.y*3.7-t*.7);
  return pow(1.-abs(a*b),12.);
}
`;

export const worldVertex = /* glsl */ `
varying vec2 vUv; varying vec3 vWorld; varying vec3 vLocal; varying vec3 vNormal;
void main(){vUv=uv; vLocal=position; vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}
`;
export const wallFragment = /* glsl */ `
uniform float uTime; uniform vec3 uHoles[4]; uniform vec3 uNormals[4]; uniform vec3 uColors[4];
varying vec2 vUv; varying vec3 vWorld; varying vec3 vLocal; varying vec3 vNormal;
${noiseGLSL}
void main(){
  for(int i=0;i<4;i++){vec3 d=vLocal-uHoles[i];float axial=dot(d,uNormals[i]);if(length(d-uNormals[i]*axial)<2.12&&abs(axial)<1.2)discard;}
  vec2 grid=vec2(vUv.x*240.,(vLocal.y+2.8)*3.3);grid.x+=mod(floor(grid.y),2.)*.5;
  vec2 g=abs(fract(grid)-.5);vec2 aa=fwidth(grid)*1.2;
  float tile=(1.-smoothstep(.474-aa.x,.49+aa.x,g.x))*(1.-smoothstep(.465-aa.y,.49+aa.y,g.y));
  float cell=hash21(floor(grid));
  vec3 glaze=mix(vec3(.018,.035,.046),vec3(.044,.089,.10),cell);
  float header=smoothstep(5.85,5.9,vLocal.y);
  glaze=mix(glaze,vec3(.085,.115,.12)*(1.+cell*.18),header*.7);
  float band=1.-smoothstep(.025,.045,abs(vLocal.y-5.85));
  glaze=mix(vec3(.009,.018,.022),glaze,tile);
  vec3 lit=glaze*(.4+.32*max(vNormal.y,0.));
  for(int i=0;i<4;i++){
    vec3 d=vLocal-uHoles[i];float len=length(d);
    float pool=3.6/(1.+len*len*.22);
    lit+=glaze*uColors[i]*pool;
    lit+=uColors[i]*pow(max(0.,1.-abs(len-2.25)/1.3),3.)*.1;
  }
  float c=caustic(vLocal.xz*.95+vec2(vLocal.y*.6,0),uTime);
  lit+=vec3(.04,.14,.12)*c*exp(-abs(vLocal.y-.6)*.85)*(.5+.5*noise(vLocal.xz));
  float wet=1.-smoothstep(.05,3.5,vLocal.y);
  float grain=noise(vLocal.xz*19.+vLocal.y*10.);
  lit*=1.-wet*.2;lit+=vec3(.014,.04,.04)*grain*wet;
  lit+=vec3(.12,.2,.19)*band;
  float topGlow=exp(-abs(vLocal.y-8.08)*3.5);
  lit+=vec3(.035,.09,.1)*topGlow;
  vec3 view=normalize(cameraPosition-vWorld);vec3 n=gl_FrontFacing?vNormal:-vNormal;
  float sheen=pow(max(0.,dot(reflect(-view,n),normalize(vec3(-.4,1.,-.3)))),20.);
  lit+=vec3(.08,.14,.15)*sheen*tile*(.5+wet);
  float fog=1.-exp(-length(cameraPosition-vWorld)*.005);
  gl_FragColor=vec4(mix(lit,vec3(.008,.017,.029),fog),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const tubeVertex = /* glsl */ `
attribute vec2 aAround;varying vec2 vUv;varying vec2 vAround;varying vec3 vWorld;varying vec3 vNormal;
void main(){vUv=uv;vAround=aAround;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}
`;
export const tubeFragment = /* glsl */ `
uniform float uTime;uniform vec3 uColor;uniform float uLength;uniform float uSeed;uniform float uExterior;
varying vec2 vUv;varying vec2 vAround;varying vec3 vWorld;varying vec3 vNormal;
${noiseGLSL}
void main(){
  float along=vUv.x*uLength;
  float ringDist=abs(fract(along/5.6)-.5)*5.6;
  float ring=1.-smoothstep(.032,.075,ringDist);
  float rib=1.-smoothstep(.045,.09,abs(fract(along/2.8)-.5)*2.8);
  float rail=1.-smoothstep(.018,.042,abs(vAround.y-.05));
  float wet=1.-smoothstep(-.85,.05,vAround.y);
  float panel=noise(vec2(along*2.,vUv.y*130.));
  vec3 base=mix(vec3(.017,.029,.036),uColor*.13,.45)*(.78+panel*.42);
  float edge=1.-smoothstep(.013,.027,abs(fract(vUv.y*12.)-.5));
  base*=1.-edge*.26;
  base*=1.-rib*.64;
  float lighting=.28+1.35*exp(-ringDist*1.6);
  float d=length(vWorld-cameraPosition);
  lighting+=1.5/(1.+d*d*.035);
  vec3 col=base*lighting;
  float cell=floor(along/5.6);
  float pulse=.88+.12*sin(uTime*.8-cell*.7);
  vec3 accent=mix(uColor,vec3(.6,.86,.96),smoothstep(.75,1.,sin(cell*.36+uSeed))*.5);
  col+=accent*(ring*2.5*mix(.35,1.,smoothstep(-.65,-.2,vAround.y))+rail*.42)*pulse;
  col+=accent*exp(-ringDist*4.)*.12;
  float streak=pow(noise(vec2(along*.5-uTime*3.,vUv.y*230.)),5.);
  col=mix(col,col*.7+accent*(.1+streak*.38),wet);
  vec3 N=normalize(vNormal)*(gl_FrontFacing?1.:-1.);vec3 V=normalize(cameraPosition-vWorld);
  N=normalize(N+vec3(sin(along*7.+vUv.y*180.),cos(vUv.y*230.+along*.6),sin(along*3.))*wet*.025);
  float sheen=pow(1.-abs(dot(V,N)),3.);
  col+=accent*sheen*(.12+wet*.15)/(1.+d*.017);
  if(uExterior>.5){col=base*.55+accent*(ring*.5+rail*.15);}
  col=mix(col,vec3(.002,.007,.014),1.-exp(-d*.006));
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
export const filmVertex = /* glsl */ `
uniform float uTime;varying vec2 vUv;varying vec3 vWorld;
void main(){vUv=uv;vec3 p=position;vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}
`;
export const filmFragment = /* glsl */ `
uniform float uTime;uniform float uLength;uniform vec3 uColor;varying vec2 vUv;varying vec3 vWorld;
${noiseGLSL}
void main(){
  float x=vUv.x*uLength;float y=vUv.y;
  float f=fbm(vec2(x*1.5-uTime*8.,y*12.));
  float c=caustic(vec2(x*.5-uTime*2.,y*2.),uTime);
  float foam=smoothstep(.48,.72,f)*(smoothstep(.65,.97,abs(y*2.-1.))*.9+.06);
  float ripple=sin(x*6.-uTime*28.+f*7.+y*9.)*.5+.5;
  vec3 col=mix(vec3(.012,.09,.105),uColor*.38,c*.42+ripple*.1);
  float rings=pow(max(0.,1.-abs(fract(x/5.6-.5+sin(y*15.+uTime)*.012)*2.-1.)),14.);
  col+=uColor*rings*.9;
  col=mix(col,vec3(.65,.87,.83),foam*.6);
  gl_FragColor=vec4(col,.94);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const waterVertex = /* glsl */ `
uniform mat4 textureMatrix;uniform float uTime;
varying vec4 vReflect;varying vec3 vWorld;varying vec2 vLocal;
void main(){
  vec3 p=position;
  vLocal=p.xy;
  p.z+=sin(p.x*.8+uTime*.8)*sin(p.y*.65-uTime*.65)*.022+sin(p.x*1.8+p.y*1.5-uTime*1.3)*.008;
  vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;vReflect=textureMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*viewMatrix*world;
}
`;
export const waterFragment = /* glsl */ `
uniform sampler2D tDiffuse;uniform float uTime;uniform float uUnder;uniform vec2 uWake;uniform float uSpeed;uniform vec3 uSplash;uniform vec3 uLights[4];uniform vec3 uColors[4];
varying vec4 vReflect;varying vec3 vWorld;varying vec2 vLocal;
${noiseGLSL}
float height(vec2 p){
  float t=uTime;
  float h=sin(p.x*.8+t*.8)*sin(p.y*.65-t*.65)*.06;
  h+=sin(p.x*1.8+p.y*1.5-t*1.3)*.022;
  h+=sin(p.x*4.3-p.y*2.9+t*2.2)*.009;
  h+=sin(p.x*8.+p.y*6.3-t*3.)*.004;
  float sd=length(p-uSplash.xy);float age=max(0.,uTime-uSplash.z);
  h+=sin(sd*4.8-age*9.)*exp(-pow((sd-age*3.)*.65,2.))*exp(-age*.6)*.07;
  float wd=length(p-uWake);h+=sin(wd*9.-t*7.)*exp(-wd*1.4)*uSpeed*.004;
  return h;
}
void main(){
  float r=length(vLocal);if(r>15.04)discard;
  float h=height(vLocal);
  vec2 slope=vec2(height(vLocal+vec2(.04,0))-h,height(vLocal+vec2(0,.04))-h)/.04;
  vec3 n=normalize(vec3(-slope.x,1.,slope.y));
  vec3 view=normalize(cameraPosition-vWorld);
  float fres=.045+.955*pow(1.-max(0.,dot(n,view)),4.3);
  vec2 ref=vReflect.xy/vReflect.w;
  ref+=slope*.025/(1.+length(cameraPosition-vWorld)*.025);
  vec3 reflected=texture2D(tDiffuse,clamp(ref,.002,.998)).rgb;
  vec2 floorUV=vLocal+slope*.7;
  vec2 tile=abs(fract(floorUV*1.7)-.5);
  float grout=smoothstep(.465,.49,max(tile.x,tile.y));
  vec3 body=mix(vec3(.018,.115,.12),vec3(.009,.045,.057),grout);
  body+=vec3(.05,.18,.12)*caustic(floorUV*.7,uTime)*.4;
  vec3 col=mix(body,reflected*.88+vec3(.002,.012,.014),clamp(fres*.86+.16,.15,.94));
  for(int i=0;i<4;i++){
    vec3 L=uLights[i]-vWorld;float dist=length(L);L/=dist;
    float spec=pow(max(0.,dot(n,normalize(view+L))),90.);
    col+=uColors[i]*(spec*1.8/(1.+dist*.09)+.028/(1.+dist*dist*.06));
  }
  float edge=smoothstep(14.4,14.98,r);
  float froth=smoothstep(.52,.79,noise(vLocal*14.+vec2(uTime*.3,-uTime*.2)))*edge;
  float age=max(0.,uTime-uSplash.z),sd=length(vLocal-uSplash.xy);
  froth+=exp(-pow(sd-age*2.8,2.)*3.)*exp(-age*.9)*smoothstep(.4,.7,noise(vLocal*12.));
  col=mix(col,vec3(.36,.64,.58),clamp(froth*.45,0.,.8));
  col=mix(col,vec3(.014,.10,.12),uUnder*.8);
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const skyFragment = /* glsl */ `
varying vec3 vDirection;uniform float uTime;
${noiseGLSL}
void main(){
  vec3 d=normalize(vDirection);float y=max(0.,d.y);
  vec3 col=mix(vec3(.022,.047,.072),vec3(.002,.006,.022),pow(y,.48));
  vec2 uv=vec2(atan(d.z,d.x)/6.283185+.5,asin(d.y)/3.14159+.5);
  float cloud=fbm(uv*vec2(12.,7.)+vec2(uTime*.0005,0.));
  col+=vec3(.009,.011,.025)*cloud*smoothstep(0.,.3,d.y);
  float band=exp(-pow((d.y-d.x*.4-.45)*4.,2.));
  col+=vec3(.017,.022,.038)*band*fbm(uv*vec2(95.,45.));
  vec2 grid=uv*vec2(1700.,850.);vec2 cell=floor(grid);float r=hash21(cell);
  vec2 f=fract(grid)-vec2(.2+hash21(cell+41.)*.6,.2+hash21(cell+7.)*.6);
  float star=exp(-dot(f,f)*(r>.997?30.:100.))*step(.979,r);
  star*=smoothstep(-.015,.16,d.y)*(1.-cloud*.35);
  col+=mix(vec3(.65,.78,1.),vec3(1.,.85,.68),hash21(cell+3.))*star*(.55+hash21(cell+4.))*(.85+.15*sin(uTime*.6+r*65.));
  vec3 moonDir=normalize(vec3(-.4,.67,-.7));
  float moonDist=length(d-moonDir);
  col+=vec3(.17,.26,.32)*exp(-moonDist*26.)*.3;
  float disc=1.-smoothstep(.023,.024,moonDist);
  float crater=.82+.18*noise(d.xz*1900.);
  col=mix(col,vec3(1.35,1.48,1.35)*crater,disc);
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const lensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uSplash: { value: 0 },
    uUnder: { value: 0 },
    uSpeed: { value: 0 },
    uGentle: { value: 0 },
  },
  vertexShader:
    "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;uniform float uTime;uniform float uSplash;uniform float uUnder;uniform float uSpeed;uniform float uGentle;varying vec2 vUv;
    ${noiseGLSL}
    void main(){
      vec2 uv=vUv;vec2 offset=vec2(0.);float shine=0.;
      for(int i=0;i<10;i++){
        float fi=float(i);vec2 center=vec2(hash21(vec2(fi,3.)),hash21(vec2(fi,7.)));
        center.y-=pow(1.-uSplash,2.)*(.08+hash21(vec2(fi,5.))*.3);
        vec2 d=(uv-center)*vec2(1.5,1.);float rad=.013+hash21(vec2(fi,8.))*.022;
        float mask=1.-smoothstep(rad*.75,rad,length(d));
        offset+=d*mask*uSplash*.6;shine+=pow(max(0.,1.-abs(length(d)-rad*.85)/.003),4.)*uSplash*.08;
      }
      offset+=vec2(sin(uv.y*20.+uTime*2.),cos(uv.x*18.-uTime))*uUnder*.004;
      vec2 sampleUV=clamp(uv+offset,.001,.999);vec3 col=texture2D(tDiffuse,sampleUV).rgb;
      float edge=smoothstep(.15,.65,length(uv-.5));float chroma=edge*.0009*uSpeed*(1.-uGentle);
      col.r=texture2D(tDiffuse,clamp(sampleUV+vec2(chroma,0.),.001,.999)).r;
      col.b=texture2D(tDiffuse,clamp(sampleUV-vec2(chroma,0.),.001,.999)).b;
      col+=shine;col*=1.-edge*.16;
      col=mix(col,col*vec3(.18,.62,.68)+vec3(.004,.022,.03),uUnder*.85);
      gl_FragColor=vec4(col,1.);
    }
  `,
};
