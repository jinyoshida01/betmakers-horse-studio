'use client';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { rigJoints, isRiderJoint, type JointAngles } from './rig-config';
import type { Settings } from './horse';
type Props={settings:Settings;setSettings:Dispatch<SetStateAction<Settings>>;phase:number};
export function RigPanel({settings:s,setSettings,phase}:Props){
 const [open,setOpen]=useState(false);
 const angles=s.rigPose[s.selectedJoint]||[0,0,0];
 function selectJoint(id:string){setSettings(v=>({...v,selectedJoint:id,jockey:isRiderJoint(id)?true:v.jockey}));}
 function rotate(axis:number,value:number){setSettings(v=>{const next=[...(v.rigPose[v.selectedJoint]||[0,0,0])] as JointAngles;next[axis]=value;return {...v,playing:false,phase,rigPose:{...v.rigPose,[v.selectedJoint]:next}};});}
 return <>
 <Collapsible open={open} onOpenChange={setOpen} className="control-section rig-section"><CollapsibleTrigger className="advanced-trigger"><h3>Pose rig</h3><span>04 <ChevronDown size={16} className={open?'expanded':''}/></span></CollapsibleTrigger><CollapsibleContent><label className="rig-visibility"><span>Show joint controls</span><Switch aria-label="Show rig joint controls" checked={s.rigEnabled} onCheckedChange={value=>setSettings(v=>({...v,rigEnabled:value,playing:value?false:v.playing,phase:value?phase:v.phase}))}/></label><p className="control-note">Select a joint below or click a pink joint in the viewport. Adjustments pause the current frame.</p><Select value={s.selectedJoint} onValueChange={value=>value&&selectJoint(value)}><SelectTrigger className="pose-select rig-select" aria-label="Rig joint"><SelectValue>{rigJoints.find(j=>j.id===s.selectedJoint)?.label}</SelectValue></SelectTrigger><SelectContent alignItemWithTrigger={false}>{rigJoints.map(j=><SelectItem key={j.id} value={j.id}>{j.label}</SelectItem>)}</SelectContent></Select>
 {['X · Bend sideways','Y · Twist','Z · Bend forward'].map((label,axis)=><div key={axis}><div className="range-label"><label id={`rig-axis-${axis}`}>{label}</label><span>{angles[axis]>0?'+':''}{angles[axis]}°</span></div><Slider aria-labelledby={`rig-axis-${axis}`} value={[angles[axis]]} min={-120} max={120} step={1} onValueChange={value=>rotate(axis,Number(Array.isArray(value)?value[0]:value))}/></div>)}
 <div className="rig-actions"><button onClick={()=>setSettings(v=>({...v,rigPose:{...v.rigPose,[v.selectedJoint]:[0,0,0]}}))}><RotateCcw size={13}/>Reset joint</button><button onClick={()=>setSettings(v=>({...v,rigPose:{}}))}>Reset all joints</button></div><p className="control-note">Joint edits stay applied when you hide the rig or resume motion. Rig guides are excluded from image downloads.</p>
 </CollapsibleContent></Collapsible>
 <Collapsible className="control-section lighting-section"><CollapsibleTrigger className="advanced-trigger"><h3>Lighting</h3><span>05 <ChevronDown size={16}/></span></CollapsibleTrigger><CollapsibleContent><p className="control-note">Position the main studio light around the horse.</p>{([{key:'lightX',label:'Side to side',min:-10,max:10},{key:'lightY',label:'Height',min:1,max:12},{key:'lightZ',label:'Front to back',min:-10,max:10}] as const).map(({key,label,min,max})=><div key={key}><div className="range-label"><label id={key}>{label}</label><span>{s[key].toFixed(1)}</span></div><Slider aria-labelledby={key} value={[s[key]]} min={min} max={max} step={.5} onValueChange={value=>setSettings(v=>({...v,[key]:Number(Array.isArray(value)?value[0]:value)}))}/></div>)}<div className="rig-actions"><button onClick={()=>setSettings(v=>({...v,lightX:-3,lightY:7,lightZ:5}))}><RotateCcw size={13}/>Reset lighting</button></div></CollapsibleContent></Collapsible>
 </>;
}
