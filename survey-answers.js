const SurveyAnswers=(()=>{
 function choose(options,rating=1){
  if(options.length===5)return options[rating];
  return options.findLast(o=>/full time|no|collaborative/i.test(o.label))||options[0];
 }
 return {choose};
})();
if(typeof module!=='undefined')module.exports=SurveyAnswers;
