import {command,options,middleware} from '52bot';
options({
  name:'foo'
})
command('foo')
.action(({bot})=>{
  return 'bar'
})
command('bar')
  .action(()=>{
    return '我不知道该说啥呀'
  })
middleware((a,b,e)=>{

})

