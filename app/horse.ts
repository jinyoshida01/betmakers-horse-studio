import { assetPath } from './asset-path';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createPoseModel, type RigData, type PoseModel } from './pose-model';
import { attachPoseControls } from './pose-controls';
import { referenceMaterials } from './reference-materials';
import type { Settings, Coat } from './studio-settings';
export { defaults, type Settings } from './studio-settings';

export function mountHorse(host:HTMLElement,getSettings:()=>Settings,onPhase:(phase:number)=>void,onJoint:(name:string)=>void=()=>{}){
 const scene=new THREE.Scene(), pivot=new THREE.Vector3(0,1.6,0);
 const camera=new THREE.PerspectiveCamera(36,1,.05,100);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Horse model. Drag to rotate around its center, including underneath. Scroll or pinch to zoom.');
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(pivot);controls.enableDamping=true;controls.enablePan=false;
 controls.minDistance=2;controls.maxDistance=24;controls.maxPolarAngle=Math.PI;controls.autoRotateSpeed=.65;
 function view(name:string){
  const positions:Record<string,number[]>={Perspective:[-4.7,1.5,7],Side:[0,1,8.4],Front:[-8.4,1.1,0],Rear:[8.4,1.1,0],Underneath:[-2.5,-6.1,5.5]};
  controls.target.copy(pivot);camera.position.fromArray(positions[name]||positions.Perspective).add(pivot);controls.update();
 }
 view('Perspective');
 const ambient=new THREE.HemisphereLight(0xffffff,0x929ba6,2);scene.add(ambient);
 const lightObjects=new Map<string,{light:THREE.DirectionalLight;helper:THREE.DirectionalLightHelper}>();
 let previousLights:Settings['lights']|undefined;
 function updateLights(s:Settings){
  ambient.intensity=s.ambient;renderer.toneMappingExposure=s.exposure;
  if(previousLights!==s.lights){
   previousLights=s.lights;const ids=new Set(s.lights.map(l=>l.id));
   for(const [id,{light,helper}] of lightObjects)if(!ids.has(id)){scene.remove(light,light.target,helper);light.dispose();helper.dispose();lightObjects.delete(id);}
   for(const config of s.lights){
    let entry=lightObjects.get(config.id);
    if(!entry){const light=new THREE.DirectionalLight();light.target.position.copy(pivot);light.castShadow=config.id==='key';light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-6,right:6,top:6,bottom:-6});light.shadow.normalBias=.035;
     const helper=new THREE.DirectionalLightHelper(light,.35);entry={light,helper};lightObjects.set(config.id,entry);scene.add(light,light.target,helper);}
    entry.light.position.set(config.x,config.y,config.z);entry.light.intensity=config.intensity;entry.light.color.set(config.color);entry.light.visible=config.enabled;entry.light.target.position.copy(pivot);entry.light.updateMatrixWorld();entry.helper.update();
   }
  }
  for(const {light,helper} of lightObjects.values())helper.visible=s.lightHelpers&&light.visible;
 }
 const floorLight=new THREE.MeshStandardMaterial({color:0xedf0f3,roughness:1});const floorDark=new THREE.MeshBasicMaterial({color:0x090d12});
 const floor=new THREE.Mesh<THREE.PlaneGeometry,THREE.Material>(new THREE.PlaneGeometry(200,200),floorDark);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.28}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.002;shadow.receiveShadow=true;scene.add(shadow);
 const grid=new THREE.GridHelper(18,36,0xc8d0d7,0xdce1e6);grid.position.y=.004;const gridMat=grid.material as THREE.Material;gridMat.transparent=true;scene.add(grid);
 // The root origin and orbit target are the center of the evaluated idle pose.
 const root=new THREE.Group(),normalized=new THREE.Group();root.add(normalized);scene.add(root);
 let modelObject:THREE.Object3D|undefined,rigData:RigData|undefined,pose:PoseModel|undefined,poseControls:ReturnType<typeof attachPoseControls>|undefined;
 const modelMeshes:THREE.Mesh[]=[];const references=referenceMaterials();let lastReference='';
 const rigReady=fetch(assetPath('/models/horse-rig.json')).then(r=>{if(!r.ok)throw new Error('Rig could not load');return r.json() as Promise<RigData>;}).then(data=>{rigData=data;});
 const clipCenters:Record<string,{offset:THREE.Vector3;height:number}>={};
 let mixer:THREE.AnimationMixer|undefined,actions:Record<string,THREE.AnimationAction>={},active:THREE.AnimationAction|undefined,lastGait='',lastPhase=-1,phase=0,lastTime=performance.now(),notify=0,raf=0,disposed=false,lastDark:boolean|undefined,lastFov=0,lastCoat:Coat|undefined;
 const clothMaterials:THREE.MeshStandardMaterial[]=[];
 const clothOriginals=new Map<THREE.MeshStandardMaterial,THREE.Texture|null>();
 const coatMaterials=new Map<THREE.MeshStandardMaterial,THREE.Texture>();
 const coatMaps=new Map<string,THREE.Texture>();let customCloth:THREE.Texture|undefined;
 const weaveData=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,v=128+Math.round(35*Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2));weaveData[i]=weaveData[i+1]=weaveData[i+2]=v;weaveData[i+3]=255;}
 const weave=new THREE.DataTexture(weaveData,64,64);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(28,14);weave.magFilter=THREE.LinearFilter;weave.needsUpdate=true;
 function disposeModel(object:THREE.Object3D){object.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const value of Object.values(m))if(value instanceof THREE.Texture)value.dispose();m.dispose();}}});}
 const coatFiles:Partial<Record<Coat,string>>={Black:'black',Grey:'grey',Palomino:'cream',Pinto:'pinto','Grey Pinto':'grey-pinto','Rose Grey':'rose-grey',Cremello:'cream',White:'white'};
 const coatImages=new Map<string,ImageBitmap>();
 const coatsReady=Promise.all([...new Set(Object.values(coatFiles))].map(async file=>{const img=await new THREE.ImageBitmapLoader().loadAsync(assetPath(`/models/coats/${file}.webp`));if(disposed)img.close();else coatImages.set(file!,img);}));
 function applyCoat(coat:Coat){
  for(const [material,original] of coatMaterials){
   if(coat==='Chestnut'){material.map=original;material.needsUpdate=true;continue;}
   const key=original.uuid+coat;let texture=coatMaps.get(key);
   if(!texture){
    const fur=material.name.includes('Fur'),authored=!fur&&coatFiles[coat]?coatImages.get(coatFiles[coat]!):undefined;
    if(!fur&&coatFiles[coat]&&!authored)return;
    const source=(authored||original.image) as CanvasImageSource & {width:number;height:number};
    const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(source,0,0);
    if(fur||coat==='Palomino'||coat==='Bay'){
     const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
     for(let i=0;i<data.length;i+=4){
      const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,lum=.2126*r+.7152*g+.0722*b;
      if(fur){
       const pale=['Palomino','Cremello','White'].includes(coat),grey=['Grey','Grey Pinto','Rose Grey'].includes(coat);
       const value=pale?.70+.27*Math.sqrt(lum):grey?.16+.55*Math.sqrt(lum):.045+.24*Math.sqrt(lum);
       const tint=pale?[1,.96,.86]:grey?[.91,.94,1]:[.85,.82,.80];data[i]=255*value*tint[0];data[i+1]=255*value*tint[1];data[i+2]=255*value*tint[2];
      }else if(coat==='Palomino'){
       // Use the authored cream coat, retaining eye/mouth details and dark muzzle.
       if(lum>.14&&Math.max(r,g,b)-Math.min(r,g,b)<.25){data[i]=Math.min(255,data[i]*1.04);data[i+1]*=.84;data[i+2]*=.52;}
      }else if(coat==='Bay'){
       if(lum>.65&&Math.max(r,g,b)-Math.min(r,g,b)<.13)continue;
       const value=Math.min(1,Math.pow(lum,.65)*1.4);data[i]=255*value*.69;data[i+1]=255*value*.39;data[i+2]=255*value*.20;
      }
     }ctx.putImageData(pixels,0,0);
    }
    texture=original.clone();texture.source=new THREE.Source(canvas);texture.needsUpdate=true;coatMaps.set(key,texture);
   }
   material.map=texture;material.needsUpdate=true;
  }
 }
 const ready=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(assetPath('/models/chestnut-horse.glb')).then(gltf=>{
  if(disposed){disposeModel(gltf.scene);throw new Error('Viewer closed');}
  const model=gltf.scene;modelObject=model;model.rotation.y=-Math.PI/2;
  mixer=new THREE.AnimationMixer(model);const idle=gltf.animations.find(c=>c.name==='Idle'),run=gltf.animations.find(c=>c.name==='Running');if(!idle||!run)throw new Error('The model must include Idle and Running animations.');
  actions={idle:mixer.clipAction(idle),run:mixer.clipAction(run)};for(const a of Object.values(actions)){a.setLoop(THREE.LoopRepeat,Infinity);a.play();a.enabled=false;}
  actions.idle.enabled=true;actions.idle.time=0;mixer.update(0);model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model,true),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=3.2/size.y;
  normalized.add(model);normalized.scale.setScalar(scale);normalized.position.copy(center).multiplyScalar(-scale);
  for(const [gait,action] of Object.entries(actions)){
   for(const a of Object.values(actions))a.enabled=false;action.enabled=true;action.time=0;mixer.update(0);root.updateMatrixWorld(true);
   // Local model bounds exclude the studio scale and translation.
   const localBounds=new THREE.Box3().makeEmpty(),vertex=new THREE.Vector3();
   model.traverse(o=>{if(o instanceof THREE.Mesh){const matrix=new THREE.Matrix4().copy(normalized.matrixWorld).invert().multiply(o.matrixWorld);for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,vertex);localBounds.expandByPoint(vertex.applyMatrix4(matrix));}}});
   clipCenters[gait]={offset:localBounds.getCenter(new THREE.Vector3()).multiplyScalar(-scale),height:localBounds.getSize(new THREE.Vector3()).y*scale/2};
  }
  actions.run.enabled=false;actions.idle.enabled=true;actions.idle.time=0;mixer.update(0);
  pivot.set(0,size.y*scale/2,0);root.position.copy(pivot);root.add(normalized);controls.target.copy(pivot);previousLights=undefined;
  model.traverse(o=>{if(o instanceof THREE.Mesh){modelMeshes.push(o);o.castShadow=true;o.receiveShadow=true;
   for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){
    if((m.name.startsWith('Horse_Chestnut')||m.name.startsWith('Fur_Chestnut'))&&m.map)coatMaterials.set(m,m.map);
    if(m.name.startsWith('Saddlecloth')){
     m.roughness=1;m.roughnessMap=null;m.metalness=0;m.metalnessMap=null;m.envMapIntensity=.2;m.bumpMap=weave;m.bumpScale=.0015;
     if(m instanceof THREE.MeshPhysicalMaterial){m.clearcoat=0;m.specularIntensity=.15;m.sheen=.1;m.sheenRoughness=1;}
     if(m.name.includes('Bound Edge'))m.color.set(0x080808);
     if(m.name.includes('Swappable')){clothMaterials.push(m);clothOriginals.set(m,m.map);}
     m.needsUpdate=true;
    }
   }
  }});lastCoat=undefined;
 });
 function resetCloth(){for(const [m,map] of clothOriginals){m.map=map;m.needsUpdate=true;}customCloth?.dispose();customCloth=undefined;}
 async function uploadCloth(file:File){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPG or WebP image.');
  if(file.size>20*1024*1024)throw new Error('Choose an image smaller than 20 MB.');
  await ready;const bitmap=await createImageBitmap(file,{imageOrientation:'none'});
  if(disposed){bitmap.close();throw new Error('Viewer closed');}
  const canvas=document.createElement('canvas'),factor=Math.min(1,4096/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*factor));canvas.height=Math.max(1,Math.round(bitmap.height*factor));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const texture=new THREE.CanvasTexture(canvas);texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  // Match glTF UV orientation; uploaded artwork stays upright.
  resetCloth();customCloth=texture;for(const m of clothMaterials){m.map=texture;m.needsUpdate=true;}
 }
 function exitPose(){references.restore();poseControls?.dispose();poseControls=undefined;pose?.dispose();pose=undefined;lastReference='';onJoint('');}
 function frame(time:number){if(disposed)return;raf=requestAnimationFrame(frame);const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;const s=getSettings();
  if(s.darkMode!==lastDark){lastDark=s.darkMode;scene.background=new THREE.Color(s.darkMode?0x0b1016:0xedf0f3);scene.fog=new THREE.Fog(scene.background,15,35);floor.material=s.darkMode?floorDark:floorLight;gridMat.opacity=s.darkMode?.06:.45;}
  if(lastFov!==s.fov){camera.fov=s.fov;camera.updateProjectionMatrix();lastFov=s.fov;}updateLights(s);
  if(coatMaterials.size&&lastCoat!==s.coat&&(!coatFiles[s.coat]||coatImages.has(coatFiles[s.coat]!))){applyCoat(s.coat);lastCoat=s.coat;}
  if(pose&&!s.poseMode)exitPose();
  if(mixer&&actions[s.gait]&&!pose){if(lastGait!==s.gait){const framing=clipCenters[s.gait];if(framing){const oldPivot=pivot.clone();normalized.position.copy(framing.offset);pivot.set(0,framing.height,0);root.position.copy(pivot);camera.position.add(pivot.clone().sub(oldPivot));controls.target.copy(pivot);previousLights=undefined;}for(const action of Object.values(actions))action.enabled=false;active=actions[s.gait];active.enabled=true;lastGait=s.gait;phase=s.phase;lastPhase=s.phase;}
   if(lastPhase!==s.phase){phase=s.phase;lastPhase=s.phase;}const duration=active!.getClip().duration;if(s.playing&&s.motionEnabled&&!s.poseMode)phase=(phase+dt*s.speed/duration)%1;active!.time=phase*duration;mixer.update(0);
  }
  if(s.poseMode&&!pose&&rigData&&modelObject&&active){references.restore();pose=createPoseModel(modelObject,rigData,s.gait,phase*active.getClip().duration);poseControls=attachPoseControls(pose,scene,camera,renderer.domElement,controls,onJoint);lastReference='';}
  if(poseControls){poseControls.transform.setMode(s.poseTool);poseControls.transform.setSpace(s.poseSpace);poseControls.transform.setTranslationSnap(s.poseSnap?(s.poseSpace==='local'?.05/(poseControls.transform.object?.parent?.getWorldScale(new THREE.Vector3()).x||1):.05):null);poseControls.transform.setRotationSnap(s.poseSnap?THREE.MathUtils.degToRad(15):null);poseControls.update(s.showJoints);}
  if(lastReference!==s.reference){references.apply([...modelMeshes,...(pose?.skins||[])],s.reference);lastReference=s.reference;}
  const distance=camera.position.distanceTo(controls.target);references.range.value.set(Math.max(.05,distance-3.5),distance+3.5);
  scene.background=new THREE.Color(s.reference==='depth'?0x000000:s.darkMode?0x0b1016:0xedf0f3);
  controls.autoRotate=s.rotate&&!s.poseMode;controls.update();const above=camera.position.y>.06&&s.reference!=='depth';floor.visible=above;shadow.visible=above&&s.darkMode;grid.visible=above&&s.grid;renderer.render(scene,camera);notify+=dt;if(notify>.08){notify=0;onPhase(phase);}
 }
 const resize=()=>{const w=host.clientWidth,h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};const observer=new ResizeObserver(resize);observer.observe(host);resize();raf=requestAnimationFrame(frame);
 return {ready:Promise.all([ready,rigReady,coatsReady]).then(()=>{}),view,selectJoint:(name:string)=>poseControls?.select(name),resetJoint:()=>poseControls?.resetJoint(),resetPose:()=>poseControls?.reset(),undoPose:()=>poseControls?.undo(),uploadCloth,resetCloth,zoom:(direction:number)=>{camera.position.sub(controls.target).multiplyScalar(direction>0?.86:1.16).clampLength(2,24).add(controls.target);controls.update();},export:()=>new Promise<Blob>((resolve,reject)=>{const helpers=[...lightObjects.values()].map(e=>e.helper),visible=helpers.map(h=>h.visible);helpers.forEach(h=>h.visible=false);poseControls?.hide();renderer.render(scene,camera);renderer.domElement.toBlob(b=>b?resolve(b):reject(new Error('Could not export image')),'image/png');helpers.forEach((h,i)=>h.visible=visible[i]);}),destroy:()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();exitPose();references.dispose();controls.dispose();mixer?.stopAllAction();for(const {light,helper} of lightObjects.values()){helper.dispose();light.dispose();}disposeModel(scene);for(const img of coatImages.values())img.close();for(const t of coatMaps.values())t.dispose();for(const t of coatMaterials.values())t.dispose();for(const t of clothOriginals.values())t?.dispose();customCloth?.dispose();weave.dispose();floorLight.dispose();floorDark.dispose();grid.geometry.dispose();gridMat.dispose();renderer.dispose();renderer.domElement.remove();}};
}
