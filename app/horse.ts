import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type Settings = { gait: 'idle' | 'walk' | 'run'; playing: boolean; speed: number; phase: number; pose: string; head: number; saddle: boolean; headgear: boolean; harness: boolean; jockey: boolean; rotate: boolean; grid: boolean };
export const defaults: Settings = { gait: 'idle', playing: true, speed: 1, phase: 0, pose: 'Natural', head: 0, saddle: true, headgear: true, harness: false, jockey: false, rotate: false, grid: true };
type Ring = [number,number,number,number];
export function mountHorse(host: HTMLElement, getSettings: () => Settings, onPhase: (phase:number)=>void) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#edf0f3');
  scene.fog = new THREE.Fog('#edf0f3', 15, 35);
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 60);
  const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Interactive 3D racehorse. Drag to orbit, scroll or pinch to zoom.');
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,1.65,0); controls.enableDamping=true; controls.enablePan=false;
  controls.minDistance=4.8;controls.maxDistance=13;controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI;controls.autoRotateSpeed=.65;
  function view(name:string) {
    const p: Record<string,number[]> = { Perspective:[-4.7,3.1,7.0], Side:[0,2.6,8.4], Front:[-8.4,2.7,0], Rear:[8.4,2.7,0], Underneath:[-2.5,-4.5,5.5] };
    camera.position.fromArray(p[name]||p.Perspective); controls.target.set(0,1.65,0);controls.update();
  }
  view('Perspective');
  scene.add(new THREE.HemisphereLight(0xffffff,0x73756c,2.6));
  const key=new THREE.DirectionalLight(0xfff7e8,4.8);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.025;key.shadow.bias=-.0002;scene.add(key);
  const rim=new THREE.DirectionalLight(0xd6e5f4,2.3);rim.position.set(3,5,-4);scene.add(rim);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xedf0f3,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const grid=new THREE.GridHelper(18,36,0xc8d0d7,0xdce1e6);grid.position.y=.004;(grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.45;scene.add(grid);
  const ring=new THREE.Mesh(new THREE.RingGeometry(2.45,2.455,128),new THREE.MeshBasicMaterial({color:0xb9c4ce,side:THREE.DoubleSide,transparent:true,opacity:.55}));ring.rotation.x=-Math.PI/2;ring.position.y=.008;scene.add(ring);
  const horse=new THREE.Group();scene.add(horse);
  const coat=new THREE.MeshStandardMaterial({color:0x784025,roughness:.43,metalness:.04});
  const darkCoat=new THREE.MeshStandardMaterial({color:0x4c281b,roughness:.5});
  const hair=new THREE.MeshStandardMaterial({color:0x211b16,roughness:.79});
  const hoof=new THREE.MeshStandardMaterial({color:0x292823,roughness:.48});
  const leather=new THREE.MeshStandardMaterial({color:0x302a23,roughness:.67});
  const red=new THREE.MeshStandardMaterial({color:0x8c3034,roughness:.89,side:THREE.DoubleSide});
  const gold=new THREE.MeshStandardMaterial({color:0xcfb780,metalness:.75,roughness:.25});
  const white=new THREE.MeshStandardMaterial({color:0xf2eee3,roughness:.8});
  function ell(parent:THREE.Object3D,mat:THREE.Material,pos:number[],scale:number[],rot=0) {
    const m=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),mat);m.position.fromArray(pos);m.scale.fromArray(scale);m.rotation.z=rot;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function bone(parent:THREE.Object3D,a:number[],b:number[],r1:number,r2:number,mat:THREE.Material) {
    const av=new THREE.Vector3().fromArray(a),bv=new THREE.Vector3().fromArray(b);const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,av.distanceTo(bv),16),mat);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());m.castShadow=true;parent.add(m);return m;
  }
  function line(parent:THREE.Object3D,points:number[][],radius:number,mat:THREE.Material) {
    const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3().fromArray(p)));const m=new THREE.Mesh(new THREE.TubeGeometry(path,40,radius,8,false),mat);m.castShadow=true;parent.add(m);return m;
  }
  function loft(parent:THREE.Object3D,rings:Ring[],mat:THREE.Material) {
    const path=new THREE.CatmullRomCurve3(rings.map(r=>new THREE.Vector3(r[0],r[1],0)));
    const shape=new THREE.CatmullRomCurve3(rings.map(r=>new THREE.Vector3(r[2],r[3],0)));
    const v:number[]=[],ind:number[]=[];const count=48,sides=40;
    for(let i=0;i<=count;i++){const t=i/count,p=path.getPoint(t),tangent=path.getTangent(t),s=shape.getPoint(t);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;v.push(p.x-tangent.y*Math.cos(a)*s.x,p.y+tangent.x*Math.cos(a)*s.x,Math.sin(a)*s.y);}}
    for(let i=0;i<count;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;ind.push(a,a+1,b,b,a+1,b+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ind);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  loft(horse,[[-1.13,1.96,.02,.02],[-.89,1.96,.43,.35],[-.52,1.96,.5,.4],[.1,1.92,.5,.43],[.64,1.96,.47,.39],[1.05,1.99,.36,.33],[1.27,1.99,.02,.02]],coat);
  ell(horse,coat,[-.78,1.95,0],[.38,.52,.37],-.1);
  ell(horse,coat,[.86,1.97,0],[.4,.47,.38],.12);
  const neck=new THREE.Group();neck.position.set(-.79,2.06,0);horse.add(neck);
  loft(neck,[[.16,-.18,.22,.24],[-.04,.05,.39,.29],[-.24,.43,.3,.23],[-.4,.75,.21,.17],[-.49,.94,.17,.15],[-.56,1.02,.08,.1]],coat);
  const head=new THREE.Group();head.position.set(-.5,.93,0);neck.add(head);
  loft(head,[[.09,.06,.04,.06],[-.05,.07,.24,.18],[-.3,-.03,.19,.145],[-.56,-.21,.12,.125],[-.75,-.28,.13,.14],[-.83,-.28,.02,.06]],coat);
  ell(head,coat,[-.1,-.05,0],[.2,.22,.2]);
  ell(head,darkCoat,[-.73,-.28,0],[.145,.12,.143],-.15);
  for(const side of [-1,1]){
    ell(head,hair,[-.7,-.235,.133*side],[.047,.022,.009],.5);
    ell(head,darkCoat,[-.22,.105,.153*side],[.075,.05,.024],-.25);
    ell(head,new THREE.MeshStandardMaterial({color:0x110f0b,roughness:.12}),[-.225,.11,.174*side],[.036,.028,.012]);
    ell(head,white,[-.234,.12,.184*side],[.008,.006,.005]);
    const ear=ell(head,coat,[.012,.315,.117*side],[.07,.2,.055],-.25);ear.rotation.x=side*.18;
    ell(head,darkCoat,[-.042,.345,.12*side],[.014,.112,.029],-.25);
    line(head,[[-.8,-.33,side*.095],[-.68,-.365,side*.124],[-.58,-.33,side*.115]],.007,hair);
  }
  // Small forehead marking follows the face rather than floating above it.
  ell(head,white,[-.315,.084,0],[.125,.012,.044],.57);
  for(let i=0;i<24;i++){
    const t=i/23;const x=.08-.55*t,y=.13+.85*t;
    line(neck,[[x+.16,y,0],[x+.13,y+.035,-.045],[x+.23,y-.13,-.08],[x+.27,y-.25,-.06]],.025,hair);
  }
  for(let i=0;i<7;i++)line(head,[[.04,.19,(i-3)*.016],[-.1,.26,(i-3)*.02],[-.26,.16,(i-3)*.025]],.015,hair);
  const tail=new THREE.Group();tail.position.set(1.13,2.17,0);horse.add(tail);
  for(let i=0;i<18;i++){const angle=i/18*Math.PI*2;line(tail,[[0,0,0],[.24,-.17,Math.sin(angle)*.045],[.39,-.53,Math.sin(angle)*.08],[.48+Math.cos(angle)*.065,-1.08,Math.sin(angle)*.105],[.35+Math.cos(angle)*.05,-1.4,Math.sin(angle)*.06]],.022,hair);}
  const legs:{upper:THREE.Group,lower:THREE.Group,foot:THREE.Group,back:boolean,side:number}[]=[];
  for(const back of [false,true])for(const side of [-1,1]){
    const upper=new THREE.Group();upper.position.set(back?.87:-.79,back?1.95:1.91,side*.265);horse.add(upper);
    ell(upper,coat,[back?-.06:0,-.24,0],back?[.24,.44,.19]:[.19,.4,.17],back?-.25:.05);
    const kneeX=back?-.2:.01;
    bone(upper,[0,-.22,0],[kneeX,-.85,0],back?.155:.125,.07,coat);
    ell(upper,coat,[kneeX,-.84,0],[.082,.105,.08]);
    const lower=new THREE.Group();lower.position.set(kneeX,-.84,0);upper.add(lower);
    const ankleX=back?.17:0;
    bone(lower,[0,0,0],[ankleX,-.66,0],.067,.046,darkCoat);
    ell(lower,darkCoat,[ankleX,-.66,0],[.072,.082,.068]);
    const foot=new THREE.Group();foot.position.set(ankleX,-.66,0);lower.add(foot);
    bone(foot,[0,0,0],[-.04,-.17,0],.055,.069,back&&side===1?white:darkCoat);
    ell(foot,hoof,[-.061,-.226,.005],[.112,.092,.089]);
    legs.push({upper,lower,foot,back,side});
  }
  const saddle=new THREE.Group();horse.add(saddle);
  // A curved, draped saddle cloth, cut to follow both sides of the barrel.
  const clothVerts:number[]=[],clothIdx:number[]=[];
  for(let i=0;i<=18;i++){const x=-.36+i/18*.97;for(let j=0;j<=32;j++){const a=-1.52+j/32*3.04;clothVerts.push(x,1.99+Math.cos(a)*.493,Math.sin(a)*.465);}}
  for(let i=0;i<18;i++)for(let j=0;j<32;j++){const a=i*33+j;clothIdx.push(a,a+1,a+33,a+1,a+34,a+33);}
  const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(clothVerts,3));cg.setIndex(clothIdx);cg.computeVertexNormals();const cloth=new THREE.Mesh(cg,red);cloth.castShadow=true;saddle.add(cloth);
  for(const x of [-.36,.61])line(saddle,Array.from({length:25},(_,i)=>{const a=-1.52+i/24*3.04;return [x,1.99+Math.cos(a)*.498,Math.sin(a)*.47]}),.012,gold);
  for(const side of [-1,1]){
    line(saddle,[[-.36,2.016,side*.47],[.1,2.016,side*.47],[.61,2.016,side*.47]],.012,gold);
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f4eedc';ctx.font='bold 180px Georgia';ctx.textAlign='center';ctx.fillText('07',128,189);
    const number=new THREE.Mesh(new THREE.PlaneGeometry(.36,.27),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,side:THREE.DoubleSide}));number.position.set(.26,2.2,side*.448);number.rotation.y=side===1?0:Math.PI;saddle.add(number);
  }
  ell(saddle,leather,[-.07,2.465,0],[.37,.075,.25]);
  ell(saddle,leather,[.27,2.49,0],[.085,.12,.235],-.15);
  ell(saddle,leather,[-.36,2.47,0],[.08,.11,.19]);
  for(const side of [-1,1]){
    ell(saddle,leather,[-.14,2.26,side*.39],[.21,.24,.045],-.2);
    line(saddle,[[-.25,2.46,side*.2],[-.3,2.13,side*.46],[-.28,1.96,side*.5]],.019,leather);
    line(saddle,[[-.28,1.99,side*.5],[-.37,1.86,side*.5],[-.18,1.86,side*.5],[-.28,1.99,side*.5]],.013,gold);
  }
  const headgear=new THREE.Group();head.add(headgear);
  for(const side of [-1,1]){
    line(headgear,[[.07,.19,0],[.04,.15,side*.19],[-.2,-.03,side*.2],[-.66,-.25,side*.15]],.016,leather);
    line(headgear,[[-.18,.17,side*.14],[-.25,.13,0],[-.18,.17,-side*.14]],.016,leather);
    const bit=new THREE.Mesh(new THREE.TorusGeometry(.041,.009,8,24),gold);bit.position.set(-.62,-.31,side*.148);headgear.add(bit);
  }
  line(headgear,[[-.65,-.17,.15],[-.68,-.16,0],[-.65,-.17,-.15],[-.6,-.36,-.14],[-.59,-.4,0],[-.6,-.36,.14],[-.65,-.17,.15]],.018,leather);
  const harness=new THREE.Group();horse.add(harness);
  for(const side of [-1,1])line(harness,[[-.16,2.44,side*.23],[-.83,2.1,side*.4],[-1.06,1.77,0],[-.67,1.75,-side*.36],[-.16,2.44,-side*.23]],.026,leather);
  line(harness,[[-.27,2.46,0],[-.28,2.1,.44],[-.28,1.61,.32],[-.28,1.47,0],[-.28,1.61,-.32],[-.28,2.1,-.44],[-.27,2.46,0]],.039,leather);
  const jockey=new THREE.Group();jockey.position.set(0,2.47,0);horse.add(jockey);
  const silk=new THREE.MeshStandardMaterial({color:0x314d40,roughness:.72});const skin=new THREE.MeshStandardMaterial({color:0xcf9975,roughness:.75});
  ell(jockey,white,[.09,.17,0],[.2,.17,.18]);
  ell(jockey,silk,[-.15,.42,0],[.19,.37,.2],-.9);
  ell(jockey,skin,[-.48,.72,0],[.105,.14,.105],-.3);
  ell(jockey,silk,[-.47,.8,0],[.132,.105,.127]);
  ell(jockey,leather,[-.57,.77,0],[.12,.015,.12]);
  for(const side of [-1,1]){
    bone(jockey,[.11,.2,side*.12],[-.32,-.02,side*.36],.12,.075,white);ell(jockey,white,[-.32,-.02,side*.36],[.09,.095,.075]);
    bone(jockey,[-.32,-.02,side*.36],[-.12,-.46,side*.49],.074,.052,leather);ell(jockey,leather,[-.2,-.46,side*.49],[.13,.054,.065]);
    bone(jockey,[-.32,.57,side*.17],[-.43,.24,side*.23],.074,.05,silk);
    bone(jockey,[-.43,.24,side*.23],[-.78,.2,side*.15],.05,.039,silk);ell(jockey,skin,[-.8,.2,side*.15],[.063,.047,.043]);
  }
  const reins=new THREE.Group();horse.add(reins);
  const reinGeo=[-1,1].map(side=>{const mesh=line(reins,[[-2,2.7,side*.15],[-1.4,2.45,side*.27],[-.8,2.67,side*.15]],.012,leather);return {mesh,side};});
  const clock=new THREE.Clock();let phase=0,lastPhase=-1,raf=0,notify=0;
  function frame(){raf=requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05),s=getSettings();
    if(s.phase!==lastPhase){phase=s.phase;lastPhase=s.phase;}
    if(s.playing)phase=(phase+dt*s.speed*(s.gait==='run'?.8:s.gait==='walk'?.42:.16))%1;
    const t=phase*Math.PI*2,moving=s.gait!=='idle',run=s.gait==='run';
    horse.position.y=moving?(run?.07+.065*Math.sin(t*2):.012*Math.sin(t*2)):0;
    horse.rotation.z=s.pose==='Rearing'&& !moving?-.38:0;
    horse.position.y+=s.pose==='Rearing'&&!moving?.26:0;
    neck.rotation.z=(s.pose==='Grazing'&&!moving?.9:s.pose==='Alert'&&!moving?-.16:0)+s.head*Math.PI/180+(moving?.045*Math.sin(t):.016*Math.sin(t));
    head.rotation.z=moving?.035*Math.sin(t+.7):.018*Math.sin(t*.7);
    horse.scale.y=1+(!moving?.0025*Math.sin(t):0);
    tail.rotation.x=.08*Math.sin(t);tail.rotation.z=run?.25+.08*Math.sin(t):.04*Math.sin(t);
    for(const leg of legs){const offset=run?(leg.back?2.9:0)+(leg.side===1?.5:0):(leg.back?Math.PI/2:0)+(leg.side===1?Math.PI:0);const q=t+offset;
      leg.upper.rotation.z=moving?(run?.72:.36)*Math.sin(q):0;
      leg.lower.rotation.z=moving?(leg.back?-1:1)*Math.max(0,Math.cos(q))*(run?1.05:.58):0;
      leg.foot.rotation.z=moving?-.2*Math.sin(q):0;
      if(!moving&&s.pose==='Rearing'&&!leg.back){leg.upper.rotation.z=1.0;leg.lower.rotation.z=1.15;}
    }
    saddle.visible=s.saddle;headgear.visible=s.headgear;harness.visible=s.harness;jockey.visible=s.jockey;reins.visible=s.headgear;
    jockey.rotation.z=run?-.08+.045*Math.sin(t):.018*Math.sin(t);
    horse.updateMatrixWorld(true);
    for(const {mesh,side} of reinGeo){const bit=head.localToWorld(new THREE.Vector3(-.62,-.31,side*.15));horse.worldToLocal(bit);const end=new THREE.Vector3(s.jockey?-.8:-.23,s.jockey?2.68:2.45,side*.19);const middle=bit.clone().lerp(end,.5);middle.y-=.17;middle.z+=side*.06;const path=new THREE.CatmullRomCurve3([bit,middle,end]);mesh.geometry.dispose();mesh.geometry=new THREE.TubeGeometry(path,20,.01,5,false);}
    controls.autoRotate=s.rotate;controls.update();const aboveFloor=camera.position.y>.06;ground.visible=aboveFloor;grid.visible=s.grid&&aboveFloor;ring.visible=s.grid&&aboveFloor;renderer.render(scene,camera);
    notify+=dt;if(notify>.08){onPhase(phase);notify=0;}
  }
  function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();frame();
  return {view,zoom:(direction:number)=>{camera.position.sub(controls.target).multiplyScalar(direction>0?.86:1.16).clampLength(4.8,13).add(controls.target);controls.update();},export:()=>new Promise<Blob>((resolve,reject)=>{renderer.render(scene,camera);renderer.domElement.toBlob(b=>b?resolve(b):reject(new Error('Image could not be created.')),'image/png');}),destroy:()=>{cancelAnimationFrame(raf);observer.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)v.dispose();});m.dispose();});}});renderer.dispose();renderer.domElement.remove();}};
}
