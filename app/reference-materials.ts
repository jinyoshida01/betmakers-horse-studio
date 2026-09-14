import * as THREE from 'three';
export function referenceMaterials(){
 const originals=new Map<THREE.Mesh,THREE.Material|THREE.Material[]>(),cache=new Map<THREE.Material,{grey:THREE.Material;depth:THREE.Material;wireframe:THREE.Material}>();
 const range={value:new THREE.Vector2(1,10)};
 function restore(){for(const [mesh,material] of originals)mesh.material=material;originals.clear();}
 function replacement(original:THREE.Material,mode:'grey'|'depth'|'wireframe'){
  let pair=cache.get(original);if(!pair){const source=original as THREE.MeshStandardMaterial;
   const grey=new THREE.MeshStandardMaterial({color:0xaaaaaa,metalness:0,roughness:1,side:source.side,map:source.map,alphaMap:source.alphaMap,alphaTest:source.alphaTest,transparent:source.transparent,opacity:source.opacity});
   grey.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = vec3(0.48);');};
   const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.BasicDepthPacking,side:source.side,map:source.map,alphaMap:source.alphaMap,alphaTest:source.transparent?.35:source.alphaTest,opacity:source.opacity});
   depth.onBeforeCompile=shader=>{shader.uniforms.referenceRange=range;shader.vertexShader='varying float vReferenceDepth;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvReferenceDepth = -mvPosition.z;');shader.fragmentShader='varying float vReferenceDepth;\nuniform vec2 referenceRange;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );','gl_FragColor = vec4(vec3(1.0 - clamp((vReferenceDepth - referenceRange.x) / (referenceRange.y - referenceRange.x), 0.0, 1.0)), 1.0);');};
   const wireframe=new THREE.MeshBasicMaterial({color:0x9aabb8,wireframe:true,side:THREE.DoubleSide});pair={grey,depth,wireframe};cache.set(original,pair);
  }return pair[mode];
 }
 return {restore,range,apply(meshes:THREE.Mesh[],mode:'textured'|'grey'|'depth'|'wireframe'){restore();if(mode==='textured')return;for(const mesh of meshes){originals.set(mesh,mesh.material);mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>replacement(m,mode)):replacement(mesh.material,mode);}},dispose(){restore();for(const pair of cache.values()){pair.grey.dispose();pair.depth.dispose();pair.wireframe.dispose();}cache.clear();}};
}
