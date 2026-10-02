function eq(a,b){
  return a == null || b == null ? null : String(a).toLowerCase()===String(b).toLowerCase();
}

function numberEq(a,b,tolerance=0.01){
  return a == null || b == null ? null : Math.abs(Number(a)-Number(b))<=tolerance;
}

function finish(checks){
  const known=checks.filter(x=>x.result!==null);
  const failed=known.filter(x=>x.result===false);
  if(failed.length) return {status:"incompatible",checks};
  if(known.length!==checks.length) return {status:"unknown",checks};
  return {status:"compatible",checks};
}

export function assessComponentCompatibility(component,bikeInterfaces){
  if(!component || !bikeInterfaces) return {status:"unknown",checks:[]};

  const f=component.fitment || {};
  const i=bikeInterfaces.interfaces || {};

  if(component.category==="wheel"){
    const isFront=component.id.includes("front");
    const target=isFront ? i.wheel_front : i.wheel_rear;
    if(!target) return {status:"unknown",checks:[{field:isFront?"wheel_front":"wheel_rear",result:null}]};
    return finish([
      {field:"wheel_standard",component:f.rim_diameter ?? null,bike:target.wheel_standard ?? null,result:eq(f.rim_diameter,target.wheel_standard)},
      {field:"axle",component:f.axle_mm ?? null,bike:target.axle ?? null,result:eq(f.axle_mm,target.axle)},
      {field:"brake",component:f.brake ?? null,bike:target.brake ?? null,result:eq(f.brake,target.brake)}
    ]);
  }

  if(component.category==="cassette"){
    const target=i.drivetrain;
    if(!target) return {status:"unknown",checks:[{field:"drivetrain",result:null}]};
    return finish([
      {field:"rear_speeds",component:f.rear_speeds ?? null,bike:target.rear_speeds ?? null,result:numberEq(f.rear_speeds,target.rear_speeds,0)}
    ]);
  }

  if(component.category==="crankset"){
    const target=i.crank;
    if(!target) return {status:"unknown",checks:[{field:"crank",result:null}]};
    return finish([
      {field:"rear_speeds",component:f.rear_speeds ?? null,bike:target.rear_speeds ?? null,result:numberEq(f.rear_speeds,target.rear_speeds,0)},
      {field:"chainline_mm",component:f.chainline_mm ?? null,bike:target.chainline_mm ?? null,result:numberEq(f.chainline_mm,target.chainline_mm,0.5)}
    ]);
  }

  if(component.category==="aerobar_extensions"){
    const target=i.aerobar_extensions;
    if(!target) return {status:"unknown",checks:[{field:"aerobar_extensions",result:null}]};
    return finish([
      {field:"clamp_outer_diameter_mm",component:f.outer_diameter_mm ?? null,bike:target.clamp_outer_diameter_mm ?? null,result:numberEq(f.outer_diameter_mm,target.clamp_outer_diameter_mm,0.1)}
    ]);
  }

  return {status:"unknown",checks:[]};
}
