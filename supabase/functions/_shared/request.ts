export class BodyTooLarge extends Error {}

// Bound bytes while streaming, even when Content-Length is absent or dishonest.
export async function readBoundedJSON(req:Request,maxBytes:number):Promise<any>{
  if(Number(req.headers.get('content-length')||0)>maxBytes)throw new BodyTooLarge();
  const reader=req.body?.getReader();if(!reader)return {};
  const chunks:Uint8Array[]=[];let total=0;
  try{
    while(true){const {value,done}=await reader.read();if(done)break;
      total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new BodyTooLarge();}chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new TypeError('Expected JSON object');
  return parsed;
}
