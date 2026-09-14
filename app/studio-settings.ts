export type Coat = 'Chestnut' | 'Bay' | 'Black' | 'Grey' | 'Palomino';
export type StudioLight = { id: string; name: string; enabled: boolean; color: string; intensity: number; x: number; y: number; z: number };
export const coats: Coat[] = ['Chestnut', 'Bay', 'Black', 'Grey', 'Palomino'];
export function lightingPreset(name: string) {
 const soft: StudioLight[] = [
  {id:'key',name:'Key light',enabled:true,color:'#fff5e9',intensity:3.8,x:-4,y:6,z:5},
  {id:'fill',name:'Fill light',enabled:true,color:'#e5eeff',intensity:2.8,x:4,y:3,z:4},
  {id:'rim',name:'Rim light',enabled:true,color:'#ffffff',intensity:2.5,x:1,y:5,z:-5},
 ];
 if(name==='Daylight') return {lights:soft.map(l=>({...l,color:'#ffffff',intensity:l.id==='key'?4:2})),ambient:2.3,exposure:1.25};
 if(name==='Dramatic') return {lights:soft.map(l=>({...l,intensity:l.id==='key'?4.5:l.id==='fill'?.7:3.5})),ambient:.7,exposure:1.15};
 return {lights:soft,ambient:2,exposure:1.3};
}
export const fovToLens=(fov:number)=>12/Math.tan(fov*Math.PI/360);
export const lensToFov=(lens:number)=>Math.atan(12/lens)*360/Math.PI;
export type Settings={gait:'idle'|'run';playing:boolean;speed:number;phase:number;rotate:boolean;grid:boolean;darkMode:boolean;fov:number;coat:Coat;ambient:number;exposure:number;lights:StudioLight[];lightHelpers:boolean;reference:'textured'|'grey'|'depth';poseMode:boolean;poseTool:'translate'|'rotate';poseSpace:'local'|'world';poseSnap:boolean;showJoints:boolean};
export const defaults:Settings={gait:'idle',playing:true,speed:1,phase:0,rotate:false,grid:true,darkMode:true,fov:36,coat:'Chestnut',...lightingPreset('Soft studio'),lightHelpers:false,reference:'textured',poseMode:false,poseTool:'rotate',poseSpace:'local',poseSnap:false,showJoints:true};
