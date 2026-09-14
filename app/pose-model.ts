import * as THREE from 'three';
export type RigData={bones:{name:string;parent:number;deform:boolean}[];clips:Record<string,{fps:number;frames:number[][][]}>;meshes:Record<string,{indices:number[];weights:number[]}>};
export function createPoseModel(model:THREE.Object3D,data:RigData,gait:string,time:number){
 const rigRoot=new THREE.Group();rigRoot.name='Manual pose skeleton';model.add(rigRoot);
 const clip=data.clips[gait],f=Math.min(time*clip.fps,clip.frames.length-1),i=Math.floor(f),alpha=f-i;
 const worlds=data.bones.map((_,b)=>{const a=new THREE.Matrix4().fromArray(clip.frames[i][b]),next=new THREE.Matrix4().fromArray(clip.frames[Math.min(i+1,clip.frames.length-1)][b]),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p2=p.clone(),q2=q.clone(),s2=s.clone();a.decompose(p,q,s);next.decompose(p2,q2,s2);return new THREE.Matrix4().compose(p.lerp(p2,alpha),q.slerp(q2,alpha),s.lerp(s2,alpha));});
 const bones=data.bones.map((info,index)=>{const bone=new THREE.Bone();bone.name=info.name;const local=info.parent<0?worlds[index]:new THREE.Matrix4().copy(worlds[info.parent]).invert().multiply(worlds[index]);local.decompose(bone.position,bone.quaternion,bone.scale);return bone;});
 bones.forEach((bone,i)=>(data.bones[i].parent<0?rigRoot:bones[data.bones[i].parent]).add(bone));model.updateWorldMatrix(true,true);
 const skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();
 const originals:THREE.Mesh[]=[],skins:THREE.SkinnedMesh[]=[];model.traverse(o=>{if(o instanceof THREE.Mesh&&data.meshes[o.name])originals.push(o);});
 const v=new THREE.Vector3();
 for(const original of originals){
  const weights=data.meshes[original.name],geometry=original.geometry.clone(),positions=new Float32Array(geometry.attributes.position.count*3);
  for(let i=0;i<geometry.attributes.position.count;i++){original.getVertexPosition(i,v);v.toArray(positions,i*3);}
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.morphAttributes={};geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(weights.indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights.weights,4));// Quantized glTF normals use signed bytes. Recomputing into that buffer
  // truncates face normals to zero, so allocate floating-point normals first.
  geometry.deleteAttribute('normal');geometry.computeVertexNormals();geometry.deleteAttribute('tangent');
  const mesh=new THREE.SkinnedMesh(geometry,original.material);mesh.name='Pose '+original.name;mesh.position.copy(original.position);mesh.quaternion.copy(original.quaternion);mesh.scale.copy(original.scale);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;original.parent!.add(mesh);mesh.updateWorldMatrix(true,false);mesh.bind(skeleton,mesh.matrixWorld);original.visible=false;skins.push(mesh);
 }
 function snapshot(){return bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));}
 const initial=snapshot();
 const apply=(state:ReturnType<typeof snapshot>)=>{bones.forEach((b,i)=>{b.position.copy(state[i].p);b.quaternion.copy(state[i].q);b.scale.copy(state[i].s);});rigRoot.updateWorldMatrix(true,true);};
 return {bones,skeleton,rigRoot,skins,originals,initial,snapshot,apply,dispose(){originals.forEach(m=>m.visible=true);skins.forEach(m=>{m.removeFromParent();m.geometry.dispose();});rigRoot.removeFromParent();skeleton.dispose();}};
}
export type PoseModel=ReturnType<typeof createPoseModel>;
