import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { PoseModel } from './pose-model';
export function attachPoseControls(pose:PoseModel,scene:THREE.Scene,camera:THREE.Camera,canvas:HTMLCanvasElement,orbit:OrbitControls,onSelect:(name:string)=>void){
 const transform=new TransformControls(camera,canvas);transform.setMode('rotate');transform.setSpace('local');transform.setSize(.75);const gizmo=transform.getHelper();scene.add(gizmo);
 const eligible=pose.bones.filter(b=>!/Hair|Reins|Stirrup|Eye|Lip|Nose|Head_0|Ear_01/.test(b.name));
 const geometry=new THREE.SphereGeometry(.05,10,8),normal=new THREE.MeshBasicMaterial({color:0xff76ba,depthTest:false,depthWrite:false}),selectedMat=new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false,depthWrite:false});
 const markerScale=new THREE.Vector3();
 const markers=eligible.map(b=>{const m=new THREE.Mesh(geometry,normal);m.renderOrder=1001;m.userData.bone=b;b.getWorldScale(markerScale);m.scale.set(1/markerScale.x,1/markerScale.y,1/markerScale.z);b.add(m);return m;});
 const lines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xff76ba,depthTest:false,depthWrite:false,transparent:true,opacity:.55}));lines.renderOrder=1000;scene.add(lines);
 const edges=eligible.filter(b=>b.parent instanceof THREE.Bone&&eligible.includes(b.parent));const linePositions=new THREE.Float32BufferAttribute(new Float32Array(edges.length*6),3);linePositions.setUsage(THREE.DynamicDrawUsage);lines.geometry.setAttribute('position',linePositions);lines.frustumCulled=false;
 let selected:THREE.Bone|undefined;const history:ReturnType<PoseModel['snapshot']>[]=[];let downState:ReturnType<PoseModel['snapshot']>|undefined;
 function remember(){history.push(pose.snapshot());if(history.length>40)history.shift();}
 function select(name:string){selected=pose.bones.find(b=>b.name===name);if(selected)transform.attach(selected);else transform.detach();markers.forEach(m=>m.material=m.userData.bone===selected?selectedMat:normal);onSelect(selected?.name||'');}
 transform.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value;});transform.addEventListener('mouseDown',()=>{downState=pose.snapshot();});transform.addEventListener('mouseUp',()=>{if(downState){history.push(downState);downState=undefined;if(history.length>40)history.shift();}});
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();canvas.tabIndex=0;
 function pointerDown(e:PointerEvent){if(e.button!==0)return;canvas.focus({preventScroll:true});if(transform.axis)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(markers,false)[0];if(hit){e.stopImmediatePropagation();select(hit.object.userData.bone.name);}}
 canvas.addEventListener('pointerdown',pointerDown,true);
 function key(e:KeyboardEvent){if(e.key==='Escape'){if(transform.dragging)transform.reset();else select('');}}
 canvas.addEventListener('keydown',key);
 function update(show:boolean){markers.forEach(m=>m.visible=show);gizmo.visible=show&&!!selected;transform.enabled=show;lines.visible=show;if(!show)return;pose.rigRoot.updateWorldMatrix(true,true);const v=new THREE.Vector3();edges.forEach((b,i)=>{b.getWorldPosition(v);linePositions.setXYZ(i*2,v.x,v.y,v.z);b.parent!.getWorldPosition(v);linePositions.setXYZ(i*2+1,v.x,v.y,v.z);});linePositions.needsUpdate=true;}

 return {names:eligible.map(b=>b.name),select,update,transform,hide(){markers.forEach(m=>m.visible=false);lines.visible=false;gizmo.visible=false;},resetJoint(){if(!selected)return;remember();const i=pose.bones.indexOf(selected),s=pose.initial[i];selected.position.copy(s.p);selected.quaternion.copy(s.q);selected.scale.copy(s.s);},reset(){remember();pose.apply(pose.initial);},undo(){const state=history.pop();if(state)pose.apply(state);},dispose(){canvas.removeEventListener('pointerdown',pointerDown,true);canvas.removeEventListener('keydown',key);transform.detach();transform.dispose();gizmo.removeFromParent();markers.forEach(m=>m.removeFromParent());geometry.dispose();normal.dispose();selectedMat.dispose();lines.geometry.dispose();lines.material.dispose();lines.removeFromParent();orbit.enabled=true;}};
}
