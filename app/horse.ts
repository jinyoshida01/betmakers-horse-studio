import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
export type Settings={gait:'idle'|'run';playing:boolean;speed:number;phase:number;rotate:boolean;grid:boolean;darkMode:boolean};
export const defaults:Settings={gait:'idle',playing:true,speed:1,phase:0,rotate:false,grid:true,darkMode:true};
export function mountHorse(host:HTMLElement,getSettings:()=>Settings,onPhase:(phase:number)=>void){
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(36,1,.05,60);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Chestnut horse from Blender. Drag to rotate, including underneath. Scroll or pinch to zoom.');
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.6,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=4.6;controls.maxDistance=13;controls.maxPolarAngle=Math.PI;controls.autoRotateSpeed=.65;
 function view(name:string){const positions:Record<string,number[]>={Perspective:[-4.7,3.1,7],Side:[0,2.6,8.4],Front:[-8.4,2.7,0],Rear:[8.4,2.7,0],Underneath:[-2.5,-4.5,5.5]};camera.position.fromArray(positions[name]||positions.Perspective);controls.target.set(0,1.6,0);controls.update();}view('Perspective');
 scene.add(new THREE.HemisphereLight(0xffffff,0x525a64,1.9));
 const key=new THREE.DirectionalLight(0xfff7eb,3.2);key.position.set(-3,7,5);key.target.position.set(0,1.6,0);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5});key.shadow.normalBias=.025;scene.add(key,key.target);
 const rim=new THREE.DirectionalLight(0xdbe8ff,1.7);rim.position.set(3,5,-4);scene.add(rim);
 const floorLight=new THREE.MeshStandardMaterial({color:0xedf0f3,roughness:1});const floorDark=new THREE.MeshBasicMaterial({color:0x090d12});const floor=new THREE.Mesh<THREE.PlaneGeometry,THREE.Material>(new THREE.PlaneGeometry(200,200),floorDark);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.35}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.002;shadow.receiveShadow=true;scene.add(shadow);
 const grid=new THREE.GridHelper(18,36,0xc8d0d7,0xdce1e6);grid.position.y=.004;const gridMat=grid.material as THREE.Material;gridMat.transparent=true;scene.add(grid);
 const root=new THREE.Group();scene.add(root);let mixer:THREE.AnimationMixer|undefined,actions:Record<string,THREE.AnimationAction>={},active:THREE.AnimationAction|undefined,lastGait='',lastPhase=-1,phase=0,lastTime=performance.now(),notify=0,raf=0,disposed=false,lastDark:boolean|undefined;
 function disposeModel(object:THREE.Object3D){object.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const value of Object.values(m))if(value instanceof THREE.Texture)value.dispose();m.dispose();}}});}
 const ready=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/models/chestnut-horse.glb').then(gltf=>{
  if(disposed){disposeModel(gltf.scene);throw new Error('Viewer closed');}
  const model=gltf.scene;model.rotation.y=-Math.PI/2;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model,true),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const scale=3.2/size.y;root.scale.setScalar(scale);root.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);root.add(model);
  model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
  mixer=new THREE.AnimationMixer(model);const idle=gltf.animations.find(c=>c.name==='Idle'),run=gltf.animations.find(c=>c.name==='Running');if(!idle||!run)throw new Error('The model must include Idle and Running animations.');actions={idle:mixer.clipAction(idle),run:mixer.clipAction(run)};
  for(const a of Object.values(actions)){a.setLoop(THREE.LoopRepeat,Infinity);a.play();a.enabled=false;}
 });
 function frame(time:number){if(disposed)return;raf=requestAnimationFrame(frame);const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;const s=getSettings();
  if(s.darkMode!==lastDark){lastDark=s.darkMode;scene.background=new THREE.Color(s.darkMode?0x0b1016:0xedf0f3);scene.fog=new THREE.Fog(scene.background,15,35);floor.material=s.darkMode?floorDark:floorLight;gridMat.opacity=s.darkMode?.06:.45;}
  if(mixer&&actions[s.gait]){if(lastGait!==s.gait){if(active)active.enabled=false;active=actions[s.gait];active.enabled=true;lastGait=s.gait;phase=s.phase;lastPhase=s.phase;}
   if(lastPhase!==s.phase){phase=s.phase;lastPhase=s.phase;}
   const duration=active!.getClip().duration;if(s.playing)phase=(phase+dt*s.speed/duration)%1;active!.time=phase*duration;mixer.update(0);
  }
  controls.autoRotate=s.rotate;controls.update();const above=camera.position.y>.06;floor.visible=above;shadow.visible=above&&s.darkMode;grid.visible=above&&s.grid;renderer.render(scene,camera);notify+=dt;if(notify>.08){notify=0;onPhase(phase);}
 }
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};const observer=new ResizeObserver(resize);observer.observe(host);resize();raf=requestAnimationFrame(frame);
 return {ready,view,zoom:(direction:number)=>{camera.position.sub(controls.target).multiplyScalar(direction>0?.86:1.16).clampLength(4.6,13).add(controls.target);controls.update();},export:()=>new Promise<Blob>((resolve,reject)=>{renderer.render(scene,camera);renderer.domElement.toBlob(b=>b?resolve(b):reject(new Error('Could not export image')),'image/png');}),destroy:()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();mixer?.stopAllAction();disposeModel(scene);floorLight.dispose();floorDark.dispose();grid.geometry.dispose();gridMat.dispose();renderer.dispose();renderer.domElement.remove();}};
}
