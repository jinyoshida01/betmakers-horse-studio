export const rigJoints = [
 {id:'neck',label:'Horse · Neck'}, {id:'head',label:'Horse · Head'}, {id:'tail',label:'Horse · Tail'},
 ...['Front left','Front right','Hind left','Hind right'].flatMap((name,i)=>['Upper leg','Knee / hock','Ankle'].map((joint,j)=>({id:`leg${i}_${j}`,label:`Horse · ${name} · ${joint}`}))),
 {id:'rider',label:'Jockey · Pelvis'}, {id:'spine',label:'Jockey · Torso'}, {id:'riderHead',label:'Jockey · Head'},
 ...['Left','Right'].flatMap((side,i)=>['Shoulder','Elbow','Hip','Knee'].map(joint=>({id:`rider${i}_${joint}`,label:`Jockey · ${side} ${joint.toLowerCase()}`})))
];
export type JointAngles = [number,number,number];
export const isRiderJoint=(id:string)=>id==='spine'||id.startsWith('rider');
