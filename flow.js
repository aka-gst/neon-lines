(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.LinesFlow=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const FIRST_TURN_HINT='Пришли три шара. Собери первую пятёрку — +50';

  function firstTurnHint({firstMove,cleared}){
    return firstMove&&!cleared?FIRST_TURN_HINT:null;
  }

  function quietFrom(search='',hash=''){
    const raw=search+hash;
    let text=raw;
    try{text=decodeURIComponent(raw)}catch{}
    return /(^|[?&#])(тихо|tiho|quiet)(=1|=true)?([&#]|$)/i.test(text);
  }

  function createTelemetry({search='',umami,getUmami}={}){
    const testRun=new URLSearchParams(search).has('test');
    const sent=new Set();
    const analytics=()=>getUmami?getUmami():umami;
    const track=(name,data)=>{
      if(testRun)return false;
      try{
        const client=analytics();
        if(typeof client?.track!=='function')return false;
        if(data===undefined)client.track(name);
        else client.track(name,data);
        return true;
      }catch{return false;}
    };
    return {
      track,
      once(name){
        if(sent.has(name))return false;
        if(!track(name))return false;
        sent.add(name);
        return true;
      }
    };
  }

  return {firstTurnHint,quietFrom,createTelemetry};
});
