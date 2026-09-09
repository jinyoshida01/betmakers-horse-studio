import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import type { Settings } from './horse';
type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown};
export function useStudioTools(setSettings:Dispatch<SetStateAction<Settings>>){
 useEffect(()=>{
  const context=(document as Document & {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
  if(!context?.registerTool)return;
  const life=new AbortController();
  const enums:Record<string,string[]>={gait:['idle','walk','run'],pose:['Natural','Alert','Grazing','Rearing']};
  const booleans=['playing','saddle','headgear','harness','jockey','rotate','grid'];
  const ranges:Record<string,number[]>={speed:[.25,2],phase:[0,1],head:[-20,30]};
  const properties:Record<string,object>={};
  Object.entries(enums).forEach(([key,values])=>properties[key]={type:'string',enum:values});
  booleans.forEach(key=>properties[key]={type:'boolean'});
  Object.entries(ranges).forEach(([key,[min,max]])=>properties[key]={type:'number',minimum:min,maximum:max});
  const tool:Tool={name:'configure_horse',description:'Change the visible horse animation, pose, accessories, and stage options. Pose-only changes pause the horse in idle. Use phase from 0 to 1 to choose a specific animation frame.',inputSchema:{type:'object',properties,additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){
   if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Expected an options object.');
   const patch=input as Record<string,unknown>;
   for(const [key,value] of Object.entries(patch)){
    if(!Object.hasOwn(properties,key))throw new Error(`Unknown option: ${key}`);
    if(enums[key]&&(typeof value!=='string'||!enums[key].includes(value)))throw new Error(`Invalid ${key}`);
    if(booleans.includes(key)&&typeof value!=='boolean')throw new Error(`Expected boolean for ${key}`);
    if(ranges[key]&&(typeof value!=='number'||!Number.isFinite(value)||value<ranges[key][0]||value>ranges[key][1]))throw new Error(`Invalid range for ${key}`);
   }
   const prepared={...patch};if('pose' in patch&&!('gait' in patch)){prepared.gait='idle';prepared.playing=false;}if('phase' in patch&&!('playing' in patch))prepared.playing=false;
   let result:Settings|undefined;flushSync(()=>setSettings(s=>{result={...s,...prepared} as Settings;return result;}));
   return {settings:result};
  }};
  try{Promise.resolve(context.registerTool(tool,{signal:life.signal})).catch(()=>{});}catch{/* The viewer works normally without optional agent support. */}
  return()=>life.abort();
 },[setSettings]);
}
