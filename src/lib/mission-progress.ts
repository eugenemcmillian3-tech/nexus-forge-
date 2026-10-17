export function missionProgressPercent(completion:number,status?:string){
 if(status==='complete')return 100
 if(!Number.isFinite(completion))return 0
 return Math.round(Math.max(0,Math.min(100,completion<=1?completion*100:completion)))
}
